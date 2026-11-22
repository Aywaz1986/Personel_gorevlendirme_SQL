namespace Gorevlendirme;

/// <summary>Canlıya geçiş ve eski veri aktarımı sunucu çağrıları (Dilim 10, 012_canli_aktarim.sql). Yetkiyi (Merkez Yönetici) ve TEST/CANLI kurallarını sunucu denetler.</summary>
public static class CanliService
{
    public static async Task<object> KontrolAsync(SqlService sql) =>
        (await sql.ProcAsync("gorev.sp_canli_kontrol")).Select(r => new { sira = r["sira"], kontrol = r["kontrol"], zorunlu = r["zorunlu"], tamam = r["tamam"], ayrinti = r["ayrinti"] }).ToList();

    public static Task CanliyaGecAsync(SqlService sql, string onay, string? minSurum) =>
        sql.ProcAsync("gorev.sp_ortam_canli", ("@onay", onay), ("@min_surum", string.IsNullOrWhiteSpace(minSurum) ? null : minSurum));

    public static async Task<object> AktarAsync(SqlService sql, string json)
    {
        var r = (await sql.ProcAsync("gorev.sp_eski_aktar", ("@json", json))).First();
        return Sayilar(r);
    }

    public static async Task<object> DurumAsync(SqlService sql) => Sayilar((await sql.ProcAsync("gorev.sp_eski_aktar_durum")).First());

    public static Task GeriAlAsync(SqlService sql, string onay) => sql.ProcAsync("gorev.sp_eski_aktar_geri_al", ("@onay", onay));

    private static Dictionary<string, object?> Sayilar(Dictionary<string, object?> r) => r.ToDictionary(kv => kv.Key, kv => kv.Value);
}
