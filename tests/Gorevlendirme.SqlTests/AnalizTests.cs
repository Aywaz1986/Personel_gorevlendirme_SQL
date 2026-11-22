using System.Text.Json;
using Gorevlendirme;
using Xunit;

namespace Gorevlendirme.SqlTests;

/// <summary>Analiz ve arşiv (011): adam-gün, personel analizi, kişi detayı, tarihsiz geçmiş görevler, yetki kapsamı.</summary>
public class AnalizTests
{
    private static string D(int n) => DateTime.Today.AddDays(n).ToString("yyyy-MM-dd");
    private static async Task<string> Kod(Func<Task> f) => (await Assert.ThrowsAsync<GorevException>(f)).Code;
    private sealed record Ortam(TestDb T, SqlService Sorumlu, SqlService Yonetici, SqlService Saha1, SqlService Saha2);
    private static List<object> Liste(object o) => ((System.Collections.IEnumerable)o).Cast<object>().ToList();
    private static object Al(object o, string ad) => o.GetType().GetProperty(ad)!.GetValue(o)!;
    private static string P(object o, string ad) => Convert.ToString(Al(o, ad), System.Globalization.CultureInfo.InvariantCulture) ?? "";
    private static int N(object? o) => Convert.ToInt32(o);

    private static async Task<Ortam> KurAsync()
    {
        var t = await TestDb.OlusturAsync();
        await t.Migrator.UygulaAsync(false);
        await t.ExecAsync(@"INSERT INTO gorev.personel (sicil_no, adi_soyadi, bolum) VALUES
            (N'1001', N'Erdem Efe', N'Proje'), (N'1002', N'Ahmet Sümbül', N'Teknik'), (N'1005', N'Yönetici Kişi', N'Merkez'), (N'1006', N'Ali Örnek', N'Teknik');");
        var (hs, sorumlu) = await t.KisiAsync();
        var (hy, yon) = await t.KisiAsync();
        var (h1, saha1) = await t.KisiAsync();
        var (h2, saha2) = await t.KisiAsync();
        await t.ExecAsync($@"INSERT INTO gorev.kullanici_yetki_istisna (hesap, sicil_no, sorumlu_mu) VALUES (N'{hs}', N'1001', 1);
            INSERT INTO gorev.kullanici_yetki_istisna (hesap, sicil_no, yonetici_mi) VALUES (N'{hy}', N'1005', 1);
            INSERT INTO gorev.kullanici_yetki_istisna (hesap, sicil_no, saha_mi) VALUES (N'{h1}', N'1002', 1);
            INSERT INTO gorev.kullanici_yetki_istisna (hesap, sicil_no, saha_mi) VALUES (N'{h2}', N'1006', 1);");
        return new Ortam(t, sorumlu, yon, saha1, saha2);
    }

    private static async Task<int> TalepAsync(Ortam o, string ana, params (string Tarih, string Zaman)[] gunler)
    {
        var a = await TalepService.KaydetAsync(o.Sorumlu, null, null, ana, null, "AY Kabul", "Ankara İvedik", "07:30", "16:35", "İş", null,
            gunler.Select(g => new TalepService.GunGirdisi(g.Tarih, g.Zaman, 1)).ToArray(), Array.Empty<string>(), true);
        return N(a.GetType().GetProperty("id")!.GetValue(a));
    }

    private static Task Ata(Ortam o, int talep, string sicil, string tarih, string zaman) =>
        AtamaService.OnaylaAsync(o.Yonetici, talep, new[] { new AtamaService.AtamaGirdisi(sicil, tarih, zaman) }, "REDDET");

    [SqlFact]
    public async Task Proje_ve_personel_adam_gunu_dogru_hesaplanir_ve_kapsam_uygulanir()
    {
        var o = await KurAsync(); await using var _t = o.T;
        var t1 = await TalepAsync(o, "Toroman", (D(40), "TAM"), (D(41), "OO"), (D(41), "OS"));
        await Ata(o, t1, "1002", D(40), "TAM"); await Ata(o, t1, "1002", D(41), "OO"); await Ata(o, t1, "1006", D(41), "OS");
        var t2 = await TalepAsync(o, "Başka Proje", (D(42), "TAM"));
        await Ata(o, t2, "1006", D(42), "TAM");
        await IzinRaporService.IzinKaydetAsync(o.Yonetici, "1002", "Mazeret", null, new[] { new IzinRaporService.GunGirdisi(D(43)) }, "REDDET");

        var proje = Liste(await AnalizService.ProjeAsync(o.Yonetici, D(40), D(45), null));
        Assert.Equal(2, proje.Count);
        Assert.Equal(2m, Convert.ToDecimal(Al(proje.First(x => P(x, "ana") == "Toroman"), "adamGun")));
        Assert.Equal(1m, Convert.ToDecimal(Al(proje.First(x => P(x, "ana") == "Başka Proje"), "adamGun")));
        Assert.Single(Liste(await AnalizService.ProjeAsync(o.Yonetici, D(40), D(45), "Başka Proje")));
        Assert.Equal(2, Liste(await AnalizService.ProjeAsync(o.Sorumlu, D(40), D(45), null)).Count);       // kendi talepleri
        Assert.Empty(Liste(await AnalizService.ProjeAsync(o.Yonetici, D(50), D(60), null)));                // dönem dışı
        Assert.Equal("yetki", await Kod(() => AnalizService.ProjeAsync(o.Saha1, D(40), D(45), null)));
        Assert.Equal("dogrulama", await Kod(() => AnalizService.ProjeAsync(o.Yonetici, D(45), D(40), null)));

        var kisiler = Liste(await AnalizService.PersonelAsync(o.Yonetici, D(40), D(45), null, null));
        var k1006 = kisiler.First(x => P(x, "sicil") == "1006"); var k1002 = kisiler.First(x => P(x, "sicil") == "1002");
        Assert.Equal(1.5m, Convert.ToDecimal(Al(k1006, "adamGun"))); Assert.Equal(2, N(Al(k1006, "proje")));
        Assert.Equal(1.5m, Convert.ToDecimal(Al(k1002, "adamGun"))); Assert.Equal(1, N(Al(k1002, "proje")));
        Assert.Equal(1m, Convert.ToDecimal(Al(k1002, "izinGun")));
        Assert.Single(Liste(await AnalizService.PersonelAsync(o.Yonetici, D(40), D(45), null, "Sümbül")));
        var sor = Liste(await AnalizService.PersonelAsync(o.Sorumlu, D(40), D(45), null, null));
        Assert.Null(sor.First(x => P(x, "sicil") == "1002").GetType().GetProperty("izinGun")!.GetValue(sor.First(x => P(x, "sicil") == "1002")));     // izin sütunu Sorumlu'ya kapalı
        Assert.Equal("yetki", await Kod(() => AnalizService.PersonelAsync(o.Saha2, D(40), D(45), null, null)));

        var detay = Liste(await AnalizService.DetayAsync(o.Yonetici, "1002", D(40), D(45)));
        Assert.Equal(2, detay.Count(x => P(x, "tur") == "GOREV")); Assert.Equal(1, detay.Count(x => P(x, "tur") == "IZIN"));
        Assert.Equal(2, Liste(await AnalizService.DetayAsync(o.Sorumlu, "1002", D(40), D(45))).Count);          // Sorumlu yalnız görevleri görür
        Assert.Equal("yetki", await Kod(() => AnalizService.DetayAsync(o.Saha1, "1002", D(40), D(45))));
    }

    [SqlFact]
    public async Task Rapor_gunleri_ve_tarihsiz_gecmis_arsiv()
    {
        var o = await KurAsync(); await using var _t = o.T;
        var pdf = System.Text.Encoding.ASCII.GetBytes("%PDF-1.4 ornek");
        await IzinRaporService.RaporKaydetAsync(o.Yonetici, "1006", D(10), D(14), null, pdf, "r.pdf");
        var kisiler = Liste(await AnalizService.PersonelAsync(o.Yonetici, D(8), D(12), null, null));       // 5 günlük raporun 3 günü dönemde
        Assert.Equal(3, N(Al(kisiler.First(x => P(x, "sicil") == "1006"), "raporGun")));
        Assert.Equal(3, Liste(await AnalizService.DetayAsync(o.Yonetici, "1006", D(8), D(12))).Count(x => P(x, "tur") == "RAPOR"));

        await o.T.ExecAsync("INSERT INTO gorev.gecmis_gorev (personel_adi_eski, proje_adi_eski, gorev_metni) VALUES (N'Eski Kişi', N'Eski Proje', N'Saha ölçümü');");
        Assert.Single(Liste(await AnalizService.ArsivAsync(o.Yonetici, null, null)));
        Assert.Single(Liste(await AnalizService.ArsivAsync(o.Sorumlu, "ölçüm", null)));
        Assert.Empty(Liste(await AnalizService.ArsivAsync(o.Yonetici, "yok-böyle", null)));
        Assert.Equal("yetki", await Kod(() => AnalizService.ArsivAsync(o.Saha1, null, null)));
        Assert.NotNull(await AnalizService.AnaProjelerAsync(o.Yonetici));
    }
}
