using System.Text.Json;
using Gorevlendirme;
using Xunit;

namespace Gorevlendirme.Tests;

public class BridgeTests
{
    [Fact]
    public void Ayni_komut_iki_kez_kaydedilemez()
    {
        var r = new CommandRegistry();
        r.Register("a", (s, a) => Task.FromResult<object?>(null));
        Assert.Throws<InvalidOperationException>(() => r.Register("a", (s, a) => Task.FromResult<object?>(null)));
    }

    [Fact]
    public void Kapi_bayragi_saklanir_bilinmeyen_komut_bulunmaz()
    {
        var r = new CommandRegistry();
        r.Register("a", (s, a) => Task.FromResult<object?>(null), kapiGerekli: true);
        r.Register("b", (s, a) => Task.FromResult<object?>(null));
        Assert.True(r.Find("a")!.KapiGerekli);
        Assert.False(r.Find("b")!.KapiGerekli);
        Assert.Null(r.Find("yok"));
    }

    [Fact]
    public void Arayuzun_kullandigi_komutlar_kayitlidir()
    {
        var r = new CommandRegistry();
        SystemCommands.Register(r);
        BaglantiCommands.Register(r);
        SemaCommands.Register(r);
        KimlikCommands.Register(r);
        foreach (var k in new[] { "ping", "runtime", "baglantiDene", "baglan", "baglantiKapat", "surumDurum", "semaDurum", "semaUygula", "sunucuDenetimi",
                                  "ben", "kadroOzet", "kadroListe", "kadroEsitle", "eslestirmeListe", "eslestirmeKaydet", "istisnaListe", "istisnaKaydet", "istisnaSil" })
            Assert.NotNull(r.Find(k));
        foreach (var k in new[] { "ben", "kadroListe", "kadroEsitle", "istisnaKaydet" })
            Assert.True(r.Find(k)!.KapiGerekli);   // iş komutları sürüm kapısına tabidir
    }

    [Fact]
    public void Args_eksik_veya_yanlis_turde_varsayilani_dondurur()
    {
        using var d = JsonDocument.Parse("{\"s\":\"x\",\"i\":5,\"b\":true,\"yanlis\":1}");
        var a = d.RootElement;
        Assert.Equal("x", Args.S(a, "s"));
        Assert.Equal("", Args.S(a, "yanlis"));
        Assert.Equal(5, Args.I(a, "i"));
        Assert.Equal(7, Args.I(a, "s", 7));
        Assert.True(Args.B(a, "b"));
        Assert.False(Args.B(a, "yok"));
    }
}
