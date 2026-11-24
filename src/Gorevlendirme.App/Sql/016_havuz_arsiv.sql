-- 016_havuz_arsiv: Proje/Görev Havuzu'na ARŞİV durumu (reddedilen / geçerliliğini yitiren tanım; nedeniyle). Dilim 15.
-- Pasif = tamamlandı (analiz ve raporlarda görünür, yeni talep listelerinde gizli); Arşiv = pasif + arsiv bayrağı + neden.
-- Yalnızca gorev nesneleri; dbo'ya dokunmaz. Mevcut kayıtlar etkilenmez (arsiv=0). SINANMADI (CI'da SQL testi çalışır).
ALTER TABLE gorev.proje_havuzu ADD
    arsiv       BIT NOT NULL CONSTRAINT DF_proje_havuzu_arsiv DEFAULT 0,
    arsiv_neden NVARCHAR(300) NULL,
    arsiv_tarih DATETIME2(0) NULL;
GO

CREATE OR ALTER PROCEDURE gorev.sp_havuz_listele
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    IF gorev.fn_kayitli_mi() = 0 THROW 50023, N'Bu işlem için yetkiniz yok.', 1;
    SELECT id, ust_id, seviye, ad, aktif, birlestirildi_id, olusturma, arsiv, arsiv_neden, arsiv_tarih
    FROM gorev.proje_havuzu
    ORDER BY seviye, ad;
END;
GO

CREATE OR ALTER PROCEDURE gorev.sp_havuz_durum
    @id    INT,
    @aktif BIT
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
    IF gorev.fn_yonetici_mi() = 0 THROW 50023, N'Bu işlem için Merkez Yönetici yetkisi gerekir.', 1;
    BEGIN TRANSACTION;
    DECLARE @ust INT, @bir INT, @ars BIT;
    SELECT @ust = ust_id, @bir = birlestirildi_id, @ars = arsiv FROM gorev.proje_havuzu WHERE id = @id;
    IF @@ROWCOUNT = 0 THROW 50024, N'Kayıt bulunamadı.', 1;
    IF @bir IS NOT NULL THROW 50024, N'Birleştirilmiş kayıt etkinleştirilemez ya da değiştirilemez.', 1;
    DECLARE @etkilenen INT;
    IF @aktif = 1
    BEGIN
        IF @ars = 1 THROW 50024, N'Kayıt arşivde; önce arşivden çıkarın.', 1;
        IF @ust IS NOT NULL AND NOT EXISTS (SELECT 1 FROM gorev.proje_havuzu WHERE id = @ust AND aktif = 1)
            THROW 50024, N'Üst kayıt pasif; önce üst kaydı etkinleştirin.', 1;
        UPDATE gorev.proje_havuzu SET aktif = 1, guncelleme = SYSDATETIME() WHERE id = @id AND aktif = 0;
        SET @etkilenen = @@ROWCOUNT;
    END
    ELSE
    BEGIN
        ;WITH alt AS (
            SELECT id FROM gorev.proje_havuzu WHERE id = @id
            UNION ALL
            SELECT c.id FROM gorev.proje_havuzu c JOIN alt a ON c.ust_id = a.id
        )
        UPDATE h SET aktif = 0, guncelleme = SYSDATETIME()
        FROM gorev.proje_havuzu h JOIN alt a ON a.id = h.id
        WHERE h.aktif = 1;
        SET @etkilenen = @@ROWCOUNT;
    END;
    INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti)
    VALUES (CASE WHEN @aktif = 1 THEN N'HAVUZ_AKTIF' ELSE N'HAVUZ_PASIF' END, N'proje_havuzu', CAST(@id AS NVARCHAR(60)), CONCAT(N'etkilenen=', @etkilenen));
    COMMIT TRANSACTION;
    SELECT @etkilenen AS etkilenen;
END;
GO

-- Arşivle / arşivden çıkar. Arşivleme kaydı ve altındakileri pasife alır ve arsiv=1 yapar (neden zorunlu); hiçbir şey silinmez.
-- Arşivden çıkarma yalnız arşiv bayrağını kaldırır; kayıt pasif kalır, etkinleştirmek ayrı işlemdir (sp_havuz_durum).
CREATE OR ALTER PROCEDURE gorev.sp_havuz_arsivle
    @id     INT,
    @arsiv  BIT,
    @neden  NVARCHAR(300) = NULL
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
    IF gorev.fn_yonetici_mi() = 0 THROW 50023, N'Bu işlem için Merkez Yönetici yetkisi gerekir.', 1;
    SET @neden = LTRIM(RTRIM(@neden));
    IF @arsiv = 1 AND (@neden IS NULL OR LEN(@neden) = 0) THROW 50024, N'Arşivleme nedeni zorunludur.', 1;
    BEGIN TRANSACTION;
    DECLARE @bir INT;
    SELECT @bir = birlestirildi_id FROM gorev.proje_havuzu WHERE id = @id;
    IF @@ROWCOUNT = 0 THROW 50024, N'Kayıt bulunamadı.', 1;
    IF @bir IS NOT NULL THROW 50024, N'Birleştirilmiş kayıt arşivlenemez ya da değiştirilemez.', 1;
    DECLARE @etkilenen INT;
    ;WITH alt AS (
        SELECT id FROM gorev.proje_havuzu WHERE id = @id
        UNION ALL
        SELECT c.id FROM gorev.proje_havuzu c JOIN alt a ON c.ust_id = a.id
    )
    UPDATE h SET
        aktif = CASE WHEN @arsiv = 1 THEN 0 ELSE h.aktif END,
        arsiv = @arsiv,
        arsiv_neden = CASE WHEN @arsiv = 1 THEN @neden ELSE NULL END,
        arsiv_tarih = CASE WHEN @arsiv = 1 THEN SYSDATETIME() ELSE NULL END,
        guncelleme = SYSDATETIME()
    FROM gorev.proje_havuzu h JOIN alt a ON a.id = h.id
    WHERE h.arsiv <> @arsiv;
    SET @etkilenen = @@ROWCOUNT;
    INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti)
    VALUES (CASE WHEN @arsiv = 1 THEN N'HAVUZ_ARSIV' ELSE N'HAVUZ_ARSIVDEN_CIKAR' END, N'proje_havuzu', CAST(@id AS NVARCHAR(60)), CONCAT(N'etkilenen=', @etkilenen, CASE WHEN @arsiv = 1 THEN CONCAT(N'; neden=', @neden) ELSE N'' END));
    COMMIT TRANSACTION;
    SELECT @etkilenen AS etkilenen;
END;
GO

INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti) VALUES (N'SEMA', N'sema_surumleri', N'16', N'016_havuz_arsiv.sql uygulandı');
GO
