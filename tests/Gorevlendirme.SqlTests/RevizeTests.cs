using Gorevlendirme;
using Xunit;

namespace Gorevlendirme.SqlTests;

/// <summary>Görev iptali, erken bitiş, çıkarma, ikame, revize ve sorumlu devri (010).</summary>
public class RevizeTests
{
    private static string D(int n) => DateTime.Today.AddDays(n).ToString("yyyy-MM-dd");
    private static async Task<string> Kod(Func<Task> f) => (await Assert.ThrowsAsync<GorevException>(f)).Code;
    private sealed record Ortam(TestDb T, SqlService Sorumlu, SqlService Yonetici, SqlService Saha1, SqlService Saha2);
    private static List<object> Liste(object o) => ((System.Collections.IEnumerable)o).Cast<object>().ToList();
    private static string P(object o, string ad) => Convert.ToString(o.GetType().GetProperty(ad)!.GetValue(o)) ?? "";
    private static int N(object? o) => Convert.ToInt32(o);
    private static RevizeService.GunGirdisi G(string t, int kisi = 1, string z = "TAM") => new(t, z, kisi);

    private static async Task<Ortam> KurAsync()
    {
        var t = await TestDb.OlusturAsync();
        await t.MigrateAsync();
        await t.ExecAsync(@"INSERT INTO gorev.personel (sicil_no, adi_soyadi, bolum) VALUES
            (N'1001', N'Erdem Efe', N'Proje'), (N'1002', N'Ahmet Sümbül', N'Teknik'), (N'1005', N'Yönetici Kişi', N'Merkez'), (N'1006', N'Ali Örnek', N'Teknik'), (N'1007', N'Yeni Sorumlu', N'Proje');");
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

    private static async Task<int> TalepAsync(Ortam o, params RevizeService.GunGirdisi[] gunler)
    {
        var a = await TalepService.KaydetAsync(o.Sorumlu, null, null, "Toroman", null, "AY Kabul", "Ankara İvedik", "07:30", "16:35", "İş", null,
            gunler.Select(g => new TalepService.GunGirdisi(g.Tarih, g.Zaman, g.Kisi)).ToArray(), Array.Empty<string>(), true);
        return N(a.GetType().GetProperty("id")!.GetValue(a));
    }

    private static Task Ata(Ortam o, int talep, string sicil, string tarih, string zaman = "TAM") =>
        AtamaService.OnaylaAsync(o.Yonetici, talep, new[] { new AtamaService.AtamaGirdisi(sicil, tarih, zaman) }, "REDDET");

    private static async Task<string> Durum(Ortam o, int id) => Convert.ToString(await o.T.SkalerAsync($"SELECT durum FROM gorev.talepler WHERE id = {id}")) ?? "";
    private static async Task<int> Aktif(Ortam o, int id, string sicil) => N(await o.T.SkalerAsync($"SELECT COUNT(*) FROM gorev.atamalar WHERE talep_id = {id} AND sicil_no = N'{sicil}' AND durum = 'AKTIF'"));
    private static async Task<int> Bildirim(SqlService s, string tur) => Liste(await AtamaService.BildirimListeAsync(s, true)).Count(x => P(x, "tur") == tur);

    [SqlFact]
    public async Task Iptal_atamalari_kaldirir_kisilere_bildirir_ve_yetkiyi_denetler()
    {
        var o = await KurAsync(); await using var _t = o.T;
        var id = await TalepAsync(o, G(D(40)), G(D(41)));
        Assert.Equal("dogrulama", await Kod(() => RevizeService.IptalAsync(o.Sorumlu, id, "vazgeçildi")));      // atama yok
        await Ata(o, id, "1002", D(40));
        Assert.Equal("yetki", await Kod(() => RevizeService.IptalAsync(o.Saha2, id, "vazgeçildi")));
        Assert.Equal("dogrulama", await Kod(() => RevizeService.IptalAsync(o.Sorumlu, id, "x")));               // neden kısa
        await RevizeService.IptalAsync(o.Sorumlu, id, "Proje ertelendi");
        Assert.Equal("IPTAL", await Durum(o, id));
        Assert.Equal(0, await Aktif(o, id, "1002"));
        Assert.Equal(1, await Bildirim(o.Saha1, "GOREV_IPTAL"));
        Assert.Equal(1, await Bildirim(o.Yonetici, "TALEP_IPTAL"));
        Assert.Equal("dogrulama", await Kod(() => RevizeService.IptalAsync(o.Sorumlu, id, "tekrar")));          // zaten iptal
    }

    [SqlFact]
    public async Task Proje_baglami_atanmis_talepte_yalniz_yonetici_degistirir_atamalar_korunur_bildirim_gider()
    {
        var o = await KurAsync(); await using var _t = o.T;
        var id = await TalepAsync(o, G(D(40)), G(D(41)));
        Assert.Equal("dogrulama", await Kod(() => TalepService.ProjeDegistirAsync(o.Yonetici, id, "Yeni Ana", null, "Yeni Faaliyet", "Mersin", null)));   // henüz atama yok
        await Ata(o, id, "1002", D(40));
        Assert.Equal("yetki", await Kod(() => TalepService.ProjeDegistirAsync(o.Sorumlu, id, "Yeni Ana", null, "Yeni Faaliyet", "Mersin", null)));
        Assert.Equal("dogrulama", await Kod(() => TalepService.ProjeDegistirAsync(o.Yonetici, id, "", null, "F", "K", null)));
        Assert.Equal("dogrulama", await Kod(() => TalepService.ProjeDegistirAsync(o.Yonetici, id, "Toroman", null, "AY Kabul", "Ankara İvedik", null))); // aynı yol
        await TalepService.ProjeDegistirAsync(o.Yonetici, id, "Yeni Ana", null, "Yeni Faaliyet", "Mersin", "yanlış girilmişti");
        Assert.Equal("Yeni Ana", Convert.ToString(await o.T.SkalerAsync($"SELECT a.ad FROM gorev.talepler t JOIN gorev.proje_havuzu k ON k.id = t.havuz_id JOIN gorev.proje_havuzu f ON f.id = k.ust_id JOIN gorev.proje_havuzu al ON al.id = f.ust_id JOIN gorev.proje_havuzu a ON a.id = al.ust_id WHERE t.id = {id}")));
        Assert.Equal(1, await Aktif(o, id, "1002"));
        Assert.Equal(1, await Bildirim(o.Saha1, "PROJE_DEGISTI"));
        Assert.Equal(1, N(await o.T.SkalerAsync("SELECT COUNT(*) FROM gorev.islem_log WHERE islem = N'TALEP_PROJE_DEGISTI'")));
    }

    [SqlFact]
    public async Task Baslamis_gorev_iptal_edilmez_erken_bitis_sonraki_gunleri_kaldirir()
    {
        var o = await KurAsync(); await using var _t = o.T;
        var gecmis = await TalepAsync(o, G(D(-3)));
        await o.T.ExecAsync($"INSERT INTO gorev.atamalar (talep_id, sicil_no, tarih, zaman_dilimi) VALUES ({gecmis}, N'1002', '{D(-3)}', 'TAM'); UPDATE gorev.talepler SET durum = 'TAMAMEN_ATANDI' WHERE id = {gecmis};");
        Assert.Equal("dogrulama", await Kod(() => RevizeService.IptalAsync(o.Yonetici, gecmis, "geçmiş")));

        var id = await TalepAsync(o, G(D(40)), G(D(41)), G(D(42)));
        await Ata(o, id, "1002", D(40)); await Ata(o, id, "1002", D(41)); await Ata(o, id, "1006", D(42));
        Assert.Equal("dogrulama", await Kod(() => RevizeService.ErkenBitirAsync(o.Sorumlu, id, D(42), "aynı")));     // mevcut son gün
        Assert.Equal("dogrulama", await Kod(() => RevizeService.ErkenBitirAsync(o.Sorumlu, id, D(39), "önce")));     // ilk günden önce
        await RevizeService.ErkenBitirAsync(o.Sorumlu, id, D(41), "Erken bitti");
        Assert.Equal(0, await Aktif(o, id, "1006"));
        Assert.Equal(1, await Aktif(o, id, "1002") > 0 ? 1 : 0);
        Assert.Equal(2, N(await o.T.SkalerAsync($"SELECT COUNT(*) FROM gorev.talep_gunleri WHERE talep_id = {id}")));
        Assert.Equal("TAMAMEN_ATANDI", await Durum(o, id));
        Assert.Equal(1, await Bildirim(o.Saha2, "ERKEN_BITIS"));
    }

    [SqlFact]
    public async Task Ikame_atamayi_yeni_kisiye_tasir_cakismada_karar_sorar()
    {
        var o = await KurAsync(); await using var _t = o.T;
        var id = await TalepAsync(o, G(D(40)));
        await Ata(o, id, "1002", D(40));
        var diger = await TalepAsync(o, G(D(40)));
        await Ata(o, diger, "1006", D(40));                                                                     // 1006 aynı gün başka görevde
        Assert.Equal("yetki", await Kod(() => RevizeService.IkameAsync(o.Sorumlu, id, "1002", "1006", null, "REDDET", null)));
        Assert.Equal("cakisma", await Kod(() => RevizeService.IkameAsync(o.Yonetici, id, "1002", "1006", null, "REDDET", null)));
        Assert.Equal(1, await Aktif(o, id, "1002"));                                                            // geri alındı
        await RevizeService.IkameAsync(o.Yonetici, id, "1002", "1006", null, "CIKAR", "hastalandı");
        Assert.Equal(0, await Aktif(o, id, "1002"));
        Assert.Equal(1, await Aktif(o, id, "1006"));
        Assert.Equal(0, await Aktif(o, diger, "1006"));                                                         // çakışan görevden çıkarıldı
        Assert.Equal("TAMAMEN_ATANDI", await Durum(o, id));
        Assert.Equal(1, await Bildirim(o.Saha1, "IKAME_CIKTI"));
        Assert.Equal(1, await Bildirim(o.Saha2, "IKAME_ATANDI"));
        Assert.Equal("dogrulama", await Kod(() => RevizeService.IkameAsync(o.Yonetici, id, "1002", "1006", null, "REDDET", null)));   // eski kişide aktif atama kalmadı
        var cik = await RevizeService.CikarAsync(o.Yonetici, id, "1006", null, null, "Görevden alındı");
        Assert.Equal("ONAY_BEKLIYOR", P(cik, "durum"));
        Assert.Equal("yetki", await Kod(() => RevizeService.CikarAsync(o.Sorumlu, id, "1006", null, null, "deneme")));
    }

    [SqlFact]
    public async Task Revize_onaya_gider_kisi_sayisi_degisir_azaltma_atamayi_korur_ve_sorumlu_devredilir()
    {
        var o = await KurAsync(); await using var _t = o.T;
        var id = await TalepAsync(o, G(D(40)), G(D(41)));
        Assert.Equal("dogrulama", await Kod(() => RevizeService.ReviziteAsync(o.Sorumlu, id, "Yeni metin", null, null, null, null, "neden")));   // atama yok
        await Ata(o, id, "1002", D(40));
        var r = await RevizeService.ReviziteAsync(o.Sorumlu, id, "Yeni görev metni", null, "08:00", "17:00", null, "içerik değişti");
        Assert.Equal("BEKLIYOR", P(r, "durum"));
        Assert.Equal(1, await Bildirim(o.Yonetici, "REVIZE_TALEP"));
        Assert.Equal("dogrulama", await Kod(() => RevizeService.ReviziteAsync(o.Sorumlu, id, "Bir daha", null, null, null, null, null)));        // bekleyen var
        Assert.Single(Liste(await RevizeService.RevizeListeAsync(o.Sorumlu, id, "BEKLIYOR")));
        Assert.Equal("yetki", await Kod(() => RevizeService.RevizeOnaylaAsync(o.Sorumlu, N(r.GetType().GetProperty("id")!.GetValue(r)))));
        await RevizeService.RevizeOnaylaAsync(o.Yonetici, N(r.GetType().GetProperty("id")!.GetValue(r)));
        Assert.Equal("Yeni görev metni", Convert.ToString(await o.T.SkalerAsync($"SELECT gorev_metni FROM gorev.talepler WHERE id = {id}")));
        Assert.Equal("08:00", Convert.ToString(await o.T.SkalerAsync($"SELECT CONVERT(CHAR(5), saat_baslangic, 108) FROM gorev.talepler WHERE id = {id}")));
        Assert.Equal(1, await Bildirim(o.Sorumlu, "REVIZE_ONAY"));

        // kişi sayısı artar: durum kısmen kalır; Yönetici doğrudan uygular
        await RevizeService.ReviziteAsync(o.Yonetici, id, null, null, null, null, new[] { G(D(40), 2), G(D(41), 2) }, "ek personel");
        Assert.Equal(4, N(await o.T.SkalerAsync($"SELECT SUM(kisi_sayisi) FROM gorev.talep_gunleri WHERE talep_id = {id}")));
        Assert.Equal("KISMEN_ATANDI", await Durum(o, id));
        // atanmış günü kaldıran revize onaylanamaz; revize beklemede kalır
        var r2 = await RevizeService.ReviziteAsync(o.Sorumlu, id, null, null, null, null, new[] { G(D(41), 2) }, "gün kalktı");
        var r2id = N(r2.GetType().GetProperty("id")!.GetValue(r2));
        Assert.Equal("dogrulama", await Kod(() => RevizeService.RevizeOnaylaAsync(o.Yonetici, r2id)));
        Assert.Equal(2, N(await o.T.SkalerAsync($"SELECT COUNT(*) FROM gorev.talep_gunleri WHERE talep_id = {id}")));
        Assert.Equal("dogrulama", await Kod(() => RevizeService.RevizeReddetAsync(o.Yonetici, r2id, "x")));
        await RevizeService.RevizeReddetAsync(o.Yonetici, r2id, "Atanmış gün kaldırılamaz");
        Assert.Equal(1, await Bildirim(o.Sorumlu, "REVIZE_RET"));
        var r3 = await RevizeService.ReviziteAsync(o.Sorumlu, id, "Geri çekilecek", null, null, null, null, null);
        await RevizeService.RevizeGeriCekAsync(o.Sorumlu, N(r3.GetType().GetProperty("id")!.GetValue(r3)));
        Assert.Empty(Liste(await RevizeService.RevizeListeAsync(o.Sorumlu, id, "BEKLIYOR")));

        // sorumlu devri
        Assert.Equal("yetki", await Kod(() => RevizeService.DevretAsync(o.Sorumlu, id, "1007", "x")));
        Assert.Equal("dogrulama", await Kod(() => RevizeService.DevretAsync(o.Yonetici, id, "9999", null)));
        await RevizeService.DevretAsync(o.Yonetici, id, "1007", "Görev değişti");
        Assert.Equal("1007", Convert.ToString(await o.T.SkalerAsync($"SELECT sorumlu_sicil_no FROM gorev.talepler WHERE id = {id}")));
        Assert.Single(Liste(await RevizeService.DevirListeAsync(o.Yonetici, id)));
        Assert.Equal(1, await Bildirim(o.Sorumlu, "SORUMLU_DEVIR"));
    }

    [SqlFact]
    public async Task Sure_uzatma_mevcut_atananlari_yeni_gunlere_otomatik_atar()
    {
        var o = await KurAsync(); await using var _t = o.T;
        var id = await TalepAsync(o, G(D(40)), G(D(41)));
        await Ata(o, id, "1002", D(40));
        var diger = await TalepAsync(o, G(D(42)));
        await Ata(o, diger, "1002", D(42));                                                                     // 1002 D(42)'de başka görevde
        var r = await RevizeService.ReviziteAsync(o.Yonetici, id, null, null, null, null,
            new[] { G(D(40)), G(D(41)), G(D(42)), G(D(43)) }, "süre uzadı");
        Assert.Equal(1, N(await o.T.SkalerAsync($"SELECT COUNT(*) FROM gorev.atamalar WHERE talep_id = {id} AND sicil_no = N'1002' AND tarih = '{D(43)}' AND durum = 'AKTIF'")));
        Assert.Equal(0, N(await o.T.SkalerAsync($"SELECT COUNT(*) FROM gorev.atamalar WHERE talep_id = {id} AND sicil_no = N'1002' AND tarih = '{D(42)}' AND durum = 'AKTIF'")));   // çakışan atlandı
        Assert.Equal(1, await Aktif(o, diger, "1002"));                                                         // başka görevden çıkarılmadı
        Assert.Contains("yapılamadı", P(r, "uyari"));
        Assert.Equal(1, await Bildirim(o.Saha1, "GOREV_UZATILDI"));
    }

    [SqlFact]
    public async Task Sorumlu_baska_sorumlu_adina_vekaleten_talep_acar()
    {
        var o = await KurAsync(); await using var _t = o.T;
        await o.T.ExecAsync("INSERT INTO gorev.kullanici_yetki_istisna (hesap, sicil_no, sorumlu_mu) VALUES (N'TESTALAN\\vekil.sorumlu', N'1007', 1);");
        Task<object> Ac(string? sahip) => TalepService.KaydetAsync(o.Sorumlu, null, sahip, "Toroman", null, "AY Kabul", "Ankara İvedik", "07:30", "16:35", "İş", null,
            new[] { new TalepService.GunGirdisi(D(40), "TAM", 1) }, Array.Empty<string>(), false);
        Assert.Equal("dogrulama", await Kod(() => Ac("1006")));                                                    // Sorumlu rolünde olmayan kişi adına açılamaz
        var a = await Ac("1007");
        var id = N(a.GetType().GetProperty("id")!.GetValue(a));
        Assert.Equal("1007", Convert.ToString(await o.T.SkalerAsync($"SELECT sorumlu_sicil_no FROM gorev.talepler WHERE id = {id}")));
        Assert.Contains(Liste(await TalepService.ListeAsync(o.Sorumlu, null)), x => N(x.GetType().GetProperty("id")!.GetValue(x)) == id);   // açan kişi listede görür
        Assert.Equal("1007", Convert.ToString(await o.T.SkalerAsync($"SELECT sorumlu_sicil_no FROM gorev.talepler WHERE id = {id}")));
        var pers = Liste(await SenaryoService.RolPersonelAsync(o.Sorumlu, "SORUMLU", null));
        Assert.Contains(pers, x => P(x, "sicil") == "1007");                                                       // Sorumlu da vekil listesini okur
    }
}
