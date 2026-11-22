-- gorev_geri_donus.sql — CANLI ortamı TEST'e geri alır (acil durum; yalnız db_owner elle çalıştırır). Uygulamada bu işlem YOKTUR.
-- Yalnızca gorev.sistem_ayarlari'ndaki ORTAM satırını değiştirir ve gorev.islem_log'a yazar; veriye dokunmaz, dbo.* ve başka şemalara DOKUNMAZ.
-- Geri dönüşten sonra gorev_sifirla.sql / gorev_kaldir.sql yeniden çalışabilir hale gelir: önce yedeği alın (docs/CANLIYA-GECIS.md §5).
--
-- KULLANIM (SSMS): 1) Veritabanı olarak SST_Ozluk seçili olsun.
--                  2) @onay satırındaki tırnakların içine TESTE-DON yazın.  3) Betiği çalıştırın (F5).
-- SINANMADI (T-SQL sunucuda denenmedi).
SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @onay NVARCHAR(20) = N'';   -- <-- tırnakların içine TESTE-DON yazın

IF OBJECT_ID(N'gorev.sistem_ayarlari', N'U') IS NULL
    THROW 50011, N'gorev şeması kurulu değil.', 1;
IF @onay <> N'TESTE-DON'
    THROW 50012, N'Onay verilmedi: dosyadaki @onay satırına TESTE-DON yazın.', 1;
IF (SELECT deger FROM gorev.sistem_ayarlari WHERE anahtar = N'ORTAM') <> N'CANLI'
    THROW 50013, N'ORTAM zaten CANLI değil; yapılacak bir şey yok.', 1;

BEGIN TRANSACTION;
UPDATE gorev.sistem_ayarlari SET deger = N'TEST', guncelleme = SYSDATETIME() WHERE anahtar = N'ORTAM';
INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti) VALUES (N'ORTAM_TESTE_DON', N'sistem_ayarlari', N'ORTAM', N'CANLI → TEST (gorev_geri_donus.sql, elle)');
COMMIT TRANSACTION;
SELECT anahtar, deger FROM gorev.sistem_ayarlari WHERE anahtar = N'ORTAM';
