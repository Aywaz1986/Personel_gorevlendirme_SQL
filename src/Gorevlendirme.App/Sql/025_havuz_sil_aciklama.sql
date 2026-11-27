-- 025: Havuz silme: eski geçmiş görev bağlantısı kopar (ad korunur), engel nedeni açıkça yazılır (Dilim 30). SINANMADI (CI SqlTests).
--  * gecmis_gorev (eski araçtan taşınan kayıtlar) silmeyi engellemez: havuz_id NULL'a çekilir, proje adı proje_adi_eski'de saklanır.
--  * Alt dalda (pasif / birleştirilmiş gizli kayıtlar dahil) talep kaydı varsa silinmez; mesaj kaç talep olduğunu ve kodlarını söyler.
CREATE OR ALTER PROCEDURE gorev.sp_havuz_sil
    @id INT
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
    IF gorev.fn_yonetici_mi() = 0 THROW 50023, N'Bu işlem için Merkez Yönetici yetkisi gerekir.', 1;
    BEGIN TRANSACTION;
    DECLARE @ad NVARCHAR(300), @bir INT;
    SELECT @ad = ad, @bir = birlestirildi_id FROM gorev.proje_havuzu WHERE id = @id;
    IF @@ROWCOUNT = 0 THROW 50024, N'Kayıt bulunamadı.', 1;
    IF @bir IS NOT NULL THROW 50024, N'Birleştirilmiş kayıt tek başına silinemez.', 1;
    CREATE TABLE #sil (id INT NOT NULL PRIMARY KEY);
    INSERT INTO #sil VALUES (@id);
    DECLARE @n INT = 1, @onceki INT = 0, @tur INT = 0;
    WHILE @n <> @onceki AND @tur < 12
    BEGIN
        SET @onceki = @n; SET @tur += 1;
        INSERT INTO #sil (id) SELECT DISTINCT c.id FROM gorev.proje_havuzu c WHERE (c.ust_id IN (SELECT id FROM #sil) OR c.birlestirildi_id IN (SELECT id FROM #sil)) AND c.id NOT IN (SELECT id FROM #sil);
        SELECT @n = COUNT(*) FROM #sil;
    END;
    DECLARE @adet INT = (SELECT COUNT(*) FROM #sil);
    DECLARE @talep INT = (SELECT COUNT(*) FROM gorev.talepler WHERE havuz_id IN (SELECT id FROM #sil));
    IF @talep > 0
    BEGIN
        DECLARE @kodlar NVARCHAR(200) = STUFF((SELECT TOP (4) N', ' + t.kod FROM gorev.talepler t WHERE t.havuz_id IN (SELECT id FROM #sil) ORDER BY t.id FOR XML PATH(N''), TYPE).value(N'.', N'NVARCHAR(200)'), 1, 2, N'');
        DECLARE @msg NVARCHAR(500) = CONCAT(N'Silinemez: bu kayıtta/alt dalında (', @adet - 1, N' alt kayıt, pasif ve birleştirilmiş olanlar dahil) ', @talep, N' görev talebi bağlı (', @kodlar, CASE WHEN @talep > 4 THEN N' …' ELSE N'' END, N'). Efor 0 olsa da talep geçmişi korunur; pasife alın.');
        THROW 50024, @msg, 1;
    END;
    UPDATE g SET proje_adi_eski = ISNULL(g.proje_adi_eski, LEFT(h.ad, 300)), havuz_id = NULL
      FROM gorev.gecmis_gorev g JOIN gorev.proje_havuzu h ON h.id = g.havuz_id WHERE g.havuz_id IN (SELECT id FROM #sil);
    DECLARE @gecmis INT = @@ROWCOUNT;
    DELETE h FROM gorev.proje_havuzu h WHERE h.id IN (SELECT id FROM #sil) AND h.seviye = 4;
    DELETE h FROM gorev.proje_havuzu h WHERE h.id IN (SELECT id FROM #sil) AND h.seviye = 3;
    DELETE h FROM gorev.proje_havuzu h WHERE h.id IN (SELECT id FROM #sil) AND h.seviye = 2;
    DELETE h FROM gorev.proje_havuzu h WHERE h.id IN (SELECT id FROM #sil) AND h.seviye = 1;
    IF EXISTS (SELECT 1 FROM gorev.proje_havuzu WHERE id IN (SELECT id FROM #sil)) THROW 50024, N'Kayıt bağlı kayıtlar nedeniyle silinemedi; pasife alın.', 1;
    INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti) VALUES (N'HAVUZ_SIL', N'proje_havuzu', CAST(@id AS NVARCHAR(60)), LEFT(CONCAT(@ad, N'; silinen=', @adet, N' gecmis_baglanti_koparilan=', @gecmis), 200));
    COMMIT TRANSACTION;
    SELECT @adet AS silinen;
END;
GO

INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti) VALUES (N'SEMA', N'sema_surumleri', N'25', N'Havuz silme: geçmiş görev bağı koparılır, engel nedeni açık');
