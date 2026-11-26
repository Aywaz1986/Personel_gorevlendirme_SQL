-- 017_dilim16: Talep kodu yıllı (TLP-2026-0001), atama ufku 14 gün, adaylar yalnız SAHA rolü, matris iletişim + saha süzgeci,
-- görevde atananların adları, Sorumlu için salt-okunur izin/rapor bilgisi. Yalnız gorev nesneleri; dbo'ya dokunmaz. SINANMADI (CI'da SQL testi çalışır).

-- 1) Talep kodu: yıl + yıl içi sıra. Eski kayıtlar oluşturma yılına ve kimlik sırasına göre numaralanır.
ALTER TABLE gorev.talepler ADD yil SMALLINT NOT NULL CONSTRAINT DF_talepler_yil DEFAULT 0, yil_sira INT NOT NULL CONSTRAINT DF_talepler_yil_sira DEFAULT 0;
GO
UPDATE t SET yil = YEAR(t.olusturma), yil_sira = x.sira
FROM gorev.talepler t JOIN (SELECT id, ROW_NUMBER() OVER (PARTITION BY YEAR(olusturma) ORDER BY id) AS sira FROM gorev.talepler) x ON x.id = t.id;
GO
ALTER TABLE gorev.talepler DROP COLUMN kod;
GO
ALTER TABLE gorev.talepler ADD kod AS (N'TLP-' + CAST(yil AS NVARCHAR(4)) + N'-' + RIGHT(N'0000' + CAST(yil_sira AS NVARCHAR(10)), 4));
GO
CREATE UNIQUE INDEX UX_talepler_yil_sira ON gorev.talepler (yil, yil_sira) WHERE yil_sira > 0;
GO
-- Yeni talepte yıl/sıra sunucuda atanır (yarışta tekil dizin korur).
CREATE OR ALTER TRIGGER gorev.trg_talepler_kod ON gorev.talepler AFTER INSERT AS
BEGIN
    SET NOCOUNT ON;
    UPDATE t SET yil = x.yil, yil_sira = x.sira
    FROM gorev.talepler t JOIN (
        SELECT i.id, YEAR(i.olusturma) AS yil,
               ISNULL((SELECT MAX(z.yil_sira) FROM gorev.talepler z WITH (UPDLOCK, HOLDLOCK) WHERE z.yil = YEAR(i.olusturma)), 0)
                 + ROW_NUMBER() OVER (PARTITION BY YEAR(i.olusturma) ORDER BY i.id) AS sira
        FROM inserted i) x ON x.id = t.id;
END;
GO

-- 2) Atama: 14 gün ufku (sistem_ayarlari.ATAMA_UFKU_GUN; varsayılan 14).
INSERT INTO gorev.sistem_ayarlari (anahtar, deger, aciklama) VALUES (N'ATAMA_UFKU_GUN', N'14', N'Bugünden itibaren en fazla kaç gün ileriye atama yapılabilir');
GO
CREATE OR ALTER PROCEDURE gorev.sp_atama_onayla
    @talep_id      INT,
    @atamalar_json NVARCHAR(MAX),
    @karar         VARCHAR(10) = 'REDDET'
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
    IF gorev.fn_yonetici_mi() = 0 THROW 50023, N'Atama yalnız Merkez Yönetici tarafından yapılır.', 1;
    SET @karar = UPPER(LTRIM(RTRIM(ISNULL(@karar, 'REDDET'))));
    IF @karar NOT IN ('REDDET','CIKAR') THROW 50024, N'Karar REDDET ya da CIKAR olmalı.', 1;

    CREATE TABLE #n (sicil NVARCHAR(50) COLLATE DATABASE_DEFAULT NOT NULL, tarih DATE NOT NULL, zaman VARCHAR(3) COLLATE DATABASE_DEFAULT NOT NULL);
    DECLARE @gecersiz INT;
    SELECT @gecersiz = COUNT(*) FROM OPENJSON(@atamalar_json) WITH (tarih NVARCHAR(10) '$.tarih', sicil NVARCHAR(50) '$.sicil') j
    WHERE TRY_CONVERT(DATE, j.tarih, 23) IS NULL OR LEN(LTRIM(RTRIM(ISNULL(j.sicil, N'')))) = 0;
    IF @gecersiz > 0 THROW 50024, N'Atama listesinde geçersiz tarih ya da sicil var.', 1;
    INSERT INTO #n (sicil, tarih, zaman)
    SELECT LTRIM(RTRIM(j.sicil)), TRY_CONVERT(DATE, j.tarih, 23), UPPER(LTRIM(RTRIM(ISNULL(j.zaman, ''))))
    FROM OPENJSON(@atamalar_json) WITH (sicil NVARCHAR(50) '$.sicil', tarih NVARCHAR(10) '$.tarih', zaman VARCHAR(3) '$.zaman') j;
    IF NOT EXISTS (SELECT 1 FROM #n) THROW 50024, N'En az bir atama seçin.', 1;
    IF EXISTS (SELECT 1 FROM #n WHERE zaman NOT IN ('TAM','OO','OS')) THROW 50024, N'Zaman dilimi TAM, OO ya da OS olmalı.', 1;
    IF EXISTS (SELECT sicil, tarih, zaman FROM #n GROUP BY sicil, tarih, zaman HAVING COUNT(*) > 1) THROW 50024, N'Aynı kişi aynı gün ve dilime birden fazla kez seçilmiş.', 1;
    IF EXISTS (SELECT 1 FROM #n a JOIN #n b ON a.sicil = b.sicil AND a.tarih = b.tarih AND a.zaman = 'TAM' AND b.zaman <> 'TAM')
        THROW 50024, N'Aynı kişiye aynı güne tam gün ile yarım gün birlikte atanamaz.', 1;
    IF EXISTS (SELECT 1 FROM #n x WHERE NOT EXISTS (SELECT 1 FROM gorev.personel p WHERE p.sicil_no = x.sicil AND p.aktif = 1))
        THROW 50024, N'Seçilen kişilerden biri kadroda yok ya da pasif.', 1;

    BEGIN TRANSACTION;
    DECLARE @durum VARCHAR(20), @kod NVARCHAR(20), @sorumlu NVARCHAR(50);
    SELECT @durum = durum, @kod = kod, @sorumlu = sorumlu_sicil_no FROM gorev.talepler WITH (UPDLOCK) WHERE id = @talep_id;
    IF @@ROWCOUNT = 0 THROW 50024, N'Talep bulunamadı.', 1;
    IF @durum NOT IN ('ONAY_BEKLIYOR','KISMEN_ATANDI') THROW 50024, N'Bu durumdaki talebe atama yapılamaz.', 1;
    IF EXISTS (SELECT 1 FROM #n x WHERE NOT EXISTS (SELECT 1 FROM gorev.talep_gunleri g WHERE g.talep_id = @talep_id AND g.tarih = x.tarih AND g.zaman_dilimi = x.zaman))
        THROW 50024, N'Seçilen gün/dilim talepte yok.', 1;
    -- İleriye dönük atama ufku: bugünden itibaren en fazla 14 gün (Dilim 16).
    DECLARE @ufuk INT = ISNULL((SELECT TRY_CAST(deger AS INT) FROM gorev.sistem_ayarlari WHERE anahtar = N'ATAMA_UFKU_GUN'), 14);
    DECLARE @ufuk_msg NVARCHAR(200) = CONCAT(N'İleriye dönük atama sınırı ', @ufuk, N' gündür; daha ileri tarihe atama yapılamaz.');
    IF EXISTS (SELECT 1 FROM #n WHERE tarih > DATEADD(DAY, @ufuk, CAST(SYSDATETIME() AS DATE)))
        THROW 50024, @ufuk_msg, 1;
    -- kapasite: dilim başına istenen kişi sayısı
    IF EXISTS (SELECT 1 FROM gorev.talep_gunleri g
               CROSS APPLY (SELECT COUNT(*) AS yeni FROM #n x WHERE x.tarih = g.tarih AND x.zaman = g.zaman_dilimi) y
               CROSS APPLY (SELECT COUNT(*) AS mevcut FROM gorev.atamalar a WITH (UPDLOCK) WHERE a.talep_id = g.talep_id AND a.tarih = g.tarih AND a.zaman_dilimi = g.zaman_dilimi AND a.durum = 'AKTIF') m
               WHERE g.talep_id = @talep_id AND y.yeni > 0 AND y.yeni + m.mevcut > g.kisi_sayisi)
        THROW 50024, N'Bir gün/dilimde istenen kişi sayısı aşılıyor.', 1;
    IF EXISTS (SELECT 1 FROM #n x JOIN gorev.atamalar a WITH (UPDLOCK) ON a.talep_id = @talep_id AND a.sicil_no = x.sicil AND a.tarih = x.tarih AND a.durum = 'AKTIF'
               AND (a.zaman_dilimi = 'TAM' OR x.zaman = 'TAM' OR a.zaman_dilimi = x.zaman))
        THROW 50024, N'Seçilen kişi bu talepte aynı gün zaten atanmış.', 1;

    -- çakışmalar (başka talepler)
    CREATE TABLE #cak (atama_id INT NOT NULL, sicil NVARCHAR(50) COLLATE DATABASE_DEFAULT NOT NULL, tarih DATE NOT NULL, cakisan_talep_id INT NOT NULL);
    INSERT INTO #cak (atama_id, sicil, tarih, cakisan_talep_id)
    SELECT c.atama_id, MIN(c.sicil), MIN(c.tarih), MIN(c.cakisan_talep_id) FROM gorev.fn_atama_cakisma(@talep_id, @atamalar_json) c GROUP BY c.atama_id;
    UPDATE a SET a.durum = a.durum FROM gorev.atamalar a WITH (UPDLOCK) JOIN #cak c ON c.atama_id = a.id;
    IF EXISTS (SELECT 1 FROM #cak) AND @karar = 'REDDET'
    BEGIN
        DECLARE @mesaj NVARCHAR(500) = N'Çakışma var: ' + ISNULL(STUFF((SELECT TOP (5) N'; ' + p.adi_soyadi + N' ' + CONVERT(CHAR(10), c.tarih, 104) + N' (' + t.kod + N')'
            FROM #cak c JOIN gorev.personel p ON p.sicil_no = c.sicil JOIN gorev.talepler t ON t.id = c.cakisan_talep_id ORDER BY c.tarih
            FOR XML PATH(N''), TYPE).value('.', 'NVARCHAR(MAX)'), 1, 2, N''), N'');
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW 50030, @mesaj, 1;
    END;

    DECLARE @cikarilan INT = (SELECT COUNT(*) FROM #cak);
    IF @cikarilan > 0
    BEGIN
        UPDATE a SET durum = 'CIKARILDI', cikaran_hesap = ORIGINAL_LOGIN(), cikarma_tarihi = SYSDATETIME(),
                     cikarma_nedeni = LEFT(N'Yönetici başka göreve atadı: ' + @kod, 300), cikaran_talep_id = @talep_id
        FROM gorev.atamalar a JOIN #cak c ON c.atama_id = a.id;
        INSERT INTO gorev.bildirimler (sicil_no, tur, mesaj, talep_id)
        SELECT t.sorumlu_sicil_no, 'CIKARILDI',
               LEFT(t.kod + N': ' + STUFF((SELECT N', ' + p.adi_soyadi + N' ' + CONVERT(CHAR(10), c2.tarih, 104) FROM #cak c2 JOIN gorev.atamalar a2 ON a2.id = c2.atama_id
                    JOIN gorev.personel p ON p.sicil_no = c2.sicil WHERE a2.talep_id = t.id ORDER BY c2.tarih FOR XML PATH(N''), TYPE).value('.', 'NVARCHAR(MAX)'), 1, 2, N'')
                    + N' görevden çıkarıldı (Yönetici başka göreve atadı: ' + @kod + N').', 500), t.id
        FROM gorev.talepler t WHERE t.id IN (SELECT cakisan_talep_id FROM #cak);
        UPDATE t SET durum = gorev.fn_talep_durum(t.id), guncelleme = SYSDATETIME()
        FROM gorev.talepler t WHERE t.id IN (SELECT cakisan_talep_id FROM #cak) AND t.durum IN ('ONAY_BEKLIYOR','KISMEN_ATANDI','TAMAMEN_ATANDI');
        INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti)
        SELECT N'ATAMA_CIKAR', N'atamalar', CAST(c.atama_id AS NVARCHAR(60)), LEFT(CONCAT(c.sicil, N' ', CONVERT(CHAR(10), c.tarih, 23), N' talep ', c.cakisan_talep_id, N' -> ', @kod), 400) FROM #cak c;
    END;

    INSERT INTO gorev.atamalar (talep_id, sicil_no, tarih, zaman_dilimi) SELECT @talep_id, sicil, tarih, zaman FROM #n;
    DECLARE @eklenen INT = @@ROWCOUNT;
    DECLARE @yeni_durum VARCHAR(20) = gorev.fn_talep_durum(@talep_id);
    UPDATE gorev.talepler SET durum = @yeni_durum, guncelleme = SYSDATETIME() WHERE id = @talep_id;
    INSERT INTO gorev.bildirimler (sicil_no, tur, mesaj, talep_id)
    VALUES (@sorumlu, 'ATANDI', LEFT(CONCAT(@kod, N': ', @eklenen, N' kişi-gün ataması yapıldı (', CASE WHEN @yeni_durum = 'TAMAMEN_ATANDI' THEN N'tamamen atandı' ELSE N'kısmen atandı' END, N').'), 500), @talep_id);
    INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti)
    VALUES (N'TALEP_ATAMA', N'talepler', CAST(@talep_id AS NVARCHAR(60)), LEFT(CONCAT(@kod, N' atama ', @eklenen, N', çıkarılan ', @cikarilan, N', durum ', @yeni_durum), 400));

    DECLARE @tatil INT = (SELECT COUNT(DISTINCT x.tarih) FROM #n x JOIN gorev.takvim_tatil t ON x.tarih BETWEEN t.baslangic AND t.bitis
                          AND NOT (t.zaman_dilimi <> 'TAM' AND x.zaman <> 'TAM' AND t.zaman_dilimi <> x.zaman));
    COMMIT TRANSACTION;
    SELECT @talep_id AS talep_id, @yeni_durum AS durum, @eklenen AS atanan, @cikarilan AS cikarilan,
           CASE WHEN @tatil > 0 THEN CONCAT(@tatil, N' gün tatil/kapalı gün kaydıyla çakışıyor.') ELSE NULL END AS uyari;
END;
GO

-- 3) Adaylar (tavsiye bloğu ve atama paneli): yalnız Saha Personeli rolündekiler.
CREATE OR ALTER PROCEDURE gorev.sp_atama_adaylar
    @talep_id INT,
    @q NVARCHAR(100) = NULL
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    IF gorev.fn_yonetici_mi() = 0 THROW 50023, N'Atama yalnız Merkez Yönetici tarafından yapılır.', 1;
    DECLARE @havuz INT = (SELECT havuz_id FROM gorev.talepler WHERE id = @talep_id);
    IF @havuz IS NULL THROW 50024, N'Talep bulunamadı.', 1;
    DECLARE @ana INT = gorev.fn_havuz_ana(@havuz);
    SET @q = LTRIM(RTRIM(ISNULL(@q, N'')));
    SELECT TOP (60) p.sicil_no, p.adi_soyadi, p.bolum,
        CAST(CASE WHEN EXISTS (SELECT 1 FROM gorev.talep_oneri o WHERE o.talep_id = @talep_id AND o.sicil_no = p.sicil_no) THEN 1 ELSE 0 END AS BIT) AS onerildi,
        (SELECT COUNT(DISTINCT a.tarih) FROM gorev.atamalar a JOIN gorev.talepler t2 ON t2.id = a.talep_id
          WHERE a.sicil_no = p.sicil_no AND a.durum = 'AKTIF' AND a.talep_id <> @talep_id AND gorev.fn_havuz_ana(t2.havuz_id) = @ana)
        + (SELECT COUNT(*) FROM gorev.gecmis_gorev gg WHERE gg.sicil_no = p.sicil_no AND gg.havuz_id IS NOT NULL AND gorev.fn_havuz_ana(gg.havuz_id) = @ana) AS gecmis,
        (SELECT COUNT(*) FROM gorev.atamalar a WHERE a.talep_id = @talep_id AND a.sicil_no = p.sicil_no AND a.durum = 'AKTIF') AS bu_talepte,
        (SELECT COUNT(DISTINCT g.tarih) FROM gorev.talep_gunleri g
          JOIN gorev.atamalar a ON a.sicil_no = p.sicil_no AND a.tarih = g.tarih AND a.durum = 'AKTIF' AND a.talep_id <> @talep_id
               AND (a.zaman_dilimi = 'TAM' OR g.zaman_dilimi = 'TAM' OR a.zaman_dilimi = g.zaman_dilimi)
          WHERE g.talep_id = @talep_id) AS cakisan_gun,
        (SELECT COUNT(DISTINCT a.talep_id) FROM gorev.atamalar a JOIN gorev.talepler t2 ON t2.id = a.talep_id
          WHERE a.sicil_no = p.sicil_no AND a.durum = 'AKTIF' AND a.talep_id <> @talep_id AND gorev.fn_havuz_ana(t2.havuz_id) = @ana) AS toplam_gorev,
        CAST((SELECT ISNULL(SUM(CASE a.zaman_dilimi WHEN 'TAM' THEN 1.0 ELSE 0.5 END), 0) FROM gorev.atamalar a JOIN gorev.talepler t2 ON t2.id = a.talep_id
          WHERE a.sicil_no = p.sicil_no AND a.durum = 'AKTIF' AND a.talep_id <> @talep_id AND gorev.fn_havuz_ana(t2.havuz_id) = @ana) AS DECIMAL(9,1)) AS adam_gun,
        STUFF((SELECT DISTINCT N', ' + h4.ad FROM gorev.atamalar a JOIN gorev.talepler t2 ON t2.id = a.talep_id JOIN gorev.proje_havuzu h4 ON h4.id = t2.havuz_id
          WHERE a.sicil_no = p.sicil_no AND a.durum = 'AKTIF' AND a.talep_id <> @talep_id AND gorev.fn_havuz_ana(t2.havuz_id) = @ana FOR XML PATH(N''), TYPE).value('.', 'NVARCHAR(MAX)'), 1, 2, N'') AS yerlesker,
        (SELECT COUNT(DISTINCT g.tarih) FROM gorev.talep_gunleri g WHERE g.talep_id = @talep_id) AS talep_gun,
        (SELECT COUNT(DISTINCT g.tarih) FROM gorev.talep_gunleri g WHERE g.talep_id = @talep_id
           AND (EXISTS (SELECT 1 FROM gorev.izin_gunleri d JOIN gorev.izin_talepleri i ON i.id = d.izin_id WHERE i.sicil_no = p.sicil_no AND d.durum IN ('BEKLIYOR','ONAYLI') AND d.tarih = g.tarih)
                OR EXISTS (SELECT 1 FROM gorev.raporlar r WHERE r.sicil_no = p.sicil_no AND r.durum = 'AKTIF' AND g.tarih BETWEEN r.ilk_tarih AND r.son_tarih))) AS izin_rapor_gun
    FROM gorev.personel p
    WHERE p.aktif = 1 AND (LEN(@q) = 0 OR CHARINDEX(@q, p.adi_soyadi) > 0)
      AND p.sicil_no IN (SELECT k.sicil_no FROM gorev.fn_rol_kisileri(N'SAHA') k)   -- yalnız Saha Personeli rolündekiler (Dilim 16)
    ORDER BY 4 DESC, 5 DESC, 7 ASC, p.adi_soyadi;
END;
GO

-- 4) Matris: iletişim numaraları (Yönetici/Sorumlu), Saha personeli süzgeci.
CREATE OR ALTER PROCEDURE gorev.sp_matris_hafta
    @bas DATE,
    @bolum NVARCHAR(500) = NULL,
    @ana NVARCHAR(200) = NULL,
    @q NVARCHAR(100) = NULL,
    @sadece_gorevli BIT = 1,
    @konum NVARCHAR(200) = NULL,
    @sadece_musait BIT = 0,
    @sadece_saha BIT = 0
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    IF gorev.fn_kayitli_mi() = 0 THROW 50023, N'Bu işlem için yetkiniz yok.', 1;
    IF @bas IS NULL THROW 50024, N'Hafta başlangıcı gerekli.', 1;
    SET @bas = gorev.fn_hafta_basi(@bas);
    DECLARE @bit DATE = DATEADD(DAY, 6, @bas);
    SET @bolum = NULLIF(LTRIM(RTRIM(ISNULL(@bolum, N''))), N'');
    SET @ana = NULLIF(LTRIM(RTRIM(ISNULL(@ana, N''))), N'');
    SET @konum = NULLIF(LTRIM(RTRIM(ISNULL(@konum, N''))), N'');
    SET @q = LTRIM(RTRIM(ISNULL(@q, N'')));
    -- İletişim numaraları yalnız Yönetici ve Proje Sorumlusuna açılır.
    DECLARE @tel BIT = CASE WHEN gorev.fn_yonetici_mi() = 1 OR gorev.fn_sorumlu_mu() = 1 THEN 1 ELSE 0 END;

    CREATE TABLE #h (
        sicil_no NVARCHAR(50) COLLATE DATABASE_DEFAULT NOT NULL, tarih DATE NOT NULL, zaman VARCHAR(3) COLLATE DATABASE_DEFAULT NOT NULL,
        talep_id INT NOT NULL, kod NVARCHAR(20) COLLATE DATABASE_DEFAULT NULL, ana NVARCHAR(200) COLLATE DATABASE_DEFAULT NULL, alt NVARCHAR(200) COLLATE DATABASE_DEFAULT NULL,
        faaliyet NVARCHAR(200) COLLATE DATABASE_DEFAULT NULL, konum NVARCHAR(200) COLLATE DATABASE_DEFAULT NULL,
        saat NVARCHAR(20) COLLATE DATABASE_DEFAULT NULL, sorumlu NVARCHAR(200) COLLATE DATABASE_DEFAULT NULL, sorumlu_gsm NVARCHAR(50) COLLATE DATABASE_DEFAULT NULL);
    INSERT #h (sicil_no, tarih, zaman, talep_id, kod, ana, alt, faaliyet, konum, saat, sorumlu, sorumlu_gsm)
    SELECT a.sicil_no, a.tarih, a.zaman_dilimi, t.id, t.kod, h1.ad, h2.ad, h3.ad, h4.ad,
           CONVERT(CHAR(5), t.saat_baslangic, 108) + N' - ' + CONVERT(CHAR(5), t.saat_bitis, 108), s.adi_soyadi, CASE WHEN @tel = 1 THEN s.gsm_no END
    FROM gorev.atamalar a
    JOIN gorev.talepler t ON t.id = a.talep_id
    JOIN gorev.personel s ON s.sicil_no = t.sorumlu_sicil_no
    JOIN gorev.proje_havuzu h4 ON h4.id = t.havuz_id
    JOIN gorev.proje_havuzu h3 ON h3.id = h4.ust_id
    JOIN gorev.proje_havuzu h2 ON h2.id = h3.ust_id
    JOIN gorev.proje_havuzu h1 ON h1.id = h2.ust_id
    WHERE a.durum = 'AKTIF' AND a.tarih BETWEEN @bas AND @bit AND (@ana IS NULL OR h1.ad = @ana) AND (@konum IS NULL OR h4.ad = @konum);

    CREATE TABLE #i (sicil_no NVARCHAR(50) COLLATE DATABASE_DEFAULT NOT NULL, tarih DATE NOT NULL, zaman VARCHAR(3) COLLATE DATABASE_DEFAULT NOT NULL,
                     tur VARCHAR(5) COLLATE DATABASE_DEFAULT NOT NULL, durum VARCHAR(10) COLLATE DATABASE_DEFAULT NOT NULL, kod NVARCHAR(20) COLLATE DATABASE_DEFAULT NOT NULL);
    INSERT #i (sicil_no, tarih, zaman, tur, durum, kod)
    SELECT t.sicil_no, g.tarih, g.zaman_dilimi, 'IZIN', g.durum, t.kod
    FROM gorev.izin_gunleri g JOIN gorev.izin_talepleri t ON t.id = g.izin_id WHERE g.durum IN ('BEKLIYOR','ONAYLI') AND g.tarih BETWEEN @bas AND @bit;
    INSERT #i (sicil_no, tarih, zaman, tur, durum, kod)
    SELECT r.sicil_no, DATEADD(DAY, n.n, @bas), 'TAM', 'RAPOR', 'ONAYLI', r.kod
    FROM gorev.raporlar r CROSS JOIN (VALUES (0),(1),(2),(3),(4),(5),(6)) n(n)
    WHERE r.durum = 'AKTIF' AND DATEADD(DAY, n.n, @bas) BETWEEN r.ilk_tarih AND r.son_tarih;

    SELECT TOP (1000) p.sicil_no, p.adi_soyadi, p.bolum, CASE WHEN @tel = 1 THEN p.gsm_no END AS gsm,
        (SELECT CONVERT(CHAR(10), c.tarih, 23) AS tarih, c.zaman, c.talep_id AS talepId, c.kod, c.ana, c.alt, c.faaliyet, c.konum, c.saat, c.sorumlu, c.sorumlu_gsm AS sorumluGsm
         FROM #h c WHERE c.sicil_no = p.sicil_no ORDER BY c.tarih, c.zaman FOR JSON PATH) AS hucreler_json,
        (SELECT CONVERT(CHAR(10), c.tarih, 23) AS tarih, c.zaman, c.tur, c.durum, c.kod
         FROM #i c WHERE c.sicil_no = p.sicil_no ORDER BY c.tarih, c.zaman FOR JSON PATH) AS izinler_json
    FROM gorev.personel p
    WHERE (p.aktif = 1 OR EXISTS (SELECT 1 FROM #h c WHERE c.sicil_no = p.sicil_no) OR EXISTS (SELECT 1 FROM #i c WHERE c.sicil_no = p.sicil_no))
      AND (@bolum IS NULL OR p.bolum = @bolum)
      AND (LEN(@q) = 0 OR CHARINDEX(@q, p.adi_soyadi) > 0)
      AND (@sadece_saha = 0 OR p.sicil_no IN (SELECT k.sicil_no FROM gorev.fn_rol_kisileri(N'SAHA') k))
      AND (CASE WHEN @sadece_musait = 1 THEN
              CASE WHEN p.aktif = 1 AND @ana IS NULL AND @konum IS NULL AND EXISTS (
                  SELECT 1 FROM (VALUES (0),(1),(2),(3),(4)) g(n) CROSS JOIN (VALUES ('OO'),('OS')) z(zm)
                  WHERE NOT EXISTS (SELECT 1 FROM #h c WHERE c.sicil_no = p.sicil_no AND c.tarih = DATEADD(DAY, g.n, @bas) AND (c.zaman = 'TAM' OR c.zaman = z.zm))
                    AND NOT EXISTS (SELECT 1 FROM #i c WHERE c.sicil_no = p.sicil_no AND c.tarih = DATEADD(DAY, g.n, @bas) AND (c.zaman = 'TAM' OR c.zaman = z.zm))
              ) THEN 1 ELSE 0 END
            WHEN (@sadece_gorevli = 0 AND @ana IS NULL AND @konum IS NULL) OR EXISTS (SELECT 1 FROM #h c WHERE c.sicil_no = p.sicil_no)
                 OR (@ana IS NULL AND @konum IS NULL AND EXISTS (SELECT 1 FROM #i c WHERE c.sicil_no = p.sicil_no)) THEN 1 ELSE 0 END) = 1
    ORDER BY p.adi_soyadi;
END;
GO

-- 5) Görev kartı başlığında "X atandı": talep başına aktif atananların adları (Yönetici: tümü; Sorumlu: kendi talepleri).
CREATE OR ALTER PROCEDURE gorev.sp_talep_atanan_adlar
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @yon BIT = gorev.fn_yonetici_mi(), @ben NVARCHAR(50) = gorev.fn_ben_sicil();
    IF @yon = 0 AND gorev.fn_sorumlu_mu() = 0 THROW 50023, N'Bu işlem için yetkiniz yok.', 1;
    SELECT t.id AS talep_id,
           STUFF((SELECT N', ' + x.adi_soyadi FROM (SELECT DISTINCT p.adi_soyadi FROM gorev.atamalar a JOIN gorev.personel p ON p.sicil_no = a.sicil_no
                  WHERE a.talep_id = t.id AND a.durum = 'AKTIF') x ORDER BY x.adi_soyadi FOR XML PATH(N''), TYPE).value('.', 'NVARCHAR(MAX)'), 1, 2, N'') AS adlar
    FROM gorev.talepler t
    WHERE EXISTS (SELECT 1 FROM gorev.atamalar a WHERE a.talep_id = t.id AND a.durum = 'AKTIF') AND (@yon = 1 OR t.sorumlu_sicil_no = @ben);
END;
GO

-- 6) Sorumlu (ve Yönetici) için salt-okunur bilgi: bugünden @gun gün sonrasına kadar izinli / raporlu personel. İşlem yok; evrak ve açıklama döndürülmez.
CREATE OR ALTER PROCEDURE gorev.sp_izin_rapor_bilgi
    @gun INT = 14
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    IF gorev.fn_yonetici_mi() = 0 AND gorev.fn_sorumlu_mu() = 0 THROW 50023, N'Bu işlem için yetkiniz yok.', 1;
    IF @gun IS NULL OR @gun < 1 OR @gun > 60 SET @gun = 14;
    DECLARE @bas DATE = CAST(SYSDATETIME() AS DATE), @bit DATE = DATEADD(DAY, @gun, CAST(SYSDATETIME() AS DATE));
    SELECT p.sicil_no, p.adi_soyadi, p.gsm_no, N'IZIN' AS tur, MIN(g.tarih) AS ilk_tarih, MAX(g.tarih) AS son_tarih,
           CASE WHEN MAX(CASE g.durum WHEN 'ONAYLI' THEN 1 ELSE 0 END) = 1 THEN 'ONAYLI' ELSE 'BEKLIYOR' END AS durum
    FROM gorev.izin_gunleri g JOIN gorev.izin_talepleri i ON i.id = g.izin_id JOIN gorev.personel p ON p.sicil_no = i.sicil_no
    WHERE g.durum IN ('BEKLIYOR','ONAYLI') AND g.tarih BETWEEN @bas AND @bit
    GROUP BY p.sicil_no, p.adi_soyadi, p.gsm_no, g.izin_id
    UNION ALL
    SELECT p.sicil_no, p.adi_soyadi, p.gsm_no, N'RAPOR', r.ilk_tarih, r.son_tarih, 'ONAYLI'
    FROM gorev.raporlar r JOIN gorev.personel p ON p.sicil_no = r.sicil_no
    WHERE r.durum = 'AKTIF' AND r.ilk_tarih <= @bit AND r.son_tarih >= @bas
    ORDER BY 5, 2;
END;
GO

INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti) VALUES (N'SEMA', N'sema_surumleri', N'17', N'017_dilim16.sql uygulandı');
GO
