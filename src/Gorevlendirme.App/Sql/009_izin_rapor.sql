-- Dilim 7: İzin talebi/onayı, rapor beyanı (evrak veritabanında), atama ile izin/rapor çakışma kuralları, kişisel görev listesi, matrise izin/rapor.
-- Kurallar: rapor kazanır (çakışan izin günleri iptal olur); onaylı izin/aktif rapor olan güne atama HER ZAMAN reddedilir (50031);
-- izin onayında çakışan atama için Yönetici karar verir (50030 → CIKAR); rapor girişinde çakışan atama durur, Yönetici/Sorumlu uyarılır.
CREATE TABLE gorev.izin_talepleri (
    id            INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_izin_talepleri PRIMARY KEY,
    kod           AS (N'IZN-' + RIGHT(N'0000' + CAST(id AS NVARCHAR(10)), 4)),
    sicil_no      NVARCHAR(50) NOT NULL CONSTRAINT FK_izin_personel REFERENCES gorev.personel (sicil_no),
    durum         VARCHAR(20) NOT NULL,
    tur           NVARCHAR(50) NOT NULL,
    aciklama      NVARCHAR(300) NULL,
    vekaleten     BIT NOT NULL CONSTRAINT DF_izin_vekaleten DEFAULT 0,
    olusturan_hesap NVARCHAR(256) NOT NULL CONSTRAINT DF_izin_olusturan DEFAULT ORIGINAL_LOGIN(),
    olusturma     DATETIME2(0) NOT NULL CONSTRAINT DF_izin_olusturma DEFAULT SYSDATETIME(),
    karar_hesap   NVARCHAR(256) NULL,
    karar_tarihi  DATETIME2(0) NULL,
    ret_nedeni    NVARCHAR(300) NULL,
    guncelleme    DATETIME2(0) NOT NULL CONSTRAINT DF_izin_guncelleme DEFAULT SYSDATETIME(),
    kaynak        NVARCHAR(20) NULL,
    CONSTRAINT CK_izin_durum CHECK (durum IN ('ONAY_BEKLIYOR','ONAYLANDI','REDDEDILDI','GERI_CEKILDI','RAPORLA_IPTAL'))
);
GO
CREATE INDEX IX_izin_kisi ON gorev.izin_talepleri (sicil_no, durum);
GO

CREATE TABLE gorev.izin_gunleri (
    id           INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_izin_gunleri PRIMARY KEY,
    izin_id      INT NOT NULL CONSTRAINT FK_izin_gun_izin REFERENCES gorev.izin_talepleri (id),
    tarih        DATE NOT NULL,
    zaman_dilimi VARCHAR(3) NOT NULL,
    durum        VARCHAR(10) NOT NULL CONSTRAINT DF_izin_gun_durum DEFAULT 'BEKLIYOR',
    surum        ROWVERSION,
    CONSTRAINT CK_izin_gun_zaman CHECK (zaman_dilimi IN ('TAM','OO','OS')),
    CONSTRAINT CK_izin_gun_durum CHECK (durum IN ('BEKLIYOR','ONAYLI','IPTAL'))
);
GO
CREATE UNIQUE INDEX UX_izin_gun ON gorev.izin_gunleri (izin_id, tarih, zaman_dilimi);
CREATE INDEX IX_izin_gun_tarih ON gorev.izin_gunleri (tarih, durum) INCLUDE (izin_id, zaman_dilimi);
GO

CREATE TABLE gorev.raporlar (
    id            INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_raporlar PRIMARY KEY,
    kod           AS (N'RPR-' + RIGHT(N'0000' + CAST(id AS NVARCHAR(10)), 4)),
    sicil_no      NVARCHAR(50) NOT NULL CONSTRAINT FK_rapor_personel REFERENCES gorev.personel (sicil_no),
    ilk_tarih     DATE NOT NULL,
    son_tarih     DATE NOT NULL,
    aciklama      NVARCHAR(300) NULL,
    durum         VARCHAR(10) NOT NULL CONSTRAINT DF_rapor_durum DEFAULT 'AKTIF',
    evrak         VARBINARY(MAX) NULL,
    evrak_adi     NVARCHAR(260) NULL,
    evrak_tur     VARCHAR(100) NULL,
    eski_kayit    BIT NOT NULL CONSTRAINT DF_rapor_eski DEFAULT 0,
    vekaleten     BIT NOT NULL CONSTRAINT DF_rapor_vekaleten DEFAULT 0,
    olusturan_hesap NVARCHAR(256) NOT NULL CONSTRAINT DF_rapor_olusturan DEFAULT ORIGINAL_LOGIN(),
    olusturma     DATETIME2(0) NOT NULL CONSTRAINT DF_rapor_olusturma DEFAULT SYSDATETIME(),
    iptal_hesap   NVARCHAR(256) NULL,
    iptal_tarihi  DATETIME2(0) NULL,
    iptal_nedeni  NVARCHAR(300) NULL,
    kaynak        NVARCHAR(20) NULL,
    surum         ROWVERSION,
    CONSTRAINT CK_rapor_tarih CHECK (son_tarih >= ilk_tarih),
    CONSTRAINT CK_rapor_durum CHECK (durum IN ('AKTIF','IPTAL')),
    CONSTRAINT CK_rapor_evrak CHECK (eski_kayit = 1 OR evrak IS NOT NULL),
    CONSTRAINT CK_rapor_boyut CHECK (evrak IS NULL OR DATALENGTH(evrak) <= 10485760)
);
GO
CREATE INDEX IX_rapor_kisi ON gorev.raporlar (sicil_no, durum, ilk_tarih, son_tarih);
GO

-- Atamaya karşı sert kural: onaylı izin ya da aktif rapor olan güne (örtüşen dilim) atama yapılamaz. Yönetici bunu aşamaz (50031).
CREATE TRIGGER gorev.tr_atamalar_izin_rapor ON gorev.atamalar AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @mesaj NVARCHAR(500) = (
        SELECT TOP (1) p.adi_soyadi + N' ' + CONVERT(CHAR(10), x.tarih, 104) + CASE WHEN x.tur = 'R' THEN N' tarihinde raporlu' ELSE N' tarihinde izinli' END
        FROM (
            SELECT i.sicil_no, i.tarih, 'I' AS tur FROM inserted i
              JOIN gorev.izin_talepleri it ON it.sicil_no = i.sicil_no AND it.durum = 'ONAYLANDI'
              JOIN gorev.izin_gunleri g ON g.izin_id = it.id AND g.tarih = i.tarih AND g.durum = 'ONAYLI'
                   AND (g.zaman_dilimi = 'TAM' OR i.zaman_dilimi = 'TAM' OR g.zaman_dilimi = i.zaman_dilimi)
            WHERE i.durum = 'AKTIF'
            UNION ALL
            SELECT i.sicil_no, i.tarih, 'R' FROM inserted i
              JOIN gorev.raporlar r ON r.sicil_no = i.sicil_no AND r.durum = 'AKTIF' AND i.tarih BETWEEN r.ilk_tarih AND r.son_tarih
            WHERE i.durum = 'AKTIF'
        ) x JOIN gorev.personel p ON p.sicil_no = x.sicil_no ORDER BY x.tarih);
    IF @mesaj IS NOT NULL
    BEGIN
        SET @mesaj = N'Atama yapılamaz: ' + @mesaj + N'.';
        THROW 50031, @mesaj, 1;
    END;
END;
GO

-- Yönetici sicillerine bildirim (sicili olan aktif yöneticiler).
CREATE FUNCTION gorev.fn_yonetici_sicilleri ()
RETURNS TABLE
AS
RETURN (SELECT DISTINCT i.sicil_no FROM gorev.kullanici_yetki_istisna i
        JOIN gorev.personel p ON p.sicil_no = i.sicil_no AND p.aktif = 1
        WHERE i.aktif = 1 AND i.yonetici_mi = 1 AND i.sicil_no IS NOT NULL);
GO

-- İç yordam: bir izni onaylar (çağıranın işleminde). Yalnız başka yordamlardan çağrılır; doğrudan çağrı reddedilir.
-- Çakışan AKTIF atama varsa: @karar='REDDET' → 50030 (işlem geri alınır); 'CIKAR' → atamalar çıkarılır, sorumlulara bildirim.
CREATE PROCEDURE gorev.sp_izin_isle
    @izin_id INT,
    @karar   VARCHAR(10),
    @cikarilan INT OUTPUT
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    IF @@NESTLEVEL < 2 THROW 50023, N'Bu yordam doğrudan çağrılamaz.', 1;
    DECLARE @sicil NVARCHAR(50), @kod NVARCHAR(20);
    SELECT @sicil = sicil_no, @kod = kod FROM gorev.izin_talepleri WHERE id = @izin_id;
    CREATE TABLE #c (atama_id INT NOT NULL, tarih DATE NOT NULL, talep_id INT NOT NULL);
    INSERT INTO #c (atama_id, tarih, talep_id)
    SELECT a.id, a.tarih, a.talep_id
    FROM gorev.izin_gunleri g
    JOIN gorev.atamalar a WITH (UPDLOCK) ON a.sicil_no = @sicil AND a.tarih = g.tarih AND a.durum = 'AKTIF'
         AND (g.zaman_dilimi = 'TAM' OR a.zaman_dilimi = 'TAM' OR a.zaman_dilimi = g.zaman_dilimi)
    WHERE g.izin_id = @izin_id AND g.durum = 'BEKLIYOR';
    SET @cikarilan = (SELECT COUNT(*) FROM #c);
    IF @cikarilan > 0 AND @karar = 'REDDET'
    BEGIN
        DECLARE @mesaj NVARCHAR(500) = N'Çakışma var: ' + ISNULL(STUFF((SELECT TOP (5) N'; ' + CONVERT(CHAR(10), c.tarih, 104) + N' (' + t.kod + N')'
            FROM #c c JOIN gorev.talepler t ON t.id = c.talep_id ORDER BY c.tarih FOR XML PATH(N''), TYPE).value('.', 'NVARCHAR(MAX)'), 1, 2, N''), N'')
            + N' görevine atanmış; izin onaylanırsa görevden çıkarılır.';
        THROW 50030, @mesaj, 1;   -- XACT_ABORT ON (çağıran yordam) işlemi geri alır
    END;
    IF @cikarilan > 0
    BEGIN
        UPDATE a SET durum = 'CIKARILDI', cikaran_hesap = ORIGINAL_LOGIN(), cikarma_tarihi = SYSDATETIME(), cikarma_nedeni = LEFT(N'İzin onaylandı: ' + @kod, 300)
        FROM gorev.atamalar a JOIN #c c ON c.atama_id = a.id;
        INSERT INTO gorev.bildirimler (sicil_no, tur, mesaj, talep_id)
        SELECT t.sorumlu_sicil_no, 'IZIN_CIKARILDI',
               LEFT(t.kod + N': ' + (SELECT adi_soyadi FROM gorev.personel WHERE sicil_no = @sicil) + N' izni onaylandığı için görevden çıkarıldı ('
                    + STUFF((SELECT N', ' + CONVERT(CHAR(10), c2.tarih, 104) FROM #c c2 WHERE c2.talep_id = t.id ORDER BY c2.tarih FOR XML PATH(N''), TYPE).value('.', 'NVARCHAR(MAX)'), 1, 2, N'') + N'). İkame gerekebilir.', 500), t.id
        FROM gorev.talepler t WHERE t.id IN (SELECT talep_id FROM #c);
        UPDATE t SET durum = gorev.fn_talep_durum(t.id), guncelleme = SYSDATETIME()
        FROM gorev.talepler t WHERE t.id IN (SELECT talep_id FROM #c) AND t.durum IN ('ONAY_BEKLIYOR','KISMEN_ATANDI','TAMAMEN_ATANDI');
        INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti)
        SELECT N'ATAMA_CIKAR', N'atamalar', CAST(c.atama_id AS NVARCHAR(60)), LEFT(CONCAT(@sicil, N' ', CONVERT(CHAR(10), c.tarih, 23), N' talep ', c.talep_id, N' -> ', @kod), 400) FROM #c c;
    END;
    UPDATE gorev.izin_gunleri SET durum = 'ONAYLI' WHERE izin_id = @izin_id AND durum = 'BEKLIYOR';
    UPDATE gorev.izin_talepleri SET durum = 'ONAYLANDI', karar_hesap = ORIGINAL_LOGIN(), karar_tarihi = SYSDATETIME(), guncelleme = SYSDATETIME() WHERE id = @izin_id;
END;
GO

-- Ortak: çağıranın kimliği ve hedef kişi (kendi ya da Yönetici vekaleten).
-- İzin talebi. @gunler_json: [{"tarih":"2026-11-23","zaman":"TAM"}]. Saha kendi adına (ONAY_BEKLIYOR); Yönetici vekaleten (anında ONAYLANDI; çakışmada @karar).
CREATE PROCEDURE gorev.sp_izin_kaydet
    @sicil       NVARCHAR(50) = NULL,
    @tur         NVARCHAR(50),
    @aciklama    NVARCHAR(300) = NULL,
    @gunler_json NVARCHAR(MAX),
    @karar       VARCHAR(10) = 'REDDET'
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
    DECLARE @yon BIT = gorev.fn_yonetici_mi(), @ben NVARCHAR(50) = gorev.fn_ben_sicil();
    SET @sicil = NULLIF(LTRIM(RTRIM(ISNULL(@sicil, N''))), N'');
    IF @sicil IS NULL SET @sicil = @ben;
    IF gorev.fn_kayitli_mi() = 0 OR @sicil IS NULL OR (@sicil <> ISNULL(@ben, N'') AND @yon = 0) THROW 50023, N'İzin talebini yalnız kişi kendisi ya da Merkez Yönetici açabilir.', 1;
    SET @karar = UPPER(LTRIM(RTRIM(ISNULL(@karar, 'REDDET'))));
    IF @karar NOT IN ('REDDET','CIKAR') THROW 50024, N'Karar REDDET ya da CIKAR olmalı.', 1;
    SET @tur = LTRIM(RTRIM(ISNULL(@tur, N'')));
    IF LEN(@tur) = 0 THROW 50024, N'İzin türü gerekli.', 1;
    IF NOT EXISTS (SELECT 1 FROM gorev.personel WHERE sicil_no = @sicil AND aktif = 1) THROW 50024, N'Kişi kadroda yok ya da pasif.', 1;

    CREATE TABLE #g (tarih DATE NOT NULL, zaman VARCHAR(3) COLLATE DATABASE_DEFAULT NOT NULL);
    IF EXISTS (SELECT 1 FROM OPENJSON(@gunler_json) WITH (tarih NVARCHAR(10) '$.tarih') j WHERE TRY_CONVERT(DATE, j.tarih, 23) IS NULL) THROW 50024, N'Gün listesinde geçersiz tarih var.', 1;
    INSERT INTO #g (tarih, zaman)
    SELECT TRY_CONVERT(DATE, j.tarih, 23), UPPER(LTRIM(RTRIM(ISNULL(j.zaman, '')))) FROM OPENJSON(@gunler_json) WITH (tarih NVARCHAR(10) '$.tarih', zaman VARCHAR(3) '$.zaman') j;
    IF NOT EXISTS (SELECT 1 FROM #g) THROW 50024, N'En az bir gün seçin.', 1;
    IF (SELECT COUNT(*) FROM #g) > 366 THROW 50024, N'Tek izinde en fazla 366 gün seçilebilir.', 1;
    IF EXISTS (SELECT 1 FROM #g WHERE zaman NOT IN ('TAM','OO','OS')) THROW 50024, N'Zaman dilimi TAM, OO ya da OS olmalı.', 1;
    IF EXISTS (SELECT tarih FROM #g GROUP BY tarih HAVING COUNT(*) > 1) THROW 50024, N'Aynı gün birden fazla kez seçilmiş (tam gün ya da ÖÖ/ÖS tek satır olmalı).', 1;
    IF @yon = 0 AND EXISTS (SELECT 1 FROM #g WHERE tarih < CAST(SYSDATETIME() AS DATE)) THROW 50024, N'Geçmiş güne izin talebi yalnız Merkez Yönetici tarafından girilebilir.', 1;

    BEGIN TRANSACTION;
    IF EXISTS (SELECT 1 FROM #g x JOIN gorev.izin_talepleri t WITH (UPDLOCK) ON t.sicil_no = @sicil AND t.durum IN ('ONAY_BEKLIYOR','ONAYLANDI')
               JOIN gorev.izin_gunleri g WITH (UPDLOCK) ON g.izin_id = t.id AND g.tarih = x.tarih AND g.durum IN ('BEKLIYOR','ONAYLI')
               AND (g.zaman_dilimi = 'TAM' OR x.zaman = 'TAM' OR g.zaman_dilimi = x.zaman))
        THROW 50024, N'Bu günlerden biri için zaten izin kaydı var.', 1;
    IF EXISTS (SELECT 1 FROM #g x JOIN gorev.raporlar r WITH (UPDLOCK) ON r.sicil_no = @sicil AND r.durum = 'AKTIF' AND x.tarih BETWEEN r.ilk_tarih AND r.son_tarih)
        THROW 50024, N'Bu günlerden biri için rapor kaydı var; raporlu güne izin girilemez.', 1;

    DECLARE @vek BIT = CASE WHEN @yon = 1 AND @sicil <> ISNULL(@ben, N'') THEN 1 ELSE 0 END;
    INSERT INTO gorev.izin_talepleri (sicil_no, durum, tur, aciklama, vekaleten) VALUES (@sicil, 'ONAY_BEKLIYOR', @tur, NULLIF(LTRIM(RTRIM(ISNULL(@aciklama, N''))), N''), @vek);
    DECLARE @id INT = SCOPE_IDENTITY();
    INSERT INTO gorev.izin_gunleri (izin_id, tarih, zaman_dilimi) SELECT @id, tarih, zaman FROM #g;
    DECLARE @kod NVARCHAR(20) = (SELECT kod FROM gorev.izin_talepleri WHERE id = @id), @cik INT = 0, @durum VARCHAR(20) = 'ONAY_BEKLIYOR';
    DECLARE @ad NVARCHAR(200) = (SELECT adi_soyadi FROM gorev.personel WHERE sicil_no = @sicil);
    IF @yon = 1
    BEGIN
        EXEC gorev.sp_izin_isle @izin_id = @id, @karar = @karar, @cikarilan = @cik OUTPUT;
        SET @durum = 'ONAYLANDI';
        IF @vek = 1 INSERT INTO gorev.bildirimler (sicil_no, tur, mesaj) VALUES (@sicil, 'IZIN_ONAY', LEFT(@kod + N': Merkez Yönetici sizin adınıza izin girdi (onaylı).', 500));
    END
    ELSE
        INSERT INTO gorev.bildirimler (sicil_no, tur, mesaj) SELECT sicil_no, 'IZIN_TALEP', LEFT(@kod + N': ' + @ad + N' izin talep etti (' + @tur + N').', 500) FROM gorev.fn_yonetici_sicilleri();
    INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti) VALUES (N'IZIN_KAYDET', N'izin_talepleri', CAST(@id AS NVARCHAR(60)), LEFT(CONCAT(@kod, N' ', @ad, N' ', @durum, N', çıkarılan atama ', @cik), 400));
    COMMIT TRANSACTION;
    SELECT @id AS id, @kod AS kod, @durum AS durum, @cik AS cikarilan;
END;
GO

CREATE PROCEDURE gorev.sp_izin_onayla
    @id    INT,
    @karar VARCHAR(10) = 'REDDET'
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
    IF gorev.fn_yonetici_mi() = 0 THROW 50023, N'İzni yalnız Merkez Yönetici onaylar.', 1;
    SET @karar = UPPER(LTRIM(RTRIM(ISNULL(@karar, 'REDDET'))));
    IF @karar NOT IN ('REDDET','CIKAR') THROW 50024, N'Karar REDDET ya da CIKAR olmalı.', 1;
    BEGIN TRANSACTION;
    DECLARE @durum VARCHAR(20), @sicil NVARCHAR(50), @kod NVARCHAR(20), @cik INT = 0;
    SELECT @durum = durum, @sicil = sicil_no, @kod = kod FROM gorev.izin_talepleri WITH (UPDLOCK) WHERE id = @id;
    IF @@ROWCOUNT = 0 THROW 50024, N'İzin talebi bulunamadı.', 1;
    IF @durum <> 'ONAY_BEKLIYOR' THROW 50024, N'Yalnız onay bekleyen izin onaylanır.', 1;
    IF EXISTS (SELECT 1 FROM gorev.izin_gunleri g JOIN gorev.raporlar r ON r.sicil_no = @sicil AND r.durum = 'AKTIF' AND g.tarih BETWEEN r.ilk_tarih AND r.son_tarih
               WHERE g.izin_id = @id AND g.durum = 'BEKLIYOR')
        THROW 50024, N'İzin günlerinden biri raporla çakışıyor; izin onaylanamaz.', 1;
    EXEC gorev.sp_izin_isle @izin_id = @id, @karar = @karar, @cikarilan = @cik OUTPUT;
    INSERT INTO gorev.bildirimler (sicil_no, tur, mesaj) VALUES (@sicil, 'IZIN_ONAY', LEFT(@kod + N': izniniz onaylandı.', 500));
    INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti) VALUES (N'IZIN_ONAY', N'izin_talepleri', CAST(@id AS NVARCHAR(60)), LEFT(CONCAT(@kod, N' onaylandı, çıkarılan atama ', @cik), 400));
    COMMIT TRANSACTION;
    SELECT @id AS id, N'ONAYLANDI' AS durum, @cik AS cikarilan;
END;
GO

CREATE PROCEDURE gorev.sp_izin_reddet
    @id    INT,
    @neden NVARCHAR(300)
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    IF gorev.fn_yonetici_mi() = 0 THROW 50023, N'İzni yalnız Merkez Yönetici reddeder.', 1;
    SET @neden = LTRIM(RTRIM(ISNULL(@neden, N'')));
    IF LEN(@neden) < 3 THROW 50024, N'Ret nedeni zorunludur.', 1;
    BEGIN TRANSACTION;
    DECLARE @durum VARCHAR(20), @sicil NVARCHAR(50), @kod NVARCHAR(20);
    SELECT @durum = durum, @sicil = sicil_no, @kod = kod FROM gorev.izin_talepleri WITH (UPDLOCK) WHERE id = @id;
    IF @@ROWCOUNT = 0 THROW 50024, N'İzin talebi bulunamadı.', 1;
    IF @durum <> 'ONAY_BEKLIYOR' THROW 50024, N'Yalnız onay bekleyen izin reddedilir.', 1;
    UPDATE gorev.izin_gunleri SET durum = 'IPTAL' WHERE izin_id = @id;
    UPDATE gorev.izin_talepleri SET durum = 'REDDEDILDI', ret_nedeni = @neden, karar_hesap = ORIGINAL_LOGIN(), karar_tarihi = SYSDATETIME(), guncelleme = SYSDATETIME() WHERE id = @id;
    INSERT INTO gorev.bildirimler (sicil_no, tur, mesaj) VALUES (@sicil, 'IZIN_RET', LEFT(@kod + N': izniniz reddedildi. Neden: ' + @neden, 500));
    INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti) VALUES (N'IZIN_RET', N'izin_talepleri', CAST(@id AS NVARCHAR(60)), LEFT(@kod + N' reddedildi: ' + @neden, 400));
    COMMIT TRANSACTION;
    SELECT @id AS id, N'REDDEDILDI' AS durum;
END;
GO

-- Geri çekme: kişi kendi onay bekleyen iznini; Yönetici onaylı olanı da (iptal) geri çeker.
CREATE PROCEDURE gorev.sp_izin_geri_cek
    @id INT
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    DECLARE @yon BIT = gorev.fn_yonetici_mi(), @ben NVARCHAR(50) = gorev.fn_ben_sicil();
    IF gorev.fn_kayitli_mi() = 0 THROW 50023, N'Bu işlem için yetkiniz yok.', 1;
    BEGIN TRANSACTION;
    DECLARE @durum VARCHAR(20), @sicil NVARCHAR(50), @kod NVARCHAR(20);
    SELECT @durum = durum, @sicil = sicil_no, @kod = kod FROM gorev.izin_talepleri WITH (UPDLOCK) WHERE id = @id;
    IF @@ROWCOUNT = 0 THROW 50024, N'İzin talebi bulunamadı.', 1;
    IF @yon = 0 AND (@sicil <> ISNULL(@ben, N'') OR @durum <> 'ONAY_BEKLIYOR') THROW 50023, N'Yalnız kendi onay bekleyen izin talebinizi geri çekebilirsiniz.', 1;
    IF @durum NOT IN ('ONAY_BEKLIYOR','ONAYLANDI') THROW 50024, N'Bu durumdaki izin geri çekilemez.', 1;
    UPDATE gorev.izin_gunleri SET durum = 'IPTAL' WHERE izin_id = @id AND durum <> 'IPTAL';
    UPDATE gorev.izin_talepleri SET durum = 'GERI_CEKILDI', guncelleme = SYSDATETIME() WHERE id = @id;
    INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti) VALUES (N'IZIN_GERI', N'izin_talepleri', CAST(@id AS NVARCHAR(60)), LEFT(@kod + N' geri çekildi (' + @durum + N').', 400));
    COMMIT TRANSACTION;
    SELECT @id AS id, N'GERI_CEKILDI' AS durum;
END;
GO

-- Kısaltma (Yönetici): onaylı iznin @yeni_son tarihinden sonraki günleri iptal edilir.
CREATE PROCEDURE gorev.sp_izin_kisalt
    @id       INT,
    @yeni_son DATE
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    IF gorev.fn_yonetici_mi() = 0 THROW 50023, N'İzni yalnız Merkez Yönetici kısaltır.', 1;
    IF @yeni_son IS NULL THROW 50024, N'Yeni son gün gerekli.', 1;
    BEGIN TRANSACTION;
    DECLARE @durum VARCHAR(20), @sicil NVARCHAR(50), @kod NVARCHAR(20);
    SELECT @durum = durum, @sicil = sicil_no, @kod = kod FROM gorev.izin_talepleri WITH (UPDLOCK) WHERE id = @id;
    IF @@ROWCOUNT = 0 THROW 50024, N'İzin talebi bulunamadı.', 1;
    IF @durum <> 'ONAYLANDI' THROW 50024, N'Yalnız onaylı izin kısaltılır.', 1;
    UPDATE gorev.izin_gunleri SET durum = 'IPTAL' WHERE izin_id = @id AND durum = 'ONAYLI' AND tarih > @yeni_son;
    DECLARE @kalan INT = (SELECT COUNT(*) FROM gorev.izin_gunleri WHERE izin_id = @id AND durum = 'ONAYLI');
    UPDATE gorev.izin_talepleri SET durum = CASE WHEN @kalan = 0 THEN 'GERI_CEKILDI' ELSE durum END, guncelleme = SYSDATETIME() WHERE id = @id;
    INSERT INTO gorev.bildirimler (sicil_no, tur, mesaj) VALUES (@sicil, 'IZIN_KISALT', LEFT(@kod + N': izniniz ' + CONVERT(CHAR(10), @yeni_son, 104) + N' tarihine kısaltıldı.', 500));
    INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti) VALUES (N'IZIN_KISALT', N'izin_talepleri', CAST(@id AS NVARCHAR(60)), LEFT(@kod + N' -> ' + CONVERT(CHAR(10), @yeni_son, 23), 400));
    COMMIT TRANSACTION;
    SELECT @id AS id, @kalan AS kalan_gun;
END;
GO

-- İzin listesi: Yönetici hepsi (@durum/@sicil süzer), diğerleri yalnız kendininkiler. Günler JSON.
CREATE PROCEDURE gorev.sp_izin_listele
    @durum VARCHAR(20) = NULL,
    @sicil NVARCHAR(50) = NULL
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    IF gorev.fn_kayitli_mi() = 0 THROW 50023, N'Bu işlem için yetkiniz yok.', 1;
    DECLARE @yon BIT = gorev.fn_yonetici_mi(), @ben NVARCHAR(50) = gorev.fn_ben_sicil();
    SET @durum = NULLIF(LTRIM(RTRIM(ISNULL(@durum, ''))), '');
    SET @sicil = NULLIF(LTRIM(RTRIM(ISNULL(@sicil, N''))), N'');
    IF @yon = 0 SET @sicil = ISNULL(@ben, N'?');
    SELECT TOP (500) t.id, t.kod, t.sicil_no, p.adi_soyadi, p.bolum, t.durum, t.tur, t.aciklama, t.vekaleten, t.ret_nedeni, t.olusturma,
        (SELECT MIN(g.tarih) FROM gorev.izin_gunleri g WHERE g.izin_id = t.id) AS ilk_tarih,
        (SELECT MAX(g.tarih) FROM gorev.izin_gunleri g WHERE g.izin_id = t.id) AS son_tarih,
        (SELECT COUNT(*) FROM gorev.izin_gunleri g WHERE g.izin_id = t.id AND g.durum <> 'IPTAL') AS gun_sayisi,
        (SELECT COUNT(*) FROM gorev.izin_gunleri g JOIN gorev.atamalar a ON a.sicil_no = t.sicil_no AND a.tarih = g.tarih AND a.durum = 'AKTIF'
              AND (g.zaman_dilimi = 'TAM' OR a.zaman_dilimi = 'TAM' OR a.zaman_dilimi = g.zaman_dilimi)
         WHERE g.izin_id = t.id AND g.durum IN ('BEKLIYOR','ONAYLI')) AS cakisan_atama,
        (SELECT CONVERT(CHAR(10), g.tarih, 23) AS tarih, g.zaman_dilimi AS zaman, g.durum FROM gorev.izin_gunleri g WHERE g.izin_id = t.id ORDER BY g.tarih FOR JSON PATH) AS gunler_json
    FROM gorev.izin_talepleri t JOIN gorev.personel p ON p.sicil_no = t.sicil_no
    WHERE (@sicil IS NULL OR t.sicil_no = @sicil) AND (@durum IS NULL OR t.durum = @durum)
    ORDER BY CASE t.durum WHEN 'ONAY_BEKLIYOR' THEN 0 ELSE 1 END, t.id DESC;
END;
GO

-- Rapor beyanı. Evrak zorunlu (PDF/JPG/PNG, ≤10 MB; tür ve boyut C# tarafında da denetlenir). Kişi kendi adına ya da Yönetici vekaleten.
-- Rapor kazanır: aralığa düşen izin günleri iptal olur; çakışan atamalar DURUR, Yönetici ve ilgili sorumlulara "ikame gerekli" bildirimi gider.
CREATE PROCEDURE gorev.sp_rapor_kaydet
    @sicil     NVARCHAR(50) = NULL,
    @ilk_tarih DATE,
    @son_tarih DATE,
    @aciklama  NVARCHAR(300) = NULL,
    @evrak     VARBINARY(MAX),
    @evrak_adi NVARCHAR(260),
    @evrak_tur VARCHAR(100)
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
    DECLARE @yon BIT = gorev.fn_yonetici_mi(), @ben NVARCHAR(50) = gorev.fn_ben_sicil();
    SET @sicil = NULLIF(LTRIM(RTRIM(ISNULL(@sicil, N''))), N'');
    IF @sicil IS NULL SET @sicil = @ben;
    IF gorev.fn_kayitli_mi() = 0 OR @sicil IS NULL OR (@sicil <> ISNULL(@ben, N'') AND @yon = 0) THROW 50023, N'Raporu yalnız kişi kendisi ya da Merkez Yönetici girebilir.', 1;
    IF NOT EXISTS (SELECT 1 FROM gorev.personel WHERE sicil_no = @sicil AND aktif = 1) THROW 50024, N'Kişi kadroda yok ya da pasif.', 1;
    IF @ilk_tarih IS NULL OR @son_tarih IS NULL OR @son_tarih < @ilk_tarih THROW 50024, N'Rapor tarih aralığı geçersiz.', 1;
    IF DATEDIFF(DAY, @ilk_tarih, @son_tarih) > 365 THROW 50024, N'Tek raporda en fazla 366 gün olabilir.', 1;
    IF @evrak IS NULL OR DATALENGTH(@evrak) = 0 THROW 50024, N'Rapor evrakı zorunludur.', 1;
    IF DATALENGTH(@evrak) > 10485760 THROW 50024, N'Rapor evrakı en fazla 10 MB olabilir.', 1;
    IF @evrak_tur IS NULL OR @evrak_tur NOT IN ('application/pdf','image/jpeg','image/png') THROW 50024, N'Rapor evrakı PDF, JPG ya da PNG olmalı.', 1;

    BEGIN TRANSACTION;
    IF EXISTS (SELECT 1 FROM gorev.raporlar WITH (UPDLOCK) WHERE sicil_no = @sicil AND durum = 'AKTIF' AND ilk_tarih <= @son_tarih AND son_tarih >= @ilk_tarih)
        THROW 50024, N'Bu tarihlerde zaten aktif bir rapor kaydı var.', 1;
    INSERT INTO gorev.raporlar (sicil_no, ilk_tarih, son_tarih, aciklama, evrak, evrak_adi, evrak_tur, vekaleten)
    VALUES (@sicil, @ilk_tarih, @son_tarih, NULLIF(LTRIM(RTRIM(ISNULL(@aciklama, N''))), N''), @evrak, LEFT(@evrak_adi, 260), @evrak_tur, CASE WHEN @yon = 1 AND @sicil <> ISNULL(@ben, N'') THEN 1 ELSE 0 END);
    DECLARE @id INT = SCOPE_IDENTITY();
    DECLARE @kod NVARCHAR(20) = (SELECT kod FROM gorev.raporlar WHERE id = @id);
    DECLARE @ad NVARCHAR(200) = (SELECT adi_soyadi FROM gorev.personel WHERE sicil_no = @sicil);

    -- rapor kazanır: aralığa düşen izin günleri iptal
    CREATE TABLE #iz (izin_id INT NOT NULL);
    INSERT INTO #iz (izin_id) SELECT DISTINCT g.izin_id FROM gorev.izin_gunleri g WITH (UPDLOCK) JOIN gorev.izin_talepleri t ON t.id = g.izin_id
    WHERE t.sicil_no = @sicil AND g.durum IN ('BEKLIYOR','ONAYLI') AND g.tarih BETWEEN @ilk_tarih AND @son_tarih;
    DECLARE @izin_iptal INT = (SELECT COUNT(*) FROM gorev.izin_gunleri g JOIN #iz i ON i.izin_id = g.izin_id WHERE g.durum IN ('BEKLIYOR','ONAYLI') AND g.tarih BETWEEN @ilk_tarih AND @son_tarih);
    UPDATE g SET durum = 'IPTAL' FROM gorev.izin_gunleri g JOIN #iz i ON i.izin_id = g.izin_id WHERE g.durum IN ('BEKLIYOR','ONAYLI') AND g.tarih BETWEEN @ilk_tarih AND @son_tarih;
    UPDATE t SET durum = 'RAPORLA_IPTAL', guncelleme = SYSDATETIME() FROM gorev.izin_talepleri t JOIN #iz i ON i.izin_id = t.id
    WHERE NOT EXISTS (SELECT 1 FROM gorev.izin_gunleri g WHERE g.izin_id = t.id AND g.durum <> 'IPTAL');

    -- çakışan atamalar durur; uyarı
    CREATE TABLE #a (atama_id INT NOT NULL, tarih DATE NOT NULL, talep_id INT NOT NULL);
    INSERT INTO #a (atama_id, tarih, talep_id) SELECT a.id, a.tarih, a.talep_id FROM gorev.atamalar a WHERE a.sicil_no = @sicil AND a.durum = 'AKTIF' AND a.tarih BETWEEN @ilk_tarih AND @son_tarih;
    DECLARE @cakisan INT = (SELECT COUNT(*) FROM #a);
    IF @cakisan > 0
    BEGIN
        INSERT INTO gorev.bildirimler (sicil_no, tur, mesaj, talep_id)
        SELECT y.sicil_no, 'RAPOR_CAKISMA', LEFT(@kod + N': ' + @ad + N' raporlu; ' + CAST(@cakisan AS NVARCHAR(10)) + N' görev ataması etkileniyor. İkame gerekli.', 500), NULL FROM gorev.fn_yonetici_sicilleri() y;
        INSERT INTO gorev.bildirimler (sicil_no, tur, mesaj, talep_id)
        SELECT t.sorumlu_sicil_no, 'RAPOR_CAKISMA',
               LEFT(t.kod + N': ' + @ad + N' raporlu (' + STUFF((SELECT N', ' + CONVERT(CHAR(10), a2.tarih, 104) FROM #a a2 WHERE a2.talep_id = t.id ORDER BY a2.tarih FOR XML PATH(N''), TYPE).value('.', 'NVARCHAR(MAX)'), 1, 2, N'') + N'). İkame gerekebilir.', 500), t.id
        FROM gorev.talepler t WHERE t.id IN (SELECT talep_id FROM #a);
    END;
    INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti)
    VALUES (N'RAPOR_KAYDET', N'raporlar', CAST(@id AS NVARCHAR(60)), LEFT(CONCAT(@kod, N' ', @ad, N' ', CONVERT(CHAR(10), @ilk_tarih, 23), N'..', CONVERT(CHAR(10), @son_tarih, 23), N', iptal izin günü ', @izin_iptal, N', çakışan atama ', @cakisan), 400));
    COMMIT TRANSACTION;
    SELECT @id AS id, @kod AS kod, @izin_iptal AS izin_iptal, @cakisan AS cakisan_atama;
END;
GO

CREATE PROCEDURE gorev.sp_rapor_iptal
    @id    INT,
    @neden NVARCHAR(300)
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    DECLARE @yon BIT = gorev.fn_yonetici_mi(), @ben NVARCHAR(50) = gorev.fn_ben_sicil();
    IF gorev.fn_kayitli_mi() = 0 THROW 50023, N'Bu işlem için yetkiniz yok.', 1;
    SET @neden = LTRIM(RTRIM(ISNULL(@neden, N'')));
    IF LEN(@neden) < 3 THROW 50024, N'İptal nedeni zorunludur.', 1;
    BEGIN TRANSACTION;
    DECLARE @durum VARCHAR(10), @sicil NVARCHAR(50), @kod NVARCHAR(20);
    SELECT @durum = durum, @sicil = sicil_no, @kod = kod FROM gorev.raporlar WITH (UPDLOCK) WHERE id = @id;
    IF @@ROWCOUNT = 0 THROW 50024, N'Rapor bulunamadı.', 1;
    IF @yon = 0 AND @sicil <> ISNULL(@ben, N'') THROW 50023, N'Yalnız kendi raporunuzu iptal edebilirsiniz.', 1;
    IF @durum <> 'AKTIF' THROW 50024, N'Rapor zaten iptal.', 1;
    UPDATE gorev.raporlar SET durum = 'IPTAL', iptal_hesap = ORIGINAL_LOGIN(), iptal_tarihi = SYSDATETIME(), iptal_nedeni = @neden WHERE id = @id;
    INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti) VALUES (N'RAPOR_IPTAL', N'raporlar', CAST(@id AS NVARCHAR(60)), LEFT(@kod + N' iptal: ' + @neden, 400));
    COMMIT TRANSACTION;
    SELECT @id AS id, N'IPTAL' AS durum;
END;
GO

CREATE PROCEDURE gorev.sp_rapor_listele
    @sicil NVARCHAR(50) = NULL,
    @iptal_dahil BIT = 0
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    IF gorev.fn_kayitli_mi() = 0 THROW 50023, N'Bu işlem için yetkiniz yok.', 1;
    DECLARE @yon BIT = gorev.fn_yonetici_mi(), @ben NVARCHAR(50) = gorev.fn_ben_sicil();
    SET @sicil = NULLIF(LTRIM(RTRIM(ISNULL(@sicil, N''))), N'');
    IF @yon = 0 SET @sicil = ISNULL(@ben, N'?');
    SELECT TOP (500) r.id, r.kod, r.sicil_no, p.adi_soyadi, p.bolum, r.ilk_tarih, r.son_tarih, r.aciklama, r.durum, r.evrak_adi, r.evrak_tur,
           ISNULL(DATALENGTH(r.evrak), 0) AS evrak_boyut, r.eski_kayit, r.vekaleten, r.olusturma, r.iptal_nedeni,
           (SELECT COUNT(*) FROM gorev.atamalar a WHERE a.sicil_no = r.sicil_no AND a.durum = 'AKTIF' AND a.tarih BETWEEN r.ilk_tarih AND r.son_tarih) AS cakisan_atama
    FROM gorev.raporlar r JOIN gorev.personel p ON p.sicil_no = r.sicil_no
    WHERE (@sicil IS NULL OR r.sicil_no = @sicil) AND (@iptal_dahil = 1 OR r.durum = 'AKTIF')
    ORDER BY r.ilk_tarih DESC, r.id DESC;
END;
GO

CREATE PROCEDURE gorev.sp_rapor_evrak
    @id INT
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @yon BIT = gorev.fn_yonetici_mi(), @ben NVARCHAR(50) = gorev.fn_ben_sicil();
    IF gorev.fn_kayitli_mi() = 0 THROW 50023, N'Bu işlem için yetkiniz yok.', 1;
    IF NOT EXISTS (SELECT 1 FROM gorev.raporlar WHERE id = @id AND (@yon = 1 OR sicil_no = ISNULL(@ben, N'?'))) THROW 50023, N'Bu rapor evrakını görme yetkiniz yok.', 1;
    SELECT evrak, evrak_adi, evrak_tur FROM gorev.raporlar WHERE id = @id;
END;
GO

-- Kişisel görev listesi (Saha: "Görevlerim"): çağıranın kendi AKTIF atamaları.
CREATE PROCEDURE gorev.sp_gorevlerim
    @bas DATE = NULL,
    @bit DATE = NULL
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    IF gorev.fn_kayitli_mi() = 0 THROW 50023, N'Bu işlem için yetkiniz yok.', 1;
    DECLARE @ben NVARCHAR(50) = gorev.fn_ben_sicil();
    IF @bas IS NULL SET @bas = DATEADD(DAY, -14, CAST(SYSDATETIME() AS DATE));
    IF @bit IS NULL SET @bit = DATEADD(DAY, 90, CAST(SYSDATETIME() AS DATE));
    SELECT CONVERT(CHAR(10), a.tarih, 23) AS tarih, a.zaman_dilimi AS zaman, t.id AS talep_id, t.kod, h1.ad AS ana, h2.ad AS alt, h3.ad AS faaliyet, h4.ad AS konum,
           CONVERT(CHAR(5), t.saat_baslangic, 108) + N' - ' + CONVERT(CHAR(5), t.saat_bitis, 108) AS saat, s.adi_soyadi AS sorumlu, t.gorev_metni
    FROM gorev.atamalar a
    JOIN gorev.talepler t ON t.id = a.talep_id
    JOIN gorev.personel s ON s.sicil_no = t.sorumlu_sicil_no
    JOIN gorev.proje_havuzu h4 ON h4.id = t.havuz_id
    JOIN gorev.proje_havuzu h3 ON h3.id = h4.ust_id
    JOIN gorev.proje_havuzu h2 ON h2.id = h3.ust_id
    JOIN gorev.proje_havuzu h1 ON h1.id = h2.ust_id
    WHERE a.sicil_no = ISNULL(@ben, N'?') AND a.durum = 'AKTIF' AND a.tarih BETWEEN @bas AND @bit
    ORDER BY a.tarih, a.zaman_dilimi;
END;
GO

-- Matris: izin ve rapor hücreleri (izinler_json) eklendi; "yalnız kaydı olanlar" süzgeci izin/rapor olanları da kapsar.
ALTER PROCEDURE gorev.sp_matris_hafta
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
      AND ((@sadece_gorevli = 0 AND @ana IS NULL) OR EXISTS (SELECT 1 FROM #h c WHERE c.sicil_no = p.sicil_no)
           OR (@ana IS NULL AND EXISTS (SELECT 1 FROM #i c WHERE c.sicil_no = p.sicil_no)))
    ORDER BY p.adi_soyadi;
END;
GO

ALTER PROCEDURE gorev.sp_matris_surum
    @bas DATE
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    IF gorev.fn_kayitli_mi() = 0 THROW 50023, N'Bu işlem için yetkiniz yok.', 1;
    IF @bas IS NULL THROW 50024, N'Hafta başlangıcı gerekli.', 1;
    SET @bas = gorev.fn_hafta_basi(@bas);
    DECLARE @bit DATE = DATEADD(DAY, 6, @bas);
    SELECT CONCAT(
        ISNULL(CONVERT(VARCHAR(20), CONVERT(BIGINT, (SELECT MAX(surum) FROM gorev.atamalar WHERE tarih BETWEEN @bas AND @bit))), '0'), '-',
        (SELECT COUNT(*) FROM gorev.atamalar WHERE tarih BETWEEN @bas AND @bit), '-',
        ISNULL(CONVERT(VARCHAR(20), CONVERT(BIGINT, (SELECT MAX(surum) FROM gorev.izin_gunleri WHERE tarih BETWEEN @bas AND @bit))), '0'), '-',
        (SELECT COUNT(*) FROM gorev.izin_gunleri WHERE tarih BETWEEN @bas AND @bit), '-',
        ISNULL(CONVERT(VARCHAR(20), CONVERT(BIGINT, (SELECT MAX(surum) FROM gorev.raporlar WHERE ilk_tarih <= @bit AND son_tarih >= @bas))), '0'), '-',
        (SELECT COUNT(*) FROM gorev.raporlar WHERE ilk_tarih <= @bit AND son_tarih >= @bas)) AS surum;
END;
GO

INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti) VALUES (N'SEMA', N'sema_surumleri', N'9', N'009_izin_rapor.sql uygulandı');
GO
