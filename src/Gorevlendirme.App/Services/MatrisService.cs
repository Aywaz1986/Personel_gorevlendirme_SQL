using System.Text.Json;

namespace Gorevlendirme;

/// <summary>Haftalık matris (Dilim 6, 008_matris.sql): yalnız okuma. Hafta başı sunucuda pazartesiye çekilir.</summary>
public static class MatrisService
{
    public static async Task<object> HaftaAsync(SqlService sql, string bas, string? bolum, string? ana, string? q, bool sadeceGorevli, string? konum = null) =>
        (await sql.ProcAsync("gorev.sp_matris_hafta", ("@bas", bas), ("@bolum", Bos(bolum)), ("@ana", Bos(ana)), ("@q", Bos(q)), ("@sadece_gorevli", sadeceGorevli), ("@konum", Bos(konum)))).Select(r => new
        {
            sicil = r["sicil_no"], ad = r["adi_soyadi"], bolum = r["bolum"], hucreler = JsonOku(r["hucreler_json"] as string), izinler = JsonOku(r["izinler_json"] as string),
        }).ToList();

    public static async Task<string> SurumAsync(SqlService sql, string bas) =>
        Convert.ToString((await sql.ProcAsync("gorev.sp_matris_surum", ("@bas", bas))).First()["surum"]) ?? "";

    public static async Task<object> BolumlerAsync(SqlService sql) =>
        (await sql.ProcAsync("gorev.sp_matris_bolumler")).Select(r => Convert.ToString(r["bolum"]) ?? "").ToList();

    private static string? Bos(string? s) => string.IsNullOrWhiteSpace(s) ? null : s;

    private static object JsonOku(string? json) =>
        string.IsNullOrWhiteSpace(json) ? Array.Empty<object>() : JsonSerializer.Deserialize<JsonElement>(json);
}
