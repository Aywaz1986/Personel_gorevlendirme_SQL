using System.Text;
using Gorevlendirme;
using Xunit;

namespace Gorevlendirme.SqlTests;

/// <summary>İzin ve rapor (009): talep/onay/ret/geri çekme/kısaltma, atama çakışma kararı, raporun önceliği, evrak, kişisel görev listesi.</summary>
public class IzinRaporTests
{
    private static string D(int n) => DateTime.Today.AddDays(n).ToString("yyyy-MM-dd");
    private static byte[] Pdf => Encoding.ASCII.GetBytes("%PDF-1.4 ornek rapor");
    private static async Task<string> Kod(Func<Task> f) => (await Assert.ThrowsAsync<GorevException>(f)).Code;
    private sealed record Ortam(TestDb T, SqlService Sorumlu, SqlService Yonetici, SqlService Saha1, SqlService Saha2, SqlService Kayitsiz);
    private static string P(object o, string ad) => Convert.ToString(o.GetType().GetProperty(ad)!.GetValue(o)) ?? "";
    private static List<object> Liste(object o) => ((System.Collections.IEnumerable)o).Cast<object>().ToList();
    private static int N(object? o) => Convert.ToInt32(o);
    private static IzinRaporService.GunGirdisi G(string t, string z = "TAM") => new(t, z);

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
        var (_, kayitsiz) = await t.KisiAsync();
        await t.ExecAsync($@"INSERT INTO gorev.kullanici_yetki_istisna (hesap, sicil_no, sorumlu_mu) VALUES (N'{hs}', N'1001', 1);
            INSERT INTO gorev.kullanici_yetki_istisna (hesap, sicil_no, yonetici_mi) VALUES (N'{hy}', N'1005', 1);
            INSERT INTO gorev.kullanici_yetki_istisna (hesap, sicil_no, saha_mi) VALUES (N'{h1}', N'1002', 1);
            INSERT INTO gorev.kullanici_yetki_istisna (hesap, sicil_no, saha_mi) VALUES (N'{h2}', N'1006', 1);");
        return new Ortam(t, sorumlu, yon, saha1, saha2, kayitsiz);
    }

    private static async Task<int> AtamaYapAsync(Ortam o, string sicil, string tarih, string zaman)
    {
        var a = await TalepService.KaydetAsync(o.Sorumlu, null, null, "Toroman", null, "AY Kabul", "Ankara İvedik", "07:30", "16:35", "İş", null,
            new[] { new TalepService.GunGirdisi(tarih, zaman, 1) }, Array.Empty<string>(), true);
        var id = N(a.GetType().GetProperty("id")!.GetValue(a));
        await AtamaService.OnaylaAsync(o.Yonetici, id, new[] { new AtamaService.AtamaGirdisi(sicil, tarih, zaman) }, "REDDET");
        return id;
    }

    private static async Task<int> BildirimSayisi(SqlService s, string tur) =>
        Liste(await AtamaService.BildirimListeAsync(s, true)).Count(x => P(x, "tur") == tur);

    [SqlFact]
    public async Task Izin_talep_onay_ret_geri_cekme_ve_yetkiler()
    {
        var o = await KurAsync(); await using var _t = o.T;
        var r = await IzinRaporService.IzinKaydetAsync(o.Saha1, null, "Mazeret", "aile", new[] { G(D(40)), G(D(41), "OO") }, "REDDET");
        Assert.Equal("ONAY_BEKLIYOR", P(r, "durum")); Assert.StartsWith("IZN-", P(r, "kod"));
        var id = N(r.GetType().GetProperty("id")!.GetValue(r));
        Assert.Equal(1, await BildirimSayisi(o.Yonetici, "IZIN_TALEP"));
        Assert.Single(Liste(await IzinRaporService.IzinListeAsync(o.Saha1, null, null)));
        Assert.Empty(Liste(await IzinRaporService.IzinListeAsync(o.Saha2, null, null)));          // başkasının izni görünmez
        Assert.Single(Liste(await IzinRaporService.IzinListeAsync(o.Yonetici, "ONAY_BEKLIYOR", null)));

        Assert.Equal("yetki", await Kod(() => IzinRaporService.IzinKaydetAsync(o.Saha2, "1002", "Mazeret", null, new[] { G(D(70)) }, "REDDET")));   // başkası adına yalnız Yönetici
        Assert.Equal("yetki", await Kod(() => IzinRaporService.IzinKaydetAsync(o.Kayitsiz, null, "Mazeret", null, new[] { G(D(70)) }, "REDDET")));
        Assert.Equal("dogrulama", await Kod(() => IzinRaporService.IzinKaydetAsync(o.Saha1, null, "Mazeret", null, new[] { G(D(-3)) }, "REDDET")));  // geçmiş gün: yalnız Yönetici
        Assert.Equal("dogrulama", await Kod(() => IzinRaporService.IzinKaydetAsync(o.Saha1, null, "Mazeret", null, new[] { G(D(40), "OS") }, "REDDET"))); // aynı günde izin var (TAM)
        Assert.Equal("dogrulama", await Kod(() => IzinRaporService.IzinKaydetAsync(o.Saha1, null, "", null, new[] { G(D(80)) }, "REDDET")));
        Assert.Equal("yetki", await Kod(() => IzinRaporService.IzinGeriCekAsync(o.Saha2, id)));
        Assert.Equal("yetki", await Kod(() => IzinRaporService.IzinOnaylaAsync(o.Saha1, id, "REDDET")));
        Assert.Equal("yetki", await Kod(() => IzinRaporService.IzinReddetAsync(o.Sorumlu, id, "olmaz")));

        var on = await IzinRaporService.IzinOnaylaAsync(o.Yonetici, id, "REDDET");
        Assert.Equal("ONAYLANDI", P(on, "durum"));
        Assert.Equal(1, await BildirimSayisi(o.Saha1, "IZIN_ONAY"));
        Assert.Equal("yetki", await Kod(() => IzinRaporService.IzinGeriCekAsync(o.Saha1, id)));  // onaylıyı kişi geri çekemez
        await IzinRaporService.IzinGeriCekAsync(o.Yonetici, id);
        Assert.Equal("GERI_CEKILDI", P(Liste(await IzinRaporService.IzinListeAsync(o.Saha1, null, null))[0], "durum"));

        // ret: neden zorunlu
        var r2 = await IzinRaporService.IzinKaydetAsync(o.Saha1, null, "Mazeret", null, new[] { G(D(45)) }, "REDDET");
        var id2 = N(r2.GetType().GetProperty("id")!.GetValue(r2));
        Assert.Equal("dogrulama", await Kod(() => IzinRaporService.IzinReddetAsync(o.Yonetici, id2, " ")));
        await IzinRaporService.IzinReddetAsync(o.Yonetici, id2, "Yoğun dönem");
        Assert.Equal(1, await BildirimSayisi(o.Saha1, "IZIN_RET"));
        Assert.Equal("dogrulama", await Kod(() => IzinRaporService.IzinOnaylaAsync(o.Yonetici, id2, "REDDET")));   // ret edilmiş onaylanmaz

        // Yönetici vekâleten: anında onaylı; kısaltma
        var v = await IzinRaporService.IzinKaydetAsync(o.Yonetici, "1002", "İdari", null, new[] { G(D(50)), G(D(51)), G(D(52)) }, "REDDET");
        Assert.Equal("ONAYLANDI", P(v, "durum"));
        var vid = N(v.GetType().GetProperty("id")!.GetValue(v));
        await IzinRaporService.IzinKisaltAsync(o.Yonetici, vid, D(50));
        var l = Liste(await IzinRaporService.IzinListeAsync(o.Yonetici, "ONAYLANDI", "1002"));
        Assert.Equal("1", P(l[0], "gunSayisi"));
        Assert.Equal("yetki", await Kod(() => IzinRaporService.IzinKisaltAsync(o.Saha1, vid, D(50))));
        Assert.Equal(1, await BildirimSayisi(o.Saha1, "IZIN_KISALT"));
    }

    [SqlFact]
    public async Task Izin_onayinda_atama_cakismasi_yonetici_karar_verir_ve_izinli_gune_atama_reddedilir()
    {
        var o = await KurAsync(); await using var _t = o.T;
        var talep = await AtamaYapAsync(o, "1002", D(60), "TAM");
        var iz = await IzinRaporService.IzinKaydetAsync(o.Saha1, null, "Mazeret", null, new[] { G(D(60)) }, "REDDET");   // bekleyen izin atamayı etkilemez
        var izid = N(iz.GetType().GetProperty("id")!.GetValue(iz));
        Assert.Equal("1", P(Liste(await IzinRaporService.IzinListeAsync(o.Yonetici, "ONAY_BEKLIYOR", null))[0], "cakisanAtama"));

        Assert.Equal("cakisma", await Kod(() => IzinRaporService.IzinOnaylaAsync(o.Yonetici, izid, "REDDET")));
        Assert.Equal("ONAY_BEKLIYOR", P(Liste(await IzinRaporService.IzinListeAsync(o.Yonetici, null, null))[0], "durum"));
        Assert.Equal(1, N(await o.T.SkalerAsync("SELECT COUNT(*) FROM gorev.atamalar WHERE durum = 'AKTIF'")));        // hiçbir şey değişmedi

        var on = await IzinRaporService.IzinOnaylaAsync(o.Yonetici, izid, "CIKAR");
        Assert.Equal("1", P(on, "cikarilan"));
        Assert.Equal(1, N(await o.T.SkalerAsync("SELECT COUNT(*) FROM gorev.atamalar WHERE durum = 'CIKARILDI'")));
        Assert.Equal("ONAY_BEKLIYOR", Convert.ToString(await o.T.SkalerAsync($"SELECT durum FROM gorev.talepler WHERE id = {talep}")));
        Assert.Equal(1, await BildirimSayisi(o.Sorumlu, "IZIN_CIKARILDI"));

        // onaylı izinli güne atama HER ZAMAN reddedilir (Yönetici dahil)
        var a2 = await TalepService.KaydetAsync(o.Sorumlu, null, null, "Toroman", null, "AY Kabul", "İvedik", "07:30", "16:35", "İş", null,
            new[] { new TalepService.GunGirdisi(D(60), "OO", 1) }, Array.Empty<string>(), true);
        var a2id = N(a2.GetType().GetProperty("id")!.GetValue(a2));
        Assert.Equal("izin_rapor", await Kod(() => AtamaService.OnaylaAsync(o.Yonetici, a2id, new[] { new AtamaService.AtamaGirdisi("1002", D(60), "OO") }, "CIKAR")));

        // yarım gün: izin ÖÖ ise ÖS'ye atama olur, ÖÖ'ye olmaz
        await IzinRaporService.IzinKaydetAsync(o.Yonetici, "1006", "İdari", null, new[] { G(D(61), "OO") }, "REDDET");
        await AtamaYapAsync(o, "1006", D(61), "OS");
        var a3 = await TalepService.KaydetAsync(o.Sorumlu, null, null, "Toroman", null, "AY Kabul", "İvedik", "07:30", "16:35", "İş", null,
            new[] { new TalepService.GunGirdisi(D(61), "OO", 1) }, Array.Empty<string>(), true);
        var a3id = N(a3.GetType().GetProperty("id")!.GetValue(a3));
        Assert.Equal("izin_rapor", await Kod(() => AtamaService.OnaylaAsync(o.Yonetici, a3id, new[] { new AtamaService.AtamaGirdisi("1006", D(61), "OO") }, "REDDET")));

        // Yönetici vekâleten izin girerken çakışan atama varsa o da karar ister
        await AtamaYapAsync(o, "1006", D(62), "TAM");
        Assert.Equal("cakisma", await Kod(() => IzinRaporService.IzinKaydetAsync(o.Yonetici, "1006", "İdari", null, new[] { G(D(62)) }, "REDDET")));
        var vk = await IzinRaporService.IzinKaydetAsync(o.Yonetici, "1006", "İdari", null, new[] { G(D(62)) }, "CIKAR");
        Assert.Equal("1", P(vk, "cikarilan"));
    }

    [SqlFact]
    public async Task Rapor_kazanir_izin_iptal_atama_durur_ve_uyari_gider()
    {
        var o = await KurAsync(); await using var _t = o.T;
        await IzinRaporService.IzinKaydetAsync(o.Yonetici, "1002", "İdari", null, new[] { G(D(71)) }, "REDDET");          // onaylı izin (rapor aralığında)
        var talep = await AtamaYapAsync(o, "1002", D(72), "TAM");                                                         // rapor aralığında atama

        // evrak zorunlu / tür / boyut / yetki
        Assert.Equal("dogrulama", await Kod(() => IzinRaporService.RaporKaydetAsync(o.Saha1, null, D(70), D(72), "grip", Encoding.ASCII.GetBytes("metin"), "rapor.txt")));
        Assert.Equal("yetki", await Kod(() => IzinRaporService.RaporKaydetAsync(o.Saha2, "1002", D(70), D(72), "grip", Pdf, "rapor.pdf")));
        Assert.Equal("dogrulama", await Kod(() => IzinRaporService.RaporKaydetAsync(o.Saha1, null, D(72), D(70), "grip", Pdf, "rapor.pdf")));    // son < ilk

        var r = await IzinRaporService.RaporKaydetAsync(o.Saha1, null, D(70), D(72), "grip", Pdf, "rapor.pdf");
        Assert.Equal("1", P(r, "izinIptal")); Assert.Equal("1", P(r, "cakisanAtama"));
        var rid = N(r.GetType().GetProperty("id")!.GetValue(r));
        Assert.Equal("RAPORLA_IPTAL", Convert.ToString(await o.T.SkalerAsync("SELECT TOP 1 durum FROM gorev.izin_talepleri")));
        Assert.Equal(1, N(await o.T.SkalerAsync($"SELECT COUNT(*) FROM gorev.atamalar WHERE talep_id = {talep} AND durum = 'AKTIF'")));    // atama durur
        Assert.True(await BildirimSayisi(o.Yonetici, "RAPOR_CAKISMA") >= 1);
        Assert.Equal(1, await BildirimSayisi(o.Sorumlu, "RAPOR_CAKISMA"));

        // raporlu güne: izin girilemez, atama yapılamaz, ikinci rapor girilemez
        Assert.Equal("dogrulama", await Kod(() => IzinRaporService.IzinKaydetAsync(o.Saha1, null, "Mazeret", null, new[] { G(D(71)) }, "REDDET")));
        Assert.Equal("dogrulama", await Kod(() => IzinRaporService.RaporKaydetAsync(o.Saha1, null, D(71), D(73), "x", Pdf, "r.pdf")));
        var yeni = await TalepService.KaydetAsync(o.Sorumlu, null, null, "Toroman", null, "AY Kabul", "İvedik", "07:30", "16:35", "İş", null,
            new[] { new TalepService.GunGirdisi(D(70), "TAM", 1) }, Array.Empty<string>(), true);
        var yid = N(yeni.GetType().GetProperty("id")!.GetValue(yeni));
        Assert.Equal("izin_rapor", await Kod(() => AtamaService.OnaylaAsync(o.Yonetici, yid, new[] { new AtamaService.AtamaGirdisi("1002", D(70), "TAM") }, "CIKAR")));

        // evrak: sahibi ve Yönetici açabilir, başkası açamaz; listede boyut ve ad görünür
        var (veri, ad) = await IzinRaporService.RaporEvrakAsync(o.Saha1, rid);
        Assert.Equal(Pdf, veri);
        Assert.Matches(@"^Ahmet_Sümbül_\d{8}_RPR-\d{4}\.pdf$", ad);      // standart ad: PersonelAdi_Tarih_RaporKodu.uzanti
        await IzinRaporService.RaporEvrakAsync(o.Yonetici, rid);
        Assert.Equal("yetki", await Kod(() => IzinRaporService.RaporEvrakAsync(o.Saha2, rid)));
        Assert.Single(Liste(await IzinRaporService.RaporListeAsync(o.Saha1, null, false)));
        Assert.Empty(Liste(await IzinRaporService.RaporListeAsync(o.Saha2, null, false)));

        // iptal: neden zorunlu, başkası iptal edemez; iptalden sonra atama yapılabilir
        Assert.Equal("dogrulama", await Kod(() => IzinRaporService.RaporIptalAsync(o.Saha1, rid, "")));
        Assert.Equal("yetki", await Kod(() => IzinRaporService.RaporIptalAsync(o.Saha2, rid, "yanlış girildi")));
        await IzinRaporService.RaporIptalAsync(o.Saha1, rid, "Yanlış tarih girildi");
        Assert.Empty(Liste(await IzinRaporService.RaporListeAsync(o.Saha1, null, false)));
        Assert.Single(Liste(await IzinRaporService.RaporListeAsync(o.Saha1, null, true)));
        await AtamaService.OnaylaAsync(o.Yonetici, yid, new[] { new AtamaService.AtamaGirdisi("1002", D(70), "TAM") }, "REDDET");
    }

    [SqlFact]
    public async Task Gorevlerim_yalniz_kendi_atamalari_ve_matriste_izin_rapor()
    {
        var o = await KurAsync(); await using var _t = o.T;
        var pzt = DateTime.Today.AddDays(28); pzt = pzt.AddDays(-(((int)pzt.DayOfWeek + 6) % 7));
        string G0(int i) => pzt.AddDays(i).ToString("yyyy-MM-dd");
        await AtamaYapAsync(o, "1002", G0(0), "TAM");
        await AtamaYapAsync(o, "1006", G0(1), "TAM");
        var gl = Liste(await IzinRaporService.GorevlerimAsync(o.Saha1, null, null));
        Assert.Single(gl); Assert.Equal(G0(0), P(gl[0], "tarih")); Assert.Equal("Toroman", P(gl[0], "ana"));
        Assert.Single(Liste(await IzinRaporService.GorevlerimAsync(o.Saha2, null, null)));
        Assert.Equal("yetki", await Kod(() => IzinRaporService.GorevlerimAsync(o.Kayitsiz, null, null)));

        var s0 = await MatrisService.SurumAsync(o.Saha1, G0(0));
        await IzinRaporService.IzinKaydetAsync(o.Yonetici, "1001", "İdari", null, new[] { G(G0(2), "OS") }, "REDDET");
        await IzinRaporService.RaporKaydetAsync(o.Yonetici, "1005", G0(3), G0(4), null, Pdf, "r.pdf");
        Assert.NotEqual(s0, await MatrisService.SurumAsync(o.Saha1, G0(0)));       // izin/rapor sürümü değiştirir
        var hafta = Liste(await MatrisService.HaftaAsync(o.Saha1, G0(0), null, null, null, true));
        Assert.Equal(4, hafta.Count);                                                // iki atama + izinli + raporlu
        var izinler = string.Join("|", hafta.Select(x => Convert.ToString(x.GetType().GetProperty("izinler")!.GetValue(x))));
        Assert.Contains("IZIN", izinler); Assert.Contains("RAPOR", izinler); Assert.Contains(G0(4), izinler);
    }
}
