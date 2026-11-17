using Gorevlendirme;
using Xunit;

namespace Gorevlendirme.Tests;

public class KimlikTests
{
    [Fact]
    public void Gorunum_listesi_oncelik_sirasindadir()
    {
        Assert.Equal(new[] { "YONETICI", "SORUMLU", "SAHA" }, Gorunum.Liste(true, true, true));
        Assert.Equal(new[] { "SORUMLU", "SAHA" }, Gorunum.Liste(false, true, true));
        Assert.Empty(Gorunum.Liste(false, false, false));
    }

    [Fact]
    public void Varsayilan_gorunum_gecerli_tercihi_kullanir_yoksa_en_ustu()
    {
        var l = Gorunum.Liste(true, false, true);
        Assert.Equal("SAHA", Gorunum.Varsayilan(l, "SAHA"));
        Assert.Equal("YONETICI", Gorunum.Varsayilan(l, "SORUMLU"));   // kişide artık yok
        Assert.Equal("YONETICI", Gorunum.Varsayilan(l, null));
        Assert.Null(Gorunum.Varsayilan(Gorunum.Liste(false, false, false), "SAHA"));
    }

    [Theory]
    [InlineData(50020, "dogrulama")] [InlineData(50021, "dogrulama")] [InlineData(50024, "dogrulama")] [InlineData(50025, "dogrulama")]
    [InlineData(50022, "yetki")] [InlineData(50023, "yetki")] [InlineData(229, "yetki")] [InlineData(547, "hata")]
    public void Sunucu_hata_numaralari_arayuz_kodlarina_cevrilir(int numara, string kod) =>
        Assert.Equal(kod, SqlHata.Cevir(numara, "x").Code);
}
