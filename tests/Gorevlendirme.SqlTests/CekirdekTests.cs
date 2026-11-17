using Gorevlendirme;
using Microsoft.Data.SqlClient;
using Xunit;

namespace Gorevlendirme.SqlTests;

public class CekirdekTests
{
    [SqlFact]
    public async Task Temiz_kurulum_sema_sahip_ve_ayarlari_olusturur()
    {
        await using var t = await TestDb.OlusturAsync();
        var r = await t.Migrator.UygulaAsync(false);
        Assert.NotNull(r);

        Assert.Equal("gorev_sahip", await t.SkalerAsync(
            "SELECT p.name FROM sys.schemas s JOIN sys.database_principals p ON p.principal_id = s.principal_id WHERE s.name = N'gorev'"));
        Assert.Equal(TestDb.Hedef, Convert.ToInt32(await t.SkalerAsync("SELECT COUNT(*) FROM gorev.sema_surumleri")));
        Assert.Equal("TEST", await t.SkalerAsync("SELECT deger FROM gorev.sistem_ayarlari WHERE anahtar = N'ORTAM'"));
        Assert.Equal("0.0.0", await t.SkalerAsync("SELECT deger FROM gorev.sistem_ayarlari WHERE anahtar = N'MIN_UYGULAMA_SURUMU'"));
        Assert.Equal(1, Convert.ToInt32(await t.SkalerAsync("SELECT COUNT(*) FROM sys.database_principals WHERE name = N'gorev_kullanici' AND type = 'R'")));
        Assert.Equal(TestDb.Hedef, Convert.ToInt32(await t.SkalerAsync("SELECT COUNT(*) FROM gorev.islem_log WHERE islem = N'SEMA'")));
    }

    [SqlFact]
    public async Task Ikinci_calistirma_hicbir_sey_uygulamaz()
    {
        await using var t = await TestDb.OlusturAsync();
        await t.Migrator.UygulaAsync(false);
        var d = await t.Migrator.DurumAsync();
        Assert.Empty((System.Collections.IEnumerable)d.GetType().GetProperty("bekleyen")!.GetValue(d)!);
        await t.Migrator.UygulaAsync(false);
        Assert.Equal(TestDb.Hedef, Convert.ToInt32(await t.SkalerAsync("SELECT COUNT(*) FROM gorev.sema_surumleri")));
        Assert.Equal(TestDb.Hedef, Convert.ToInt32(await t.SkalerAsync("SELECT COUNT(*) FROM gorev.islem_log WHERE islem = N'SEMA'")));
    }

    [SqlFact]
    public async Task Baska_sahipli_gorev_semasi_varsa_kurulum_durur()
    {
        await using var t = await TestDb.OlusturAsync();
        await t.ExecAsync("EXEC('CREATE SCHEMA gorev AUTHORIZATION dbo')");
        var ex = await Assert.ThrowsAsync<GorevException>(() => t.Migrator.UygulaAsync(false));
        Assert.Contains("sahibi", ex.Message);
        Assert.Equal(0, Convert.ToInt32(await t.SkalerAsync("SELECT COUNT(*) FROM sys.tables WHERE schema_id = SCHEMA_ID(N'gorev')")));
    }

    [SqlFact]
    public async Task Islem_log_degistirilemez()
    {
        await using var t = await TestDb.OlusturAsync();
        await t.Migrator.UygulaAsync(false);
        await t.ExecAsync("INSERT INTO gorev.islem_log (islem) VALUES (N'DENEME')");
        Assert.Equal(50010, await t.HataNoAsync("UPDATE gorev.islem_log SET islem = N'X'"));
        Assert.Equal(50010, await t.HataNoAsync("DELETE FROM gorev.islem_log"));
        Assert.Equal("sa", await t.SkalerAsync("SELECT TOP 1 kullanici FROM gorev.islem_log WHERE islem = N'DENEME'"));   // sunucu yazar
    }

    [SqlFact]
    public async Task Ortam_yalnizca_TEST_veya_CANLI_olabilir()
    {
        await using var t = await TestDb.OlusturAsync();
        await t.Migrator.UygulaAsync(false);
        Assert.Equal(547, await t.HataNoAsync("UPDATE gorev.sistem_ayarlari SET deger = N'BELIRSIZ' WHERE anahtar = N'ORTAM'"));
        await t.ExecAsync("UPDATE gorev.sistem_ayarlari SET deger = N'CANLI' WHERE anahtar = N'ORTAM'");
    }

    [SqlFact]
    public async Task Sivri_kullanici_tabloyu_goremez_yordami_cagirabilir()
    {
        await using var t = await TestDb.OlusturAsync();
        await t.Migrator.UygulaAsync(false);
        await t.ExecAsync("CREATE USER gorev_test_kisi WITHOUT LOGIN; ALTER ROLE gorev_kullanici ADD MEMBER gorev_test_kisi;");

        // Yordam çalışır (EXECUTE AS OWNER ile tabloları sahip okur)
        await using (var cn = await t.AcAsync())
        {
            await using var cmd = new SqlCommand("EXECUTE AS USER = N'gorev_test_kisi'; EXEC gorev.sp_surum_bilgi; REVERT;", cn);
            await using var r = await cmd.ExecuteReaderAsync();
            Assert.True(await r.ReadAsync());
            Assert.Equal(TestDb.Hedef, r.GetInt32(r.GetOrdinal("sema_surumu")));
            Assert.Equal("TEST", r.GetString(r.GetOrdinal("ortam")));
            Assert.Equal("sa", r.GetString(r.GetOrdinal("hesap")));   // ORIGINAL_LOGIN() gerçek bağlantı hesabı
        }

        // Tablolara doğrudan erişim reddedilir (229 = izin reddedildi)
        foreach (var sorgu in new[]
        {
            "SELECT * FROM gorev.islem_log",
            "SELECT * FROM gorev.sistem_ayarlari",
            "INSERT INTO gorev.islem_log (islem) VALUES (N'X')",
            "UPDATE gorev.sistem_ayarlari SET deger = N'CANLI' WHERE anahtar = N'ORTAM'",
            "DELETE FROM gorev.sema_surumleri",
        })
            Assert.Equal(229, await t.HataNoAsync($"EXECUTE AS USER = N'gorev_test_kisi'; {sorgu}; REVERT;"));
    }

    [SqlFact]
    public async Task Authenticated_Users_varsa_role_uye_olur()
    {
        await using var t = await TestDb.OlusturAsync();
        try { await t.ExecAsync("CREATE USER [NT AUTHORITY\\Authenticated Users] WITHOUT LOGIN"); }
        catch (SqlException) { return; }   // bu sunucu bu adı kabul etmiyorsa (Linux) bu sınama atlanır
        await t.Migrator.UygulaAsync(false);
        Assert.Equal(1, Convert.ToInt32(await t.SkalerAsync("SELECT IS_ROLEMEMBER(N'gorev_kullanici', N'NT AUTHORITY\\Authenticated Users')")));
    }

    [SqlFact]
    public async Task Surum_kapisi_sunucu_bilgisiyle_calisir()
    {
        await using var t = await TestDb.OlusturAsync();
        Assert.Null(await SurumBilgisi.OkuAsync(t.Servis));   // şema yokken: null (semaYok)
        await t.Migrator.UygulaAsync(false);
        var b = await SurumBilgisi.OkuAsync(t.Servis);
        Assert.NotNull(b);
        Assert.Equal(TestDb.Hedef, b!.SemaSurumu);
        Assert.Equal("TEST", b.Ortam);
        Assert.Equal(30, b.PollingSaniye);
    }

    [SqlFact]
    public async Task Sunucu_denetimi_temiz_kurulumda_hata_vermez()
    {
        await using var t = await TestDb.OlusturAsync();
        await t.Migrator.UygulaAsync(false);
        var o = await SunucuDenetimi.CalistirAsync(t.Servis);
        var ozet = o.GetType().GetProperty("ozet")!.GetValue(o)!;
        Assert.Equal(0, (int)ozet.GetType().GetProperty("hata")!.GetValue(ozet)!);
    }
}
