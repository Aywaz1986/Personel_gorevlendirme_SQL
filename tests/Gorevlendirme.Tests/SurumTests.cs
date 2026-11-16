using Gorevlendirme;
using Xunit;

namespace Gorevlendirme.Tests;

public class SurumTests
{
    [Fact]
    public void Sema_yoksa_semaYok_ve_engel_degil()
    {
        var s = Surum.Denetle("0.1.5", "0.0.0", null, 1);
        Assert.Equal("semaYok", s.Durum);
        Assert.False(s.Engelle);
    }

    [Fact]
    public void Uygulama_asgariden_eskiyse_engellenir()
    {
        var s = Surum.Denetle("0.1.5", "0.1.9", 1, 1);
        Assert.Equal("uygulamaEski", s.Durum);
        Assert.True(s.Engelle);
    }

    [Fact]
    public void Asgari_sadece_surumun_kendisiyse_gecer()
    {
        Assert.Equal("tamam", Surum.Denetle("0.1.9", "0.1.9", 1, 1).Durum);
        Assert.Equal("tamam", Surum.Denetle("0.1.10", "0.1.9", 1, 1).Durum);   // sayısal karşılaştırma (0.1.10 > 0.1.9)
    }

    [Fact]
    public void Sema_exeden_yeniyse_engellenir()
    {
        var s = Surum.Denetle("0.1.5", null, 3, 2);
        Assert.Equal("semaYeni", s.Durum);
        Assert.True(s.Engelle);
    }

    [Fact]
    public void Sema_exeden_eskiyse_uyarir_engellemez()
    {
        var s = Surum.Denetle("0.1.5", null, 1, 2);
        Assert.Equal("semaEski", s.Durum);
        Assert.False(s.Engelle);
    }

    [Fact]
    public void Cozumlenemeyen_surum_sifir_sayilir()
    {
        Assert.Equal(0, Surum.Karsilastir("abc", "0.0.0"));
        Assert.True(Surum.Karsilastir("1.0", "0.9.9") > 0);
    }
}
