-- Dilim 10: canlıya geçiş (ön kontrol + tek yönlü ORTAM=CANLI) ve eski araç verisinin gerçek aktarımı (geri alınabilir).
-- Yalnız gorev şeması. Aktarılan her kayıt kaynak='ESKI_ARAC' (gecmis_gorev: 'ESKI_ARAC_TARIHSIZ') ile işaretlenir.

-- Canlıya geçiş kontrol listesi. zorunlu=1 olanlar geçmeden önce tamam olmalıdır; diğerleri uyarıdır.
CREATE FUNCTION gorev.fn_canli_kontrol ()
RETURNS TABLE
AS
RETURN
    SELECT k.sira, k.kontrol, CAST(k.zorunlu AS BIT) AS zorunlu, CAST(k.tamam AS BIT) AS tamam, k.ayrinti
    FROM (VALUES
        (1, N'Ortam şu an TEST', 1, CASE WHEN (SELECT deger FROM gorev.sistem_ayarlari WHERE anahtar = N'ORTAM') = N'TEST' THEN 1 ELSE 0 END,
            CONCAT(N'ORTAM = ', (SELECT deger FROM gorev.sistem_ayarlari WHERE anahtar = N'ORTAM'))),
        (2, N'En az bir aktif Merkez Yönetici', 1, CASE WHEN (SELECT COUNT(*) FROM gorev.fn_yonetici_sicilleri()) > 0 THEN 1 ELSE 0 END,
            CONCAT(N'Yönetici sayısı: ', (SELECT COUNT(*) FROM gorev.fn_yonetici_sicilleri()))),
        (3, N'Kadro dolu (aktif personel)', 1, CASE WHEN (SELECT COUNT(*) FROM gorev.personel WHERE aktif = 1) > 0 THEN 1 ELSE 0 END,
            CONCAT(N'Aktif personel: ', (SELECT COUNT(*) FROM gorev.personel WHERE aktif = 1))),
        (4, N'Proje havuzu dolu (en az bir konum)', 1, CASE WHEN (SELECT COUNT(*) FROM gorev.proje_havuzu WHERE seviye = 4 AND aktif = 1) > 0 THEN 1 ELSE 0 END,
            CONCAT(N'Aktif konum: ', (SELECT COUNT(*) FROM gorev.proje_havuzu WHERE seviye = 4 AND aktif = 1))),
        (5, N'Akademik takvim girilmiş', 0, CASE WHEN (SELECT COUNT(*) FROM gorev.takvim_tatil) > 0 THEN 1 ELSE 0 END,
            CONCAT(N'Takvim kaydı: ', (SELECT COUNT(*) FROM gorev.takvim_tatil))),
        (6, N'Asgari uygulama sürümü ayarlı (eski exe bağlanamasın)', 0, CASE WHEN (SELECT deger FROM gorev.sistem_ayarlari WHERE anahtar = N'MIN_UYGULAMA_SURUMU') <> N'0.0.0' THEN 1 ELSE 0 END,
            CONCAT(N'MIN_UYGULAMA_SURUMU = ', (SELECT deger FROM gorev.sistem_ayarlari WHERE anahtar = N'MIN_UYGULAMA_SURUMU'))),
        (7, N'Eski araç verisi aktarılmış', 0, CASE WHEN EXISTS (SELECT 1 FROM gorev.talepler WHERE kaynak = N'ESKI_ARAC') OR EXISTS (SELECT 1 FROM gorev.gecmis_gorev) THEN 1 ELSE 0 END,
            CONCAT(N'Eski talep: ', (SELECT COUNT(*) FROM gorev.talepler WHERE kaynak = N'ESKI_ARAC'), N', tarihsiz geçmiş: ', (SELECT COUNT(*) FROM gorev.gecmis_gorev))),
        (8, N'Pilotta girilmiş deneme talebi yok', 0, CASE WHEN EXISTS (SELECT 1 FROM gorev.talepler WHERE ISNULL(kaynak, N'') <> N'ESKI_ARAC') THEN 0 ELSE 1 END,
            CONCAT(N'Eski aktarım dışı talep: ', (SELECT COUNT(*) FROM gorev.talepler WHERE ISNULL(kaynak, N'') <> N'ESKI_ARAC'), N' (varsa canlıdan önce sıfırlamayı düşünün)'))
    ) k (sira, kontrol, zorunlu, tamam, ayrinti);
GO

CREATE PROCEDURE gorev.sp_canli_kontrol
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    IF gorev.fn_yonetici_mi() = 0 THROW 50023, N'Bu işlem için Merkez Yönetici yetkisi gerekir.', 1;
    SELECT sira, kontrol, zorunlu, tamam, ayrinti FROM gorev.fn_canli_kontrol() ORDER BY sira;
END;
GO

-- Tek yönlü: TEST → CANLI. Geri dönüş yalnızca db_owner'ın elle SQL'iyle (tools/sql/gorev_geri_donus.sql). Sıfırlama/kaldırma betikleri CANLI'da çalışmaz.
CREATE PROCEDURE gorev.sp_ortam_canli
    @onay       NVARCHAR(20),
    @min_surum  NVARCHAR(20) = NULL
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    IF gorev.fn_yonetici_mi() = 0 THROW 50023, N'Bu işlem için Merkez Yönetici yetkisi gerekir.', 1;
    IF ISNULL(@onay, N'') <> N'CANLI' THROW 50024, N'Onay için CANLI yazılmalıdır.', 1;
    SET @min_surum = NULLIF(LTRIM(RTRIM(ISNULL(@min_surum, N''))), N'');
    IF @min_surum IS NOT NULL AND @min_surum NOT LIKE N'[0-9]%.[0-9]%.[0-9]%' THROW 50024, N'Asgari sürüm 1.2.3 biçiminde olmalıdır.', 1;
    BEGIN TRANSACTION;
    DECLARE @eksik NVARCHAR(1000) = (SELECT STUFF((SELECT N'; ' + kontrol FROM gorev.fn_canli_kontrol() WHERE zorunlu = 1 AND tamam = 0 ORDER BY sira FOR XML PATH(N''), TYPE).value('.', 'NVARCHAR(MAX)'), 1, 2, N''));
    IF @eksik IS NOT NULL THROW 50024, @eksik, 1;
    UPDATE gorev.sistem_ayarlari SET deger = N'CANLI', guncelleme = SYSDATETIME() WHERE anahtar = N'ORTAM';
    IF @min_surum IS NOT NULL UPDATE gorev.sistem_ayarlari SET deger = @min_surum, guncelleme = SYSDATETIME() WHERE anahtar = N'MIN_UYGULAMA_SURUMU';
    INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti) VALUES (N'ORTAM_CANLI', N'sistem_ayarlari', N'ORTAM', LEFT(CONCAT(N'CANLI''ya geçildi', ISNULL(N'; asgari sürüm ' + @min_surum, N'')), 400));
    COMMIT TRANSACTION;
END;
GO

-- Eski araç verisini tek işlemde aktarır. @json arayüzde/C#'ta hazırlanır (EskiAktarim.Planla): gorevler (tarihli, kişisi eşleşmiş), tarihsiz, izinler, raporlar.
CREATE PROCEDURE gorev.sp_eski_aktar
    @json NVARCHAR(MAX)
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    IF gorev.fn_yonetici_mi() = 0 THROW 50023, N'Eski veri aktarımı yalnız Merkez Yönetici tarafından yapılır.', 1;
    IF (SELECT deger FROM gorev.sistem_ayarlari WHERE anahtar = N'ORTAM') <> N'TEST' THROW 50024, N'Aktarım yalnız TEST ortamında yapılır.', 1;
    IF ISJSON(@json) = 0 THROW 50024, N'Aktarım verisi geçersiz.', 1;
    IF EXISTS (SELECT 1 FROM gorev.talepler WHERE kaynak = N'ESKI_ARAC') OR EXISTS (SELECT 1 FROM gorev.gecmis_gorev WHERE kaynak LIKE N'ESKI_ARAC%')
        OR EXISTS (SELECT 1 FROM gorev.izin_talepleri WHERE kaynak = N'ESKI_ARAC') OR EXISTS (SELECT 1 FROM gorev.raporlar WHERE kaynak = N'ESKI_ARAC')
        THROW 50024, N'Aktarım daha önce yapılmış; önce "Aktarımı geri al" ile temizleyin.', 1;
    DECLARE @ben NVARCHAR(50) = gorev.fn_ben_sicil();

    CREATE TABLE #g (gid INT IDENTITY(1,1) PRIMARY KEY, eski_id BIGINT NULL, sicil NVARCHAR(50) COLLATE DATABASE_DEFAULT NOT NULL, ana NVARCHAR(300) COLLATE DATABASE_DEFAULT NOT NULL, alt NVARCHAR(300) COLLATE DATABASE_DEFAULT NOT NULL,
        faaliyet NVARCHAR(300) COLLATE DATABASE_DEFAULT NOT NULL, konum NVARCHAR(300) COLLATE DATABASE_DEFAULT NOT NULL, metin NVARCHAR(1000) COLLATE DATABASE_DEFAULT NULL,
        sorumlu_sicil NVARCHAR(50) COLLATE DATABASE_DEFAULT NULL, sorumlu_adi NVARCHAR(200) COLLATE DATABASE_DEFAULT NULL, gunler NVARCHAR(MAX) COLLATE DATABASE_DEFAULT NOT NULL);
    INSERT INTO #g (eski_id, sicil, ana, alt, faaliyet, konum, metin, sorumlu_sicil, sorumlu_adi, gunler)
    SELECT j.eskiId, j.sicil, LTRIM(RTRIM(j.ana)), ISNULL(NULLIF(LTRIM(RTRIM(j.alt)), N''), N'Genel'), ISNULL(NULLIF(LTRIM(RTRIM(j.faaliyet)), N''), N'Genel'), ISNULL(NULLIF(LTRIM(RTRIM(j.konum)), N''), N'Belirtilmemiş'),
           j.metin, NULLIF(j.sorumluSicil, N''), NULLIF(j.sorumluAdi, N''), j.gunler
    FROM OPENJSON(@json, N'$.gorevler') WITH (eskiId BIGINT '$.eskiId', sicil NVARCHAR(50) '$.sicil', ana NVARCHAR(300) '$.ana', alt NVARCHAR(300) '$.alt', faaliyet NVARCHAR(300) '$.faaliyet', konum NVARCHAR(300) '$.konum',
        metin NVARCHAR(1000) '$.metin', sorumluSicil NVARCHAR(50) '$.sorumluSicil', sorumluAdi NVARCHAR(200) '$.sorumluAdi', gunler NVARCHAR(MAX) '$.gunler' AS JSON) j;
    IF EXISTS (SELECT 1 FROM #g WHERE LEN(ana) = 0) THROW 50024, N'Ana proje adı boş olan görev var.', 1;
    IF EXISTS (SELECT 1 FROM #g g WHERE NOT EXISTS (SELECT 1 FROM gorev.personel p WHERE p.sicil_no = g.sicil)) THROW 50024, N'Kadroda olmayan sicil içeren görev var.', 1;
    IF EXISTS (SELECT 1 FROM #g WHERE sorumlu_sicil IS NULL) AND @ben IS NULL THROW 50024, N'Sorumlusu eşleşmeyen görevler var; aktarımı yapan Yönetici''nin kadro sicili gerekli.', 1;

    CREATE TABLE #gd (gid INT NOT NULL, tarih DATE NOT NULL);
    INSERT INTO #gd (gid, tarih) SELECT DISTINCT g.gid, TRY_CONVERT(DATE, d.value, 23) FROM #g g CROSS APPLY OPENJSON(g.gunler) d WHERE TRY_CONVERT(DATE, d.value, 23) IS NOT NULL;
    IF EXISTS (SELECT 1 FROM #g g WHERE NOT EXISTS (SELECT 1 FROM #gd d WHERE d.gid = g.gid)) THROW 50024, N'Günü olmayan görev var.', 1;
    IF EXISTS (SELECT 1 FROM #gd GROUP BY gid HAVING DATEDIFF(DAY, MIN(tarih), MAX(tarih)) > 92) THROW 50024, N'Bir görev 93 günden uzun bir aralığa yayılıyor.', 1;

    CREATE TABLE #tg (sicil NVARCHAR(50) COLLATE DATABASE_DEFAULT NULL, ad NVARCHAR(200) COLLATE DATABASE_DEFAULT NULL, ana NVARCHAR(300) COLLATE DATABASE_DEFAULT NOT NULL, proje NVARCHAR(300) COLLATE DATABASE_DEFAULT NULL,
        metin NVARCHAR(1000) COLLATE DATABASE_DEFAULT NULL, sorumlu_adi NVARCHAR(200) COLLATE DATABASE_DEFAULT NULL);
    INSERT INTO #tg (sicil, ad, ana, proje, metin, sorumlu_adi)
    SELECT NULLIF(j.sicil, N''), NULLIF(j.personelAdi, N''), ISNULL(NULLIF(LTRIM(RTRIM(j.ana)), N''), N'(Projesiz)'), NULLIF(j.proje, N''), NULLIF(j.metin, N''), NULLIF(j.sorumluAdi, N'')
    FROM OPENJSON(@json, N'$.tarihsiz') WITH (sicil NVARCHAR(50) '$.sicil', personelAdi NVARCHAR(200) '$.personelAdi', ana NVARCHAR(300) '$.ana', proje NVARCHAR(300) '$.proje', metin NVARCHAR(1000) '$.metin', sorumluAdi NVARCHAR(200) '$.sorumluAdi') j;
    IF EXISTS (SELECT 1 FROM #tg WHERE sicil IS NULL AND ad IS NULL) THROW 50024, N'Kişisi belli olmayan geçmiş görev var.', 1;
    IF EXISTS (SELECT 1 FROM #tg t WHERE t.sicil IS NOT NULL AND NOT EXISTS (SELECT 1 FROM gorev.personel p WHERE p.sicil_no = t.sicil)) THROW 50024, N'Kadroda olmayan sicil içeren geçmiş görev var.', 1;

    CREATE TABLE #iz (iid INT IDENTITY(1,1) PRIMARY KEY, sicil NVARCHAR(50) COLLATE DATABASE_DEFAULT NOT NULL, gunler NVARCHAR(MAX) COLLATE DATABASE_DEFAULT NOT NULL);
    INSERT INTO #iz (sicil, gunler) SELECT j.sicil, j.gunler FROM OPENJSON(@json, N'$.izinler') WITH (sicil NVARCHAR(50) '$.sicil', gunler NVARCHAR(MAX) '$.gunler' AS JSON) j;
    IF EXISTS (SELECT 1 FROM #iz i WHERE NOT EXISTS (SELECT 1 FROM gorev.personel p WHERE p.sicil_no = i.sicil)) THROW 50024, N'Kadroda olmayan sicil içeren izin var.', 1;
    CREATE TABLE #izd (iid INT NOT NULL, tarih DATE NOT NULL);
    INSERT INTO #izd (iid, tarih) SELECT DISTINCT i.iid, TRY_CONVERT(DATE, d.value, 23) FROM #iz i CROSS APPLY OPENJSON(i.gunler) d WHERE TRY_CONVERT(DATE, d.value, 23) IS NOT NULL;
    DELETE i FROM #iz i WHERE NOT EXISTS (SELECT 1 FROM #izd d WHERE d.iid = i.iid);

    CREATE TABLE #rp (sicil NVARCHAR(50) COLLATE DATABASE_DEFAULT NOT NULL, ilk DATE NOT NULL, son DATE NOT NULL);
    INSERT INTO #rp (sicil, ilk, son)
    SELECT j.sicil, TRY_CONVERT(DATE, j.ilk, 23), TRY_CONVERT(DATE, j.son, 23) FROM OPENJSON(@json, N'$.raporlar') WITH (sicil NVARCHAR(50) '$.sicil', ilk NVARCHAR(10) '$.ilk', son NVARCHAR(10) '$.son') j
    WHERE TRY_CONVERT(DATE, j.ilk, 23) IS NOT NULL AND TRY_CONVERT(DATE, j.son, 23) >= TRY_CONVERT(DATE, j.ilk, 23);
    IF EXISTS (SELECT 1 FROM #rp r WHERE NOT EXISTS (SELECT 1 FROM gorev.personel p WHERE p.sicil_no = r.sicil)) THROW 50024, N'Kadroda olmayan sicil içeren rapor var.', 1;

    BEGIN TRANSACTION;
    DECLARE @havuz_once INT = (SELECT COUNT(*) FROM gorev.proje_havuzu);
    -- Proje ağacı: yoksa oluştur (kaynak ESKI_ARAC)
    INSERT INTO gorev.proje_havuzu (ust_id, seviye, ad, kaynak)
    SELECT NULL, 1, a.ad, N'ESKI_ARAC' FROM (SELECT ana AS ad FROM #g UNION SELECT ana FROM #tg) a
    WHERE NOT EXISTS (SELECT 1 FROM gorev.proje_havuzu h WHERE h.ust_id IS NULL AND h.ad = a.ad);
    INSERT INTO gorev.proje_havuzu (ust_id, seviye, ad, kaynak)
    SELECT x.ust, 2, x.ad, N'ESKI_ARAC' FROM (SELECT DISTINCT h1.id AS ust, g.alt AS ad FROM #g g JOIN gorev.proje_havuzu h1 ON h1.ust_id IS NULL AND h1.ad = g.ana) x
    WHERE NOT EXISTS (SELECT 1 FROM gorev.proje_havuzu h WHERE h.ust_id = x.ust AND h.ad = x.ad);
    INSERT INTO gorev.proje_havuzu (ust_id, seviye, ad, kaynak)
    SELECT x.ust, 3, x.ad, N'ESKI_ARAC' FROM (SELECT DISTINCT h2.id AS ust, g.faaliyet AS ad FROM #g g JOIN gorev.proje_havuzu h1 ON h1.ust_id IS NULL AND h1.ad = g.ana JOIN gorev.proje_havuzu h2 ON h2.ust_id = h1.id AND h2.ad = g.alt) x
    WHERE NOT EXISTS (SELECT 1 FROM gorev.proje_havuzu h WHERE h.ust_id = x.ust AND h.ad = x.ad);
    INSERT INTO gorev.proje_havuzu (ust_id, seviye, ad, kaynak)
    SELECT x.ust, 4, x.ad, N'ESKI_ARAC' FROM (SELECT DISTINCT h3.id AS ust, g.konum AS ad FROM #g g JOIN gorev.proje_havuzu h1 ON h1.ust_id IS NULL AND h1.ad = g.ana JOIN gorev.proje_havuzu h2 ON h2.ust_id = h1.id AND h2.ad = g.alt
        JOIN gorev.proje_havuzu h3 ON h3.ust_id = h2.id AND h3.ad = g.faaliyet) x
    WHERE NOT EXISTS (SELECT 1 FROM gorev.proje_havuzu h WHERE h.ust_id = x.ust AND h.ad = x.ad);
    DECLARE @havuz_yeni INT = (SELECT COUNT(*) FROM gorev.proje_havuzu) - @havuz_once;

    -- Tarihli görevler: her eski satır bir talep (TAMAMEN_ATANDI) + günleri + atamalar
    CREATE TABLE #map (gid INT NOT NULL, talep_id INT NOT NULL);
    MERGE gorev.talepler AS t
    USING (SELECT g.gid, COALESCE(g.sorumlu_sicil, @ben) AS sorumlu, h4.id AS havuz,
                  LEFT(ISNULL(NULLIF(g.metin, N''), N'(eski kayıt)') + CASE WHEN g.sorumlu_sicil IS NULL AND g.sorumlu_adi IS NOT NULL THEN N' [Eski sorumlu: ' + g.sorumlu_adi + N']' ELSE N'' END, 1000) AS metin,
                  (SELECT MIN(tarih) FROM #gd d WHERE d.gid = g.gid) AS ilk, (SELECT MAX(tarih) FROM #gd d WHERE d.gid = g.gid) AS son
           FROM #g g
           JOIN gorev.proje_havuzu h1 ON h1.ust_id IS NULL AND h1.ad = g.ana
           JOIN gorev.proje_havuzu h2 ON h2.ust_id = h1.id AND h2.ad = g.alt
           JOIN gorev.proje_havuzu h3 ON h3.ust_id = h2.id AND h3.ad = g.faaliyet
           JOIN gorev.proje_havuzu h4 ON h4.ust_id = h3.id AND h4.ad = g.konum) s ON 1 = 0
    WHEN NOT MATCHED THEN
        INSERT (sorumlu_sicil_no, havuz_id, gorev_metni, saat_baslangic, saat_bitis, durum, ilk_tarih, son_tarih, kaynak)
        VALUES (s.sorumlu, s.havuz, s.metin, '07:30', '16:35', 'TAMAMEN_ATANDI', s.ilk, s.son, N'ESKI_ARAC')
    OUTPUT s.gid, inserted.id INTO #map (gid, talep_id);
    INSERT INTO gorev.talep_gunleri (talep_id, tarih, zaman_dilimi, kisi_sayisi) SELECT m.talep_id, d.tarih, 'TAM', 1 FROM #map m JOIN #gd d ON d.gid = m.gid;
    INSERT INTO gorev.atamalar (talep_id, sicil_no, tarih, zaman_dilimi, durum, kaynak) SELECT m.talep_id, g.sicil, d.tarih, 'TAM', 'AKTIF', N'ESKI_ARAC' FROM #map m JOIN #g g ON g.gid = m.gid JOIN #gd d ON d.gid = m.gid;
    DECLARE @n_talep INT = (SELECT COUNT(*) FROM #map), @n_atama INT = (SELECT COUNT(*) FROM #gd);

    -- İzinler (onaylı) ve raporlar (evraksız, eski kayıt)
    CREATE TABLE #imap (iid INT NOT NULL, izin_id INT NOT NULL);
    MERGE gorev.izin_talepleri AS t USING (SELECT iid, sicil FROM #iz) s ON 1 = 0
    WHEN NOT MATCHED THEN INSERT (sicil_no, durum, tur, aciklama, karar_hesap, karar_tarihi, kaynak) VALUES (s.sicil, 'ONAYLANDI', N'Eski kayıt', N'Eski araçtan aktarıldı', ORIGINAL_LOGIN(), SYSDATETIME(), N'ESKI_ARAC')
    OUTPUT s.iid, inserted.id INTO #imap (iid, izin_id);
    INSERT INTO gorev.izin_gunleri (izin_id, tarih, zaman_dilimi, durum) SELECT m.izin_id, d.tarih, 'TAM', 'ONAYLI' FROM #imap m JOIN #izd d ON d.iid = m.iid;
    INSERT INTO gorev.raporlar (sicil_no, ilk_tarih, son_tarih, aciklama, eski_kayit, kaynak) SELECT sicil, ilk, son, N'Eski araçtan aktarıldı (evraksız)', 1, N'ESKI_ARAC' FROM #rp;

    -- Tarihsiz geçmiş: kim hangi projeye gitti (havuz_id = ana proje)
    INSERT INTO gorev.gecmis_gorev (sicil_no, personel_adi_eski, havuz_id, proje_adi_eski, gorev_metni, sorumlu_adi_eski)
    SELECT t.sicil, ISNULL(t.ad, (SELECT adi_soyadi FROM gorev.personel WHERE sicil_no = t.sicil)), h.id, t.proje, t.metin, t.sorumlu_adi
    FROM #tg t JOIN gorev.proje_havuzu h ON h.ust_id IS NULL AND h.ad = t.ana;
    DECLARE @n_gecmis INT = (SELECT COUNT(*) FROM #tg), @n_izin INT = (SELECT COUNT(*) FROM #iz), @n_rapor INT = (SELECT COUNT(*) FROM #rp);

    INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti)
    VALUES (N'ESKI_AKTAR', N'talepler', N'ESKI_ARAC', LEFT(CONCAT(N'talep ', @n_talep, N', atama ', @n_atama, N', izin ', @n_izin, N', rapor ', @n_rapor, N', tarihsiz ', @n_gecmis, N', yeni havuz ', @havuz_yeni), 400));
    COMMIT TRANSACTION;
    SELECT @n_talep AS talep, @n_atama AS atama, @n_izin AS izin, @n_rapor AS rapor, @n_gecmis AS gecmis, @havuz_yeni AS havuz_yeni;
END;
GO

CREATE PROCEDURE gorev.sp_eski_aktar_durum
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    IF gorev.fn_yonetici_mi() = 0 THROW 50023, N'Bu işlem için Merkez Yönetici yetkisi gerekir.', 1;
    SELECT (SELECT COUNT(*) FROM gorev.talepler WHERE kaynak = N'ESKI_ARAC') AS talep,
           (SELECT COUNT(*) FROM gorev.atamalar WHERE kaynak = N'ESKI_ARAC') AS atama,
           (SELECT COUNT(*) FROM gorev.izin_talepleri WHERE kaynak = N'ESKI_ARAC') AS izin,
           (SELECT COUNT(*) FROM gorev.raporlar WHERE kaynak = N'ESKI_ARAC') AS rapor,
           (SELECT COUNT(*) FROM gorev.gecmis_gorev WHERE kaynak LIKE N'ESKI_ARAC%') AS gecmis,
           (SELECT COUNT(*) FROM gorev.proje_havuzu WHERE kaynak = N'ESKI_ARAC') AS havuz,
           (SELECT deger FROM gorev.sistem_ayarlari WHERE anahtar = N'ORTAM') AS ortam;
END;
GO

-- Aktarımı geri al: yalnız kaynak='ESKI_ARAC' kayıtları (ve onlara bağlı bildirim/revize/devir) silinir; kullanılmayan aktarım havuz satırları da. Yalnız TEST.
CREATE PROCEDURE gorev.sp_eski_aktar_geri_al
    @onay NVARCHAR(20)
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    IF gorev.fn_yonetici_mi() = 0 THROW 50023, N'Bu işlem için Merkez Yönetici yetkisi gerekir.', 1;
    IF ISNULL(@onay, N'') <> N'GERIAL' THROW 50024, N'Onay için GERIAL yazılmalıdır.', 1;
    IF (SELECT deger FROM gorev.sistem_ayarlari WHERE anahtar = N'ORTAM') <> N'TEST' THROW 50024, N'Geri alma yalnız TEST ortamında yapılır.', 1;
    BEGIN TRANSACTION;
    DECLARE @t TABLE (id INT PRIMARY KEY);
    INSERT INTO @t SELECT id FROM gorev.talepler WHERE kaynak = N'ESKI_ARAC';
    DELETE FROM gorev.bildirimler WHERE talep_id IN (SELECT id FROM @t);
    DELETE FROM gorev.revize_talepleri WHERE talep_id IN (SELECT id FROM @t);
    DELETE FROM gorev.sorumlu_devir WHERE talep_id IN (SELECT id FROM @t);
    DELETE FROM gorev.talep_oneri WHERE talep_id IN (SELECT id FROM @t);
    DELETE FROM gorev.atamalar WHERE talep_id IN (SELECT id FROM @t);
    DELETE FROM gorev.talep_gunleri WHERE talep_id IN (SELECT id FROM @t);
    DELETE FROM gorev.talepler WHERE id IN (SELECT id FROM @t);
    DELETE FROM gorev.izin_gunleri WHERE izin_id IN (SELECT id FROM gorev.izin_talepleri WHERE kaynak = N'ESKI_ARAC');
    DELETE FROM gorev.izin_talepleri WHERE kaynak = N'ESKI_ARAC';
    DELETE FROM gorev.raporlar WHERE kaynak = N'ESKI_ARAC';
    DELETE FROM gorev.gecmis_gorev WHERE kaynak LIKE N'ESKI_ARAC%';
    DECLARE @s INT = 4;
    WHILE @s >= 1
    BEGIN
        DELETE h FROM gorev.proje_havuzu h
        WHERE h.kaynak = N'ESKI_ARAC' AND h.seviye = @s
          AND NOT EXISTS (SELECT 1 FROM gorev.proje_havuzu c WHERE c.ust_id = h.id)
          AND NOT EXISTS (SELECT 1 FROM gorev.talepler t WHERE t.havuz_id = h.id)
          AND NOT EXISTS (SELECT 1 FROM gorev.gecmis_gorev g WHERE g.havuz_id = h.id)
          AND NOT EXISTS (SELECT 1 FROM gorev.proje_havuzu b WHERE b.birlestirildi_id = h.id);
        SET @s -= 1;
    END;
    INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti) VALUES (N'ESKI_AKTAR_GERI_AL', N'talepler', N'ESKI_ARAC', N'Eski araç aktarımı geri alındı');
    COMMIT TRANSACTION;
END;
GO

INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti) VALUES (N'SEMA', N'sema_surumleri', N'12', N'012_canli_aktarim.sql uygulandı');
GO
