using System.Text.RegularExpressions;
using Gorevlendirme;
using Xunit;

namespace Gorevlendirme.Tests;

public class MigratorTests
{
    [Fact]
    public void Betikler_gomulu_ve_numarali_sirali()
    {
        var s = Migrator.Scripts();
        Assert.NotEmpty(s);
        Assert.Equal(s.Select(x => x.Surum).OrderBy(x => x), s.Select(x => x.Surum));
        Assert.Equal(1, s[0].Surum);
    }

    [Fact]
    public void Her_betik_GO_ile_bloklara_ayrilir_ve_bos_blok_yoktur()
    {
        foreach (var sc in Migrator.Scripts())
        {
            var bloklar = Migrator.Split(sc.Metin).ToList();
            Assert.NotEmpty(bloklar);
            Assert.All(bloklar, b => Assert.False(string.IsNullOrWhiteSpace(b)));
            Assert.DoesNotContain(bloklar, b => b.Trim().Equals("GO", StringComparison.OrdinalIgnoreCase));
        }
    }

    [Fact]
    public void Betikler_yalnizca_gorev_nesnelerini_olusturur()
    {
        // dbo koruma denetiminin (CI) yanında ikinci kilit: hiçbir CREATE/ALTER/DROP hedefi dbo olamaz.
        foreach (var sc in Migrator.Scripts())
            Assert.DoesNotMatch(new Regex(@"\b(CREATE|ALTER|DROP|TRUNCATE)\s+(OR\s+ALTER\s+)?(TABLE|VIEW|PROCEDURE|PROC|FUNCTION|TRIGGER|INDEX\s+\w+\s+ON)\s+\[?dbo\]?\.", RegexOptions.IgnoreCase), sc.Metin);
    }

    [Fact]
    public void Ilk_betik_cekirdek_tablolari_ve_ortami_kurar()
    {
        var m = Migrator.Scripts()[0].Metin;
        Assert.Contains("CREATE TABLE gorev.sistem_ayarlari", m);
        Assert.Contains("CREATE TABLE gorev.islem_log", m);
        Assert.Matches(@"N'ORTAM',\s+N'TEST'", m);
        Assert.Contains("MIN_UYGULAMA_SURUMU", m);
        Assert.Contains("WITH EXECUTE AS OWNER", m);
    }

    [Fact]
    public void Gunluk_kullaniciyi_sunucudan_yazar_istemciden_almaz()
    {
        var m = Migrator.Scripts()[0].Metin;
        Assert.Contains("DEFAULT ORIGINAL_LOGIN()", m);
        Assert.Contains("INSTEAD OF UPDATE, DELETE", m);
    }

    [Fact]
    public void Kurulum_sql_si_dbo_ya_dokunmaz()
    {
        foreach (var s in new[] { Migrator.KullaniciSql, Migrator.SemaSql, Migrator.SurumTablosuSql })
            Assert.DoesNotContain("dbo.", s, StringComparison.OrdinalIgnoreCase);
    }
}
