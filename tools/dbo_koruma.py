#!/usr/bin/env python3
"""gorev betiklerinde dbo.* koruma denetimi (KESİN KURAL: dbo.* nesnelerine dokunulmaz).

Taranan dosyalar: src/Gorevlendirme.App/Sql/*.sql ve tools/sql/*.sql
Kural özeti (ayrıntı: docs/SQL.md "dbo koruma"):
  1. dbo.* yalnızca tools/dbo_koruma_izinler.json içindeki "dbo_okuma" dosyalarında geçebilir ve orada da
     yalnızca  INSERT [INTO] #tablo|@tablo ... SELECT ... FROM dbo.personeller  ya da
                INSERT [INTO] #tablo|@tablo EXEC dbo.sp_ben  biçiminde (okuma; sonra işlem geçici tablodan).
  2. INSERT/UPDATE/DELETE/MERGE/TRUNCATE/SELECT INTO hedefleri gorev.*, #geçici veya @değişken olmalı.
  3. Her CREATE/ALTER/DROP/GRANT/DENY/REVOKE yalnızca gorev şemasına (veya gorev* rol/kullanıcıya) dokunur.
  4. FROM/JOIN/USING kaynakları şema belirtmeli (gorev., #, @, sys., CTE); şemasız ad dbo'ya çözülebilir.
  5. Dinamik SQL, USE, veritabanları arası ad, sunucu düzeyi işlemler yasaktır; dinamik SQL yalnızca
     "dinamik_sql" izinli dosyalarda ve dosya SCHEMA_ID(N'gorev') içeriyorsa kullanılır.
Her deyimin ';' ile bitmesi (veya GO ile ayrılması) beklenir; denetim "kapalı hata" ilkesiyle çalışır:
şüpheli durumda ihlal bildirir, yazar deyimi sadeleştirir.
Kullanım: python3 tools/dbo_koruma.py [dosya ...]   (çıkış kodu 1 = ihlal var)
"""
import fnmatch
import glob
import json
import os
import re
import sys

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TARAMA = ["src/Gorevlendirme.App/Sql/*.sql", "tools/sql/*.sql"]
IZIN_DOSYASI = os.path.join(KOK, "tools", "dbo_koruma_izinler.json")
I = re.I

GO_RE = re.compile(r"^[ \t]*GO[ \t]*(?:\d+)?[ \t]*(?:--.*)?$", I | re.M)
DBO_RE = re.compile(r"(?<![\w@#.\]])\[?dbo\]?\s*\.\s*\[?(\w+)\]?", I)
YASAK_RE = re.compile(
    r"\b(ALTER\s+(?:DATABASE|SERVER|AUTHORIZATION|LOGIN|ANY)|BACKUP|RESTORE|DBCC|SHUTDOWN|BULK\s+INSERT|"
    r"OPENROWSET|OPENQUERY|OPENDATASOURCE|XP_CMDSHELL|SP_CONFIGURE|SP_ADDROLEMEMBER|SP_DROPROLEMEMBER|"
    r"SP_RENAME|SP_ADDLINKEDSERVER|RECONFIGURE|SETUSER|CREATE\s+LOGIN|DROP\s+LOGIN)\b", I)
DBARASI_RE = re.compile(r"(?<![\w#@'])(SST_\w+|MASTER|MSDB|MODEL|TEMPDB)\s*\.", I)
YAZMA_KW_RE = re.compile(r"\b(UPDATE|DELETE|MERGE|TRUNCATE|CREATE|ALTER|DROP|GRANT|DENY|REVOKE)\b", I)
SISTEM_EXEC = {"sp_getapplock", "sp_releaseapplock", "sp_set_session_context"}


def _grup(sql):
    """GO satırlarına göre bölünmüş (başlangıç_satırı, metin) listesi."""
    out, pos = [], 0
    for m in GO_RE.finditer(sql):
        out.append((sql.count("\n", 0, pos) + 1, sql[pos:m.start()]))
        pos = m.end()
    out.append((sql.count("\n", 0, pos) + 1, sql[pos:]))
    return out


def deyimler(sql):
    """Yorumları atar (dize içi korunur), ';' ve GO ile böler -> [(satır, boşluğu sadeleştirilmiş metin)]."""
    sonuc = []
    for bas, p in _grup(sql):
        buf, i, n, satir, dsatir = [], 0, len(p), bas, None

        def bosalt():
            nonlocal buf, dsatir
            t = "".join(buf).strip()
            if t:
                sonuc.append((dsatir, re.sub(r"\s+", " ", t)))
            buf, dsatir = [], None

        while i < n:
            c = p[i]
            if c == "\n":
                satir += 1
            if p.startswith("--", i):
                j = p.find("\n", i)
                i = n if j < 0 else j
                continue
            if p.startswith("/*", i):
                j = p.find("*/", i + 2)
                j = n if j < 0 else j + 2
                satir += p.count("\n", i, j)
                buf.append(" ")
                i = j
                continue
            if c == "'":
                j = i + 1
                while j < n:
                    if p[j] == "'":
                        if j + 1 < n and p[j + 1] == "'":
                            j += 2
                            continue
                        break
                    j += 1
                j = min(j + 1, n)
                if dsatir is None:
                    dsatir = satir
                buf.append(p[i:j])
                satir += p[i:j].count("\n")
                i = j
                continue
            if c == ";":
                bosalt()
                i += 1
                continue
            if dsatir is None and not c.isspace():
                dsatir = satir
            buf.append(c)
            i += 1
        bosalt()
    return sonuc


def _ad(tok):
    return re.sub(r"[\[\]]", "", tok).rstrip(",;)").lower()


def _eslesir(yol, desenler):
    yol = yol.replace("\\", "/")
    return any(fnmatch.fnmatch(yol, d) for d in desenler)


def _gorev_mu(ad):
    return ad.startswith(("gorev.", "#", "@"))


def denetle_metin(sql, yol, izinler):
    """[(satır, mesaj)] döndürür; boş liste = temiz."""
    ih = []
    dbo_izinli = _eslesir(yol, izinler.get("dbo_okuma", []))
    dinamik_izinli = _eslesir(yol, izinler.get("dinamik_sql", []))
    dinamik_var = False
    dek = deyimler(sql)

    for satir, s in dek:
        def hata(m):
            ih.append((satir, m))

        ddl = re.match(r"(CREATE(?:\s+OR\s+ALTER)?|ALTER|DROP)\s+", s, I)
        izin_cum = re.match(r"(GRANT|DENY|REVOKE)\b", s, I)
        if re.match(r"USE\s", s, I):
            hata("USE yasak (başka veritabanına geçilemez)")
        if YASAK_RE.search(s):
            hata("sunucu/veritabanı düzeyi işlem yasak: " + YASAK_RE.search(s).group(1))
        if DBARASI_RE.search(s):
            hata("veritabanları arası ad yasak")

        # --- 1. dbo.* kullanımı
        refs = [r.lower() for r in DBO_RE.findall(s)]
        if refs:
            if not dbo_izinli:
                hata("dbo.%s kullanımı yasak (dosya dbo_okuma izin listesinde değil)" % refs[0])
            else:
                kotu = [r for r in refs if r not in ("personeller", "sp_ben")]
                if kotu:
                    hata("izinli dosyada bile dbo.%s okunamaz (yalnız personeller, sp_ben)" % kotu[0])
                if not re.match(r"INSERT(?:\s+INTO)?\s+[#@]\w+", s, I) or YAZMA_KW_RE.search(s):
                    hata("dbo okuması yalnızca 'INSERT #geçici ... SELECT/EXEC dbo.x' biçiminde olabilir")
                if "sp_ben" in refs and not re.search(r"\bEXEC(?:UTE)?\s+\[?dbo\]?\.\[?sp_ben\b", s, I):
                    hata("dbo.sp_ben yalnızca EXEC ile çağrılabilir")

        # --- 5. dinamik SQL ve EXEC hedefleri
        for m in ([] if izin_cum else re.finditer(r"\bEXEC(?:UTE)?\s+(?:@\w+\s*=\s*)?(\S+)", s, I)):
            tok = _ad(m.group(1))
            if tok == "as":
                continue
            if tok.startswith(("(", "@")) or tok.startswith("sp_executesql") or tok.startswith("sys.sp_executesql"):
                dinamik_var = True
                if not dinamik_izinli:
                    hata("dinamik SQL yasak (dosya dinamik_sql izin listesinde değil)")
            elif tok.startswith("gorev.") or tok.startswith("dbo.sp_ben"):
                pass
            elif tok.replace("sys.", "") in SISTEM_EXEC:
                pass
            else:
                hata("EXEC hedefi şema belirtmeli (gorev.*): " + tok)

        if izin_cum:
            if not re.search(r"\bON\s+(?:(?:SCHEMA|OBJECT|TYPE)\s*::\s*)?\[?gorev\]?(?:\.|\s|$)", s, I):
                hata("%s yalnızca gorev nesnelerine ('ON gorev...' / 'ON SCHEMA::gorev') yapılabilir" % izin_cum.group(1).upper())
            continue

        # --- 3. DDL hedefleri
        if ddl:
            m = re.match(
                r"(?:CREATE(?:\s+OR\s+ALTER)?|ALTER|DROP)\s+(?:UNIQUE\s+)?(?:(?:CLUSTERED|NONCLUSTERED)\s+)?"
                r"(TABLE|VIEW|PROC(?:EDURE)?|FUNCTION|TRIGGER|INDEX|SECURITY\s+POLICY|SCHEMA|ROLE|USER|SEQUENCE)\s+"
                r"(?:IF\s+(?:NOT\s+)?EXISTS\s+)?(.*)$", s, I)
            if not m:
                hata("tanınmayan DDL (kapalı hata): " + s[:60])
            else:
                tur, kalan = m.group(1).upper(), m.group(2)
                ilk = _ad(kalan.split(" ")[0]) if kalan else ""
                if tur in ("SCHEMA", "ROLE", "USER"):
                    if not re.fullmatch(r"gorev(_\w+)?", ilk):
                        hata("%s adı gorev veya gorev_* olmalı: %s" % (tur, ilk))
                elif tur == "INDEX":
                    mo = re.search(r"\bON\s+(\S+)", kalan, I)
                    if not mo or not _ad(mo.group(1)).startswith(("gorev.", "#")):
                        hata("INDEX hedef tablosu gorev.* olmalı")
                elif tur == "TABLE" and re.match(r"DROP\b", s, I):
                    for p in kalan.split(","):
                        if not _gorev_mu(_ad(p.strip().split(" ")[0])):
                            hata("DROP TABLE yalnızca gorev.* / #geçici: " + _ad(p.strip()))
                else:
                    if not _gorev_mu(_ad(ilk)):
                        hata("%s adı gorev.* olmalı: %s" % (tur, ilk))
                    if tur == "TRIGGER":
                        mo = re.search(r"\bON\s+(\S+)", kalan, I)
                        if not mo or not _ad(mo.group(1)).startswith("gorev."):
                            hata("TRIGGER yalnızca gorev.* tablosuna bağlanabilir")

        # --- 2. DML hedefleri (başlık olayları ve MERGE eylemleri ayıklanır)
        d = s
        if re.match(r"(?:CREATE(?:\s+OR\s+ALTER)?|ALTER)\s+TRIGGER\b", d, I):
            d = re.sub(r"^.*?\bAS\b", " ", d, count=1, flags=I)
        d = re.sub(r"\b(?:AFTER|BEFORE|INSTEAD\s+OF|FOR)\s+(?:INSERT|UPDATE|DELETE)(?:\s*,\s*(?:INSERT|UPDATE|DELETE))*", " ", d, flags=I)
        d = re.sub(r"\bON\s+(?:DELETE|UPDATE)\s+(?:NO\s+ACTION|CASCADE|SET\s+NULL|SET\s+DEFAULT)", " ", d, flags=I)
        d = re.sub(r"\bTHEN\s+(?:UPDATE\s+SET|DELETE|INSERT)\b", " THEN ", d, flags=I)
        has_from = bool(re.search(r"\bFROM\b", d, I))
        for m in re.finditer(r"\bINSERT(?:\s+INTO)?\s+(\S+)|\bMERGE(?:\s+INTO)?\s+(\S+)|\bTRUNCATE\s+TABLE\s+(\S+)", d, I):
            tok = _ad(m.group(1) or m.group(2) or m.group(3))
            if not _gorev_mu(tok):
                hata("INSERT/MERGE/TRUNCATE hedefi gorev.*, #geçici veya @değişken olmalı: " + tok)
        for m in re.finditer(r"\bINTO\s+(\S+)", d, I):
            if not _gorev_mu(_ad(m.group(1))):
                hata("INTO hedefi gorev.*, #geçici veya @değişken olmalı: " + _ad(m.group(1)))
        for m in re.finditer(r"\bUPDATE\s+(?:TOP\s*\(\d+\)\s+)?(\S+)|\bDELETE\s+(?:TOP\s*\(\d+\)\s+)?(?:(FROM)\s+)?(\S+)", d, I):
            if m.group(2):  # DELETE FROM hedef -> hedef bir sonraki simgedir
                tok = _ad(m.group(3))
                if not _gorev_mu(tok):
                    hata("DELETE hedefi gorev.*, #geçici veya @değişken olmalı: " + tok)
                continue
            tok = _ad(m.group(1) or m.group(3))
            if "." in tok or tok.startswith(("#", "@")):
                if not _gorev_mu(tok):
                    hata("UPDATE/DELETE hedefi gorev.*, #geçici veya @değişken olmalı: " + tok)
            elif not has_from:
                hata("UPDATE/DELETE hedefi şema belirtmeli (takma ad için FROM gerekir): " + tok)

        # --- 4. FROM/JOIN/USING kaynakları
        cte = set(x.lower() for x in re.findall(r"(?:\bWITH|,)\s*(\w+)\s*(?:\([^)]*\))?\s*AS\s*\(", d, I))
        for m in re.finditer(r"\b(?:FROM|JOIN|USING)\s+(\S+)", d, I):
            tok = _ad(m.group(1))
            if (tok.startswith(("gorev.", "#", "@", "sys.", "information_schema.", "(", "dbo."))
                    or tok in cte or tok in ("inserted", "deleted") or "(" in m.group(1)):
                continue
            hata("FROM/JOIN kaynağı şema belirtmeli (şemasız ad dbo'ya çözülebilir): " + tok)

    if dinamik_var and dinamik_izinli:
        if not re.search(r"SCHEMA_ID\s*\(\s*N?'gorev'\s*\)", " ".join(t for _, t in dek), I):
            ih.append((1, "dinamik SQL kullanan dosya SCHEMA_ID(N'gorev') ile sınırlanmalı"))
    return ih


def izinleri_yukle(yol=IZIN_DOSYASI):
    if not os.path.exists(yol):
        return {}
    with open(yol, encoding="utf-8") as f:
        return json.load(f)


def main(argv):
    izinler = izinleri_yukle()
    dosyalar = argv[1:] or [p for d in TARAMA for p in sorted(glob.glob(os.path.join(KOK, d)))]
    toplam = 0
    for d in dosyalar:
        rel = os.path.relpath(os.path.abspath(d), KOK).replace("\\", "/")
        with open(d, encoding="utf-8-sig") as f:
            ihlaller = denetle_metin(f.read(), rel, izinler)
        for satir, mesaj in ihlaller:
            print("%s:%s: DBO-KORUMA: %s" % (rel, satir, mesaj))
        toplam += len(ihlaller)
    print("dbo koruma: %d dosya tarandı, %d ihlal" % (len(dosyalar), toplam))
    return 1 if toplam else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
