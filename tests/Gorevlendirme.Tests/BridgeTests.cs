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
        HavuzTakvimCommands.Register(r);
        EskiVeriCommands.Register(r);
        TalepCommands.Register(r);
        AtamaCommands.Register(r);
        MatrisCommands.Register(r);
        IzinRaporCommands.Register(r);
        RevizeCommands.Register(r);
        AnalizCommands.Register(r);
        CanliCommands.Register(r);
        SenaryoCommands.Register(r);
        foreach (var k in new[] { "ping", "runtime", "baglantiDene", "baglan", "baglantiKapat", "baglantiBilgi", "varsayilanBaglantiYaz", "varsayilanBaglantiSil", "varsayilanBaglantiDurum", "pencereKonumYaz", "surumDurum", "semaDurum", "semaUygula", "sunucuDenetimi",
                                  "ben", "kadroOzet", "kadroListe", "kadroEsitle", "eslestirmeListe", "eslestirmeKaydet", "istisnaListe", "istisnaKaydet", "istisnaSil",
                                  "havuzListe", "havuzEkle", "havuzAdlandir", "havuzDurum", "havuzArsiv", "havuzBirlestir", "takvimListe", "takvimOzet", "takvimKaydet", "takvimSil",
                                  "takvimMetinOku", "takvimXlsxOku", "takvimOnizle", "takvimUygula", "eskiVeriDenetle",
                                  "personelAra", "talepListe", "talepGetir", "talepKaydet", "talepGeriCek",
                                  "atamaAdaylar", "atamaCakismaKontrol", "atamaOnayla", "talepReddet", "bildirimListe", "bildirimOkundu",
                                  "matrisHafta", "matrisSurum", "matrisBolumler", "matrisExcel",
                                  "izinKaydet", "izinOnayla", "izinReddet", "izinGeriCek", "izinKisalt", "izinListe", "raporEvrakSec", "raporKaydet", "raporIptal", "raporListe", "raporEvrakKaydet", "gorevlerim",
                                  "talepIptal", "talepErkenBitir", "atamaCikar", "atamaIkame", "sorumluDevret", "sorumluDevirListe", "revizeIste", "revizeOnayla", "revizeReddet", "revizeGeriCek", "revizeListe",
                                  "analizAnaProjeler", "analizProje", "analizPersonel", "analizPersonelDetay", "arsivGecmis", "analizExcel",
                                  "canliKontrol", "canliyaGec", "eskiAktarDurum", "eskiAktar", "eskiAktarGeriAl", "talepIletisim", "sayaclar", "ikameBekleyenler", "rolPersonel", "logListe", "logIslemTurleri", "raporDuzelt", "analizKirilim", "revizeFazlalik", "revizeMusaitlik" })
            Assert.NotNull(r.Find(k));
        foreach (var k in new[] { "ben", "kadroListe", "kadroEsitle", "istisnaKaydet", "havuzEkle", "takvimUygula", "eskiVeriDenetle", "talepKaydet", "talepGeriCek", "atamaOnayla", "talepReddet", "matrisHafta", "matrisExcel", "izinKaydet", "izinOnayla", "raporKaydet", "gorevlerim", "talepIptal", "atamaIkame", "revizeIste", "analizProje", "analizExcel", "canliyaGec", "eskiAktar", "varsayilanBaglantiYaz", "varsayilanBaglantiSil", "varsayilanBaglantiDurum", "pencereKonumYaz" })
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
