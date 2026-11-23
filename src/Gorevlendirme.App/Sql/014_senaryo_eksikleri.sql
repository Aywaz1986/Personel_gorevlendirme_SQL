-- 014_senaryo_eksikleri: senaryo karşılaştırmasında kalan eksikler (Dilim 12). Yalnız gorev nesneleri; dbo'ya dokunmaz. SINANMADI (CI'da SQL testi çalışır).
-- 1) Rol bazlı kişi listeleri (Sorumlu Havuzu / Saha Personeli). 2) İşlem günlüğü ekranı. 3) Rapor tarihi düzeltme.
-- 4) Revizede kişi sayısı düşürme (çıkarılacak kişiyi Yönetici seçer) + uzatılan günlerde müsaitlik. 5) Matriste "Sadece müsaitler". 6) Analiz kırılımı.

-- 1) Rol bazlı kişiler: kişi başına istisna kaydı varsa yalnız o, yoksa bölüm eşleştirmesi (sp_ben ile aynı kural). Yönetici rolü bölümden gelmez.
CREATE OR ALTER FUNCTION gorev.fn_rol_kisileri (@rol NVARCHAR(10))
RETURNS TABLE
AS RETURN
(
    SELECT p.sicil_no, p.adi_soyadi, p.bolum
    FROM gorev.personel p
    OUTER APPLY (SELECT TOP (1) i.sorumlu_mu, i.saha_mi FROM gorev.kullanici_yetki_istisna i
                 WHERE i.aktif = 1 AND (i.sicil_no = p.sicil_no
                    OR gorev.fn_hesap_eslesir(i.hesap, p.kullanici_adi) = 1
                    OR gorev.fn_hesap_eslesir(p.kullanici_adi, i.hesap) = 1) ORDER BY i.id) x
    WHERE p.aktif = 1
      AND ((x.sorumlu_mu IS NOT NULL AND ((@rol = N'SORUMLU' AND x.sorumlu_mu = 1) OR (@rol = N'SAHA' AND x.saha_mi = 1)))
        OR (x.sorumlu_mu IS NULL AND EXISTS (SELECT 1 FROM gorev.rol_bolum_eslestirme e WHERE e.bolum = p.bolum AND e.rol = @rol)))
);
GO

-- Talep ekranı seçim listeleri: SORUMLU = Sorumlu Havuzu (yalnız Yönetici, vekâleten talep için); SAHA = önerilebilecek saha personeli (Yönetici, Sorumlu).
CREATE OR ALTER PROCEDURE gorev.sp_rol_personel
    @rol NVARCHAR(10),
    @q   NVARCHAR(100) = NULL
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    SET @rol = UPPER(LTRIM(RTRIM(ISNULL(@rol, N''))));
    IF @rol NOT IN (N'SORUMLU', N'SAHA') THROW 50024, N'Rol SORUMLU ya da SAHA olmalı.', 1;
    DECLARE @yon BIT = gorev.fn_yonetici_mi();
    IF @yon = 0 AND NOT (@rol = N'SAHA' AND gorev.fn_sorumlu_mu() = 1) THROW 50023, N'Bu işlem için yetkiniz yok.', 1;
    SET @q = LTRIM(RTRIM(ISNULL(@q, N'')));
    SELECT TOP (500) k.sicil_no, k.adi_soyadi, k.bolum
    FROM gorev.fn_rol_kisileri(@rol) k
    WHERE LEN(@q) = 0 OR CHARINDEX(@q, k.adi_soyadi) > 0
    ORDER BY k.adi_soyadi;
END;
GO

-- 2) İşlem günlüğü (yalnız Yönetici; salt okuma). İşlemi yapan: Windows hesabı + kadrodaki adı.
CREATE OR ALTER PROCEDURE gorev.sp_log_listele
    @bas    DATE = NULL,
    @bit    DATE = NULL,
    @islem  NVARCHAR(60) = NULL,
    @q      NVARCHAR(100) = NULL,
    @ust    INT = 500
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    IF gorev.fn_yonetici_mi() = 0 THROW 50023, N'İşlem günlüğünü yalnız Merkez Yönetici görebilir.', 1;
    SET @islem = NULLIF(LTRIM(RTRIM(ISNULL(@islem, N''))), N'');
    SET @q = LTRIM(RTRIM(ISNULL(@q, N'')));
    IF @ust IS NULL OR @ust < 1 SET @ust = 500;
    IF @ust > 2000 SET @ust = 2000;
    SELECT TOP (@ust) l.id, CONVERT(CHAR(19), l.zaman, 120) AS zaman, l.kullanici, ISNULL(k.adi_soyadi, N'') AS ad_soyad, l.islem, l.nesne, l.nesne_id, l.ayrinti
    FROM gorev.islem_log l
    OUTER APPLY (SELECT TOP (1) p.adi_soyadi FROM gorev.personel p
                 WHERE gorev.fn_hesap_eslesir(p.kullanici_adi, l.kullanici) = 1 ORDER BY p.aktif DESC, p.id) k
    WHERE (@bas IS NULL OR l.zaman >= @bas) AND (@bit IS NULL OR l.zaman < DATEADD(DAY, 1, @bit))
      AND (@islem IS NULL OR l.islem = @islem)
      AND (LEN(@q) = 0 OR CHARINDEX(@q, l.kullanici) > 0 OR CHARINDEX(@q, ISNULL(l.ayrinti, N'')) > 0 OR CHARINDEX(@q, ISNULL(l.nesne_id, N'')) > 0 OR CHARINDEX(@q, ISNULL(k.adi_soyadi, N'')) > 0)
    ORDER BY l.id DESC;
END;
GO

CREATE OR ALTER PROCEDURE gorev.sp_log_islem_turleri
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    IF gorev.fn_yonetici_mi() = 0 THROW 50023, N'İşlem günlüğünü yalnız Merkez Yönetici görebilir.', 1;
    SELECT islem, COUNT(*) AS adet FROM gorev.islem_log GROUP BY islem ORDER BY islem;
END;
GO

-- 3) Rapor tarihi düzeltme (Yönetici): yeni aralıkta "rapor kazanır" (izin iptali) ve çakışan atama uyarısı sp_rapor_kaydet ile aynıdır.
CREATE OR ALTER PROCEDURE gorev.sp_rapor_duzelt
    @id        INT,
    @ilk_tarih DATE,
    @son_tarih DATE,
    @neden     NVARCHAR(300) = NULL
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
    IF gorev.fn_yonetici_mi() = 0 THROW 50023, N'Rapor tarihini yalnız Merkez Yönetici düzeltebilir.', 1;
    IF @ilk_tarih IS NULL OR @son_tarih IS NULL OR @son_tarih < @ilk_tarih THROW 50024, N'Rapor tarih aralığı geçersiz.', 1;
    IF DATEDIFF(DAY, @ilk_tarih, @son_tarih) > 365 THROW 50024, N'Tek raporda en fazla 366 gün olabilir.', 1;
    BEGIN TRANSACTION;
    DECLARE @sicil NVARCHAR(50), @kod NVARCHAR(20), @eski_ilk DATE, @eski_son DATE, @durum VARCHAR(10);
    SELECT @sicil = sicil_no, @kod = kod, @eski_ilk = ilk_tarih, @eski_son = son_tarih, @durum = durum FROM gorev.raporlar WITH (UPDLOCK) WHERE id = @id;
    IF @sicil IS NULL THROW 50024, N'Rapor bulunamadı.', 1;
    IF @durum <> 'AKTIF' THROW 50024, N'İptal edilmiş rapor düzeltilemez.', 1;
    IF EXISTS (SELECT 1 FROM gorev.raporlar WITH (UPDLOCK) WHERE sicil_no = @sicil AND durum = 'AKTIF' AND id <> @id AND ilk_tarih <= @son_tarih AND son_tarih >= @ilk_tarih)
        THROW 50024, N'Yeni tarihlerde bu kişinin başka aktif raporu var.', 1;
    UPDATE gorev.raporlar SET ilk_tarih = @ilk_tarih, son_tarih = @son_tarih WHERE id = @id;
    DECLARE @ad NVARCHAR(200) = (SELECT adi_soyadi FROM gorev.personel WHERE sicil_no = @sicil);

    CREATE TABLE #iz (izin_id INT NOT NULL);
    INSERT INTO #iz (izin_id) SELECT DISTINCT g.izin_id FROM gorev.izin_gunleri g WITH (UPDLOCK) JOIN gorev.izin_talepleri t ON t.id = g.izin_id
    WHERE t.sicil_no = @sicil AND g.durum IN ('BEKLIYOR','ONAYLI') AND g.tarih BETWEEN @ilk_tarih AND @son_tarih;
    DECLARE @izin_iptal INT = (SELECT COUNT(*) FROM gorev.izin_gunleri g JOIN #iz i ON i.izin_id = g.izin_id WHERE g.durum IN ('BEKLIYOR','ONAYLI') AND g.tarih BETWEEN @ilk_tarih AND @son_tarih);
    UPDATE g SET durum = 'IPTAL' FROM gorev.izin_gunleri g JOIN #iz i ON i.izin_id = g.izin_id WHERE g.durum IN ('BEKLIYOR','ONAYLI') AND g.tarih BETWEEN @ilk_tarih AND @son_tarih;
    UPDATE t SET durum = 'RAPORLA_IPTAL', guncelleme = SYSDATETIME() FROM gorev.izin_talepleri t JOIN #iz i ON i.izin_id = t.id
    WHERE NOT EXISTS (SELECT 1 FROM gorev.izin_gunleri g WHERE g.izin_id = t.id AND g.durum <> 'IPTAL');

    CREATE TABLE #a (atama_id INT NOT NULL, tarih DATE NOT NULL, talep_id INT NOT NULL);
    INSERT INTO #a (atama_id, tarih, talep_id) SELECT a.id, a.tarih, a.talep_id FROM gorev.atamalar a WHERE a.sicil_no = @sicil AND a.durum = 'AKTIF' AND a.tarih BETWEEN @ilk_tarih AND @son_tarih;
    DECLARE @cakisan INT = (SELECT COUNT(*) FROM #a);
    IF @cakisan > 0
    BEGIN
        INSERT INTO gorev.bildirimler (sicil_no, tur, mesaj, talep_id)
        SELECT y.sicil_no, 'RAPOR_CAKISMA', LEFT(@kod + N': ' + @ad + N' raporu düzeltildi; ' + CAST(@cakisan AS NVARCHAR(10)) + N' görev ataması etkileniyor. İkame gerekli.', 500), NULL FROM gorev.fn_yonetici_sicilleri() y;
    END;
    INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti)
    VALUES (N'RAPOR_DUZELT', N'raporlar', CAST(@id AS NVARCHAR(60)),
            LEFT(CONCAT(@kod, N' ', @ad, N': ', CONVERT(CHAR(10), @eski_ilk, 23), N'..', CONVERT(CHAR(10), @eski_son, 23), N' → ', CONVERT(CHAR(10), @ilk_tarih, 23), N'..', CONVERT(CHAR(10), @son_tarih, 23),
                 N', iptal izin günü ', @izin_iptal, N', çakışan atama ', @cakisan, ISNULL(N' – ' + NULLIF(LTRIM(RTRIM(@neden)), N''), N'')), 400));
    COMMIT TRANSACTION;
    SELECT @id AS id, @kod AS kod, @izin_iptal AS izin_iptal, @cakisan AS cakisan_atama;
END;
GO

-- 4a) Revizede kişi sayısı düşürme: fazla atanmış gün/dilimler ve çıkarılabilecek kişiler (Yönetici seçer).
CREATE OR ALTER PROCEDURE gorev.sp_revize_fazlalik
    @id INT
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    IF gorev.fn_yonetici_mi() = 0 THROW 50023, N'Bu işlem için Merkez Yönetici yetkisi gerekir.', 1;
    DECLARE @talep INT, @gj NVARCHAR(MAX);
    SELECT @talep = talep_id, @gj = gunler_json FROM gorev.revize_talepleri WHERE id = @id;
    IF @talep IS NULL THROW 50024, N'Revize bulunamadı.', 1;
    CREATE TABLE #y (tarih DATE NOT NULL, zaman VARCHAR(3) COLLATE DATABASE_DEFAULT NOT NULL, kisi INT NOT NULL);
    IF @gj IS NOT NULL
        INSERT INTO #y (tarih, zaman, kisi)
        SELECT TRY_CONVERT(DATE, j.tarih, 23), UPPER(LTRIM(RTRIM(j.zaman))), j.kisi FROM OPENJSON(@gj) WITH (tarih NVARCHAR(10) '$.tarih', zaman VARCHAR(3) '$.zaman', kisi INT '$.kisi') j;
    IF @gj IS NULL BEGIN SELECT TOP (0) CAST(0 AS INT) AS atama_id, CAST(NULL AS CHAR(10)) AS tarih, CAST(NULL AS VARCHAR(3)) AS zaman, CAST(NULL AS NVARCHAR(50)) AS sicil_no, CAST(NULL AS NVARCHAR(200)) AS adi_soyadi, CAST(0 AS INT) AS atanmis, CAST(0 AS INT) AS yeni, CAST(0 AS INT) AS fazla; RETURN; END;
    SELECT a.id AS atama_id, CONVERT(CHAR(10), a.tarih, 23) AS tarih, a.zaman_dilimi AS zaman, a.sicil_no, p.adi_soyadi, m.n AS atanmis, ISNULL(y.kisi, 0) AS yeni, m.n - ISNULL(y.kisi, 0) AS fazla
    FROM gorev.atamalar a
    JOIN gorev.personel p ON p.sicil_no = a.sicil_no
    CROSS APPLY (SELECT COUNT(*) AS n FROM gorev.atamalar a2 WHERE a2.talep_id = a.talep_id AND a2.tarih = a.tarih AND a2.zaman_dilimi = a.zaman_dilimi AND a2.durum = 'AKTIF') m
    LEFT JOIN #y y ON y.tarih = a.tarih AND y.zaman = a.zaman_dilimi
    WHERE a.talep_id = @talep AND a.durum = 'AKTIF' AND m.n > ISNULL(y.kisi, 0)
    ORDER BY a.tarih, a.zaman_dilimi, p.adi_soyadi;
END;
GO

-- 4b) Revize onayı: @cikar_json = çıkarılacak atama kimlikleri ([12,13]); önce çıkarılır, sonra revize uygulanır (tek işlem).
CREATE OR ALTER PROCEDURE gorev.sp_revize_onayla
    @id         INT,
    @cikar_json NVARCHAR(MAX) = NULL
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    IF gorev.fn_yonetici_mi() = 0 THROW 50023, N'Revize onayı yalnız Merkez Yönetici tarafından yapılır.', 1;
    BEGIN TRANSACTION;
    DECLARE @talep INT = (SELECT talep_id FROM gorev.revize_talepleri WITH (UPDLOCK) WHERE id = @id AND durum = 'BEKLIYOR');
    IF @talep IS NULL THROW 50024, N'Bu revize artık beklemiyor.', 1;
    IF @cikar_json IS NOT NULL AND LEN(@cikar_json) > 2
    BEGIN
        CREATE TABLE #c (atama_id INT NOT NULL);
        INSERT INTO #c (atama_id) SELECT TRY_CONVERT(INT, j.value) FROM OPENJSON(@cikar_json) j WHERE TRY_CONVERT(INT, j.value) IS NOT NULL;
        IF EXISTS (SELECT 1 FROM #c c WHERE NOT EXISTS (SELECT 1 FROM gorev.atamalar a WHERE a.id = c.atama_id AND a.talep_id = @talep AND a.durum = 'AKTIF'))
            THROW 50024, N'Seçilen atamalardan biri bu talepte aktif değil.', 1;
        DECLARE @tkod NVARCHAR(20) = (SELECT kod FROM gorev.talepler WHERE id = @talep), @sahip NVARCHAR(50) = (SELECT sorumlu_sicil_no FROM gorev.talepler WHERE id = @talep);
        UPDATE a SET durum = 'CIKARILDI', cikaran_hesap = ORIGINAL_LOGIN(), cikarma_tarihi = SYSDATETIME(), cikarma_nedeni = N'Revize: kişi sayısı azaldı (Yönetici seçti)'
        FROM gorev.atamalar a JOIN #c c ON c.atama_id = a.id;
        INSERT INTO gorev.bildirimler (sicil_no, tur, mesaj, talep_id)
        SELECT DISTINCT a.sicil_no, 'GOREV_CIKARILDI', LEFT(@tkod + N' görevinden çıkarıldınız (kişi sayısı azaltıldı).', 500), @talep FROM gorev.atamalar a JOIN #c c ON c.atama_id = a.id;
        INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti)
        VALUES (N'REVIZE_KISI_CIKAR', N'talepler', CAST(@talep AS NVARCHAR(60)), LEFT(CONCAT(@tkod, N' revize ', @id, N': ', (SELECT COUNT(*) FROM #c), N' atama çıkarıldı'), 400));
    END;
    EXEC gorev.sp_revize_uygula @id;
    COMMIT TRANSACTION;
    SELECT @id AS id, durum FROM gorev.revize_talepleri WHERE id = @id;
END;
GO

-- 4c) Revizede eklenen/uzatılan günler: atanmış kişilerin o gün/dilimdeki müsaitliği (Yönetici onayından önce görünür).
CREATE OR ALTER PROCEDURE gorev.sp_revize_musaitlik
    @id INT
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @yon BIT = gorev.fn_yonetici_mi(), @ben NVARCHAR(50) = gorev.fn_ben_sicil();
    DECLARE @talep INT, @gj NVARCHAR(MAX), @sahip NVARCHAR(50);
    SELECT @talep = r.talep_id, @gj = r.gunler_json, @sahip = t.sorumlu_sicil_no FROM gorev.revize_talepleri r JOIN gorev.talepler t ON t.id = r.talep_id WHERE r.id = @id;
    IF @talep IS NULL THROW 50024, N'Revize bulunamadı.', 1;
    IF @yon = 0 AND (gorev.fn_sorumlu_mu() = 0 OR @sahip <> ISNULL(@ben, N'?')) THROW 50023, N'Bu işlem için yetkiniz yok.', 1;
    CREATE TABLE #y (tarih DATE NOT NULL, zaman VARCHAR(3) COLLATE DATABASE_DEFAULT NOT NULL);
    IF @gj IS NOT NULL
        INSERT INTO #y (tarih, zaman)
        SELECT TRY_CONVERT(DATE, j.tarih, 23), UPPER(LTRIM(RTRIM(j.zaman))) FROM OPENJSON(@gj) WITH (tarih NVARCHAR(10) '$.tarih', zaman VARCHAR(3) '$.zaman') j
        WHERE NOT EXISTS (SELECT 1 FROM gorev.talep_gunleri g WHERE g.talep_id = @talep AND g.tarih = TRY_CONVERT(DATE, j.tarih, 23) AND g.zaman_dilimi = UPPER(LTRIM(RTRIM(j.zaman))));
    SELECT CONVERT(CHAR(10), y.tarih, 23) AS tarih, y.zaman, k.sicil_no, k.adi_soyadi,
           CASE WHEN EXISTS (SELECT 1 FROM gorev.raporlar r WHERE r.sicil_no = k.sicil_no AND r.durum = 'AKTIF' AND y.tarih BETWEEN r.ilk_tarih AND r.son_tarih) THEN 'RAPOR'
                WHEN EXISTS (SELECT 1 FROM gorev.izin_gunleri g JOIN gorev.izin_talepleri t ON t.id = g.izin_id WHERE t.sicil_no = k.sicil_no AND g.durum IN ('BEKLIYOR','ONAYLI') AND g.tarih = y.tarih AND (g.zaman_dilimi = 'TAM' OR y.zaman = 'TAM' OR g.zaman_dilimi = y.zaman)) THEN 'IZIN'
                WHEN EXISTS (SELECT 1 FROM gorev.atamalar a WHERE a.sicil_no = k.sicil_no AND a.durum = 'AKTIF' AND a.talep_id <> @talep AND a.tarih = y.tarih AND (a.zaman_dilimi = 'TAM' OR y.zaman = 'TAM' OR a.zaman_dilimi = y.zaman)) THEN 'GOREV'
                ELSE 'MUSAIT' END AS durum
    FROM #y y
    CROSS JOIN (SELECT DISTINCT a.sicil_no, p.adi_soyadi FROM gorev.atamalar a JOIN gorev.personel p ON p.sicil_no = a.sicil_no WHERE a.talep_id = @talep AND a.durum = 'AKTIF') k
    ORDER BY y.tarih, y.zaman, k.adi_soyadi;
END;
GO

-- 6) Analiz kırılımı: Ana Proje → Alt Proje → Yerleşke → Personel (adam-gün; TAM 1,0 / ÖÖ-ÖS 0,5). Yönetici tümü, Sorumlu kendi talepleri.
CREATE OR ALTER PROCEDURE gorev.sp_analiz_kirilim
    @bas DATE,
    @bit DATE,
    @ana NVARCHAR(200) = NULL
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @yon BIT = gorev.fn_yonetici_mi(), @ben NVARCHAR(50) = gorev.fn_ben_sicil();
    IF @yon = 0 AND gorev.fn_sorumlu_mu() = 0 THROW 50023, N'Bu işlem için yetkiniz yok.', 1;
    IF @bit < @bas THROW 50024, N'Bitiş tarihi başlangıçtan önce olamaz.', 1;
    IF DATEDIFF(DAY, @bas, @bit) > 1100 THROW 50024, N'Tarih aralığı en fazla 3 yıl olabilir.', 1;
    SET @ana = NULLIF(LTRIM(RTRIM(ISNULL(@ana, N''))), N'');
    SELECT TOP (5000) h1.ad AS ana, h2.ad AS alt, h4.ad AS yerleske, a.sicil_no, p.adi_soyadi AS ad,
           CAST(SUM(CASE a.zaman_dilimi WHEN 'TAM' THEN 1.0 ELSE 0.5 END) AS DECIMAL(9,1)) AS adam_gun,
           COUNT(DISTINCT a.tarih) AS gun
    FROM gorev.atamalar a
    JOIN gorev.talepler t ON t.id = a.talep_id
    JOIN gorev.personel p ON p.sicil_no = a.sicil_no
    JOIN gorev.proje_havuzu h4 ON h4.id = t.havuz_id
    JOIN gorev.proje_havuzu h3 ON h3.id = h4.ust_id
    JOIN gorev.proje_havuzu h2 ON h2.id = h3.ust_id
    JOIN gorev.proje_havuzu h1 ON h1.id = h2.ust_id
    WHERE a.durum = 'AKTIF' AND a.tarih BETWEEN @bas AND @bit AND (@ana IS NULL OR h1.ad = @ana)
      AND (@yon = 1 OR t.sorumlu_sicil_no = ISNULL(@ben, N'?'))
    GROUP BY h1.ad, h2.ad, h4.ad, a.sicil_no, p.adi_soyadi
    ORDER BY h1.ad, h2.ad, h4.ad, p.adi_soyadi;
END;
GO

-- 5) Matris: "Sadece müsaitler" (hafta içi en az bir boş yarım günü olan aktif kişiler).
CREATE OR ALTER PROCEDURE gorev.sp_matris_hafta
    @bas DATE,
    @bolum NVARCHAR(500) = NULL,
    @ana NVARCHAR(200) = NULL,
    @q NVARCHAR(100) = NULL,
    @sadece_gorevli BIT = 1,
    @konum NVARCHAR(200) = NULL,
    @sadece_musait BIT = 0
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

    CREATE TABLE #h (
        sicil_no NVARCHAR(50) COLLATE DATABASE_DEFAULT NOT NULL, tarih DATE NOT NULL, zaman VARCHAR(3) COLLATE DATABASE_DEFAULT NOT NULL,
        talep_id INT NOT NULL, kod NVARCHAR(20) COLLATE DATABASE_DEFAULT NULL, ana NVARCHAR(200) COLLATE DATABASE_DEFAULT NULL, alt NVARCHAR(200) COLLATE DATABASE_DEFAULT NULL,
        faaliyet NVARCHAR(200) COLLATE DATABASE_DEFAULT NULL, konum NVARCHAR(200) COLLATE DATABASE_DEFAULT NULL,
        saat NVARCHAR(20) COLLATE DATABASE_DEFAULT NULL, sorumlu NVARCHAR(200) COLLATE DATABASE_DEFAULT NULL);
    INSERT #h (sicil_no, tarih, zaman, talep_id, kod, ana, alt, faaliyet, konum, saat, sorumlu)
    SELECT a.sicil_no, a.tarih, a.zaman_dilimi, t.id, t.kod, h1.ad, h2.ad, h3.ad, h4.ad,
           CONVERT(CHAR(5), t.saat_baslangic, 108) + N' - ' + CONVERT(CHAR(5), t.saat_bitis, 108), s.adi_soyadi
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

    SELECT TOP (1000) p.sicil_no, p.adi_soyadi, p.bolum,
        (SELECT CONVERT(CHAR(10), c.tarih, 23) AS tarih, c.zaman, c.talep_id AS talepId, c.kod, c.ana, c.alt, c.faaliyet, c.konum, c.saat, c.sorumlu
         FROM #h c WHERE c.sicil_no = p.sicil_no ORDER BY c.tarih, c.zaman FOR JSON PATH) AS hucreler_json,
        (SELECT CONVERT(CHAR(10), c.tarih, 23) AS tarih, c.zaman, c.tur, c.durum, c.kod
         FROM #i c WHERE c.sicil_no = p.sicil_no ORDER BY c.tarih, c.zaman FOR JSON PATH) AS izinler_json
    FROM gorev.personel p
    WHERE (p.aktif = 1 OR EXISTS (SELECT 1 FROM #h c WHERE c.sicil_no = p.sicil_no) OR EXISTS (SELECT 1 FROM #i c WHERE c.sicil_no = p.sicil_no))
      AND (@bolum IS NULL OR p.bolum = @bolum)
      AND (LEN(@q) = 0 OR CHARINDEX(@q, p.adi_soyadi) > 0)
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

INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti) VALUES (N'SEMA', N'sema_surumleri', N'14', N'014_senaryo_eksikleri.sql uygulandı');
GO
