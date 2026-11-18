using System.Globalization;
using System.Text.Json;

namespace Gorevlendirme;

/// <summary>Akademik takvim (tatil kayıtları: aralık, tür RESMI/IDARI, yarım gün OO/OS). Yetki ve kurallar sunucudadır.</summary>
public static class TakvimService
{
    private static DateTime Tarih(string s, string alan) =>
        DateTime.TryParseExact(s, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var t) ? t : throw new GorevException("dogrulama", alan + " geçersiz (yyyy-aa-gg).");

    public static async Task<object> ListeAsync(SqlService sql, int? yil) =>
        (await sql.ProcAsync("gorev.sp_takvim_listele", ("@yil", yil))).Select(r => new
        {
            id = r["id"], baslangic = r["baslangic"], bitis = r["bitis"], zaman = r["zaman_dilimi"], tur = r["tur"], ad = r["ad"],
            yillik = r["yillik"], gun = r["gun"], kesilen = r["kesilen"],
        }).ToList();

    public static async Task<object> OzetAsync(SqlService sql, int yil)
    {
        var r = (await sql.ProcAsync("gorev.sp_takvim_ozet", ("@yil", yil))).First();
        return new { kayit = r["kayit"], resmiGun = r["resmi_gun"], idariGun = r["idari_gun"], kesilenGun = r["kesilen_gun"] };
    }

    public static async Task<object> KaydetAsync(SqlService sql, int? id, string baslangic, string? bitis, string zaman, string tur, string ad, bool yillik)
    {
        var b = Tarih(baslangic, "Başlangıç");
        DateTime? e = string.IsNullOrWhiteSpace(bitis) ? null : Tarih(bitis, "Bitiş");
        var r = (await sql.ProcAsync("gorev.sp_takvim_kaydet", ("@id", id), ("@baslangic", b), ("@bitis", e), ("@zaman_dilimi", zaman), ("@tur", tur), ("@ad", ad), ("@yillik", yillik))).First();
        return new { id = r["id"] };
    }

    public static Task SilAsync(SqlService sql, int id) => sql.ProcAsync("gorev.sp_takvim_sil", ("@id", id));

    private static string Json(IEnumerable<TakvimSatir> s) =>
        JsonSerializer.Serialize(s.Select(x => new { sira = x.Sira, baslangic = x.Baslangic, bitis = x.Bitis, zaman = x.Zaman, tur = x.Tur, ad = x.Ad, yillik = x.Yillik }));

    public static async Task<object> OnizleAsync(SqlService sql, IEnumerable<TakvimSatir> satirlar) =>
        (await sql.ProcAsync("gorev.sp_takvim_toplu_onizle", ("@json", Json(satirlar)))).Select(r => new
        {
            sira = r["sira"], baslangic = r["baslangic"], bitis = r["bitis"], zaman = r["zaman"], tur = r["tur"], ad = r["ad"],
            yillik = r["yillik"], gun = r["gun"], durum = r["durum"], hata = r["hata"],
        }).ToList();

    public static async Task<object> UygulaAsync(SqlService sql, IEnumerable<TakvimSatir> satirlar)
    {
        var r = (await sql.ProcAsync("gorev.sp_takvim_toplu_uygula", ("@json", Json(satirlar)))).First();
        return new { eklenen = r["eklenen"], guncellenen = r["guncellenen"], ayni = r["ayni"] };
    }
}
