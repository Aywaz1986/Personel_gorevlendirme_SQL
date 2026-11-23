using System.IO.Compression;
using Gorevlendirme;
using Xunit;

namespace Gorevlendirme.Tests;

public class AnalizTabloTests
{
    private static Dictionary<string, object?> Satir(params (string, object?)[] a) => a.ToDictionary(x => x.Item1, x => x.Item2);

    [Fact]
    public void Proje_tablosu_baslik_ve_sayi_bicimi()
    {
        var t = AnalizService.ProjeTablo(new[] { Satir(("ana", "Toroman"), ("alt", "Genel"), ("faaliyet", "AY Kabul"), ("adam_gun", 2.5m), ("kisi", 2), ("gun", 3), ("talep", 1), ("ilk", "2026-11-23"), ("son", "2026-11-25")) });
        Assert.Equal(2, t.Count);
        Assert.Equal("Adam-gün", t[0][3]);
        Assert.Equal(new[] { "Toroman", "Genel", "AY Kabul", "2.5", "2", "3", "1", "2026-11-23", "2026-11-25" }, t[1]);
    }

    [Fact]
    public void Personel_tablosu_izin_sutunlari_yalniz_yonetici_icin_gelir()
    {
        var r = Satir(("sicil_no", "1002"), ("adi_soyadi", "Ahmet Sümbül"), ("bolum", "Teknik"), ("adam_gun", 1.5m), ("gun", 2), ("proje", 1), ("izin_gun", 1.0m), ("rapor_gun", 3),
            ("projeler_json", "[{\"ana\":\"Toroman\",\"adam_gun\":1.5}]"));
        var y = AnalizService.PersonelTablo(new[] { r }, true);
        Assert.Equal(12, y[0].Count);
        Assert.Equal("Toroman (1.5)", y[1][11]);
        Assert.Contains("Müsait gün", y[0]);
        Assert.Contains("Tatilde çalışma (gün)", y[0]);
        Assert.Equal("3", y[1][7]);
        var s = AnalizService.PersonelTablo(new[] { r }, false);
        Assert.Equal(9, s[0].Count);
        Assert.DoesNotContain("Müsait gün", s[0]);
        Assert.DoesNotContain("İzin (gün)", s[0]);
    }

    [Fact]
    public void Xlsx_sayi_sutunlari_sayisal_hucre_olarak_yazilir()
    {
        var t = AnalizService.ProjeTablo(new[] { Satir(("ana", "A"), ("alt", "B"), ("faaliyet", "C"), ("adam_gun", 2.5m), ("kisi", 2), ("gun", 3), ("talep", 1), ("ilk", "x"), ("son", "y")) });
        var bayt = MatrisExcel.Xlsx(t, "Proje adam-gün", 0, AnalizService.ProjeSayiSutunlari);
        using var z = new ZipArchive(new MemoryStream(bayt));
        using var oku = new StreamReader(z.GetEntry("xl/worksheets/sheet1.xml")!.Open());
        var xml = oku.ReadToEnd();
        Assert.Contains("<c r=\"D2\" s=\"2\"><v>2.5</v></c>", xml);
        Assert.Contains("<c r=\"A2\" t=\"inlineStr\"", xml);
        Assert.DoesNotContain("xSplit", xml);                                    // sütun dondurma yok
        Assert.Contains("ySplit=\"1\"", xml);
    }
}
