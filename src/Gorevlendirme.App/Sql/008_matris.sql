-- Dilim 6: Haftalık matris (7 günlük ortak tablo). Yalnız okuma; yazma yok. Yetki: kayıtlı her rol (Yönetici, Sorumlu, Saha).
ALTER TABLE gorev.atamalar ADD surum ROWVERSION;
GO

-- Haftanın pazartesisi (dile/DATEFIRST'e bağlı değil: 1900-01-01 pazartesidir).
CREATE FUNCTION gorev.fn_hafta_basi (@t DATE)
RETURNS DATE
AS
BEGIN
    RETURN DATEADD(DAY, -(DATEDIFF(DAY, CAST('19000101' AS DATE), @t) % 7), @t);
END;
GO

-- Hafta içeriği: personel satırı + hücreler (JSON). Filtreler: bölüm, Ana Proje adı, ad arama, yalnız görevli olanlar.
CREATE PROCEDURE gorev.sp_matris_hafta
    @bas DATE,
    @bolum NVARCHAR(500) = NULL,
    @ana NVARCHAR(200) = NULL,
    @q NVARCHAR(100) = NULL,
    @sadece_gorevli BIT = 1
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
    WHERE a.durum = 'AKTIF' AND a.tarih BETWEEN @bas AND @bit AND (@ana IS NULL OR h1.ad = @ana);

    SELECT TOP (1000) p.sicil_no, p.adi_soyadi, p.bolum,
        (SELECT CONVERT(CHAR(10), c.tarih, 23) AS tarih, c.zaman, c.talep_id AS talepId, c.kod, c.ana, c.alt, c.faaliyet, c.konum, c.saat, c.sorumlu
         FROM #h c WHERE c.sicil_no = p.sicil_no ORDER BY c.tarih, c.zaman FOR JSON PATH) AS hucreler_json
    FROM gorev.personel p
    WHERE (p.aktif = 1 OR EXISTS (SELECT 1 FROM #h c WHERE c.sicil_no = p.sicil_no))
      AND (@bolum IS NULL OR p.bolum = @bolum)
      AND (LEN(@q) = 0 OR CHARINDEX(@q, p.adi_soyadi) > 0)
      AND ((@sadece_gorevli = 0 AND @ana IS NULL) OR EXISTS (SELECT 1 FROM #h c WHERE c.sicil_no = p.sicil_no))
    ORDER BY p.adi_soyadi;
END;
GO

-- Hafta sürümü: arayüz 30 sn'de bir bunu sorar; değişince matrisi yeniden çeker.
CREATE PROCEDURE gorev.sp_matris_surum
    @bas DATE
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    IF gorev.fn_kayitli_mi() = 0 THROW 50023, N'Bu işlem için yetkiniz yok.', 1;
    IF @bas IS NULL THROW 50024, N'Hafta başlangıcı gerekli.', 1;
    SET @bas = gorev.fn_hafta_basi(@bas);
    SELECT CONCAT(ISNULL(CONVERT(VARCHAR(20), CONVERT(BIGINT, MAX(surum))), '0'), '-', COUNT(*)) AS surum
    FROM gorev.atamalar WHERE tarih BETWEEN @bas AND DATEADD(DAY, 6, @bas);
END;
GO

-- Filtre listesi: bölümler.
CREATE PROCEDURE gorev.sp_matris_bolumler
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    IF gorev.fn_kayitli_mi() = 0 THROW 50023, N'Bu işlem için yetkiniz yok.', 1;
    SELECT DISTINCT bolum FROM gorev.personel WHERE aktif = 1 AND bolum IS NOT NULL AND LEN(LTRIM(RTRIM(bolum))) > 0 ORDER BY bolum;
END;
GO

INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti) VALUES (N'SEMA', N'sema_surumleri', N'8', N'008_matris.sql uygulandı');
GO
