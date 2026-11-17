-- 002_kimlik: kadro kopyası, bölüm→rol eşleştirme, kişi bazlı istisna, son yönetici koruması, sp_ben ve yönetim yordamları.
-- Yalnızca gorev nesneleri. dbo okuması yalnız 003_kadro_esitleme.sql'dedir. SINANMADI (CI'da SQL Server testi çalışır).

-- Özlük dbo.personeller'in beş alanlık kopyası (+ aktiflik). Yazan tek yer: sp_ozluk_esitle.
CREATE TABLE gorev.personel (
    id             INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_personel PRIMARY KEY,
    sicil_no       NVARCHAR(50)  NOT NULL CONSTRAINT UQ_personel_sicil UNIQUE,
    adi_soyadi     NVARCHAR(200) NOT NULL,
    bolum          NVARCHAR(500) NULL,
    gsm_no         NVARCHAR(50)  NULL,
    kullanici_adi  NVARCHAR(100) NULL,
    ayrilis_tarihi DATE NULL,
    aktif          BIT NOT NULL CONSTRAINT DF_personel_aktif DEFAULT 1,
    olusturma      DATETIME2(0) NOT NULL CONSTRAINT DF_personel_olusturma DEFAULT SYSDATETIME(),
    guncelleme     DATETIME2(0) NOT NULL CONSTRAINT DF_personel_guncelleme DEFAULT SYSDATETIME(),
    rv             ROWVERSION
);
GO

CREATE INDEX IX_personel_kullanici ON gorev.personel (kullanici_adi) WHERE kullanici_adi IS NOT NULL;
GO

-- Özlük bölüm adı → rol (Merkez Yönetici bölümden gelmez; yalnız istisnayla verilir).
CREATE TABLE gorev.rol_bolum_eslestirme (
    id         INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_rol_bolum_eslestirme PRIMARY KEY,
    bolum      NVARCHAR(500) NOT NULL CONSTRAINT UQ_rol_bolum_eslestirme_bolum UNIQUE,
    rol        NVARCHAR(20)  NOT NULL CONSTRAINT CK_rol_bolum_eslestirme_rol CHECK (rol IN (N'SORUMLU', N'SAHA')),
    guncelleme DATETIME2(0) NOT NULL CONSTRAINT DF_rol_bolum_eslestirme_g DEFAULT SYSDATETIME(),
    rv         ROWVERSION
);
GO

-- Kişi bazlı istisna: varsa bölüm kuralının yerine geçer (roller yalnızca buradaki işaretlerdir).
CREATE TABLE gorev.kullanici_yetki_istisna (
    id         INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_kullanici_yetki_istisna PRIMARY KEY,
    hesap      NVARCHAR(256) NOT NULL CONSTRAINT UQ_kullanici_yetki_istisna_hesap UNIQUE,
    sicil_no   NVARCHAR(50) NULL,
    yonetici_mi BIT NOT NULL CONSTRAINT DF_kyi_yonetici DEFAULT 0,
    sorumlu_mu  BIT NOT NULL CONSTRAINT DF_kyi_sorumlu DEFAULT 0,
    saha_mi     BIT NOT NULL CONSTRAINT DF_kyi_saha DEFAULT 0,
    aktif       BIT NOT NULL CONSTRAINT DF_kyi_aktif DEFAULT 1,
    aciklama    NVARCHAR(300) NULL,
    guncelleme  DATETIME2(0) NOT NULL CONSTRAINT DF_kyi_guncelleme DEFAULT SYSDATETIME(),
    rv          ROWVERSION
);
GO

-- Sistemde her zaman en az bir aktif Merkez Yönetici bulunur.
CREATE TRIGGER gorev.tr_istisna_son_yonetici ON gorev.kullanici_yetki_istisna AFTER UPDATE, DELETE AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM deleted WHERE yonetici_mi = 1 AND aktif = 1)
       AND NOT EXISTS (SELECT 1 FROM gorev.kullanici_yetki_istisna WHERE yonetici_mi = 1 AND aktif = 1)
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW 50020, N'Sistemde en az bir aktif Merkez Yönetici bulunmalı; son yönetici kaldırılamaz.', 1;
    END;
END;
GO

-- Hesap eşleşmesi: kayıt "ALAN\kullanici" ya da yalnızca "kullanici" olabilir (Özlük'teki kuralla aynı).
-- Windows hesap adları için büyük/küçük harf duyarsız, Türkçe I/İ ayrımı olmadan (Latin1) karşılaştırılır.
CREATE FUNCTION gorev.fn_hesap_eslesir (@kayit NVARCHAR(256), @hesap NVARCHAR(256))
RETURNS BIT
AS
BEGIN
    RETURN CASE
        WHEN @kayit IS NULL OR @hesap IS NULL OR LEN(@kayit) = 0 OR LEN(@hesap) = 0 THEN 0
        WHEN @kayit COLLATE Latin1_General_CI_AS = @hesap COLLATE Latin1_General_CI_AS THEN 1
        WHEN CHARINDEX(N'\', @kayit) = 0
         AND @kayit COLLATE Latin1_General_CI_AS = SUBSTRING(@hesap, CHARINDEX(N'\', @hesap) + 1, 256) COLLATE Latin1_General_CI_AS THEN 1
        ELSE 0 END;
END;
GO

CREATE FUNCTION gorev.fn_yonetici_mi ()
RETURNS BIT
AS
BEGIN
    RETURN CASE WHEN EXISTS (
        SELECT 1 FROM gorev.kullanici_yetki_istisna i
        WHERE i.aktif = 1 AND i.yonetici_mi = 1 AND gorev.fn_hesap_eslesir(i.hesap, ORIGINAL_LOGIN()) = 1
    ) THEN 1 ELSE 0 END;
END;
GO

-- Bağlanan kişinin kimliği ve rolleri. Kayıtsız / rolsüz kişi: kayitli = 0 (arayüz "Yetkisiz Erişim" gösterir).
CREATE OR ALTER PROCEDURE gorev.sp_ben
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @hesap NVARCHAR(256) = ORIGINAL_LOGIN();
    DECLARE @istisna BIT = 0, @y BIT = 0, @s BIT = 0, @h BIT = 0, @p_aktif BIT = 0, @kaynak NVARCHAR(20) = N'YOK';
    DECLARE @sicil NVARCHAR(50), @ad NVARCHAR(200), @bolum NVARCHAR(500);

    SELECT TOP (1) @istisna = 1, @y = i.yonetici_mi, @s = i.sorumlu_mu, @h = i.saha_mi, @sicil = i.sicil_no
    FROM gorev.kullanici_yetki_istisna i
    WHERE i.aktif = 1 AND gorev.fn_hesap_eslesir(i.hesap, @hesap) = 1
    ORDER BY i.id;

    SELECT TOP (1) @sicil = p.sicil_no, @ad = p.adi_soyadi, @bolum = p.bolum, @p_aktif = p.aktif
    FROM gorev.personel p
    WHERE (@sicil IS NOT NULL AND p.sicil_no = @sicil)
       OR (@sicil IS NULL AND p.aktif = 1 AND gorev.fn_hesap_eslesir(p.kullanici_adi, @hesap) = 1)
    ORDER BY p.aktif DESC, p.id;

    IF @istisna = 1
        SET @kaynak = N'ISTISNA';
    ELSE IF @p_aktif = 1
    BEGIN
        SELECT @s = CASE WHEN e.rol = N'SORUMLU' THEN 1 ELSE 0 END,
               @h = CASE WHEN e.rol = N'SAHA' THEN 1 ELSE 0 END,
               @kaynak = N'BOLUM'
        FROM gorev.rol_bolum_eslestirme e
        WHERE e.bolum = @bolum;
    END;

    SELECT @hesap AS hesap,
           CAST(CASE WHEN @y = 1 OR @s = 1 OR @h = 1 THEN 1 ELSE 0 END AS BIT) AS kayitli,
           ISNULL(@ad, @hesap) AS adi_soyadi, @sicil AS sicil_no, @bolum AS bolum,
           @y AS yonetici, @s AS sorumlu, @h AS saha,
           CASE WHEN @y = 1 OR @s = 1 OR @h = 1 THEN @kaynak ELSE N'YOK' END AS kaynak;
END;
GO

-- ---- Yönetim yordamları (yalnız Merkez Yönetici) ----

CREATE OR ALTER PROCEDURE gorev.sp_kadro_ozet
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    IF gorev.fn_yonetici_mi() = 0 THROW 50023, N'Bu işlem için Merkez Yönetici yetkisi gerekir.', 1;
    SELECT (SELECT COUNT(*) FROM gorev.personel) AS toplam,
           (SELECT COUNT(*) FROM gorev.personel WHERE aktif = 1) AS aktif,
           l.zaman AS son_zaman, l.kullanici AS son_kullanici, l.ayrinti AS son_ayrinti
    FROM (SELECT 1 AS x) d
    LEFT JOIN (SELECT TOP (1) zaman, kullanici, ayrinti FROM gorev.islem_log WHERE islem = N'KADRO_ESITLE' ORDER BY id DESC) l ON 1 = 1;
END;
GO

CREATE OR ALTER PROCEDURE gorev.sp_kadro_listele
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    IF gorev.fn_yonetici_mi() = 0 THROW 50023, N'Bu işlem için Merkez Yönetici yetkisi gerekir.', 1;
    SELECT p.sicil_no, p.adi_soyadi, p.bolum, p.kullanici_adi, p.aktif,
           CASE WHEN ist.id IS NOT NULL THEN N'ISTISNA' ELSE e.rol END AS rol
    FROM gorev.personel p
    LEFT JOIN gorev.rol_bolum_eslestirme e ON e.bolum = p.bolum
    OUTER APPLY (SELECT TOP (1) i.id FROM gorev.kullanici_yetki_istisna i
                 WHERE i.aktif = 1 AND (i.sicil_no = p.sicil_no
                    OR gorev.fn_hesap_eslesir(i.hesap, p.kullanici_adi) = 1
                    OR gorev.fn_hesap_eslesir(p.kullanici_adi, i.hesap) = 1)) ist
    ORDER BY p.adi_soyadi;
END;
GO

CREATE OR ALTER PROCEDURE gorev.sp_eslestirme_listele
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    IF gorev.fn_yonetici_mi() = 0 THROW 50023, N'Bu işlem için Merkez Yönetici yetkisi gerekir.', 1;
    SELECT x.bolum, e.rol, ISNULL(c.kisi, 0) AS kisi
    FROM (SELECT bolum FROM gorev.personel WHERE bolum IS NOT NULL AND aktif = 1
          UNION SELECT bolum FROM gorev.rol_bolum_eslestirme) x
    LEFT JOIN gorev.rol_bolum_eslestirme e ON e.bolum = x.bolum
    LEFT JOIN (SELECT bolum, COUNT(*) AS kisi FROM gorev.personel WHERE aktif = 1 AND bolum IS NOT NULL GROUP BY bolum) c ON c.bolum = x.bolum
    ORDER BY x.bolum;
END;
GO

-- @rol NULL ya da boş: eşleşmeyi kaldırır.
CREATE OR ALTER PROCEDURE gorev.sp_eslestirme_kaydet
    @bolum NVARCHAR(500),
    @rol   NVARCHAR(20) = NULL
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
    IF gorev.fn_yonetici_mi() = 0 THROW 50023, N'Bu işlem için Merkez Yönetici yetkisi gerekir.', 1;
    SET @bolum = LTRIM(RTRIM(@bolum));
    SET @rol = NULLIF(LTRIM(RTRIM(ISNULL(@rol, N''))), N'');
    IF @bolum IS NULL OR LEN(@bolum) = 0 THROW 50024, N'Bölüm adı boş olamaz.', 1;
    IF @rol IS NOT NULL AND @rol NOT IN (N'SORUMLU', N'SAHA') THROW 50024, N'Rol SORUMLU ya da SAHA olmalı.', 1;

    BEGIN TRANSACTION;
    IF @rol IS NULL
        DELETE FROM gorev.rol_bolum_eslestirme WHERE bolum = @bolum;
    ELSE
    BEGIN
        UPDATE gorev.rol_bolum_eslestirme SET rol = @rol, guncelleme = SYSDATETIME() WHERE bolum = @bolum;
        IF @@ROWCOUNT = 0 INSERT INTO gorev.rol_bolum_eslestirme (bolum, rol) VALUES (@bolum, @rol);
    END;
    INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti)
    VALUES (N'ESLESTIRME', N'rol_bolum_eslestirme', LEFT(@bolum, 60), ISNULL(@rol, N'KALDIRILDI'));
    COMMIT TRANSACTION;
END;
GO

CREATE OR ALTER PROCEDURE gorev.sp_istisna_listele
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    IF gorev.fn_yonetici_mi() = 0 THROW 50023, N'Bu işlem için Merkez Yönetici yetkisi gerekir.', 1;
    SELECT i.hesap, i.sicil_no, p.adi_soyadi, i.yonetici_mi, i.sorumlu_mu, i.saha_mi, i.aktif, i.aciklama
    FROM gorev.kullanici_yetki_istisna i
    LEFT JOIN gorev.personel p ON p.sicil_no = i.sicil_no
    ORDER BY i.hesap;
END;
GO

CREATE OR ALTER PROCEDURE gorev.sp_istisna_kaydet
    @hesap       NVARCHAR(256),
    @sicil_no    NVARCHAR(50) = NULL,
    @yonetici_mi BIT = 0,
    @sorumlu_mu  BIT = 0,
    @saha_mi     BIT = 0,
    @aktif       BIT = 1,
    @aciklama    NVARCHAR(300) = NULL
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
    IF gorev.fn_yonetici_mi() = 0 THROW 50023, N'Bu işlem için Merkez Yönetici yetkisi gerekir.', 1;
    SET @hesap = LTRIM(RTRIM(ISNULL(@hesap, N'')));
    SET @sicil_no = NULLIF(LTRIM(RTRIM(ISNULL(@sicil_no, N''))), N'');
    IF LEN(@hesap) = 0 THROW 50024, N'Windows hesabı boş olamaz.', 1;
    IF @sicil_no IS NOT NULL AND NOT EXISTS (SELECT 1 FROM gorev.personel WHERE sicil_no = @sicil_no)
        THROW 50024, N'Sicil kadro kopyasında yok (önce kadroyu eşitleyin ya da sicili boş bırakın).', 1;

    BEGIN TRANSACTION;
    UPDATE gorev.kullanici_yetki_istisna
       SET sicil_no = @sicil_no, yonetici_mi = @yonetici_mi, sorumlu_mu = @sorumlu_mu, saha_mi = @saha_mi,
           aktif = @aktif, aciklama = @aciklama, guncelleme = SYSDATETIME()
     WHERE hesap = @hesap;
    IF @@ROWCOUNT = 0
        INSERT INTO gorev.kullanici_yetki_istisna (hesap, sicil_no, yonetici_mi, sorumlu_mu, saha_mi, aktif, aciklama)
        VALUES (@hesap, @sicil_no, @yonetici_mi, @sorumlu_mu, @saha_mi, @aktif, @aciklama);
    INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti)
    VALUES (N'ISTISNA', N'kullanici_yetki_istisna', LEFT(@hesap, 60),
            CONCAT(N'yonetici=', @yonetici_mi, N' sorumlu=', @sorumlu_mu, N' saha=', @saha_mi, N' aktif=', @aktif));
    COMMIT TRANSACTION;
END;
GO

CREATE OR ALTER PROCEDURE gorev.sp_istisna_sil
    @hesap NVARCHAR(256)
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    IF gorev.fn_yonetici_mi() = 0 THROW 50023, N'Bu işlem için Merkez Yönetici yetkisi gerekir.', 1;
    SET @hesap = LTRIM(RTRIM(ISNULL(@hesap, N'')));
    BEGIN TRANSACTION;
    DELETE FROM gorev.kullanici_yetki_istisna WHERE hesap = @hesap;
    IF @@ROWCOUNT > 0
        INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti) VALUES (N'ISTISNA_SIL', N'kullanici_yetki_istisna', LEFT(@hesap, 60), NULL);
    COMMIT TRANSACTION;
END;
GO

INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti)
VALUES (N'SEMA', N'sema_surumleri', N'2', N'002_kimlik uygulandı');
GO
