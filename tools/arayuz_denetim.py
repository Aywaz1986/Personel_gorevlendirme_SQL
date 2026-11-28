#!/usr/bin/env python3
"""Arayüz ↔ köprü (C#) ↔ belge tutarlılık denetimi (Dilim 31). Bağımlılıksız; CI'da çalışır.

Denetlenenler:
 1. Arayüzün Kopru.cagir('komut') ile çağırdığı her komut C#'ta Register edilmiş mi?  (yoksa: "düğme var, komut yok")
 2. C#'ta kayıtlı her komut docs/ARAYUZ.md'de geçiyor mu?
 3. Arayüzün gönderdiği alan adları, komut işleyicisinin okuduğu alan adlarında var mı?  (yazım/ad uyuşmazlığı)
 4. Kayıtlı ama arayüzde hiç çağrılmayan komutlar bilgi olarak listelenir (hata değildir).
Bilinen/bilinçli istisnalar tools/arayuz_denetim_izinler.json içinde, gerekçesiyle tutulur.
"""
import glob, json, os, re, sys

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def oku(p): return open(p, encoding='utf-8').read()

def cs_komutlar():
    """komut adı -> işleyici gövdesi (bir sonraki Register'a kadar)."""
    sonuc = {}
    for f in sorted(glob.glob(os.path.join(KOK, 'src', 'Gorevlendirme.App', 'Bridge', 'Commands', '*.cs'))):
        s = oku(f)
        ms = list(re.finditer(r'\.Register\(\s*"([A-Za-z0-9_]+)"', s))
        for i, m in enumerate(ms):
            son = ms[i + 1].start() if i + 1 < len(ms) else len(s)
            sonuc[m.group(1)] = s[m.start():son]
    return sonuc

def anahtarlar_cs(govde):
    # Args.S(a, "k"), Args.I(a, "k"), OptS(a, "k"), OptB(a, "k", ...), a.TryGetProperty("k", ...)
    k = set(re.findall(r'\(\s*a\s*,\s*"([A-Za-z0-9_]+)"', govde))
    k |= set(re.findall(r'a\.TryGetProperty\(\s*"([A-Za-z0-9_]+)"', govde))
    return k

def js_dosyalari():
    return sorted(glob.glob(os.path.join(KOK, 'ui-src', 'app', '*.js')))

def dengeli(s, i, ac='{', kapa='}'):
    """s[i] == ac; eşleşen kapanışın sonrasını döndürür (metin/şablon içindeki parantezleri atlar)."""
    d, j, n = 0, i, len(s)
    while j < n:
        c = s[j]
        if c in '\'"`':
            q = c; j += 1
            while j < n and s[j] != q:
                if s[j] == '\\': j += 1
                j += 1
        elif c == ac: d += 1
        elif c == kapa:
            d -= 1
            if d == 0: return j + 1
        j += 1
    return n

def ust_anahtarlar(nesne):
    """'{ a, b: x, c: {..}, ...d }' metninden üst düzey anahtarları çıkarır."""
    ic = nesne[1:-1]
    anahtar, d, j, n, bas = set(), 0, 0, len(ic), 0
    parcalar = []
    while j < n:
        c = ic[j]
        if c in '\'"`':
            q = c; j += 1
            while j < n and ic[j] != q:
                if ic[j] == '\\': j += 1
                j += 1
        elif c in '({[': d += 1
        elif c in ')}]': d -= 1
        elif c == ',' and d == 0:
            parcalar.append(ic[bas:j]); bas = j + 1
        j += 1
    parcalar.append(ic[bas:])
    for p in parcalar:
        p = p.strip()
        if not p or p.startswith('...'): continue
        m = re.match(r"['\"]?([A-Za-z_$][\w$]*)['\"]?\s*(:|$)", p)
        if m: anahtar.add(m.group(1))
    return anahtar

CAGRI = re.compile(r"Kopru\.cagir\(\s*'([A-Za-z0-9_]+)'\s*(?:,\s*)?")
def js_cagrilar():
    """(dosya, satır, komut, anahtar kümesi | None)"""
    out = []
    for f in js_dosyalari():
        s = oku(f)
        for m in CAGRI.finditer(s):
            satir = s.count('\n', 0, m.start()) + 1
            j = m.end()
            anahtar = None
            if j < len(s) and s[j] == '{':
                anahtar = ust_anahtarlar(s[j:dengeli(s, j)])
            elif j < len(s) and s[j] == ')':
                anahtar = set()
            out.append((os.path.basename(f), satir, m.group(1), anahtar))
    return out

def js_metinleri():
    return '\n'.join(oku(f) for f in js_dosyalari())

def main():
    izin = json.load(open(os.path.join(KOK, 'tools', 'arayuz_denetim_izinler.json'), encoding='utf-8'))
    cs = cs_komutlar(); belge = oku(os.path.join(KOK, 'docs', 'ARAYUZ.md'))
    hatalar, uyarilar = [], []

    cagrilar = js_cagrilar()
    kullanilan = {c[2] for c in cagrilar}
    for dosya, satir, komut, anahtar in cagrilar:
        if komut not in cs:
            hatalar.append(f"{dosya}:{satir}: arayüz '{komut}' komutunu çağırıyor ama C#'ta kayıtlı değil")
            continue
        if anahtar is None: continue
        okunan = anahtarlar_cs(cs[komut])
        eksik = {a for a in anahtar if a not in okunan} - set(izin['alan_istisnalari'].get(komut, []))
        # işleyici argümanı servise bütün olarak geçiriyorsa (a doğrudan çağrı parametresi) alan denetimi yapılamaz
        if eksik and not re.search(r'[(,]\s*a\s*[,)]', cs[komut].replace('(a, "', '')):
            hatalar.append(f"{dosya}:{satir}: '{komut}' için arayüzün gönderdiği {sorted(eksik)} alan(lar)ı işleyici tarafından okunmuyor (okunanlar: {sorted(okunan)})")
        elif eksik:
            uyarilar.append(f"{dosya}:{satir}: '{komut}' alanları {sorted(eksik)} elle doğrulanmalı (işleyici argümanı bütün geçiriyor)")

    for komut in sorted(cs):
        if f"`{komut}`" not in belge and komut not in izin['belgesiz_komutlar']:
            hatalar.append(f"docs/ARAYUZ.md: '{komut}' komutu belgelenmemiş")
    # Tarih seçici (Dilim 32): tarih alanı olan her metin kutusunda 'GG.AA.YYYY' yer tutucusu olmalı; tarama bu yer tutucuya bakar.
    for dosya in js_dosyalari():
        for n, satir in enumerate(oku(dosya).split('\n'), 1):
            for m in re.finditer(r"h\('input',\s*\{[^}]*type:\s*'text'[^}]*\}", satir):
                k = m.group(0)
                tarihli = 'takvimTarihYaz(' in k or re.search(r"aria-label':\s*'[^']*(tarih|gün|ilk gün|son gün|Başlangıç'|Bitiş')", k, re.I)
                saatli = re.search(r"saat", k, re.I)
                if tarihli and not saatli and 'GG.AA.YYYY' not in k:
                    hatalar.append(f"{os.path.basename(dosya)}:{n}: tarih kutusunda 'GG.AA.YYYY' yer tutucusu yok (tarih seçici eklenemez)")
    metin = js_metinleri()
    kullanilmayan = [k for k in sorted(cs) if k not in kullanilan and f"'{k}'" not in metin and k not in izin['arayuzsuz_komutlar']]

    print(f"arayüz denetimi: {len(cagrilar)} çağrı, {len(cs)} komut, {len(hatalar)} hata, {len(uyarilar)} uyarı, {len(kullanilmayan)} arayüzde kullanılmayan komut")
    for u in uyarilar: print("  uyarı:", u)
    for k in kullanilmayan: print("  bilgi: arayüzde kullanılmıyor:", k)
    for h in hatalar: print("  HATA:", h)
    return 1 if hatalar else 0

if __name__ == '__main__':
    sys.exit(main())
