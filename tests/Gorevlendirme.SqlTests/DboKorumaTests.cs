using Gorevlendirme;
using Xunit;

namespace Gorevlendirme.SqlTests;

/// <summary>KESİN KURAL kanıtı: kurulum, sıfırlama ve kaldırma dbo nesnelerine, verisine ve yetkilerine dokunmaz.</summary>
public class DboKorumaTests
{
    [SqlFact]
    public async Task Kurulum_sifirla_kaldir_dbo_yu_degistirmez()
    {
        await using var t = await TestDb.OlusturAsync();
        await t.DboTaklitKurAsync();
        var once = await t.DboIzAsync();

        await t.Migrator.UygulaAsync(false);
        Assert.Equal(once, await t.DboIzAsync());

        await t.ExecAsync("INSERT INTO gorev.islem_log (islem) VALUES (N'X')");
        await t.ExecAsync(TestDb.Onayli(TestDb.BetikOku("gorev_sifirla.sql"), "SIFIRLA"));
        Assert.Equal(once, await t.DboIzAsync());

        await t.ExecAsync(TestDb.Onayli(TestDb.BetikOku("gorev_kaldir.sql"), "KALDIR"));
        Assert.Equal(once, await t.DboIzAsync());
    }

    [SqlFact]
    public async Task Kaldir_yalnizca_gorev_nesnelerini_kaldirir()
    {
        await using var t = await TestDb.OlusturAsync();
        await t.DboTaklitKurAsync();
        await t.Migrator.UygulaAsync(false);
        await t.ExecAsync(TestDb.Onayli(TestDb.BetikOku("gorev_kaldir.sql"), "KALDIR"));

        Assert.Null(await t.SkalerAsync("SELECT SCHEMA_ID(N'gorev')"));
        Assert.Null(await t.SkalerAsync("SELECT DATABASE_PRINCIPAL_ID(N'gorev_sahip')"));
        Assert.Null(await t.SkalerAsync("SELECT DATABASE_PRINCIPAL_ID(N'gorev_kullanici')"));
        // Özlük taklidi dokunulmadan kalır
        Assert.Equal(3, Convert.ToInt32(await t.SkalerAsync("SELECT COUNT(*) FROM dbo.ozluk_taklit")));
        Assert.NotNull(await t.SkalerAsync("SELECT DATABASE_PRINCIPAL_ID(N'ozluk_taklit_rol')"));
    }

    [SqlFact]
    public async Task Kaldirdan_sonra_temiz_kurulum_tekrar_calisir()
    {
        await using var t = await TestDb.OlusturAsync();
        await t.Migrator.UygulaAsync(false);
        await t.ExecAsync(TestDb.Onayli(TestDb.BetikOku("gorev_kaldir.sql"), "KALDIR"));
        await t.Migrator.UygulaAsync(false);
        Assert.Equal(TestDb.Hedef, Convert.ToInt32(await t.SkalerAsync("SELECT COUNT(*) FROM gorev.sema_surumleri")));
    }
}
