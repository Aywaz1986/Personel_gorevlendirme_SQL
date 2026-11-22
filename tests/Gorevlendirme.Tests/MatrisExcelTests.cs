using System.IO.Compression;
using Gorevlendirme;
using Xunit;

namespace Gorevlendirme.Tests;

public class MatrisExcelTests
{
    private const string Hucre = "[{\"tarih\":\"2026-11-23\",\"zaman\":\"TAM\",\"kod\":\"TLP-0001\",\"ana\":\"Toroman\",\"faaliyet\":\"AY Kabul\"}," +
                                 "{\"tarih\":\"2026-11-25\",\"zaman\":\"OO\",\"kod\":\"TLP-0002\",\"ana\":\"Kayıt\",\"faaliyet\":\"Masa\"}," +
                                 "{\"tarih\":\"2026-11-25\",\"zaman\":\"OS\",\"kod\":\"TLP-0003\",\"ana\":\"Toroman\",\"faaliyet\":\"Sökme\"}," +
                                 "{\"tarih\":\"2026-12-30\",\"zaman\":\"TAM\",\"kod\":\"X\",\"ana\":\"A\",\"faaliyet\":\"B\"}]";

    [Fact]
    public void Tablo_baslik_gun_sutunlari_ve_dilim_metinleri()
    {
        var t = MatrisExcel.Tablo(new DateTime(2026, 11, 23), new[] { ("1002", "Ahmet Sümbül", "Teknik", (string?)Hucre), ("1006", "Ali Örnek", "Teknik", (string?)null) });
        Assert.Equal(3, t.Count);
        Assert.Equal(new[] { "Sicil", "Personel", "Bölüm", "Pzt 23.11.2026", "Sal 24.11.2026", "Çar 25.11.2026", "Per 26.11.2026", "Cum 27.11.2026", "Cmt 28.11.2026", "Paz 29.11.2026" }, t[0].ToArray());
        Assert.Equal("Tam gün: Toroman › AY Kabul (TLP-0001)", t[1][3]);
        Assert.Equal("ÖÖ: Kayıt › Masa (TLP-0002)\nÖS: Toroman › Sökme (TLP-0003)", t[1][5]);
        Assert.Equal("", t[1][4]);                                      // boş gün
        Assert.DoesNotContain("TLP-X", string.Join("|", t[1]));         // hafta dışı hücre alınmaz
        Assert.All(t[2].Skip(3), x => Assert.Equal("", x));
    }

    [Fact]
    public void Xlsx_gecerli_paket_uretir_ve_ozel_karakterleri_kacirir()
    {
        var bytes = MatrisExcel.Xlsx(new List<List<string>> { new() { "A", "B" }, new() { "x<y & \"z\"", "ÖÖ\nÖS" } });
        using var z = new ZipArchive(new MemoryStream(bytes), ZipArchiveMode.Read);
        Assert.NotNull(z.GetEntry("xl/workbook.xml")); Assert.NotNull(z.GetEntry("[Content_Types].xml")); Assert.NotNull(z.GetEntry("xl/styles.xml"));
        using var r = new StreamReader(z.GetEntry("xl/worksheets/sheet1.xml")!.Open());
        var xml = r.ReadToEnd();
        Assert.Contains("x&lt;y &amp; &quot;z&quot;", xml);
        Assert.Contains("r=\"B2\"", xml);
        System.Xml.Linq.XDocument.Parse(xml);                           // iyi biçimli XML
    }
}

public class MatrisExcelIzinTests
{
    [Fact]
    public void Izin_ve_rapor_gun_hucresine_eklenir()
    {
        var izin = "[{\"tarih\":\"2026-11-24\",\"zaman\":\"TAM\",\"tur\":\"IZIN\",\"durum\":\"ONAYLI\",\"kod\":\"IZN-0001\"},{\"tarih\":\"2026-11-25\",\"zaman\":\"OO\",\"tur\":\"IZIN\",\"durum\":\"BEKLIYOR\",\"kod\":\"IZN-0002\"},{\"tarih\":\"2026-11-26\",\"zaman\":\"TAM\",\"tur\":\"RAPOR\",\"durum\":\"ONAYLI\",\"kod\":\"RPR-0001\"}]";
        var t = MatrisExcel.Tablo(new DateTime(2026, 11, 23), new[] { ("1", "A", "B", (string?)null, (string?)izin) });
        Assert.Equal("Tam gün: İzin (IZN-0001)", t[1][4]);
        Assert.Equal("ÖÖ: İzin (onay bekliyor) (IZN-0002)", t[1][5]);
        Assert.Equal("Tam gün: Rapor (RPR-0001)", t[1][6]);
    }
}
