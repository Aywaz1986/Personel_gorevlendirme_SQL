-- 020: Proje havuzunda kayıt taşıma. Yapraklar (Yerleşke, seviye 4) hiçbir taşımada seviye değiştirmez; talepler/atamalar bozulmaz.
--  * Alt Proje -> başka Ana Proje altına; Faaliyet -> başka Alt Proje altına ya da doğrudan Ana Proje altına ("Genel" aracı kayıt otomatik); Yerleşke -> başka Faaliyet altına
--  * Ana Proje -> başka Ana Projenin Alt Projesi (yalnız gerçek alt projesi yoksa; "Genel" araçları çözülür)
--  * Alt Proje -> Ana Proje olarak (@yeni_ust_id NULL; faaliyetleri "Genel" aracının altına alınır)
CREATE OR ALTER PROCEDURE gorev.sp_havuz_tasi
    @id          INT,
    @yeni_ust_id INT = NULL
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
    IF gorev.fn_yonetici_mi() = 0 THROW 50023, N'Bu işlem için Merkez Yönetici yetkisi gerekir.', 1;
    DECLARE @s TINYINT, @ust INT, @ad NVARCHAR(300), @bir INT, @ts TINYINT, @t_aktif BIT, @t_bir INT, @hedef INT, @g INT, @sayi INT = 0;
    BEGIN TRANSACTION;
    SELECT @s = seviye, @ust = ust_id, @ad = ad, @bir = birlestirildi_id FROM gorev.proje_havuzu WHERE id = @id;
    IF @@ROWCOUNT = 0 THROW 50024, N'Kayıt bulunamadı.', 1;
    IF @bir IS NOT NULL THROW 50024, N'Birleştirilmiş kayıt taşınamaz.', 1;
    IF ISNULL(@yeni_ust_id, 0) = ISNULL(@ust, 0) THROW 50024, N'Kayıt zaten bu üst kaydın altında.', 1;

    IF @yeni_ust_id IS NULL
    BEGIN
        IF @s <> 2 THROW 50024, N'Yalnız Alt Proje, Ana Proje olarak yukarı taşınabilir.', 1;
        INSERT INTO gorev.proje_havuzu (ust_id, seviye, ad, kaynak) VALUES (@id, 2, N'Genel', N'TASI');
        SET @g = SCOPE_IDENTITY();
        UPDATE gorev.proje_havuzu SET ust_id = @g, guncelleme = SYSDATETIME() WHERE ust_id = @id AND id <> @g;
        IF EXISTS (SELECT 1 FROM gorev.proje_havuzu WHERE ust_id IS NULL AND ad = @ad AND id <> @id) THROW 50024, N'Aynı adlı bir Ana Proje zaten var; önce birleştirin.', 1;
        UPDATE gorev.proje_havuzu SET ust_id = NULL, seviye = 1, guncelleme = SYSDATETIME() WHERE id = @id;
        SET @sayi = 1;
    END
    ELSE
    BEGIN
        SELECT @ts = seviye, @t_aktif = aktif, @t_bir = birlestirildi_id FROM gorev.proje_havuzu WHERE id = @yeni_ust_id;
        IF @@ROWCOUNT = 0 THROW 50024, N'Hedef kayıt bulunamadı.', 1;
        IF @t_bir IS NOT NULL OR @t_aktif = 0 THROW 50024, N'Hedef kayıt pasif ya da birleştirilmiş; aktif bir kayıt seçin.', 1;
        DECLARE @c INT = @yeni_ust_id, @adim INT = 0;
        WHILE @c IS NOT NULL AND @adim < 10
        BEGIN
            IF @c = @id THROW 50024, N'Kayıt kendi alt dalına taşınamaz.', 1;
            SELECT @c = ust_id FROM gorev.proje_havuzu WHERE id = @c;
            SET @adim += 1;
        END;
        SET @hedef = @yeni_ust_id;

        IF @s = 1
        BEGIN
            IF @ts <> 1 THROW 50024, N'Ana Proje yalnız başka bir Ana Projenin altına (Alt Proje olarak) taşınabilir.', 1;
            IF EXISTS (SELECT 1 FROM gorev.proje_havuzu WHERE ust_id = @id AND seviye = 2 AND ad <> N'Genel')
                THROW 50024, N'Bu Ana Projenin alt projeleri var; önce alt projelerini başka yere taşıyın (ya da birleştirin).', 1;
            -- "Genel" araçlarını çöz: faaliyetler doğrudan taşınan kaydın (artık Alt Proje) altına
            UPDATE f SET ust_id = @id, guncelleme = SYSDATETIME() FROM gorev.proje_havuzu f JOIN gorev.proje_havuzu g ON g.id = f.ust_id WHERE g.ust_id = @id AND g.seviye = 2 AND g.ad = N'Genel';
            DELETE FROM gorev.proje_havuzu WHERE ust_id = @id AND seviye = 2 AND ad = N'Genel'
                AND NOT EXISTS (SELECT 1 FROM gorev.proje_havuzu c WHERE c.ust_id = proje_havuzu.id OR c.birlestirildi_id = proje_havuzu.id);
            IF EXISTS (SELECT 1 FROM gorev.proje_havuzu WHERE ust_id = @id AND seviye = 2) THROW 50024, N'"Genel" kaydı bağlı kayıtlar nedeniyle çözülemedi.', 1;
            IF EXISTS (SELECT 1 FROM gorev.proje_havuzu WHERE ust_id = @yeni_ust_id AND ad = @ad) THROW 50024, N'Hedef Ana Projede aynı adlı bir Alt Proje var; önce birleştirin.', 1;
            UPDATE gorev.proje_havuzu SET ust_id = @yeni_ust_id, seviye = 2, guncelleme = SYSDATETIME() WHERE id = @id;
            SET @sayi = 1;
        END
        ELSE
        BEGIN
            IF @s = 3 AND @ts = 1
            BEGIN
                SELECT TOP (1) @g = id FROM gorev.proje_havuzu WHERE ust_id = @yeni_ust_id AND seviye = 2 AND ad = N'Genel' AND birlestirildi_id IS NULL;
                IF @g IS NULL
                BEGIN
                    INSERT INTO gorev.proje_havuzu (ust_id, seviye, ad, kaynak) VALUES (@yeni_ust_id, 2, N'Genel', N'TASI');
                    SET @g = SCOPE_IDENTITY();
                END;
                SET @hedef = @g; SET @ts = 2;
            END;
            IF @ts + 1 <> @s THROW 50024, N'Bu kayıt seçilen hedefin altına taşınamaz (seviye uyuşmuyor).', 1;
            IF EXISTS (SELECT 1 FROM gorev.proje_havuzu WHERE ust_id = @hedef AND ad = @ad AND id <> @id) THROW 50024, N'Hedefte aynı adlı bir kayıt var; önce birleştirin.', 1;
            UPDATE gorev.proje_havuzu SET ust_id = @hedef, guncelleme = SYSDATETIME() WHERE id = @id;
            SET @sayi = 1;
        END;
    END;
    INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti)
    VALUES (N'HAVUZ_TASI', N'proje_havuzu', CAST(@id AS NVARCHAR(60)), LEFT(CONCAT(@ad, N' → ', ISNULL(CAST(@yeni_ust_id AS NVARCHAR(20)), N'(Ana Proje)')), 200));
    COMMIT TRANSACTION;
    SELECT @sayi AS tasinan;
END;
GO

INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti) VALUES (N'SEMA', N'sema_surumleri', N'20', N'Havuz: kayıt taşıma (sp_havuz_tasi)');
