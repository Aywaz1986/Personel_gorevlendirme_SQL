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
    public async Task Havuz_arsivler_nedenle_altini_pasife_alir_ve_arsivdeki_etkinlesmez()
    {
        var (t, y) = await YoneticiAsync();
        await using var _t = t;
        var a = await Ekle(y, null, "Ana 1");
        var b = await Ekle(y, a, "Alt 1");
        var c = await Ekle(y, b, "Faaliyet 1");
        Assert.Equal("dogrulama", await Kod(() => y.ProcAsync("gorev.sp_havuz_arsivle", ("@id", b), ("@arsiv", true), ("@neden", "  "))));   // neden zorunlu
        var r = (await y.ProcAsync("gorev.sp_havuz_arsivle", ("@id", b), ("@arsiv", true), ("@neden", "Reddedildi"))).First();
        Assert.Equal(2, Convert.ToInt32(r["etkilenen"]));                                                                                   // Alt 1 + Faaliyet 1
        Assert.Equal(0, Convert.ToInt32(await t.SkalerAsync($"SELECT COUNT(*) FROM gorev.proje_havuzu WHERE id IN ({b},{c}) AND (aktif = 1 OR arsiv = 0)")));
        Assert.Equal(1, Convert.ToInt32(await t.SkalerAsync($"SELECT aktif FROM gorev.proje_havuzu WHERE id = {a}")));                    // üst etkilenmez
        Assert.Equal("dogrulama", await Kod(() => y.ProcAsync("gorev.sp_havuz_durum", ("@id", b), ("@aktif", true))));                      // arşivdeki doğrudan etkinleşmez
        await y.ProcAsync("gorev.sp_havuz_arsivle", ("@id", b), ("@arsiv", false));
        Assert.Equal(0, Convert.ToInt32(await t.SkalerAsync($"SELECT COUNT(*) FROM gorev.proje_havuzu WHERE id IN ({b},{c}) AND (aktif = 1 OR arsiv = 1)")));   // pasif kalır
        await y.ProcAsync("gorev.sp_havuz_durum", ("@id", b), ("@aktif", true));
        Assert.Equal(1, Convert.ToInt32(await t.SkalerAsync($"SELECT aktif FROM gorev.proje_havuzu WHERE id = {b}")));
        Assert.True(Convert.ToInt32(await t.SkalerAsync("SELECT COUNT(*) FROM gorev.islem_log WHERE islem IN (N'HAVUZ_ARSIV', N'HAVUZ_ARSIVDEN_CIKAR')")) >= 2);
        var (hesap, saha) = await t.KisiAsync();
        await t.ExecAsync($"INSERT INTO gorev.kullanici_yetki_istisna (hesap, saha_mi) VALUES (N'{hesap}', 1);");
        Assert.Equal("yetki", await Kod(() => saha.ProcAsync("gorev.sp_havuz_arsivle", ("@id", b), ("@arsiv", true), ("@neden", "x"))));
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

    private static List<Dictionary<string, object?>> Liste(object o) =>
        ((System.Collections.IEnumerable)o).Cast<object>().Select(x => x.GetType().GetProperties().ToDictionary(pr => pr.Name, pr => pr.GetValue(x))).ToList();

    [SqlFact]
    public async Task Takvim_aralik_yarim_gun_cakisma_ve_sayimlar()
    {
        var (t, y) = await YoneticiAsync();
        await using var _t = t;
        var bayram = Id(await TakvimService.KaydetAsync(y, null, "2024-04-10", "2024-04-12", "TAM", "RESMI", "Ramazan Bayramı", false));   // Çar-Cum
        await TakvimService.KaydetAsync(y, null, "2024-04-08", null, "TAM", "idari", "İdari izin", true);                                   // Pzt, tek gün
        await TakvimService.KaydetAsync(y, null, "2024-04-09", null, "OS", "RESMI", "Arife", false);                                         // Salı ÖS
        await TakvimService.KaydetAsync(y, null, "2024-04-09", "2024-04-09", "OO", "IDARI", "Sabah izni", true);                             // aynı güne ÖÖ serbest
        await TakvimService.KaydetAsync(y, null, "2024-06-15", "2024-06-21", "TAM", "RESMI", "Kurban Bayramı", true);                        // Cmt-Cum, 5 iş günü
        Assert.Equal("IDARI", await t.SkalerAsync("SELECT tur FROM gorev.takvim_tatil WHERE baslangic = '2024-04-08'"));                   // Türkçe i sorunu yok

        // çakışmalar ve kurallar
        Assert.Equal("dogrulama", await Kod(() => TakvimService.KaydetAsync(y, null, "2024-04-11", null, "TAM", "RESMI", "Çakışır", false)));        // bayramın içi
        Assert.Equal("dogrulama", await Kod(() => TakvimService.KaydetAsync(y, null, "2024-04-12", "2024-04-14", "TAM", "RESMI", "Taşar", false)));  // aralık kesişir
        Assert.Equal("dogrulama", await Kod(() => TakvimService.KaydetAsync(y, null, "2024-04-09", null, "TAM", "RESMI", "Yarım varken TAM", false)));
        Assert.Equal("dogrulama", await Kod(() => TakvimService.KaydetAsync(y, null, "2024-04-09", null, "OS", "RESMI", "Aynı dilim", false)));
        Assert.Equal("dogrulama", await Kod(() => TakvimService.KaydetAsync(y, null, "2024-04-11", null, "OO", "RESMI", "TAM varken yarım", false)));
        Assert.Equal("dogrulama", await Kod(() => TakvimService.KaydetAsync(y, null, "2024-07-01", "2024-07-03", "OS", "RESMI", "Yarım gün aralık olmaz", false)));
        Assert.Equal("dogrulama", await Kod(() => TakvimService.KaydetAsync(y, null, "2024-12-30", "2025-01-02", "TAM", "RESMI", "Yılbaşını aşar", false)));
        Assert.Equal("dogrulama", await Kod(() => TakvimService.KaydetAsync(y, null, "2024-01-01", "2024-03-30", "TAM", "RESMI", "60 günden uzun", false)));
        Assert.Equal("dogrulama", await Kod(() => TakvimService.KaydetAsync(y, null, "2024-08-05", "2024-08-01", "TAM", "RESMI", "Bitiş önce", false)));
        Assert.Equal("dogrulama", await Kod(() => TakvimService.KaydetAsync(y, null, "2024-08-01", null, "XX", "RESMI", "x", false)));
        Assert.Equal("dogrulama", await Kod(() => TakvimService.KaydetAsync(y, null, "2024-08-01", null, "TAM", "AKADEMIK", "x", false)));       // tür kaldırıldı
        Assert.Equal("dogrulama", await Kod(() => TakvimService.KaydetAsync(y, null, "2024-08-01", null, "TAM", "RESMI", " ", false)));
        Assert.Equal("dogrulama", await Kod(() => TakvimService.KaydetAsync(y, null, "bozuk", null, "TAM", "RESMI", "x", false)));

        // sayımlar
        var l = Liste(await TakvimService.ListeAsync(y, 2024));
        Assert.Equal(5, l.Count);
        var by = l.Single(x => (int)x["id"]! == bayram);
        Assert.Equal(3m, Convert.ToDecimal(by["gun"]));
        Assert.Equal(0m, Convert.ToDecimal(by["kesilen"]));            // yıllık işareti yok
        var kurban = l.Single(x => (string)x["ad"]! == "Kurban Bayramı");
        Assert.Equal(7m, Convert.ToDecimal(kurban["gun"]));
        Assert.Equal(5m, Convert.ToDecimal(kurban["kesilen"]));        // hafta sonu düşülür
        Assert.Equal(0.5m, Convert.ToDecimal(l.Single(x => (string)x["ad"]! == "Sabah izni")["kesilen"]));
        Assert.Equal(1m, Convert.ToDecimal(l.Single(x => (string)x["ad"]! == "İdari izin")["kesilen"]));
        var oz = await TakvimService.OzetAsync(y, 2024);
        Assert.Equal(5, Convert.ToInt32(oz.GetType().GetProperty("kayit")!.GetValue(oz)));
        Assert.Equal(10.5m, Convert.ToDecimal(oz.GetType().GetProperty("resmiGun")!.GetValue(oz)));   // 3 + 0.5 + 7
        Assert.Equal(1.5m, Convert.ToDecimal(oz.GetType().GetProperty("idariGun")!.GetValue(oz)));    // 1 + 0.5
        Assert.Equal(6.5m, Convert.ToDecimal(oz.GetType().GetProperty("kesilenGun")!.GetValue(oz)));  // 1 + 0.5 + 5
        Assert.Empty(Liste(await TakvimService.ListeAsync(y, 2025)));

        // güncelleme kendi kendini çakıştırmaz; silme
        await TakvimService.KaydetAsync(y, bayram, "2024-04-10", "2024-04-12", "TAM", "RESMI", "Düzeltildi", true);
        Assert.Equal("Düzeltildi", await t.SkalerAsync("SELECT ad FROM gorev.takvim_tatil WHERE id = " + bayram));
        await TakvimService.SilAsync(y, bayram);
        Assert.Equal("dogrulama", await Kod(() => TakvimService.SilAsync(y, bayram)));
    }

    [SqlFact]
    public async Task Takvim_yazma_yalniz_yoneticiye_rolluler_listeler()
    {
        var (t, y) = await YoneticiAsync();
        await using var _t = t;
        await TakvimService.KaydetAsync(y, null, "2026-10-29", null, "TAM", "RESMI", "Bayram", false);
        var (hesap, sorumlu) = await t.KisiAsync();
        await t.ExecAsync($"INSERT INTO gorev.kullanici_yetki_istisna (hesap, sorumlu_mu) VALUES (N'{hesap}', 1);");
        Assert.Single(Liste(await TakvimService.ListeAsync(sorumlu, null)));
        Assert.NotNull(await TakvimService.OzetAsync(sorumlu, 2026));
        Assert.Equal("yetki", await Kod(() => TakvimService.KaydetAsync(sorumlu, null, "2026-10-31", null, "TAM", "RESMI", "x", false)));
        Assert.Equal("yetki", await Kod(() => TakvimService.SilAsync(sorumlu, 1)));
        Assert.Equal("yetki", await Kod(() => TakvimService.OnizleAsync(sorumlu, new[] { new TakvimSatir(1, "2026-10-31", "", "TAM", "RESMI", "x", false) })));
    }

    [SqlFact]
    public async Task Toplu_yukleme_onizler_hatada_hicbirini_uygulamaz_gecerliyse_uygular()
    {
        var (t, y) = await YoneticiAsync();
        await using var _t = t;
        await TakvimService.KaydetAsync(y, null, "2024-10-29", null, "TAM", "RESMI", "Cumhuriyet Bayramı", false);
        await TakvimService.KaydetAsync(y, null, "2024-04-10", "2024-04-12", "TAM", "RESMI", "Bayram", false);

        var iyi = new[]
        {
            new TakvimSatir(2, "2024-10-29", "", "TAM", "RESMI", "Cumhuriyet Bayramı", false),        // aynı
            new TakvimSatir(3, "2024-04-10", "2024-04-12", "TAM", "resmi", "Ramazan Bayramı", true),  // güncelle (ad, yıllık)
            new TakvimSatir(4, "2024-10-28", "", "OS", "RESMI", "Arife", false),                       // yeni
            new TakvimSatir(5, "2024-04-23", "", "TAM", "RESMI", "23 Nisan", false),                   // yeni
            new TakvimSatir(6, "2024-06-15", "2024-06-21", "TAM", "RESMI", "Kurban Bayramı", true),    // yeni aralık
        };
        var on = await y.ProcAsync("gorev.sp_takvim_toplu_onizle", ("@json", JsonSerializer.Serialize(iyi.Select(x => new { sira = x.Sira, baslangic = x.Baslangic, bitis = x.Bitis, zaman = x.Zaman, tur = x.Tur, ad = x.Ad, yillik = x.Yillik }))));
        Assert.Equal(new[] { "AYNI", "GUNCELLE", "YENI", "YENI", "YENI" }, on.Select(r => (string)r["durum"]!).ToArray());
        Assert.Equal(2, Convert.ToInt32(await t.SkalerAsync("SELECT COUNT(*) FROM gorev.takvim_tatil")));   // önizleme yazmadı

        var kotu = iyi.Concat(new[]
        {
            new TakvimSatir(7, "yok", "", "TAM", "RESMI", "Bozuk tarih", false),
            new TakvimSatir(8, "2024-12-01", "", "TAM", "RESMI", "A", false), new TakvimSatir(9, "2024-12-01", "", "TAM", "RESMI", "B", false),    // dosyada tekrar (2 hata)
            new TakvimSatir(10, "2024-10-29", "", "OO", "RESMI", "TAM ile çakışır", false),                                                     // veritabanındaki TAM ile
            new TakvimSatir(11, "2024-12-30", "2025-01-02", "TAM", "RESMI", "Yılbaşını aşar", false),                                             // yıl sınırı
        }).ToArray();
        var onK = await y.ProcAsync("gorev.sp_takvim_toplu_onizle", ("@json", JsonSerializer.Serialize(kotu.Select(x => new { sira = x.Sira, baslangic = x.Baslangic, bitis = x.Bitis, zaman = x.Zaman, tur = x.Tur, ad = x.Ad, yillik = x.Yillik }))));
        Assert.Equal(6, onK.Count(r => (string)r["durum"]! == "HATA"));   // bozuk(1) + A/B tekrar(2) + 29 Ekim TAM/OO dosya içi çakışma(2) + yıl sınırı(1)
        Assert.Equal("dogrulama", await Kod(() => TakvimService.UygulaAsync(y, kotu)));
        Assert.Equal(2, Convert.ToInt32(await t.SkalerAsync("SELECT COUNT(*) FROM gorev.takvim_tatil")));   // hiçbiri uygulanmadı

        var r2 = await TakvimService.UygulaAsync(y, iyi);
        Assert.Equal(5, Convert.ToInt32(await t.SkalerAsync("SELECT COUNT(*) FROM gorev.takvim_tatil")));
        Assert.Equal("Ramazan Bayramı", await t.SkalerAsync("SELECT ad FROM gorev.takvim_tatil WHERE baslangic = '2024-04-10'"));
        Assert.Equal(1, Convert.ToInt32(await t.SkalerAsync("SELECT COUNT(*) FROM gorev.islem_log WHERE islem = N'TAKVIM_TOPLU' AND ayrinti LIKE N'eklenen=3 guncellenen=1 ayni=1'")));
        Assert.NotNull(r2);
        Assert.Equal("dogrulama", await Kod(() => TakvimService.OnizleAsync(y, Array.Empty<TakvimSatir>())));
    }

    [SqlFact]
    public async Task Sifirla_takvimi_korur_havuzu_temizler()
    {
        var (t, y) = await YoneticiAsync();
        await using var _t = t;
        var a = await Ekle(y, null, "Ana 1"); await Ekle(y, a, "Alt 1");
        await TakvimService.KaydetAsync(y, null, "2026-10-29", null, "TAM", "RESMI", "Bayram", false);
        await t.ExecAsync(TestDb.Onayli(TestDb.BetikOku("gorev_sifirla.sql"), "SIFIRLA"));
        Assert.Equal(0, Convert.ToInt32(await t.SkalerAsync("SELECT COUNT(*) FROM gorev.proje_havuzu")));
        Assert.Equal(1, Convert.ToInt32(await t.SkalerAsync("SELECT COUNT(*) FROM gorev.takvim_tatil")));
    }
}
