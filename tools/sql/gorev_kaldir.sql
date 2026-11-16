-- gorev_kaldir.sql — gorev şemasının TÜM nesnelerini (tablolar, yordamlar, görünümler...), şemayı,
-- gorev_kullanici rolünü ve gorev_sahip kullanıcısını kaldırır. Temiz kuruluma dönüş içindir.
-- Yalnızca SCHEMA_ID(N'gorev') altındaki nesnelere ve gorev_* rol/kullanıcılarına dokunur; dbo.* DOKUNULMAZ.
-- Reddedilir: ORTAM = CANLI ise. Başka şemadan gorev nesnesine yabancı anahtar varsa durur.
--
-- KULLANIM (SSMS): 1) Veritabanı olarak SST_Ozluk seçili olsun.
--                  2) Aşağıdaki @onay satırındaki tırnakların içine KALDIR yazın.
--                  3) Betiğin tamamını çalıştırın (F5). Sonuçta kaldırılan nesneler listelenir.
-- Tek işlemdir. SINANMADI (CI testi: SqlTests).
SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @onay NVARCHAR(20) = N'';   -- <-- tırnakların içine KALDIR yazın
DECLARE @ortam NVARCHAR(500) = NULL, @komut NVARCHAR(MAX), @sira INT = 1, @en INT, @metin NVARCHAR(MAX);

IF SCHEMA_ID(N'gorev') IS NULL AND DATABASE_PRINCIPAL_ID(N'gorev_sahip') IS NULL AND DATABASE_PRINCIPAL_ID(N'gorev_kullanici') IS NULL
    THROW 50011, N'Kaldırılacak gorev nesnesi yok.', 1;

IF OBJECT_ID(N'gorev.sistem_ayarlari', N'U') IS NOT NULL
    SELECT @ortam = deger FROM gorev.sistem_ayarlari WHERE anahtar = N'ORTAM';

IF @ortam IS NOT NULL AND @ortam <> N'TEST'
    THROW 50013, N'ORTAM TEST değil (CANLI): kaldırma reddedildi.', 1;

IF @onay <> N'KALDIR'
    THROW 50012, N'Onay verilmedi: dosyadaki @onay satırına KALDIR yazın.', 1;

IF EXISTS (SELECT 1 FROM sys.foreign_keys f
           WHERE f.referenced_object_id IN (SELECT object_id FROM sys.tables WHERE schema_id = SCHEMA_ID(N'gorev'))
             AND f.parent_object_id NOT IN (SELECT object_id FROM sys.tables WHERE schema_id = SCHEMA_ID(N'gorev')))
    THROW 50014, N'Başka şemadaki bir tablo gorev tablosuna yabancı anahtarla bağlı; durduruldu (dbo''ya dokunulmaz).', 1;

CREATE TABLE #adim (sira INT IDENTITY(1,1) PRIMARY KEY, tur NVARCHAR(30) COLLATE DATABASE_DEFAULT NOT NULL,
                    ad NVARCHAR(300) COLLATE DATABASE_DEFAULT NOT NULL, komut NVARCHAR(MAX) COLLATE DATABASE_DEFAULT NOT NULL);

-- 1) yabancı anahtarlar (yalnızca gorev tablolarının)
INSERT INTO #adim (tur, ad, komut)
SELECT N'FK', f.name, N'ALTER TABLE gorev.' + QUOTENAME(OBJECT_NAME(f.parent_object_id)) + N' DROP CONSTRAINT ' + QUOTENAME(f.name) + N';'
FROM sys.foreign_keys f
WHERE f.parent_object_id IN (SELECT object_id FROM sys.tables WHERE schema_id = SCHEMA_ID(N'gorev'));

-- 2) yordam, işlev, görünüm, eş ad, sıra
INSERT INTO #adim (tur, ad, komut)
SELECT CASE o.type WHEN N'P' THEN N'YORDAM' WHEN N'V' THEN N'GORUNUM' WHEN N'SN' THEN N'ESADI' WHEN N'SO' THEN N'SIRA' ELSE N'ISLEV' END,
       o.name,
       N'DROP ' + CASE o.type WHEN N'P' THEN N'PROCEDURE' WHEN N'V' THEN N'VIEW' WHEN N'SN' THEN N'SYNONYM' WHEN N'SO' THEN N'SEQUENCE' ELSE N'FUNCTION' END
         + N' gorev.' + QUOTENAME(o.name) + N';'
FROM sys.objects o
WHERE o.schema_id = SCHEMA_ID(N'gorev') AND o.type IN (N'P', N'V', N'SN', N'SO', N'FN', N'IF', N'TF');

-- 3) tablolar (tetikleyiciler tabloyla gider)
INSERT INTO #adim (tur, ad, komut)
SELECT N'TABLO', t.name, N'DROP TABLE gorev.' + QUOTENAME(t.name) + N';'
FROM sys.tables t WHERE t.schema_id = SCHEMA_ID(N'gorev');

-- 4) kullanıcı tanımlı türler
INSERT INTO #adim (tur, ad, komut)
SELECT N'TUR', ty.name, N'DROP TYPE gorev.' + QUOTENAME(ty.name) + N';'
FROM sys.types ty WHERE ty.schema_id = SCHEMA_ID(N'gorev') AND ty.is_user_defined = 1;

-- 5) rol üyeleri çıkarılır, rol, şema ve sahip kullanıcı kaldırılır
IF DATABASE_PRINCIPAL_ID(N'gorev_kullanici') IS NOT NULL
BEGIN
    INSERT INTO #adim (tur, ad, komut)
    SELECT N'UYELIK', m.name, N'ALTER ROLE gorev_kullanici DROP MEMBER ' + QUOTENAME(m.name) + N';'
    FROM sys.database_role_members rm
    JOIN sys.database_principals r ON r.principal_id = rm.role_principal_id AND r.name = N'gorev_kullanici'
    JOIN sys.database_principals m ON m.principal_id = rm.member_principal_id;
    INSERT INTO #adim (tur, ad, komut) VALUES (N'ROL', N'gorev_kullanici', N'DROP ROLE gorev_kullanici;');
END;
IF SCHEMA_ID(N'gorev') IS NOT NULL
    INSERT INTO #adim (tur, ad, komut) VALUES (N'SEMA', N'gorev', N'DROP SCHEMA gorev;');
IF DATABASE_PRINCIPAL_ID(N'gorev_sahip') IS NOT NULL
    INSERT INTO #adim (tur, ad, komut) VALUES (N'KULLANICI', N'gorev_sahip', N'DROP USER gorev_sahip;');

BEGIN TRANSACTION;

SELECT @en = COUNT(*) FROM #adim;
WHILE @sira <= @en
BEGIN
    SELECT @komut = komut FROM #adim WHERE sira = @sira;
    EXEC (@komut);
    SET @sira += 1;
END;

COMMIT TRANSACTION;

SELECT sira, tur, ad AS kaldirilan FROM #adim ORDER BY sira;
