using Gorevlendirme;
using Xunit;

namespace Gorevlendirme.SqlTests;

/// <summary>Dilim 11 (013): saha notu, telefon/not görünürlüğü, sayaçlar, ikame uyarıları, analiz müsait/tatil, tavsiye listesi, matris yerleşke süzgeci.</summary>
public class SenaryoTests
{
    private static async Task<string> Kod(Func<Task> f) => (await Assert.ThrowsAsync<GorevException>(f)).Code;
    private sealed record Ortam(TestDb T, SqlService Sorumlu, SqlService Yonetici, SqlService Saha1, SqlService Saha2);
    private static List<object> Liste(object o) => ((System.Collections.IEnumerable)o).Cast<object>().ToList();
    private static object? Al(object o, string ad) => o.GetType().GetProperty(ad)!.GetValue(o);
    private static string P(object o, string ad) => Convert.ToString(Al(o, ad), System.Globalization.CultureInfo.InvariantCulture) ?? "";
    private static int N(object? o) => Convert.ToInt32(o);
    private static decimal M(object? o) => Convert.ToDecimal(o, System.Globalization.CultureInfo.InvariantCulture);

    private static DateTime Pazartesi()
    {
        var d = DateTime.Today.AddDays(40);
        return d.AddDays(-(((int)d.DayOfWeek + 6) % 7));
    }
    private static string D(DateTime p, int n) => p.AddDays(n).ToString("yyyy-MM-dd");

    private static async Task<Ortam> KurAsync()
    {
        var t = await TestDb.OlusturAsync();
        await t.Migrator.UygulaAsync(false);
        await t.ExecAsync(@"INSERT INTO gorev.personel (sicil_no, adi_soyadi, bolum, gsm_no) VALUES
            (N'1001', N'Erdem Efe', N'Proje', N'0532 111 11 11'), (N'1002', N'Ahmet Sümbül', N'Teknik', N'0532 222 22 22'), (N'1005', N'Yönetici Kişi', N'Merkez', N'0532 555 55 55'), (N'1006', N'Ali Örnek', N'Teknik', N'0532 666 66 66');");
        var (hs, sorumlu) = await t.KisiAsync(); var (hy, yon) = await t.KisiAsync(); var (h1, saha1) = await t.KisiAsync(); var (h2, saha2) = await t.KisiAsync();
        await t.ExecAsync($@"INSERT INTO gorev.kullanici_yetki_istisna (hesap, sicil_no, sorumlu_mu) VALUES (N'{hs}', N'1001', 1);
            INSERT INTO gorev.kullanici_yetki_istisna (hesap, sicil_no, yonetici_mi) VALUES (N'{hy}', N'1005', 1);
            INSERT INTO gorev.kullanici_yetki_istisna (hesap, sicil_no, saha_mi) VALUES (N'{h1}', N'1002', 1);
            INSERT INTO gorev.kullanici_yetki_istisna (hesap, sicil_no, saha_mi) VALUES (N'{h2}', N'1006', 1);");
        return new Ortam(t, sorumlu, yon, saha1, saha2);
    }

    private static async Task<int> TalepAsync(Ortam o, string not, params (string Tarih, string Zaman)[] gunler)
    {
        var a = await TalepService.KaydetAsync(o.Sorumlu, null, null, "Toroman", null, "AY Kabul", "Ankara İvedik", "07:30", "16:35", "İş", not,
            gunler.Select(g => new TalepService.GunGirdisi(g.Tarih, g.Zaman, 1)).ToArray(), Array.Empty<string>(), true);
        return N(a.GetType().GetProperty("id")!.GetValue(a));
    }

    private static Task Ata(Ortam o, int talep, string sicil, string tarih, string zaman) =>
        AtamaService.OnaylaAsync(o.Yonetici, talep, new[] { new AtamaService.AtamaGirdisi(sicil, tarih, zaman) }, "REDDET");

    [SqlFact]
    public async Task Saha_notu_1000_karakter_kabul_edilir_ve_asimda_reddedilir()
    {
        var o = await KurAsync(); await using var _t = o.T; var p = Pazartesi();
        var id = await TalepAsync(o, new string('x', 1000), (D(p, 0), "TAM"));
        Assert.Equal(1000, P(await SenaryoService.IletisimAsync(o.Sorumlu, id), "sahaNotu").Length);
        Assert.Equal("dogrulama", await Kod(() => TalepAsync(o, new string('y', 1001), (D(p, 1), "TAM"))));
    }

    [SqlFact]
    public async Task Telefon_ve_saha_notu_gorunurlugu_senaryoya_uyar()
    {
        var o = await KurAsync(); await using var _t = o.T; var p = Pazartesi();
        var id = await TalepAsync(o, "Araç: kamyonet", (D(p, 0), "TAM"));
        // atamadan önce: Yönetici ve Sorumlu görür; Saha göremez
        var yon = await SenaryoService.IletisimAsync(o.Yonetici, id);
        Assert.Equal("0532 111 11 11", P(yon, "sorumluGsm")); Assert.Null(Al(yon, "atananlar"));
        Assert.Equal("Araç: kamyonet", P(yon, "sahaNotu"));
        Assert.Equal("yetki", await Kod(() => SenaryoService.IletisimAsync(o.Saha1, id)));
        await Ata(o, id, "1002", D(p, 0), "TAM");
        // atamadan sonra: atanan sorumlunun telefonunu + notu görür; sorumlu atananların telefonunu görür; atanmayan Saha göremez
        var s1 = await SenaryoService.IletisimAsync(o.Saha1, id);
        Assert.Equal("0532 111 11 11", P(s1, "sorumluGsm")); Assert.Equal("Araç: kamyonet", P(s1, "sahaNotu")); Assert.Null(Al(s1, "atananlar"));
        Assert.Equal("yetki", await Kod(() => SenaryoService.IletisimAsync(o.Saha2, id)));
        var so = await SenaryoService.IletisimAsync(o.Sorumlu, id);
        Assert.Contains("0532 222 22 22", System.Text.Json.JsonSerializer.Serialize(Al(so, "atananlar")));
        Assert.Contains("0532 222 22 22", System.Text.Json.JsonSerializer.Serialize(Al(await SenaryoService.IletisimAsync(o.Yonetici, id), "atananlar")));
    }

    [SqlFact]
    public async Task Sayaclar_ve_ikame_uyarisi_calisir()
    {
        var o = await KurAsync(); await using var _t = o.T; var p = Pazartesi();
        var id = await TalepAsync(o, "n", (D(p, 0), "TAM"));
        var s = (Dictionary<string, object?>)await SenaryoService.SayaclarAsync(o.Yonetici);
        Assert.Equal(1, N(s["bekleyenTalep"])); Assert.Equal(0, N(s["izinOnay"])); Assert.Equal(0, N(s["ikameUyari"]));
        Assert.Equal(0, N(s["sahadaBugun"])); Assert.True(N(s["sahaToplam"]) >= 0); // 015: "Aktif Sahadaki Personel" kartı (bugün ataması yok)
        await Ata(o, id, "1002", D(p, 0), "TAM");
        s = (Dictionary<string, object?>)await SenaryoService.SayaclarAsync(o.Yonetici);
        Assert.Equal(0, N(s["bekleyenTalep"]));
        var so = (Dictionary<string, object?>)await SenaryoService.SayaclarAsync(o.Sorumlu);
        Assert.Equal(1, N(so["onaylanan"])); Assert.Null(so["bekleyenTalep"]); Assert.Null(so["sahadaBugun"]);
        Assert.Null(((Dictionary<string, object?>)await SenaryoService.SayaclarAsync(o.Saha1))["bekleyenTalep"]);
        // ayrılan kişi → ikame uyarısı (Yönetici + talebin Sorumlusu)
        await o.T.ExecAsync("UPDATE gorev.personel SET aktif = 0 WHERE sicil_no = N'1002'");
        var l = Liste(await SenaryoService.IkameBekleyenlerAsync(o.Yonetici));
        Assert.Single(l); Assert.Equal("AYRILDI", P(l[0], "neden")); Assert.Equal("1002", P(l[0], "sicil"));
        Assert.Single(Liste(await SenaryoService.IkameBekleyenlerAsync(o.Sorumlu)));
        Assert.Equal("yetki", await Kod(() => SenaryoService.IkameBekleyenlerAsync(o.Saha1)));
        Assert.Equal(1, N(((Dictionary<string, object?>)await SenaryoService.SayaclarAsync(o.Yonetici))["ikameUyari"]));
    }

    [SqlFact]
    public async Task Analiz_musait_tatil_ve_tatilde_calisma_hesaplanir()
    {
        var o = await KurAsync(); await using var _t = o.T; var p = Pazartesi();
        await o.T.ExecAsync($@"INSERT INTO gorev.takvim_tatil (baslangic, bitis, zaman_dilimi, tur, ad) VALUES ('{D(p, 2)}', '{D(p, 2)}', 'TAM', 'RESMI', N'Tatil A'), ('{D(p, 3)}', '{D(p, 3)}', 'OO', 'IDARI', N'Yarım B')");
        var id = await TalepAsync(o, "n", (D(p, 0), "TAM"), (D(p, 3), "OO"));
        await Ata(o, id, "1002", D(p, 0), "TAM"); await Ata(o, id, "1002", D(p, 3), "OO");
        await IzinRaporService.IzinKaydetAsync(o.Yonetici, "1002", "Mazeret", null, new[] { new IzinRaporService.GunGirdisi(D(p, 1), "TAM") }, "REDDET");
        // Pzt görev (1) · Sal izin · Çar tatil (1) · Per ÖÖ tatil+görev (0,5) + ÖS müsait (0,5) · Cum müsait (1) → müsait 1,5; tatil 1,5; tatilde çalışma 0,5
        var k = Liste(await AnalizService.PersonelAsync(o.Yonetici, D(p, 0), D(p, 4), null, null)).First(x => P(x, "sicil") == "1002");
        Assert.Equal(1.5m, M(Al(k, "musaitGun"))); Assert.Equal(1.5m, M(Al(k, "tatilGun"))); Assert.Equal(0.5m, M(Al(k, "tatilCalismaGun")));
        Assert.Equal(1.5m, M(Al(k, "adamGun")));
        var sor = Liste(await AnalizService.PersonelAsync(o.Sorumlu, D(p, 0), D(p, 4), null, null)).First(x => P(x, "sicil") == "1002");
        Assert.Null(Al(sor, "musaitGun")); Assert.Equal(0.5m, M(Al(sor, "tatilCalismaGun")));
    }

    [SqlFact]
    public async Task Tavsiye_listesi_ek_bilgi_verir_ve_matris_yerleske_suzer()
    {
        var o = await KurAsync(); await using var _t = o.T; var p = Pazartesi();
        var t1 = await TalepAsync(o, "n", (D(p, 0), "TAM"), (D(p, 1), "OO"));
        await Ata(o, t1, "1002", D(p, 0), "TAM"); await Ata(o, t1, "1002", D(p, 1), "OO");
        var t2 = await TalepAsync(o, "n", (D(p, 7), "TAM"), (D(p, 8), "TAM"));
        var a = Liste(await AtamaService.AdaylarAsync(o.Yonetici, t2, "Sümbül")).First(x => P(x, "sicil") == "1002");
        Assert.Equal(1, N(Al(a, "toplamGorev"))); Assert.Equal(1.5m, M(Al(a, "adamGun"))); Assert.Equal("Ankara İvedik", P(a, "yerlesker"));
        Assert.Equal(2, N(Al(a, "talepGun"))); Assert.Equal(0, N(Al(a, "izinRaporGun")));
        var m = Liste(await MatrisService.HaftaAsync(o.Yonetici, D(p, 0), null, null, null, true, "Ankara İvedik"));
        Assert.Contains(m, x => P(x, "sicil") == "1002");
        Assert.Empty(Liste(await MatrisService.HaftaAsync(o.Yonetici, D(p, 0), null, null, null, true, "Olmayan Konum")));
    }
}
