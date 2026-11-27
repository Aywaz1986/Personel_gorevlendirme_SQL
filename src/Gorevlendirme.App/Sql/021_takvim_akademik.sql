-- 021: Akademik Tatil türü (prototip: Resmi Tatil / İdari-Kurumsal Tatil / Akademik Tatil). Eski RESMI/IDARI kayıtları değişmez.
IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_takvim_tur' AND parent_object_id = OBJECT_ID(N'gorev.takvim_tatil'))
    ALTER TABLE gorev.takvim_tatil DROP CONSTRAINT CK_takvim_tur;
GO
ALTER TABLE gorev.takvim_tatil ADD CONSTRAINT CK_takvim_tur CHECK (tur IN ('RESMI', 'IDARI', 'AKADEMIK'));
GO

CREATE OR ALTER PROCEDURE gorev.sp_takvim_ozet
    @yil INT
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    IF gorev.fn_kayitli_mi() = 0 THROW 50023, N'Bu işlem için yetkiniz yok.', 1;
    SELECT COUNT(*) AS kayit,
           CAST(ISNULL(SUM(CASE WHEN tur = 'RESMI' THEN CASE WHEN zaman_dilimi = 'TAM' THEN DATEDIFF(DAY, baslangic, bitis) + 1 ELSE 0.5 END END), 0) AS DECIMAL(5,1)) AS resmi_gun,
           CAST(ISNULL(SUM(CASE WHEN tur = 'IDARI' THEN CASE WHEN zaman_dilimi = 'TAM' THEN DATEDIFF(DAY, baslangic, bitis) + 1 ELSE 0.5 END END), 0) AS DECIMAL(5,1)) AS idari_gun,
           CAST(ISNULL(SUM(CASE WHEN tur = 'AKADEMIK' THEN CASE WHEN zaman_dilimi = 'TAM' THEN DATEDIFF(DAY, baslangic, bitis) + 1 ELSE 0.5 END END), 0) AS DECIMAL(5,1)) AS akademik_gun,
           CAST(ISNULL(SUM(CASE WHEN yillik_izinden_kesilir = 0 THEN 0
                                WHEN zaman_dilimi = 'TAM' THEN gorev.fn_is_gunu(baslangic, bitis)
                                WHEN gorev.fn_is_gunu(baslangic, bitis) = 1 THEN 0.5 ELSE 0 END), 0) AS DECIMAL(5,1)) AS kesilen_gun
    FROM gorev.takvim_tatil WHERE YEAR(baslangic) = @yil;
END;
GO

CREATE OR ALTER PROCEDURE gorev.sp_takvim_kaydet
    @id           INT = NULL,
    @baslangic    DATE,
    @bitis        DATE = NULL,
    @zaman_dilimi VARCHAR(3),
    @tur          VARCHAR(10),
    @ad           NVARCHAR(200),
    @yillik       BIT = 0
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
    IF gorev.fn_yonetici_mi() = 0 THROW 50023, N'Bu işlem için Merkez Yönetici yetkisi gerekir.', 1;
    SET @ad = LTRIM(RTRIM(ISNULL(@ad, N'')));
    SET @zaman_dilimi = UPPER(LTRIM(RTRIM(ISNULL(@zaman_dilimi, ''))) COLLATE Latin1_General_CI_AS);   -- Türkçe i/İ sorunu olmasın
    SET @tur = UPPER(LTRIM(RTRIM(ISNULL(@tur, ''))) COLLATE Latin1_General_CI_AS);
    SET @bitis = ISNULL(@bitis, @baslangic);
    SET @yillik = ISNULL(@yillik, 0);
    IF @baslangic IS NULL OR @baslangic < '2000-01-01' OR @bitis > '2100-12-31' THROW 50024, N'Tarih geçersiz (2000–2100).', 1;
    IF @bitis < @baslangic THROW 50024, N'Bitiş tarihi başlangıçtan önce olamaz.', 1;
    IF YEAR(@baslangic) <> YEAR(@bitis) THROW 50024, N'Kayıt tek bir yıl içinde olmalı; yılbaşını aşan tatili ikiye bölün.', 1;
    IF DATEDIFF(DAY, @baslangic, @bitis) >= 60 THROW 50024, N'Bir kayıt en fazla 60 gün olabilir.', 1;
    IF @zaman_dilimi NOT IN ('TAM', 'OO', 'OS') THROW 50024, N'Zaman dilimi TAM, OO ya da OS olmalı.', 1;
    IF @zaman_dilimi <> 'TAM' AND @bitis <> @baslangic THROW 50024, N'Yarım gün (OO/OS) tek bir gün için girilir.', 1;
    IF @tur NOT IN ('RESMI', 'IDARI', 'AKADEMIK') THROW 50024, N'Tür RESMI, IDARI ya da AKADEMIK olmalı.', 1;
    IF LEN(@ad) = 0 OR LEN(@ad) > 200 THROW 50024, N'Ad boş olamaz ve 200 karakteri geçemez.', 1;
    BEGIN TRANSACTION;
    IF @id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM gorev.takvim_tatil WHERE id = @id) THROW 50024, N'Kayıt bulunamadı.', 1;
    DECLARE @c INT = gorev.fn_takvim_cakisma(@id, @baslangic, @bitis, @zaman_dilimi);
    IF @c IS NOT NULL
    BEGIN
        DECLARE @cad NVARCHAR(200), @cb DATE, @ce DATE;
        SELECT @cad = ad, @cb = baslangic, @ce = bitis FROM gorev.takvim_tatil WHERE id = @c;
        DECLARE @m NVARCHAR(400) = CONCAT(N'Takvimdeki "', @cad, N'" kaydıyla (', CONVERT(CHAR(10), @cb, 23), N' – ', CONVERT(CHAR(10), @ce, 23), N') çakışıyor.');
        THROW 50024, @m, 1;
    END;
    IF @id IS NULL
    BEGIN
        INSERT INTO gorev.takvim_tatil (baslangic, bitis, zaman_dilimi, tur, ad, yillik_izinden_kesilir) VALUES (@baslangic, @bitis, @zaman_dilimi, @tur, @ad, @yillik);
        SET @id = SCOPE_IDENTITY();
    END
    ELSE
        UPDATE gorev.takvim_tatil SET baslangic = @baslangic, bitis = @bitis, zaman_dilimi = @zaman_dilimi, tur = @tur, ad = @ad, yillik_izinden_kesilir = @yillik, guncelleme = SYSDATETIME() WHERE id = @id;
    INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti)
    VALUES (N'TAKVIM', N'takvim_tatil', CAST(@id AS NVARCHAR(60)),
            LEFT(CONCAT(CONVERT(CHAR(10), @baslangic, 23), N'..', CONVERT(CHAR(10), @bitis, 23), N' ', @zaman_dilimi, N' ', @tur, N' ', @ad), 400));
    COMMIT TRANSACTION;
    SELECT @id AS id;
END;
GO

CREATE OR ALTER PROCEDURE gorev.sp_takvim_toplu_onizle
    @json NVARCHAR(MAX)
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    IF gorev.fn_yonetici_mi() = 0 THROW 50023, N'Bu işlem için Merkez Yönetici yetkisi gerekir.', 1;
    IF @json IS NULL OR ISJSON(@json) = 0 THROW 50024, N'Satır listesi okunamadı.', 1;
    CREATE TABLE #s (
        sira INT NOT NULL, b_m NVARCHAR(30) COLLATE DATABASE_DEFAULT NULL, e_m NVARCHAR(30) COLLATE DATABASE_DEFAULT NULL,
        zaman_m NVARCHAR(10) COLLATE DATABASE_DEFAULT NULL, tur_m NVARCHAR(20) COLLATE DATABASE_DEFAULT NULL, ad_m NVARCHAR(400) COLLATE DATABASE_DEFAULT NULL,
        yillik BIT NOT NULL DEFAULT 0,
        baslangic DATE NULL, bitis DATE NULL, zaman VARCHAR(3) COLLATE DATABASE_DEFAULT NULL, tur VARCHAR(10) COLLATE DATABASE_DEFAULT NULL,
        ad NVARCHAR(200) COLLATE DATABASE_DEFAULT NULL, durum VARCHAR(10) COLLATE DATABASE_DEFAULT NULL, hata NVARCHAR(200) COLLATE DATABASE_DEFAULT NULL);
    INSERT INTO #s (sira, b_m, e_m, zaman_m, tur_m, ad_m, yillik)
    SELECT sira, baslangic, bitis, zaman, tur, ad, ISNULL(yillik, 0)
    FROM OPENJSON(@json) WITH (sira INT '$.sira', baslangic NVARCHAR(30) '$.baslangic', bitis NVARCHAR(30) '$.bitis', zaman NVARCHAR(10) '$.zaman',
                               tur NVARCHAR(20) '$.tur', ad NVARCHAR(400) '$.ad', yillik BIT '$.yillik');
    IF NOT EXISTS (SELECT 1 FROM #s) THROW 50024, N'Yüklenecek satır yok.', 1;
    IF (SELECT COUNT(*) FROM #s) > 2000 THROW 50024, N'En fazla 2000 satır yüklenebilir.', 1;

    UPDATE #s SET
        baslangic = TRY_CONVERT(DATE, LTRIM(RTRIM(b_m)), 23),
        bitis = CASE WHEN e_m IS NULL OR LEN(LTRIM(RTRIM(e_m))) = 0 THEN TRY_CONVERT(DATE, LTRIM(RTRIM(b_m)), 23) ELSE TRY_CONVERT(DATE, LTRIM(RTRIM(e_m)), 23) END,
        zaman = CASE WHEN zaman_m COLLATE Latin1_General_CI_AS = N'TAM' THEN 'TAM' WHEN zaman_m COLLATE Latin1_General_CI_AS IN (N'OO', N'ÖÖ') THEN 'OO' WHEN zaman_m COLLATE Latin1_General_CI_AS IN (N'OS', N'ÖS') THEN 'OS' END,
        tur   = CASE WHEN tur_m COLLATE Latin1_General_CI_AS = N'RESMI' THEN 'RESMI' WHEN tur_m COLLATE Latin1_General_CI_AS = N'IDARI' THEN 'IDARI' WHEN tur_m COLLATE Latin1_General_CI_AS = N'AKADEMIK' THEN 'AKADEMIK' END,
        ad    = LTRIM(RTRIM(ad_m));

    UPDATE #s SET hata = CASE
        WHEN baslangic IS NULL THEN N'Başlangıç tarihi okunamadı.'
        WHEN bitis IS NULL THEN N'Bitiş tarihi okunamadı.'
        WHEN baslangic < '2000-01-01' OR bitis > '2100-12-31' THEN N'Tarih aralık dışı (2000–2100).'
        WHEN bitis < baslangic THEN N'Bitiş başlangıçtan önce.'
        WHEN YEAR(baslangic) <> YEAR(bitis) THEN N'Kayıt tek yıl içinde olmalı; yılbaşını aşan tatili bölün.'
        WHEN DATEDIFF(DAY, baslangic, bitis) >= 60 THEN N'Bir kayıt en fazla 60 gün olabilir.'
        WHEN zaman IS NULL THEN N'Zaman dilimi TAM, OO (ÖÖ) ya da OS (ÖS) olmalı.'
        WHEN zaman <> 'TAM' AND bitis <> baslangic THEN N'Yarım gün tek bir gün için girilir.'
        WHEN tur IS NULL THEN N'Tür Resmi ya da İdari olmalı.'
        WHEN ad IS NULL OR LEN(ad) = 0 THEN N'Ad boş.'
        WHEN LEN(ad) > 200 THEN N'Ad 200 karakteri geçiyor.' END;

    -- Dosya içi çakışma (aynı anahtar da buna girer). ÖÖ + ÖS aynı güne konabilir.
    UPDATE a SET hata = N'Dosyada çakışan kayıtlar var (aynı gün ve dilim birden çok satırda).'
    FROM #s a WHERE a.hata IS NULL AND EXISTS (
        SELECT 1 FROM #s b WHERE b.sira <> a.sira AND b.hata IS NULL AND b.baslangic <= a.bitis AND b.bitis >= a.baslangic
          AND NOT (b.zaman <> 'TAM' AND a.zaman <> 'TAM' AND b.zaman <> a.zaman));
    -- Takvimdeki farklı anahtarlı kayıtla çakışma
    UPDATE a SET hata = LEFT(CONCAT(N'Takvimdeki "', t.ad, N'" kaydıyla çakışıyor.'), 200)
    FROM #s a
    CROSS APPLY (SELECT TOP (1) x.ad FROM gorev.takvim_tatil x
                 WHERE x.baslangic <= a.bitis AND x.bitis >= a.baslangic
                   AND NOT (x.baslangic = a.baslangic AND x.bitis = a.bitis AND x.zaman_dilimi = a.zaman)
                   AND NOT (x.zaman_dilimi <> 'TAM' AND a.zaman <> 'TAM' AND x.zaman_dilimi <> a.zaman)) t
    WHERE a.hata IS NULL;

    UPDATE a SET durum = CASE
            WHEN a.hata IS NOT NULL THEN 'HATA'
            WHEN t.id IS NULL THEN 'YENI'
            WHEN t.tur = a.tur AND t.ad = a.ad AND t.yillik_izinden_kesilir = a.yillik THEN 'AYNI'
            ELSE 'GUNCELLE' END
    FROM #s a LEFT JOIN gorev.takvim_tatil t ON t.baslangic = a.baslangic AND t.bitis = a.bitis AND t.zaman_dilimi = a.zaman;

    SELECT sira, CONVERT(CHAR(10), baslangic, 23) AS baslangic, CONVERT(CHAR(10), bitis, 23) AS bitis, zaman, tur, ad, yillik,
           CAST(CASE WHEN baslangic IS NULL OR bitis IS NULL THEN NULL WHEN zaman = 'TAM' THEN DATEDIFF(DAY, baslangic, bitis) + 1 ELSE 0.5 END AS DECIMAL(4,1)) AS gun,
           durum, hata
    FROM #s ORDER BY sira;
END;
GO

INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti) VALUES (N'SEMA', N'sema_surumleri', N'21', N'Takvim: Akademik Tatil türü + özet akademik_gun');
