using Gorevlendirme;
using Xunit;

namespace Gorevlendirme.SqlTests;

/// <summary>Haftalık matris (008): hafta içeriği, filtreler, sürüm, yetki.</summary>
public class MatrisTests
{
    private static async Task<string> Kod(Func<Task> f) => (await Assert.ThrowsAsync<GorevException>(f)).Code;
    private sealed record Ortam(TestDb T, SqlService Sorumlu, SqlService Yonetici, SqlService Saha, SqlService Kayitsiz);

    private static async Task<Ortam> KurAsync()
    {
        var t = await TestDb.OlusturAsync();
        await t.MigrateAsync();
        await t.ExecAsync(@"INSERT INTO gorev.personel (sicil_no, adi_soyadi, bolum) VALUES
            (N'1001', N'Erdem Efe', N'Proje'), (N'1002', N'Ahmet Sümbül', N'Teknik'), (N'1004', N'Pasif Kişi', N'Teknik'),
            (N'1005', N'Yönetici Kişi', N'Merkez'), (N'1006', N'Ali Örnek', N'Teknik'), (N'1007', N'Ayşe Örnek', N'Destek');
            UPDATE gorev.personel SET aktif = 0 WHERE sicil_no = N'1004';");
        var (hs, sorumlu) = await t.KisiAsync();
        var (hy, yon) = await t.KisiAsync();
        var (hh, saha) = await t.KisiAsync();
        var (_, kayitsiz) = await t.KisiAsync();
        await t.ExecAsync($@"INSERT INTO gorev.kullanici_yetki_istisna (hesap, sicil_no, sorumlu_mu) VALUES (N'{hs}', N'1001', 1);
            INSERT INTO gorev.kullanici_yetki_istisna (hesap, sicil_no, yonetici_mi) VALUES (N'{hy}', N'1005', 1);
            INSERT INTO gorev.kullanici_yetki_istisna (hesap, sicil_no, saha_mi) VALUES (N'{hh}', N'1002', 1);");
        return new Ortam(t, sorumlu, yon, saha, kayitsiz);
    }

    private static string P(object o, string ad) => Convert.ToString(o.GetType().GetProperty(ad)!.GetValue(o)) ?? "";
    private static List<object> Liste(object o) => ((System.Collections.IEnumerable)o).Cast<object>().ToList();
    private static string Json(object satir) => Convert.ToString(satir.GetType().GetProperty("hucreler")!.GetValue(satir))!;

    [SqlFact]
    public async Task Hafta_icerigi_filtreler_ve_hafta_basi_normalizasyonu()
    {
        var o = await KurAsync(); await using var _t = o.T;
        var a = await TalepService.KaydetAsync(o.Sorumlu, null, null, "Toroman", null, "AY Kabul", "Ankara İvedik", "07:30", "16:35", "İş", null,
            new[] { new TalepService.GunGirdisi("2026-11-23", "TAM", 1), new TalepService.GunGirdisi("2026-11-25", "OO", 1), new TalepService.GunGirdisi("2026-12-01", "TAM", 1) }, Array.Empty<string>(), true);
        var b = await TalepService.KaydetAsync(o.Sorumlu, null, null, "Mezuniyet", null, "Tören", "Salon", "08:00", "12:00", "İş", null,
            new[] { new TalepService.GunGirdisi("2026-11-24", "TAM", 1) }, Array.Empty<string>(), true);
        var ida = Convert.ToInt32(a.GetType().GetProperty("id")!.GetValue(a)); var idb = Convert.ToInt32(b.GetType().GetProperty("id")!.GetValue(b));
        await AtamaService.OnaylaAsync(o.Yonetici, ida, new[] { new AtamaService.AtamaGirdisi("1002", "2026-11-23", "TAM"), new AtamaService.AtamaGirdisi("1006", "2026-11-25", "OO"), new AtamaService.AtamaGirdisi("1002", "2026-12-01", "TAM") }, "REDDET");
        await AtamaService.OnaylaAsync(o.Yonetici, idb, new[] { new AtamaService.AtamaGirdisi("1007", "2026-11-24", "TAM") }, "REDDET");

        // Haftanın ortasındaki bir gün verilse de hafta pazartesiye çekilir; 1 Aralık haftası dışında kalır.
        var hafta = Liste(await MatrisService.HaftaAsync(o.Saha, "2026-11-25", null, null, null, true));
        Assert.Equal(3, hafta.Count);
        Assert.Equal(new[] { "Ahmet Sümbül", "Ali Örnek", "Ayşe Örnek" }, hafta.Select(x => P(x, "ad")).ToArray());
        var ahmet = Json(hafta[0]);
        Assert.Contains("2026-11-23", ahmet); Assert.DoesNotContain("2026-12-01", ahmet); Assert.Contains("Toroman", ahmet); Assert.Contains("TLP-", ahmet);
        Assert.Contains("OO", Json(hafta[1]));

        Assert.Equal(2, Liste(await MatrisService.HaftaAsync(o.Sorumlu, "2026-11-23", "Teknik", null, null, true)).Count);                         // bölüm
        Assert.Single(Liste(await MatrisService.HaftaAsync(o.Yonetici, "2026-11-23", null, "Mezuniyet", null, true)));                              // Ana Proje
        Assert.Single(Liste(await MatrisService.HaftaAsync(o.Yonetici, "2026-11-23", null, null, "Ali", true)));                                    // ad arama
        Assert.Equal(5, Liste(await MatrisService.HaftaAsync(o.Yonetici, "2026-11-23", null, null, null, false)).Count);                            // aktif kadro (pasif hariç)
        Assert.Empty(Liste(await MatrisService.HaftaAsync(o.Yonetici, "2026-11-30", null, "Mezuniyet", null, false)));                             // ana filtre görevli şartı getirir
        Assert.Equal(new[] { "Destek", "Proje", "Teknik" }, ((System.Collections.IEnumerable)await MatrisService.BolumlerAsync(o.Saha)).Cast<string>().Where(x => x != "Merkez").ToArray());
    }

    [SqlFact]
    public async Task Cikarilan_atama_matristen_kalkar_ve_surum_degisir()
    {
        var o = await KurAsync(); await using var _t = o.T;
        var s0 = await MatrisService.SurumAsync(o.Saha, "2026-11-23");
        var a = await TalepService.KaydetAsync(o.Sorumlu, null, null, "Toroman", null, "AY Kabul", "İvedik", "07:30", "16:35", "İş", null,
            new[] { new TalepService.GunGirdisi("2026-11-23", "TAM", 1) }, Array.Empty<string>(), true);
        var ida = Convert.ToInt32(a.GetType().GetProperty("id")!.GetValue(a));
        await AtamaService.OnaylaAsync(o.Yonetici, ida, new[] { new AtamaService.AtamaGirdisi("1002", "2026-11-23", "TAM") }, "REDDET");
        var s1 = await MatrisService.SurumAsync(o.Saha, "2026-11-23");
        Assert.NotEqual(s0, s1);
        Assert.Equal(s1, await MatrisService.SurumAsync(o.Saha, "2026-11-26"));                    // aynı hafta, aynı sürüm
        Assert.Equal(s0, await MatrisService.SurumAsync(o.Saha, "2026-12-07"));                    // başka hafta etkilenmez

        var b = await TalepService.KaydetAsync(o.Sorumlu, null, null, "Mezuniyet", null, "Tören", "Salon", "08:00", "12:00", "İş", null,
            new[] { new TalepService.GunGirdisi("2026-11-23", "TAM", 1) }, Array.Empty<string>(), true);
        var idb = Convert.ToInt32(b.GetType().GetProperty("id")!.GetValue(b));
        await AtamaService.OnaylaAsync(o.Yonetici, idb, new[] { new AtamaService.AtamaGirdisi("1002", "2026-11-23", "TAM") }, "CIKAR");
        var hafta = Liste(await MatrisService.HaftaAsync(o.Saha, "2026-11-23", null, null, null, true));
        Assert.Single(hafta);
        Assert.Contains("Mezuniyet", Json(hafta[0])); Assert.DoesNotContain("Toroman", Json(hafta[0]));
        Assert.NotEqual(s1, await MatrisService.SurumAsync(o.Saha, "2026-11-23"));                 // çıkarma da sürümü değiştirir
    }

    [SqlFact]
    public async Task Kayitsiz_kisi_matrisi_goremez()
    {
        var o = await KurAsync(); await using var _t = o.T;
        Assert.Equal("yetki", await Kod(() => MatrisService.HaftaAsync(o.Kayitsiz, "2026-11-23", null, null, null, true)));
        Assert.Equal("yetki", await Kod(() => MatrisService.SurumAsync(o.Kayitsiz, "2026-11-23")));
        Assert.Equal("yetki", await Kod(() => MatrisService.BolumlerAsync(o.Kayitsiz)));
    }
}
