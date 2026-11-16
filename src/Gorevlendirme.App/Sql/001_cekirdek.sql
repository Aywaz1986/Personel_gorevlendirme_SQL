-- 001_cekirdek: rol, ayarlar, değiştirilemez işlem günlüğü, sürüm bilgisi yordamı.
-- Ön koşul (Migrator açılışta kurar): gorev_sahip kullanıcısı, gorev şeması, gorev.sema_surumleri.
-- Yalnızca gorev nesnelerine dokunur. SINANMADI (CI'da SQL Server testi çalışır).

IF DATABASE_PRINCIPAL_ID(N'gorev_kullanici') IS NULL
    CREATE ROLE gorev_kullanici;
GO

-- Okuma ve yazma yalnızca yordamlarla; tablolara doğrudan yetki verilmez.
GRANT EXECUTE ON SCHEMA::gorev TO gorev_kullanici;
GO

-- Özlük'te var olan genel giriş kullanıcısı rolün üyesi olur (yoksa atlanır: yetkiyi tablo kaydı verir, bağlantı izni değil).
IF DATABASE_PRINCIPAL_ID(N'NT AUTHORITY\Authenticated Users') IS NOT NULL
   AND IS_ROLEMEMBER(N'gorev_kullanici', N'NT AUTHORITY\Authenticated Users') = 0
    ALTER ROLE gorev_kullanici ADD MEMBER [NT AUTHORITY\Authenticated Users];
GO

CREATE TABLE gorev.sistem_ayarlari (
    id         INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_sistem_ayarlari PRIMARY KEY,
    anahtar    NVARCHAR(100) NOT NULL CONSTRAINT UQ_sistem_ayarlari_anahtar UNIQUE,
    deger      NVARCHAR(500) NULL,
    aciklama   NVARCHAR(300) NULL,
    guncelleme DATETIME2(0) NOT NULL CONSTRAINT DF_sistem_ayarlari_guncelleme DEFAULT SYSDATETIME(),
    rv         ROWVERSION,
    CONSTRAINT CK_sistem_ayarlari_ortam CHECK (anahtar <> N'ORTAM' OR deger IN (N'TEST', N'CANLI'))
);
GO

INSERT INTO gorev.sistem_ayarlari (anahtar, deger, aciklama) VALUES
    (N'ORTAM',               N'TEST',  N'TEST: sıfırlama/kaldırma betikleri çalışır. CANLI: reddedilir (geri dönüş yalnızca db_owner elle).'),
    (N'MIN_UYGULAMA_SURUMU', N'0.0.0', N'Bu sürümden eski exe bağlanamaz (kaza önleme).'),
    (N'POLLING_SANIYE',      N'30',    N'Ekran yenileme aralığı (saniye).');
GO

CREATE TABLE gorev.islem_log (
    id        BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_islem_log PRIMARY KEY,
    zaman     DATETIME2(0) NOT NULL CONSTRAINT DF_islem_log_zaman DEFAULT SYSDATETIME(),
    kullanici NVARCHAR(256) NOT NULL CONSTRAINT DF_islem_log_kullanici DEFAULT ORIGINAL_LOGIN(),
    islem     NVARCHAR(60) NOT NULL,
    nesne     NVARCHAR(60) NULL,
    nesne_id  NVARCHAR(60) NULL,
    ayrinti   NVARCHAR(MAX) NULL
);
GO

CREATE INDEX IX_islem_log_zaman ON gorev.islem_log (zaman);
GO

-- Günlük değiştirilemez: güncelleme ve silme reddedilir (kullanıcıların zaten tablo yetkisi yoktur; bu ikinci kilittir).
CREATE TRIGGER gorev.tr_islem_log_degismez ON gorev.islem_log INSTEAD OF UPDATE, DELETE AS
BEGIN
    SET NOCOUNT ON;
    THROW 50010, N'gorev.islem_log değiştirilemez.', 1;
END;
GO

-- Sürüm kapısı için okuma: herkes çağırabilir, yalnızca sürüm/ortam bilgisi döner.
CREATE OR ALTER PROCEDURE gorev.sp_surum_bilgi
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        (SELECT MAX(surum) FROM gorev.sema_surumleri)                                         AS sema_surumu,
        (SELECT deger FROM gorev.sistem_ayarlari WHERE anahtar = N'MIN_UYGULAMA_SURUMU')       AS min_uygulama_surumu,
        (SELECT deger FROM gorev.sistem_ayarlari WHERE anahtar = N'ORTAM')                     AS ortam,
        (SELECT deger FROM gorev.sistem_ayarlari WHERE anahtar = N'POLLING_SANIYE')            AS polling_saniye,
        ORIGINAL_LOGIN()                                                                       AS hesap,
        SYSDATETIME()                                                                          AS sunucu_zamani;
END;
GO

INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti)
VALUES (N'SEMA', N'sema_surumleri', N'1', N'001_cekirdek uygulandı');
GO
