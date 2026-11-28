using System.Text;
using Gorevlendirme;
using Xunit;

namespace Gorevlendirme.SqlTests;

/// <summary>Dilim 12 (014): rol bazlı kişi listeleri, işlem günlüğü, rapor düzeltme, revizede kişi çıkarma/müsaitlik, analiz kırılımı, matriste "sadece müsaitler".</summary>
public class Dilim12Tests
{
    private static async Task<string> Kod(Func<Task> f) => (await Assert.ThrowsAsync<GorevException>(f)).Code;
    private sealed record Ortam(TestDb T, SqlService Sorumlu, SqlService Yonetici, SqlService Saha1, SqlService Saha2);
    private static List<object> Liste(object o) => ((System.Collections.IEnumerable)o).Cast<object>().ToList();
    private static object? Al(object o, string ad) => o.GetType().GetProperty(ad)!.GetValue(o);
    private static string P(object o, string ad) => Convert.ToString(Al(o, ad), System.Globalization.CultureInfo.InvariantCulture) ?? "";
    private static int N(object? o) => Convert.ToInt32(o);
    private static byte[] Pdf => Encoding.ASCII.GetBytes("%PDF-1.4 ornek rapor");

    private static DateTime Pazartesi()
    {
        var d = DateTime.Today.AddDays(40);
        return d.AddDays(-(((int)d.DayOfWeek + 6) % 7));
    }
    private static string D(DateTime p, int n) => p.AddDays(n).ToString("yyyy-MM-dd");

    private static async Task<Ortam> KurAsync()
    {
        var t = await TestDb.OlusturAsync();
        await t.MigrateAsync();
        await t.ExecAsync(@"INSERT INTO gorev.personel (sicil_no, adi_soyadi, bolum, gsm_no) VALUES
            (N'1001', N'Erdem Efe', N'Proje', N'0532 111 11 11'), (N'1002', N'Ahmet Sümbül', N'Teknik', N'0532 222 22 22'), (N'1005', N'Yönetici Kişi', N'Merkez', N'0532 555 55 55'),
            (N'1006', N'Ali Örnek', N'Teknik', N'0532 666 66 66'), (N'1007', N'Bölümden Saha', N'Operasyon', N'0532 777 77 77'), (N'1008', N'Bölümden Sorumlu', N'Yönetim', N'0532 888 88 88');
            INSERT INTO gorev.rol_bolum_eslestirme (bolum, rol) VALUES (N'Operasyon', N'SAHA'), (N'Yönetim', N'SORUMLU');");
        var (hs, sorumlu) = await t.KisiAsync(); var (hy, yon) = await t.KisiAsync(); var (h1, saha1) = await t.KisiAsync(); var (h2, saha2) = await t.KisiAsync();
        await t.ExecAsync($@"INSERT INTO gorev.kullanici_yetki_istisna (hesap, sicil_no, sorumlu_mu) VALUES (N'{hs}', N'1001', 1);
            INSERT INTO gorev.kullanici_yetki_istisna (hesap, sicil_no, yonetici_mi) VALUES (N'{hy}', N'1005', 1);
            INSERT INTO gorev.kullanici_yetki_istisna (hesap, sicil_no, saha_mi) VALUES (N'{h1}', N'1002', 1);
            INSERT INTO gorev.kullanici_yetki_istisna (hesap, sicil_no, saha_mi) VALUES (N'{h2}', N'1006', 1);");
        return new Ortam(t, sorumlu, yon, saha1, saha2);
    }

    private static async Task<int> TalepAsync(Ortam o, int kisi, params string[] gunler)
    {
        var a = await TalepService.KaydetAsync(o.Sorumlu, null, null, "Toroman", null, "AY Kabul", "Ankara İvedik", "07:30", "16:35", "İş", "not",
            gunler.Select(g => new TalepService.GunGirdisi(g, "TAM", kisi)).ToArray(), Array.Empty<string>(), true);
        return N(Al(a, "id"));
    }

    [SqlFact]
    public async Task Rol_bazli_listeler_istisna_ve_bolum_eslestirmesinden_gelir_yetki_denetlenir()
    {
        var o = await KurAsync(); await using var _t = o.T;
        var saha = Liste(await SenaryoService.RolPersonelAsync(o.Yonetici, "SAHA", null)).Select(x => P(x, "sicil")).ToHashSet();
        Assert.Equal(new HashSet<string> { "1002", "1006", "1007" }, saha);
        var sor = Liste(await SenaryoService.RolPersonelAsync(o.Yonetici, "SORUMLU", null)).Select(x => P(x, "sicil")).ToHashSet();
        Assert.Equal(new HashSet<string> { "1001", "1008" }, sor);
        Assert.Single(Liste(await SenaryoService.RolPersonelAsync(o.Yonetici, "SAHA", "Sümbül")));
        Assert.Equal(3, Liste(await SenaryoService.RolPersonelAsync(o.Sorumlu, "SAHA", null)).Count);       // Sorumlu saha listesini görür
        Assert.Equal(sor, Liste(await SenaryoService.RolPersonelAsync(o.Sorumlu, "SORUMLU", null)).Select(x => P(x, "sicil")).ToHashSet());   // Sorumlu vekâleten talep için Sorumlu listesini de görür (Dilim 34)
        Assert.Equal("yetki", await Kod(() => SenaryoService.RolPersonelAsync(o.Saha1, "SAHA", null)));
        Assert.Equal("dogrulama", await Kod(() => SenaryoService.RolPersonelAsync(o.Yonetici, "YONETICI", null)));
    }

    [SqlFact]
    public async Task Islem_gunlugu_yalniz_yoneticiye_acilir_ve_suzulur()
    {
        var o = await KurAsync(); await using var _t = o.T; var p = Pazartesi();
        await TalepAsync(o, 1, D(p, 0));
        var hepsi = Liste(await SenaryoService.LogListeAsync(o.Yonetici, null, null, null, null, 500));
        Assert.NotEmpty(hepsi);
        var turler = Liste(await SenaryoService.LogIslemTurleriAsync(o.Yonetici)).Select(x => P(x, "islem")).ToList();
        Assert.Contains("SEMA", turler);
        Assert.All(Liste(await SenaryoService.LogListeAsync(o.Yonetici, null, null, "SEMA", null, 500)), x => Assert.Equal("SEMA", P(x, "islem")));
        Assert.Equal("yetki", await Kod(() => SenaryoService.LogListeAsync(o.Sorumlu, null, null, null, null, 500)));
        Assert.Equal("yetki", await Kod(() => SenaryoService.LogIslemTurleriAsync(o.Saha1)));
    }

    [SqlFact]
    public async Task Rapor_tarihi_duzeltilir_cakisan_rapor_reddedilir_yetki_denetlenir()
    {
        var o = await KurAsync(); await using var _t = o.T; var p = Pazartesi();
        var r1 = await IzinRaporService.RaporKaydetAsync(o.Saha1, null, D(p, 10), D(p, 12), "grip", Pdf, "rapor.pdf");
        var id1 = N(Al(r1, "id"));
        await IzinRaporService.RaporKaydetAsync(o.Saha1, null, D(p, 20), D(p, 21), "kontrol", Pdf, "rapor2.pdf");
        await SenaryoService.RaporDuzeltAsync(o.Yonetici, id1, D(p, 11), D(p, 14), "tarih yanlış girilmişti");
        Assert.Equal(D(p, 11), Convert.ToDateTime(await o.T.SkalerAsync($"SELECT ilk_tarih FROM gorev.raporlar WHERE id = {id1}")).ToString("yyyy-MM-dd"));
        Assert.Equal(D(p, 14), Convert.ToDateTime(await o.T.SkalerAsync($"SELECT son_tarih FROM gorev.raporlar WHERE id = {id1}")).ToString("yyyy-MM-dd"));
        Assert.Equal("dogrulama", await Kod(() => SenaryoService.RaporDuzeltAsync(o.Yonetici, id1, D(p, 11), D(p, 20), null)));   // diğer rapor ile çakışır
        Assert.Equal("dogrulama", await Kod(() => SenaryoService.RaporDuzeltAsync(o.Yonetici, id1, D(p, 14), D(p, 11), null)));   // aralık ters
        Assert.Equal("yetki", await Kod(() => SenaryoService.RaporDuzeltAsync(o.Saha1, id1, D(p, 11), D(p, 13), null)));
        Assert.Equal(1, N(await o.T.SkalerAsync("SELECT COUNT(*) FROM gorev.islem_log WHERE islem = N'RAPOR_DUZELT'")));
    }

    [SqlFact]
    public async Task Revizede_kisi_sayisi_dusurulunce_yonetici_cikarilacak_kisiyi_secer()
    {
        var o = await KurAsync(); await using var _t = o.T; var p = Pazartesi();
        var id = await TalepAsync(o, 2, D(p, 0));
        await AtamaService.OnaylaAsync(o.Yonetici, id, new[] { new AtamaService.AtamaGirdisi("1002", D(p, 0), "TAM"), new AtamaService.AtamaGirdisi("1006", D(p, 0), "TAM") }, "REDDET");
        var r = await RevizeService.ReviziteAsync(o.Sorumlu, id, null, null, null, null, new[] { new RevizeService.GunGirdisi(D(p, 0), "TAM", 1) }, "bir kişi yeter");
        var rid = N(Al(r, "id"));
        Assert.Equal("dogrulama", await Kod(() => RevizeService.RevizeOnaylaAsync(o.Yonetici, rid)));                                  // seçim yok
        var fazla = Liste(await RevizeService.FazlalikAsync(o.Yonetici, rid));
        Assert.Equal(2, fazla.Count);
        Assert.All(fazla, x => Assert.Equal(1, N(Al(x, "fazla"))));
        Assert.Equal("yetki", await Kod(() => RevizeService.FazlalikAsync(o.Sorumlu, rid)));
        var cikar = fazla.First(x => P(x, "sicil") == "1006");
        await RevizeService.RevizeOnaylaAsync(o.Yonetici, rid, new[] { N(Al(cikar, "atamaId")) });
        Assert.Equal("ONAYLANDI", Convert.ToString(await o.T.SkalerAsync($"SELECT durum FROM gorev.revize_talepleri WHERE id = {rid}")));
        Assert.Equal(1, N(await o.T.SkalerAsync($"SELECT COUNT(*) FROM gorev.atamalar WHERE talep_id = {id} AND durum = 'AKTIF'")));
        Assert.Equal("1002", Convert.ToString(await o.T.SkalerAsync($"SELECT sicil_no FROM gorev.atamalar WHERE talep_id = {id} AND durum = 'AKTIF'")));
        Assert.Equal("TAMAMEN_ATANDI", Convert.ToString(await o.T.SkalerAsync($"SELECT durum FROM gorev.talepler WHERE id = {id}")));
        Assert.Equal(1, N(await o.T.SkalerAsync("SELECT COUNT(*) FROM gorev.bildirimler WHERE sicil_no = N'1006' AND tur = 'GOREV_CIKARILDI'")));
    }

    [SqlFact]
    public async Task Revizede_uzatilan_gunlerde_atananlarin_musaitligi_gorunur()
    {
        var o = await KurAsync(); await using var _t = o.T; var p = Pazartesi();
        var id = await TalepAsync(o, 1, D(p, 0));
        await AtamaService.OnaylaAsync(o.Yonetici, id, new[] { new AtamaService.AtamaGirdisi("1002", D(p, 0), "TAM") }, "REDDET");
        // 1002 ertesi gün raporlu
        await IzinRaporService.RaporKaydetAsync(o.Saha1, null, D(p, 1), D(p, 1), "grip", Pdf, "rapor.pdf");
        var r = await RevizeService.ReviziteAsync(o.Sorumlu, id, null, null, null, null,
            new[] { new RevizeService.GunGirdisi(D(p, 0), "TAM", 1), new RevizeService.GunGirdisi(D(p, 1), "TAM", 1), new RevizeService.GunGirdisi(D(p, 2), "TAM", 1) }, "uzatma");
        var rid = N(Al(r, "id"));
        var m = Liste(await RevizeService.MusaitlikAsync(o.Sorumlu, rid));
        Assert.Equal(2, m.Count);                                                                      // yalnız yeni günler (p+1, p+2)
        Assert.Equal("RAPOR", P(m.First(x => P(x, "tarih") == D(p, 1)), "durum"));
        Assert.Equal("MUSAIT", P(m.First(x => P(x, "tarih") == D(p, 2)), "durum"));
        Assert.Equal("yetki", await Kod(() => RevizeService.MusaitlikAsync(o.Saha1, rid)));
    }

    [SqlFact]
    public async Task Analiz_kirilimi_ana_alt_yerleske_personel_ve_matris_sadece_musaitler()
    {
        var o = await KurAsync(); await using var _t = o.T; var p = Pazartesi();
        var id = await TalepAsync(o, 1, D(p, 0), D(p, 1));
        await AtamaService.OnaylaAsync(o.Yonetici, id, new[] { new AtamaService.AtamaGirdisi("1002", D(p, 0), "TAM"), new AtamaService.AtamaGirdisi("1002", D(p, 1), "TAM") }, "REDDET");
        var k = Liste(await AnalizService.KirilimAsync(o.Yonetici, D(p, 0), D(p, 6), null));
        Assert.Single(k);
        Assert.Equal("Toroman", P(k[0], "ana")); Assert.Equal("Ankara İvedik", P(k[0], "yerleske")); Assert.Equal("1002", P(k[0], "sicil"));
        Assert.Equal(2.0m, Convert.ToDecimal(Al(k[0], "adamGun"), System.Globalization.CultureInfo.InvariantCulture));
        Assert.Single(Liste(await AnalizService.KirilimAsync(o.Sorumlu, D(p, 0), D(p, 6), null)));
        Assert.Equal("yetki", await Kod(() => AnalizService.KirilimAsync(o.Saha1, D(p, 0), D(p, 6), null)));

        // matris: 1002 Pazartesi–Salı dolu ama hafta içi boş günleri var → müsait; sadece görevliler: yalnız 1002
        var musait = Liste(await MatrisService.HaftaAsync(o.Yonetici, D(p, 0), null, null, null, false, null, true)).Select(x => P(x, "sicil")).ToList();
        Assert.Contains("1002", musait); Assert.Contains("1006", musait);
        var gorevli = Liste(await MatrisService.HaftaAsync(o.Yonetici, D(p, 0), null, null, null, true, null, false)).Select(x => P(x, "sicil")).ToList();
        Assert.Equal(new[] { "1002" }, gorevli);
        // 1002'ye hafta içi her günü doldur → müsait listesinden çıkar
        var id2 = await TalepAsync(o, 1, D(p, 2), D(p, 3), D(p, 4));
        await AtamaService.OnaylaAsync(o.Yonetici, id2, new[] { "2", "3", "4" }.Select(n => new AtamaService.AtamaGirdisi("1002", D(p, int.Parse(n)), "TAM")).ToArray(), "REDDET");
        var musait2 = Liste(await MatrisService.HaftaAsync(o.Yonetici, D(p, 0), null, null, null, false, null, true)).Select(x => P(x, "sicil")).ToList();
        Assert.DoesNotContain("1002", musait2); Assert.Contains("1006", musait2);
    }
}
