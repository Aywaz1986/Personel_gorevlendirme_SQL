namespace Gorevlendirme;

/// <summary>Proje havuzu (Ana Proje &gt; Alt Proje &gt; Faaliyet &gt; Konum). Yetki ve kurallar sunucudadır.</summary>
public static class HavuzService
{
    public static async Task<object> ListeAsync(SqlService sql) =>
        (await sql.ProcAsync("gorev.sp_havuz_listele")).Select(r => new
        {
            id = r["id"], ustId = r["ust_id"], seviye = r["seviye"], ad = r["ad"], aktif = r["aktif"], birlestirildiId = r["birlestirildi_id"],
            arsiv = r["arsiv"], arsivNeden = r["arsiv_neden"], arsivTarih = r["arsiv_tarih"],
        }).ToList();

    public static async Task<List<HavuzKaydi>> DuzListeAsync(SqlService sql) =>
        (await sql.ProcAsync("gorev.sp_havuz_listele")).Select(r =>
            new HavuzKaydi(Convert.ToInt32(r["id"]), r["ust_id"] == null ? null : Convert.ToInt32(r["ust_id"]), Convert.ToInt32(r["seviye"]), Convert.ToString(r["ad"]) ?? "")).ToList();

    public static async Task<object> EkleAsync(SqlService sql, int? ustId, string ad)
    {
        var r = (await sql.ProcAsync("gorev.sp_havuz_ekle", ("@ust_id", ustId), ("@ad", ad))).First();
        return new { id = r["id"] };
    }

    public static Task AdlandirAsync(SqlService sql, int id, string ad) =>
        sql.ProcAsync("gorev.sp_havuz_adlandir", ("@id", id), ("@ad", ad));

    public static async Task<object> DurumAsync(SqlService sql, int id, bool aktif)
    {
        var r = (await sql.ProcAsync("gorev.sp_havuz_durum", ("@id", id), ("@aktif", aktif))).First();
        return new { etkilenen = r["etkilenen"] };
    }

    public static async Task<object> BirlestirAsync(SqlService sql, int kaynakId, int hedefId)
    {
        var r = (await sql.ProcAsync("gorev.sp_havuz_birlestir", ("@kaynak_id", kaynakId), ("@hedef_id", hedefId))).First();
        return new { birlesen = r["birlesen"], tasinan = r["tasinan"] };
    }

    public static async Task<object> ArsivAsync(SqlService sql, int id, bool arsiv, string? neden)
    {
        var r = (await sql.ProcAsync("gorev.sp_havuz_arsivle", ("@id", id), ("@arsiv", arsiv), ("@neden", neden))).First();
        return new { etkilenen = r["etkilenen"] };
    }
}
