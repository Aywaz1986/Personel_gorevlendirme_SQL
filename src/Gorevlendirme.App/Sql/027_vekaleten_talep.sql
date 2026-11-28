-- 027: Vekâleten talep (Dilim 34). Proje Sorumlusu başka bir Proje Sorumlusu adına talep açabilir (talep sahibi o kişi); açan hesap
-- (acan_hesap) talebi listede görür ve taslağını düzenler. Vekil yalnız Sorumlu rolündeki kişiler olabilir. Sınanmadı (SQL Server gerekir).
CREATE OR ALTER PROCEDURE gorev.sp_rol_personel
    @rol NVARCHAR(10),
    @q   NVARCHAR(100) = NULL
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    SET @rol = UPPER(LTRIM(RTRIM(ISNULL(@rol, N''))));
    IF @rol NOT IN (N'SORUMLU', N'SAHA') THROW 50024, N'Rol SORUMLU ya da SAHA olmalı.', 1;
    DECLARE @yon BIT = gorev.fn_yonetici_mi();
    IF @yon = 0 AND gorev.fn_sorumlu_mu() = 0 THROW 50023, N'Bu işlem için yetkiniz yok.', 1;   -- Sorumlu: SAHA (öneri) ve SORUMLU (vekâleten talep) listesi
    SET @q = LTRIM(RTRIM(ISNULL(@q, N'')));
    SELECT TOP (500) k.sicil_no, k.adi_soyadi, k.bolum
    FROM gorev.fn_rol_kisileri(@rol) k
    WHERE LEN(@q) = 0 OR CHARINDEX(@q, k.adi_soyadi) > 0
    ORDER BY k.adi_soyadi;
END;
GO

CREATE OR ALTER PROCEDURE gorev.sp_talep_kaydet
    @id             INT = NULL,
    @sorumlu_sicil  NVARCHAR(50) = NULL,
    @ana            NVARCHAR(300),
    @alt            NVARCHAR(300) = NULL,
    @faaliyet       NVARCHAR(300),
    @konum          NVARCHAR(300),
    @saat_baslangic VARCHAR(5),
    @saat_bitis     VARCHAR(5),
    @gorev_metni    NVARCHAR(1000),
    @nitelik        NVARCHAR(MAX) = NULL,
    @gunler_json    NVARCHAR(MAX),
    @oneri_json     NVARCHAR(MAX) = NULL,
    @gonder         BIT = 0
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
    DECLARE @yon BIT = gorev.fn_yonetici_mi(), @ben NVARCHAR(50) = gorev.fn_ben_sicil();
    IF @yon = 0 AND gorev.fn_sorumlu_mu() = 0 THROW 50023, N'Talep açmak için Proje Sorumlusu ya da Merkez Yönetici olmalısınız.', 1;

    SET @ana = LTRIM(RTRIM(ISNULL(@ana, N'')));
    SET @alt = LTRIM(RTRIM(ISNULL(@alt, N'')));
    IF LEN(@alt) = 0 SET @alt = N'Genel';
    SET @faaliyet = LTRIM(RTRIM(ISNULL(@faaliyet, N'')));
    SET @konum = LTRIM(RTRIM(ISNULL(@konum, N'')));
    SET @gorev_metni = LTRIM(RTRIM(ISNULL(@gorev_metni, N'')));
    SET @nitelik = NULLIF(LTRIM(RTRIM(ISNULL(@nitelik, N''))), N'');
    IF LEN(@ana) = 0 OR LEN(@faaliyet) = 0 OR LEN(@konum) = 0 THROW 50024, N'Ana Proje, Faaliyet ve Konum boş olamaz.', 1;
    IF LEN(@ana) > 300 OR LEN(@alt) > 300 OR LEN(@faaliyet) > 300 OR LEN(@konum) > 300 THROW 50024, N'Proje adları 300 karakteri geçemez.', 1;
    IF LEN(@gorev_metni) = 0 OR LEN(@gorev_metni) > 1000 THROW 50024, N'Görev metni boş olamaz ve 1000 karakteri geçemez.', 1;
    IF LEN(ISNULL(@nitelik, N'')) > 1000 THROW 50024, N'Saha / Operasyon Notu 1000 karakteri geçemez.', 1;

    DECLARE @sb TIME(0) = TRY_CONVERT(TIME(0), @saat_baslangic), @sbt TIME(0) = TRY_CONVERT(TIME(0), @saat_bitis);
    IF @sb IS NULL OR @sbt IS NULL OR @sbt <= @sb THROW 50024, N'Saat aralığı geçersiz (başlangıç < bitiş, ss:dd).', 1;

    -- Günler
    CREATE TABLE #g (tarih DATE NOT NULL, zaman VARCHAR(3) COLLATE DATABASE_DEFAULT NOT NULL, kisi INT NOT NULL);
    DECLARE @gecersiz INT;
    SELECT @gecersiz = COUNT(*) FROM OPENJSON(@gunler_json) WITH (tarih NVARCHAR(10) '$.tarih') j WHERE TRY_CONVERT(DATE, j.tarih, 23) IS NULL;
    IF @gecersiz > 0 THROW 50024, N'Gün listesinde geçersiz tarih var.', 1;
    INSERT INTO #g (tarih, zaman, kisi)
    SELECT TRY_CONVERT(DATE, j.tarih, 23), UPPER(LTRIM(RTRIM(ISNULL(j.zaman, ''))) COLLATE Latin1_General_CI_AS), ISNULL(j.kisi, 0)
    FROM OPENJSON(@gunler_json) WITH (tarih NVARCHAR(10) '$.tarih', zaman VARCHAR(3) '$.zaman', kisi INT '$.kisi') j;
    IF NOT EXISTS (SELECT 1 FROM #g) THROW 50024, N'En az bir gün seçin.', 1;
    IF EXISTS (SELECT 1 FROM #g WHERE zaman NOT IN ('TAM','OO','OS')) THROW 50024, N'Zaman dilimi TAM, OO ya da OS olmalı.', 1;
    IF EXISTS (SELECT 1 FROM #g WHERE kisi < 1 OR kisi > 500) THROW 50024, N'Kişi sayısı 1 ile 500 arasında olmalı.', 1;
    IF EXISTS (SELECT 1 FROM #g WHERE tarih < '2000-01-01' OR tarih > '2100-12-31') THROW 50024, N'Tarih geçersiz.', 1;
    IF EXISTS (SELECT tarih, zaman FROM #g GROUP BY tarih, zaman HAVING COUNT(*) > 1) THROW 50024, N'Aynı gün ve zaman dilimi birden fazla kez girilmiş.', 1;
    IF EXISTS (SELECT 1 FROM #g a JOIN #g b ON a.tarih = b.tarih AND a.zaman = 'TAM' AND b.zaman <> 'TAM') THROW 50024, N'Aynı güne tam gün ile yarım gün (ÖÖ/ÖS) birlikte girilemez.', 1;
    DECLARE @ilk DATE, @son DATE;
    SELECT @ilk = MIN(tarih), @son = MAX(tarih) FROM #g;
    IF DATEDIFF(DAY, @ilk, @son) > 92 THROW 50024, N'Talep en fazla 93 günlük aralığı kapsayabilir.', 1;

    -- Önerilen personel
    CREATE TABLE #o (sicil NVARCHAR(50) COLLATE DATABASE_DEFAULT NOT NULL PRIMARY KEY);
    IF @oneri_json IS NOT NULL AND LEN(@oneri_json) > 0
        INSERT INTO #o (sicil) SELECT DISTINCT LTRIM(RTRIM(j.value)) FROM OPENJSON(@oneri_json) j WHERE LEN(LTRIM(RTRIM(j.value))) > 0;
    IF (SELECT COUNT(*) FROM #o) > 50 THROW 50024, N'En fazla 50 personel önerilebilir.', 1;
    IF EXISTS (SELECT 1 FROM #o o WHERE NOT EXISTS (SELECT 1 FROM gorev.personel p WHERE p.sicil_no = o.sicil AND p.aktif = 1))
        THROW 50024, N'Önerilen personelden biri kadroda yok ya da pasif.', 1;

    BEGIN TRANSACTION;

    -- Talep sahibi
    DECLARE @sahip NVARCHAR(50), @durum VARCHAR(20), @mevcut_sahip NVARCHAR(50);
    IF @id IS NOT NULL
    BEGIN
        SELECT @mevcut_sahip = sorumlu_sicil_no, @durum = durum FROM gorev.talepler WITH (UPDLOCK) WHERE id = @id;
        IF @@ROWCOUNT = 0 THROW 50024, N'Talep bulunamadı.', 1;
        IF @yon = 0 AND ISNULL(@ben, N'') <> @mevcut_sahip AND NOT EXISTS (SELECT 1 FROM gorev.talepler WHERE id = @id AND acan_hesap = ORIGINAL_LOGIN()) THROW 50023, N'Yalnızca kendi talebinizi değiştirebilirsiniz.', 1;
        IF @durum NOT IN ('TASLAK','ONAY_BEKLIYOR') THROW 50024, N'Bu durumdaki talep burada değiştirilemez (onaylanmış talepte revize Dilim 8''dedir).', 1;
    END;
    IF @yon = 1 SET @sahip = COALESCE(NULLIF(LTRIM(RTRIM(ISNULL(@sorumlu_sicil, N''))), N''), @mevcut_sahip, @ben);
    ELSE
    BEGIN
        -- Vekâleten talep (Dilim 34): Proje Sorumlusu başka bir Proje Sorumlusu adına talep açabilir; gerçek açan kişi acan_hesap'ta kalır, taslağı o da düzenler.
        SET @sahip = COALESCE(@mevcut_sahip, NULLIF(LTRIM(RTRIM(ISNULL(@sorumlu_sicil, N''))), N''), @ben);
        IF @mevcut_sahip IS NULL AND @sahip <> ISNULL(@ben, N'') AND NOT EXISTS (SELECT 1 FROM gorev.fn_rol_kisileri(N'SORUMLU') k WHERE k.sicil_no = @sahip)
            THROW 50024, N'Vekâleten yalnız Proje Sorumlusu rolündeki bir kişi adına talep açılabilir.', 1;
    END;
    IF @sahip IS NULL THROW 50024, N'Talep sahibi (Proje Sorumlusu) seçilmeli.', 1;
    IF NOT EXISTS (SELECT 1 FROM gorev.personel WHERE sicil_no = @sahip AND aktif = 1) THROW 50024, N'Talep sahibi kadroda yok ya da pasif.', 1;

    -- Havuz yolunu çöz / oluştur
    DECLARE @ad TABLE (seviye TINYINT PRIMARY KEY, ad NVARCHAR(300) NOT NULL);
    INSERT INTO @ad VALUES (1, @ana), (2, @alt), (3, @faaliyet), (4, @konum);
    DECLARE @lv TINYINT = 1, @isim NVARCHAR(300), @ust INT = NULL, @cur INT, @akt BIT, @bi INT, @yeni NVARCHAR(MAX) = N'';
    WHILE @lv <= 4
    BEGIN
        SELECT @isim = ad FROM @ad WHERE seviye = @lv;
        SET @cur = NULL;
        SELECT @cur = id, @akt = aktif, @bi = birlestirildi_id FROM gorev.proje_havuzu WHERE ISNULL(ust_id, 0) = ISNULL(@ust, 0) AND ad = @isim;
        IF @cur IS NOT NULL AND @bi IS NOT NULL THROW 50024, N'Bu proje adı havuzda birleştirilmiş; birleştirilen hedef adı kullanın.', 1;
        IF @cur IS NOT NULL AND @akt = 0 THROW 50024, N'Bu proje adı havuzda pasif; Yönetici etkinleştirmeli.', 1;
        IF @cur IS NULL
        BEGIN
            INSERT INTO gorev.proje_havuzu (ust_id, seviye, ad, kaynak) VALUES (@ust, @lv, @isim, N'TALEP');
            SET @cur = SCOPE_IDENTITY();
            INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti) VALUES (N'HAVUZ_EKLE', N'proje_havuzu', CAST(@cur AS NVARCHAR(60)), LEFT(CONCAT(N'talepten: ', @isim), 200));
        END;
        SET @ust = @cur;
        SET @lv += 1;
    END;
    DECLARE @havuz INT = @ust;
    DECLARE @yeni_durum VARCHAR(20) = CASE WHEN @gonder = 1 THEN 'ONAY_BEKLIYOR' ELSE 'TASLAK' END;

    IF @id IS NULL
    BEGIN
        INSERT INTO gorev.talepler (sorumlu_sicil_no, havuz_id, gorev_metni, nitelik, saat_baslangic, saat_bitis, durum, ilk_tarih, son_tarih)
        VALUES (@sahip, @havuz, @gorev_metni, @nitelik, @sb, @sbt, @yeni_durum, @ilk, @son);
        SET @id = SCOPE_IDENTITY();
    END
    ELSE
    BEGIN
        UPDATE gorev.talepler SET sorumlu_sicil_no = @sahip, havuz_id = @havuz, gorev_metni = @gorev_metni, nitelik = @nitelik,
            saat_baslangic = @sb, saat_bitis = @sbt, durum = @yeni_durum, ilk_tarih = @ilk, son_tarih = @son, guncelleme = SYSDATETIME()
        WHERE id = @id;
        DELETE FROM gorev.talep_gunleri WHERE talep_id = @id;
        DELETE FROM gorev.talep_oneri WHERE talep_id = @id;
    END;
    INSERT INTO gorev.talep_gunleri (talep_id, tarih, zaman_dilimi, kisi_sayisi) SELECT @id, tarih, zaman, kisi FROM #g;
    INSERT INTO gorev.talep_oneri (talep_id, sicil_no) SELECT @id, sicil FROM #o;

    DECLARE @kod NVARCHAR(20) = (SELECT kod FROM gorev.talepler WHERE id = @id);
    INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti)
    VALUES (CASE WHEN @gonder = 1 THEN N'TALEP_GONDER' ELSE N'TALEP_KAYDET' END, N'talepler', CAST(@id AS NVARCHAR(60)),
            LEFT(CONCAT(@kod, N' ', @ana, N' / ', @faaliyet, N' / ', @konum, N' ', CONVERT(CHAR(10), @ilk, 23), N'..', CONVERT(CHAR(10), @son, 23)), 400));

    DECLARE @haftasonu INT, @tatil INT;
    SELECT @haftasonu = COUNT(DISTINCT tarih) FROM #g WHERE DATEDIFF(DAY, '19000101', tarih) % 7 >= 5;
    SELECT @tatil = COUNT(DISTINCT g.tarih) FROM #g g
    JOIN gorev.takvim_tatil t ON g.tarih BETWEEN t.baslangic AND t.bitis
         AND NOT (t.zaman_dilimi <> 'TAM' AND g.zaman <> 'TAM' AND t.zaman_dilimi <> g.zaman);
    COMMIT TRANSACTION;

    SELECT @id AS id, @kod AS kod, @yeni_durum AS durum,
           NULLIF(CONCAT(CASE WHEN @haftasonu > 0 THEN CONCAT(@haftasonu, N' gün hafta sonuna denk geliyor. ') ELSE N'' END,
                         CASE WHEN @tatil > 0 THEN CONCAT(@tatil, N' gün tatil/kapalı gün kaydıyla çakışıyor.') ELSE N'' END), N'') AS uyari;
END;
GO

CREATE OR ALTER PROCEDURE gorev.sp_talep_listele
    @durum VARCHAR(20) = NULL
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @yon BIT = gorev.fn_yonetici_mi(), @ben NVARCHAR(50) = gorev.fn_ben_sicil();
    IF @yon = 0 AND gorev.fn_sorumlu_mu() = 0 THROW 50023, N'Bu işlem için yetkiniz yok.', 1;
    SELECT TOP (500)
        t.id, t.kod, t.durum, t.sorumlu_sicil_no, s.adi_soyadi AS sorumlu_adi,
        CONVERT(CHAR(10), t.ilk_tarih, 23) AS ilk_tarih, CONVERT(CHAR(10), t.son_tarih, 23) AS son_tarih,
        h1.ad AS ana, h2.ad AS alt, h3.ad AS faaliyet, h4.ad AS konum,
        t.gorev_metni, t.nitelik, CONVERT(CHAR(5), t.saat_baslangic, 108) AS saat_baslangic, CONVERT(CHAR(5), t.saat_bitis, 108) AS saat_bitis,
        (SELECT COUNT(DISTINCT g.tarih) FROM gorev.talep_gunleri g WHERE g.talep_id = t.id) AS gun_sayisi,
        (SELECT CAST(ISNULL(SUM(CASE WHEN g.zaman_dilimi = 'TAM' THEN 1.0 ELSE 0.5 END * g.kisi_sayisi), 0) AS DECIMAL(8,1)) FROM gorev.talep_gunleri g WHERE g.talep_id = t.id) AS kisi_gun,
        STUFF((SELECT N', ' + p.adi_soyadi FROM gorev.talep_oneri o JOIN gorev.personel p ON p.sicil_no = o.sicil_no WHERE o.talep_id = t.id ORDER BY p.adi_soyadi
               FOR XML PATH(N''), TYPE).value('.', 'NVARCHAR(MAX)'), 1, 2, N'') AS oneri,
        (SELECT COUNT(*) FROM gorev.atamalar a WHERE a.talep_id = t.id AND a.durum = 'AKTIF') AS atanan,
        (SELECT ISNULL(SUM(g.kisi_sayisi), 0) FROM gorev.talep_gunleri g WHERE g.talep_id = t.id) AS istenen,
        t.ret_nedeni,
        CONVERT(CHAR(16), t.guncelleme, 120) AS guncelleme
    FROM gorev.talepler t
    JOIN gorev.personel s ON s.sicil_no = t.sorumlu_sicil_no
    JOIN gorev.proje_havuzu h4 ON h4.id = t.havuz_id
    JOIN gorev.proje_havuzu h3 ON h3.id = h4.ust_id
    JOIN gorev.proje_havuzu h2 ON h2.id = h3.ust_id
    JOIN gorev.proje_havuzu h1 ON h1.id = h2.ust_id
    WHERE (@durum IS NULL OR t.durum = @durum) AND (@yon = 1 OR t.sorumlu_sicil_no = @ben OR t.acan_hesap = ORIGINAL_LOGIN())
    ORDER BY t.ilk_tarih DESC, t.id DESC;
END;
GO

CREATE OR ALTER PROCEDURE gorev.sp_talep_getir
    @id INT
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @yon BIT = gorev.fn_yonetici_mi(), @ben NVARCHAR(50) = gorev.fn_ben_sicil();
    IF @yon = 0 AND gorev.fn_sorumlu_mu() = 0 THROW 50023, N'Bu işlem için yetkiniz yok.', 1;
    IF NOT EXISTS (SELECT 1 FROM gorev.talepler WHERE id = @id) THROW 50024, N'Talep bulunamadı.', 1;
    IF @yon = 0 AND NOT EXISTS (SELECT 1 FROM gorev.talepler WHERE id = @id AND (sorumlu_sicil_no = @ben OR acan_hesap = ORIGINAL_LOGIN())) THROW 50023, N'Yalnızca kendi talebinizi görebilirsiniz.', 1;
    SELECT t.id, t.kod, t.durum, t.sorumlu_sicil_no, s.adi_soyadi AS sorumlu_adi,
        h1.ad AS ana, h2.ad AS alt, h3.ad AS faaliyet, h4.ad AS konum,
        t.gorev_metni, t.nitelik, CONVERT(CHAR(5), t.saat_baslangic, 108) AS saat_baslangic, CONVERT(CHAR(5), t.saat_bitis, 108) AS saat_bitis,
        (SELECT CONVERT(CHAR(10), g.tarih, 23) AS tarih, g.zaman_dilimi AS zaman, g.kisi_sayisi AS kisi,
                (SELECT a.id, a.sicil_no AS sicil, p.adi_soyadi AS ad FROM gorev.atamalar a JOIN gorev.personel p ON p.sicil_no = a.sicil_no
                 WHERE a.talep_id = g.talep_id AND a.tarih = g.tarih AND a.zaman_dilimi = g.zaman_dilimi AND a.durum = 'AKTIF' ORDER BY p.adi_soyadi FOR JSON PATH) AS atananlar
         FROM gorev.talep_gunleri g WHERE g.talep_id = t.id ORDER BY g.tarih, g.zaman_dilimi FOR JSON PATH) AS gunler_json,
        t.ret_nedeni,
        (SELECT o.sicil_no AS sicil, p.adi_soyadi AS ad FROM gorev.talep_oneri o JOIN gorev.personel p ON p.sicil_no = o.sicil_no
         WHERE o.talep_id = t.id ORDER BY p.adi_soyadi FOR JSON PATH) AS oneri_json
    FROM gorev.talepler t
    JOIN gorev.personel s ON s.sicil_no = t.sorumlu_sicil_no
    JOIN gorev.proje_havuzu h4 ON h4.id = t.havuz_id
    JOIN gorev.proje_havuzu h3 ON h3.id = h4.ust_id
    JOIN gorev.proje_havuzu h2 ON h2.id = h3.ust_id
    JOIN gorev.proje_havuzu h1 ON h1.id = h2.ust_id
    WHERE t.id = @id;
END;
GO

CREATE OR ALTER PROCEDURE gorev.sp_talep_atanan_adlar
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @yon BIT = gorev.fn_yonetici_mi(), @ben NVARCHAR(50) = gorev.fn_ben_sicil();
    IF @yon = 0 AND gorev.fn_sorumlu_mu() = 0 THROW 50023, N'Bu işlem için yetkiniz yok.', 1;
    SELECT t.id AS talep_id,
           STUFF((SELECT N', ' + x.adi_soyadi FROM (SELECT DISTINCT p.adi_soyadi FROM gorev.atamalar a JOIN gorev.personel p ON p.sicil_no = a.sicil_no
                  WHERE a.talep_id = t.id AND a.durum = 'AKTIF') x ORDER BY x.adi_soyadi FOR XML PATH(N''), TYPE).value('.', 'NVARCHAR(MAX)'), 1, 2, N'') AS adlar
    FROM gorev.talepler t
    WHERE EXISTS (SELECT 1 FROM gorev.atamalar a WHERE a.talep_id = t.id AND a.durum = 'AKTIF') AND (@yon = 1 OR t.sorumlu_sicil_no = @ben OR t.acan_hesap = ORIGINAL_LOGIN());
END;
GO

INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti) VALUES (N'SEMA', N'sema_surumleri', N'27', N'Vekâleten talep: Sorumlu başka Sorumlu adına talep açar');
GO
