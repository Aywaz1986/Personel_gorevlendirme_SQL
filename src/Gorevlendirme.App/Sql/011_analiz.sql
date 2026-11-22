-- Dilim 9: analiz ve arşiv (yalnız okuma). Adam-gün: TAM = 1,0; ÖÖ/ÖS = 0,5. Yalnız AKTIF atamalar sayılır.
-- Yönetici tümünü görür; Proje Sorumlusu yalnız kendi taleplerinin verisini; Saha kullanamaz. İzin/rapor sütunları yalnız Yönetici'ye açılır.

-- Proje bazlı adam-gün: ana › alt › faaliyet düzeyinde satırlar (arayüz ana proje toplamını gruplar).
CREATE PROCEDURE gorev.sp_analiz_proje
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
    SELECT h1.ad AS ana, h2.ad AS alt, h3.ad AS faaliyet,
           CAST(SUM(CASE a.zaman_dilimi WHEN 'TAM' THEN 1.0 ELSE 0.5 END) AS DECIMAL(9,1)) AS adam_gun,
           COUNT(DISTINCT a.sicil_no) AS kisi,
           COUNT(DISTINCT a.tarih) AS gun,
           COUNT(DISTINCT t.id) AS talep,
           CONVERT(CHAR(10), MIN(a.tarih), 23) AS ilk, CONVERT(CHAR(10), MAX(a.tarih), 23) AS son
    FROM gorev.atamalar a
    JOIN gorev.talepler t ON t.id = a.talep_id
    JOIN gorev.proje_havuzu h4 ON h4.id = t.havuz_id
    JOIN gorev.proje_havuzu h3 ON h3.id = h4.ust_id
    JOIN gorev.proje_havuzu h2 ON h2.id = h3.ust_id
    JOIN gorev.proje_havuzu h1 ON h1.id = h2.ust_id
    WHERE a.durum = 'AKTIF' AND a.tarih BETWEEN @bas AND @bit AND (@ana IS NULL OR h1.ad = @ana)
      AND (@yon = 1 OR t.sorumlu_sicil_no = ISNULL(@ben, N'?'))
    GROUP BY h1.ad, h2.ad, h3.ad
    ORDER BY h1.ad, h2.ad, h3.ad;
END;
GO

-- Personel bazlı: adam-gün, görev günü, proje sayısı, (Yönetici) izin ve rapor günleri; projeler_json: [{ana, adam_gun}].
CREATE PROCEDURE gorev.sp_analiz_personel
    @bas   DATE,
    @bit   DATE,
    @bolum NVARCHAR(200) = NULL,
    @q     NVARCHAR(100) = NULL
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @yon BIT = gorev.fn_yonetici_mi(), @ben NVARCHAR(50) = gorev.fn_ben_sicil();
    IF @yon = 0 AND gorev.fn_sorumlu_mu() = 0 THROW 50023, N'Bu işlem için yetkiniz yok.', 1;
    IF @bit < @bas THROW 50024, N'Bitiş tarihi başlangıçtan önce olamaz.', 1;
    IF DATEDIFF(DAY, @bas, @bit) > 1100 THROW 50024, N'Tarih aralığı en fazla 3 yıl olabilir.', 1;
    SET @bolum = NULLIF(LTRIM(RTRIM(ISNULL(@bolum, N''))), N'');
    SET @q = NULLIF(LTRIM(RTRIM(ISNULL(@q, N''))), N'');
    CREATE TABLE #g (sicil_no NVARCHAR(50) COLLATE DATABASE_DEFAULT NOT NULL, tarih DATE NOT NULL, agirlik DECIMAL(3,1) NOT NULL, ana NVARCHAR(200) COLLATE DATABASE_DEFAULT NOT NULL);
    INSERT INTO #g (sicil_no, tarih, agirlik, ana)
    SELECT a.sicil_no, a.tarih, CASE a.zaman_dilimi WHEN 'TAM' THEN 1.0 ELSE 0.5 END, h1.ad
    FROM gorev.atamalar a
    JOIN gorev.talepler t ON t.id = a.talep_id
    JOIN gorev.proje_havuzu h4 ON h4.id = t.havuz_id
    JOIN gorev.proje_havuzu h3 ON h3.id = h4.ust_id
    JOIN gorev.proje_havuzu h2 ON h2.id = h3.ust_id
    JOIN gorev.proje_havuzu h1 ON h1.id = h2.ust_id
    WHERE a.durum = 'AKTIF' AND a.tarih BETWEEN @bas AND @bit AND (@yon = 1 OR t.sorumlu_sicil_no = ISNULL(@ben, N'?'));
    SELECT p.sicil_no, p.adi_soyadi, p.bolum,
           CAST(ISNULL(g.adam_gun, 0) AS DECIMAL(9,1)) AS adam_gun, ISNULL(g.gun, 0) AS gun, ISNULL(g.proje, 0) AS proje,
           CASE WHEN @yon = 1 THEN CAST(ISNULL(iz.n, 0) AS DECIMAL(9,1)) END AS izin_gun,
           CASE WHEN @yon = 1 THEN ISNULL(rp.n, 0) END AS rapor_gun,
           (SELECT x.ana, CAST(SUM(x.agirlik) AS DECIMAL(9,1)) AS adam_gun FROM #g x WHERE x.sicil_no = p.sicil_no GROUP BY x.ana ORDER BY SUM(x.agirlik) DESC FOR JSON PATH) AS projeler_json
    FROM gorev.personel p
    OUTER APPLY (SELECT SUM(agirlik) AS adam_gun, COUNT(DISTINCT tarih) AS gun, COUNT(DISTINCT ana) AS proje FROM #g WHERE sicil_no = p.sicil_no) g
    OUTER APPLY (SELECT SUM(CASE d.zaman_dilimi WHEN 'TAM' THEN 1.0 ELSE 0.5 END) AS n FROM gorev.izin_gunleri d JOIN gorev.izin_talepleri i ON i.id = d.izin_id
                 WHERE i.sicil_no = p.sicil_no AND d.durum = 'ONAYLI' AND d.tarih BETWEEN @bas AND @bit) iz
    OUTER APPLY (SELECT SUM(DATEDIFF(DAY, CASE WHEN r.ilk_tarih > @bas THEN r.ilk_tarih ELSE @bas END, CASE WHEN r.son_tarih < @bit THEN r.son_tarih ELSE @bit END) + 1) AS n
                 FROM gorev.raporlar r WHERE r.sicil_no = p.sicil_no AND r.durum = 'AKTIF' AND r.ilk_tarih <= @bit AND r.son_tarih >= @bas) rp
    WHERE (g.gun > 0 OR (@yon = 1 AND (iz.n > 0 OR rp.n > 0)))
      AND (@bolum IS NULL OR p.bolum = @bolum)
      AND (@q IS NULL OR p.adi_soyadi LIKE N'%' + @q + N'%' OR p.sicil_no LIKE @q + N'%')
    ORDER BY ISNULL(g.adam_gun, 0) DESC, p.adi_soyadi;
END;
GO

-- Bir kişinin dönemdeki görev / (Yönetici) izin / rapor satırları, tarih sırasıyla.
CREATE PROCEDURE gorev.sp_analiz_personel_detay
    @sicil NVARCHAR(50),
    @bas   DATE,
    @bit   DATE
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @yon BIT = gorev.fn_yonetici_mi(), @ben NVARCHAR(50) = gorev.fn_ben_sicil();
    IF @yon = 0 AND gorev.fn_sorumlu_mu() = 0 THROW 50023, N'Bu işlem için yetkiniz yok.', 1;
    IF @bit < @bas THROW 50024, N'Bitiş tarihi başlangıçtan önce olamaz.', 1;
    IF DATEDIFF(DAY, @bas, @bit) > 1100 THROW 50024, N'Tarih aralığı en fazla 3 yıl olabilir.', 1;
    SELECT CONVERT(CHAR(10), x.tarih, 23) AS tarih, x.zaman, x.tur, x.ana, x.alt, x.faaliyet, x.konum, x.kod, x.sorumlu
    FROM (
        SELECT a.tarih, a.zaman_dilimi AS zaman, 'GOREV' AS tur, h1.ad AS ana, h2.ad AS alt, h3.ad AS faaliyet, h4.ad AS konum, t.kod, s.adi_soyadi AS sorumlu
        FROM gorev.atamalar a
        JOIN gorev.talepler t ON t.id = a.talep_id
        JOIN gorev.personel s ON s.sicil_no = t.sorumlu_sicil_no
        JOIN gorev.proje_havuzu h4 ON h4.id = t.havuz_id
        JOIN gorev.proje_havuzu h3 ON h3.id = h4.ust_id
        JOIN gorev.proje_havuzu h2 ON h2.id = h3.ust_id
        JOIN gorev.proje_havuzu h1 ON h1.id = h2.ust_id
        WHERE a.sicil_no = @sicil AND a.durum = 'AKTIF' AND a.tarih BETWEEN @bas AND @bit AND (@yon = 1 OR t.sorumlu_sicil_no = ISNULL(@ben, N'?'))
        UNION ALL
        SELECT d.tarih, d.zaman_dilimi, 'IZIN', NULL, NULL, i.tur, NULL, i.kod, NULL
        FROM gorev.izin_gunleri d JOIN gorev.izin_talepleri i ON i.id = d.izin_id
        WHERE @yon = 1 AND i.sicil_no = @sicil AND d.durum = 'ONAYLI' AND d.tarih BETWEEN @bas AND @bit
        UNION ALL
        SELECT DATEADD(DAY, n.n, r.ilk_tarih), 'TAM', 'RAPOR', NULL, NULL, NULL, NULL, r.kod, NULL
        FROM gorev.raporlar r
        CROSS APPLY (SELECT TOP (DATEDIFF(DAY, r.ilk_tarih, r.son_tarih) + 1) ROW_NUMBER() OVER (ORDER BY (SELECT 1)) - 1 AS n FROM sys.all_objects) n
        WHERE @yon = 1 AND r.sicil_no = @sicil AND r.durum = 'AKTIF' AND DATEADD(DAY, n.n, r.ilk_tarih) BETWEEN @bas AND @bit
    ) x
    ORDER BY x.tarih, x.zaman, x.tur;
END;
GO

-- Arşiv: eski araçtan gelen tarihsiz "kim hangi projeye gitti" kayıtları.
CREATE PROCEDURE gorev.sp_arsiv_gecmis
    @q   NVARCHAR(100) = NULL,
    @ana NVARCHAR(200) = NULL
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    IF gorev.fn_yonetici_mi() = 0 AND gorev.fn_sorumlu_mu() = 0 THROW 50023, N'Bu işlem için yetkiniz yok.', 1;
    SET @q = NULLIF(LTRIM(RTRIM(ISNULL(@q, N''))), N'');
    SET @ana = NULLIF(LTRIM(RTRIM(ISNULL(@ana, N''))), N'');
    SELECT TOP (2000) g.id, ISNULL(p.adi_soyadi, g.personel_adi_eski) AS personel, p.bolum,
           ISNULL(h.ad, g.proje_adi_eski) AS proje, g.gorev_metni, g.sorumlu_adi_eski AS sorumlu, g.kaynak, CONVERT(CHAR(10), g.olusturma, 23) AS aktarim
    FROM gorev.gecmis_gorev g
    LEFT JOIN gorev.personel p ON p.sicil_no = g.sicil_no
    LEFT JOIN gorev.proje_havuzu h ON h.id = g.havuz_id
    WHERE (@q IS NULL OR ISNULL(p.adi_soyadi, g.personel_adi_eski) LIKE N'%' + @q + N'%' OR g.gorev_metni LIKE N'%' + @q + N'%' OR ISNULL(h.ad, g.proje_adi_eski) LIKE N'%' + @q + N'%')
      AND (@ana IS NULL OR gorev.fn_havuz_ana(g.havuz_id) IN (SELECT id FROM gorev.proje_havuzu WHERE seviye = 1 AND ad = @ana))
    ORDER BY ISNULL(h.ad, g.proje_adi_eski), ISNULL(p.adi_soyadi, g.personel_adi_eski);
END;
GO

-- Analiz ekranı filtreleri: ana proje adları.
CREATE PROCEDURE gorev.sp_analiz_ana_projeler
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    IF gorev.fn_yonetici_mi() = 0 AND gorev.fn_sorumlu_mu() = 0 THROW 50023, N'Bu işlem için yetkiniz yok.', 1;
    SELECT ad FROM gorev.proje_havuzu WHERE seviye = 1 AND aktif = 1 ORDER BY ad;
END;
GO

INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti) VALUES (N'SEMA', N'sema_surumleri', N'11', N'011_analiz.sql uygulandı');
GO
