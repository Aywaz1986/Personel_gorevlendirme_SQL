using System.Text.Json;
using Xunit;

namespace Gorevlendirme.Tests;

/// <summary>Eski veri aktarım planlayıcısı (Dilim 10): SQL'siz, bellekteki EskiVeri ile.</summary>
public class EskiAktarimTests
{
    private static readonly KadroKisi[] Kadro = { new("100", "ALİ VELİ", true), new("200", "Ayşe Kaya", true) };

    private static EskiVeri Veri()
    {
        var v = new EskiVeri();
        v.Personel.Add(new EskiPersonel(1, "Ali Veli", "0100", true));
        v.Personel.Add(new EskiPersonel(2, "Ayşe Kaya", "", true));
        v.Personel.Add(new EskiPersonel(3, "Zeynep Yok", "999", false));
        v.Projeler.Add(new EskiProje(1, "Ana", "", true, null));
        v.Projeler.Add(new EskiProje(2, "Alt", "", true, 1));
        v.Projeler.Add(new EskiProje(3, "Faaliyet", "Kampüs", true, 2));
        v.Haftalar.Add(new EskiHafta(1, "2026-03-02"));
        v.Atamalar.Add(new EskiAtama(1, 1, 1, "Ali Veli", "{\"pzt\":true,\"sal\":true}", "gorevli", 3, "Faaliyet", "Montaj", "Ayşe Kaya"));
        v.Atamalar.Add(new EskiAtama(2, 1, 1, "Ali Veli", "{\"sal\":true,\"car\":true}", "izinli", null, "", "", ""));
        v.Atamalar.Add(new EskiAtama(3, 1, 2, "Ayşe Kaya", "{\"cmt\":true,\"paz\":true}", "raporlu", null, "", "", ""));
        v.Atamalar.Add(new EskiAtama(4, 1, 3, "Zeynep Yok", "{\"pzt\":true}", "gorevli", 1, "Ana", "", "Bilinmeyen Kişi"));
        v.Atamalar.Add(new EskiAtama(5, 99, 1, "Ali Veli", "{\"pzt\":true}", "gorevli", 1, "Ana", "Eski", ""));
        v.Atamalar.Add(new EskiAtama(6, 1, 2, "Ayşe Kaya", "{\"per\":true}", "musait", null, "", "", ""));
        v.Atamalar.Add(new EskiAtama(7, 1, 1, "Ali Veli", "bozuk", "gorevli", 1, "Ana", "", ""));
        return v;
    }

    [Fact]
    public void Plan_sayilari_ve_oncelik_dogru()
    {
        var p = EskiAktarim.Planla(Veri(), Kadro);
        Assert.Equal(1, p.Sayilar["talep"]);
        Assert.Equal(2, p.Sayilar["atama"]);
        Assert.Equal(1, p.Sayilar["rapor"]);
        Assert.Equal(2, p.Sayilar["raporGun"]);
        Assert.Equal(1, p.Sayilar["izin"]);            // sal çakıştı (görev kazanır); yalnız çarşamba kalır
        Assert.Equal(2, p.Sayilar["tarihsiz"]);        // eşleşmeyen kişi + haftasız görevli
        Assert.Equal(1, p.Sayilar["tarihsizEslesmeyen"]);
        Assert.Equal(0, p.Sayilar["cakisanAtlanan"]);  // görev günleri çakışmadı; çakışan izin günü izinden düşer
        Assert.Equal(1, p.Sayilar["atlanan"]);         // bozuk gün bilgisi (müsait sayılmaz)
    }

    [Fact]
    public void Json_sql_yordaminin_bekledigi_alanlari_icerir()
    {
        var p = EskiAktarim.Planla(Veri(), Kadro);
        using var d = JsonDocument.Parse(p.Json);
        var g = d.RootElement.GetProperty("gorevler")[0];
        Assert.Equal("100", g.GetProperty("sicil").GetString());
        Assert.Equal("Ana", g.GetProperty("ana").GetString());
        Assert.Equal("Alt", g.GetProperty("alt").GetString());
        Assert.Equal("Faaliyet", g.GetProperty("faaliyet").GetString());
        Assert.Equal("Kampüs", g.GetProperty("konum").GetString());
        Assert.Equal("200", g.GetProperty("sorumluSicil").GetString());
        Assert.Equal(new[] { "2026-03-02", "2026-03-03" }, g.GetProperty("gunler").EnumerateArray().Select(x => x.GetString()).ToArray());
        var iz = d.RootElement.GetProperty("izinler")[0];
        Assert.Equal(new[] { "2026-03-04" }, iz.GetProperty("gunler").EnumerateArray().Select(x => x.GetString()).ToArray());
        var r = d.RootElement.GetProperty("raporlar")[0];
        Assert.Equal("2026-03-07", r.GetProperty("ilk").GetString());
        Assert.Equal("2026-03-08", r.GetProperty("son").GetString());
        var t = d.RootElement.GetProperty("tarihsiz").EnumerateArray().ToList();
        Assert.Contains(t, x => x.GetProperty("personelAdi").GetString() == "Zeynep Yok");
    }

    [Fact]
    public void Ayni_kisi_ayni_gun_iki_gorev_tek_kayit_olur()
    {
        var v = new EskiVeri();
        v.Personel.Add(new EskiPersonel(1, "Ali Veli", "100", true));
        v.Haftalar.Add(new EskiHafta(1, "2026-03-02"));
        v.Atamalar.Add(new EskiAtama(1, 1, 1, "Ali Veli", "{\"pzt\":true}", "gorevli", null, "A", "", ""));
        v.Atamalar.Add(new EskiAtama(2, 1, 1, "Ali Veli", "{\"pzt\":true,\"sal\":true}", "gorevli", null, "B", "", ""));
        var p = EskiAktarim.Planla(v, Kadro);
        Assert.Equal(2, p.Sayilar["talep"]);
        Assert.Equal(2, p.Sayilar["atama"]);            // pzt bir kez, sal bir kez
        Assert.Equal(1, p.Sayilar["cakisanAtlanan"]);
    }
}
