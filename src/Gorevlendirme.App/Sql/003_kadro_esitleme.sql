-- 003_kadro_esitleme: Özlük kadrosunu gorev.personel'e eşitler (KESİN KURAL: dbo'ya yazılmaz).
-- dbo okuması yalnız bu dosyada ve yalnız "INSERT #geçici ... SELECT/EXEC" biçimindedir (tools/dbo_koruma.py denetler).
-- Yordam ÇAĞIRAN BAĞLAMINDA çalışır (EXECUTE AS yok): Özlük satır düzeyi güvenliği çağıranın kapsamıyla uygulanır.
-- gorev tablolarına yazma sahiplik zinciriyle gider (çağıranın gorev tablolarında doğrudan yetkisi yoktur). SINANMADI.

CREATE OR ALTER PROCEDURE gorev.sp_ozluk_esitle
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    IF gorev.fn_yonetici_mi() = 0 THROW 50023, N'Bu işlem için Merkez Yönetici yetkisi gerekir.', 1;

    CREATE TABLE #ben (
        hesap NVARCHAR(256) COLLATE DATABASE_DEFAULT NULL, ad NVARCHAR(500) COLLATE DATABASE_DEFAULT NULL,
        rol NVARCHAR(100) COLLATE DATABASE_DEFAULT NULL, kapsam_org_id INT NULL, aktif BIT NULL, kayitli BIT NULL,
        yetkiler NVARCHAR(MAX) COLLATE DATABASE_DEFAULT NULL, kapali BIT NULL, kapali_mesaj NVARCHAR(MAX) COLLATE DATABASE_DEFAULT NULL);
    INSERT INTO #ben (hesap, ad, rol, kapsam_org_id, aktif, kayitli, yetkiler, kapali, kapali_mesaj) EXEC dbo.sp_ben;

    -- Özlük'te tüm kadroyu görebilen biri olmalı: Yönetici ya da tüm kurum kapsamlı İK/Görüntüleyici.
    IF NOT EXISTS (SELECT 1 FROM #ben WHERE kayitli = 1 AND aktif = 1
                     AND (rol = N'yonetici' OR (rol IN (N'ik', N'goruntuleyici') AND kapsam_org_id IS NULL)))
        THROW 50022, N'Kadro eşitleme için Özlük''te Yönetici ya da tüm kurum kapsamlı kullanıcı olmalısınız.', 1;

    CREATE TABLE #ozluk (
        sicil_no NVARCHAR(50) COLLATE DATABASE_DEFAULT NOT NULL, adi_soyadi NVARCHAR(200) COLLATE DATABASE_DEFAULT NOT NULL,
        bolum NVARCHAR(500) COLLATE DATABASE_DEFAULT NULL, gsm_no NVARCHAR(50) COLLATE DATABASE_DEFAULT NULL,
        kullanici_adi NVARCHAR(100) COLLATE DATABASE_DEFAULT NULL, ayrilis_tarihi DATE NULL);
    INSERT INTO #ozluk (sicil_no, adi_soyadi, bolum, gsm_no, kullanici_adi, ayrilis_tarihi)
    SELECT sicil_no, adi_soyadi, bolum, gsm_no, kullanici_adi, ayrilis_tarihi FROM dbo.personeller;

    -- Güvenlik kapısı: eksik okuma (dar kapsam, filtre) kadroyu yanlışlıkla pasife almasın.
    DECLARE @okunan INT = (SELECT COUNT(*) FROM #ozluk);
    DECLARE @mevcut INT = (SELECT COUNT(*) FROM gorev.personel WHERE aktif = 1);
    DECLARE @m NVARCHAR(400);
    IF @okunan = 0 THROW 50021, N'Özlük''ten hiç satır okunamadı; eşitleme iptal edildi.', 1;
    IF @mevcut > 0 AND @okunan * 10 < @mevcut * 8
    BEGIN
        SET @m = CONCAT(N'Özlük''ten okunan satır sayısı (', @okunan, N') mevcut aktif kadronun (', @mevcut,
                        N') %80''inin altında; eşitleme iptal edildi (Özlük kapsamınız dar olabilir).');
        THROW 50021, @m, 1;
    END;

    CREATE TABLE #sonuc (islem NVARCHAR(10) COLLATE DATABASE_DEFAULT NOT NULL, kaynak_sicil NVARCHAR(50) COLLATE DATABASE_DEFAULT NULL);

    BEGIN TRANSACTION;
    MERGE gorev.personel AS t
    USING (SELECT sicil_no, adi_soyadi, bolum, gsm_no, kullanici_adi, ayrilis_tarihi,
                  CAST(CASE WHEN ayrilis_tarihi IS NULL OR ayrilis_tarihi > CAST(SYSDATETIME() AS DATE) THEN 1 ELSE 0 END AS BIT) AS aktif
           FROM #ozluk) AS s
    ON t.sicil_no = s.sicil_no
    WHEN MATCHED AND (t.adi_soyadi <> s.adi_soyadi OR ISNULL(t.bolum, N'') <> ISNULL(s.bolum, N'')
                      OR ISNULL(t.gsm_no, N'') <> ISNULL(s.gsm_no, N'') OR ISNULL(t.kullanici_adi, N'') <> ISNULL(s.kullanici_adi, N'')
                      OR ISNULL(t.ayrilis_tarihi, '19000101') <> ISNULL(s.ayrilis_tarihi, '19000101') OR t.aktif <> s.aktif) THEN
        UPDATE SET adi_soyadi = s.adi_soyadi, bolum = s.bolum, gsm_no = s.gsm_no, kullanici_adi = s.kullanici_adi,
                   ayrilis_tarihi = s.ayrilis_tarihi, aktif = s.aktif, guncelleme = SYSDATETIME()
    WHEN NOT MATCHED BY TARGET THEN
        INSERT (sicil_no, adi_soyadi, bolum, gsm_no, kullanici_adi, ayrilis_tarihi, aktif)
        VALUES (s.sicil_no, s.adi_soyadi, s.bolum, s.gsm_no, s.kullanici_adi, s.ayrilis_tarihi, s.aktif)
    -- Hiçbir şey silinmez: Özlük'te artık görünmeyen aktif kişi yalnızca pasife alınır.
    WHEN NOT MATCHED BY SOURCE AND t.aktif = 1 THEN
        UPDATE SET aktif = 0, guncelleme = SYSDATETIME()
    OUTPUT $action, s.sicil_no INTO #sonuc (islem, kaynak_sicil);

    DECLARE @eklenen INT = (SELECT COUNT(*) FROM #sonuc WHERE islem = N'INSERT');
    DECLARE @pasif INT = (SELECT COUNT(*) FROM #sonuc WHERE islem = N'UPDATE' AND kaynak_sicil IS NULL);
    DECLARE @guncellenen INT = (SELECT COUNT(*) FROM #sonuc WHERE islem = N'UPDATE' AND kaynak_sicil IS NOT NULL);
    DECLARE @degismeyen INT = @okunan - @eklenen - @guncellenen;

    INSERT INTO gorev.islem_log (islem, nesne, ayrinti)
    VALUES (N'KADRO_ESITLE', N'personel',
            CONCAT(N'{"okunan":', @okunan, N',"eklenen":', @eklenen, N',"guncellenen":', @guncellenen,
                   N',"pasife_alinan":', @pasif, N',"degismeyen":', @degismeyen, N'}'));
    COMMIT TRANSACTION;

    SELECT @okunan AS okunan, @eklenen AS eklenen, @guncellenen AS guncellenen, @pasif AS pasife_alinan, @degismeyen AS degismeyen;
END;
GO

INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti)
VALUES (N'SEMA', N'sema_surumleri', N'3', N'003_kadro_esitleme uygulandı');
GO
