using Gorevlendirme;
using Xunit;

namespace Gorevlendirme.SqlTests;

/// <summary>Kimlik ve roller: gerçek SQL girişleriyle (ORIGINAL_LOGIN() = giriş adı).</summary>
public class KimlikTests
{
    private static async Task<TestDb> KurulmusAsync()
    {
        var t = await TestDb.OlusturAsync();
        await t.Migrator.UygulaAsync(false);
        return t;
    }

    [SqlFact]
    public async Task Hesap_eslesmesi_alan_adli_ve_adsiz_kayitlari_dogru_cozer()
    {
        await using var t = await KurulmusAsync();
        async Task<int> Es(string kayit, string hesap) =>
            Convert.ToInt32(await t.SkalerAsync($"SELECT CAST(gorev.fn_hesap_eslesir(N'{kayit}', N'{hesap}') AS int)"));
        Assert.Equal(1, await Es("ALAN\\Murat", "alan\\murat"));
        Assert.Equal(1, await Es("murat", "ALAN\\MURAT"));
        Assert.Equal(1, await Es("ibrahim", "ALAN\\IBRAHIM"));     // Türkçe I/i ayrımı olmadan
        Assert.Equal(0, await Es("ALAN\\murat", "murat"));          // alan adı yazılıysa hesabın da alan adı olmalı
        Assert.Equal(0, await Es("ALAN\\murat", "DIGER\\murat"));
        Assert.Equal(0, await Es("x", "y"));
        Assert.Equal(0, await Es("", "y"));
    }

    [SqlFact]
    public async Task Kayitsiz_kisi_kayitli_degildir()
    {
        await using var t = await KurulmusAsync();
        var (_, kisi) = await t.KisiAsync();
        var k = await KimlikService.BenAsync(kisi);
        Assert.False(k.Kayitli);
        Assert.False(k.Yonetici || k.Sorumlu || k.Saha);
    }

    [SqlFact]
    public async Task Istisna_rolleri_verir_ve_bolum_kuralinin_ustune_yazar()
    {
        await using var t = await KurulmusAsync();
        var (hesap, kisi) = await t.KisiAsync();
        await t.ExecAsync($@"INSERT INTO gorev.personel (sicil_no, adi_soyadi, bolum, kullanici_adi) VALUES (N'1', N'Test Kişi', N'Bölüm A', N'{hesap}');
INSERT INTO gorev.rol_bolum_eslestirme (bolum, rol) VALUES (N'Bölüm A', N'SAHA');");

        var k = await KimlikService.BenAsync(kisi);              // yalnız bölüm kuralı
        Assert.True(k.Kayitli); Assert.True(k.Saha); Assert.False(k.Sorumlu); Assert.Equal("BOLUM", k.Kaynak);

        await t.ExecAsync($"INSERT INTO gorev.kullanici_yetki_istisna (hesap, sorumlu_mu) VALUES (N'{hesap}', 1);");
        k = await KimlikService.BenAsync(kisi);                  // istisna bölümün yerine geçer
        Assert.True(k.Sorumlu); Assert.False(k.Saha); Assert.Equal("ISTISNA", k.Kaynak);
        Assert.Equal("Test Kişi", k.AdiSoyadi);                  // ad kadrodan bulunur (hesap eşleşmesiyle)
    }

    [SqlFact]
    public async Task Eslesmesi_olmayan_bolum_ve_pasif_personel_rol_almaz()
    {
        await using var t = await KurulmusAsync();
        var (hesap, kisi) = await t.KisiAsync();
        await t.ExecAsync($"INSERT INTO gorev.personel (sicil_no, adi_soyadi, bolum, kullanici_adi) VALUES (N'1', N'Test', N'Bölüm B', N'{hesap}');");
        Assert.False((await KimlikService.BenAsync(kisi)).Kayitli);      // bölüm eşleşmesi yok
        await t.ExecAsync("INSERT INTO gorev.rol_bolum_eslestirme (bolum, rol) VALUES (N'Bölüm B', N'SAHA');");
        Assert.True((await KimlikService.BenAsync(kisi)).Kayitli);
        await t.ExecAsync("UPDATE gorev.personel SET aktif = 0;");
        Assert.False((await KimlikService.BenAsync(kisi)).Kayitli);      // ayrılan kişi rol almaz
    }

    [SqlFact]
    public async Task Pasif_istisna_rol_vermez()
    {
        await using var t = await KurulmusAsync();
        var (hesap, kisi) = await t.KisiAsync();
        await t.ExecAsync($"INSERT INTO gorev.kullanici_yetki_istisna (hesap, yonetici_mi, aktif) VALUES (N'{hesap}', 1, 1), (N'baska', 1, 1);");
        Assert.True((await KimlikService.BenAsync(kisi)).Yonetici);
        await t.ExecAsync($"UPDATE gorev.kullanici_yetki_istisna SET aktif = 0 WHERE hesap = N'{hesap}';");
        Assert.False((await KimlikService.BenAsync(kisi)).Kayitli);
    }

    [SqlFact]
    public async Task Yonetim_yordamlari_yonetici_olmayana_kapali()
    {
        await using var t = await KurulmusAsync();
        var (hesap, kisi) = await t.KisiAsync();
        await t.ExecAsync($"INSERT INTO gorev.kullanici_yetki_istisna (hesap, saha_mi) VALUES (N'{hesap}', 1);");
        foreach (var f in new Func<Task>[]
        {
            () => KadroService.OzetAsync(kisi), () => KadroService.ListeAsync(kisi), () => KadroService.EsitleAsync(kisi),
            () => KadroService.EslestirmeListeAsync(kisi), () => KadroService.EslestirmeKaydetAsync(kisi, "X", "SAHA"),
            () => KadroService.IstisnaListeAsync(kisi), () => KadroService.IstisnaKaydetAsync(kisi, "x", null, true, false, false, true, null),
            () => KadroService.IstisnaSilAsync(kisi, "x"),
        })
        {
            var ex = await Assert.ThrowsAsync<GorevException>(f);
            Assert.Equal("yetki", ex.Code);
        }
        Assert.Equal(0, Convert.ToInt32(await t.SkalerAsync("SELECT COUNT(*) FROM gorev.rol_bolum_eslestirme")));
    }

    [SqlFact]
    public async Task Son_aktif_yonetici_kaldirilamaz_ikinci_varsa_kaldirilabilir()
    {
        await using var t = await KurulmusAsync();
        await t.ExecAsync("INSERT INTO gorev.kullanici_yetki_istisna (hesap, yonetici_mi) VALUES (N'A', 1);");
        Assert.Equal(50020, await t.HataNoAsync("DELETE FROM gorev.kullanici_yetki_istisna WHERE hesap = N'A';"));
        Assert.Equal(50020, await t.HataNoAsync("UPDATE gorev.kullanici_yetki_istisna SET yonetici_mi = 0 WHERE hesap = N'A';"));
        Assert.Equal(50020, await t.HataNoAsync("UPDATE gorev.kullanici_yetki_istisna SET aktif = 0 WHERE hesap = N'A';"));
        Assert.Equal(1, Convert.ToInt32(await t.SkalerAsync("SELECT COUNT(*) FROM gorev.kullanici_yetki_istisna WHERE yonetici_mi = 1 AND aktif = 1")));

        await t.ExecAsync("INSERT INTO gorev.kullanici_yetki_istisna (hesap, yonetici_mi) VALUES (N'B', 1);");
        await t.ExecAsync("DELETE FROM gorev.kullanici_yetki_istisna WHERE hesap = N'A';");          // ikinci yönetici var: serbest
        Assert.Equal(50020, await t.HataNoAsync("DELETE FROM gorev.kullanici_yetki_istisna WHERE hesap = N'B';"));
        await t.ExecAsync("UPDATE gorev.kullanici_yetki_istisna SET aciklama = N'x' WHERE hesap = N'B';");   // yönetici kalan satır güncellenebilir
    }

    [SqlFact]
    public async Task Yonetici_yordamla_istisna_ve_eslestirme_yonetir_son_yoneticiyi_silemez()
    {
        await using var t = await KurulmusAsync();
        var (hesap, yon) = await t.KisiAsync();
        await t.ExecAsync($"INSERT INTO gorev.kullanici_yetki_istisna (hesap, yonetici_mi) VALUES (N'{hesap}', 1);");

        await KadroService.IstisnaKaydetAsync(yon, "ALAN\\yeni", null, false, true, false, true, "deneme");
        var l = (System.Collections.IEnumerable)await KadroService.IstisnaListeAsync(yon);
        Assert.Equal(2, l.Cast<object>().Count());

        var ex = await Assert.ThrowsAsync<GorevException>(() => KadroService.IstisnaSilAsync(yon, hesap));   // son yönetici
        Assert.Equal("dogrulama", ex.Code);
        ex = await Assert.ThrowsAsync<GorevException>(() => KadroService.IstisnaKaydetAsync(yon, hesap, null, false, true, false, true, null));
        Assert.Equal("dogrulama", ex.Code);
        await KadroService.IstisnaSilAsync(yon, "ALAN\\yeni");

        await KadroService.EslestirmeKaydetAsync(yon, "Bölüm X", "SORUMLU");
        await KadroService.EslestirmeKaydetAsync(yon, "Bölüm X", "SAHA");                                   // güncelleme
        Assert.Equal("SAHA", await t.SkalerAsync("SELECT rol FROM gorev.rol_bolum_eslestirme WHERE bolum = N'Bölüm X'"));
        ex = await Assert.ThrowsAsync<GorevException>(() => KadroService.EslestirmeKaydetAsync(yon, "Bölüm X", "YONETICI"));
        Assert.Equal("dogrulama", ex.Code);                                                                  // yönetici bölümden gelmez
        await KadroService.EslestirmeKaydetAsync(yon, "Bölüm X", "");                                       // boş: kaldır
        Assert.Equal(0, Convert.ToInt32(await t.SkalerAsync("SELECT COUNT(*) FROM gorev.rol_bolum_eslestirme")));
        Assert.True(Convert.ToInt32(await t.SkalerAsync("SELECT COUNT(*) FROM gorev.islem_log WHERE islem IN (N'ISTISNA', N'ISTISNA_SIL', N'ESLESTIRME')")) >= 5);
    }

    [SqlFact]
    public async Task Ilk_yonetici_betigi_bir_kez_calisir()
    {
        await using var t = await KurulmusAsync();
        var betik = TestDb.BetikOku("gorev_ilk_yonetici.sql");
        await t.ExecAsync(betik);                                                                  // @hesap boş: bağlanan hesap (sa)
        Assert.Equal(1, Convert.ToInt32(await t.SkalerAsync("SELECT COUNT(*) FROM gorev.kullanici_yetki_istisna WHERE hesap = N'sa' AND yonetici_mi = 1 AND aktif = 1")));
        Assert.Equal(50025, await t.HataNoAsync(betik));                                           // zaten yönetici var
    }

    [SqlFact]
    public async Task Ilk_yonetici_betigi_sema_yokken_anlamli_hata_verir()
    {
        await using var t = await TestDb.OlusturAsync();
        Assert.Equal(50011, await t.HataNoAsync(TestDb.BetikOku("gorev_ilk_yonetici.sql")));
    }

    // ---- Kadro eşitleme (Özlük taklidi: dbo.personeller + dbo.sp_ben; kullanıcı yalnızca SELECT/EXECUTE yetkili, sysadmin değil) ----

    private static async Task<(TestDb T, SqlService Yon)> EsitlemeHazirAsync()
    {
        var t = await KurulmusAsync();
        await t.DboTaklitKurAsync();
        await t.OzlukKadroTaklitKurAsync();
        await t.OzlukBenTaklitAsync("yonetici");
        var (hesap, yon) = await t.KisiAsync(ozlukRolu: true);
        await t.ExecAsync($"INSERT INTO gorev.kullanici_yetki_istisna (hesap, yonetici_mi) VALUES (N'{hesap}', 1);");
        return (t, yon);
    }

    private static async Task<int> Say(object o, string ad) => Convert.ToInt32(o.GetType().GetProperty(ad)!.GetValue(o));

    [SqlFact]
    public async Task Kadro_esitleme_ekler_gunceller_pasife_alir_hicbir_seyi_silmez()
    {
        var (t, yon) = await EsitlemeHazirAsync();
        await using var _ = t;
        await t.ExecAsync(@"INSERT INTO dbo.personeller (sicil_no, adi_soyadi, bolum, kullanici_adi) VALUES
            (N'1', N'Ayşe Örnek', N'A', N'ayse'), (N'2', N'Ali Örnek', N'B', NULL), (N'3', N'Işık Örnek', N'A', N'isik');");
        var once = await t.DboIzAsync();
        var dboSatir = await t.SkalerAsync("SELECT COUNT(*) FROM dbo.personeller");

        var r = await KadroService.EsitleAsync(yon);
        Assert.Equal(3, await Say(r, "eklenen"));
        Assert.Equal(3, Convert.ToInt32(await t.SkalerAsync("SELECT COUNT(*) FROM gorev.personel WHERE aktif = 1")));

        // Özlük'te: biri yeniden adlandı, biri eklendi, biri kayboldu
        await t.ExecAsync(@"UPDATE dbo.personeller SET adi_soyadi = N'Ali Yeni' WHERE sicil_no = N'2';
            DELETE FROM dbo.personeller WHERE sicil_no = N'3';
            INSERT INTO dbo.personeller (sicil_no, adi_soyadi, bolum, kullanici_adi) VALUES (N'4', N'Veli Örnek', N'B', N'veli');");
        dboSatir = await t.SkalerAsync("SELECT COUNT(*) FROM dbo.personeller");
        r = await KadroService.EsitleAsync(yon);
        Assert.Equal(1, await Say(r, "eklenen"));
        Assert.Equal(1, await Say(r, "guncellenen"));
        Assert.Equal(1, await Say(r, "pasifeAlinan"));
        Assert.Equal(4, Convert.ToInt32(await t.SkalerAsync("SELECT COUNT(*) FROM gorev.personel")));     // hiçbir şey silinmedi
        Assert.Equal(0, Convert.ToInt32(await t.SkalerAsync("SELECT CAST(aktif AS int) FROM gorev.personel WHERE sicil_no = N'3'")));
        Assert.Equal("Ali Yeni", await t.SkalerAsync("SELECT adi_soyadi FROM gorev.personel WHERE sicil_no = N'2'"));
        Assert.Equal(dboSatir, await t.SkalerAsync("SELECT COUNT(*) FROM dbo.personeller"));              // dbo'ya yazılmadı
        Assert.Equal(1, Convert.ToInt32(await t.SkalerAsync("SELECT COUNT(*) FROM gorev.islem_log WHERE islem = N'KADRO_ESITLE' AND ayrinti LIKE N'%\"pasife_alinan\":1%'")));
        Assert.Equal(await t.DboIzAsync(), await t.DboIzAsync());
        _ = once;
    }

    [SqlFact]
    public async Task Ayrilis_tarihi_gecmisse_pasif_gelecekteyse_aktif()
    {
        var (t, yon) = await EsitlemeHazirAsync();
        await using var _ = t;
        await t.ExecAsync(@"INSERT INTO dbo.personeller (sicil_no, adi_soyadi, ayrilis_tarihi) VALUES
            (N'1', N'Geçmiş', '2000-01-01'), (N'2', N'Gelecek', '2999-01-01'), (N'3', N'Çalışan', NULL);");
        await KadroService.EsitleAsync(yon);
        Assert.Equal(0, Convert.ToInt32(await t.SkalerAsync("SELECT CAST(aktif AS int) FROM gorev.personel WHERE sicil_no = N'1'")));
        Assert.Equal(1, Convert.ToInt32(await t.SkalerAsync("SELECT CAST(aktif AS int) FROM gorev.personel WHERE sicil_no = N'2'")));
        Assert.Equal(1, Convert.ToInt32(await t.SkalerAsync("SELECT CAST(aktif AS int) FROM gorev.personel WHERE sicil_no = N'3'")));
    }

    [SqlFact]
    public async Task Guvenlik_kapisi_eksik_okumada_eslemeyi_iptal_eder()
    {
        var (t, yon) = await EsitlemeHazirAsync();
        await using var _ = t;
        await t.ExecAsync("INSERT INTO dbo.personeller (sicil_no, adi_soyadi) VALUES (N'1', N'A'), (N'2', N'B'), (N'3', N'C'), (N'4', N'D');");
        await KadroService.EsitleAsync(yon);
        await t.ExecAsync("DELETE FROM dbo.personeller WHERE sicil_no <> N'1';");                  // dar kapsam benzetimi: 1 / 4 satır
        var ex = await Assert.ThrowsAsync<GorevException>(() => KadroService.EsitleAsync(yon));
        Assert.Equal("dogrulama", ex.Code);
        Assert.Equal(4, Convert.ToInt32(await t.SkalerAsync("SELECT COUNT(*) FROM gorev.personel WHERE aktif = 1")));   // kimse pasife alınmadı
        await t.ExecAsync("DELETE FROM dbo.personeller;");
        ex = await Assert.ThrowsAsync<GorevException>(() => KadroService.EsitleAsync(yon));                              // hiç satır
        Assert.Equal("dogrulama", ex.Code);
    }

    [SqlFact]
    public async Task Ozlukte_yonetici_ya_da_tum_kapsam_yoksa_esitleme_reddedilir()
    {
        var (t, yon) = await EsitlemeHazirAsync();
        await using var _ = t;
        await t.ExecAsync("INSERT INTO dbo.personeller (sicil_no, adi_soyadi) VALUES (N'1', N'A');");
        await t.OzlukBenTaklitAsync("personel", olustur: false);
        var ex = await Assert.ThrowsAsync<GorevException>(() => KadroService.EsitleAsync(yon));
        Assert.Equal("yetki", ex.Code);
        await t.OzlukBenTaklitAsync("yonetici", olustur: false);
        await KadroService.EsitleAsync(yon);
    }

    [SqlFact]
    public async Task Gorev_yoneticisi_olmayan_esitleme_yapamaz()
    {
        var (t, _) = await EsitlemeHazirAsync();
        await using var _t = t;
        var (_, sade) = await t.KisiAsync(ozlukRolu: true);
        await t.ExecAsync("INSERT INTO dbo.personeller (sicil_no, adi_soyadi) VALUES (N'1', N'A');");
        var ex = await Assert.ThrowsAsync<GorevException>(() => KadroService.EsitleAsync(sade));
        Assert.Equal("yetki", ex.Code);
        Assert.Equal(0, Convert.ToInt32(await t.SkalerAsync("SELECT COUNT(*) FROM gorev.personel")));
    }
}
