-- 015_sayac_sahada: yeni tasarımın "Aktif Sahadaki Personel" kartı için sp_sayaclar'a iki sütun eklenir (Dilim 14). Yalnız gorev nesneleri; dbo'ya dokunmaz. SINANMADI (CI'da SQL testi çalışır).
-- sahada_bugun: bugün (kayıtlı gün) AKTİF ataması olan farklı kişi sayısı; saha_toplam: Saha Personeli rolündeki aktif kişi sayısı. Yalnız Yönetici için dolu.
CREATE OR ALTER PROCEDURE gorev.sp_sayaclar
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    IF gorev.fn_kayitli_mi() = 0 THROW 50023, N'Bu işlem için yetkiniz yok.', 1;
    DECLARE @ben NVARCHAR(50) = ISNULL(gorev.fn_ben_sicil(), N'?'), @yon BIT = gorev.fn_yonetici_mi(), @sor BIT = gorev.fn_sorumlu_mu();
    SELECT
        CASE WHEN @yon = 1 THEN (SELECT COUNT(*) FROM gorev.talepler WHERE durum = 'ONAY_BEKLIYOR') END AS bekleyen_talep,
        CASE WHEN @yon = 1 THEN (SELECT COUNT(*) FROM gorev.izin_talepleri WHERE durum = 'ONAY_BEKLIYOR') END AS izin_onay,
        CASE WHEN @yon = 1 THEN (SELECT COUNT(*) FROM gorev.revize_talepleri WHERE durum = 'BEKLIYOR')
             WHEN @sor = 1 THEN (SELECT COUNT(*) FROM gorev.revize_talepleri r JOIN gorev.talepler t ON t.id = r.talep_id WHERE r.durum = 'BEKLIYOR' AND t.sorumlu_sicil_no = @ben) END AS revize_bekleyen,
        CASE WHEN @yon = 1 THEN (SELECT COUNT(*) FROM gorev.fn_ikame_bekleyenler())
             WHEN @sor = 1 THEN (SELECT COUNT(*) FROM gorev.fn_ikame_bekleyenler() WHERE sorumlu_sicil_no = @ben) END AS ikame_uyari,
        CASE WHEN @sor = 1 THEN (SELECT COUNT(*) FROM gorev.bildirimler WHERE sicil_no = @ben AND okundu = 0 AND tur = 'ATANDI') END AS onaylanan,
        CASE WHEN @sor = 1 THEN (SELECT COUNT(*) FROM gorev.bildirimler WHERE sicil_no = @ben AND okundu = 0 AND tur = 'REDDEDILDI') END AS reddedilen,
        (SELECT COUNT(*) FROM gorev.bildirimler WHERE sicil_no = @ben AND okundu = 0) AS bildirim,
        CASE WHEN @yon = 1 THEN (SELECT COUNT(DISTINCT a.sicil_no) FROM gorev.atamalar a WHERE a.durum = 'AKTIF' AND a.tarih = CAST(SYSDATETIME() AS DATE)) END AS sahada_bugun,
        CASE WHEN @yon = 1 THEN (SELECT COUNT(*) FROM gorev.fn_rol_kisileri(N'SAHA')) END AS saha_toplam;
END;
GO

INSERT INTO gorev.islem_log (islem, nesne, nesne_id, ayrinti) VALUES (N'SEMA', N'sema_surumleri', N'15', N'015_sayac_sahada.sql uygulandı');
GO
