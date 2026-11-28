-- 026: Süre uzatma sonrası mevcut atananlar eklenen günlere otomatik atanır (Dilim 32).
-- sp_revize_uygula: yeni eklenen talep günleri için görevde aktif atamalı kişiler atanır; izin/rapor, başka görevde atama ve kapasite
-- nedeniyle atlananlar sayılır ve @ozet çıktısında bildirilir (kimse başka görevden çıkarılmaz). sp_revize_iste özeti 'uyari' olarak döner.
-- Sınanmadı (SQL Server gerekir): RevizeTests.
CREATE OR ALTER PROCEDURE gorev.sp_revize_uygula
    @id INT,
    @ozet NVARCHAR(500) = NULL OUTPUT
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
        CREATE TABLE #yeni (tarih DATE NOT NULL, zaman VARCHAR(3) COLLATE DATABASE_DEFAULT NOT NULL);
        INSERT INTO #yeni (tarih, zaman)
        SELECT y.tarih, y.zaman FROM #y y WHERE NOT EXISTS (SELECT 1 FROM gorev.talep_gunleri g WHERE g.talep_id = @talep AND g.tarih = y.tarih AND g.zaman_dilimi = y.zaman);
        INSERT INTO gorev.talep_gunleri (talep_id, tarih, zaman_dilimi, kisi_sayisi)
        SELECT @talep, y.tarih, y.zaman, y.kisi FROM #y y WHERE NOT EXISTS (SELECT 1 FROM gorev.talep_gunleri g WHERE g.talep_id = @talep AND g.tarih = y.tarih AND g.zaman_dilimi = y.zaman);
        UPDATE gorev.talepler SET ilk_tarih = (SELECT MIN(tarih) FROM #y), son_tarih = (SELECT MAX(tarih) FROM #y) WHERE id = @talep;

        -- Süre uzatma: görevde zaten aktif atamalı kişiler eklenen günlere otomatik atanır (atlananlar özette bildirilir).
        -- Atlama nedenleri: onaylı izin / aktif rapor, başka görevde aktif atama (kimse görevinden çıkarılmaz), gün kapasitesi.
        IF EXISTS (SELECT 1 FROM #yeni)
        BEGIN
            CREATE TABLE #kisi (sicil NVARCHAR(50) COLLATE DATABASE_DEFAULT NOT NULL PRIMARY KEY);
            INSERT INTO #kisi (sicil)
            SELECT DISTINCT a.sicil_no FROM gorev.atamalar a JOIN gorev.personel p ON p.sicil_no = a.sicil_no AND p.aktif = 1
            WHERE a.talep_id = @talep AND a.durum = 'AKTIF';
            CREATE TABLE #adayuz (sicil NVARCHAR(50) COLLATE DATABASE_DEFAULT NOT NULL, tarih DATE NOT NULL, zaman VARCHAR(3) COLLATE DATABASE_DEFAULT NOT NULL, sira INT NULL);
            INSERT INTO #adayuz (sicil, tarih, zaman)
            SELECT k.sicil, n.tarih, n.zaman FROM #kisi k CROSS JOIN #yeni n;
            DECLARE @aday INT = (SELECT COUNT(*) FROM #adayuz), @eklenen INT = 0;
            DELETE d FROM #adayuz d WHERE EXISTS (
                SELECT 1 FROM gorev.izin_talepleri it
                JOIN gorev.izin_gunleri ig ON ig.izin_id = it.id AND ig.tarih = d.tarih AND ig.durum = 'ONAYLI'
                     AND (ig.zaman_dilimi = 'TAM' OR d.zaman = 'TAM' OR ig.zaman_dilimi = d.zaman)
                WHERE it.sicil_no = d.sicil AND it.durum = 'ONAYLANDI')
              OR EXISTS (SELECT 1 FROM gorev.raporlar r WHERE r.sicil_no = d.sicil AND r.durum = 'AKTIF' AND d.tarih BETWEEN r.ilk_tarih AND r.son_tarih)
              OR EXISTS (SELECT 1 FROM gorev.atamalar a2 WHERE a2.sicil_no = d.sicil AND a2.tarih = d.tarih AND a2.durum = 'AKTIF' AND a2.talep_id <> @talep
                         AND (a2.zaman_dilimi = 'TAM' OR d.zaman = 'TAM' OR a2.zaman_dilimi = d.zaman));
            UPDATE d SET sira = s.rn FROM #adayuz d
            JOIN (SELECT sicil, tarih, zaman, ROW_NUMBER() OVER (PARTITION BY tarih, zaman ORDER BY sicil) AS rn FROM #adayuz) s
              ON s.sicil = d.sicil AND s.tarih = d.tarih AND s.zaman = d.zaman;
            INSERT INTO gorev.atamalar (talep_id, sicil_no, tarih, zaman_dilimi)
            SELECT @talep, d.sicil, d.tarih, d.zaman FROM #adayuz d
            JOIN gorev.talep_gunleri g ON g.talep_id = @talep AND g.tarih = d.tarih AND g.zaman_dilimi = d.zaman
            WHERE d.sira <= g.kisi_sayisi;
            SET @eklenen = @@ROWCOUNT;
            IF @eklenen > 0
                INSERT INTO gorev.bildirimler (sicil_no, tur, mesaj, talep_id)
                SELECT DISTINCT a.sicil_no, 'GOREV_UZATILDI', LEFT(@tkod + N' görevi uzatıldı; yeni günlere atandınız.', 500), @talep
                FROM gorev.atamalar a JOIN #yeni n ON n.tarih = a.tarih AND n.zaman = a.zaman_dilimi
                WHERE a.talep_id = @talep AND a.durum = 'AKTIF';
            SET @ozet = CASE WHEN @aday = 0 THEN NULL
                             ELSE CONCAT(@eklenen, N' atama yeni günlere otomatik yapıldı',
                                         CASE WHEN @aday > @eklenen THEN CONCAT(N'; ', @aday - @eklenen, N' atama yapılamadı (izin/rapor, başka görev ya da kapasite): Görevi yönet''ten elle atayın') ELSE N'' END, N'.') END;
            INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti)
            VALUES (N'REVIZE_OTO_ATAMA', N'talepler', CAST(@talep AS NVARCHAR(60)), LEFT(CONCAT(@tkod, N' aday=', @aday, N' atanan=', @eklenen), 400));
        END;
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
    DECLARE @ozet NVARCHAR(500) = NULL;
    IF @yon = 1
        EXEC gorev.sp_revize_uygula @id, @ozet OUTPUT;
    ELSE
        INSERT INTO gorev.bildirimler (sicil_no, tur, mesaj, talep_id) SELECT sicil_no, 'REVIZE_TALEP', LEFT(@kod + N' için revize istendi (' + @rkod + N').', 500), @talep_id FROM gorev.fn_yonetici_sicilleri();
    INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti) VALUES (N'REVIZE_ISTE', N'revize_talepleri', CAST(@id AS NVARCHAR(60)), LEFT(CONCAT(@rkod, N' ', @kod, CASE WHEN @yon = 1 THEN N' (Yönetici, uygulandı)' ELSE N'' END), 400));
    COMMIT TRANSACTION;
    SELECT @id AS id, @rkod AS kod, durum, @ozet AS uyari FROM gorev.revize_talepleri WHERE id = @id;
END;
GO

INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti) VALUES (N'SEMA', N'sema_surumleri', N'26', N'Süre uzatmada mevcut atananlar yeni günlere otomatik atanır');
GO
