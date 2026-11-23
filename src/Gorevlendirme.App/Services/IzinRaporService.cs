using System.Text.Json;

namespace Gorevlendirme;

/// <summary>İzin, rapor ve kişisel görev listesi (Dilim 7, 009_izin_rapor.sql). Yetki ve kurallar sunucudadır; burada çağrı, evrak denetimi ve biçim çevirme vardır.</summary>
public static class IzinRaporService
{
    public const int EvrakEnFazlaBayt = 10 * 1024 * 1024;
    public sealed record GunGirdisi(string Tarih, string Zaman);

    private static object JsonOku(string? json) =>
        string.IsNullOrWhiteSpace(json) ? Array.Empty<object>() : JsonSerializer.Deserialize<JsonElement>(json);

    public static string GunlerJson(IEnumerable<GunGirdisi> g) => JsonSerializer.Serialize(g.Select(x => new { tarih = x.Tarih, zaman = x.Zaman }));

    /// <summary>Evrak türünü ad uzantısından ve ilk baytlardan (PDF/JPEG/PNG imzası) doğrular; uyuşmazlık ya da fazla boyut GorevException("dogrulama") atar.</summary>
    public static string EvrakTuru(byte[] veri, string ad)
    {
        if (veri.Length == 0) throw new GorevException("dogrulama", "Rapor evrakı boş.");
        if (veri.Length > EvrakEnFazlaBayt) throw new GorevException("dogrulama", "Rapor evrakı en fazla 10 MB olabilir.");
        var uzanti = Path.GetExtension(ad ?? "").ToLowerInvariant();
        bool pdf = veri.Length > 4 && veri[0] == 0x25 && veri[1] == 0x50 && veri[2] == 0x44 && veri[3] == 0x46;
        bool jpg = veri.Length > 3 && veri[0] == 0xFF && veri[1] == 0xD8 && veri[2] == 0xFF;
        bool png = veri.Length > 8 && veri[0] == 0x89 && veri[1] == 0x50 && veri[2] == 0x4E && veri[3] == 0x47;
        if (pdf && uzanti == ".pdf") return "application/pdf";
        if (jpg && (uzanti == ".jpg" || uzanti == ".jpeg")) return "image/jpeg";
        if (png && uzanti == ".png") return "image/png";
        throw new GorevException("dogrulama", "Rapor evrakı PDF, JPG ya da PNG olmalı (dosya içeriği uzantıyla uyuşmuyor ya da tür desteklenmiyor).");
    }

    public static async Task<object> IzinKaydetAsync(SqlService sql, string? sicil, string tur, string? aciklama, IEnumerable<GunGirdisi> gunler, string karar)
    {
        var r = (await sql.ProcAsync("gorev.sp_izin_kaydet", ("@sicil", string.IsNullOrWhiteSpace(sicil) ? null : sicil), ("@tur", tur), ("@aciklama", aciklama),
            ("@gunler_json", GunlerJson(gunler)), ("@karar", karar))).First();
        return new { id = r["id"], kod = r["kod"], durum = r["durum"], cikarilan = r["cikarilan"] };
    }

    public static async Task<object> IzinOnaylaAsync(SqlService sql, int id, string karar)
    {
        var r = (await sql.ProcAsync("gorev.sp_izin_onayla", ("@id", id), ("@karar", karar))).First();
        return new { id = r["id"], durum = r["durum"], cikarilan = r["cikarilan"] };
    }

    public static Task IzinReddetAsync(SqlService sql, int id, string neden) => sql.ProcAsync("gorev.sp_izin_reddet", ("@id", id), ("@neden", neden));
    public static Task IzinGeriCekAsync(SqlService sql, int id) => sql.ProcAsync("gorev.sp_izin_geri_cek", ("@id", id));
    public static Task IzinKisaltAsync(SqlService sql, int id, string yeniSon) => sql.ProcAsync("gorev.sp_izin_kisalt", ("@id", id), ("@yeni_son", yeniSon));

    public static async Task<object> IzinListeAsync(SqlService sql, string? durum, string? sicil) =>
        (await sql.ProcAsync("gorev.sp_izin_listele", ("@durum", string.IsNullOrWhiteSpace(durum) ? null : durum), ("@sicil", string.IsNullOrWhiteSpace(sicil) ? null : sicil))).Select(r => new
        {
            id = r["id"], kod = r["kod"], sicil = r["sicil_no"], ad = r["adi_soyadi"], bolum = r["bolum"], durum = r["durum"], tur = r["tur"], aciklama = r["aciklama"],
            vekaleten = r["vekaleten"], retNedeni = r["ret_nedeni"], ilkTarih = r["ilk_tarih"], sonTarih = r["son_tarih"], gunSayisi = r["gun_sayisi"],
            cakisanAtama = r["cakisan_atama"], gunler = JsonOku(r["gunler_json"] as string),
        }).ToList();

    public static async Task<object> RaporKaydetAsync(SqlService sql, string? sicil, string ilk, string son, string? aciklama, byte[] evrak, string evrakAdi)
    {
        var tur = EvrakTuru(evrak, evrakAdi);
        var r = (await sql.ProcAsync("gorev.sp_rapor_kaydet", ("@sicil", string.IsNullOrWhiteSpace(sicil) ? null : sicil), ("@ilk_tarih", ilk), ("@son_tarih", son),
            ("@aciklama", aciklama), ("@evrak", evrak), ("@evrak_adi", Path.GetFileName(evrakAdi)), ("@evrak_tur", tur))).First();
        return new { id = r["id"], kod = r["kod"], izinIptal = r["izin_iptal"], cakisanAtama = r["cakisan_atama"] };
    }

    public static Task RaporIptalAsync(SqlService sql, int id, string neden) => sql.ProcAsync("gorev.sp_rapor_iptal", ("@id", id), ("@neden", neden));

    public static async Task<object> RaporListeAsync(SqlService sql, string? sicil, bool iptalDahil) =>
        (await sql.ProcAsync("gorev.sp_rapor_listele", ("@sicil", string.IsNullOrWhiteSpace(sicil) ? null : sicil), ("@iptal_dahil", iptalDahil))).Select(r => new
        {
            id = r["id"], kod = r["kod"], sicil = r["sicil_no"], ad = r["adi_soyadi"], bolum = r["bolum"], ilkTarih = r["ilk_tarih"], sonTarih = r["son_tarih"], aciklama = r["aciklama"],
            durum = r["durum"], evrakAdi = r["evrak_adi"], evrakTur = r["evrak_tur"], evrakBoyut = r["evrak_boyut"], eskiKayit = r["eski_kayit"], vekaleten = r["vekaleten"],
            iptalNedeni = r["iptal_nedeni"], cakisanAtama = r["cakisan_atama"],
        }).ToList();

    public static async Task<(byte[] Veri, string Ad)> RaporEvrakAsync(SqlService sql, int id)
    {
        var r = (await sql.ProcAsync("gorev.sp_rapor_evrak", ("@id", id))).First();
        return (r["evrak"] as byte[] ?? Array.Empty<byte>(), (r.TryGetValue("standart_ad", out var sa) && sa is string st && st.Length > 0 ? st : Convert.ToString(r["evrak_adi"])) ?? "rapor");
    }

    public static async Task<object> GorevlerimAsync(SqlService sql, string? bas, string? bit) =>
        (await sql.ProcAsync("gorev.sp_gorevlerim", ("@bas", string.IsNullOrWhiteSpace(bas) ? null : bas), ("@bit", string.IsNullOrWhiteSpace(bit) ? null : bit))).Select(r => new
        {
            tarih = r["tarih"], zaman = r["zaman"], talepId = r["talep_id"], kod = r["kod"], ana = r["ana"], alt = r["alt"], faaliyet = r["faaliyet"], konum = r["konum"],
            saat = r["saat"], sorumlu = r["sorumlu"], gorevMetni = r["gorev_metni"],
        }).ToList();
}
