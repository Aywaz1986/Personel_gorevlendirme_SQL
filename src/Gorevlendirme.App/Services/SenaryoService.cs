using System.Text.Json;

namespace Gorevlendirme;

/// <summary>Dilim 11 (013): telefon + saha notu görünürlüğü, rozet sayaçları, ikame uyarıları. Yetkiyi sunucu denetler.</summary>
public static class SenaryoService
{
    private static object? N(object? o) => o is DBNull ? null : o;

    private static object? Json(string? s) => string.IsNullOrWhiteSpace(s) ? null : JsonSerializer.Deserialize<JsonElement>(s);

    public static async Task<object> IletisimAsync(SqlService sql, int talepId)
    {
        var r = (await sql.ProcAsync("gorev.sp_talep_iletisim", ("@talep_id", talepId))).First();
        return new
        {
            talepId = r["talep_id"], kod = r["kod"], sahaNotu = N(r["saha_notu"]), sorumluAd = r["sorumlu_adi"], sorumluGsm = N(r["sorumlu_gsm"]),
            atananlar = Json(r["atananlar_json"] as string),
        };
    }

    public static async Task<object> SayaclarAsync(SqlService sql)
    {
        var r = (await sql.ProcAsync("gorev.sp_sayaclar")).First();
        return r.ToDictionary(kv => Camel(kv.Key), kv => N(kv.Value));
    }

    public static async Task<object> IkameBekleyenlerAsync(SqlService sql) =>
        (await sql.ProcAsync("gorev.sp_ikame_bekleyenler")).Select(r => new
        {
            talepId = r["talep_id"], kod = r["kod"], sicil = r["sicil_no"], ad = r["adi_soyadi"], neden = r["neden"], ilk = r["ilk_tarih"], son = r["son_tarih"], gun = r["gun"], sorumlu = r["sorumlu"],
        }).ToList();

    /// <summary>Rol bazlı kişi listesi: SORUMLU (Sorumlu Havuzu; Yönetici) ya da SAHA (önerilebilecek personel; Yönetici, Sorumlu).</summary>
    public static async Task<object> RolPersonelAsync(SqlService sql, string rol, string? q) =>
        (await sql.ProcAsync("gorev.sp_rol_personel", ("@rol", rol), ("@q", string.IsNullOrWhiteSpace(q) ? null : q))).Select(r => new
        {
            sicil = r["sicil_no"], ad = r["adi_soyadi"], bolum = N(r["bolum"]),
        }).ToList();

    public static async Task<object> LogListeAsync(SqlService sql, string? bas, string? bit, string? islem, string? q, int ust) =>
        (await sql.ProcAsync("gorev.sp_log_listele", ("@bas", string.IsNullOrWhiteSpace(bas) ? null : bas), ("@bit", string.IsNullOrWhiteSpace(bit) ? null : bit),
            ("@islem", string.IsNullOrWhiteSpace(islem) ? null : islem), ("@q", string.IsNullOrWhiteSpace(q) ? null : q), ("@ust", ust))).Select(r => new
        {
            id = r["id"], zaman = r["zaman"], kullanici = r["kullanici"], adSoyad = r["ad_soyad"], islem = r["islem"], nesne = N(r["nesne"]), nesneId = N(r["nesne_id"]), ayrinti = N(r["ayrinti"]),
        }).ToList();

    public static async Task<object> LogIslemTurleriAsync(SqlService sql) =>
        (await sql.ProcAsync("gorev.sp_log_islem_turleri")).Select(r => new { islem = r["islem"], adet = r["adet"] }).ToList();

    public static async Task<object> RaporDuzeltAsync(SqlService sql, int id, string ilkTarih, string sonTarih, string? neden)
    {
        var r = (await sql.ProcAsync("gorev.sp_rapor_duzelt", ("@id", id), ("@ilk_tarih", ilkTarih), ("@son_tarih", sonTarih), ("@neden", string.IsNullOrWhiteSpace(neden) ? null : neden))).First();
        return new { id = r["id"], kod = r["kod"], izinIptal = r["izin_iptal"], cakisanAtama = r["cakisan_atama"] };
    }

    private static string Camel(string s)
    {
        var p = s.Split('_');
        return p[0] + string.Concat(p.Skip(1).Select(x => char.ToUpperInvariant(x[0]) + x[1..]));
    }
}
