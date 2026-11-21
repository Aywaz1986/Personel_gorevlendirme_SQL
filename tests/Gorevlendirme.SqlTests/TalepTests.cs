using Gorevlendirme;
using Xunit;

namespace Gorevlendirme.SqlTests;

/// <summary>Talep (006): gerçek SQL girişleriyle. Sorumlu / Yönetici / Saha rolleri istisna kaydıyla kurulur.</summary>
public class TalepTests
{
    private static async Task<string> Kod(Func<Task> f) => (await Assert.ThrowsAsync<GorevException>(f)).Code;

    private static readonly TalepService.GunGirdisi[] Haftam =
    {
        new("2026-11-23", "TAM", 1), new("2026-11-24", "TAM", 1), new("2026-11-25", "TAM", 1), new("2026-11-26", "TAM", 1), new("2026-11-27", "TAM", 1),
    };

    private sealed record Ortam(TestDb T, SqlService Sorumlu, SqlService Yonetici, SqlService Saha, SqlService Baska);

    private static async Task<Ortam> KurAsync()
    {
        var t = await TestDb.OlusturAsync();
        await t.Migrator.UygulaAsync(false);
        await t.ExecAsync(@"INSERT INTO gorev.personel (sicil_no, adi_soyadi, bolum) VALUES
            (N'1001', N'Erdem Efe', N'Proje'), (N'1002', N'Ahmet Sümbül', N'Saha'), (N'1003', N'Başka Sorumlu', N'Proje'), (N'1004', N'Pasif Kişi', N'Saha'), (N'1005', N'Yönetici Kişi', N'Merkez');
            UPDATE gorev.personel SET aktif = 0 WHERE sicil_no = N'1004';");
        var (hs, sorumlu) = await t.KisiAsync();
        var (hy, yon) = await t.KisiAsync();
        var (hh, saha) = await t.KisiAsync();
        var (hb, baska) = await t.KisiAsync();
        await t.ExecAsync($@"INSERT INTO gorev.kullanici_yetki_istisna (hesap, sicil_no, sorumlu_mu) VALUES (N'{hs}', N'1001', 1);
            INSERT INTO gorev.kullanici_yetki_istisna (hesap, sicil_no, yonetici_mi) VALUES (N'{hy}', N'1005', 1);
            INSERT INTO gorev.kullanici_yetki_istisna (hesap, sicil_no, saha_mi) VALUES (N'{hh}', N'1002', 1);
            INSERT INTO gorev.kullanici_yetki_istisna (hesap, sicil_no, sorumlu_mu) VALUES (N'{hb}', N'1003', 1);");
        return new Ortam(t, sorumlu, yon, saha, baska);
    }

    private static Task<object> Ac(SqlService s, bool gonder = true, string[]? oneri = null, TalepService.GunGirdisi[]? gunler = null, string? alt = null, string? sicil = null, int? id = null) =>
        TalepService.KaydetAsync(s, id, sicil, "Toroman", alt, "AY Kabul", "Ankara İvedik", "07:30", "16:35", "Kabul işleri", null, gunler ?? Haftam, oneri ?? new[] { "1002" }, gonder);

    private static int Id(object o) => Convert.ToInt32(o.GetType().GetProperty("id")!.GetValue(o));
    private static string Ozellik(object o, string ad) => Convert.ToString(o.GetType().GetProperty(ad)!.GetValue(o)) ?? "";

    [SqlFact]
    public async Task Sorumlu_talep_acar_havuz_yolu_olusur_alt_genel_olur_ve_listede_gorunur()
    {
        var o = await KurAsync(); await using var _t = o.T;
        var r = await Ac(o.Sorumlu);
        Assert.Equal("ONAY_BEKLIYOR", Ozellik(r, "durum"));
        Assert.StartsWith("TLP-", Ozellik(r, "kod"));
        Assert.Equal(4, Convert.ToInt32(await o.T.SkalerAsync("SELECT COUNT(*) FROM gorev.proje_havuzu WHERE kaynak = N'TALEP'")));
        Assert.Equal(1, Convert.ToInt32(await o.T.SkalerAsync("SELECT COUNT(*) FROM gorev.proje_havuzu WHERE ad = N'Genel' AND seviye = 2")));
        var liste = (System.Collections.IEnumerable)await TalepService.ListeAsync(o.Sorumlu, null);
        Assert.Single(liste.Cast<object>());
        var t = await TalepService.GetirAsync(o.Sorumlu, Id(r));
        Assert.Equal("Erdem Efe", Ozellik(t, "sorumluAdi"));
        Assert.Equal("07:30", Ozellik(t, "saatBaslangic"));
        Assert.Equal("Ahmet Sümbül", System.Text.Json.JsonSerializer.Serialize(t.GetType().GetProperty("oneri")!.GetValue(t)).Contains("Ahmet Sümbül") ? "Ahmet Sümbül" : "");
        // ikinci talep aynı yolu yeniden kullanır (havuza yeni kayıt eklenmez)
        await Ac(o.Sorumlu, false);
        Assert.Equal(4, Convert.ToInt32(await o.T.SkalerAsync("SELECT COUNT(*) FROM gorev.proje_havuzu")));
    }

    [SqlFact]
    public async Task Taslak_gonder_ve_revize_gunleri_ve_onerileri_degistirir()
    {
        var o = await KurAsync(); await using var _t = o.T;
        var r = await Ac(o.Sorumlu, false);
        Assert.Equal("TASLAK", Ozellik(r, "durum"));
        var id = Id(r);
        var r2 = await Ac(o.Sorumlu, true, new string[0], new[] { new TalepService.GunGirdisi("2026-11-30", "OO", 2) }, id: id);
        Assert.Equal("ONAY_BEKLIYOR", Ozellik(r2, "durum"));
        Assert.Equal(1, Convert.ToInt32(await o.T.SkalerAsync($"SELECT COUNT(*) FROM gorev.talep_gunleri WHERE talep_id = {id}")));
        Assert.Equal(0, Convert.ToInt32(await o.T.SkalerAsync($"SELECT COUNT(*) FROM gorev.talep_oneri WHERE talep_id = {id}")));
        Assert.Equal("2026-11-30", Convert.ToString(await o.T.SkalerAsync($"SELECT CONVERT(CHAR(10), ilk_tarih, 23) FROM gorev.talepler WHERE id = {id}")));
    }

    [SqlFact]
    public async Task Yetki_saha_yapamaz_baska_sorumlu_baskasinin_talebine_dokunamaz_yonetici_vekaleten_acar()
    {
        var o = await KurAsync(); await using var _t = o.T;
        Assert.Equal("yetki", await Kod(() => Ac(o.Saha)));
        Assert.Equal("yetki", await Kod(() => TalepService.ListeAsync(o.Saha, null)));
        var id = Id(await Ac(o.Sorumlu));
        Assert.Equal("yetki", await Kod(() => TalepService.GetirAsync(o.Baska, id)));
        Assert.Equal("yetki", await Kod(() => Ac(o.Baska, id: id)));
        Assert.Equal("yetki", await Kod(() => TalepService.GeriCekAsync(o.Baska, id)));
        Assert.Empty(((System.Collections.IEnumerable)await TalepService.ListeAsync(o.Baska, null)).Cast<object>());   // başkasının talebini listede görmez
        // Yönetici sahibi seçmeden açamaz? Kendi sicili (1005) kadroda olduğundan kendi adına açılır; sahibi seçerse onun adına
        var v = await Ac(o.Yonetici, sicil: "1003");
        Assert.Equal("1003", Convert.ToString(await o.T.SkalerAsync($"SELECT sorumlu_sicil_no FROM gorev.talepler WHERE id = {Id(v)}")));
        Assert.Equal(2, ((System.Collections.IEnumerable)await TalepService.ListeAsync(o.Yonetici, null)).Cast<object>().Count());
        await TalepService.GeriCekAsync(o.Yonetici, id);   // Yönetici başkasının talebini geri çekebilir
    }

    [SqlFact]
    public async Task Geri_cekme_yalniz_taslak_ve_onay_bekleyende_ve_kapali_talep_revize_edilmez()
    {
        var o = await KurAsync(); await using var _t = o.T;
        var id = Id(await Ac(o.Sorumlu));
        await TalepService.GeriCekAsync(o.Sorumlu, id);
        Assert.Equal("GERI_CEKILDI", Convert.ToString(await o.T.SkalerAsync($"SELECT durum FROM gorev.talepler WHERE id = {id}")));
        Assert.Equal("dogrulama", await Kod(() => TalepService.GeriCekAsync(o.Sorumlu, id)));        // zaten kapalı
        Assert.Equal("dogrulama", await Kod(() => Ac(o.Sorumlu, id: id)));                           // revize de edilemez
        var id2 = Id(await Ac(o.Sorumlu));
        await o.T.ExecAsync($"UPDATE gorev.talepler SET durum = 'TAMAMEN_ATANDI' WHERE id = {id2}");
        Assert.Equal("dogrulama", await Kod(() => TalepService.GeriCekAsync(o.Sorumlu, id2)));
        Assert.Equal("dogrulama", await Kod(() => TalepService.GeriCekAsync(o.Sorumlu, 9999)));
    }

    [SqlFact]
    public async Task Dogrulama_kurallari()
    {
        var o = await KurAsync(); await using var _t = o.T;
        var s = o.Sorumlu;
        Task<object> K(string ana = "Toroman", string faal = "AY Kabul", string konum = "İvedik", string sb = "07:30", string sbt = "16:35", string metin = "x", TalepService.GunGirdisi[]? g = null, string[]? oneri = null) =>
            TalepService.KaydetAsync(s, null, null, ana, null, faal, konum, sb, sbt, metin, null, g ?? Haftam, oneri ?? new string[0], true);
        Assert.Equal("dogrulama", await Kod(() => K(ana: " ")));
        Assert.Equal("dogrulama", await Kod(() => K(faal: "")));
        Assert.Equal("dogrulama", await Kod(() => K(konum: "")));
        Assert.Equal("dogrulama", await Kod(() => K(metin: " ")));
        Assert.Equal("dogrulama", await Kod(() => K(sb: "16:35", sbt: "07:30")));                    // saat ters
        Assert.Equal("dogrulama", await Kod(() => K(sb: "25:00")));                                   // saat geçersiz
        Assert.Equal("dogrulama", await Kod(() => K(g: new TalepService.GunGirdisi[0])));             // gün yok
        Assert.Equal("dogrulama", await Kod(() => K(g: new[] { new TalepService.GunGirdisi("2026-13-40", "TAM", 1) })));
        Assert.Equal("dogrulama", await Kod(() => K(g: new[] { new TalepService.GunGirdisi("2026-11-23", "XX", 1) })));
        Assert.Equal("dogrulama", await Kod(() => K(g: new[] { new TalepService.GunGirdisi("2026-11-23", "TAM", 0) })));
        Assert.Equal("dogrulama", await Kod(() => K(g: new[] { new TalepService.GunGirdisi("2026-11-23", "TAM", 1), new TalepService.GunGirdisi("2026-11-23", "TAM", 2) })));   // tekrar
        Assert.Equal("dogrulama", await Kod(() => K(g: new[] { new TalepService.GunGirdisi("2026-11-23", "TAM", 1), new TalepService.GunGirdisi("2026-11-23", "OO", 1) })));    // TAM + yarım
        Assert.Equal("dogrulama", await Kod(() => K(g: new[] { new TalepService.GunGirdisi("2026-01-01", "TAM", 1), new TalepService.GunGirdisi("2026-06-01", "TAM", 1) })));     // 93 günü aşar
        Assert.Equal("dogrulama", await Kod(() => K(oneri: new[] { "1004" })));                       // pasif kişi
        Assert.Equal("dogrulama", await Kod(() => K(oneri: new[] { "9999" })));                       // kadroda yok
        // aynı gün OO + OS birlikte olur
        var ok = await K(g: new[] { new TalepService.GunGirdisi("2026-11-23", "OO", 1), new TalepService.GunGirdisi("2026-11-23", "OS", 2) });
        Assert.Equal("ONAY_BEKLIYOR", Ozellik(ok, "durum"));
        Assert.Equal(0, Convert.ToInt32(await o.T.SkalerAsync("SELECT COUNT(*) FROM gorev.talepler WHERE gorev_metni = N'x' AND ilk_tarih <> '2026-11-23'")));
    }

    [SqlFact]
    public async Task Hafta_sonu_ve_tatil_uyari_verir_ama_engellemez_pasif_havuz_adi_reddedilir()
    {
        var o = await KurAsync(); await using var _t = o.T;
        await o.T.ExecAsync("INSERT INTO gorev.takvim_tatil (baslangic, bitis, zaman_dilimi, tur, ad) VALUES ('2026-11-24', '2026-11-24', 'TAM', 'IDARI', N'Deneme tatili');");
        var r = await Ac(o.Sorumlu, true, null, new[] { new TalepService.GunGirdisi("2026-11-21", "TAM", 1), new TalepService.GunGirdisi("2026-11-24", "TAM", 1) });
        var uyari = Ozellik(r, "uyari");
        Assert.Contains("hafta sonu", uyari);
        Assert.Contains("tatil", uyari);
        Assert.Equal("", Ozellik(await Ac(o.Sorumlu, true, null, new[] { new TalepService.GunGirdisi("2026-11-25", "TAM", 1) }), "uyari"));
        await o.T.ExecAsync("UPDATE gorev.proje_havuzu SET aktif = 0 WHERE ad = N'AY Kabul'");
        Assert.Equal("dogrulama", await Kod(() => Ac(o.Sorumlu)));
    }

    [SqlFact]
    public async Task Personel_arama_yetkiye_bagli_ve_en_az_iki_harf()
    {
        var o = await KurAsync(); await using var _t = o.T;
        Assert.Empty(((System.Collections.IEnumerable)await TalepService.PersonelAraAsync(o.Sorumlu, "a")).Cast<object>());
        var l = ((System.Collections.IEnumerable)await TalepService.PersonelAraAsync(o.Sorumlu, "sümbül")).Cast<object>().ToList();
        Assert.Single(l);
        Assert.Empty(((System.Collections.IEnumerable)await TalepService.PersonelAraAsync(o.Sorumlu, "Pasif")).Cast<object>());   // pasif aranmaz
        Assert.Equal("yetki", await Kod(() => TalepService.PersonelAraAsync(o.Saha, "Erdem")));
    }

    [SqlFact]
    public async Task Islem_logu_yazilir_ve_gecmis_gorev_tablosu_vardir()
    {
        var o = await KurAsync(); await using var _t = o.T;
        var id = Id(await Ac(o.Sorumlu));
        await TalepService.GeriCekAsync(o.Sorumlu, id);
        Assert.Equal(1, Convert.ToInt32(await o.T.SkalerAsync("SELECT COUNT(*) FROM gorev.islem_log WHERE islem = N'TALEP_GONDER'")));
        Assert.Equal(1, Convert.ToInt32(await o.T.SkalerAsync("SELECT COUNT(*) FROM gorev.islem_log WHERE islem = N'TALEP_GERI_CEK'")));
        Assert.Equal(0, Convert.ToInt32(await o.T.SkalerAsync("SELECT COUNT(*) FROM gorev.gecmis_gorev")));
    }
}
