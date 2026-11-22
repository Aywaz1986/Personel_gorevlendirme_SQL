using System.Text;
using Gorevlendirme;
using Xunit;

namespace Gorevlendirme.Tests;

public class EvrakTests
{
    private static byte[] Pdf => Encoding.ASCII.GetBytes("%PDF-1.4\nornek");
    private static byte[] Jpg => new byte[] { 0xFF, 0xD8, 0xFF, 0xE0, 0, 0x10, 0x4A, 0x46 };
    private static byte[] Png => new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0 };

    [Fact]
    public void Gecerli_evrak_turleri_tanınır()
    {
        Assert.Equal("application/pdf", IzinRaporService.EvrakTuru(Pdf, "rapor.PDF"));
        Assert.Equal("image/jpeg", IzinRaporService.EvrakTuru(Jpg, "rapor.jpg"));
        Assert.Equal("image/jpeg", IzinRaporService.EvrakTuru(Jpg, "rapor.jpeg"));
        Assert.Equal("image/png", IzinRaporService.EvrakTuru(Png, "rapor.png"));
    }

    [Theory]
    [InlineData("rapor.exe")]
    [InlineData("rapor.txt")]
    [InlineData("rapor")]
    public void Desteklenmeyen_uzanti_reddedilir(string ad)
    {
        var e = Assert.Throws<GorevException>(() => IzinRaporService.EvrakTuru(Pdf, ad));
        Assert.Equal("dogrulama", e.Code);
    }

    [Fact]
    public void Icerik_uzantiyla_uyusmuyorsa_ya_bos_ya_buyukse_reddedilir()
    {
        Assert.Equal("dogrulama", Assert.Throws<GorevException>(() => IzinRaporService.EvrakTuru(Encoding.ASCII.GetBytes("MZ-calistirilabilir"), "rapor.pdf")).Code);
        Assert.Equal("dogrulama", Assert.Throws<GorevException>(() => IzinRaporService.EvrakTuru(Jpg, "rapor.png")).Code);
        Assert.Equal("dogrulama", Assert.Throws<GorevException>(() => IzinRaporService.EvrakTuru(Array.Empty<byte>(), "rapor.pdf")).Code);
        var buyuk = new byte[IzinRaporService.EvrakEnFazlaBayt + 1]; Pdf.CopyTo(buyuk, 0);
        Assert.Equal("dogrulama", Assert.Throws<GorevException>(() => IzinRaporService.EvrakTuru(buyuk, "rapor.pdf")).Code);
        var sinirda = new byte[IzinRaporService.EvrakEnFazlaBayt]; Pdf.CopyTo(sinirda, 0);
        Assert.Equal("application/pdf", IzinRaporService.EvrakTuru(sinirda, "rapor.pdf"));
    }
}
