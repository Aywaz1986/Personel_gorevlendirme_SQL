-- 007_atama: atama (Yönetici), çakışma kararı, ret, bildirim. SINANMADI (CI'da SQL Server testi çalışır).
-- Atama gün + zaman dilimi bazındadır; bir talep günü için istenen kişi sayısı kadar kişi atanabilir (kısmi atama serbest).
-- Yönetici dışında kimse atayamaz; Sorumlu kendi talebinin atananlarını sp_talep_getir ile görür.

ALTER TABLE gorev.talepler ADD ret_nedeni NVARCHAR(300) NULL;
GO

CREATE TABLE gorev.atamalar (
    id               INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_atamalar PRIMARY KEY,
    talep_id         INT NOT NULL CONSTRAINT FK_atamalar_talep REFERENCES gorev.talepler (id),
    sicil_no         NVARCHAR(50) NOT NULL CONSTRAINT FK_atamalar_personel REFERENCES gorev.personel (sicil_no),
    tarih            DATE NOT NULL,
    zaman_dilimi     VARCHAR(3) NOT NULL,
    durum            VARCHAR(10) NOT NULL CONSTRAINT DF_atamalar_durum DEFAULT 'AKTIF',
    atayan_hesap     NVARCHAR(256) NOT NULL CONSTRAINT DF_atamalar_atayan DEFAULT ORIGINAL_LOGIN(),
    olusturma        DATETIME2(0) NOT NULL CONSTRAINT DF_atamalar_olusturma DEFAULT SYSDATETIME(),
    cikaran_hesap    NVARCHAR(256) NULL,
    cikarma_tarihi   DATETIME2(0) NULL,
    cikarma_nedeni   NVARCHAR(300) NULL,
    cikaran_talep_id INT NULL,
    kaynak           NVARCHAR(20) NULL,
    CONSTRAINT CK_atamalar_zaman CHECK (zaman_dilimi IN ('TAM','OO','OS')),
    CONSTRAINT CK_atamalar_durum CHECK (durum IN ('AKTIF','CIKARILDI'))
);
GO

CREATE UNIQUE INDEX UX_atamalar_aktif ON gorev.atamalar (talep_id, sicil_no, tarih, zaman_dilimi) WHERE durum = 'AKTIF';
CREATE INDEX IX_atamalar_kisi_gun ON gorev.atamalar (sicil_no, tarih) INCLUDE (talep_id, zaman_dilimi, durum);
CREATE INDEX IX_atamalar_talep ON gorev.atamalar (talep_id, tarih, zaman_dilimi);
GO

CREATE TABLE gorev.bildirimler (
    id        INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_bildirimler PRIMARY KEY,
    sicil_no  NVARCHAR(50) NOT NULL CONSTRAINT FK_bildirimler_personel REFERENCES gorev.personel (sicil_no),
    tur       VARCHAR(20) NOT NULL,
    mesaj     NVARCHAR(500) NOT NULL,
    talep_id  INT NULL CONSTRAINT FK_bildirimler_talep REFERENCES gorev.talepler (id),
    olusturma DATETIME2(0) NOT NULL CONSTRAINT DF_bildirimler_olusturma DEFAULT SYSDATETIME(),
    okundu    BIT NOT NULL CONSTRAINT DF_bildirimler_okundu DEFAULT 0
);
GO

CREATE INDEX IX_bildirimler_kisi ON gorev.bildirimler (sicil_no, okundu, id);
GO

-- Havuz düğümünün Ana Proje (seviye 1) kimliği.
CREATE FUNCTION gorev.fn_havuz_ana (@id INT)
RETURNS INT
AS
BEGIN
    DECLARE @n INT = 0, @ust INT, @sev TINYINT;
    WHILE @id IS NOT NULL AND @n < 6
    BEGIN
        SELECT @ust = ust_id, @sev = seviye FROM gorev.proje_havuzu WHERE id = @id;
        IF @@ROWCOUNT = 0 RETURN NULL;
        IF @sev = 1 RETURN @id;
        SET @id = @ust; SET @n += 1;
    END;
    RETURN NULL;
END;
GO

-- Talebin atama durumu: hiç atama yok → ONAY_BEKLIYOR; istenen kişi sayısına ulaşıldı → TAMAMEN_ATANDI; arası KISMEN_ATANDI.
CREATE FUNCTION gorev.fn_talep_durum (@id INT)
RETURNS VARCHAR(20)
AS
BEGIN
    DECLARE @istenen INT = (SELECT ISNULL(SUM(kisi_sayisi), 0) FROM gorev.talep_gunleri WHERE talep_id = @id);
    DECLARE @atanan INT = (SELECT COUNT(*) FROM gorev.atamalar WHERE talep_id = @id AND durum = 'AKTIF');
    RETURN CASE WHEN @atanan = 0 THEN 'ONAY_BEKLIYOR' WHEN @atanan >= @istenen THEN 'TAMAMEN_ATANDI' ELSE 'KISMEN_ATANDI' END;
END;
GO

-- Önerilen atamaların başka taleplerdeki AKTIF atamalarla (aynı gün, örtüşen dilim) çakışması. TAM her dilimle örtüşür; ÖÖ ile ÖS örtüşmez.
CREATE FUNCTION gorev.fn_atama_cakisma (@talep_id INT, @json NVARCHAR(MAX))
RETURNS TABLE
AS
RETURN
    SELECT n.sicil, n.tarih, n.zaman, a.id AS atama_id, a.talep_id AS cakisan_talep_id, a.zaman_dilimi AS cakisan_zaman
    FROM (SELECT LTRIM(RTRIM(j.sicil)) AS sicil, TRY_CONVERT(DATE, j.tarih, 23) AS tarih, UPPER(LTRIM(RTRIM(j.zaman))) AS zaman
          FROM OPENJSON(@json) WITH (sicil NVARCHAR(50) '$.sicil', tarih NVARCHAR(10) '$.tarih', zaman VARCHAR(3) '$.zaman') j) n
    JOIN gorev.atamalar a ON a.sicil_no = n.sicil AND a.tarih = n.tarih AND a.durum = 'AKTIF' AND a.talep_id <> @talep_id
         AND (a.zaman_dilimi = 'TAM' OR n.zaman = 'TAM' OR a.zaman_dilimi = n.zaman);
GO

-- Aday listesi: önerilenler, sonra bu Ana Projede çok çalışanlar, sonra çakışması az olanlar. Yalnız Yönetici.
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
          WHERE g.talep_id = @talep_id) AS cakisan_gun
    FROM gorev.personel p
    WHERE p.aktif = 1 AND (LEN(@q) = 0 OR CHARINDEX(@q, p.adi_soyadi) > 0)
    ORDER BY 4 DESC, 5 DESC, 7 ASC, p.adi_soyadi;
END;
GO

-- Çakışma ön kontrolü (kaydetmez): arayüz karar kutusunu bununla doldurur.
CREATE OR ALTER PROCEDURE gorev.sp_atama_cakisma_kontrol
    @talep_id INT,
    @atamalar_json NVARCHAR(MAX)
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    IF gorev.fn_yonetici_mi() = 0 THROW 50023, N'Atama yalnız Merkez Yönetici tarafından yapılır.', 1;
    SELECT c.sicil AS sicil_no, p.adi_soyadi, CONVERT(CHAR(10), c.tarih, 23) AS tarih, c.zaman, c.cakisan_talep_id, t.kod AS cakisan_kod, c.cakisan_zaman,
           s.adi_soyadi AS cakisan_sorumlu
    FROM gorev.fn_atama_cakisma(@talep_id, @atamalar_json) c
    JOIN gorev.personel p ON p.sicil_no = c.sicil
    JOIN gorev.talepler t ON t.id = c.cakisan_talep_id
    JOIN gorev.personel s ON s.sicil_no = t.sorumlu_sicil_no
    ORDER BY c.tarih, p.adi_soyadi;
END;
GO

-- Atamayı onayla. @atamalar_json: [{"sicil":"1002","tarih":"2026-11-23","zaman":"TAM"}].
-- @karar: REDDET (varsayılan; çakışma varsa 50030) ya da CIKAR (çakışan görevden çıkar, o talebin sorumlusuna bildirim).
CREATE OR ALTER PROCEDURE gorev.sp_atama_onayla
    @talep_id      INT,
    @atamalar_json NVARCHAR(MAX),
    @karar         VARCHAR(10) = 'REDDET'
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
    IF gorev.fn_yonetici_mi() = 0 THROW 50023, N'Atama yalnız Merkez Yönetici tarafından yapılır.', 1;
    SET @karar = UPPER(LTRIM(RTRIM(ISNULL(@karar, 'REDDET'))));
    IF @karar NOT IN ('REDDET','CIKAR') THROW 50024, N'Karar REDDET ya da CIKAR olmalı.', 1;

    CREATE TABLE #n (sicil NVARCHAR(50) COLLATE DATABASE_DEFAULT NOT NULL, tarih DATE NOT NULL, zaman VARCHAR(3) COLLATE DATABASE_DEFAULT NOT NULL);
    DECLARE @gecersiz INT;
    SELECT @gecersiz = COUNT(*) FROM OPENJSON(@atamalar_json) WITH (tarih NVARCHAR(10) '$.tarih', sicil NVARCHAR(50) '$.sicil') j
    WHERE TRY_CONVERT(DATE, j.tarih, 23) IS NULL OR LEN(LTRIM(RTRIM(ISNULL(j.sicil, N'')))) = 0;
    IF @gecersiz > 0 THROW 50024, N'Atama listesinde geçersiz tarih ya da sicil var.', 1;
    INSERT INTO #n (sicil, tarih, zaman)
    SELECT LTRIM(RTRIM(j.sicil)), TRY_CONVERT(DATE, j.tarih, 23), UPPER(LTRIM(RTRIM(ISNULL(j.zaman, ''))))
    FROM OPENJSON(@atamalar_json) WITH (sicil NVARCHAR(50) '$.sicil', tarih NVARCHAR(10) '$.tarih', zaman VARCHAR(3) '$.zaman') j;
    IF NOT EXISTS (SELECT 1 FROM #n) THROW 50024, N'En az bir atama seçin.', 1;
    IF EXISTS (SELECT 1 FROM #n WHERE zaman NOT IN ('TAM','OO','OS')) THROW 50024, N'Zaman dilimi TAM, OO ya da OS olmalı.', 1;
    IF EXISTS (SELECT sicil, tarih, zaman FROM #n GROUP BY sicil, tarih, zaman HAVING COUNT(*) > 1) THROW 50024, N'Aynı kişi aynı gün ve dilime birden fazla kez seçilmiş.', 1;
    IF EXISTS (SELECT 1 FROM #n a JOIN #n b ON a.sicil = b.sicil AND a.tarih = b.tarih AND a.zaman = 'TAM' AND b.zaman <> 'TAM')
        THROW 50024, N'Aynı kişiye aynı güne tam gün ile yarım gün birlikte atanamaz.', 1;
    IF EXISTS (SELECT 1 FROM #n x WHERE NOT EXISTS (SELECT 1 FROM gorev.personel p WHERE p.sicil_no = x.sicil AND p.aktif = 1))
        THROW 50024, N'Seçilen kişilerden biri kadroda yok ya da pasif.', 1;

    BEGIN TRANSACTION;
    DECLARE @durum VARCHAR(20), @kod NVARCHAR(20), @sorumlu NVARCHAR(50);
    SELECT @durum = durum, @kod = kod, @sorumlu = sorumlu_sicil_no FROM gorev.talepler WITH (UPDLOCK) WHERE id = @talep_id;
    IF @@ROWCOUNT = 0 THROW 50024, N'Talep bulunamadı.', 1;
    IF @durum NOT IN ('ONAY_BEKLIYOR','KISMEN_ATANDI') THROW 50024, N'Bu durumdaki talebe atama yapılamaz.', 1;
    IF EXISTS (SELECT 1 FROM #n x WHERE NOT EXISTS (SELECT 1 FROM gorev.talep_gunleri g WHERE g.talep_id = @talep_id AND g.tarih = x.tarih AND g.zaman_dilimi = x.zaman))
        THROW 50024, N'Seçilen gün/dilim talepte yok.', 1;
    -- kapasite: dilim başına istenen kişi sayısı
    IF EXISTS (SELECT 1 FROM gorev.talep_gunleri g
               CROSS APPLY (SELECT COUNT(*) AS yeni FROM #n x WHERE x.tarih = g.tarih AND x.zaman = g.zaman_dilimi) y
               CROSS APPLY (SELECT COUNT(*) AS mevcut FROM gorev.atamalar a WITH (UPDLOCK) WHERE a.talep_id = g.talep_id AND a.tarih = g.tarih AND a.zaman_dilimi = g.zaman_dilimi AND a.durum = 'AKTIF') m
               WHERE g.talep_id = @talep_id AND y.yeni > 0 AND y.yeni + m.mevcut > g.kisi_sayisi)
        THROW 50024, N'Bir gün/dilimde istenen kişi sayısı aşılıyor.', 1;
    IF EXISTS (SELECT 1 FROM #n x JOIN gorev.atamalar a WITH (UPDLOCK) ON a.talep_id = @talep_id AND a.sicil_no = x.sicil AND a.tarih = x.tarih AND a.durum = 'AKTIF'
               AND (a.zaman_dilimi = 'TAM' OR x.zaman = 'TAM' OR a.zaman_dilimi = x.zaman))
        THROW 50024, N'Seçilen kişi bu talepte aynı gün zaten atanmış.', 1;

    -- çakışmalar (başka talepler)
    CREATE TABLE #cak (atama_id INT NOT NULL, sicil NVARCHAR(50) COLLATE DATABASE_DEFAULT NOT NULL, tarih DATE NOT NULL, cakisan_talep_id INT NOT NULL);
    INSERT INTO #cak (atama_id, sicil, tarih, cakisan_talep_id)
    SELECT c.atama_id, MIN(c.sicil), MIN(c.tarih), MIN(c.cakisan_talep_id) FROM gorev.fn_atama_cakisma(@talep_id, @atamalar_json) c GROUP BY c.atama_id;
    UPDATE a SET a.durum = a.durum FROM gorev.atamalar a WITH (UPDLOCK) JOIN #cak c ON c.atama_id = a.id;
    IF EXISTS (SELECT 1 FROM #cak) AND @karar = 'REDDET'
    BEGIN
        DECLARE @mesaj NVARCHAR(500) = N'Çakışma var: ' + ISNULL(STUFF((SELECT TOP (5) N'; ' + p.adi_soyadi + N' ' + CONVERT(CHAR(10), c.tarih, 104) + N' (' + t.kod + N')'
            FROM #cak c JOIN gorev.personel p ON p.sicil_no = c.sicil JOIN gorev.talepler t ON t.id = c.cakisan_talep_id ORDER BY c.tarih
            FOR XML PATH(N''), TYPE).value('.', 'NVARCHAR(MAX)'), 1, 2, N''), N'');
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW 50030, @mesaj, 1;
    END;

    DECLARE @cikarilan INT = (SELECT COUNT(*) FROM #cak);
    IF @cikarilan > 0
    BEGIN
        UPDATE a SET durum = 'CIKARILDI', cikaran_hesap = ORIGINAL_LOGIN(), cikarma_tarihi = SYSDATETIME(),
                     cikarma_nedeni = LEFT(N'Yönetici başka göreve atadı: ' + @kod, 300), cikaran_talep_id = @talep_id
        FROM gorev.atamalar a JOIN #cak c ON c.atama_id = a.id;
        INSERT INTO gorev.bildirimler (sicil_no, tur, mesaj, talep_id)
        SELECT t.sorumlu_sicil_no, 'CIKARILDI',
               LEFT(t.kod + N': ' + STUFF((SELECT N', ' + p.adi_soyadi + N' ' + CONVERT(CHAR(10), c2.tarih, 104) FROM #cak c2 JOIN gorev.atamalar a2 ON a2.id = c2.atama_id
                    JOIN gorev.personel p ON p.sicil_no = c2.sicil WHERE a2.talep_id = t.id ORDER BY c2.tarih FOR XML PATH(N''), TYPE).value('.', 'NVARCHAR(MAX)'), 1, 2, N'')
                    + N' görevden çıkarıldı (Yönetici başka göreve atadı: ' + @kod + N').', 500), t.id
        FROM gorev.talepler t WHERE t.id IN (SELECT cakisan_talep_id FROM #cak);
        UPDATE t SET durum = gorev.fn_talep_durum(t.id), guncelleme = SYSDATETIME()
        FROM gorev.talepler t WHERE t.id IN (SELECT cakisan_talep_id FROM #cak) AND t.durum IN ('ONAY_BEKLIYOR','KISMEN_ATANDI','TAMAMEN_ATANDI');
        INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti)
        SELECT N'ATAMA_CIKAR', N'atamalar', CAST(c.atama_id AS NVARCHAR(60)), LEFT(CONCAT(c.sicil, N' ', CONVERT(CHAR(10), c.tarih, 23), N' talep ', c.cakisan_talep_id, N' -> ', @kod), 400) FROM #cak c;
    END;

    INSERT INTO gorev.atamalar (talep_id, sicil_no, tarih, zaman_dilimi) SELECT @talep_id, sicil, tarih, zaman FROM #n;
    DECLARE @eklenen INT = @@ROWCOUNT;
    DECLARE @yeni_durum VARCHAR(20) = gorev.fn_talep_durum(@talep_id);
    UPDATE gorev.talepler SET durum = @yeni_durum, guncelleme = SYSDATETIME() WHERE id = @talep_id;
    INSERT INTO gorev.bildirimler (sicil_no, tur, mesaj, talep_id)
    VALUES (@sorumlu, 'ATANDI', LEFT(CONCAT(@kod, N': ', @eklenen, N' kişi-gün ataması yapıldı (', CASE WHEN @yeni_durum = 'TAMAMEN_ATANDI' THEN N'tamamen atandı' ELSE N'kısmen atandı' END, N').'), 500), @talep_id);
    INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti)
    VALUES (N'TALEP_ATAMA', N'talepler', CAST(@talep_id AS NVARCHAR(60)), LEFT(CONCAT(@kod, N' atama ', @eklenen, N', çıkarılan ', @cikarilan, N', durum ', @yeni_durum), 400));

    DECLARE @tatil INT = (SELECT COUNT(DISTINCT x.tarih) FROM #n x JOIN gorev.takvim_tatil t ON x.tarih BETWEEN t.baslangic AND t.bitis
                          AND NOT (t.zaman_dilimi <> 'TAM' AND x.zaman <> 'TAM' AND t.zaman_dilimi <> x.zaman));
    COMMIT TRANSACTION;
    SELECT @talep_id AS talep_id, @yeni_durum AS durum, @eklenen AS atanan, @cikarilan AS cikarilan,
           CASE WHEN @tatil > 0 THEN CONCAT(@tatil, N' gün tatil/kapalı gün kaydıyla çakışıyor.') ELSE NULL END AS uyari;
END;
GO

-- Talebi reddet: ret nedeni zorunlu; yalnız henüz atama yapılmamış (ONAY_BEKLIYOR) talepte.
CREATE OR ALTER PROCEDURE gorev.sp_talep_reddet
    @id INT,
    @neden NVARCHAR(300)
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    IF gorev.fn_yonetici_mi() = 0 THROW 50023, N'Talebi yalnız Merkez Yönetici reddeder.', 1;
    SET @neden = LTRIM(RTRIM(ISNULL(@neden, N'')));
    IF LEN(@neden) < 3 THROW 50024, N'Ret nedeni zorunludur (en az 3 karakter).', 1;
    BEGIN TRANSACTION;
    DECLARE @durum VARCHAR(20), @kod NVARCHAR(20), @sorumlu NVARCHAR(50);
    SELECT @durum = durum, @kod = kod, @sorumlu = sorumlu_sicil_no FROM gorev.talepler WITH (UPDLOCK) WHERE id = @id;
    IF @@ROWCOUNT = 0 THROW 50024, N'Talep bulunamadı.', 1;
    IF @durum <> 'ONAY_BEKLIYOR' THROW 50024, N'Yalnızca onay bekleyen talep reddedilir (atama başladıysa iptal Dilim 8''dedir).', 1;
    UPDATE gorev.talepler SET durum = 'REDDEDILDI', ret_nedeni = @neden, guncelleme = SYSDATETIME() WHERE id = @id;
    INSERT INTO gorev.bildirimler (sicil_no, tur, mesaj, talep_id) VALUES (@sorumlu, 'REDDEDILDI', LEFT(CONCAT(@kod, N' reddedildi: ', @neden), 500), @id);
    INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti) VALUES (N'TALEP_RED', N'talepler', CAST(@id AS NVARCHAR(60)), LEFT(CONCAT(@kod, N': ', @neden), 400));
    COMMIT TRANSACTION;
END;
GO

-- Kişinin kendi bildirimleri (varsayılan: okunmamışlar).
CREATE OR ALTER PROCEDURE gorev.sp_bildirim_listele
    @sadece_okunmamis BIT = 1
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @ben NVARCHAR(50) = gorev.fn_ben_sicil();
    IF @ben IS NULL BEGIN SELECT TOP (0) id, tur, mesaj, talep_id FROM gorev.bildirimler; RETURN; END;
    SELECT TOP (100) id, tur, mesaj, talep_id, CONVERT(CHAR(16), olusturma, 120) AS tarih, okundu
    FROM gorev.bildirimler WHERE sicil_no = @ben AND (@sadece_okunmamis = 0 OR okundu = 0) ORDER BY id DESC;
END;
GO

CREATE OR ALTER PROCEDURE gorev.sp_bildirim_okundu
    @id INT = NULL
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @ben NVARCHAR(50) = gorev.fn_ben_sicil();
    IF @ben IS NULL RETURN;
    UPDATE gorev.bildirimler SET okundu = 1 WHERE sicil_no = @ben AND okundu = 0 AND (@id IS NULL OR id = @id);
END;
GO

-- Talep listesi ve ayrıntısı: atama bilgileri ve ret nedeniyle yeniden tanımlandı (006 sürümünün genişletilmişi).
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
    WHERE (@durum IS NULL OR t.durum = @durum) AND (@yon = 1 OR t.sorumlu_sicil_no = @ben)
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
    IF @yon = 0 AND NOT EXISTS (SELECT 1 FROM gorev.talepler WHERE id = @id AND sorumlu_sicil_no = @ben) THROW 50023, N'Yalnızca kendi talebinizi görebilirsiniz.', 1;
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

-- Şema kaydı
INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti)
VALUES (N'SEMA', N'sema_surumleri', N'7', N'007_atama uygulandı');
GO
