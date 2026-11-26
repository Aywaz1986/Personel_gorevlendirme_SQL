using Gorevlendirme;
using Xunit;

namespace Gorevlendirme.SqlTests;

/// <summary>Dilim 16 (017): yıllı talep kodu, 14 gün atama ufku, adaylar yalnız SAHA, matris iletişim/saha süzgeci, atanan adları, Sorumlu izin bilgisi.</summary>
public class Dilim16Tests
{
    private static async Task<string> Kod(Func<Task> f) => (await Assert.ThrowsAsync<GorevException>(f)).Code;
    private sealed record Ortam(TestDb T, SqlService Sorumlu, SqlService Yonetici, SqlService Saha1);
    private static List<object> Liste(object o) => ((System.Collections.IEnumerable)o).Cast<object>().ToList();
    private static object? Al(object o, string ad) => o.GetType().GetProperty(ad)!.GetValue(o);
    private static string P(object o, string ad) => Convert.ToString(Al(o, ad), System.Globalization.CultureInfo.InvariantCulture) ?? "";
    private static string D(int n) => DateTime.Today.AddDays(n).ToString("yyyy-MM-dd");

    private static async Task<Ortam> KurAsync()
    {
        var t = await TestDb.OlusturAsync();
        await t.Migrator.UygulaAsync(false);   // ufuk varsayılan 14 gün kalır
        await t.ExecAsync(@"INSERT INTO gorev.personel (sicil_no, adi_soyadi, bolum, gsm_no) VALUES
            (N'1001', N'Erdem Efe', N'Proje', N'0532 111 11 11'), (N'1002', N'Ahmet Sümbül', N'Teknik', N'0532 222 22 22'), (N'1005', N'Yönetici Kişi', N'Merkez', N'0532 555 55 55'),
            (N'1006', N'Ali Örnek', N'Teknik', N'0532 666 66 66');");
        var (hs, sorumlu) = await t.KisiAsync(); var (hy, yon) = await t.KisiAsync(); var (h1, saha1) = await t.KisiAsync();
        await t.ExecAsync($@"INSERT INTO gorev.kullanici_yetki_istisna (hesap, sicil_no, sorumlu_mu) VALUES (N'{hs}', N'1001', 1);
            INSERT INTO gorev.kullanici_yetki_istisna (hesap, sicil_no, yonetici_mi) VALUES (N'{hy}', N'1005', 1);
            INSERT INTO gorev.kullanici_yetki_istisna (hesap, sicil_no, saha_mi) VALUES (N'{h1}', N'1002', 1);");   // 1006 saha DEĞİL
        return new Ortam(t, sorumlu, yon, saha1);
    }

    private static async Task<int> TalepAsync(Ortam o, int kisi, params string[] gunler)
    {
        var a = await TalepService.KaydetAsync(o.Sorumlu, null, null, "Toroman", null, "AY Kabul", "Ankara İvedik", "07:30", "16:35", "İş", "not",
            gunler.Select(g => new TalepService.GunGirdisi(g, "TAM", kisi)).ToArray(), Array.Empty<string>(), true);
        return Convert.ToInt32(Al(a, "id"));
    }

    [SqlFact]
    public async Task Talep_kodu_yil_ve_sirali_numara_icerir()
    {
        var o = await KurAsync(); await using var _t = o.T;
        var a = await TalepAsync(o, 1, D(1)); var b = await TalepAsync(o, 1, D(2));
        var yil = DateTime.Today.Year;
        Assert.Equal($"TLP-{yil}-0001", Convert.ToString(await o.T.SkalerAsync($"SELECT kod FROM gorev.talepler WHERE id = {a}")));
        Assert.Equal($"TLP-{yil}-0002", Convert.ToString(await o.T.SkalerAsync($"SELECT kod FROM gorev.talepler WHERE id = {b}")));
        Assert.Equal(0, Convert.ToInt32(await o.T.SkalerAsync("SELECT COUNT(*) FROM (SELECT yil, yil_sira FROM gorev.talepler GROUP BY yil, yil_sira HAVING COUNT(*) > 1) x")));
    }

    [SqlFact]
    public async Task Atama_14_gunden_ileriye_yapilamaz_ve_ayardan_degisir()
    {
        var o = await KurAsync(); await using var _t = o.T;
        var yakin = await TalepAsync(o, 1, D(14)); var uzak = await TalepAsync(o, 1, D(15));
        await AtamaService.OnaylaAsync(o.Yonetici, yakin, new[] { new AtamaService.AtamaGirdisi("1002", D(14), "TAM") }, "REDDET");
        Assert.Equal("dogrulama", await Kod(() => AtamaService.OnaylaAsync(o.Yonetici, uzak, new[] { new AtamaService.AtamaGirdisi("1002", D(15), "TAM") }, "REDDET")));
        await o.T.ExecAsync("UPDATE gorev.sistem_ayarlari SET deger = N'30' WHERE anahtar = N'ATAMA_UFKU_GUN';");
        await AtamaService.OnaylaAsync(o.Yonetici, uzak, new[] { new AtamaService.AtamaGirdisi("1002", D(15), "TAM") }, "REDDET");
    }

    [SqlFact]
    public async Task Adaylar_yalniz_saha_rolundekilerdir()
    {
        var o = await KurAsync(); await using var _t = o.T;
        var id = await TalepAsync(o, 1, D(1));
        var l = Liste(await AtamaService.AdaylarAsync(o.Yonetici, id, null));
        Assert.Contains(l, x => P(x, "sicil") == "1002");
        Assert.DoesNotContain(l, x => P(x, "sicil") == "1006");      // saha rolü yok
    }

    [SqlFact]
    public async Task Atananlar_ve_matris_iletisim_yalniz_yetkililere_gorunur()
    {
        var o = await KurAsync(); await using var _t = o.T;
        var id = await TalepAsync(o, 1, D(1));
        await AtamaService.OnaylaAsync(o.Yonetici, id, new[] { new AtamaService.AtamaGirdisi("1002", D(1), "TAM") }, "REDDET");
        var ad = Liste(await TalepService.AtananAdlarAsync(o.Yonetici)).Single();
        Assert.Equal("Ahmet Sümbül", P(ad, "adlar"));
        Assert.Single(Liste(await TalepService.AtananAdlarAsync(o.Sorumlu)));
        Assert.Equal("yetki", await Kod(() => TalepService.AtananAdlarAsync(o.Saha1)));
        var m = Liste(await MatrisService.HaftaAsync(o.Yonetici, D(1), null, null, null, false, null, false, true));
        var k = m.Single(x => P(x, "sicil") == "1002");
        Assert.Equal("0532 222 22 22", P(k, "gsm"));
        Assert.DoesNotContain(m, x => P(x, "sicil") == "1006");      // saha süzgeci
        Assert.Contains("0532 111 11 11", System.Text.Json.JsonSerializer.Serialize(Al(k, "hucreler")));   // sorumlu telefonu
        var s = Liste(await MatrisService.HaftaAsync(o.Saha1, D(1), null, null, null, false, null, false, true)).Single(x => P(x, "sicil") == "1002");
        Assert.Equal("", P(s, "gsm"));                                // saha rolü telefonu göremez
    }

    [SqlFact]
    public async Task Sorumlu_izin_rapor_bilgisini_yalniz_okur()
    {
        var o = await KurAsync(); await using var _t = o.T;
        await IzinRaporService.RaporKaydetAsync(o.Saha1, null, D(1), D(3), "grip", System.Text.Encoding.ASCII.GetBytes("%PDF-1.4 ornek rapor"), "rapor.pdf");
        var l = Liste(await TalepService.IzinRaporBilgiAsync(o.Sorumlu, 14));
        Assert.Contains(l, x => P(x, "sicil") == "1002" && P(x, "tur") == "RAPOR");
        Assert.Equal("yetki", await Kod(() => TalepService.IzinRaporBilgiAsync(o.Saha1, 14)));
    }

    [SqlFact]
    public async Task Havuz_efor_atamalari_ust_dugumlere_yuvarlar_ve_yalniz_yonetici_gorur()
    {
        var o = await KurAsync(); await using var _t = o.T;
        var id = await TalepAsync(o, 1, D(1), D(2));
        await AtamaService.OnaylaAsync(o.Yonetici, id, new[] { new AtamaService.AtamaGirdisi("1002", D(1), "TAM"), new AtamaService.AtamaGirdisi("1002", D(2), "TAM") }, "REDDET");
        var l = Liste(await HavuzService.EforAsync(o.Yonetici));
        var yaprak = Convert.ToInt32(await o.T.SkalerAsync($"SELECT havuz_id FROM gorev.talepler WHERE id = {id}"));
        var kok = Convert.ToInt32(await o.T.SkalerAsync($@"SELECT h1.id FROM gorev.proje_havuzu h4 JOIN gorev.proje_havuzu h3 ON h3.id = h4.ust_id
            JOIN gorev.proje_havuzu h2 ON h2.id = h3.ust_id JOIN gorev.proje_havuzu h1 ON h1.id = h2.ust_id WHERE h4.id = {yaprak}"));
        Assert.Equal("2.0", P(l.Single(x => P(x, "id") == yaprak.ToString()), "adamGun"));
        Assert.Equal("2.0", P(l.Single(x => P(x, "id") == kok.ToString()), "adamGun"));
        Assert.Equal("yetki", await Kod(() => HavuzService.EforAsync(o.Sorumlu)));
    }

    [SqlFact]
    public async Task Eslestirme_kapsam_disi_rol_vermez_ayri_kayitlanir_ve_son_guncelleyen_listelenir()
    {
        var o = await KurAsync(); await using var _t = o.T;
        await KadroService.EslestirmeKaydetAsync(o.Yonetici, "Teknik", "DISI");
        var l = Liste(await KadroService.EslestirmeListeAsync(o.Yonetici));
        var teknik = l.Single(x => P(x, "bolum") == "Teknik");
        Assert.Equal("DISI", P(teknik, "rol"));
        Assert.NotEqual("", P(teknik, "sonKullanici"));
        Assert.Equal("", P(l.Single(x => P(x, "bolum") == "Merkez"), "rol"));     // karar verilmemiş = bekliyor
        // DISI bölümde istisnasız kişi hiçbir rol almaz
        Assert.Empty(Liste(await SenaryoService.RolPersonelAsync(o.Yonetici, "SAHA", "Ali")));
        Assert.Equal("dogrulama", await Kod(() => KadroService.EslestirmeKaydetAsync(o.Yonetici, "Teknik", "YONETICI")));
    }
}
