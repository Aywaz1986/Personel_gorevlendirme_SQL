-- 018: Proje havuzu ağaç-tablo ekranı için düğüm başına toplam efor (adam-gün). Yalnız okur; dbo'ya dokunmaz. SINANMADI (CI SqlTests).
-- Yerleşke (seviye 4) kaydına bağlı AKTİF atamalar toplanır (TAM = 1,0; ÖÖ/ÖS = 0,5) ve üst düğümlere (faaliyet, alt proje, ana proje) yuvarlanır.
CREATE OR ALTER PROCEDURE gorev.sp_havuz_efor
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    IF gorev.fn_yonetici_mi() = 0 THROW 50023, N'Bu işlem için Merkez Yönetici yetkisi gerekir.', 1;
    ;WITH e AS (
        SELECT h4.id AS i4, h3.id AS i3, h2.id AS i2, h1.id AS i1,
               CASE a.zaman_dilimi WHEN 'TAM' THEN 1.0 ELSE 0.5 END AS w
        FROM gorev.atamalar a
        JOIN gorev.talepler t ON t.id = a.talep_id
        JOIN gorev.proje_havuzu h4 ON h4.id = t.havuz_id
        JOIN gorev.proje_havuzu h3 ON h3.id = h4.ust_id
        JOIN gorev.proje_havuzu h2 ON h2.id = h3.ust_id
        JOIN gorev.proje_havuzu h1 ON h1.id = h2.ust_id
        WHERE a.durum = 'AKTIF'
    )
    SELECT v.id, CAST(SUM(e.w) AS DECIMAL(9,1)) AS adam_gun
    FROM e CROSS APPLY (VALUES (e.i1), (e.i2), (e.i3), (e.i4)) v (id)
    GROUP BY v.id;
END;
GO

INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti) VALUES (N'SEMA', N'sema_surumleri', N'18', N'018_havuz_efor.sql uygulandı');
GO
