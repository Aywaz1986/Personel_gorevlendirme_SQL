-- 024: İstisnada "Saha personeli listesine ekle" (Dilim 29). SINANMADI (CI SqlTests).
--  * kullanici_yetki_istisna.saha_listede: 1 (varsayılan) = kişi Saha Personeli listelerinde görünür (matris, atama adayları, öneri, sayaç);
--    0 = saha ekranlarını kullanır (saha_mi = 1) ama saha personeli olarak listelenmez/atanamaz.
--  * fn_rol_kisileri('SAHA') yalnız saha_listede = 1 olanları döndürür; erişim (sp_ben / fn_rol) saha_mi'ye bakmaya devam eder.
IF COL_LENGTH(N'gorev.kullanici_yetki_istisna', N'saha_listede') IS NULL
    ALTER TABLE gorev.kullanici_yetki_istisna ADD saha_listede BIT NOT NULL CONSTRAINT DF_kyi_saha_listede DEFAULT 1;
GO

CREATE OR ALTER FUNCTION gorev.fn_rol_kisileri (@rol NVARCHAR(10))
RETURNS TABLE
AS RETURN
(
    SELECT p.sicil_no, p.adi_soyadi, p.bolum
    FROM gorev.personel p
    OUTER APPLY (SELECT TOP (1) i.sorumlu_mu, i.saha_mi, i.saha_listede FROM gorev.kullanici_yetki_istisna i
                 WHERE i.aktif = 1 AND (i.sicil_no = p.sicil_no
                    OR gorev.fn_hesap_eslesir(i.hesap, p.kullanici_adi) = 1
                    OR gorev.fn_hesap_eslesir(p.kullanici_adi, i.hesap) = 1) ORDER BY i.id) x
    WHERE p.aktif = 1
      AND ((x.sorumlu_mu IS NOT NULL AND ((@rol = N'SORUMLU' AND x.sorumlu_mu = 1) OR (@rol = N'SAHA' AND x.saha_mi = 1 AND x.saha_listede = 1)))
        OR (x.sorumlu_mu IS NULL AND EXISTS (SELECT 1 FROM gorev.rol_bolum_eslestirme e WHERE e.bolum = p.bolum AND e.rol = @rol)))
);
GO

CREATE OR ALTER PROCEDURE gorev.sp_istisna_listele
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    IF gorev.fn_yonetici_mi() = 0 THROW 50023, N'Bu işlem için Merkez Yönetici yetkisi gerekir.', 1;
    SELECT i.hesap, i.sicil_no, p.adi_soyadi, i.yonetici_mi, i.sorumlu_mu, i.saha_mi, i.saha_listede, i.aktif, i.aciklama
    FROM gorev.kullanici_yetki_istisna i
    LEFT JOIN gorev.personel p ON p.sicil_no = i.sicil_no
    ORDER BY i.hesap;
END;
GO

CREATE OR ALTER PROCEDURE gorev.sp_istisna_kaydet
    @hesap        NVARCHAR(256),
    @sicil_no     NVARCHAR(50) = NULL,
    @yonetici_mi  BIT = 0,
    @sorumlu_mu   BIT = 0,
    @saha_mi      BIT = 0,
    @aktif        BIT = 1,
    @aciklama     NVARCHAR(300) = NULL,
    @saha_listede BIT = 1
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
    IF gorev.fn_yonetici_mi() = 0 THROW 50023, N'Bu işlem için Merkez Yönetici yetkisi gerekir.', 1;
    SET @hesap = LTRIM(RTRIM(ISNULL(@hesap, N'')));
    SET @sicil_no = NULLIF(LTRIM(RTRIM(ISNULL(@sicil_no, N''))), N'');
    SET @saha_listede = ISNULL(@saha_listede, 1);
    IF LEN(@hesap) = 0 THROW 50024, N'Windows hesabı boş olamaz.', 1;
    IF @sicil_no IS NOT NULL AND NOT EXISTS (SELECT 1 FROM gorev.personel WHERE sicil_no = @sicil_no)
        THROW 50024, N'Sicil kadro kopyasında yok (önce kadroyu eşitleyin ya da sicili boş bırakın).', 1;

    BEGIN TRANSACTION;
    UPDATE gorev.kullanici_yetki_istisna
       SET sicil_no = @sicil_no, yonetici_mi = @yonetici_mi, sorumlu_mu = @sorumlu_mu, saha_mi = @saha_mi, saha_listede = @saha_listede,
           aktif = @aktif, aciklama = @aciklama, guncelleme = SYSDATETIME()
     WHERE hesap = @hesap;
    IF @@ROWCOUNT = 0
        INSERT INTO gorev.kullanici_yetki_istisna (hesap, sicil_no, yonetici_mi, sorumlu_mu, saha_mi, saha_listede, aktif, aciklama)
        VALUES (@hesap, @sicil_no, @yonetici_mi, @sorumlu_mu, @saha_mi, @saha_listede, @aktif, @aciklama);
    INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti)
    VALUES (N'ISTISNA', N'kullanici_yetki_istisna', LEFT(@hesap, 60),
            CONCAT(N'yonetici=', @yonetici_mi, N' sorumlu=', @sorumlu_mu, N' saha=', @saha_mi, N' saha_listede=', @saha_listede, N' aktif=', @aktif));
    COMMIT TRANSACTION;
END;
GO

INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti) VALUES (N'SEMA', N'sema_surumleri', N'24', N'İstisnada saha personeli listesine ekle');
