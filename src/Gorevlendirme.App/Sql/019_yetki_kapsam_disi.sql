-- Dilim 20: Bölüm eşleştirmede "Kapsam Dışı" (DISI) kararı + son güncelleyen/zaman. gorev.* dışına dokunmaz.
-- DISI satırı hiçbir rol vermez (SORUMLU/SAHA koşulları sağlanmaz); "karar verildi, erişim yok" ile "eşleşme bekliyor"u (satır yok) ayırır.
IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_rol_bolum_eslestirme_rol' AND parent_object_id = OBJECT_ID(N'gorev.rol_bolum_eslestirme'))
    ALTER TABLE gorev.rol_bolum_eslestirme DROP CONSTRAINT CK_rol_bolum_eslestirme_rol;
GO
ALTER TABLE gorev.rol_bolum_eslestirme ADD CONSTRAINT CK_rol_bolum_eslestirme_rol CHECK (rol IN (N'SORUMLU', N'SAHA', N'DISI'));
GO

CREATE OR ALTER PROCEDURE gorev.sp_eslestirme_kaydet
    @bolum NVARCHAR(500),
    @rol   NVARCHAR(20) = NULL
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
    IF gorev.fn_yonetici_mi() = 0 THROW 50023, N'Bu işlem için Merkez Yönetici yetkisi gerekir.', 1;
    SET @bolum = LTRIM(RTRIM(@bolum));
    SET @rol = NULLIF(LTRIM(RTRIM(ISNULL(@rol, N''))), N'');
    IF @bolum IS NULL OR LEN(@bolum) = 0 THROW 50024, N'Bölüm adı boş olamaz.', 1;
    IF @rol IS NOT NULL AND @rol NOT IN (N'SORUMLU', N'SAHA', N'DISI') THROW 50024, N'Rol SORUMLU, SAHA ya da DISI (kapsam dışı) olmalı.', 1;

    BEGIN TRANSACTION;
    IF @rol IS NULL
        DELETE FROM gorev.rol_bolum_eslestirme WHERE bolum = @bolum;
    ELSE
    BEGIN
        UPDATE gorev.rol_bolum_eslestirme SET rol = @rol, guncelleme = SYSDATETIME() WHERE bolum = @bolum;
        IF @@ROWCOUNT = 0 INSERT INTO gorev.rol_bolum_eslestirme (bolum, rol) VALUES (@bolum, @rol);
    END;
    INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti)
    VALUES (N'ESLESTIRME', N'rol_bolum_eslestirme', LEFT(@bolum, 60), ISNULL(@rol, N'KALDIRILDI'));
    COMMIT TRANSACTION;
END;
GO

CREATE OR ALTER PROCEDURE gorev.sp_eslestirme_listele
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    IF gorev.fn_yonetici_mi() = 0 THROW 50023, N'Bu işlem için Merkez Yönetici yetkisi gerekir.', 1;
    SELECT x.bolum, e.rol, ISNULL(c.kisi, 0) AS kisi, e.guncelleme AS son_zaman,
           (SELECT TOP (1) l.kullanici FROM gorev.islem_log l WHERE l.islem = N'ESLESTIRME' AND l.nesne_id = LEFT(x.bolum, 60) ORDER BY l.id DESC) AS son_kullanici
    FROM (SELECT bolum FROM gorev.personel WHERE bolum IS NOT NULL AND aktif = 1
          UNION SELECT bolum FROM gorev.rol_bolum_eslestirme) x
    LEFT JOIN gorev.rol_bolum_eslestirme e ON e.bolum = x.bolum
    LEFT JOIN (SELECT bolum, COUNT(*) AS kisi FROM gorev.personel WHERE aktif = 1 AND bolum IS NOT NULL GROUP BY bolum) c ON c.bolum = x.bolum
    ORDER BY x.bolum;
END;
GO

INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti) VALUES (N'SEMA', N'sema_surumleri', N'19', N'Yetki: bölüm eşleştirmede Kapsam Dışı (DISI) + son güncelleyen');
