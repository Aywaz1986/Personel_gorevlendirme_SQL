#!/usr/bin/env python3
"""dbo_koruma.py birim testleri (SQL Server gerekmez). Çalıştırma: python3 tools/test_dbo_koruma.py"""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dbo_koruma as k  # noqa: E402

IZIN = {
    "dbo_okuma": ["src/Gorevlendirme.App/Sql/*_kadro_esitleme.sql"],
    "dinamik_sql": ["tools/sql/gorev_kaldir.sql"],
}
NORMAL = "src/Gorevlendirme.App/Sql/001_cekirdek.sql"
ESITLEME = "src/Gorevlendirme.App/Sql/003_kadro_esitleme.sql"
KALDIR = "tools/sql/gorev_kaldir.sql"


def ih(sql, yol=NORMAL):
    return k.denetle_metin(sql, yol, IZIN)


class DboKorumaTests(unittest.TestCase):
    def temiz(self, sql, yol=NORMAL):
        self.assertEqual(ih(sql, yol), [], sql)

    def ihlal(self, sql, parca="", yol=NORMAL):
        sonuc = ih(sql, yol)
        self.assertTrue(sonuc, "ihlal bekleniyordu: " + sql)
        if parca:
            self.assertTrue(any(parca.lower() in m.lower() for _, m in sonuc), str(sonuc))

    # ---- temiz örnekler
    def test_gorev_tablo_islemleri_temiz(self):
        self.temiz("""
            CREATE TABLE gorev.personel (id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_personel PRIMARY KEY, sicil_no NVARCHAR(50) NOT NULL);
            INSERT INTO gorev.personel (sicil_no) VALUES (N'1');
            UPDATE gorev.personel SET sicil_no = N'2' WHERE id = 1;
            DELETE FROM gorev.personel WHERE id = 1;
        """)

    def test_takma_adli_update_from_gorev_temiz(self):
        self.temiz("UPDATE g SET g.sicil_no = N'x' FROM gorev.personel g JOIN #o o ON o.sicil_no = g.sicil_no;")

    def test_cte_ve_alt_sorgu_temiz(self):
        self.temiz("WITH c AS (SELECT 1 AS x) SELECT * FROM c;")
        self.temiz("SELECT * FROM (SELECT 1 AS x) t;")
        self.temiz("SELECT value FROM STRING_SPLIT(N'a,b', N',');")

    def test_merge_gorev_temiz(self):
        self.temiz("""MERGE INTO gorev.personel AS h USING #o AS o ON o.sicil_no = h.sicil_no
            WHEN MATCHED THEN UPDATE SET h.sicil_no = o.sicil_no
            WHEN NOT MATCHED THEN INSERT (sicil_no) VALUES (o.sicil_no);""")

    def test_tetikleyici_olaylari_yanlis_alarm_vermez(self):
        self.temiz("""CREATE OR ALTER TRIGGER gorev.trg_audit ON gorev.audit INSTEAD OF UPDATE, DELETE AS
            BEGIN THROW 50098, N'Degistirilemez', 1; END;""")

    def test_yabanci_anahtar_cascade_yanlis_alarm_vermez(self):
        self.temiz("ALTER TABLE gorev.a ADD CONSTRAINT FK_a_b FOREIGN KEY (b_id) REFERENCES gorev.b(id) ON DELETE CASCADE;")

    def test_gorev_yetki_ve_rol_temiz(self):
        self.temiz("GRANT EXECUTE ON SCHEMA::gorev TO gorev_kullanici;")
        self.temiz("ALTER ROLE gorev_kullanici ADD MEMBER [NT AUTHORITY\\Authenticated Users];")
        self.temiz("CREATE USER gorev_sahip WITHOUT LOGIN;")
        self.temiz("CREATE SCHEMA gorev AUTHORIZATION gorev_sahip;")

    def test_exec_gorev_ve_sistem_temiz(self):
        self.temiz("EXEC gorev.sp_ben;")
        self.temiz("EXEC sys.sp_getapplock @Resource = N'gorev_sema', @LockMode = N'Exclusive';")
        self.temiz("CREATE OR ALTER PROCEDURE gorev.sp_x AS BEGIN SET NOCOUNT ON; SELECT 1; END;")
        self.temiz("CREATE OR ALTER PROCEDURE gorev.sp_x @a INT WITH EXECUTE AS OWNER AS BEGIN SET NOCOUNT ON; SELECT 1; END;")

    def test_yorumdaki_dbo_yoksayilir(self):
        self.temiz("-- UPDATE dbo.personeller SET x = 1\n/* DELETE FROM dbo.personeller */\nSELECT 1;")

    def test_atama_onay_yordami_ornegi_temiz(self):
        self.temiz("""
            CREATE OR ALTER PROCEDURE gorev.sp_atama_onayla @talep_id INT, @talep_gun_id INT, @sicil NVARCHAR(30)
            WITH EXECUTE AS OWNER AS
            BEGIN
              SET NOCOUNT ON;
              SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
              BEGIN TRY
                BEGIN TRANSACTION;
                DECLARE @tarih DATE, @dilim VARCHAR(10);
                SELECT @tarih = gorev_tarihi, @dilim = zaman_dilimi FROM gorev.talep_gunleri WITH (UPDLOCK) WHERE id = @talep_gun_id;
                IF EXISTS (SELECT 1 FROM gorev.atamalar ga WITH (UPDLOCK) JOIN gorev.talep_gunleri tg ON ga.talep_gun_id = tg.id
                           WHERE ga.personel_sicil = @sicil AND tg.gorev_tarihi = @tarih)
                  THROW 50004, N'CAKISMA', 1;
                INSERT INTO gorev.atamalar (talep_id, talep_gun_id, personel_sicil) VALUES (@talep_id, @talep_gun_id, @sicil);
                COMMIT TRANSACTION;
              END TRY
              BEGIN CATCH
                IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
                THROW;
              END CATCH
            END;
        """)

    # ---- ihlaller: dbo yazma / DDL / yetki
    def test_dbo_yazma_ihlal(self):
        self.ihlal("UPDATE dbo.personeller SET adi_soyadi = N'x';", "dbo.personeller")
        self.ihlal("INSERT INTO dbo.personeller (sicil_no) VALUES (N'1');", "dbo.personeller")
        self.ihlal("DELETE FROM dbo.personeller;", "dbo.personeller")
        self.ihlal("TRUNCATE TABLE dbo.personeller;", "")
        self.ihlal("MERGE dbo.personeller AS t USING #o AS o ON 1=1 WHEN MATCHED THEN UPDATE SET t.x = 1;", "")

    def test_dbo_ddl_ve_yetki_ihlal(self):
        self.ihlal("DROP TABLE dbo.personeller;", "")
        self.ihlal("DROP TABLE IF EXISTS gorev.a, dbo.b;", "DROP TABLE")
        self.ihlal("ALTER TABLE dbo.personeller ADD x INT;", "")
        self.ihlal("CREATE INDEX IX_x ON dbo.personeller(sicil_no);", "")
        self.ihlal("GRANT SELECT ON dbo.personeller TO gorev_sahip;", "")
        self.ihlal("GRANT SELECT TO gorev_kullanici;", "gorev nesnelerine")
        self.ihlal("DENY SELECT ON dbo.personeller TO gorev_kullanici;", "")

    def test_semasiz_hedef_ihlal(self):
        self.ihlal("UPDATE personeller SET adi_soyadi = N'x';", "şema")
        self.ihlal("INSERT INTO personeller (sicil_no) VALUES (N'1');", "gorev")
        self.ihlal("DELETE FROM personeller;", "gorev")
        self.ihlal("CREATE TABLE x (id INT);", "gorev")
        self.ihlal("SELECT * FROM personeller;", "şema")
        self.ihlal("SELECT * INTO yeni FROM gorev.a;", "INTO")

    def test_dbo_okuma_normal_dosyada_ihlal(self):
        self.ihlal("INSERT INTO #o (sicil_no) SELECT sicil_no FROM dbo.personeller;", "izin listesinde değil")

    # ---- dbo okuma izinli dosya
    def test_izinli_dosyada_gecici_tabloya_okuma_temiz(self):
        self.temiz("INSERT INTO #o (sicil_no, adi) SELECT sicil_no, adi_soyadi FROM dbo.personeller;", ESITLEME)
        self.temiz("INSERT INTO #ben (hesap, rol, kapsam, aktif) EXEC dbo.sp_ben;", ESITLEME)
        self.temiz("INSERT #ben (hesap) EXEC dbo.sp_ben;", ESITLEME)

    def test_izinli_dosyada_yazma_veya_diger_tablo_ihlal(self):
        self.ihlal("UPDATE gorev.personel SET ad = p.adi_soyadi FROM gorev.personel g JOIN dbo.personeller p ON p.sicil_no = g.sicil_no;", "", ESITLEME)
        self.ihlal("MERGE gorev.personel AS h USING (SELECT sicil_no FROM dbo.personeller) AS o ON 1=1 WHEN MATCHED THEN UPDATE SET h.x = 1;", "", ESITLEME)
        self.ihlal("INSERT INTO gorev.personel (sicil_no) SELECT sicil_no FROM dbo.personeller;", "geçici", ESITLEME)
        self.ihlal("INSERT INTO #k SELECT * FROM dbo.kullanicilar;", "kullanicilar", ESITLEME)
        self.ihlal("SELECT * FROM dbo.personeller;", "geçici", ESITLEME)
        self.ihlal("EXEC dbo.sp_kullanici_kaydet;", "", ESITLEME)

    # ---- diğer yasaklar
    def test_rol_ve_uye_kisiti(self):
        self.ihlal("ALTER ROLE db_owner ADD MEMBER gorev_sahip;", "olmalı")
        self.ihlal("CREATE USER [NT AUTHORITY\\Authenticated Users] FOR LOGIN [NT AUTHORITY\\Authenticated Users];", "gorev")

    def test_use_ve_veritabanlari_arasi_ihlal(self):
        self.ihlal("USE SST_Ozluk;", "USE")
        self.ihlal("SELECT * FROM SST_Ozluk.dbo.personeller;", "veritabanları arası")
        self.ihlal("SELECT * FROM msdb.dbo.sysjobs;", "veritabanları arası")

    def test_exec_hedefi_ihlal(self):
        self.ihlal("EXEC sp_kullanici_kaydet;", "EXEC")
        self.ihlal("EXEC sp_addrolemember N'db_owner', N'x';", "")
        self.ihlal("EXEC xp_cmdshell N'dir';", "")

    def test_dinamik_sql_sadece_izinli_dosyada(self):
        self.ihlal("EXEC (@sql);", "dinamik")
        self.ihlal("EXEC sys.sp_executesql @sql;", "dinamik")
        # izinli dosya ama gorev şemasıyla sınırlanmamış -> ihlal
        self.ihlal("DECLARE @sql NVARCHAR(MAX) = N'DROP TABLE x'; EXEC (@sql);", "SCHEMA_ID", KALDIR)
        # izinli ve sınırlı -> temiz
        self.temiz("""DECLARE @sql NVARCHAR(MAX) = N'';
            SELECT @sql += N'DROP TABLE gorev.' + name + N';' FROM sys.tables WHERE schema_id = SCHEMA_ID(N'gorev');
            EXEC (@sql);""", KALDIR)

    # ---- altyapı
    def test_go_ve_satir_numarasi(self):
        sql = "SELECT 1;\nGO\n\nSELECT 2;\nUPDATE dbo.personeller SET x = 1;\nGO\n"
        sonuc = ih(sql)
        self.assertTrue(sonuc)
        self.assertEqual(sonuc[0][0], 5)

    def test_dize_icindeki_noktalivirgul_ve_yorum_isareti(self):
        self.temiz("SELECT N'a;b -- c' AS x FROM gorev.t;")

    def test_gercek_dosya_taramasi_bos_dizinde_temiz(self):
        self.assertEqual(k.main(["dbo_koruma.py"]), 0)


if __name__ == "__main__":
    unittest.main(verbosity=2)
