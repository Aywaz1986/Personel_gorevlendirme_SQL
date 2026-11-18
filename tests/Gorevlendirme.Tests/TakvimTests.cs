using System.IO.Compression;
using System.Text;
using Gorevlendirme;
using Xunit;

namespace Gorevlendirme.Tests;

public class TakvimCozumleyiciTests
{
    private static List<TakvimSatir> Metin(string m) => TakvimCozumleyici.Cozumle(TakvimCozumleyici.MetinSatirlari(m));

    [Fact]
    public void Basliksiz_noktalivirgul_siralama_tarih_ad_zaman_tur()
    {
        var l = Metin("29.10.2026; Cumhuriyet Bayramı\n28.10.2026; Arife; ÖS; Resmi\n");
        Assert.Equal(2, l.Count);
        Assert.Equal(new TakvimSatir(1, "2026-10-29", "TAM", "RESMI", "Cumhuriyet Bayramı"), l[0]);
        Assert.Equal(new TakvimSatir(2, "2026-10-28", "OS", "RESMI", "Arife"), l[1]);
    }

    [Fact]
    public void Basliklu_excel_yapistirma_sekme_ayracli_sutunlari_adindan_bulur()
    {
        var l = Metin("Tür\tTarih\tZaman dilimi\tAçıklama\nAkademik\t2026-12-01\tÖğleden önce\tSenato günü\n");
        Assert.Single(l);
        Assert.Equal(new TakvimSatir(2, "2026-12-01", "OO", "AKADEMIK", "Senato günü"), l[0]);
    }

    [Theory]
    [InlineData("TAM", "TAM")] [InlineData("Tüm gün", "TAM")] [InlineData("", "TAM")] [InlineData("ÖÖ", "OO")] [InlineData("öö", "OO")] [InlineData("Öğleden Sonra", "OS")] [InlineData("os", "OS")] [InlineData("bilinmez", "bilinmez")]
    public void Zaman_dilimi_turkce_karsiliklari_kodlara_cevrilir(string girdi, string beklenen) => Assert.Equal(beklenen, TakvimCozumleyici.ZamanCevir(girdi));

    [Theory]
    [InlineData("Resmi", "RESMI")] [InlineData("RESMİ TATİL", "RESMI")] [InlineData("resmi", "RESMI")] [InlineData("Akademik", "AKADEMIK")] [InlineData("İdari", "IDARI")] [InlineData("idari izin", "IDARI")] [InlineData("", "RESMI")] [InlineData("Diger", "Diger")]
    public void Tur_turkce_karsiliklari_kodlara_cevrilir(string girdi, string beklenen) => Assert.Equal(beklenen, TakvimCozumleyici.TurCevir(girdi));

    [Theory]
    [InlineData("29.10.2026", "2026-10-29")] [InlineData("9.5.2026", "2026-05-09")] [InlineData("2026-05-09", "2026-05-09")] [InlineData("09/05/2026", "2026-05-09")] [InlineData("29.10.2026 00:00", "2026-10-29")] [InlineData("bozuk", "bozuk")]
    public void Tarih_bicimleri_isoya_cevrilir_okunamayan_ham_kalir(string girdi, string beklenen) => Assert.Equal(beklenen, TakvimCozumleyici.TarihCevir(girdi));

    [Fact]
    public void Tirnakli_hucre_ayrac_ve_bos_satirlar_dogru_islenir()
    {
        var s = TakvimCozumleyici.MetinSatirlari("﻿Tarih,Ad\r\n2026-01-01,\"Yılbaşı, resmi \"\"tatil\"\"\"\r\n\r\n");
        Assert.Equal(2, s.Count);
        Assert.Equal("Yılbaşı, resmi \"tatil\"", s[1][1]);
        Assert.Empty(TakvimCozumleyici.MetinSatirlari("  \n "));
    }

    [Fact]
    public void Bos_ve_basliksiz_tek_sutun_satirlari_hataya_birakilir_cokmez()
    {
        var l = Metin("sadece-metin\n");
        Assert.Single(l);
        Assert.Equal("sadece-metin", l[0].Tarih);   // sunucu "Tarih okunamadı" der
        Assert.Empty(Metin(""));
    }
}

public class XlsxOkuyucuTests
{
    private static byte[] Xlsx(string sayfa, string? ortak = null, string? stiller = null)
    {
        using var ms = new MemoryStream();
        using (var z = new ZipArchive(ms, ZipArchiveMode.Create, true))
        {
            void Yaz(string ad, string icerik) { var e = z.CreateEntry(ad); using var w = new StreamWriter(e.Open(), new UTF8Encoding(false)); w.Write(icerik); }
            Yaz("xl/workbook.xml", "<workbook xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\" xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\"><sheets><sheet name=\"S\" sheetId=\"1\" r:id=\"rId1\"/></sheets></workbook>");
            Yaz("xl/_rels/workbook.xml.rels", "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\"><Relationship Id=\"rId1\" Target=\"worksheets/sheet1.xml\"/></Relationships>");
            Yaz("xl/worksheets/sheet1.xml", "<worksheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\"><sheetData>" + sayfa + "</sheetData></worksheet>");
            if (ortak != null) Yaz("xl/sharedStrings.xml", "<sst xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\">" + ortak + "</sst>");
            if (stiller != null) Yaz("xl/styles.xml", "<styleSheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\">" + stiller + "</styleSheet>");
        }
        return ms.ToArray();
    }

    [Fact]
    public void Ortak_metin_satirici_metin_ve_tarih_serisi_okunur_bosluklar_korunur()
    {
        var stil = "<numFmts count=\"1\"><numFmt numFmtId=\"164\" formatCode=\"dd\\.mm\\.yyyy\"/></numFmts><cellXfs count=\"3\"><xf numFmtId=\"0\"/><xf numFmtId=\"14\"/><xf numFmtId=\"164\"/></cellXfs>";
        var sayfa = "<row r=\"1\"><c r=\"A1\" t=\"s\"><v>0</v></c><c r=\"B1\" t=\"s\"><v>1</v></c><c r=\"D1\" t=\"inlineStr\"><is><t>Tür</t></is></c></row>"
                  + "<row r=\"2\"><c r=\"A2\" s=\"1\"><v>46324</v></c><c r=\"B2\" t=\"s\"><v>2</v></c><c r=\"C2\" t=\"str\"><v>ÖS</v></c></row>"
                  + "<row r=\"3\"><c r=\"A3\" s=\"2\"><v>46328</v></c><c r=\"B3\"><v>12</v></c></row>";
        var ortak = "<si><t>Tarih</t></si><si><t>Ad</t></si><si><r><t>Cumhuriyet </t></r><r><t>Bayramı</t></r></si>";
        var s = XlsxOkuyucu.Oku(Xlsx(sayfa, ortak, stil));
        Assert.Equal(3, s.Count);
        Assert.Equal(new[] { "Tarih", "Ad", "", "Tür" }, s[0]);
        Assert.Equal("2026-10-29", s[1][0]);                    // 46324 = 29.10.2026 (yerleşik tarih biçimi 14)
        Assert.Equal("Cumhuriyet Bayramı", s[1][1]);
        Assert.Equal("ÖS", s[1][2]);
        Assert.Equal("2026-11-02", s[2][0]);                    // özel tarih biçimi
        Assert.Equal("12", s[2][1]);                            // tarih biçimsiz sayı sayı kalır
    }

    [Fact]
    public void Xlsxten_satirlar_takvim_cozumleyiciye_uyar()
    {
        var stil = "<cellXfs count=\"2\"><xf numFmtId=\"0\"/><xf numFmtId=\"14\"/></cellXfs>";
        var sayfa = "<row r=\"1\"><c r=\"A1\" t=\"inlineStr\"><is><t>Tarih</t></is></c><c r=\"B1\" t=\"inlineStr\"><is><t>Ad</t></is></c></row>"
                  + "<row r=\"2\"><c r=\"A2\" s=\"1\"><v>46324</v></c><c r=\"B2\" t=\"inlineStr\"><is><t>Bayram</t></is></c></row>";
        var l = TakvimCozumleyici.Cozumle(XlsxOkuyucu.Oku(Xlsx(sayfa, null, stil)));
        Assert.Equal(new TakvimSatir(2, "2026-10-29", "TAM", "RESMI", "Bayram"), Assert.Single(l));
    }

    [Fact]
    public void Gecersiz_dosya_anlamli_hata_verir()
    {
        var ex = Assert.Throws<GorevException>(() => XlsxOkuyucu.Oku(Encoding.UTF8.GetBytes("bu bir zip değil")));
        Assert.Equal("dogrulama", ex.Code);
    }
}
