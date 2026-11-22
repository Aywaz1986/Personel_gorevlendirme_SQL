-- Dilim 11: senaryo tamamlama (01_Merkezi_Personel_Gorevlendirme_Is_Senaryosu).
-- 1) "Aranan nitelik" yerine Saha / Operasyon Notu (fiziksel sütun adı nitelik kalır; 1000 karakter). 2) Telefon + not görünürlüğü (sp_talep_iletisim).
-- 3) Rozet sayaçları (sp_sayaclar). 4) Birim/ayrılma/rapor kaynaklı ikame uyarıları (fn_ikame_bekleyenler, sp_ikame_bekleyenler).
-- 5) Analiz: müsait gün + tatil günü + tatil çalışması. 6) Tavsiye listesi: toplam görev, adam-gün, yerleşkeler, müsaitlik. 7) Matris: yerleşke (konum) süzgeci.

-- 1) Saha / Operasyon Notu: sütunlar ve bu sütunu kullanan yordamlar 300 → 1000 karakter.
ALTER TABLE gorev.talepler ALTER COLUMN nitelik NVARCHAR(1000) NULL;
ALTER TABLE gorev.revize_talepleri ALTER COLUMN nitelik NVARCHAR(1000) NULL;
GO
-- Saha / Operasyon Notu 1000 karakter: nitelik kullanan yordamlar (006 sp_talep_kaydet, 010 sp_revize_uygula + sp_revize_iste) aynı metinle yeniden tanımlanır.
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
        IF @yon = 0 AND ISNULL(@ben, N'') <> @mevcut_sahip THROW 50023, N'Yalnızca kendi talebinizi değiştirebilirsiniz.', 1;
        IF @durum NOT IN ('TASLAK','ONAY_BEKLIYOR') THROW 50024, N'Bu durumdaki talep burada değiştirilemez (onaylanmış talepte revize Dilim 8''dedir).', 1;
    END;
    IF @yon = 1 SET @sahip = COALESCE(NULLIF(LTRIM(RTRIM(ISNULL(@sorumlu_sicil, N''))), N''), @mevcut_sahip, @ben);
    ELSE SET @sahip = COALESCE(@mevcut_sahip, @ben);
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

CREATE OR ALTER PROCEDURE gorev.sp_revize_uygula
    @id INT
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    IF @@NESTLEVEL < 2 THROW 50023, N'Bu yordam doğrudan çağrılamaz.', 1;
    DECLARE @talep INT, @gm NVARCHAR(1000), @nt NVARCHAR(1000), @sb TIME(0), @sbit TIME(0), @gj NVARCHAR(MAX), @durum VARCHAR(15), @kod NVARCHAR(20), @tkod NVARCHAR(20), @sahip NVARCHAR(50);
    SELECT @talep = r.talep_id, @gm = r.gorev_metni, @nt = r.nitelik, @sb = r.saat_baslangic, @sbit = r.saat_bitis, @gj = r.gunler_json, @durum = r.durum, @kod = r.kod
    FROM gorev.revize_talepleri r WITH (UPDLOCK) WHERE r.id = @id;
    IF @talep IS NULL THROW 50024, N'Revize bulunamadı.', 1;
    IF @durum <> 'BEKLIYOR' THROW 50024, N'Bu revize artık beklemiyor.', 1;
    SELECT @tkod = kod, @sahip = sorumlu_sicil_no FROM gorev.talepler WITH (UPDLOCK) WHERE id = @talep;
    IF NOT EXISTS (SELECT 1 FROM gorev.talepler WHERE id = @talep AND durum IN ('KISMEN_ATANDI','TAMAMEN_ATANDI')) THROW 50024, N'Talep artık revize edilebilir durumda değil.', 1;
    IF @gj IS NOT NULL
    BEGIN
        CREATE TABLE #y (tarih DATE NOT NULL, zaman VARCHAR(3) COLLATE DATABASE_DEFAULT NOT NULL, kisi INT NOT NULL);
        INSERT INTO #y (tarih, zaman, kisi)
        SELECT TRY_CONVERT(DATE, j.tarih, 23), UPPER(LTRIM(RTRIM(j.zaman))), j.kisi FROM OPENJSON(@gj) WITH (tarih NVARCHAR(10) '$.tarih', zaman VARCHAR(3) '$.zaman', kisi INT '$.kisi') j;
        IF EXISTS (SELECT 1 FROM gorev.talep_gunleri g
                   LEFT JOIN #y y ON y.tarih = g.tarih AND y.zaman = g.zaman_dilimi
                   CROSS APPLY (SELECT COUNT(*) AS n FROM gorev.atamalar a WHERE a.talep_id = g.talep_id AND a.tarih = g.tarih AND a.zaman_dilimi = g.zaman_dilimi AND a.durum = 'AKTIF') m
                   WHERE g.talep_id = @talep AND m.n > ISNULL(y.kisi, 0))
            THROW 50024, N'Bir gün/dilimde atanmış kişi sayısı yeni kişi sayısından fazla (ya da gün kaldırılıyor); önce kişileri görevden çıkarın.', 1;
        DELETE g FROM gorev.talep_gunleri g WHERE g.talep_id = @talep AND NOT EXISTS (SELECT 1 FROM #y y WHERE y.tarih = g.tarih AND y.zaman = g.zaman_dilimi);
        UPDATE g SET kisi_sayisi = y.kisi FROM gorev.talep_gunleri g JOIN #y y ON y.tarih = g.tarih AND y.zaman = g.zaman_dilimi WHERE g.talep_id = @talep;
        INSERT INTO gorev.talep_gunleri (talep_id, tarih, zaman_dilimi, kisi_sayisi)
        SELECT @talep, y.tarih, y.zaman, y.kisi FROM #y y WHERE NOT EXISTS (SELECT 1 FROM gorev.talep_gunleri g WHERE g.talep_id = @talep AND g.tarih = y.tarih AND g.zaman_dilimi = y.zaman);
        UPDATE gorev.talepler SET ilk_tarih = (SELECT MIN(tarih) FROM #y), son_tarih = (SELECT MAX(tarih) FROM #y) WHERE id = @talep;
    END;
    UPDATE gorev.talepler SET gorev_metni = ISNULL(@gm, gorev_metni), nitelik = ISNULL(@nt, nitelik),
           saat_baslangic = ISNULL(@sb, saat_baslangic), saat_bitis = ISNULL(@sbit, saat_bitis),
           durum = gorev.fn_talep_durum(@talep), guncelleme = SYSDATETIME()
    WHERE id = @talep;
    UPDATE gorev.revize_talepleri SET durum = 'ONAYLANDI', karar_hesap = ORIGINAL_LOGIN(), karar_tarihi = SYSDATETIME() WHERE id = @id;
    IF @sahip <> ISNULL(gorev.fn_ben_sicil(), N'')
        INSERT INTO gorev.bildirimler (sicil_no, tur, mesaj, talep_id) VALUES (@sahip, 'REVIZE_ONAY', LEFT(@tkod + N' revizesi (' + @kod + N') uygulandı.', 500), @talep);
    INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti) VALUES (N'REVIZE_UYGULA', N'revize_talepleri', CAST(@id AS NVARCHAR(60)), LEFT(CONCAT(@kod, N' ', @tkod), 400));
END;
GO

CREATE OR ALTER PROCEDURE gorev.sp_revize_iste
    @talep_id       INT,
    @gorev_metni    NVARCHAR(1000) = NULL,
    @nitelik        NVARCHAR(MAX) = NULL,
    @saat_baslangic VARCHAR(5) = NULL,
    @saat_bitis     VARCHAR(5) = NULL,
    @gunler_json    NVARCHAR(MAX) = NULL,
    @neden          NVARCHAR(300) = NULL
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    DECLARE @yon BIT = gorev.fn_yonetici_mi(), @ben NVARCHAR(50) = gorev.fn_ben_sicil();
    IF @yon = 0 AND gorev.fn_sorumlu_mu() = 0 THROW 50023, N'Bu işlem için yetkiniz yok.', 1;
    SET @gorev_metni = NULLIF(LTRIM(RTRIM(ISNULL(@gorev_metni, N''))), N'');
    SET @nitelik = NULLIF(LTRIM(RTRIM(ISNULL(@nitelik, N''))), N'');
    IF LEN(ISNULL(@nitelik, N'')) > 1000 THROW 50024, N'Saha / Operasyon Notu 1000 karakteri geçemez.', 1;
    SET @saat_baslangic = NULLIF(LTRIM(RTRIM(ISNULL(@saat_baslangic, ''))), '');
    SET @saat_bitis = NULLIF(LTRIM(RTRIM(ISNULL(@saat_bitis, ''))), '');
    SET @gunler_json = NULLIF(LTRIM(RTRIM(ISNULL(@gunler_json, N''))), N'');
    SET @neden = NULLIF(LTRIM(RTRIM(ISNULL(@neden, N''))), N'');
    IF @gorev_metni IS NULL AND @nitelik IS NULL AND @saat_baslangic IS NULL AND @saat_bitis IS NULL AND @gunler_json IS NULL THROW 50024, N'Değiştirilecek en az bir alan gerekli.', 1;
    DECLARE @sb TIME(0) = TRY_CONVERT(TIME(0), @saat_baslangic), @sbit TIME(0) = TRY_CONVERT(TIME(0), @saat_bitis);
    IF (@saat_baslangic IS NOT NULL AND @sb IS NULL) OR (@saat_bitis IS NOT NULL AND @sbit IS NULL) THROW 50024, N'Saat biçimi SS:DD olmalı.', 1;
    IF @gunler_json IS NOT NULL
    BEGIN
        IF ISJSON(@gunler_json) = 0 THROW 50024, N'Gün listesi geçersiz.', 1;
        DECLARE @gecersiz INT, @sayi INT, @aralik INT, @tekrar INT;
        SELECT @gecersiz = SUM(CASE WHEN TRY_CONVERT(DATE, j.tarih, 23) IS NULL OR UPPER(LTRIM(RTRIM(ISNULL(j.zaman, '')))) NOT IN ('TAM','OO','OS') OR j.kisi IS NULL OR j.kisi NOT BETWEEN 1 AND 500 THEN 1 ELSE 0 END), @sayi = COUNT(*)
        FROM OPENJSON(@gunler_json) WITH (tarih NVARCHAR(10) '$.tarih', zaman VARCHAR(3) '$.zaman', kisi INT '$.kisi') j;
        IF ISNULL(@sayi, 0) = 0 THROW 50024, N'En az bir gün gerekli.', 1;
        IF @gecersiz > 0 THROW 50024, N'Gün listesinde geçersiz tarih, dilim ya da kişi sayısı var.', 1;
        SELECT @aralik = DATEDIFF(DAY, MIN(TRY_CONVERT(DATE, j.tarih, 23)), MAX(TRY_CONVERT(DATE, j.tarih, 23)))
        FROM OPENJSON(@gunler_json) WITH (tarih NVARCHAR(10) '$.tarih') j;
        IF @aralik > 92 THROW 50024, N'Talep en fazla 93 günü kapsayabilir.', 1;
        SELECT @tekrar = COUNT(*) FROM (SELECT j.tarih, UPPER(LTRIM(RTRIM(j.zaman))) AS z FROM OPENJSON(@gunler_json) WITH (tarih NVARCHAR(10) '$.tarih', zaman VARCHAR(3) '$.zaman') j GROUP BY j.tarih, UPPER(LTRIM(RTRIM(j.zaman))) HAVING COUNT(*) > 1) d;
        IF @tekrar > 0 THROW 50024, N'Aynı gün/dilim birden fazla kez yazılmış.', 1;
    END;
    BEGIN TRANSACTION;
    DECLARE @sahip NVARCHAR(50), @durum VARCHAR(20), @kod NVARCHAR(20), @ts TIME(0), @tb TIME(0);
    SELECT @sahip = sorumlu_sicil_no, @durum = durum, @kod = kod, @ts = saat_baslangic, @tb = saat_bitis FROM gorev.talepler WITH (UPDLOCK) WHERE id = @talep_id;
    IF @@ROWCOUNT = 0 THROW 50024, N'Talep bulunamadı.', 1;
    IF @yon = 0 AND ISNULL(@ben, N'') <> @sahip THROW 50023, N'Yalnızca kendi talebiniz için revize isteyebilirsiniz.', 1;
    IF @durum NOT IN ('KISMEN_ATANDI','TAMAMEN_ATANDI') THROW 50024, N'Yalnız atama yapılmış talep revize edilir (bekleyen talep doğrudan düzenlenir).', 1;
    IF ISNULL(@sb, @ts) >= ISNULL(@sbit, @tb) THROW 50024, N'Bitiş saati başlangıçtan sonra olmalı.', 1;
    IF EXISTS (SELECT 1 FROM gorev.revize_talepleri WHERE talep_id = @talep_id AND durum = 'BEKLIYOR') THROW 50024, N'Bu talepte bekleyen bir revize var; önce onu geri çekin ya da sonuçlandırın.', 1;
    INSERT INTO gorev.revize_talepleri (talep_id, isteyen_sicil, gorev_metni, nitelik, saat_baslangic, saat_bitis, gunler_json, neden)
    VALUES (@talep_id, @ben, @gorev_metni, @nitelik, @sb, @sbit, @gunler_json, @neden);
    DECLARE @id INT = SCOPE_IDENTITY(), @rkod NVARCHAR(20) = (SELECT kod FROM gorev.revize_talepleri WHERE id = SCOPE_IDENTITY());
    IF @yon = 1
        EXEC gorev.sp_revize_uygula @id;
    ELSE
        INSERT INTO gorev.bildirimler (sicil_no, tur, mesaj, talep_id) SELECT sicil_no, 'REVIZE_TALEP', LEFT(@kod + N' için revize istendi (' + @rkod + N').', 500), @talep_id FROM gorev.fn_yonetici_sicilleri();
    INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti) VALUES (N'REVIZE_ISTE', N'revize_talepleri', CAST(@id AS NVARCHAR(60)), LEFT(CONCAT(@rkod, N' ', @kod, CASE WHEN @yon = 1 THEN N' (Yönetici, uygulandı)' ELSE N'' END), 400));
    COMMIT TRANSACTION;
    SELECT @id AS id, @rkod AS kod, durum FROM gorev.revize_talepleri WHERE id = @id;
END;
GO

-- 2) Talep iletişim + saha notu görünürlüğü.
-- Saha notu: Yönetici, talebin Sorumlusu ve talebe atanmış kişi. Sorumlu telefonu: Yönetici (atamadan önce de), Sorumlu (kendisi), atanmış kişi.
-- Atananların telefonları: yalnız aktif atama varken Yönetici ve talebin Sorumlusu.
CREATE PROCEDURE gorev.sp_talep_iletisim
    @talep_id INT
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    IF gorev.fn_kayitli_mi() = 0 THROW 50023, N'Bu işlem için yetkiniz yok.', 1;
    DECLARE @ben NVARCHAR(50) = gorev.fn_ben_sicil(), @yon BIT = gorev.fn_yonetici_mi();
    DECLARE @sorumlu NVARCHAR(50) = (SELECT sorumlu_sicil_no FROM gorev.talepler WHERE id = @talep_id);
    IF @sorumlu IS NULL THROW 50024, N'Talep bulunamadı.', 1;
    DECLARE @sahip BIT = CASE WHEN @ben = @sorumlu THEN 1 ELSE 0 END;
    DECLARE @atanan BIT = CASE WHEN @ben IS NOT NULL AND EXISTS (SELECT 1 FROM gorev.atamalar WHERE talep_id = @talep_id AND sicil_no = @ben AND durum = 'AKTIF') THEN 1 ELSE 0 END;
    IF @yon = 0 AND @sahip = 0 AND @atanan = 0 THROW 50023, N'Bu talebin bilgilerini görme yetkiniz yok.', 1;
    DECLARE @atamali BIT = CASE WHEN EXISTS (SELECT 1 FROM gorev.atamalar WHERE talep_id = @talep_id AND durum = 'AKTIF') THEN 1 ELSE 0 END;
    SELECT t.id AS talep_id, t.kod, t.nitelik AS saha_notu, s.adi_soyadi AS sorumlu_adi, s.gsm_no AS sorumlu_gsm,
           CASE WHEN @atamali = 1 AND (@yon = 1 OR @sahip = 1) THEN
                (SELECT x.sicil_no AS sicil, x.adi_soyadi AS ad, x.gsm_no AS gsm, x.bolum
                 FROM gorev.personel x WHERE x.sicil_no IN (SELECT a.sicil_no FROM gorev.atamalar a WHERE a.talep_id = @talep_id AND a.durum = 'AKTIF')
                 ORDER BY x.adi_soyadi FOR JSON PATH) END AS atananlar_json
    FROM gorev.talepler t JOIN gorev.personel s ON s.sicil_no = t.sorumlu_sicil_no
    WHERE t.id = @talep_id;
END;
GO

-- 4) İkame uyarıları: aktif, bugünden sonraki atamalar; kişi raporlu / ayrılmış-pasif / birim eşleştirmesi (ve istisnası) yok.
CREATE FUNCTION gorev.fn_ikame_bekleyenler ()
RETURNS TABLE
AS
RETURN
    SELECT a.talep_id, t.kod, t.sorumlu_sicil_no, a.sicil_no, p.adi_soyadi, x.neden,
           MIN(a.tarih) AS ilk_tarih, MAX(a.tarih) AS son_tarih, COUNT(*) AS gun
    FROM gorev.atamalar a
    JOIN gorev.talepler t ON t.id = a.talep_id
    JOIN gorev.personel p ON p.sicil_no = a.sicil_no
    CROSS APPLY (SELECT CASE
            WHEN EXISTS (SELECT 1 FROM gorev.raporlar r WHERE r.sicil_no = a.sicil_no AND r.durum = 'AKTIF' AND a.tarih BETWEEN r.ilk_tarih AND r.son_tarih) THEN 'RAPOR'
            WHEN p.aktif = 0 OR (p.ayrilis_tarihi IS NOT NULL AND p.ayrilis_tarihi <= a.tarih) THEN 'AYRILDI'
            WHEN NOT EXISTS (SELECT 1 FROM gorev.rol_bolum_eslestirme e WHERE e.bolum = p.bolum)
                 AND NOT EXISTS (SELECT 1 FROM gorev.kullanici_yetki_istisna i WHERE i.sicil_no = p.sicil_no AND i.aktif = 1) THEN 'BIRIM'
            END AS neden) x
    WHERE a.durum = 'AKTIF' AND a.tarih >= CAST(SYSDATETIME() AS DATE) AND t.durum IN ('KISMEN_ATANDI', 'TAMAMEN_ATANDI') AND x.neden IS NOT NULL
    GROUP BY a.talep_id, t.kod, t.sorumlu_sicil_no, a.sicil_no, p.adi_soyadi, x.neden;
GO

CREATE PROCEDURE gorev.sp_ikame_bekleyenler
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @yon BIT = gorev.fn_yonetici_mi(), @ben NVARCHAR(50) = gorev.fn_ben_sicil();
    IF @yon = 0 AND gorev.fn_sorumlu_mu() = 0 THROW 50023, N'Bu işlem için yetkiniz yok.', 1;
    SELECT f.talep_id, f.kod, f.sicil_no, f.adi_soyadi, f.neden, CONVERT(CHAR(10), f.ilk_tarih, 23) AS ilk_tarih, CONVERT(CHAR(10), f.son_tarih, 23) AS son_tarih, f.gun,
           s.adi_soyadi AS sorumlu
    FROM gorev.fn_ikame_bekleyenler() f JOIN gorev.personel s ON s.sicil_no = f.sorumlu_sicil_no
    WHERE @yon = 1 OR f.sorumlu_sicil_no = ISNULL(@ben, N'?')
    ORDER BY f.ilk_tarih, f.adi_soyadi;
END;
GO

-- 3) Rozet sayaçları (30 sn'de bir çağrılır; yalnız sayı döner).
CREATE PROCEDURE gorev.sp_sayaclar
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    IF gorev.fn_kayitli_mi() = 0 THROW 50023, N'Bu işlem için yetkiniz yok.', 1;
    DECLARE @ben NVARCHAR(50) = ISNULL(gorev.fn_ben_sicil(), N'?'), @yon BIT = gorev.fn_yonetici_mi(), @sor BIT = gorev.fn_sorumlu_mu();
    SELECT
        CASE WHEN @yon = 1 THEN (SELECT COUNT(*) FROM gorev.talepler WHERE durum = 'ONAY_BEKLIYOR') END AS bekleyen_talep,
        CASE WHEN @yon = 1 THEN (SELECT COUNT(*) FROM gorev.izin_talepleri WHERE durum = 'ONAY_BEKLIYOR') END AS izin_onay,
        CASE WHEN @yon = 1 THEN (SELECT COUNT(*) FROM gorev.revize_talepleri WHERE durum = 'BEKLIYOR')
             WHEN @sor = 1 THEN (SELECT COUNT(*) FROM gorev.revize_talepleri r JOIN gorev.talepler t ON t.id = r.talep_id WHERE r.durum = 'BEKLIYOR' AND t.sorumlu_sicil_no = @ben) END AS revize_bekleyen,
        CASE WHEN @yon = 1 THEN (SELECT COUNT(*) FROM gorev.fn_ikame_bekleyenler())
             WHEN @sor = 1 THEN (SELECT COUNT(*) FROM gorev.fn_ikame_bekleyenler() WHERE sorumlu_sicil_no = @ben) END AS ikame_uyari,
        CASE WHEN @sor = 1 THEN (SELECT COUNT(*) FROM gorev.bildirimler WHERE sicil_no = @ben AND okundu = 0 AND tur = 'ATANDI') END AS onaylanan,
        CASE WHEN @sor = 1 THEN (SELECT COUNT(*) FROM gorev.bildirimler WHERE sicil_no = @ben AND okundu = 0 AND tur = 'REDDEDILDI') END AS reddedilen,
        (SELECT COUNT(*) FROM gorev.bildirimler WHERE sicil_no = @ben AND okundu = 0) AS bildirim;
END;
GO

-- 5) Analiz (personel): + musait_gun (yalnız Yönetici), tatil_gun, tatil_calisma_gun. Birim 0,5 gün (ÖÖ/ÖS dilimi).
-- Müsait: iş günü (Pzt–Cum), tatil değil, rapor/izin/görev yok. Çalışılmayan tatil dilimi müsaitten düşülür; tatilde görev varsa görev günü + tatil çalışması sayılır.
CREATE OR ALTER PROCEDURE gorev.sp_analiz_personel
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
    CREATE TABLE #g (sicil_no NVARCHAR(50) COLLATE DATABASE_DEFAULT NOT NULL, tarih DATE NOT NULL, zaman VARCHAR(3) COLLATE DATABASE_DEFAULT NOT NULL, agirlik DECIMAL(3,1) NOT NULL, ana NVARCHAR(200) COLLATE DATABASE_DEFAULT NOT NULL);
    INSERT INTO #g (sicil_no, tarih, zaman, agirlik, ana)
    SELECT a.sicil_no, a.tarih, a.zaman_dilimi, CASE a.zaman_dilimi WHEN 'TAM' THEN 1.0 ELSE 0.5 END, h1.ad
    FROM gorev.atamalar a
    JOIN gorev.talepler t ON t.id = a.talep_id
    JOIN gorev.proje_havuzu h4 ON h4.id = t.havuz_id
    JOIN gorev.proje_havuzu h3 ON h3.id = h4.ust_id
    JOIN gorev.proje_havuzu h2 ON h2.id = h3.ust_id
    JOIN gorev.proje_havuzu h1 ON h1.id = h2.ust_id
    WHERE a.durum = 'AKTIF' AND a.tarih BETWEEN @bas AND @bit AND (@yon = 1 OR t.sorumlu_sicil_no = ISNULL(@ben, N'?'));

    -- dönemin günleri, tatil dilimleri, izin/rapor günleri
    CREATE TABLE #d (tarih DATE NOT NULL PRIMARY KEY, hafta_sonu BIT NOT NULL);
    INSERT INTO #d (tarih, hafta_sonu)
    SELECT x.t, CASE WHEN DATEDIFF(DAY, '19000101', x.t) % 7 >= 5 THEN 1 ELSE 0 END
    FROM (SELECT TOP (DATEDIFF(DAY, @bas, @bit) + 1) DATEADD(DAY, ROW_NUMBER() OVER (ORDER BY (SELECT 1)) - 1, @bas) AS t FROM sys.all_objects a CROSS JOIN sys.all_objects b) x;
    CREATE TABLE #t (tarih DATE NOT NULL, zaman VARCHAR(2) COLLATE DATABASE_DEFAULT NOT NULL, PRIMARY KEY (tarih, zaman));
    INSERT INTO #t (tarih, zaman)
    SELECT DISTINCT d.tarih, z.zaman FROM gorev.takvim_tatil k JOIN #d d ON d.tarih BETWEEN k.baslangic AND k.bitis
    JOIN (VALUES ('OO'), ('OS')) z (zaman) ON k.zaman_dilimi = 'TAM' OR k.zaman_dilimi = z.zaman;
    CREATE TABLE #p (sicil_no NVARCHAR(50) COLLATE DATABASE_DEFAULT NOT NULL PRIMARY KEY);
    INSERT INTO #p (sicil_no)
    SELECT p.sicil_no FROM gorev.personel p
    WHERE (@bolum IS NULL OR p.bolum = @bolum) AND (@q IS NULL OR p.adi_soyadi LIKE N'%' + @q + N'%' OR p.sicil_no LIKE @q + N'%')
      AND (EXISTS (SELECT 1 FROM #g g WHERE g.sicil_no = p.sicil_no)
           OR (@yon = 1 AND (EXISTS (SELECT 1 FROM gorev.izin_gunleri d JOIN gorev.izin_talepleri i ON i.id = d.izin_id WHERE i.sicil_no = p.sicil_no AND d.durum = 'ONAYLI' AND d.tarih BETWEEN @bas AND @bit)
                             OR EXISTS (SELECT 1 FROM gorev.raporlar r WHERE r.sicil_no = p.sicil_no AND r.durum = 'AKTIF' AND r.ilk_tarih <= @bit AND r.son_tarih >= @bas))));
    CREATE TABLE #ig (sicil_no NVARCHAR(50) COLLATE DATABASE_DEFAULT NOT NULL, tarih DATE NOT NULL, zaman VARCHAR(3) COLLATE DATABASE_DEFAULT NOT NULL);
    INSERT INTO #ig (sicil_no, tarih, zaman)
    SELECT i.sicil_no, d.tarih, d.zaman_dilimi FROM gorev.izin_gunleri d JOIN gorev.izin_talepleri i ON i.id = d.izin_id
    WHERE d.durum = 'ONAYLI' AND d.tarih BETWEEN @bas AND @bit AND i.sicil_no IN (SELECT sicil_no FROM #p);
    CREATE TABLE #rg (sicil_no NVARCHAR(50) COLLATE DATABASE_DEFAULT NOT NULL, tarih DATE NOT NULL, PRIMARY KEY (sicil_no, tarih));
    INSERT INTO #rg (sicil_no, tarih)
    SELECT DISTINCT r.sicil_no, d.tarih FROM gorev.raporlar r JOIN #d d ON d.tarih BETWEEN r.ilk_tarih AND r.son_tarih
    WHERE r.durum = 'AKTIF' AND r.sicil_no IN (SELECT sicil_no FROM #p);

    CREATE TABLE #s (sicil_no NVARCHAR(50) COLLATE DATABASE_DEFAULT NOT NULL PRIMARY KEY, musait DECIMAL(9,1) NOT NULL, tatil DECIMAL(9,1) NOT NULL, tatil_calisma DECIMAL(9,1) NOT NULL);
    INSERT INTO #s (sicil_no, musait, tatil, tatil_calisma)
    SELECT p.sicil_no,
           CAST(0.5 * SUM(CASE WHEN k.rapor = 0 AND k.izin = 0 AND k.gorev = 0 AND k.tatil = 0 AND d.hafta_sonu = 0 THEN 1 ELSE 0 END) AS DECIMAL(9,1)),
           CAST(0.5 * SUM(CASE WHEN k.tatil = 1 AND k.rapor = 0 AND k.izin = 0 THEN 1 ELSE 0 END) AS DECIMAL(9,1)),
           CAST(0.5 * SUM(CASE WHEN k.tatil = 1 AND k.gorev = 1 AND k.rapor = 0 AND k.izin = 0 THEN 1 ELSE 0 END) AS DECIMAL(9,1))
    FROM #p p CROSS JOIN #d d CROSS JOIN (VALUES ('OO'), ('OS')) z (zaman)
    CROSS APPLY (SELECT
        CASE WHEN EXISTS (SELECT 1 FROM #rg r WHERE r.sicil_no = p.sicil_no AND r.tarih = d.tarih) THEN 1 ELSE 0 END AS rapor,
        CASE WHEN EXISTS (SELECT 1 FROM #ig i WHERE i.sicil_no = p.sicil_no AND i.tarih = d.tarih AND (i.zaman = 'TAM' OR i.zaman = z.zaman)) THEN 1 ELSE 0 END AS izin,
        CASE WHEN EXISTS (SELECT 1 FROM #g g WHERE g.sicil_no = p.sicil_no AND g.tarih = d.tarih AND (g.zaman = 'TAM' OR g.zaman = z.zaman)) THEN 1 ELSE 0 END AS gorev,
        CASE WHEN EXISTS (SELECT 1 FROM #t t WHERE t.tarih = d.tarih AND t.zaman = z.zaman) THEN 1 ELSE 0 END AS tatil) k
    GROUP BY p.sicil_no;

    SELECT p.sicil_no, p.adi_soyadi, p.bolum,
           CAST(ISNULL(g.adam_gun, 0) AS DECIMAL(9,1)) AS adam_gun, ISNULL(g.gun, 0) AS gun, ISNULL(g.proje, 0) AS proje,
           CASE WHEN @yon = 1 THEN CAST(ISNULL(iz.n, 0) AS DECIMAL(9,1)) END AS izin_gun,
           CASE WHEN @yon = 1 THEN ISNULL(rp.n, 0) END AS rapor_gun,
           (SELECT x.ana, CAST(SUM(x.agirlik) AS DECIMAL(9,1)) AS adam_gun FROM #g x WHERE x.sicil_no = p.sicil_no GROUP BY x.ana ORDER BY SUM(x.agirlik) DESC FOR JSON PATH) AS projeler_json,
           CASE WHEN @yon = 1 THEN s.musait END AS musait_gun, s.tatil AS tatil_gun, s.tatil_calisma AS tatil_calisma_gun
    FROM gorev.personel p
    JOIN #p pp ON pp.sicil_no = p.sicil_no
    LEFT JOIN #s s ON s.sicil_no = p.sicil_no
    OUTER APPLY (SELECT SUM(agirlik) AS adam_gun, COUNT(DISTINCT tarih) AS gun, COUNT(DISTINCT ana) AS proje FROM #g WHERE sicil_no = p.sicil_no) g
    OUTER APPLY (SELECT SUM(CASE d.zaman_dilimi WHEN 'TAM' THEN 1.0 ELSE 0.5 END) AS n FROM gorev.izin_gunleri d JOIN gorev.izin_talepleri i ON i.id = d.izin_id
                 WHERE i.sicil_no = p.sicil_no AND d.durum = 'ONAYLI' AND d.tarih BETWEEN @bas AND @bit) iz
    OUTER APPLY (SELECT SUM(DATEDIFF(DAY, CASE WHEN r.ilk_tarih > @bas THEN r.ilk_tarih ELSE @bas END, CASE WHEN r.son_tarih < @bit THEN r.son_tarih ELSE @bit END) + 1) AS n
                 FROM gorev.raporlar r WHERE r.sicil_no = p.sicil_no AND r.durum = 'AKTIF' AND r.ilk_tarih <= @bit AND r.son_tarih >= @bas) rp
    ORDER BY ISNULL(g.adam_gun, 0) DESC, p.adi_soyadi;
END;
GO

-- 6) Tavsiye listesi: mevcut sütunlar korunur (sıra aynı); sonuna toplam görev, adam-gün, yerleşkeler, talep günlerindeki müsaitlik eklenir.
CREATE OR ALTER PROCEDURE gorev.sp_atama_adaylar
    @talep_id INT,
    @q NVARCHAR(100) = NULL
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    IF gorev.fn_yonetici_mi() = 0 THROW 50023, N'Atama yalnız Merkez Yönetici tarafından yapılır.', 1;
    DECLARE @havuz INT = (SELECT havuz_id FROM gorev.talepler WHERE id = @talep_id);
    IF @havuz IS NULL THROW 50024, N'Talep bulunamadı.', 1;
    DECLARE @ana INT = gorev.fn_havuz_ana(@havuz);
    SET @q = LTRIM(RTRIM(ISNULL(@q, N'')));
    SELECT TOP (60) p.sicil_no, p.adi_soyadi, p.bolum,
        CAST(CASE WHEN EXISTS (SELECT 1 FROM gorev.talep_oneri o WHERE o.talep_id = @talep_id AND o.sicil_no = p.sicil_no) THEN 1 ELSE 0 END AS BIT) AS onerildi,
        (SELECT COUNT(DISTINCT a.tarih) FROM gorev.atamalar a JOIN gorev.talepler t2 ON t2.id = a.talep_id
          WHERE a.sicil_no = p.sicil_no AND a.durum = 'AKTIF' AND a.talep_id <> @talep_id AND gorev.fn_havuz_ana(t2.havuz_id) = @ana)
        + (SELECT COUNT(*) FROM gorev.gecmis_gorev gg WHERE gg.sicil_no = p.sicil_no AND gg.havuz_id IS NOT NULL AND gorev.fn_havuz_ana(gg.havuz_id) = @ana) AS gecmis,
        (SELECT COUNT(*) FROM gorev.atamalar a WHERE a.talep_id = @talep_id AND a.sicil_no = p.sicil_no AND a.durum = 'AKTIF') AS bu_talepte,
        (SELECT COUNT(DISTINCT g.tarih) FROM gorev.talep_gunleri g
          JOIN gorev.atamalar a ON a.sicil_no = p.sicil_no AND a.tarih = g.tarih AND a.durum = 'AKTIF' AND a.talep_id <> @talep_id
               AND (a.zaman_dilimi = 'TAM' OR g.zaman_dilimi = 'TAM' OR a.zaman_dilimi = g.zaman_dilimi)
          WHERE g.talep_id = @talep_id) AS cakisan_gun,
        (SELECT COUNT(DISTINCT a.talep_id) FROM gorev.atamalar a JOIN gorev.talepler t2 ON t2.id = a.talep_id
          WHERE a.sicil_no = p.sicil_no AND a.durum = 'AKTIF' AND a.talep_id <> @talep_id AND gorev.fn_havuz_ana(t2.havuz_id) = @ana) AS toplam_gorev,
        CAST((SELECT ISNULL(SUM(CASE a.zaman_dilimi WHEN 'TAM' THEN 1.0 ELSE 0.5 END), 0) FROM gorev.atamalar a JOIN gorev.talepler t2 ON t2.id = a.talep_id
          WHERE a.sicil_no = p.sicil_no AND a.durum = 'AKTIF' AND a.talep_id <> @talep_id AND gorev.fn_havuz_ana(t2.havuz_id) = @ana) AS DECIMAL(9,1)) AS adam_gun,
        STUFF((SELECT DISTINCT N', ' + h4.ad FROM gorev.atamalar a JOIN gorev.talepler t2 ON t2.id = a.talep_id JOIN gorev.proje_havuzu h4 ON h4.id = t2.havuz_id
          WHERE a.sicil_no = p.sicil_no AND a.durum = 'AKTIF' AND a.talep_id <> @talep_id AND gorev.fn_havuz_ana(t2.havuz_id) = @ana FOR XML PATH(N''), TYPE).value('.', 'NVARCHAR(MAX)'), 1, 2, N'') AS yerlesker,
        (SELECT COUNT(DISTINCT g.tarih) FROM gorev.talep_gunleri g WHERE g.talep_id = @talep_id) AS talep_gun,
        (SELECT COUNT(DISTINCT g.tarih) FROM gorev.talep_gunleri g WHERE g.talep_id = @talep_id
           AND (EXISTS (SELECT 1 FROM gorev.izin_gunleri d JOIN gorev.izin_talepleri i ON i.id = d.izin_id WHERE i.sicil_no = p.sicil_no AND d.durum IN ('BEKLIYOR','ONAYLI') AND d.tarih = g.tarih)
                OR EXISTS (SELECT 1 FROM gorev.raporlar r WHERE r.sicil_no = p.sicil_no AND r.durum = 'AKTIF' AND g.tarih BETWEEN r.ilk_tarih AND r.son_tarih))) AS izin_rapor_gun
    FROM gorev.personel p
    WHERE p.aktif = 1 AND (LEN(@q) = 0 OR CHARINDEX(@q, p.adi_soyadi) > 0)
    ORDER BY 4 DESC, 5 DESC, 7 ASC, p.adi_soyadi;
END;
GO

-- 8) Rapor evrakı indirme adı standardı: PersonelAdi_Tarih_RaporKodu.uzanti (senaryo; evrak veritabanında kalır).
CREATE OR ALTER PROCEDURE gorev.sp_rapor_evrak
    @id INT
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @yon BIT = gorev.fn_yonetici_mi(), @ben NVARCHAR(50) = gorev.fn_ben_sicil();
    IF gorev.fn_kayitli_mi() = 0 THROW 50023, N'Bu işlem için yetkiniz yok.', 1;
    IF NOT EXISTS (SELECT 1 FROM gorev.raporlar WHERE id = @id AND (@yon = 1 OR sicil_no = ISNULL(@ben, N'?'))) THROW 50023, N'Bu rapor evrakını görme yetkiniz yok.', 1;
    SELECT r.evrak, r.evrak_adi, r.evrak_tur,
           REPLACE(REPLACE(REPLACE(p.adi_soyadi, N' ', N'_'), N'/', N'-'), N'\', N'-') + N'_' + CONVERT(CHAR(8), r.ilk_tarih, 112) + N'_' + r.kod
             + CASE WHEN CHARINDEX(N'.', r.evrak_adi) > 0 THEN RIGHT(r.evrak_adi, CHARINDEX(N'.', REVERSE(r.evrak_adi))) ELSE N'' END AS standart_ad
    FROM gorev.raporlar r JOIN gorev.personel p ON p.sicil_no = r.sicil_no WHERE r.id = @id;
END;
GO

-- 7) Haftalık matris: yerleşke (konum) süzgeci.
ALTER PROCEDURE gorev.sp_matris_hafta
    @bas DATE,
    @bolum NVARCHAR(500) = NULL,
    @ana NVARCHAR(200) = NULL,
    @q NVARCHAR(100) = NULL,
    @sadece_gorevli BIT = 1,
    @konum NVARCHAR(200) = NULL
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
    SET @konum = NULLIF(LTRIM(RTRIM(ISNULL(@konum, N''))), N'');
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
    WHERE a.durum = 'AKTIF' AND a.tarih BETWEEN @bas AND @bit AND (@ana IS NULL OR h1.ad = @ana) AND (@konum IS NULL OR h4.ad = @konum);

    CREATE TABLE #i (sicil_no NVARCHAR(50) COLLATE DATABASE_DEFAULT NOT NULL, tarih DATE NOT NULL, zaman VARCHAR(3) COLLATE DATABASE_DEFAULT NOT NULL,
                     tur VARCHAR(5) COLLATE DATABASE_DEFAULT NOT NULL, durum VARCHAR(10) COLLATE DATABASE_DEFAULT NOT NULL, kod NVARCHAR(20) COLLATE DATABASE_DEFAULT NOT NULL);
    INSERT #i (sicil_no, tarih, zaman, tur, durum, kod)
    SELECT t.sicil_no, g.tarih, g.zaman_dilimi, 'IZIN', g.durum, t.kod
    FROM gorev.izin_gunleri g JOIN gorev.izin_talepleri t ON t.id = g.izin_id WHERE g.durum IN ('BEKLIYOR','ONAYLI') AND g.tarih BETWEEN @bas AND @bit;
    INSERT #i (sicil_no, tarih, zaman, tur, durum, kod)
    SELECT r.sicil_no, DATEADD(DAY, n.n, @bas), 'TAM', 'RAPOR', 'ONAYLI', r.kod
    FROM gorev.raporlar r CROSS JOIN (VALUES (0),(1),(2),(3),(4),(5),(6)) n(n)
    WHERE r.durum = 'AKTIF' AND DATEADD(DAY, n.n, @bas) BETWEEN r.ilk_tarih AND r.son_tarih;

    SELECT TOP (1000) p.sicil_no, p.adi_soyadi, p.bolum,
        (SELECT CONVERT(CHAR(10), c.tarih, 23) AS tarih, c.zaman, c.talep_id AS talepId, c.kod, c.ana, c.alt, c.faaliyet, c.konum, c.saat, c.sorumlu
         FROM #h c WHERE c.sicil_no = p.sicil_no ORDER BY c.tarih, c.zaman FOR JSON PATH) AS hucreler_json,
        (SELECT CONVERT(CHAR(10), c.tarih, 23) AS tarih, c.zaman, c.tur, c.durum, c.kod
         FROM #i c WHERE c.sicil_no = p.sicil_no ORDER BY c.tarih, c.zaman FOR JSON PATH) AS izinler_json
    FROM gorev.personel p
    WHERE (p.aktif = 1 OR EXISTS (SELECT 1 FROM #h c WHERE c.sicil_no = p.sicil_no) OR EXISTS (SELECT 1 FROM #i c WHERE c.sicil_no = p.sicil_no))
      AND (@bolum IS NULL OR p.bolum = @bolum)
      AND (LEN(@q) = 0 OR CHARINDEX(@q, p.adi_soyadi) > 0)
      AND ((@sadece_gorevli = 0 AND @ana IS NULL AND @konum IS NULL) OR EXISTS (SELECT 1 FROM #h c WHERE c.sicil_no = p.sicil_no)
           OR (@ana IS NULL AND @konum IS NULL AND EXISTS (SELECT 1 FROM #i c WHERE c.sicil_no = p.sicil_no)))
    ORDER BY p.adi_soyadi;
END;
GO

INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti) VALUES (N'SEMA', N'sema_surumleri', N'13', N'013_senaryo_tamamlama.sql uygulandı');
GO
