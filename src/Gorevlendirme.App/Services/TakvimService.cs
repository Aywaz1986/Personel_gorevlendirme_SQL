using System.Text.Json;

namespace Gorevlendirme;

/// <summary>Akademik takvim (tatil / kapalı gün). Yetki ve kurallar sunucudadır.</summary>
public static class TakvimService
{
    public static async Task<object> ListeAsync(SqlService sql, int? yil) =>
        (await sql.ProcAsync("gorev.sp_takvim_listele", ("@yil", yil))).Select(r => new
        {
            id = r["id"], tarih = r["tarih"], zaman = r["zaman_dilimi"], tur = r["tur"], ad = r["ad"],
        }).ToList();

    public static async Task<object> KaydetAsync(SqlService sql, int? id, string tarih, string zaman, string tur, string ad)
    {
        if (!DateTime.TryParseExact(tarih, "yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var t))
            throw new GorevException("dogrulama", "Tarih geçersiz (yyyy-aa-gg).");
        var r = (await sql.ProcAsync("gorev.sp_takvim_kaydet", ("@id", id), ("@tarih", t), ("@zaman_dilimi", zaman), ("@tur", tur), ("@ad", ad))).First();
        return new { id = r["id"] };
    }

    public static Task SilAsync(SqlService sql, int id) => sql.ProcAsync("gorev.sp_takvim_sil", ("@id", id));

    private static string Json(IEnumerable<TakvimSatir> s) =>
        JsonSerializer.Serialize(s.Select(x => new { sira = x.Sira, tarih = x.Tarih, zaman = x.Zaman, tur = x.Tur, ad = x.Ad }));

    public static async Task<object> OnizleAsync(SqlService sql, IEnumerable<TakvimSatir> satirlar) =>
        (await sql.ProcAsync("gorev.sp_takvim_toplu_onizle", ("@json", Json(satirlar)))).Select(r => new
        {
            sira = r["sira"], tarih = r["tarih"], zaman = r["zaman"], tur = r["tur"], ad = r["ad"], durum = r["durum"], hata = r["hata"],
        }).ToList();

    public static async Task<object> UygulaAsync(SqlService sql, IEnumerable<TakvimSatir> satirlar)
    {
        var r = (await sql.ProcAsync("gorev.sp_takvim_toplu_uygula", ("@json", Json(satirlar)))).First();
        return new { eklenen = r["eklenen"], guncellenen = r["guncellenen"], ayni = r["ayni"] };
    }
}
