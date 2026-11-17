using Gorevlendirme;
using Xunit;

namespace Gorevlendirme.SqlTests;

public class SifirlaKaldirTests
{
    [SqlFact]
    public async Task Betiklerde_GO_yoktur_tek_gruptur()
    {
        foreach (var ad in new[] { "gorev_sifirla.sql", "gorev_kaldir.sql" })
            Assert.DoesNotMatch(@"(?im)^\s*GO\s*$", TestDb.BetikOku(ad));
        await Task.CompletedTask;
    }

    [SqlFact]
    public async Task Sifirla_onay_olmadan_reddedilir_ve_veri_kalir()
    {
        await using var t = await TestDb.OlusturAsync();
        await t.Migrator.UygulaAsync(false);
        await t.ExecAsync("INSERT INTO gorev.islem_log (islem) VALUES (N'KALMALI')");

        Assert.Equal(50012, await t.HataNoAsync(TestDb.BetikOku("gorev_sifirla.sql")));
        Assert.Equal(50012, await t.HataNoAsync(TestDb.Onayli(TestDb.BetikOku("gorev_sifirla.sql"), "yanlis")));
        Assert.Equal(1, Convert.ToInt32(await t.SkalerAsync("SELECT COUNT(*) FROM gorev.islem_log WHERE islem = N'KALMALI'")));
    }

    [SqlFact]
    public async Task Sifirla_CANLI_ortamda_reddedilir()
    {
        await using var t = await TestDb.OlusturAsync();
        await t.Migrator.UygulaAsync(false);
        await t.ExecAsync("UPDATE gorev.sistem_ayarlari SET deger = N'CANLI' WHERE anahtar = N'ORTAM'");
        await t.ExecAsync("INSERT INTO gorev.islem_log (islem) VALUES (N'KALMALI')");

        Assert.Equal(50013, await t.HataNoAsync(TestDb.Onayli(TestDb.BetikOku("gorev_sifirla.sql"), "SIFIRLA")));
        Assert.Equal(1, Convert.ToInt32(await t.SkalerAsync("SELECT COUNT(*) FROM gorev.islem_log WHERE islem = N'KALMALI'")));
    }

    [SqlFact]
    public async Task Kaldir_CANLI_ortamda_reddedilir_ve_onay_ister()
    {
        await using var t = await TestDb.OlusturAsync();
        await t.Migrator.UygulaAsync(false);
        Assert.Equal(50012, await t.HataNoAsync(TestDb.BetikOku("gorev_kaldir.sql")));
        await t.ExecAsync("UPDATE gorev.sistem_ayarlari SET deger = N'CANLI' WHERE anahtar = N'ORTAM'");
        Assert.Equal(50013, await t.HataNoAsync(TestDb.Onayli(TestDb.BetikOku("gorev_kaldir.sql"), "KALDIR")));
        Assert.NotNull(await t.SkalerAsync("SELECT SCHEMA_ID(N'gorev')"));
    }

    [SqlFact]
    public async Task Sifirla_veriyi_siler_ayarlari_ve_surumleri_korur()
    {
        await using var t = await TestDb.OlusturAsync();
        await t.Migrator.UygulaAsync(false);
        await t.ExecAsync("INSERT INTO gorev.islem_log (islem) VALUES (N'A'), (N'B'), (N'C')");
        await t.ExecAsync("UPDATE gorev.sistem_ayarlari SET deger = N'45' WHERE anahtar = N'POLLING_SANIYE'");

        await t.ExecAsync(TestDb.Onayli(TestDb.BetikOku("gorev_sifirla.sql"), "SIFIRLA"));

        // Günlükte yalnızca sıfırlamanın kendi kaydı kalır
        Assert.Equal(1, Convert.ToInt32(await t.SkalerAsync("SELECT COUNT(*) FROM gorev.islem_log")));
        Assert.Equal("SIFIRLA", await t.SkalerAsync("SELECT islem FROM gorev.islem_log"));
        // Ayarlar ve sürüm kaydı korunur
        Assert.Equal("45", await t.SkalerAsync("SELECT deger FROM gorev.sistem_ayarlari WHERE anahtar = N'POLLING_SANIYE'"));
        Assert.Equal("TEST", await t.SkalerAsync("SELECT deger FROM gorev.sistem_ayarlari WHERE anahtar = N'ORTAM'"));
        Assert.Equal(TestDb.Hedef, Convert.ToInt32(await t.SkalerAsync("SELECT COUNT(*) FROM gorev.sema_surumleri")));
        // Günlük sıfırlamadan sonra yine değiştirilemez (tetikleyici yeniden etkin)
        Assert.Equal(50010, await t.HataNoAsync("DELETE FROM gorev.islem_log"));
    }

    [SqlFact]
    public async Task Sifirla_kadro_kopyasini_siler_yetki_yapilandirmasini_korur()
    {
        await using var t = await TestDb.OlusturAsync();
        await t.Migrator.UygulaAsync(false);
        await t.ExecAsync(@"INSERT INTO gorev.personel (sicil_no, adi_soyadi) VALUES (N'1', N'A');
            INSERT INTO gorev.rol_bolum_eslestirme (bolum, rol) VALUES (N'X', N'SAHA');
            INSERT INTO gorev.kullanici_yetki_istisna (hesap, yonetici_mi) VALUES (N'ALAN\\yon', 1);");
        await t.ExecAsync(TestDb.Onayli(TestDb.BetikOku("gorev_sifirla.sql"), "SIFIRLA"));
        Assert.Equal(0, Convert.ToInt32(await t.SkalerAsync("SELECT COUNT(*) FROM gorev.personel")));
        Assert.Equal(1, Convert.ToInt32(await t.SkalerAsync("SELECT COUNT(*) FROM gorev.rol_bolum_eslestirme")));
        Assert.Equal(1, Convert.ToInt32(await t.SkalerAsync("SELECT COUNT(*) FROM gorev.kullanici_yetki_istisna WHERE yonetici_mi = 1")));
    }

    [SqlFact]
    public async Task Sema_yokken_sifirla_ve_kaldir_anlamli_hata_verir()
    {
        await using var t = await TestDb.OlusturAsync();
        Assert.Equal(50011, await t.HataNoAsync(TestDb.Onayli(TestDb.BetikOku("gorev_sifirla.sql"), "SIFIRLA")));
        Assert.Equal(50011, await t.HataNoAsync(TestDb.Onayli(TestDb.BetikOku("gorev_kaldir.sql"), "KALDIR")));
    }
}
