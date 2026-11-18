using System.Text.Json;
using Gorevlendirme;
using Xunit;

namespace Gorevlendirme.SqlTests;

/// <summary>Proje havuzu ve akademik takvim (004): gerçek SQL girişleriyle.</summary>
public class HavuzTakvimTests
{
    private static async Task<(TestDb T, SqlService Yon)> YoneticiAsync()
    {
        var t = await TestDb.OlusturAsync();
        await t.Migrator.UygulaAsync(false);
        var (hesap, yon) = await t.KisiAsync();
        await t.ExecAsync($"INSERT INTO gorev.kullanici_yetki_istisna (hesap, yonetici_mi) VALUES (N'{hesap}', 1);");
        return (t, yon);
    }

    private static async Task<int> Ekle(SqlService s, int? ust, string ad) =>
        Convert.ToInt32((await s.ProcAsync("gorev.sp_havuz_ekle", ("@ust_id", ust), ("@ad", ad))).First()["id"]);

    private static int Id(object o) => Convert.ToInt32(o.GetType().GetProperty("id")!.GetValue(o));

    private static async Task<string> Kod(Func<Task> f) => (await Assert.ThrowsAsync<GorevException>(f)).Code;

    [SqlFact]
    public async Task Havuz_dort_seviye_kurar_besinciyi_ve_kopyayi_reddeder()
    {
        var (t, y) = await YoneticiAsync();
        await using var _t = t;
        var a = await Ekle(y, null, "Ana 1");
        var b = await Ekle(y, a, "Alt 1");
        var c = await Ekle(y, b, "Faaliyet 1");
        var d = await Ekle(y, c, "Konum 1");
        Assert.Equal(4, Convert.ToInt32(await t.SkalerAsync($"SELECT seviye FROM gorev.proje_havuzu WHERE id = {d}")));
        Assert.Equal("dogrulama", await Kod(() => Ekle(y, d, "Olmaz")));                       // Konum altına eklenmez
        Assert.Equal("dogrulama", await Kod(() => Ekle(y, null, "ana 1")));                    // ad büyük/küçük harf duyarsız tekil
        Assert.Equal("dogrulama", await Kod(() => Ekle(y, a, "  ")));                          // boş ad
        Assert.Equal("dogrulama", await Kod(() => Ekle(y, 9999, "X")));                        // üst yok
        Assert.True(await Ekle(y, null, "Ana 2") > 0);                                  // aynı ad başka üstte / farklı ad serbest
        Assert.True(await Ekle(y, b, "Faaliyet 2") > 0);
    }

    [SqlFact]
    public async Task Havuz_yetki_listeleme_rolluye_yazma_yalniz_yoneticiye()
    {
        var (t, y) = await YoneticiAsync();
        await using var _t = t;
        await Ekle(y, null, "Ana 1");
        var (hesap, saha) = await t.KisiAsync();
        await t.ExecAsync($"INSERT INTO gorev.kullanici_yetki_istisna (hesap, saha_mi) VALUES (N'{hesap}', 1);");
        Assert.Single(await saha.ProcAsync("gorev.sp_havuz_listele"));                         // rolü olan okur
        Assert.Equal("yetki", await Kod(() => Ekle(saha, null, "Yeni")));
        Assert.Equal("yetki", await Kod(() => saha.ProcAsync("gorev.sp_havuz_durum", ("@id", 1), ("@aktif", false))));
        var (_, kayitsiz) = await t.KisiAsync();
        Assert.Equal("yetki", await Kod(() => kayitsiz.ProcAsync("gorev.sp_havuz_listele")));  // rolü olmayan okuyamaz
        Assert.Equal("yetki", await Kod(() => kayitsiz.ProcAsync("gorev.sp_takvim_listele")));
    }

    [SqlFact]
    public async Task Pasife_alma_altini_da_alir_etkinlestirme_ustu_aktif_ister_adlandirma_tekil()
    {
        var (t, y) = await YoneticiAsync();
        await using var _t = t;
        var a = await Ekle(y, null, "Ana 1");
        var b = await Ekle(y, a, "Alt 1");
        var c = await Ekle(y, b, "Faaliyet 1");
        await y.ProcAsync("gorev.sp_havuz_durum", ("@id", a), ("@aktif", false));
        Assert.Equal(0, Convert.ToInt32(await t.SkalerAsync("SELECT COUNT(*) FROM gorev.proje_havuzu WHERE aktif = 1")));
        Assert.Equal("dogrulama", await Kod(() => y.ProcAsync("gorev.sp_havuz_durum", ("@id", c), ("@aktif", true))));   // üst pasif
        Assert.Equal("dogrulama", await Kod(() => Ekle(y, a, "Alt 2")));                                                   // pasif altına eklenmez
        await y.ProcAsync("gorev.sp_havuz_durum", ("@id", a), ("@aktif", true));
        Assert.Equal(1, Convert.ToInt32(await t.SkalerAsync("SELECT COUNT(*) FROM gorev.proje_havuzu WHERE aktif = 1")));  // yalnız o kayıt açıldı
        var b2 = await Ekle(y, a, "Alt 2");
        Assert.Equal("dogrulama", await Kod(() => y.ProcAsync("gorev.sp_havuz_adlandir", ("@id", b2), ("@ad", "alt 1"))));
        await y.ProcAsync("gorev.sp_havuz_adlandir", ("@id", b2), ("@ad", "Alt İki"));
        Assert.Equal("Alt İki", await t.SkalerAsync($"SELECT ad FROM gorev.proje_havuzu WHERE id = {b2}"));
    }

    [SqlFact]
    public async Task Birlestirme_cocuklari_tasir_ayni_adlilari_birlestirir_hicbir_seyi_silmez()
    {
        var (t, y) = await YoneticiAsync();
        await using var _t = t;
        var a1 = await Ekle(y, null, "Ana 1"); var a2 = await Ekle(y, null, "Ana 2");
        var b1 = await Ekle(y, a1, "Alt A"); var b2 = await Ekle(y, a2, "Alt B");
        var c11 = await Ekle(y, b1, "Ortak"); var c12 = await Ekle(y, b1, "Sadece kaynakta");
        var c21 = await Ekle(y, b2, "Ortak");
        var d11 = await Ekle(y, c11, "Konum X");
        var toplamOnce = Convert.ToInt32(await t.SkalerAsync("SELECT COUNT(*) FROM gorev.proje_havuzu"));

        Assert.Equal("dogrulama", await Kod(() => y.ProcAsync("gorev.sp_havuz_birlestir", ("@kaynak_id", a1), ("@hedef_id", b2))));   // seviye farklı
        Assert.Equal("dogrulama", await Kod(() => y.ProcAsync("gorev.sp_havuz_birlestir", ("@kaynak_id", b1), ("@hedef_id", b1))));
        var r = (await y.ProcAsync("gorev.sp_havuz_birlestir", ("@kaynak_id", b1), ("@hedef_id", b2))).First();
        Assert.Equal(2, Convert.ToInt32(r["birlesen"]));    // Alt A→Alt B ve Ortak→Ortak
        Assert.Equal(2, Convert.ToInt32(r["tasinan"]));     // "Sadece kaynakta" ve "Konum X"

        Assert.Equal(toplamOnce, Convert.ToInt32(await t.SkalerAsync("SELECT COUNT(*) FROM gorev.proje_havuzu")));                // silinmedi
        Assert.Equal(b2, Convert.ToInt32(await t.SkalerAsync($"SELECT birlestirildi_id FROM gorev.proje_havuzu WHERE id = {b1}")));
        Assert.Equal(c21, Convert.ToInt32(await t.SkalerAsync($"SELECT birlestirildi_id FROM gorev.proje_havuzu WHERE id = {c11}")));
        Assert.Equal(0, Convert.ToInt32(await t.SkalerAsync($"SELECT CAST(aktif AS int) FROM gorev.proje_havuzu WHERE id = {b1}")));
        Assert.Equal(b2, Convert.ToInt32(await t.SkalerAsync($"SELECT ust_id FROM gorev.proje_havuzu WHERE id = {c12}")));        // taşındı
        Assert.Equal(c21, Convert.ToInt32(await t.SkalerAsync($"SELECT ust_id FROM gorev.proje_havuzu WHERE id = {d11}")));        // iç içe taşındı
        Assert.Equal("dogrulama", await Kod(() => y.ProcAsync("gorev.sp_havuz_birlestir", ("@kaynak_id", b2), ("@hedef_id", b1))));  // birleştirilmiş kayıt kullanılamaz
        Assert.Equal("dogrulama", await Kod(() => y.ProcAsync("gorev.sp_havuz_durum", ("@id", b1), ("@aktif", true))));
        await y.ProcAsync("gorev.sp_havuz_durum", ("@id", a2), ("@aktif", false));
        var a3 = await Ekle(y, null, "Ana 3");
        Assert.Equal("dogrulama", await Kod(() => y.ProcAsync("gorev.sp_havuz_birlestir", ("@kaynak_id", a3), ("@hedef_id", a2))));  // pasif hedef
    }

    [SqlFact]
    public async Task Takvim_kaydet_listele_sil_ve_kurallar()
    {
        var (t, y) = await YoneticiAsync();
        await using var _t = t;
        var id = Id(await TakvimService.KaydetAsync(y, null, "2026-10-29", "TAM", "RESMI", "Cumhuriyet Bayramı"));
        await TakvimService.KaydetAsync(y, null, "2026-10-30", "OS", "idari", "Yarım gün");
        Assert.Equal(2, Convert.ToInt32(await t.SkalerAsync("SELECT COUNT(*) FROM gorev.takvim_tatil")));
        Assert.Equal("IDARI", await t.SkalerAsync("SELECT tur FROM gorev.takvim_tatil WHERE tarih = '2026-10-30'"));   // tür büyük harfe çevrilir (Türkçe i sorunu yok)
        Assert.Equal("dogrulama", await Kod(() => TakvimService.KaydetAsync(y, null, "2026-10-29", "TAM", "RESMI", "Yine")));  // aynı tarih+dilim
        Assert.Equal("dogrulama", await Kod(() => TakvimService.KaydetAsync(y, null, "2026-10-29", "OO", "RESMI", "Çakışır"))); // TAM varken yarım gün
        Assert.Equal("dogrulama", await Kod(() => TakvimService.KaydetAsync(y, null, "2026-10-30", "TAM", "RESMI", "Çakışır"))); // yarım gün varken TAM
        Assert.Equal("dogrulama", await Kod(() => TakvimService.KaydetAsync(y, null, "2026-11-01", "XX", "RESMI", "x")));
        Assert.Equal("dogrulama", await Kod(() => TakvimService.KaydetAsync(y, null, "2026-11-01", "TAM", "YOK", "x")));
        Assert.Equal("dogrulama", await Kod(() => TakvimService.KaydetAsync(y, null, "1999-01-01", "TAM", "RESMI", "x")));
        Assert.Equal("dogrulama", await Kod(() => TakvimService.KaydetAsync(y, null, "bozuk", "TAM", "RESMI", "x")));
        await TakvimService.KaydetAsync(y, id, "2026-10-29", "TAM", "AKADEMIK", "Düzeltildi");           // güncelleme
        Assert.Equal("Düzeltildi", await t.SkalerAsync("SELECT ad FROM gorev.takvim_tatil WHERE id = " + id));
        Assert.Equal(2, ((System.Collections.IEnumerable)await TakvimService.ListeAsync(y, 2026)).Cast<object>().Count());
        Assert.Empty(((System.Collections.IEnumerable)await TakvimService.ListeAsync(y, 2027)).Cast<object>());
        await TakvimService.SilAsync(y, id);
        Assert.Equal("dogrulama", await Kod(() => TakvimService.SilAsync(y, id)));
    }

    [SqlFact]
    public async Task Takvim_yazma_yalniz_yoneticiye_rolluler_listeler()
    {
        var (t, y) = await YoneticiAsync();
        await using var _t = t;
        await TakvimService.KaydetAsync(y, null, "2026-10-29", "TAM", "RESMI", "Bayram");
        var (hesap, sorumlu) = await t.KisiAsync();
        await t.ExecAsync($"INSERT INTO gorev.kullanici_yetki_istisna (hesap, sorumlu_mu) VALUES (N'{hesap}', 1);");
        Assert.Single(((System.Collections.IEnumerable)await TakvimService.ListeAsync(sorumlu, null)).Cast<object>());
        Assert.Equal("yetki", await Kod(() => TakvimService.KaydetAsync(sorumlu, null, "2026-10-31", "TAM", "RESMI", "x")));
        Assert.Equal("yetki", await Kod(() => TakvimService.SilAsync(sorumlu, 1)));
        Assert.Equal("yetki", await Kod(() => TakvimService.OnizleAsync(sorumlu, new[] { new TakvimSatir(1, "2026-10-31", "TAM", "RESMI", "x") })));
    }

    [SqlFact]
    public async Task Toplu_yukleme_onizler_hatada_hicbirini_uygulamaz_gecerliyse_uygular()
    {
        var (t, y) = await YoneticiAsync();
        await using var _t = t;
        await TakvimService.KaydetAsync(y, null, "2026-10-29", "TAM", "RESMI", "Cumhuriyet Bayramı");
        await TakvimService.KaydetAsync(y, null, "2026-05-01", "TAM", "RESMI", "Emek ve Dayanışma Günü");

        var iyi = new[]
        {
            new TakvimSatir(2, "2026-10-29", "TAM", "RESMI", "Cumhuriyet Bayramı"),       // aynı
            new TakvimSatir(3, "2026-05-01", "TAM", "RESMI", "1 Mayıs"),                   // güncelle
            new TakvimSatir(4, "2026-10-28", "OS", "RESMI", "Arife"),                      // yeni
            new TakvimSatir(5, "2026-04-23", "TAM", "resmi", "23 Nisan"),                  // küçük harf tür: yeni
        };
        var json = JsonSerializer.Serialize(iyi.Select(x => new { sira = x.Sira, tarih = x.Tarih, zaman = x.Zaman, tur = x.Tur, ad = x.Ad }));
        var on = await y.ProcAsync("gorev.sp_takvim_toplu_onizle", ("@json", json));
        Assert.Equal(new[] { "AYNI", "GUNCELLE", "YENI", "YENI" }, on.Select(r => (string)r["durum"]!).ToArray());
        Assert.Equal(2, Convert.ToInt32(await t.SkalerAsync("SELECT COUNT(*) FROM gorev.takvim_tatil")));   // önizleme yazmadı

        var kotu = iyi.Concat(new[]
        {
            new TakvimSatir(6, "yok", "TAM", "RESMI", "Bozuk tarih"),
            new TakvimSatir(7, "2026-12-01", "TAM", "RESMI", "A"), new TakvimSatir(8, "2026-12-01", "TAM", "RESMI", "B"),   // dosyada tekrar
            new TakvimSatir(9, "2026-10-29", "OO", "RESMI", "TAM ile çakışır"),                                              // veritabanındaki TAM ile
            new TakvimSatir(10, "2026-12-05", "TAM", "RESMI", "Gün"), new TakvimSatir(11, "2026-12-05", "OS", "RESMI", "Yarım"), // dosya içinde TAM+OS
        }).ToArray();
        var onK = await y.ProcAsync("gorev.sp_takvim_toplu_onizle", ("@json", JsonSerializer.Serialize(kotu.Select(x => new { sira = x.Sira, tarih = x.Tarih, zaman = x.Zaman, tur = x.Tur, ad = x.Ad }))));
        Assert.Equal(7, onK.Count(r => (string)r["durum"]! == "HATA"));
        Assert.Equal("dogrulama", await Kod(() => TakvimService.UygulaAsync(y, kotu)));
        Assert.Equal(2, Convert.ToInt32(await t.SkalerAsync("SELECT COUNT(*) FROM gorev.takvim_tatil")));   // hiçbiri uygulanmadı

        var r2 = await TakvimService.UygulaAsync(y, iyi);
        Assert.Equal(4, Convert.ToInt32(await t.SkalerAsync("SELECT COUNT(*) FROM gorev.takvim_tatil")));
        Assert.Equal("1 Mayıs", await t.SkalerAsync("SELECT ad FROM gorev.takvim_tatil WHERE tarih = '2026-05-01'"));
        Assert.Equal(1, Convert.ToInt32(await t.SkalerAsync("SELECT COUNT(*) FROM gorev.islem_log WHERE islem = N'TAKVIM_TOPLU' AND ayrinti LIKE N'eklenen=2 guncellenen=1 ayni=1'")));
        Assert.NotNull(r2);
        Assert.Equal("dogrulama", await Kod(() => TakvimService.OnizleAsync(y, Array.Empty<TakvimSatir>())));
    }

    [SqlFact]
    public async Task Sifirla_takvimi_korur_havuzu_temizler()
    {
        var (t, y) = await YoneticiAsync();
        await using var _t = t;
        var a = await Ekle(y, null, "Ana 1"); await Ekle(y, a, "Alt 1");
        await TakvimService.KaydetAsync(y, null, "2026-10-29", "TAM", "RESMI", "Bayram");
        await t.ExecAsync(TestDb.Onayli(TestDb.BetikOku("gorev_sifirla.sql"), "SIFIRLA"));
        Assert.Equal(0, Convert.ToInt32(await t.SkalerAsync("SELECT COUNT(*) FROM gorev.proje_havuzu")));
        Assert.Equal(1, Convert.ToInt32(await t.SkalerAsync("SELECT COUNT(*) FROM gorev.takvim_tatil")));
    }
}
