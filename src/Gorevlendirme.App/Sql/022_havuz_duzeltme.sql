-- 022: Havuz düzeltmeleri (Dilim 27). SINANMADI (CI SqlTests).
--  * sp_havuz_birlestir: kaynağa bağlı talepler ve geçmiş görevler (efor) hedefe aktarılır; önceki birleştirmeler hedefe yönlenir.
--  * Onarım: zaten birleştirilmiş kayıtlara bağlı kalmış talep/geçmiş görev bağlantıları hedefe çekilir.
--  * sp_havuz_sil (yeni): efor/talep/geçmiş görev bağı olmayan kayıt (alt dalıyla) kalıcı silinir; bağlı kayıt varsa reddeder (pasife alın).
CREATE OR ALTER PROCEDURE gorev.sp_havuz_birlestir
    @kaynak_id INT,
    @hedef_id  INT
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
    IF gorev.fn_yonetici_mi() = 0 THROW 50023, N'Bu işlem için Merkez Yönetici yetkisi gerekir.', 1;
    IF @kaynak_id = @hedef_id THROW 50024, N'Kaynak ve hedef aynı kayıt olamaz.', 1;
    BEGIN TRANSACTION;
    DECLARE @ks TINYINT, @hs TINYINT, @kb INT, @hb INT, @ha BIT, @kad NVARCHAR(300), @had NVARCHAR(300);
    SELECT @ks = seviye, @kb = birlestirildi_id, @kad = ad FROM gorev.proje_havuzu WHERE id = @kaynak_id;
    IF @@ROWCOUNT = 0 THROW 50024, N'Kaynak kayıt bulunamadı.', 1;
    SELECT @hs = seviye, @hb = birlestirildi_id, @ha = aktif, @had = ad FROM gorev.proje_havuzu WHERE id = @hedef_id;
    IF @@ROWCOUNT = 0 THROW 50024, N'Hedef kayıt bulunamadı.', 1;
    IF @ks <> @hs THROW 50024, N'Yalnızca aynı seviyedeki kayıtlar birleştirilebilir.', 1;
    IF @kb IS NOT NULL OR @hb IS NOT NULL THROW 50024, N'Zaten birleştirilmiş bir kayıt kullanılamaz.', 1;
    IF @ha = 0 THROW 50024, N'Hedef kayıt pasif; önce etkinleştirin.', 1;

    CREATE TABLE #sira (kaynak INT NOT NULL, hedef INT NOT NULL);
    CREATE TABLE #yeni (kaynak INT NOT NULL, hedef INT NOT NULL);
    CREATE TABLE #tum  (kaynak INT NOT NULL PRIMARY KEY, hedef INT NOT NULL);
    DECLARE @tasinan INT = 0, @n INT, @talep INT = 0;
    INSERT INTO #sira VALUES (@kaynak_id, @hedef_id);
    WHILE EXISTS (SELECT 1 FROM #sira)
    BEGIN
        INSERT INTO #tum (kaynak, hedef) SELECT kaynak, hedef FROM #sira;
        DELETE FROM #yeni;
        INSERT INTO #yeni (kaynak, hedef)
        SELECT c.id, t.id
        FROM #sira s
        JOIN gorev.proje_havuzu c ON c.ust_id = s.kaynak
        JOIN gorev.proje_havuzu t ON t.ust_id = s.hedef AND t.ad = c.ad;
        UPDATE c SET ust_id = s.hedef, guncelleme = SYSDATETIME()
        FROM gorev.proje_havuzu c
        JOIN #sira s ON c.ust_id = s.kaynak
        WHERE NOT EXISTS (SELECT 1 FROM #yeni y WHERE y.kaynak = c.id);
        SET @tasinan += @@ROWCOUNT;
        DELETE FROM #sira;
        INSERT INTO #sira (kaynak, hedef) SELECT kaynak, hedef FROM #yeni;
    END;

    -- Efor ve bağlı görev kayıtları kayıpsız hedefe: talepler, geçmiş görevler ve daha önce bu kaynaklara birleştirilmiş kayıtlar
    UPDATE t SET havuz_id = m.hedef FROM gorev.talepler t JOIN #tum m ON m.kaynak = t.havuz_id;
    SET @talep = @@ROWCOUNT;
    UPDATE g SET havuz_id = m.hedef FROM gorev.gecmis_gorev g JOIN #tum m ON m.kaynak = g.havuz_id;
    SET @talep += @@ROWCOUNT;
    UPDATE k SET birlestirildi_id = m.hedef FROM gorev.proje_havuzu k JOIN #tum m ON m.kaynak = k.birlestirildi_id;

    UPDATE h SET aktif = 1, guncelleme = SYSDATETIME()
    FROM gorev.proje_havuzu h
    JOIN #tum t ON t.hedef = h.id
    JOIN gorev.proje_havuzu k ON k.id = t.kaynak
    WHERE k.aktif = 1 AND h.aktif = 0;
    UPDATE k SET aktif = 0, birlestirildi_id = t.hedef, guncelleme = SYSDATETIME()
    FROM gorev.proje_havuzu k JOIN #tum t ON t.kaynak = k.id;
    SELECT @n = COUNT(*) FROM #tum;
    INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti)
    VALUES (N'HAVUZ_BIRLESTIR', N'proje_havuzu', CAST(@kaynak_id AS NVARCHAR(60)),
            LEFT(CONCAT(@kad, N' -> ', @had, N' (hedef id ', @hedef_id, N'); birlesen=', @n, N' tasinan=', @tasinan, N' talep/gecmis=', @talep), 400));
    COMMIT TRANSACTION;
    SELECT @n AS birlesen, @tasinan AS tasinan, @talep AS talep;
END;
GO

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
    -- silinecek küme: kayıt + alt dalı + bunlara birleştirilmiş (boş) kaynaklar
    CREATE TABLE #sil (id INT NOT NULL PRIMARY KEY);
    INSERT INTO #sil VALUES (@id);
    DECLARE @n INT = 1, @onceki INT = 0, @tur INT = 0;
    WHILE @n <> @onceki AND @tur < 12
    BEGIN
        SET @onceki = @n; SET @tur += 1;
        INSERT INTO #sil (id) SELECT DISTINCT c.id FROM gorev.proje_havuzu c WHERE (c.ust_id IN (SELECT id FROM #sil) OR c.birlestirildi_id IN (SELECT id FROM #sil)) AND c.id NOT IN (SELECT id FROM #sil);
        SELECT @n = COUNT(*) FROM #sil;
    END;
    IF EXISTS (SELECT 1 FROM gorev.talepler WHERE havuz_id IN (SELECT id FROM #sil))
        THROW 50024, N'Bu kayda ya da alt dalına bağlı talep kayıtları var (efor 0 olsa da); silinemez. Veri bütünlüğü için pasife alın.', 1;
    IF EXISTS (SELECT 1 FROM gorev.gecmis_gorev WHERE havuz_id IN (SELECT id FROM #sil))
        THROW 50024, N'Bu kayda ya da alt dalına bağlı geçmiş görev (efor) kayıtları var; silinemez. Pasife alın.', 1;
    DECLARE @adet INT = (SELECT COUNT(*) FROM #sil);
    DELETE h FROM gorev.proje_havuzu h WHERE h.id IN (SELECT id FROM #sil) AND h.seviye = 4;
    DELETE h FROM gorev.proje_havuzu h WHERE h.id IN (SELECT id FROM #sil) AND h.seviye = 3;
    DELETE h FROM gorev.proje_havuzu h WHERE h.id IN (SELECT id FROM #sil) AND h.seviye = 2;
    DELETE h FROM gorev.proje_havuzu h WHERE h.id IN (SELECT id FROM #sil) AND h.seviye = 1;
    IF EXISTS (SELECT 1 FROM gorev.proje_havuzu WHERE id IN (SELECT id FROM #sil)) THROW 50024, N'Kayıt bağlı kayıtlar nedeniyle silinemedi; pasife alın.', 1;
    INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti) VALUES (N'HAVUZ_SIL', N'proje_havuzu', CAST(@id AS NVARCHAR(60)), LEFT(CONCAT(@ad, N'; silinen=', @adet), 200));
    COMMIT TRANSACTION;
    SELECT @adet AS silinen;
END;
GO

-- Onarım: birleştirilmiş kayıtlara bağlı kalmış talep/geçmiş görev bağlantılarını (zincir dahil) hedefe çek
DECLARE @i INT = 0;
WHILE @i < 6
BEGIN
    UPDATE t SET havuz_id = h.birlestirildi_id FROM gorev.talepler t JOIN gorev.proje_havuzu h ON h.id = t.havuz_id WHERE h.birlestirildi_id IS NOT NULL;
    UPDATE g SET havuz_id = h.birlestirildi_id FROM gorev.gecmis_gorev g JOIN gorev.proje_havuzu h ON h.id = g.havuz_id WHERE h.birlestirildi_id IS NOT NULL;
    SET @i += 1;
END;
GO

INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti) VALUES (N'SEMA', N'sema_surumleri', N'22', N'Havuz: birleştirmede efor/talep aktarımı, sp_havuz_sil');
