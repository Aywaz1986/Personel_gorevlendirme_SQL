using Gorevlendirme;
using Xunit;

namespace Gorevlendirme.Tests;

/// <summary>Ortak bağlantı dosyası ve yüzen pencere konumu (SQL gerektirmez).</summary>
public class BaglantiYapilandirmaTests : IDisposable
{
    private readonly string _k = Path.Combine(Path.GetTempPath(), "gorev_bgl_" + Guid.NewGuid().ToString("N"));
    public BaglantiYapilandirmaTests() => Directory.CreateDirectory(_k);
    public void Dispose() { try { Directory.Delete(_k, true); } catch { /* temizlik */ } }
    private string Yol(string ad) => Path.Combine(_k, ad);

    [Fact]
    public void Yaz_oku_gidis_donus_ve_parola_tutulmaz()
    {
        var y = Yol("a.json");
        SharedConnection.Write(y, " SUNUCU,1433 ", " SST_Ozluk ", true, false);
        var c = SharedConnection.Read(y)!;
        Assert.Equal("SUNUCU,1433", c.Server); Assert.Equal("SST_Ozluk", c.Database);
        Assert.True(c.WindowsAuth); Assert.Equal("", c.User); Assert.Equal("", c.Password);
        Assert.DoesNotContain("assword", File.ReadAllText(y));
        Assert.False(File.Exists(y + ".tmp"));
    }

    [Theory]
    [InlineData("", "db")] [InlineData("s", " ")] [InlineData("s\n", "db")] [InlineData("s", "d\tb")]
    public void Gecersiz_ad_reddedilir(string s, string d)
    {
        Assert.NotNull(SharedConnection.Dogrula(s, d));
        Assert.Throws<ArgumentException>(() => SharedConnection.Write(Yol("b.json"), s, d, true, false));
        Assert.False(File.Exists(Yol("b.json")));
    }

    [Fact]
    public void Uzun_ad_reddedilir()
    {
        Assert.NotNull(SharedConnection.Dogrula(new string('x', 201), "db"));
        Assert.NotNull(SharedConnection.Dogrula("s", new string('x', 129)));
        Assert.Null(SharedConnection.Dogrula(new string('x', 200), new string('y', 128)));
    }

    [Fact]
    public void Bozuk_dosya_null_doner()
    {
        File.WriteAllText(Yol("c.json"), "{ bozuk");
        Assert.Null(SharedConnection.Read(Yol("c.json")));
        Assert.Null(SharedConnection.Read(Yol("yok.json")));
    }

    [Fact]
    public void Kaynak_once_kendi_dosya_sonra_Ozluk()
    {
        var kendi = Yol("g.json"); var oz = Yol("o.json");
        Assert.Null(SharedConnection.LoadKaynakli(kendi, oz).Bilgi);
        SharedConnection.Write(oz, "OZ", "SST_Ozluk", true, false);
        var r = SharedConnection.LoadKaynakli(kendi, oz);
        Assert.Equal("ozluk", r.Kaynak); Assert.Equal("OZ", r.Bilgi!.Server);
        SharedConnection.Write(kendi, "GOREV", "SST_Ozluk", true, true);
        r = SharedConnection.LoadKaynakli(kendi, oz);
        Assert.Equal("ortak", r.Kaynak); Assert.Equal("GOREV", r.Bilgi!.Server); Assert.True(r.Bilgi.Trust);
    }

    [Fact]
    public void Sil_dosyayi_kaldirir()
    {
        var y = Yol("d.json");
        Assert.False(SharedConnection.Delete(y));
        SharedConnection.Write(y, "s", "d", true, false);
        Assert.True(SharedConnection.Delete(y));
        Assert.Null(SharedConnection.Read(y));
    }

    [Fact]
    public void Pencere_konumu_yaz_oku_sil_ve_sinir()
    {
        var y = Yol("p.json");
        Assert.Null(PencereKonumu.Read(y));
        PencereKonumu.Write(y, new PencereKonumu.Konum(40, 60, 300, 200));
        Assert.Equal(new PencereKonumu.Konum(40, 60, 300, 200), PencereKonumu.Read(y));
        Assert.Throws<ArgumentException>(() => PencereKonumu.Write(y, new PencereKonumu.Konum(999999, 0, 0, 0)));
        Assert.True(PencereKonumu.Delete(y));
        Assert.Null(PencereKonumu.Read(y));
    }
}
