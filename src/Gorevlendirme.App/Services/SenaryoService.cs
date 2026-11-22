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

    private static string Camel(string s)
    {
        var p = s.Split('_');
        return p[0] + string.Concat(p.Skip(1).Select(x => char.ToUpperInvariant(x[0]) + x[1..]));
    }
}
