-- dbo_iz.sql — dbo'nun "parmak izi" (YALNIZCA OKUMA, yalnızca sistem katalogları; dbo tablolarının içeriği OKUNMAZ).
-- Kurulum / sıfırla / kaldır öncesi ve sonrası çalıştırın: iki sonuç birebir aynı olmalıdır (dbo'ya dokunulmadı kanıtı).
-- KULLANIM (SSMS): veritabanı SST_Ozluk seçili, betiği çalıştırın, sonuç satırını not edin.
SET NOCOUNT ON;
SELECT
    (SELECT COUNT(*) FROM sys.objects WHERE schema_id = SCHEMA_ID(N'dbo') AND is_ms_shipped = 0)                  AS dbo_nesne_sayisi,
    (SELECT CONVERT(VARCHAR(23), MAX(modify_date), 121) FROM sys.objects WHERE schema_id = SCHEMA_ID(N'dbo') AND is_ms_shipped = 0) AS dbo_son_degisiklik,
    (SELECT SUM(p.rows) FROM sys.partitions p JOIN sys.objects o ON o.object_id = p.object_id
      WHERE o.schema_id = SCHEMA_ID(N'dbo') AND o.type = N'U' AND p.index_id IN (0, 1))                           AS dbo_toplam_satir,
    (SELECT COUNT(*) FROM sys.database_permissions dp
      WHERE (dp.class = 1 AND dp.major_id IN (SELECT object_id FROM sys.objects WHERE schema_id = SCHEMA_ID(N'dbo') AND is_ms_shipped = 0))
         OR (dp.class = 3 AND dp.major_id = SCHEMA_ID(N'dbo')))                                                   AS dbo_yetki_sayisi,
    (SELECT COUNT(*) FROM sys.database_principals WHERE name NOT LIKE N'gorev[_]%' AND is_fixed_role = 0)          AS gorev_disi_kullanici_rol_sayisi;
