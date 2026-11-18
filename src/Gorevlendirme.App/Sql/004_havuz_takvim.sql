-- 004_havuz_takvim: proje havuzu (4 seviyeli ağaç), akademik takvim (tatil/kapalı gün), "kayıtlı kişi mi" işlevi.
-- Yalnızca gorev nesneleri; dbo'ya dokunmaz. SINANMADI (CI'da SQL Server testi çalışır).
-- Listeleme yordamları her rolde çalışır (Dilim 4'te talep formu kullanır); yazma yordamları yalnız Merkez Yönetici.

-- Rolü olan (yönetici / sorumlu / saha) kişi mi? sp_ben ile aynı çözüm.
CREATE FUNCTION gorev.fn_kayitli_mi ()
RETURNS BIT
AS
BEGIN
    DECLARE @hesap NVARCHAR(256) = ORIGINAL_LOGIN();
    DECLARE @i INT = (
        SELECT TOP (1) CASE WHEN i.yonetici_mi = 1 OR i.sorumlu_mu = 1 OR i.saha_mi = 1 THEN 1 ELSE 0 END
        FROM gorev.kullanici_yetki_istisna i
        WHERE i.aktif = 1 AND gorev.fn_hesap_eslesir(i.hesap, @hesap) = 1
        ORDER BY i.id);
    IF @i IS NOT NULL RETURN CAST(@i AS BIT);
    RETURN CASE WHEN EXISTS (
        SELECT 1 FROM gorev.personel p
        JOIN gorev.rol_bolum_eslestirme e ON e.bolum = p.bolum
        WHERE p.aktif = 1 AND gorev.fn_hesap_eslesir(p.kullanici_adi, @hesap) = 1
    ) THEN 1 ELSE 0 END;
END;
GO

-- Proje havuzu: 1 Ana Proje > 2 Alt Proje > 3 Faaliyet > 4 Konum. Ad kardeşler arasında tekil.
-- Birleştirme "yumuşak": kaynak pasif kalır ve birlestirildi_id hedefi gösterir (sonraki dilimlerdeki başvurular çözülebilsin).
CREATE TABLE gorev.proje_havuzu (
    id               INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_proje_havuzu PRIMARY KEY,
    ust_id           INT NULL CONSTRAINT FK_proje_havuzu_ust REFERENCES gorev.proje_havuzu (id),
    seviye           TINYINT NOT NULL CONSTRAINT CK_proje_havuzu_seviye CHECK (seviye BETWEEN 1 AND 4),
    ad               NVARCHAR(300) NOT NULL CONSTRAINT CK_proje_havuzu_ad CHECK (LEN(LTRIM(RTRIM(ad))) > 0),
    aktif            BIT NOT NULL CONSTRAINT DF_proje_havuzu_aktif DEFAULT 1,
    birlestirildi_id INT NULL CONSTRAINT FK_proje_havuzu_birlesti REFERENCES gorev.proje_havuzu (id),
    kaynak           NVARCHAR(20) NULL,
    olusturma        DATETIME2(0) NOT NULL CONSTRAINT DF_proje_havuzu_olusturma DEFAULT SYSDATETIME(),
    guncelleme       DATETIME2(0) NOT NULL CONSTRAINT DF_proje_havuzu_guncelleme DEFAULT SYSDATETIME(),
    rv               ROWVERSION,
    CONSTRAINT CK_proje_havuzu_kok CHECK ((seviye = 1 AND ust_id IS NULL) OR (seviye > 1 AND ust_id IS NOT NULL))
);
GO
CREATE UNIQUE INDEX UX_proje_havuzu_kok ON gorev.proje_havuzu (ad) WHERE ust_id IS NULL;
CREATE UNIQUE INDEX UX_proje_havuzu_alt ON gorev.proje_havuzu (ust_id, ad) WHERE ust_id IS NOT NULL;
CREATE INDEX IX_proje_havuzu_ust ON gorev.proje_havuzu (ust_id);
GO

-- Akademik takvim: tatil / kapalı gün. zaman_dilimi: TAM (tüm gün), OO (öğleden önce), OS (öğleden sonra).
-- Aynı tarihte TAM ile OO/OS birlikte bulunmaz (yordamlar denetler).
CREATE TABLE gorev.takvim_tatil (
    id          INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_takvim_tatil PRIMARY KEY,
    tarih       DATE NOT NULL,
    zaman_dilimi VARCHAR(3) NOT NULL CONSTRAINT CK_takvim_zaman CHECK (zaman_dilimi IN ('TAM', 'OO', 'OS')),
    tur         VARCHAR(10) NOT NULL CONSTRAINT CK_takvim_tur CHECK (tur IN ('RESMI', 'AKADEMIK', 'IDARI')),
    ad          NVARCHAR(200) NOT NULL CONSTRAINT CK_takvim_ad CHECK (LEN(LTRIM(RTRIM(ad))) > 0),
    olusturma   DATETIME2(0) NOT NULL CONSTRAINT DF_takvim_olusturma DEFAULT SYSDATETIME(),
    guncelleme  DATETIME2(0) NOT NULL CONSTRAINT DF_takvim_guncelleme DEFAULT SYSDATETIME(),
    rv          ROWVERSION,
    CONSTRAINT UQ_takvim_tarih_zaman UNIQUE (tarih, zaman_dilimi)
);
GO

-- ---- Proje havuzu yordamları ----
CREATE OR ALTER PROCEDURE gorev.sp_havuz_listele
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    IF gorev.fn_kayitli_mi() = 0 THROW 50023, N'Bu işlem için yetkiniz yok.', 1;
    SELECT id, ust_id, seviye, ad, aktif, birlestirildi_id, olusturma
    FROM gorev.proje_havuzu
    ORDER BY seviye, ad;
END;
GO

CREATE OR ALTER PROCEDURE gorev.sp_havuz_ekle
    @ust_id INT = NULL,
    @ad     NVARCHAR(300)
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
    IF gorev.fn_yonetici_mi() = 0 THROW 50023, N'Bu işlem için Merkez Yönetici yetkisi gerekir.', 1;
    SET @ad = LTRIM(RTRIM(ISNULL(@ad, N'')));
    IF LEN(@ad) = 0 THROW 50024, N'Ad boş olamaz.', 1;
    DECLARE @seviye TINYINT = 1, @ust_aktif BIT;
    BEGIN TRANSACTION;
    IF @ust_id IS NOT NULL
    BEGIN
        SELECT @seviye = seviye + 1, @ust_aktif = aktif FROM gorev.proje_havuzu WHERE id = @ust_id;
        IF @@ROWCOUNT = 0 THROW 50024, N'Üst kayıt bulunamadı.', 1;
        IF @seviye > 4 THROW 50024, N'Konum seviyesinin altına kayıt eklenemez.', 1;
        IF @ust_aktif = 0 THROW 50024, N'Pasif kaydın altına ekleme yapılamaz; önce etkinleştirin.', 1;
    END;
    IF EXISTS (SELECT 1 FROM gorev.proje_havuzu WHERE ISNULL(ust_id, 0) = ISNULL(@ust_id, 0) AND ad = @ad)
        THROW 50024, N'Bu üst kayıtta aynı adlı bir kayıt zaten var (pasif olabilir).', 1;
    INSERT INTO gorev.proje_havuzu (ust_id, seviye, ad) VALUES (@ust_id, @seviye, @ad);
    DECLARE @id INT = SCOPE_IDENTITY();
    INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti) VALUES (N'HAVUZ_EKLE', N'proje_havuzu', CAST(@id AS NVARCHAR(60)), LEFT(@ad, 200));
    COMMIT TRANSACTION;
    SELECT @id AS id;
END;
GO

CREATE OR ALTER PROCEDURE gorev.sp_havuz_adlandir
    @id INT,
    @ad NVARCHAR(300)
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
    IF gorev.fn_yonetici_mi() = 0 THROW 50023, N'Bu işlem için Merkez Yönetici yetkisi gerekir.', 1;
    SET @ad = LTRIM(RTRIM(ISNULL(@ad, N'')));
    IF LEN(@ad) = 0 THROW 50024, N'Ad boş olamaz.', 1;
    BEGIN TRANSACTION;
    DECLARE @ust INT, @eski NVARCHAR(300), @bir INT;
    SELECT @ust = ust_id, @eski = ad, @bir = birlestirildi_id FROM gorev.proje_havuzu WHERE id = @id;
    IF @@ROWCOUNT = 0 THROW 50024, N'Kayıt bulunamadı.', 1;
    IF @bir IS NOT NULL THROW 50024, N'Birleştirilmiş kayıt değiştirilemez.', 1;
    IF EXISTS (SELECT 1 FROM gorev.proje_havuzu WHERE ISNULL(ust_id, 0) = ISNULL(@ust, 0) AND ad = @ad AND id <> @id)
        THROW 50024, N'Aynı üst kayıtta aynı adlı bir kayıt zaten var (pasif olabilir).', 1;
    UPDATE gorev.proje_havuzu SET ad = @ad, guncelleme = SYSDATETIME() WHERE id = @id;
    INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti)
    VALUES (N'HAVUZ_AD', N'proje_havuzu', CAST(@id AS NVARCHAR(60)), LEFT(CONCAT(@eski, N' -> ', @ad), 400));
    COMMIT TRANSACTION;
END;
GO

-- Pasife alma altındakileri de pasife alır. Etkinleştirme yalnız kaydı açar; üstü aktif olmalı.
CREATE OR ALTER PROCEDURE gorev.sp_havuz_durum
    @id    INT,
    @aktif BIT
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
    IF gorev.fn_yonetici_mi() = 0 THROW 50023, N'Bu işlem için Merkez Yönetici yetkisi gerekir.', 1;
    BEGIN TRANSACTION;
    DECLARE @ust INT, @bir INT;
    SELECT @ust = ust_id, @bir = birlestirildi_id FROM gorev.proje_havuzu WHERE id = @id;
    IF @@ROWCOUNT = 0 THROW 50024, N'Kayıt bulunamadı.', 1;
    IF @bir IS NOT NULL THROW 50024, N'Birleştirilmiş kayıt etkinleştirilemez ya da değiştirilemez.', 1;
    DECLARE @etkilenen INT;
    IF @aktif = 1
    BEGIN
        IF @ust IS NOT NULL AND NOT EXISTS (SELECT 1 FROM gorev.proje_havuzu WHERE id = @ust AND aktif = 1)
            THROW 50024, N'Üst kayıt pasif; önce üst kaydı etkinleştirin.', 1;
        UPDATE gorev.proje_havuzu SET aktif = 1, guncelleme = SYSDATETIME() WHERE id = @id AND aktif = 0;
        SET @etkilenen = @@ROWCOUNT;
    END
    ELSE
    BEGIN
        ;WITH alt AS (
            SELECT id FROM gorev.proje_havuzu WHERE id = @id
            UNION ALL
            SELECT c.id FROM gorev.proje_havuzu c JOIN alt a ON c.ust_id = a.id
        )
        UPDATE h SET aktif = 0, guncelleme = SYSDATETIME()
        FROM gorev.proje_havuzu h JOIN alt a ON a.id = h.id
        WHERE h.aktif = 1;
        SET @etkilenen = @@ROWCOUNT;
    END;
    INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti)
    VALUES (CASE WHEN @aktif = 1 THEN N'HAVUZ_AKTIF' ELSE N'HAVUZ_PASIF' END, N'proje_havuzu', CAST(@id AS NVARCHAR(60)), CONCAT(N'etkilenen=', @etkilenen));
    COMMIT TRANSACTION;
    SELECT @etkilenen AS etkilenen;
END;
GO

-- Birleştirme: aynı seviyedeki iki kayıt. Kaynağın çocukları hedefe taşınır; hedefte aynı adlı çocuk varsa
-- ikisi de özyinelemeli birleşir. Kaynaklar pasif olur ve birlestirildi_id hedefi gösterir. Hiçbir şey silinmez.
CREATE OR ALTER PROCEDURE gorev.sp_havuz_birlestir
    @kaynak_id INT,
    @hedef_id  INT
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
    IF gorev.fn_yonetici_mi() = 0 THROW 50023, N'Bu işlem için Merkez Yönetici yetkisi gerekir.', 1;
    IF @kaynak_id = @hedef_id THROW 50024, N'Kaynak ve hedef aynı kayıt olamaz.', 1;
    BEGIN TRANSACTION;
    DECLARE @ks TINYINT, @hs TINYINT, @kb INT, @hb INT, @ha BIT, @kad NVARCHAR(300), @had NVARCHAR(300);
    SELECT @ks = seviye, @kb = birlestirildi_id, @kad = ad FROM gorev.proje_havuzu WHERE id = @kaynak_id;
    IF @@ROWCOUNT = 0 THROW 50024, N'Kaynak kayıt bulunamadı.', 1;
    SELECT @hs = seviye, @hb = birlestirildi_id, @ha = aktif, @had = ad FROM gorev.proje_havuzu WHERE id = @hedef_id;
    IF @@ROWCOUNT = 0 THROW 50024, N'Hedef kayıt bulunamadı.', 1;
    IF @ks <> @hs THROW 50024, N'Yalnızca aynı seviyedeki kayıtlar birleştirilebilir.', 1;
    IF @kb IS NOT NULL OR @hb IS NOT NULL THROW 50024, N'Zaten birleştirilmiş bir kayıt kullanılamaz.', 1;
    IF @ha = 0 THROW 50024, N'Hedef kayıt pasif; önce etkinleştirin.', 1;

    CREATE TABLE #sira (kaynak INT NOT NULL, hedef INT NOT NULL);
    CREATE TABLE #yeni (kaynak INT NOT NULL, hedef INT NOT NULL);
    CREATE TABLE #tum  (kaynak INT NOT NULL PRIMARY KEY, hedef INT NOT NULL);
    DECLARE @tasinan INT = 0, @n INT;
    INSERT INTO #sira VALUES (@kaynak_id, @hedef_id);
    WHILE EXISTS (SELECT 1 FROM #sira)
    BEGIN
        INSERT INTO #tum (kaynak, hedef) SELECT kaynak, hedef FROM #sira;
        DELETE FROM #yeni;
        INSERT INTO #yeni (kaynak, hedef)
        SELECT c.id, t.id
        FROM #sira s
        JOIN gorev.proje_havuzu c ON c.ust_id = s.kaynak
        JOIN gorev.proje_havuzu t ON t.ust_id = s.hedef AND t.ad = c.ad;
        UPDATE c SET ust_id = s.hedef, guncelleme = SYSDATETIME()
        FROM gorev.proje_havuzu c
        JOIN #sira s ON c.ust_id = s.kaynak
        WHERE NOT EXISTS (SELECT 1 FROM #yeni y WHERE y.kaynak = c.id);
        SET @tasinan += @@ROWCOUNT;
        DELETE FROM #sira;
        INSERT INTO #sira (kaynak, hedef) SELECT kaynak, hedef FROM #yeni;
    END;

    UPDATE h SET aktif = 1, guncelleme = SYSDATETIME()
    FROM gorev.proje_havuzu h
    JOIN #tum t ON t.hedef = h.id
    JOIN gorev.proje_havuzu k ON k.id = t.kaynak
    WHERE k.aktif = 1 AND h.aktif = 0;
    UPDATE k SET aktif = 0, birlestirildi_id = t.hedef, guncelleme = SYSDATETIME()
    FROM gorev.proje_havuzu k JOIN #tum t ON t.kaynak = k.id;
    SELECT @n = COUNT(*) FROM #tum;
    INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti)
    VALUES (N'HAVUZ_BIRLESTIR', N'proje_havuzu', CAST(@kaynak_id AS NVARCHAR(60)),
            LEFT(CONCAT(@kad, N' -> ', @had, N' (hedef id ', @hedef_id, N'); birlesen=', @n, N' tasinan=', @tasinan), 400));
    COMMIT TRANSACTION;
    SELECT @n AS birlesen, @tasinan AS tasinan;
END;
GO

-- ---- Takvim yordamları ----
CREATE OR ALTER PROCEDURE gorev.sp_takvim_listele
    @yil INT = NULL
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    IF gorev.fn_kayitli_mi() = 0 THROW 50023, N'Bu işlem için yetkiniz yok.', 1;
    SELECT id, CONVERT(CHAR(10), tarih, 23) AS tarih, zaman_dilimi, tur, ad
    FROM gorev.takvim_tatil
    WHERE @yil IS NULL OR YEAR(tarih) = @yil
    ORDER BY tarih, CASE zaman_dilimi WHEN 'TAM' THEN 0 WHEN 'OO' THEN 1 ELSE 2 END;
END;
GO

CREATE OR ALTER PROCEDURE gorev.sp_takvim_kaydet
    @id           INT = NULL,
    @tarih        DATE,
    @zaman_dilimi VARCHAR(3),
    @tur          VARCHAR(10),
    @ad           NVARCHAR(200)
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
    IF @tarih IS NULL OR @tarih < '2000-01-01' OR @tarih > '2100-12-31' THROW 50024, N'Tarih geçersiz.', 1;
    IF @zaman_dilimi NOT IN ('TAM', 'OO', 'OS') THROW 50024, N'Zaman dilimi TAM, OO ya da OS olmalı.', 1;
    IF @tur NOT IN ('RESMI', 'AKADEMIK', 'IDARI') THROW 50024, N'Tür RESMI, AKADEMIK ya da IDARI olmalı.', 1;
    IF LEN(@ad) = 0 OR LEN(@ad) > 200 THROW 50024, N'Ad boş olamaz ve 200 karakteri geçemez.', 1;
    BEGIN TRANSACTION;
    IF @id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM gorev.takvim_tatil WHERE id = @id) THROW 50024, N'Kayıt bulunamadı.', 1;
    IF EXISTS (SELECT 1 FROM gorev.takvim_tatil WHERE tarih = @tarih AND zaman_dilimi = @zaman_dilimi AND ISNULL(@id, 0) <> id)
        THROW 50024, N'Bu tarih ve zaman dilimi için kayıt zaten var.', 1;
    IF EXISTS (SELECT 1 FROM gorev.takvim_tatil WHERE tarih = @tarih AND ISNULL(@id, 0) <> id
               AND ((@zaman_dilimi = 'TAM' AND zaman_dilimi <> 'TAM') OR (@zaman_dilimi <> 'TAM' AND zaman_dilimi = 'TAM')))
        THROW 50024, N'Aynı tarihte tüm gün (TAM) ile yarım gün (OO/OS) birlikte olamaz.', 1;
    IF @id IS NULL
    BEGIN
        INSERT INTO gorev.takvim_tatil (tarih, zaman_dilimi, tur, ad) VALUES (@tarih, @zaman_dilimi, @tur, @ad);
        SET @id = SCOPE_IDENTITY();
    END
    ELSE
        UPDATE gorev.takvim_tatil SET tarih = @tarih, zaman_dilimi = @zaman_dilimi, tur = @tur, ad = @ad, guncelleme = SYSDATETIME() WHERE id = @id;
    INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti)
    VALUES (N'TAKVIM', N'takvim_tatil', CAST(@id AS NVARCHAR(60)), LEFT(CONCAT(CONVERT(CHAR(10), @tarih, 23), N' ', @zaman_dilimi, N' ', @tur, N' ', @ad), 400));
    COMMIT TRANSACTION;
    SELECT @id AS id;
END;
GO

CREATE OR ALTER PROCEDURE gorev.sp_takvim_sil
    @id INT
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    IF gorev.fn_yonetici_mi() = 0 THROW 50023, N'Bu işlem için Merkez Yönetici yetkisi gerekir.', 1;
    BEGIN TRANSACTION;
    DELETE FROM gorev.takvim_tatil WHERE id = @id;
    IF @@ROWCOUNT = 0 THROW 50024, N'Kayıt bulunamadı.', 1;
    INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti) VALUES (N'TAKVIM_SIL', N'takvim_tatil', CAST(@id AS NVARCHAR(60)), NULL);
    COMMIT TRANSACTION;
END;
GO

-- Toplu yükleme önizlemesi: hiçbir şey yazmaz. Girdi JSON: [{"sira":1,"tarih":"2026-10-29","zaman":"TAM","tur":"RESMI","ad":"..."}]
-- (tarih ISO; ayrıştırma ve Türkçe karşılıkların kodlara çevrilmesi C# tarafında yapılır). Sonuç satırı: durum YENI / GUNCELLE / AYNI / HATA.
CREATE OR ALTER PROCEDURE gorev.sp_takvim_toplu_onizle
    @json NVARCHAR(MAX)
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    IF gorev.fn_yonetici_mi() = 0 THROW 50023, N'Bu işlem için Merkez Yönetici yetkisi gerekir.', 1;
    IF @json IS NULL OR ISJSON(@json) = 0 THROW 50024, N'Satır listesi okunamadı.', 1;
    CREATE TABLE #s (
        sira INT NOT NULL, tarih_m NVARCHAR(30) COLLATE DATABASE_DEFAULT NULL, zaman_m NVARCHAR(10) COLLATE DATABASE_DEFAULT NULL,
        tur_m NVARCHAR(20) COLLATE DATABASE_DEFAULT NULL, ad_m NVARCHAR(400) COLLATE DATABASE_DEFAULT NULL,
        tarih DATE NULL, zaman VARCHAR(3) COLLATE DATABASE_DEFAULT NULL, tur VARCHAR(10) COLLATE DATABASE_DEFAULT NULL,
        ad NVARCHAR(200) COLLATE DATABASE_DEFAULT NULL, durum VARCHAR(10) COLLATE DATABASE_DEFAULT NULL, hata NVARCHAR(200) COLLATE DATABASE_DEFAULT NULL);
    INSERT INTO #s (sira, tarih_m, zaman_m, tur_m, ad_m)
    SELECT sira, tarih, zaman, tur, ad
    FROM OPENJSON(@json) WITH (sira INT '$.sira', tarih NVARCHAR(30) '$.tarih', zaman NVARCHAR(10) '$.zaman', tur NVARCHAR(20) '$.tur', ad NVARCHAR(400) '$.ad');
    IF NOT EXISTS (SELECT 1 FROM #s) THROW 50024, N'Yüklenecek satır yok.', 1;
    IF (SELECT COUNT(*) FROM #s) > 5000 THROW 50024, N'En fazla 5000 satır yüklenebilir.', 1;

    UPDATE #s SET
        tarih = TRY_CONVERT(DATE, LTRIM(RTRIM(tarih_m)), 23),
        zaman = CASE WHEN zaman_m COLLATE Latin1_General_CI_AS = N'TAM' THEN 'TAM' WHEN zaman_m COLLATE Latin1_General_CI_AS IN (N'OO', N'ÖÖ') THEN 'OO' WHEN zaman_m COLLATE Latin1_General_CI_AS IN (N'OS', N'ÖS') THEN 'OS' END,
        tur   = CASE WHEN tur_m COLLATE Latin1_General_CI_AS = N'RESMI' THEN 'RESMI' WHEN tur_m COLLATE Latin1_General_CI_AS = N'AKADEMIK' THEN 'AKADEMIK' WHEN tur_m COLLATE Latin1_General_CI_AS = N'IDARI' THEN 'IDARI' END,
        ad    = LTRIM(RTRIM(ad_m));

    UPDATE #s SET hata = CASE
        WHEN tarih IS NULL THEN N'Tarih okunamadı.'
        WHEN tarih < '2000-01-01' OR tarih > '2100-12-31' THEN N'Tarih aralık dışı (2000–2100).'
        WHEN zaman IS NULL THEN N'Zaman dilimi TAM, OO (ÖÖ) ya da OS (ÖS) olmalı.'
        WHEN tur IS NULL THEN N'Tür Resmi, Akademik ya da İdari olmalı.'
        WHEN ad IS NULL OR LEN(ad) = 0 THEN N'Ad boş.'
        WHEN LEN(ad) > 200 THEN N'Ad 200 karakteri geçiyor.' END;

    UPDATE a SET hata = N'Dosyada aynı tarih ve zaman dilimi birden çok kez var.'
    FROM #s a WHERE a.hata IS NULL AND EXISTS (SELECT 1 FROM #s b WHERE b.sira <> a.sira AND b.hata IS NULL AND b.tarih = a.tarih AND b.zaman = a.zaman);
    UPDATE a SET hata = N'Aynı tarihte tüm gün (TAM) ile yarım gün (OO/OS) birlikte olamaz.'
    FROM #s a WHERE a.hata IS NULL AND EXISTS (SELECT 1 FROM #s b WHERE b.sira <> a.sira AND b.hata IS NULL AND b.tarih = a.tarih
                                              AND ((a.zaman = 'TAM' AND b.zaman <> 'TAM') OR (a.zaman <> 'TAM' AND b.zaman = 'TAM')));
    UPDATE a SET hata = N'Takvimde aynı tarihte tüm gün (TAM) ile yarım gün (OO/OS) çakışıyor; önce mevcut kaydı silin.'
    FROM #s a WHERE a.hata IS NULL AND EXISTS (SELECT 1 FROM gorev.takvim_tatil t WHERE t.tarih = a.tarih
                                              AND ((a.zaman = 'TAM' AND t.zaman_dilimi <> 'TAM') OR (a.zaman <> 'TAM' AND t.zaman_dilimi = 'TAM')));

    UPDATE a SET durum = CASE
            WHEN a.hata IS NOT NULL THEN 'HATA'
            WHEN t.id IS NULL THEN 'YENI'
            WHEN t.tur = a.tur AND t.ad = a.ad THEN 'AYNI'
            ELSE 'GUNCELLE' END
    FROM #s a LEFT JOIN gorev.takvim_tatil t ON t.tarih = a.tarih AND t.zaman_dilimi = a.zaman;

    SELECT sira, CONVERT(CHAR(10), tarih, 23) AS tarih, zaman, tur, ad, durum, hata FROM #s ORDER BY sira;
END;
GO

-- Toplu yükleme: ya hepsi ya hiçbiri. Hatalı satır varsa 50024 ile reddeder.
CREATE OR ALTER PROCEDURE gorev.sp_takvim_toplu_uygula
    @json NVARCHAR(MAX)
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
    IF gorev.fn_yonetici_mi() = 0 THROW 50023, N'Bu işlem için Merkez Yönetici yetkisi gerekir.', 1;
    CREATE TABLE #o (sira INT, tarih CHAR(10) COLLATE DATABASE_DEFAULT, zaman VARCHAR(3) COLLATE DATABASE_DEFAULT, tur VARCHAR(10) COLLATE DATABASE_DEFAULT,
                      ad NVARCHAR(200) COLLATE DATABASE_DEFAULT, durum VARCHAR(10) COLLATE DATABASE_DEFAULT, hata NVARCHAR(200) COLLATE DATABASE_DEFAULT);
    INSERT INTO #o EXEC gorev.sp_takvim_toplu_onizle @json;
    IF EXISTS (SELECT 1 FROM #o WHERE durum = 'HATA')
        THROW 50024, N'Hatalı satırlar var; hiçbir kayıt uygulanmadı. Önizlemedeki hataları düzeltin.', 1;
    DECLARE @e INT, @g INT, @a INT;
    BEGIN TRANSACTION;
    UPDATE t SET tur = o.tur, ad = o.ad, guncelleme = SYSDATETIME()
    FROM gorev.takvim_tatil t JOIN #o o ON t.tarih = CONVERT(DATE, o.tarih, 23) AND t.zaman_dilimi = o.zaman
    WHERE o.durum = 'GUNCELLE';
    SET @g = @@ROWCOUNT;
    INSERT INTO gorev.takvim_tatil (tarih, zaman_dilimi, tur, ad)
    SELECT CONVERT(DATE, tarih, 23), zaman, tur, ad FROM #o WHERE durum = 'YENI';
    SET @e = @@ROWCOUNT;
    SELECT @a = COUNT(*) FROM #o WHERE durum = 'AYNI';
    INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti)
    VALUES (N'TAKVIM_TOPLU', N'takvim_tatil', NULL, CONCAT(N'eklenen=', @e, N' guncellenen=', @g, N' ayni=', @a));
    COMMIT TRANSACTION;
    SELECT @e AS eklenen, @g AS guncellenen, @a AS ayni;
END;
GO

INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti)
VALUES (N'SEMA', N'sema_surumleri', N'4', N'004_havuz_takvim uygulandı');
GO
