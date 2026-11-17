-- gorev_ilk_yonetici.sql — İLK Merkez Yöneticiyi tanımlar (tek seferlik başlangıç). Sonraki yöneticiler uygulamadan atanır.
-- Yalnızca gorev.kullanici_yetki_istisna'ya yazar. Zaten aktif bir yönetici varsa reddeder (hata 50025).
-- db_owner yetkisiyle çalıştırılır.
--
-- KULLANIM (SSMS): 1) Veritabanı olarak SST_Ozluk seçili olsun.
--                  2) @hesap boş bırakılırsa şu an bağlı olduğunuz Windows hesabı yönetici olur;
--                     başka biri olacaksa ALAN\kullanici yazın.
--                  3) Betiği çalıştırın (F5).
SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @hesap NVARCHAR(256) = N'';   -- <-- boş = ben (şu anki Windows hesabım)

IF OBJECT_ID(N'gorev.kullanici_yetki_istisna', N'U') IS NULL
    THROW 50011, N'gorev şeması kurulu değil (önce uygulamada Şemayı kur).', 1;

IF LEN(LTRIM(RTRIM(@hesap))) = 0 SET @hesap = ORIGINAL_LOGIN();
SET @hesap = LTRIM(RTRIM(@hesap));

IF EXISTS (SELECT 1 FROM gorev.kullanici_yetki_istisna WHERE yonetici_mi = 1 AND aktif = 1)
    THROW 50025, N'Zaten aktif bir Merkez Yönetici var; yeni yöneticiler uygulamadan atanır.', 1;

BEGIN TRANSACTION;
UPDATE gorev.kullanici_yetki_istisna
   SET yonetici_mi = 1, sorumlu_mu = 0, saha_mi = 0, aktif = 1, guncelleme = SYSDATETIME()
 WHERE hesap = @hesap;
IF @@ROWCOUNT = 0
    INSERT INTO gorev.kullanici_yetki_istisna (hesap, yonetici_mi, sorumlu_mu, saha_mi, aktif, aciklama)
    VALUES (@hesap, 1, 0, 0, 1, N'İlk yönetici (gorev_ilk_yonetici.sql)');
INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti)
VALUES (N'ILK_YONETICI', N'kullanici_yetki_istisna', LEFT(@hesap, 60), N'gorev_ilk_yonetici.sql');
COMMIT TRANSACTION;

SELECT hesap, yonetici_mi, aktif FROM gorev.kullanici_yetki_istisna WHERE hesap = @hesap;
