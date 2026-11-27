-- 023: Atanmış talepte proje bağlamı değiştirme (Dilim 28). SINANMADI (CI SqlTests).
--  * sp_talep_proje_degistir (yeni): Yönetici; KISMEN_ATANDI / TAMAMEN_ATANDI talepte Ana Proje › Alt Proje › Faaliyet › Yerleşke yolunu değiştirir.
--    Yol adlarla çözülür; olmayan düğüm havuzda oluşturulur; pasif ya da birleştirilmiş düğüm reddedilir. Atamalar ve günler korunur; efor yeni yolda sayılır.
CREATE OR ALTER PROCEDURE gorev.sp_talep_proje_degistir
    @talep_id INT,
    @ana      NVARCHAR(300),
    @alt      NVARCHAR(300) = NULL,
    @faaliyet NVARCHAR(300),
    @konum    NVARCHAR(300),
    @neden    NVARCHAR(300) = NULL
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
    IF gorev.fn_yonetici_mi() = 0 THROW 50023, N'Bu işlem için Merkez Yönetici yetkisi gerekir.', 1;
    SET @ana = LTRIM(RTRIM(ISNULL(@ana, N'')));
    SET @alt = LTRIM(RTRIM(ISNULL(@alt, N'')));
    IF LEN(@alt) = 0 SET @alt = N'Genel';
    SET @faaliyet = LTRIM(RTRIM(ISNULL(@faaliyet, N'')));
    SET @konum = LTRIM(RTRIM(ISNULL(@konum, N'')));
    SET @neden = NULLIF(LTRIM(RTRIM(ISNULL(@neden, N''))), N'');
    IF LEN(@ana) = 0 OR LEN(@faaliyet) = 0 OR LEN(@konum) = 0 THROW 50024, N'Ana Proje, Faaliyet ve Yerleşke boş olamaz.', 1;
    IF LEN(@ana) > 300 OR LEN(@alt) > 300 OR LEN(@faaliyet) > 300 OR LEN(@konum) > 300 THROW 50024, N'Proje adları 300 karakteri geçemez.', 1;

    BEGIN TRANSACTION;
    DECLARE @durum VARCHAR(20), @eski INT, @kod NVARCHAR(30), @sahip NVARCHAR(50);
    SELECT @durum = durum, @eski = havuz_id, @kod = kod, @sahip = sorumlu_sicil_no FROM gorev.talepler WITH (UPDLOCK) WHERE id = @talep_id;
    IF @@ROWCOUNT = 0 THROW 50024, N'Talep bulunamadı.', 1;
    IF @durum NOT IN ('KISMEN_ATANDI','TAMAMEN_ATANDI') THROW 50024, N'Yalnız atama yapılmış talepte proje bağlamı değiştirilir (bekleyen talep doğrudan düzenlenir).', 1;

    DECLARE @ad TABLE (seviye TINYINT PRIMARY KEY, ad NVARCHAR(300) NOT NULL);
    INSERT INTO @ad VALUES (1, @ana), (2, @alt), (3, @faaliyet), (4, @konum);
    DECLARE @lv TINYINT = 1, @isim NVARCHAR(300), @ust INT = NULL, @cur INT, @akt BIT, @bi INT;
    WHILE @lv <= 4
    BEGIN
        SELECT @isim = ad FROM @ad WHERE seviye = @lv;
        SET @cur = NULL;
        SELECT @cur = id, @akt = aktif, @bi = birlestirildi_id FROM gorev.proje_havuzu WHERE ISNULL(ust_id, 0) = ISNULL(@ust, 0) AND ad = @isim;
        IF @cur IS NOT NULL AND @bi IS NOT NULL THROW 50024, N'Bu proje adı havuzda birleştirilmiş; birleştirilen hedef adı kullanın.', 1;
        IF @cur IS NOT NULL AND @akt = 0 THROW 50024, N'Bu proje adı havuzda pasif; önce etkinleştirin.', 1;
        IF @cur IS NULL
        BEGIN
            INSERT INTO gorev.proje_havuzu (ust_id, seviye, ad, kaynak) VALUES (@ust, @lv, @isim, N'TALEP');
            SET @cur = SCOPE_IDENTITY();
            INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti) VALUES (N'HAVUZ_EKLE', N'proje_havuzu', CAST(@cur AS NVARCHAR(60)), LEFT(CONCAT(N'talepten: ', @isim), 200));
        END;
        SET @ust = @cur;
        SET @lv += 1;
    END;
    IF @ust = @eski THROW 50024, N'Proje bağlamı zaten bu yolda; değişiklik yok.', 1;

    UPDATE gorev.talepler SET havuz_id = @ust, guncelleme = SYSDATETIME() WHERE id = @talep_id;

    INSERT INTO gorev.bildirimler (sicil_no, tur, mesaj, talep_id)
    SELECT DISTINCT a.sicil_no, 'PROJE_DEGISTI', LEFT(@kod + N' görevinin proje bağlamı Yönetici tarafından değiştirildi: ' + @ana + N' › ' + @faaliyet + N' › ' + @konum, 500), @talep_id
    FROM gorev.atamalar a WHERE a.talep_id = @talep_id AND a.durum = 'AKTIF';
    IF ISNULL(gorev.fn_ben_sicil(), N'') <> @sahip
        INSERT INTO gorev.bildirimler (sicil_no, tur, mesaj, talep_id)
        VALUES (@sahip, 'PROJE_DEGISTI', LEFT(@kod + N' talebinizin proje bağlamı Yönetici tarafından değiştirildi: ' + @ana + N' › ' + @faaliyet + N' › ' + @konum, 500), @talep_id);

    INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti)
    VALUES (N'TALEP_PROJE_DEGISTI', N'talepler', CAST(@talep_id AS NVARCHAR(60)), LEFT(CONCAT(@kod, N': ', @eski, N' → ', @ust, N' (', @ana, N' › ', @alt, N' › ', @faaliyet, N' › ', @konum, N')', ISNULL(N' · ' + @neden, N'')), 400));
    COMMIT;
    SELECT @talep_id AS id, @ust AS havuz_id;
END;
GO
INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti) VALUES (N'SEMA', N'sema_surumleri', N'23', N'Atanmış talepte proje bağlamı değiştirme');
