using Gorevlendirme;
using Xunit;

namespace Gorevlendirme.SqlTests;

/// <summary>Atama (007): kısmi/tam atama, kapasite, çakışma kararı, ret, bildirim, yetki.</summary>
public class AtamaTests
{
    private static async Task<string> Kod(Func<Task> f) => (await Assert.ThrowsAsync<GorevException>(f)).Code;
    private sealed record Ortam(TestDb T, SqlService Sorumlu, SqlService Yonetici, SqlService Saha, SqlService Baska);

    private static async Task<Ortam> KurAsync()
    {
        var t = await TestDb.OlusturAsync();
        await t.MigrateAsync();
        await t.ExecAsync(@"INSERT INTO gorev.personel (sicil_no, adi_soyadi, bolum) VALUES
            (N'1001', N'Erdem Efe', N'Proje'), (N'1002', N'Ahmet Sümbül', N'Saha'), (N'1003', N'Başka Sorumlu', N'Proje'), (N'1004', N'Pasif Kişi', N'Saha'),
            (N'1005', N'Yönetici Kişi', N'Merkez'), (N'1006', N'Ali Örnek', N'Saha'), (N'1007', N'Ayşe Örnek', N'Saha');
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

    private static int Id(object o) => Convert.ToInt32(o.GetType().GetProperty("id")!.GetValue(o));
    private static string P(object o, string ad) => Convert.ToString(o.GetType().GetProperty(ad)!.GetValue(o)) ?? "";
    private static int Say(object o) => ((System.Collections.IEnumerable)o).Cast<object>().Count();
    private static AtamaService.AtamaGirdisi A(string sicil, string tarih, string zaman = "TAM") => new(sicil, tarih, zaman);

    private static Task<object> Talep(SqlService s, string ana = "Toroman", params TalepService.GunGirdisi[] gunler) =>
        TalepService.KaydetAsync(s, null, null, ana, null, "AY Kabul", "Ankara İvedik", "07:30", "16:35", "Kabul işleri", null,
            gunler.Length > 0 ? gunler : new[] { new TalepService.GunGirdisi("2026-11-23", "TAM", 2), new TalepService.GunGirdisi("2026-11-24", "TAM", 1) }, new[] { "1002" }, true);

    [SqlFact]
    public async Task Kismi_sonra_tam_atama_durumu_gunceller_ve_sorumlu_atananlari_gorur()
    {
        var o = await KurAsync(); await using var _t = o.T;
        var id = Id(await Talep(o.Sorumlu));
        var r = await AtamaService.OnaylaAsync(o.Yonetici, id, new[] { A("1002", "2026-11-23") }, "REDDET");
        Assert.Equal("KISMEN_ATANDI", P(r, "durum"));
        Assert.Equal("1", P(r, "atanan"));
        r = await AtamaService.OnaylaAsync(o.Yonetici, id, new[] { A("1006", "2026-11-23"), A("1007", "2026-11-24") }, "REDDET");
        Assert.Equal("TAMAMEN_ATANDI", P(r, "durum"));
        var t = await TalepService.GetirAsync(o.Sorumlu, id);
        var json = Convert.ToString(t.GetType().GetProperty("gunler")!.GetValue(t))!;
        Assert.Contains("Ahmet Sümbül", json); Assert.Contains("Ali Örnek", json); Assert.Contains("Ayşe Örnek", json);
        Assert.Equal("dogrulama", await Kod(() => AtamaService.OnaylaAsync(o.Yonetici, id, new[] { A("1006", "2026-11-24") }, "REDDET")));   // tamamen atandı: yeni atama yok
        var liste = ((System.Collections.IEnumerable)await TalepService.ListeAsync(o.Sorumlu, null)).Cast<object>().First();
        Assert.Equal("3", P(liste, "atanan")); Assert.Equal("3", P(liste, "istenen"));
    }

    [SqlFact]
    public async Task Kapasite_gecersiz_gun_tekrar_ve_pasif_kisi_reddedilir()
    {
        var o = await KurAsync(); await using var _t = o.T;
        var id = Id(await Talep(o.Sorumlu));
        Assert.Equal("dogrulama", await Kod(() => AtamaService.OnaylaAsync(o.Yonetici, id, new[] { A("1002", "2026-11-24"), A("1006", "2026-11-24") }, "REDDET")));   // 24'ü 1 kişi istendi
        Assert.Equal("dogrulama", await Kod(() => AtamaService.OnaylaAsync(o.Yonetici, id, new[] { A("1002", "2026-11-25") }, "REDDET")));                               // talepte olmayan gün
        Assert.Equal("dogrulama", await Kod(() => AtamaService.OnaylaAsync(o.Yonetici, id, new[] { A("1002", "2026-11-23", "OO") }, "REDDET")));                         // talepte olmayan dilim
        Assert.Equal("dogrulama", await Kod(() => AtamaService.OnaylaAsync(o.Yonetici, id, new[] { A("1002", "2026-11-23"), A("1002", "2026-11-23") }, "REDDET")));    // tekrar
        Assert.Equal("dogrulama", await Kod(() => AtamaService.OnaylaAsync(o.Yonetici, id, new[] { A("1004", "2026-11-23") }, "REDDET")));                               // pasif
        Assert.Equal("dogrulama", await Kod(() => AtamaService.OnaylaAsync(o.Yonetici, id, new[] { A("9999", "2026-11-23") }, "REDDET")));                               // kadroda yok
        Assert.Equal("dogrulama", await Kod(() => AtamaService.OnaylaAsync(o.Yonetici, id, Array.Empty<AtamaService.AtamaGirdisi>(), "REDDET")));
        Assert.Equal("dogrulama", await Kod(() => AtamaService.OnaylaAsync(o.Yonetici, id, new[] { A("1002", "2026-11-23") }, "BELKI")));
        Assert.Equal(0, Convert.ToInt32(await o.T.SkalerAsync("SELECT COUNT(*) FROM gorev.atamalar")));
        await AtamaService.OnaylaAsync(o.Yonetici, id, new[] { A("1002", "2026-11-23") }, "REDDET");
        Assert.Equal("dogrulama", await Kod(() => AtamaService.OnaylaAsync(o.Yonetici, id, new[] { A("1002", "2026-11-23") }, "REDDET")));   // aynı kişi aynı talepte iki kez
    }

    [SqlFact]
    public async Task Yetki_yalniz_yonetici_atar_reddeder_aday_gorur()
    {
        var o = await KurAsync(); await using var _t = o.T;
        var id = Id(await Talep(o.Sorumlu));
        foreach (var s in new[] { o.Sorumlu, o.Saha, o.Baska })
        {
            Assert.Equal("yetki", await Kod(() => AtamaService.OnaylaAsync(s, id, new[] { A("1002", "2026-11-23") }, "REDDET")));
            Assert.Equal("yetki", await Kod(() => AtamaService.ReddetAsync(s, id, "neden olsun")));
            Assert.Equal("yetki", await Kod(() => AtamaService.AdaylarAsync(s, id, null)));
            Assert.Equal("yetki", await Kod(() => AtamaService.CakismaKontrolAsync(s, id, new[] { A("1002", "2026-11-23") })));
        }
    }

    [SqlFact]
    public async Task Cakisma_reddet_kontrol_ve_cikar_bildirim_uretir_ama_OO_OS_cakismaz()
    {
        var o = await KurAsync(); await using var _t = o.T;
        var ilk = Id(await Talep(o.Baska, "Toroman", new TalepService.GunGirdisi("2026-11-24", "TAM", 1)));
        var ikinci = Id(await Talep(o.Sorumlu, "Toroman", new TalepService.GunGirdisi("2026-11-24", "OO", 1), new TalepService.GunGirdisi("2026-11-24", "OS", 1)));
        await AtamaService.OnaylaAsync(o.Yonetici, ilk, new[] { A("1002", "2026-11-24", "TAM") }, "REDDET");
        // TAM + OO çakışır
        var hata = await Assert.ThrowsAsync<GorevException>(() => AtamaService.OnaylaAsync(o.Yonetici, ikinci, new[] { A("1002", "2026-11-24", "OO") }, "REDDET"));
        Assert.Equal("cakisma", hata.Code);
        Assert.Contains("Ahmet Sümbül", hata.Message);
        var kontrol = await AtamaService.CakismaKontrolAsync(o.Yonetici, ikinci, new[] { A("1002", "2026-11-24", "OO") });
        Assert.Equal(1, Say(kontrol));
        Assert.Equal(0, Convert.ToInt32(await o.T.SkalerAsync($"SELECT COUNT(*) FROM gorev.atamalar WHERE talep_id = {ikinci}")));   // reddedilince hiçbir şey yazılmadı
        // vazgeçmeyip çıkar
        var r = await AtamaService.OnaylaAsync(o.Yonetici, ikinci, new[] { A("1002", "2026-11-24", "OO") }, "CIKAR");
        Assert.Equal("1", P(r, "cikarilan"));
        Assert.Equal("CIKARILDI", Convert.ToString(await o.T.SkalerAsync($"SELECT durum FROM gorev.atamalar WHERE talep_id = {ilk}")));
        Assert.Equal("ONAY_BEKLIYOR", Convert.ToString(await o.T.SkalerAsync($"SELECT durum FROM gorev.talepler WHERE id = {ilk}")));
        Assert.Equal("KISMEN_ATANDI", Convert.ToString(await o.T.SkalerAsync($"SELECT durum FROM gorev.talepler WHERE id = {ikinci}")));
        Assert.Equal(1, Convert.ToInt32(await o.T.SkalerAsync("SELECT COUNT(*) FROM gorev.islem_log WHERE islem = N'ATAMA_CIKAR'")));
        // çıkarılan görevin sorumlusu (1003) bildirimi görür; diğer kişi görmez
        var b = (System.Collections.IEnumerable)await AtamaService.BildirimListeAsync(o.Baska, true);
        Assert.Contains(b.Cast<object>(), x => P(x, "tur") == "CIKARILDI");
        Assert.DoesNotContain(((System.Collections.IEnumerable)await AtamaService.BildirimListeAsync(o.Sorumlu, true)).Cast<object>(), x => P(x, "tur") == "CIKARILDI");
        // aynı kişi aynı günün OS dilimine de atanabilir (ÖÖ ile ÖS örtüşmez)
        await AtamaService.OnaylaAsync(o.Yonetici, ikinci, new[] { A("1002", "2026-11-24", "OS") }, "REDDET");
        Assert.Equal("TAMAMEN_ATANDI", Convert.ToString(await o.T.SkalerAsync($"SELECT durum FROM gorev.talepler WHERE id = {ikinci}")));
        // çıkarılan atama yerine yeniden atanabilir (CIKARILDI satırı kilitlemez)
        await AtamaService.OnaylaAsync(o.Yonetici, ilk, new[] { A("1006", "2026-11-24", "TAM") }, "REDDET");
        Assert.Equal("TAMAMEN_ATANDI", Convert.ToString(await o.T.SkalerAsync($"SELECT durum FROM gorev.talepler WHERE id = {ilk}")));
    }

    [SqlFact]
    public async Task Reddet_neden_zorunlu_bildirim_gider_atanmis_talep_reddedilmez()
    {
        var o = await KurAsync(); await using var _t = o.T;
        var id = Id(await Talep(o.Sorumlu));
        Assert.Equal("dogrulama", await Kod(() => AtamaService.ReddetAsync(o.Yonetici, id, "  ")));
        await AtamaService.ReddetAsync(o.Yonetici, id, "Bu tarihte kadro yok");
        var t = ((System.Collections.IEnumerable)await TalepService.ListeAsync(o.Sorumlu, null)).Cast<object>().First();
        Assert.Equal("REDDEDILDI", P(t, "durum")); Assert.Equal("Bu tarihte kadro yok", P(t, "retNedeni"));
        var b = ((System.Collections.IEnumerable)await AtamaService.BildirimListeAsync(o.Sorumlu, true)).Cast<object>().ToList();
        Assert.Single(b); Assert.Contains("Bu tarihte kadro yok", P(b[0], "mesaj"));
        await AtamaService.BildirimOkunduAsync(o.Sorumlu, null);
        Assert.Equal(0, Say(await AtamaService.BildirimListeAsync(o.Sorumlu, true)));
        Assert.Equal(1, Say(await AtamaService.BildirimListeAsync(o.Sorumlu, false)));
        Assert.Equal("dogrulama", await Kod(() => AtamaService.ReddetAsync(o.Yonetici, id, "ikinci kez")));            // artık onay bekleyen değil
        Assert.Equal("dogrulama", await Kod(() => AtamaService.OnaylaAsync(o.Yonetici, id, new[] { A("1002", "2026-11-23") }, "REDDET")));   // reddedilene atama yok
        var id2 = Id(await Talep(o.Sorumlu));
        await AtamaService.OnaylaAsync(o.Yonetici, id2, new[] { A("1002", "2026-11-23") }, "REDDET");
        Assert.Equal("dogrulama", await Kod(() => AtamaService.ReddetAsync(o.Yonetici, id2, "atama başladı")));
        Assert.Equal("dogrulama", await Kod(() => TalepService.GeriCekAsync(o.Sorumlu, id2)));   // KISMEN_ATANDI geri çekilemez
    }

    [SqlFact]
    public async Task Adaylar_onerilen_ve_proje_gecmisi_once_cakisan_gun_bilgisi_verir()
    {
        var o = await KurAsync(); await using var _t = o.T;
        await o.T.ExecAsync(@"UPDATE gorev.kullanici_yetki_istisna SET saha_mi = 1 WHERE sicil_no IN (N'1002', N'1006', N'1007');
            INSERT INTO gorev.kullanici_yetki_istisna (hesap, sicil_no, saha_mi) SELECT N'sx-' + p.sicil_no, p.sicil_no, 1 FROM gorev.personel p
            WHERE p.sicil_no IN (N'1002', N'1006', N'1007') AND NOT EXISTS (SELECT 1 FROM gorev.kullanici_yetki_istisna i WHERE i.sicil_no = p.sicil_no);");
        // 1006: Toroman'da eski bir talepte çalıştı (geçmiş); 1007: başka projede; 1002: önerilen
        var eski = Id(await Talep(o.Baska, "Toroman", new TalepService.GunGirdisi("2026-11-02", "TAM", 1), new TalepService.GunGirdisi("2026-11-03", "TAM", 1)));
        await AtamaService.OnaylaAsync(o.Yonetici, eski, new[] { A("1006", "2026-11-02"), A("1006", "2026-11-03") }, "REDDET");
        var diger = Id(await Talep(o.Baska, "Baska Proje", new TalepService.GunGirdisi("2026-11-23", "TAM", 1)));
        await AtamaService.OnaylaAsync(o.Yonetici, diger, new[] { A("1007", "2026-11-23") }, "REDDET");
        var yeni = Id(await Talep(o.Sorumlu, "Toroman"));   // 23 ve 24 Kasım; öneri 1002
        var l = ((System.Collections.IEnumerable)await AtamaService.AdaylarAsync(o.Yonetici, yeni, null)).Cast<object>().ToList();
        Assert.Equal("1002", P(l[0], "sicil"));                         // önerilen en üstte
        Assert.Equal("1006", P(l[1], "sicil"));                         // sonra Toroman geçmişi (2 gün)
        Assert.Equal("2", P(l[1], "gecmis"));
        Assert.DoesNotContain(l, x => P(x, "sicil") == "1004");        // pasif aday değil
        var k = l.First(x => P(x, "sicil") == "1007");
        Assert.Equal("1", P(k, "cakisanGun"));                          // 23 Kasım'da başka talepte
        Assert.Equal("0", P(k, "gecmis"));
        Assert.Single(((System.Collections.IEnumerable)await AtamaService.AdaylarAsync(o.Yonetici, yeni, "Ayşe")).Cast<object>());
    }

    [SqlFact]
    public async Task Tatil_gunune_atama_engellenmez_uyari_doner_ve_log_yazilir()
    {
        var o = await KurAsync(); await using var _t = o.T;
        await o.T.ExecAsync("INSERT INTO gorev.takvim_tatil (baslangic, bitis, zaman_dilimi, tur, ad) VALUES ('2026-11-23', '2026-11-23', 'TAM', 'IDARI', N'Deneme tatili');");
        var id = Id(await Talep(o.Sorumlu));
        var r = await AtamaService.OnaylaAsync(o.Yonetici, id, new[] { A("1002", "2026-11-23") }, "REDDET");
        Assert.Contains("tatil", P(r, "uyari"));
        Assert.Equal(1, Convert.ToInt32(await o.T.SkalerAsync("SELECT COUNT(*) FROM gorev.islem_log WHERE islem = N'TALEP_ATAMA'")));
    }
}
