using Gorevlendirme;
using Xunit;

namespace Gorevlendirme.SqlTests;

/// <summary>Canlıya geçiş ve eski veri aktarımı (012): kontrol listesi, tek yönlü geçiş, aktarım + geri alma, yetki.</summary>
public class CanliTests
{
    private static async Task<string> Kod(Func<Task> f) => (await Assert.ThrowsAsync<GorevException>(f)).Code;
    private sealed record Ortam(TestDb T, SqlService Yonetici, SqlService Saha);

    private static async Task<Ortam> KurAsync()
    {
        var t = await TestDb.OlusturAsync();
        await t.Migrator.UygulaAsync(false);
        await t.ExecAsync(@"INSERT INTO gorev.personel (sicil_no, adi_soyadi, bolum) VALUES (N'1002', N'Ahmet Sümbül', N'Teknik'), (N'1005', N'Yönetici Kişi', N'Merkez');");
        var (hy, yon) = await t.KisiAsync();
        var (h1, saha) = await t.KisiAsync();
        await t.ExecAsync($@"INSERT INTO gorev.kullanici_yetki_istisna (hesap, sicil_no, yonetici_mi) VALUES (N'{hy}', N'1005', 1);
            INSERT INTO gorev.kullanici_yetki_istisna (hesap, sicil_no, saha_mi) VALUES (N'{h1}', N'1002', 1);");
        return new Ortam(t, yon, saha);
    }

    private static string D(int n) => new DateTime(2026, 3, 2).AddDays(n).ToString("yyyy-MM-dd");

    private static string Plan() => System.Text.Json.JsonSerializer.Serialize(new
    {
        gorevler = new object[] { new { eskiId = 1, sicil = "1002", ana = "Toroman", alt = "Genel", faaliyet = "Genel", konum = "Ankara", metin = "Montaj", sorumluSicil = "1005", sorumluAdi = (string?)null, gunler = new[] { D(0), D(1) } },
                                  new { eskiId = 2, sicil = "1005", ana = "Toroman", alt = "Genel", faaliyet = "Genel", konum = "Ankara", metin = (string?)null, sorumluSicil = (string?)null, sorumluAdi = "Eski Kişi", gunler = new[] { D(2) } } },
        tarihsiz = new object[] { new { sicil = "1002", personelAdi = (string?)null, ana = "Toroman", proje = "X", metin = (string?)null, sorumluAdi = "Eski" },
                                  new { sicil = (string?)null, personelAdi = "Ayrılan Kişi", ana = "Başka", proje = (string?)null, metin = (string?)null, sorumluAdi = (string?)null } },
        izinler = new object[] { new { sicil = "1002", gunler = new[] { D(5) } } },
        raporlar = new object[] { new { sicil = "1005", ilk = D(6), son = D(8) } },
    });

    private static int N(object? o) => Convert.ToInt32(o);

    [SqlFact]
    public async Task Kontrol_listesi_zorunlulari_gosterir_ve_yoneticiye_aciktir()
    {
        var o = await KurAsync(); await using var _t = o.T;
        var l = ((System.Collections.IEnumerable)await CanliService.KontrolAsync(o.Yonetici)).Cast<object>().ToList();
        Assert.Equal(8, l.Count);
        Assert.Equal("dogrulama", await Kod(() => CanliService.CanliyaGecAsync(o.Yonetici, "CANLI", null)));   // havuz boş → zorunlu madde eksik
        Assert.Equal("yetki", await Kod(() => CanliService.KontrolAsync(o.Saha)));
        Assert.Equal("yetki", await Kod(() => CanliService.CanliyaGecAsync(o.Saha, "CANLI", null)));
        Assert.Equal("TEST", await o.T.SkalerAsync("SELECT deger FROM gorev.sistem_ayarlari WHERE anahtar = N'ORTAM'"));
    }

    [SqlFact]
    public async Task Aktarim_yazar_tekrar_reddedilir_geri_alinca_temizlenir()
    {
        var o = await KurAsync(); await using var _t = o.T;
        var once = N(await o.T.SkalerAsync("SELECT COUNT(*) FROM gorev.proje_havuzu"));
        await CanliService.AktarAsync(o.Yonetici, Plan());
        var d = await CanliService.DurumAsync(o.Yonetici);
        var s = (Dictionary<string, object?>)d;
        Assert.Equal(2, N(s["talep"])); Assert.Equal(3, N(s["atama"])); Assert.Equal(1, N(s["izin"])); Assert.Equal(1, N(s["rapor"])); Assert.Equal(2, N(s["gecmis"]));
        Assert.Equal(5, N(s["havuz"]));    // Toroman/Genel/Genel/Ankara + Başka (yalnız ana)
        Assert.Equal(5, N(await o.T.SkalerAsync("SELECT COUNT(*) FROM gorev.proje_havuzu")) - once);
        Assert.Equal(1, N(await o.T.SkalerAsync("SELECT COUNT(*) FROM gorev.talepler WHERE gorev_metni LIKE N'%Eski sorumlu: Eski Kişi%'")));
        Assert.Equal(1, N(await o.T.SkalerAsync("SELECT COUNT(*) FROM gorev.izin_gunleri WHERE durum = 'ONAYLI'")));
        Assert.Equal("dogrulama", await Kod(() => CanliService.AktarAsync(o.Yonetici, Plan())));              // ikinci aktarım reddedilir
        Assert.Equal("yetki", await Kod(() => CanliService.AktarAsync(o.Saha, Plan())));
        Assert.Equal("dogrulama", await Kod(() => CanliService.GeriAlAsync(o.Yonetici, "yanlis")));
        await CanliService.GeriAlAsync(o.Yonetici, "GERIAL");
        Assert.Equal(0, N(await o.T.SkalerAsync("SELECT COUNT(*) FROM gorev.talepler")));
        Assert.Equal(0, N(await o.T.SkalerAsync("SELECT COUNT(*) FROM gorev.atamalar")));
        Assert.Equal(0, N(await o.T.SkalerAsync("SELECT COUNT(*) FROM gorev.gecmis_gorev")));
        Assert.Equal(once, N(await o.T.SkalerAsync("SELECT COUNT(*) FROM gorev.proje_havuzu")));
        await CanliService.AktarAsync(o.Yonetici, Plan());                                                     // geri aldıktan sonra yeniden aktarılabilir
    }

    [SqlFact]
    public async Task Bozuk_veri_hicbir_sey_yazmadan_reddedilir()
    {
        var o = await KurAsync(); await using var _t = o.T;
        var bozuk = System.Text.Json.JsonSerializer.Serialize(new { gorevler = new object[] { new { eskiId = 1, sicil = "9999", ana = "X", alt = "Genel", faaliyet = "Genel", konum = "K", metin = (string?)null, sorumluSicil = "1005", sorumluAdi = (string?)null, gunler = new[] { D(0) } } }, tarihsiz = Array.Empty<object>(), izinler = Array.Empty<object>(), raporlar = Array.Empty<object>() });
        Assert.Equal("dogrulama", await Kod(() => CanliService.AktarAsync(o.Yonetici, bozuk)));
        Assert.Equal("dogrulama", await Kod(() => CanliService.AktarAsync(o.Yonetici, "{")));
        Assert.Equal(0, N(await o.T.SkalerAsync("SELECT COUNT(*) FROM gorev.proje_havuzu")));
    }

    [SqlFact]
    public async Task Canliya_gecis_tek_yonludur_ve_aktarim_ile_sifirlama_kapanir()
    {
        var o = await KurAsync(); await using var _t = o.T;
        await CanliService.AktarAsync(o.Yonetici, Plan());      // havuz + (talep) dolu olur
        await o.T.ExecAsync("INSERT INTO gorev.takvim_tatil (baslangic, bitis, zaman_dilimi, tur, ad) VALUES ('2026-04-23', '2026-04-23', 'TAM', 'RESMI', N'Ulusal Egemenlik')");
        Assert.Equal("dogrulama", await Kod(() => CanliService.CanliyaGecAsync(o.Yonetici, "EVET", null)));
        Assert.Equal("dogrulama", await Kod(() => CanliService.CanliyaGecAsync(o.Yonetici, "CANLI", "abc")));
        await CanliService.CanliyaGecAsync(o.Yonetici, "CANLI", "1.0.0");
        Assert.Equal("CANLI", await o.T.SkalerAsync("SELECT deger FROM gorev.sistem_ayarlari WHERE anahtar = N'ORTAM'"));
        Assert.Equal("1.0.0", await o.T.SkalerAsync("SELECT deger FROM gorev.sistem_ayarlari WHERE anahtar = N'MIN_UYGULAMA_SURUMU'"));
        Assert.Equal(1, N(await o.T.SkalerAsync("SELECT COUNT(*) FROM gorev.islem_log WHERE islem = N'ORTAM_CANLI'")));
        Assert.Equal("dogrulama", await Kod(() => CanliService.GeriAlAsync(o.Yonetici, "GERIAL")));            // canlıda geri alma yok
        Assert.Equal("dogrulama", await Kod(() => CanliService.CanliyaGecAsync(o.Yonetici, "CANLI", null)));   // zaten canlı → madde 1 eksik
    }
}
