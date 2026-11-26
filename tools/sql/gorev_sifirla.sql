-- gorev_sifirla.sql — gorev şemasındaki VERİYİ siler, yapıyı (tablolar, yordamlar, roller) korur.
-- Yalnızca SCHEMA_ID(N'gorev') altındaki nesnelere dokunur; dbo.* ve başka şemalara DOKUNMAZ.
-- Korunanlar (yapılandırma): gorev.sema_surumleri, gorev.sistem_ayarlari, gorev.rol_bolum_eslestirme, gorev.kullanici_yetki_istisna, gorev.takvim_tatil
-- (ORTAM ayarı, roller ve yöneticiler kalır; kadro kopyası ve iş verisi silinir, kadro yeniden eşitlenir).
-- Reddedilir: ORTAM = CANLI ise; ORTAM okunamıyorsa. Kimlik (IDENTITY) sayaçları sıfırlanmaz, numaralar kaldığı yerden sürer;
-- proje havuzu (gorev.proje_havuzu) satırları da silinir (numara sayacı sıfırlanmaz: dbo_koruma DBCC'yi yasaklar).
--
-- KULLANIM (SSMS): 1) Sol üstte veritabanı olarak SST_Ozluk seçili olsun.
--                  2) Aşağıdaki @onay satırındaki tırnakların içine SIFIRLA yazın.
--                  3) Betiğin tamamını çalıştırın (F5). Sonuç tablosunda silinen satır sayıları görünür.
-- Tek işlemdir: hata olursa hiçbir şey değişmez. SINANMADI (CI testi: SqlTests).
SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @onay NVARCHAR(20) = N'';   -- <-- tırnakların içine SIFIRLA yazın
DECLARE @ortam NVARCHAR(500) = NULL, @komut NVARCHAR(MAX), @sira INT = 1, @en INT;

IF SCHEMA_ID(N'gorev') IS NULL
    THROW 50011, N'gorev şeması yok; sıfırlanacak bir şey yok.', 1;

IF OBJECT_ID(N'gorev.sistem_ayarlari', N'U') IS NOT NULL
    SELECT @ortam = deger FROM gorev.sistem_ayarlari WHERE anahtar = N'ORTAM';

IF ISNULL(@ortam, N'?') <> N'TEST'
    THROW 50013, N'ORTAM TEST değil (CANLI ya da okunamadı): sıfırlama reddedildi.', 1;

IF @onay <> N'SIFIRLA'
    THROW 50012, N'Onay verilmedi: dosyadaki @onay satırına SIFIRLA yazın.', 1;

CREATE TABLE #tablo (sira INT IDENTITY(1,1) PRIMARY KEY, ad SYSNAME COLLATE DATABASE_DEFAULT NOT NULL, silinen INT NULL);

INSERT INTO #tablo (ad)
SELECT t.name
FROM sys.tables t
WHERE t.schema_id = SCHEMA_ID(N'gorev')
  AND t.name NOT IN (N'sema_surumleri', N'sistem_ayarlari', N'rol_bolum_eslestirme', N'kullanici_yetki_istisna', N'takvim_tatil');

BEGIN TRANSACTION;

SELECT @en = COUNT(*) FROM #tablo;
WHILE @sira <= @en
BEGIN
    DECLARE @ad SYSNAME;
    SELECT @ad = ad FROM #tablo WHERE sira = @sira;

    SET @komut = N'ALTER TABLE gorev.' + QUOTENAME(@ad) + N' NOCHECK CONSTRAINT ALL; '
               + N'ALTER TABLE gorev.' + QUOTENAME(@ad) + N' DISABLE TRIGGER ALL;';
    EXEC (@komut);
    SET @sira += 1;
END;

SET @sira = 1;
WHILE @sira <= @en
BEGIN
    SELECT @ad = ad FROM #tablo WHERE sira = @sira;
    SET @komut = N'DELETE FROM gorev.' + QUOTENAME(@ad) + N'; UPDATE #tablo SET silinen = @@ROWCOUNT WHERE sira = ' + CAST(@sira AS NVARCHAR(10)) + N';';
    EXEC (@komut);
    SET @sira += 1;
END;

SET @sira = 1;
WHILE @sira <= @en
BEGIN
    SELECT @ad = ad FROM #tablo WHERE sira = @sira;
    SET @komut = N'ALTER TABLE gorev.' + QUOTENAME(@ad) + N' WITH CHECK CHECK CONSTRAINT ALL; '
               + N'ALTER TABLE gorev.' + QUOTENAME(@ad) + N' ENABLE TRIGGER ALL;';
    EXEC (@komut);
    SET @sira += 1;
END;

-- Günlük temizlendiği için bu işlemin kendisi ilk satır olarak yazılır.
IF OBJECT_ID(N'gorev.islem_log', N'U') IS NOT NULL
    INSERT INTO gorev.islem_log (islem, nesne, ayrinti) VALUES (N'SIFIRLA', N'gorev', N'gorev_sifirla.sql çalıştırıldı');

COMMIT TRANSACTION;

SELECT ad AS tablo, silinen AS silinen_satir FROM #tablo ORDER BY sira;
