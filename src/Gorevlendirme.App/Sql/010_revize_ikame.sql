-- Dilim 8: görev iptali, erken bitiş, atamadan çıkarma, ikame (personel değiştirme), revize talebi, sorumlu devri.
-- Yalnız gorev şeması. Yazma EXECUTE AS OWNER yordamlarla. Atama kuralları (çakışma kararı, izin/rapor tetikleyicisi) sp_atama_onayla üzerinden aynen işler.

CREATE TABLE gorev.sorumlu_devir (
    id             INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_sorumlu_devir PRIMARY KEY,
    talep_id       INT NOT NULL CONSTRAINT FK_sorumlu_devir_talep REFERENCES gorev.talepler (id),
    eski_sicil     NVARCHAR(50) NOT NULL CONSTRAINT FK_sorumlu_devir_eski REFERENCES gorev.personel (sicil_no),
    yeni_sicil     NVARCHAR(50) NOT NULL CONSTRAINT FK_sorumlu_devir_yeni REFERENCES gorev.personel (sicil_no),
    neden          NVARCHAR(300) NULL,
    devreden_hesap NVARCHAR(256) NOT NULL CONSTRAINT DF_sorumlu_devir_hesap DEFAULT ORIGINAL_LOGIN(),
    tarih          DATETIME2(0) NOT NULL CONSTRAINT DF_sorumlu_devir_tarih DEFAULT SYSDATETIME()
);
GO

-- Onaylanmış (atama başlamış) talepte değişiklik isteği. NULL alan = değişmez. gunler_json: [{tarih, zaman, kisi}] (tam yeni gün listesi).
CREATE TABLE gorev.revize_talepleri (
    id               INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_revize_talepleri PRIMARY KEY,
    kod              AS (N'REV-' + RIGHT(N'0000' + CAST(id AS NVARCHAR(10)), 4)),
    talep_id         INT NOT NULL CONSTRAINT FK_revize_talep REFERENCES gorev.talepler (id),
    isteyen_sicil    NVARCHAR(50) NULL CONSTRAINT FK_revize_isteyen REFERENCES gorev.personel (sicil_no),
    isteyen_hesap    NVARCHAR(256) NOT NULL CONSTRAINT DF_revize_hesap DEFAULT ORIGINAL_LOGIN(),
    durum            VARCHAR(15) NOT NULL CONSTRAINT DF_revize_durum DEFAULT 'BEKLIYOR',
    gorev_metni      NVARCHAR(1000) NULL,
    nitelik          NVARCHAR(300) NULL,
    saat_baslangic   TIME(0) NULL,
    saat_bitis       TIME(0) NULL,
    gunler_json      NVARCHAR(MAX) NULL,
    neden            NVARCHAR(300) NULL,
    olusturma        DATETIME2(0) NOT NULL CONSTRAINT DF_revize_olusturma DEFAULT SYSDATETIME(),
    karar_hesap      NVARCHAR(256) NULL,
    karar_tarihi     DATETIME2(0) NULL,
    ret_nedeni       NVARCHAR(300) NULL,
    CONSTRAINT CK_revize_durum CHECK (durum IN ('BEKLIYOR','ONAYLANDI','REDDEDILDI','GERI_CEKILDI'))
);
GO

CREATE UNIQUE INDEX UX_revize_bekleyen ON gorev.revize_talepleri (talep_id) WHERE durum = 'BEKLIYOR';
GO

-- Görev iptali: atama başlamış talep (KISMEN/TAMAMEN_ATANDI). Başlamış (geçmiş günü AKTIF atamalı) görev iptal edilmez; "erken bitir" kullanılır.
CREATE PROCEDURE gorev.sp_talep_iptal
    @id    INT,
    @neden NVARCHAR(300)
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    DECLARE @yon BIT = gorev.fn_yonetici_mi(), @ben NVARCHAR(50) = gorev.fn_ben_sicil();
    IF @yon = 0 AND gorev.fn_sorumlu_mu() = 0 THROW 50023, N'Bu işlem için yetkiniz yok.', 1;
    SET @neden = LTRIM(RTRIM(ISNULL(@neden, N'')));
    IF LEN(@neden) < 3 THROW 50024, N'İptal nedeni en az 3 karakter olmalı.', 1;
    BEGIN TRANSACTION;
    DECLARE @sahip NVARCHAR(50), @durum VARCHAR(20), @kod NVARCHAR(20), @bugun DATE = CAST(SYSDATETIME() AS DATE);
    SELECT @sahip = sorumlu_sicil_no, @durum = durum, @kod = kod FROM gorev.talepler WITH (UPDLOCK) WHERE id = @id;
    IF @@ROWCOUNT = 0 THROW 50024, N'Talep bulunamadı.', 1;
    IF @yon = 0 AND ISNULL(@ben, N'') <> @sahip THROW 50023, N'Yalnızca kendi talebinizi iptal edebilirsiniz.', 1;
    IF @durum NOT IN ('KISMEN_ATANDI','TAMAMEN_ATANDI') THROW 50024, N'Yalnız atama yapılmış talep iptal edilir (bekleyen talep geri çekilir ya da reddedilir).', 1;
    IF EXISTS (SELECT 1 FROM gorev.atamalar WHERE talep_id = @id AND durum = 'AKTIF' AND tarih < @bugun)
        THROW 50024, N'Görev başlamış; iptal yerine "Erken bitir" kullanın.', 1;
    DECLARE @k TABLE (sicil NVARCHAR(50) COLLATE DATABASE_DEFAULT NOT NULL);
    UPDATE gorev.atamalar SET durum = 'CIKARILDI', cikaran_hesap = ORIGINAL_LOGIN(), cikarma_tarihi = SYSDATETIME(), cikarma_nedeni = LEFT(N'Görev iptal edildi: ' + @neden, 300)
    OUTPUT inserted.sicil_no INTO @k (sicil)
    WHERE talep_id = @id AND durum = 'AKTIF';
    UPDATE gorev.talepler SET durum = 'IPTAL', guncelleme = SYSDATETIME() WHERE id = @id;
    INSERT INTO gorev.bildirimler (sicil_no, tur, mesaj, talep_id)
    SELECT DISTINCT sicil, 'GOREV_IPTAL', LEFT(@kod + N' görevi iptal edildi: ' + @neden, 500), @id FROM @k;
    IF ISNULL(@ben, N'') <> @sahip
        INSERT INTO gorev.bildirimler (sicil_no, tur, mesaj, talep_id) VALUES (@sahip, 'TALEP_IPTAL', LEFT(@kod + N' talebiniz Yönetici tarafından iptal edildi: ' + @neden, 500), @id);
    ELSE
        INSERT INTO gorev.bildirimler (sicil_no, tur, mesaj, talep_id) SELECT sicil_no, 'TALEP_IPTAL', LEFT(@kod + N' talebi sorumlusu tarafından iptal edildi: ' + @neden, 500), @id FROM gorev.fn_yonetici_sicilleri();
    INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti) VALUES (N'TALEP_IPTAL', N'talepler', CAST(@id AS NVARCHAR(60)), LEFT(CONCAT(@kod, N' ', @neden), 400));
    COMMIT TRANSACTION;
END;
GO

-- Erken bitiş: yeni son günden sonraki gün/dilimler talepten ve atamalardan kalkar.
CREATE PROCEDURE gorev.sp_talep_erken_bitir
    @id       INT,
    @yeni_son DATE,
    @neden    NVARCHAR(300)
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    DECLARE @yon BIT = gorev.fn_yonetici_mi(), @ben NVARCHAR(50) = gorev.fn_ben_sicil();
    IF @yon = 0 AND gorev.fn_sorumlu_mu() = 0 THROW 50023, N'Bu işlem için yetkiniz yok.', 1;
    SET @neden = LTRIM(RTRIM(ISNULL(@neden, N'')));
    IF LEN(@neden) < 3 THROW 50024, N'Erken bitiş nedeni en az 3 karakter olmalı.', 1;
    BEGIN TRANSACTION;
    DECLARE @sahip NVARCHAR(50), @durum VARCHAR(20), @kod NVARCHAR(20), @ilk DATE, @son DATE;
    SELECT @sahip = sorumlu_sicil_no, @durum = durum, @kod = kod, @ilk = ilk_tarih, @son = son_tarih FROM gorev.talepler WITH (UPDLOCK) WHERE id = @id;
    IF @@ROWCOUNT = 0 THROW 50024, N'Talep bulunamadı.', 1;
    IF @yon = 0 AND ISNULL(@ben, N'') <> @sahip THROW 50023, N'Yalnızca kendi talebinizde işlem yapabilirsiniz.', 1;
    IF @durum NOT IN ('KISMEN_ATANDI','TAMAMEN_ATANDI') THROW 50024, N'Yalnız atama yapılmış talepte erken bitiş yapılır.', 1;
    IF @yeni_son < @ilk THROW 50024, N'Yeni son gün talebin ilk gününden önce olamaz (tamamını kaldırmak için iptal edin).', 1;
    IF @yeni_son >= @son THROW 50024, N'Yeni son gün mevcut son günden önce olmalı.', 1;
    DECLARE @k TABLE (sicil NVARCHAR(50) COLLATE DATABASE_DEFAULT NOT NULL);
    UPDATE gorev.atamalar SET durum = 'CIKARILDI', cikaran_hesap = ORIGINAL_LOGIN(), cikarma_tarihi = SYSDATETIME(), cikarma_nedeni = LEFT(N'Erken bitiş: ' + @neden, 300)
    OUTPUT inserted.sicil_no INTO @k (sicil)
    WHERE talep_id = @id AND durum = 'AKTIF' AND tarih > @yeni_son;
    DELETE FROM gorev.talep_gunleri WHERE talep_id = @id AND tarih > @yeni_son;
    UPDATE gorev.talepler SET son_tarih = @yeni_son, durum = gorev.fn_talep_durum(@id), guncelleme = SYSDATETIME() WHERE id = @id;
    INSERT INTO gorev.bildirimler (sicil_no, tur, mesaj, talep_id)
    SELECT DISTINCT sicil, 'ERKEN_BITIS', LEFT(@kod + N' görevi ' + CONVERT(CHAR(10), @yeni_son, 104) + N' tarihinde bitiyor: ' + @neden, 500), @id FROM @k;
    IF ISNULL(@ben, N'') <> @sahip
        INSERT INTO gorev.bildirimler (sicil_no, tur, mesaj, talep_id) VALUES (@sahip, 'ERKEN_BITIS', LEFT(@kod + N' talebiniz ' + CONVERT(CHAR(10), @yeni_son, 104) + N' tarihinde bitirildi: ' + @neden, 500), @id);
    INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti) VALUES (N'TALEP_ERKEN_BITIS', N'talepler', CAST(@id AS NVARCHAR(60)), LEFT(CONCAT(@kod, N' ', CONVERT(CHAR(10), @yeni_son, 23), N' ', @neden), 400));
    COMMIT TRANSACTION;
    SELECT @id AS talep_id, durum FROM gorev.talepler WHERE id = @id;
END;
GO

-- Bir kişiyi görevden çıkar (tarih/zaman boşsa talepteki tüm aktif atamaları). Yalnız Yönetici.
CREATE PROCEDURE gorev.sp_atama_cikar
    @talep_id INT,
    @sicil    NVARCHAR(50),
    @tarih    DATE = NULL,
    @zaman    VARCHAR(3) = NULL,
    @neden    NVARCHAR(300)
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    IF gorev.fn_yonetici_mi() = 0 THROW 50023, N'Görevden çıkarma yalnız Merkez Yönetici tarafından yapılır.', 1;
    SET @neden = LTRIM(RTRIM(ISNULL(@neden, N'')));
    SET @zaman = NULLIF(UPPER(LTRIM(RTRIM(ISNULL(@zaman, '')))), '');
    IF LEN(@neden) < 3 THROW 50024, N'Çıkarma nedeni en az 3 karakter olmalı.', 1;
    BEGIN TRANSACTION;
    DECLARE @kod NVARCHAR(20), @sahip NVARCHAR(50), @ad NVARCHAR(200);
    SELECT @kod = kod, @sahip = sorumlu_sicil_no FROM gorev.talepler WITH (UPDLOCK) WHERE id = @talep_id;
    IF @@ROWCOUNT = 0 THROW 50024, N'Talep bulunamadı.', 1;
    SELECT @ad = adi_soyadi FROM gorev.personel WHERE sicil_no = @sicil;
    UPDATE gorev.atamalar SET durum = 'CIKARILDI', cikaran_hesap = ORIGINAL_LOGIN(), cikarma_tarihi = SYSDATETIME(), cikarma_nedeni = LEFT(N'Yönetici çıkardı: ' + @neden, 300)
    WHERE talep_id = @talep_id AND sicil_no = @sicil AND durum = 'AKTIF' AND (@tarih IS NULL OR tarih = @tarih) AND (@zaman IS NULL OR zaman_dilimi = @zaman);
    DECLARE @n INT = @@ROWCOUNT;
    IF @n = 0 THROW 50024, N'Çıkarılacak aktif atama bulunamadı.', 1;
    UPDATE gorev.talepler SET durum = gorev.fn_talep_durum(@talep_id), guncelleme = SYSDATETIME() WHERE id = @talep_id AND durum IN ('ONAY_BEKLIYOR','KISMEN_ATANDI','TAMAMEN_ATANDI');
    INSERT INTO gorev.bildirimler (sicil_no, tur, mesaj, talep_id) VALUES (@sicil, 'GOREV_CIKARILDI', LEFT(@kod + N' görevinden çıkarıldınız (' + @neden + N').', 500), @talep_id);
    INSERT INTO gorev.bildirimler (sicil_no, tur, mesaj, talep_id) VALUES (@sahip, 'GOREV_CIKARILDI', LEFT(@kod + N': ' + ISNULL(@ad, @sicil) + N' görevden çıkarıldı (' + CAST(@n AS NVARCHAR(10)) + N' kişi-gün): ' + @neden, 500), @talep_id);
    INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti) VALUES (N'ATAMA_CIKAR_YONETICI', N'talepler', CAST(@talep_id AS NVARCHAR(60)), LEFT(CONCAT(@kod, N' ', @sicil, N' ', @n, N' kişi-gün: ', @neden), 400));
    COMMIT TRANSACTION;
    SELECT @talep_id AS talep_id, durum, @n AS cikarilan FROM gorev.talepler WHERE id = @talep_id;
END;
GO

-- İkame: eski kişinin (bastan tarihinden itibaren, varsayılan bugün) aktif atamaları yeni kişiye geçer. Çakışma/izin/rapor kuralları sp_atama_onayla ve tetikleyiciden gelir.
CREATE PROCEDURE gorev.sp_atama_ikame
    @talep_id INT,
    @eski     NVARCHAR(50),
    @yeni     NVARCHAR(50),
    @bastan   DATE = NULL,
    @karar    VARCHAR(10) = 'REDDET',
    @neden    NVARCHAR(300) = NULL
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    IF gorev.fn_yonetici_mi() = 0 THROW 50023, N'İkame yalnız Merkez Yönetici tarafından yapılır.', 1;
    SET @eski = LTRIM(RTRIM(ISNULL(@eski, N''))); SET @yeni = LTRIM(RTRIM(ISNULL(@yeni, N'')));
    SET @karar = UPPER(LTRIM(RTRIM(ISNULL(@karar, 'REDDET'))));
    SET @neden = NULLIF(LTRIM(RTRIM(ISNULL(@neden, N''))), N'');
    IF @karar NOT IN ('REDDET','CIKAR') THROW 50024, N'Karar REDDET ya da CIKAR olmalı.', 1;
    IF @eski = @yeni THROW 50024, N'Eski ve yeni kişi aynı olamaz.', 1;
    IF NOT EXISTS (SELECT 1 FROM gorev.personel WHERE sicil_no = @yeni AND aktif = 1) THROW 50024, N'Yeni kişi kadroda yok ya da pasif.', 1;
    SET @bastan = ISNULL(@bastan, CAST(SYSDATETIME() AS DATE));
    BEGIN TRANSACTION;
    DECLARE @durum VARCHAR(20), @kod NVARCHAR(20), @sahip NVARCHAR(50), @eski_ad NVARCHAR(200), @yeni_ad NVARCHAR(200);
    SELECT @durum = durum, @kod = kod, @sahip = sorumlu_sicil_no FROM gorev.talepler WITH (UPDLOCK) WHERE id = @talep_id;
    IF @@ROWCOUNT = 0 THROW 50024, N'Talep bulunamadı.', 1;
    IF @durum NOT IN ('KISMEN_ATANDI','TAMAMEN_ATANDI') THROW 50024, N'Yalnız atama yapılmış talepte ikame yapılır.', 1;
    SELECT @eski_ad = adi_soyadi FROM gorev.personel WHERE sicil_no = @eski;
    SELECT @yeni_ad = adi_soyadi FROM gorev.personel WHERE sicil_no = @yeni;
    CREATE TABLE #m (atama_id INT NOT NULL, tarih DATE NOT NULL, zaman VARCHAR(3) COLLATE DATABASE_DEFAULT NOT NULL);
    INSERT INTO #m (atama_id, tarih, zaman)
    SELECT id, tarih, zaman_dilimi FROM gorev.atamalar WITH (UPDLOCK) WHERE talep_id = @talep_id AND sicil_no = @eski AND durum = 'AKTIF' AND tarih >= @bastan;
    IF NOT EXISTS (SELECT 1 FROM #m) THROW 50024, N'Eski kişinin bu talepte değiştirilecek aktif ataması yok.', 1;
    DECLARE @json NVARCHAR(MAX) = (SELECT @yeni AS sicil, CONVERT(CHAR(10), tarih, 23) AS tarih, zaman FROM #m ORDER BY tarih FOR JSON PATH);
    IF @karar = 'REDDET' AND EXISTS (SELECT 1 FROM gorev.fn_atama_cakisma(@talep_id, @json))
    BEGIN
        DECLARE @mesaj NVARCHAR(500) = N'Çakışma var: ' + ISNULL(STUFF((SELECT TOP (5) N'; ' + @yeni_ad + N' ' + CONVERT(CHAR(10), c.tarih, 104) + N' (' + t.kod + N')'
            FROM gorev.fn_atama_cakisma(@talep_id, @json) c JOIN gorev.talepler t ON t.id = c.cakisan_talep_id ORDER BY c.tarih
            FOR XML PATH(N''), TYPE).value('.', 'NVARCHAR(MAX)'), 1, 2, N''), N'');
        THROW 50030, @mesaj, 1;
    END;
    UPDATE a SET durum = 'CIKARILDI', cikaran_hesap = ORIGINAL_LOGIN(), cikarma_tarihi = SYSDATETIME(), cikarma_nedeni = LEFT(N'İkame: ' + @yeni_ad + ISNULL(N' (' + @neden + N')', N''), 300)
    FROM gorev.atamalar a JOIN #m m ON m.atama_id = a.id;
    UPDATE gorev.talepler SET durum = gorev.fn_talep_durum(@talep_id) WHERE id = @talep_id;
    CREATE TABLE #r (talep_id INT, durum VARCHAR(20), atanan INT, cikarilan INT, uyari NVARCHAR(200) NULL);
    INSERT INTO #r EXEC gorev.sp_atama_onayla @talep_id, @json, @karar;
    DECLARE @n INT = (SELECT COUNT(*) FROM #m);
    INSERT INTO gorev.bildirimler (sicil_no, tur, mesaj, talep_id) VALUES (@eski, 'IKAME_CIKTI', LEFT(@kod + N' görevinden ikame ile çıkarıldınız (' + @yeni_ad + N' atandı).', 500), @talep_id);
    INSERT INTO gorev.bildirimler (sicil_no, tur, mesaj, talep_id) VALUES (@yeni, 'IKAME_ATANDI', LEFT(@kod + N' görevine ikame olarak atandınız (' + @eski_ad + N' yerine, ' + CAST(@n AS NVARCHAR(10)) + N' kişi-gün).', 500), @talep_id);
    IF @sahip <> ISNULL(gorev.fn_ben_sicil(), N'')
        INSERT INTO gorev.bildirimler (sicil_no, tur, mesaj, talep_id) VALUES (@sahip, 'IKAME', LEFT(@kod + N': ' + @eski_ad + N' yerine ' + @yeni_ad + N' atandı (' + CAST(@n AS NVARCHAR(10)) + N' kişi-gün).', 500), @talep_id);
    INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti) VALUES (N'ATAMA_IKAME', N'talepler', CAST(@talep_id AS NVARCHAR(60)), LEFT(CONCAT(@kod, N' ', @eski, N' -> ', @yeni, N' ', @n, N' kişi-gün'), 400));
    COMMIT TRANSACTION;
    SELECT @talep_id AS talep_id, durum, @n AS degisen, (SELECT TOP (1) cikarilan FROM #r) AS cikarilan, (SELECT TOP (1) uyari FROM #r) AS uyari FROM gorev.talepler WHERE id = @talep_id;
END;
GO

-- Proje sorumlusu devri (yalnız Yönetici). Bekleyen/atanmış talepte geçerli.
CREATE PROCEDURE gorev.sp_sorumlu_devret
    @talep_id   INT,
    @yeni_sicil NVARCHAR(50),
    @neden      NVARCHAR(300) = NULL
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    IF gorev.fn_yonetici_mi() = 0 THROW 50023, N'Sorumlu devri yalnız Merkez Yönetici tarafından yapılır.', 1;
    SET @yeni_sicil = LTRIM(RTRIM(ISNULL(@yeni_sicil, N'')));
    SET @neden = NULLIF(LTRIM(RTRIM(ISNULL(@neden, N''))), N'');
    BEGIN TRANSACTION;
    DECLARE @eski NVARCHAR(50), @durum VARCHAR(20), @kod NVARCHAR(20), @yeni_ad NVARCHAR(200), @eski_ad NVARCHAR(200);
    SELECT @eski = sorumlu_sicil_no, @durum = durum, @kod = kod FROM gorev.talepler WITH (UPDLOCK) WHERE id = @talep_id;
    IF @@ROWCOUNT = 0 THROW 50024, N'Talep bulunamadı.', 1;
    IF @durum IN ('REDDEDILDI','GERI_CEKILDI','IPTAL') THROW 50024, N'Kapanmış talepte sorumlu devri yapılmaz.', 1;
    SELECT @yeni_ad = adi_soyadi FROM gorev.personel WHERE sicil_no = @yeni_sicil AND aktif = 1;
    IF @yeni_ad IS NULL THROW 50024, N'Yeni sorumlu kadroda yok ya da pasif.', 1;
    IF @yeni_sicil = @eski THROW 50024, N'Yeni sorumlu mevcut sorumluyla aynı.', 1;
    SELECT @eski_ad = adi_soyadi FROM gorev.personel WHERE sicil_no = @eski;
    UPDATE gorev.talepler SET sorumlu_sicil_no = @yeni_sicil, guncelleme = SYSDATETIME() WHERE id = @talep_id;
    INSERT INTO gorev.sorumlu_devir (talep_id, eski_sicil, yeni_sicil, neden) VALUES (@talep_id, @eski, @yeni_sicil, @neden);
    INSERT INTO gorev.bildirimler (sicil_no, tur, mesaj, talep_id) VALUES (@yeni_sicil, 'SORUMLU_DEVIR', LEFT(@kod + N' talebinin sorumluluğu size devredildi (önceki: ' + ISNULL(@eski_ad, @eski) + N').', 500), @talep_id);
    INSERT INTO gorev.bildirimler (sicil_no, tur, mesaj, talep_id) VALUES (@eski, 'SORUMLU_DEVIR', LEFT(@kod + N' talebinin sorumluluğu ' + @yeni_ad + N' kişisine devredildi.', 500), @talep_id);
    INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti) VALUES (N'SORUMLU_DEVIR', N'talepler', CAST(@talep_id AS NVARCHAR(60)), LEFT(CONCAT(@kod, N' ', @eski, N' -> ', @yeni_sicil, ISNULL(N' ' + @neden, N'')), 400));
    COMMIT TRANSACTION;
END;
GO

-- İç yordam: bekleyen revizeyi talebe uygular (çağıranın işleminde). Doğrudan çağrı reddedilir.
CREATE PROCEDURE gorev.sp_revize_uygula
    @id INT
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    IF @@NESTLEVEL < 2 THROW 50023, N'Bu yordam doğrudan çağrılamaz.', 1;
    DECLARE @talep INT, @gm NVARCHAR(1000), @nt NVARCHAR(300), @sb TIME(0), @sbit TIME(0), @gj NVARCHAR(MAX), @durum VARCHAR(15), @kod NVARCHAR(20), @tkod NVARCHAR(20), @sahip NVARCHAR(50);
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

-- Revize isteği: Sorumlu kendi talebi için (Yönetici onayına gider); Yönetici doğrudan uygular. NULL alan değişmez.
CREATE PROCEDURE gorev.sp_revize_iste
    @talep_id       INT,
    @gorev_metni    NVARCHAR(1000) = NULL,
    @nitelik        NVARCHAR(300) = NULL,
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

CREATE PROCEDURE gorev.sp_revize_onayla
    @id INT
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    IF gorev.fn_yonetici_mi() = 0 THROW 50023, N'Revize onayı yalnız Merkez Yönetici tarafından yapılır.', 1;
    BEGIN TRANSACTION;
    EXEC gorev.sp_revize_uygula @id;
    COMMIT TRANSACTION;
    SELECT @id AS id, durum FROM gorev.revize_talepleri WHERE id = @id;
END;
GO

CREATE PROCEDURE gorev.sp_revize_reddet
    @id    INT,
    @neden NVARCHAR(300)
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    IF gorev.fn_yonetici_mi() = 0 THROW 50023, N'Revize reddi yalnız Merkez Yönetici tarafından yapılır.', 1;
    SET @neden = LTRIM(RTRIM(ISNULL(@neden, N'')));
    IF LEN(@neden) < 3 THROW 50024, N'Ret nedeni en az 3 karakter olmalı.', 1;
    BEGIN TRANSACTION;
    DECLARE @talep INT, @kod NVARCHAR(20), @sahip NVARCHAR(50);
    SELECT @talep = r.talep_id, @kod = r.kod FROM gorev.revize_talepleri r WITH (UPDLOCK) WHERE r.id = @id AND r.durum = 'BEKLIYOR';
    IF @talep IS NULL THROW 50024, N'Bekleyen revize bulunamadı.', 1;
    SELECT @sahip = sorumlu_sicil_no FROM gorev.talepler WHERE id = @talep;
    UPDATE gorev.revize_talepleri SET durum = 'REDDEDILDI', ret_nedeni = @neden, karar_hesap = ORIGINAL_LOGIN(), karar_tarihi = SYSDATETIME() WHERE id = @id;
    INSERT INTO gorev.bildirimler (sicil_no, tur, mesaj, talep_id) VALUES (@sahip, 'REVIZE_RET', LEFT(@kod + N' revizesi reddedildi: ' + @neden, 500), @talep);
    INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti) VALUES (N'REVIZE_RET', N'revize_talepleri', CAST(@id AS NVARCHAR(60)), LEFT(CONCAT(@kod, N' ', @neden), 400));
    COMMIT TRANSACTION;
END;
GO

CREATE PROCEDURE gorev.sp_revize_geri_cek
    @id INT
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    DECLARE @yon BIT = gorev.fn_yonetici_mi(), @ben NVARCHAR(50) = gorev.fn_ben_sicil();
    IF @yon = 0 AND gorev.fn_sorumlu_mu() = 0 THROW 50023, N'Bu işlem için yetkiniz yok.', 1;
    BEGIN TRANSACTION;
    DECLARE @talep INT, @kod NVARCHAR(20), @sahip NVARCHAR(50);
    SELECT @talep = r.talep_id, @kod = r.kod FROM gorev.revize_talepleri r WITH (UPDLOCK) WHERE r.id = @id AND r.durum = 'BEKLIYOR';
    IF @talep IS NULL THROW 50024, N'Bekleyen revize bulunamadı.', 1;
    SELECT @sahip = sorumlu_sicil_no FROM gorev.talepler WHERE id = @talep;
    IF @yon = 0 AND ISNULL(@ben, N'') <> @sahip THROW 50023, N'Yalnızca kendi revizenizi geri çekebilirsiniz.', 1;
    UPDATE gorev.revize_talepleri SET durum = 'GERI_CEKILDI', karar_hesap = ORIGINAL_LOGIN(), karar_tarihi = SYSDATETIME() WHERE id = @id;
    INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti) VALUES (N'REVIZE_GERI_CEK', N'revize_talepleri', CAST(@id AS NVARCHAR(60)), @kod);
    COMMIT TRANSACTION;
END;
GO

-- Revize listesi: Yönetici hepsini, Sorumlu yalnız kendi taleplerinin revizelerini görür.
CREATE PROCEDURE gorev.sp_revize_listele
    @talep_id INT = NULL,
    @durum    VARCHAR(15) = NULL
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @yon BIT = gorev.fn_yonetici_mi(), @ben NVARCHAR(50) = gorev.fn_ben_sicil();
    IF @yon = 0 AND gorev.fn_sorumlu_mu() = 0 THROW 50023, N'Bu işlem için yetkiniz yok.', 1;
    SET @durum = NULLIF(LTRIM(RTRIM(ISNULL(@durum, ''))), '');
    SELECT TOP (300) r.id, r.kod, r.talep_id, t.kod AS talep_kod, r.durum, ISNULL(p.adi_soyadi, r.isteyen_hesap) AS isteyen, r.neden, r.gorev_metni, r.nitelik,
           CONVERT(CHAR(5), r.saat_baslangic, 108) AS saat_baslangic, CONVERT(CHAR(5), r.saat_bitis, 108) AS saat_bitis, r.gunler_json, r.olusturma, r.ret_nedeni
    FROM gorev.revize_talepleri r
    JOIN gorev.talepler t ON t.id = r.talep_id
    LEFT JOIN gorev.personel p ON p.sicil_no = r.isteyen_sicil
    WHERE (@talep_id IS NULL OR r.talep_id = @talep_id) AND (@durum IS NULL OR r.durum = @durum)
      AND (@yon = 1 OR t.sorumlu_sicil_no = ISNULL(@ben, N'?'))
    ORDER BY CASE r.durum WHEN 'BEKLIYOR' THEN 0 ELSE 1 END, r.id DESC;
END;
GO

-- Sorumlu devir geçmişi (bir talep için).
CREATE PROCEDURE gorev.sp_sorumlu_devir_listele
    @talep_id INT
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @yon BIT = gorev.fn_yonetici_mi(), @ben NVARCHAR(50) = gorev.fn_ben_sicil();
    IF gorev.fn_kayitli_mi() = 0 THROW 50023, N'Bu işlem için yetkiniz yok.', 1;
    IF @yon = 0 AND NOT EXISTS (SELECT 1 FROM gorev.talepler WHERE id = @talep_id AND sorumlu_sicil_no = ISNULL(@ben, N'?')) THROW 50023, N'Yalnızca kendi talebinizi görebilirsiniz.', 1;
    SELECT d.id, e.adi_soyadi AS eski, y.adi_soyadi AS yeni, d.neden, d.devreden_hesap, d.tarih
    FROM gorev.sorumlu_devir d JOIN gorev.personel e ON e.sicil_no = d.eski_sicil JOIN gorev.personel y ON y.sicil_no = d.yeni_sicil
    WHERE d.talep_id = @talep_id ORDER BY d.id DESC;
END;
GO

INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti) VALUES (N'SEMA', N'sema_surumleri', N'10', N'010_revize_ikame.sql uygulandı');
GO
