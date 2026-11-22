using System.Globalization;
using System.Text.Json;

namespace Gorevlendirme;

/// <summary>Analiz ve arşiv (Dilim 9, 011_analiz.sql): proje/personel adam-gün, kişi detayı, tarihsiz geçmiş görevler ve Excel tabloları.</summary>
public static class AnalizService
{
    private static object? Bos(string? s) => string.IsNullOrWhiteSpace(s) ? null : s;
    private static string T(object? o) => Convert.ToString(o, CultureInfo.InvariantCulture) ?? "";
    private static decimal D(object? o) => o == null || o is DBNull ? 0m : Convert.ToDecimal(o, CultureInfo.InvariantCulture);
    private static string Sayi(object? o) => D(o).ToString("0.0", CultureInfo.InvariantCulture);
    private static object JsonOku(string? json) => string.IsNullOrWhiteSpace(json) ? Array.Empty<object>() : JsonSerializer.Deserialize<JsonElement>(json);

    public static async Task<object> AnaProjelerAsync(SqlService sql) =>
        (await sql.ProcAsync("gorev.sp_analiz_ana_projeler")).Select(r => T(r["ad"])).ToList();

    public static async Task<List<Dictionary<string, object?>>> ProjeHamAsync(SqlService sql, string bas, string bit, string? ana) =>
        await sql.ProcAsync("gorev.sp_analiz_proje", ("@bas", bas), ("@bit", bit), ("@ana", Bos(ana)));

    public static async Task<object> ProjeAsync(SqlService sql, string bas, string bit, string? ana) =>
        (await ProjeHamAsync(sql, bas, bit, ana)).Select(r => new
        {
            ana = r["ana"], alt = r["alt"], faaliyet = r["faaliyet"], adamGun = D(r["adam_gun"]), kisi = r["kisi"], gun = r["gun"], talep = r["talep"], ilk = r["ilk"], son = r["son"],
        }).ToList();

    public static async Task<List<Dictionary<string, object?>>> PersonelHamAsync(SqlService sql, string bas, string bit, string? bolum, string? q) =>
        await sql.ProcAsync("gorev.sp_analiz_personel", ("@bas", bas), ("@bit", bit), ("@bolum", Bos(bolum)), ("@q", Bos(q)));

    public static async Task<object> PersonelAsync(SqlService sql, string bas, string bit, string? bolum, string? q) =>
        (await PersonelHamAsync(sql, bas, bit, bolum, q)).Select(r => new
        {
            sicil = r["sicil_no"], ad = r["adi_soyadi"], bolum = r["bolum"], adamGun = D(r["adam_gun"]), gun = r["gun"], proje = r["proje"],
            izinGun = r["izin_gun"] is DBNull or null ? (decimal?)null : D(r["izin_gun"]), raporGun = r["rapor_gun"] is DBNull or null ? (int?)null : Convert.ToInt32(r["rapor_gun"]),
            projeler = JsonOku(r["projeler_json"] as string),
        }).ToList();

    public static async Task<List<Dictionary<string, object?>>> DetayHamAsync(SqlService sql, string sicil, string bas, string bit) =>
        await sql.ProcAsync("gorev.sp_analiz_personel_detay", ("@sicil", sicil), ("@bas", bas), ("@bit", bit));

    public static async Task<object> DetayAsync(SqlService sql, string sicil, string bas, string bit) =>
        (await DetayHamAsync(sql, sicil, bas, bit)).Select(r => new
        { tarih = r["tarih"], zaman = r["zaman"], tur = r["tur"], ana = r["ana"], alt = r["alt"], faaliyet = r["faaliyet"], konum = r["konum"], kod = r["kod"], sorumlu = r["sorumlu"] }).ToList();

    public static async Task<List<Dictionary<string, object?>>> ArsivHamAsync(SqlService sql, string? q, string? ana) =>
        await sql.ProcAsync("gorev.sp_arsiv_gecmis", ("@q", Bos(q)), ("@ana", Bos(ana)));

    public static async Task<object> ArsivAsync(SqlService sql, string? q, string? ana) =>
        (await ArsivHamAsync(sql, q, ana)).Select(r => new
        { id = r["id"], personel = r["personel"], bolum = r["bolum"], proje = r["proje"], gorevMetni = r["gorev_metni"], sorumlu = r["sorumlu"], kaynak = r["kaynak"], aktarim = r["aktarim"] }).ToList();

    // ---- Excel tabloları (saf; sayı sütunları Xlsx'e ayrıca bildirilir) ----
    public static readonly ISet<int> ProjeSayiSutunlari = new HashSet<int> { 3, 4, 5, 6 };
    public static readonly ISet<int> PersonelSayiSutunlari = new HashSet<int> { 3, 4, 5, 6, 7 };

    public static List<List<string>> ProjeTablo(IEnumerable<Dictionary<string, object?>> satirlar)
    {
        var t = new List<List<string>> { new() { "Ana proje", "Alt proje", "Faaliyet", "Adam-gün", "Kişi", "Gün", "Talep", "İlk gün", "Son gün" } };
        foreach (var r in satirlar) t.Add(new() { T(r["ana"]), T(r["alt"]), T(r["faaliyet"]), Sayi(r["adam_gun"]), T(r["kisi"]), T(r["gun"]), T(r["talep"]), T(r["ilk"]), T(r["son"]) });
        return t;
    }

    public static List<List<string>> PersonelTablo(IEnumerable<Dictionary<string, object?>> satirlar, bool izinGoster)
    {
        var baslik = new List<string> { "Sicil", "Ad soyad", "Bölüm", "Adam-gün", "Görev günü", "Proje sayısı" };
        if (izinGoster) { baslik.Add("İzin (gün)"); baslik.Add("Rapor (takvim günü)"); }
        baslik.Add("Projeler (adam-gün)");
        var t = new List<List<string>> { baslik };
        foreach (var r in satirlar)
        {
            var s = new List<string> { T(r["sicil_no"]), T(r["adi_soyadi"]), T(r["bolum"]), Sayi(r["adam_gun"]), T(r["gun"]), T(r["proje"]) };
            if (izinGoster) { s.Add(Sayi(r["izin_gun"])); s.Add(T(r["rapor_gun"] is DBNull or null ? 0 : r["rapor_gun"])); }
            s.Add(ProjelerMetni(r["projeler_json"] as string));
            t.Add(s);
        }
        return t;
    }

    public static string ProjelerMetni(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return "";
        var e = JsonSerializer.Deserialize<JsonElement>(json);
        return string.Join("; ", e.EnumerateArray().Select(x => x.GetProperty("ana").GetString() + " (" + x.GetProperty("adam_gun").GetDecimal().ToString("0.0", CultureInfo.InvariantCulture) + ")"));
    }

    private static string ZamanAd(string z) => z switch { "TAM" => "Tam gün", "OO" => "Öğleden önce", "OS" => "Öğleden sonra", _ => z };

    public static List<List<string>> DetayTablo(IEnumerable<Dictionary<string, object?>> satirlar)
    {
        var t = new List<List<string>> { new() { "Tarih", "Dilim", "Tür", "Ana proje / izin türü", "Alt proje", "Faaliyet", "Konum", "Kod", "Sorumlu" } };
        foreach (var r in satirlar)
        {
            var tur = T(r["tur"]);
            var ana = tur == "GOREV" ? T(r["ana"]) : T(r["faaliyet"]);   // izin türü faaliyet sütununda gelir
            t.Add(new() { T(r["tarih"]), ZamanAd(T(r["zaman"])), tur == "GOREV" ? "Görev" : tur == "IZIN" ? "İzin" : "Rapor", ana, tur == "GOREV" ? T(r["alt"]) : "", tur == "GOREV" ? T(r["faaliyet"]) : "", T(r["konum"]), T(r["kod"]), T(r["sorumlu"]) });
        }
        return t;
    }

    public static List<List<string>> ArsivTablo(IEnumerable<Dictionary<string, object?>> satirlar)
    {
        var t = new List<List<string>> { new() { "Personel", "Bölüm", "Proje", "Görev", "Sorumlu", "Kaynak", "Aktarım tarihi" } };
        foreach (var r in satirlar) t.Add(new() { T(r["personel"]), T(r["bolum"]), T(r["proje"]), T(r["gorev_metni"]), T(r["sorumlu"]), T(r["kaynak"]), T(r["aktarim"]) });
        return t;
    }
}
