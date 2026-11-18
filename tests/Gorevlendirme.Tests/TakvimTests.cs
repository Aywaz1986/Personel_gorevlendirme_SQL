using System.IO.Compression;
using System.Text;
using Gorevlendirme;
using Xunit;

namespace Gorevlendirme.Tests;

public class TakvimCozumleyiciTests
{
    private static List<TakvimSatir> Metin(string m, int? yil = null) => TakvimCozumleyici.Oku(TakvimCozumleyici.MetinSatirlari(m), yil).Satirlar;
    private static List<TakvimSatir> Satirlar(int? yil, params string[] satirlar) => TakvimCozumleyici.Oku(satirlar.Select(x => new[] { x }).ToList(), yil).Satirlar;

    [Fact]
    public void Basliksiz_noktalivirgul_siralama_tarih_ad_zaman_tur()
    {
        var l = Metin("29.10.2026; Cumhuriyet Bayramı\n28.10.2026; Arife; ÖS; Resmi\n");
        Assert.Equal(2, l.Count);
        Assert.Equal(new TakvimSatir(1, "2026-10-29", "", "TAM", "RESMI", "Cumhuriyet Bayramı", false), l[0]);
        Assert.Equal(new TakvimSatir(2, "2026-10-28", "", "OS", "RESMI", "Arife", false), l[1]);
    }

    [Fact]
    public void Basliksiz_baslangic_bitis_ad_tur_zaman_yillik_siralamasi()
    {
        var l = Metin("10.04.2024; 12.04.2024; Ramazan Bayramı; Resmi; Tüm gün; Evet\n08.04.2024;; İdari izin; İdari; ; yıllık izinden kesilir\n");
        Assert.Equal(new TakvimSatir(1, "2024-04-10", "2024-04-12", "TAM", "RESMI", "Ramazan Bayramı", true), l[0]);
        Assert.Equal(new TakvimSatir(2, "2024-04-08", "", "TAM", "IDARI", "İdari izin", true), l[1]);
    }

    [Fact]
    public void Basliklu_excel_yapistirma_sekme_ayracli_sutunlari_adindan_bulur()
    {
        var l = Metin("Tür\tBaşlangıç\tBitiş\tZaman dilimi\tAçıklama\tYıllık izinden kesilir\nİdari\t2026-12-01\t\tÖğleden önce\tSenato günü\thayır\nResmi\t2026-04-13\t2026-04-15\t\tBayram\tevet\n");
        Assert.Equal(2, l.Count);
        Assert.Equal(new TakvimSatir(2, "2026-12-01", "", "OO", "IDARI", "Senato günü", false), l[0]);
        Assert.Equal(new TakvimSatir(3, "2026-04-13", "2026-04-15", "TAM", "RESMI", "Bayram", true), l[1]);
    }

    [Theory]
    [InlineData("TAM", "TAM")] [InlineData("Tüm gün", "TAM")] [InlineData("", "TAM")] [InlineData("ÖÖ", "OO")] [InlineData("öö", "OO")] [InlineData("Öğleden Sonra", "OS")] [InlineData("os", "OS")] [InlineData("Yarım gün", "OS")] [InlineData("bilinmez", "bilinmez")]
    public void Zaman_dilimi_turkce_karsiliklari_kodlara_cevrilir(string girdi, string beklenen) => Assert.Equal(beklenen, TakvimCozumleyici.ZamanCevir(girdi));

    [Theory]
    [InlineData("Resmi", "RESMI")] [InlineData("RESMİ TATİL", "RESMI")] [InlineData("resmi", "RESMI")] [InlineData("Akademik", "Akademik")] [InlineData("İdari", "IDARI")] [InlineData("idari izin", "IDARI")] [InlineData("Kurumsal", "IDARI")] [InlineData("", "RESMI")] [InlineData("Diger", "Diger")]
    public void Tur_turkce_karsiliklari_kodlara_cevrilir_akademik_artik_tanimsiz(string girdi, string beklenen) => Assert.Equal(beklenen, TakvimCozumleyici.TurCevir(girdi));

    [Theory]
    [InlineData("29.10.2026", "2026-10-29")] [InlineData("9.5.2026", "2026-05-09")] [InlineData("2026-05-09", "2026-05-09")] [InlineData("09/05/2026", "2026-05-09")] [InlineData("29.10.2026 00:00", "2026-10-29")] [InlineData("bozuk", "bozuk")]
    public void Tarih_bicimleri_isoya_cevrilir_okunamayan_ham_kalir(string girdi, string beklenen) => Assert.Equal(beklenen, TakvimCozumleyici.TarihCevir(girdi));

    [Theory]
    [InlineData("evet", true)] [InlineData("E", true)] [InlineData("1", true)] [InlineData("x", true)] [InlineData("YILLIK İZİNDEN KESİLECEK", true)] [InlineData("hayır", false)] [InlineData("", false)] [InlineData("0", false)]
    public void Yillik_isareti_okunur(string girdi, bool beklenen) => Assert.Equal(beklenen, TakvimCozumleyici.EvetMi(girdi));

    [Fact]
    public void Tirnakli_hucre_ayrac_ve_bos_satirlar_dogru_islenir()
    {
        var s = TakvimCozumleyici.MetinSatirlari("\uFEFFTarih,Ad\r\n2026-01-01,\"Yılbaşı, resmi \"\"tatil\"\"\"\r\n\r\n");
        Assert.Equal(3, s.Count);                       // boş satır da korunur (satır numaraları dosyayla tutsun); Oku onu atlar
        Assert.Equal("Yılbaşı, resmi \"tatil\"", s[1][1]);
        Assert.Single(TakvimCozumleyici.Oku(s).Satirlar);
        Assert.Empty(TakvimCozumleyici.MetinSatirlari("  \n "));
    }

    [Fact]
    public void Bos_ve_basliksiz_tek_sutun_satirlari_hataya_birakilir_cokmez()
    {
        var l = Metin("sadece-metin\n");
        Assert.Single(l);
        Assert.Equal("sadece-metin", l[0].Baslangic);   // sunucu "Başlangıç tarihi okunamadı" der
        Assert.Empty(Metin(""));
    }

    [Fact]
    public void Standart_takvim_satirlari_aralik_tek_gun_yarim_gun_ve_yillik_izin_okunur()
    {
        var o = TakvimCozumleyici.Oku(new List<string[]>
        {
            new[] { "", "", "", "", "2024" },
            new[] { "TAKVİM" },
            new[] { "08 NİSAN Pazartesi / 1 Gün (YILLIK İZİNDEN KESİLECEK)" },
            new[] { "09 NİSAN Salı", "/ 0,5 Gün Arife" },
            new[] { "10-11-12 NİSAN Çarşamba-Perşembe-Cuma / 3 Gün Ramazan Bayramı" },
            new[] { "20-21 MAYIS Pazartesi-Salı / 2 Gün Örnek" },
            new[] { "05-09-10 TEMMUZ Cuma-Salı-Çarşamba / 3 Gün Ayrık" },
            new[] { "29 EKİM Salı / 1 Gün Kurumsal tatil" },
            new[] { "30 ŞUBAT Cuma / 1 Gün Bozuk gün" },
        });
        Assert.Equal("STANDART", o.Mod);
        Assert.Equal(2024, o.Yil);
        var l = o.Satirlar;
        Assert.Equal(new TakvimSatir(3, "2024-04-08", "", "TAM", "IDARI", "İdari izin", true), l[0]);
        Assert.Equal(new TakvimSatir(4, "2024-04-09", "", "OS", "RESMI", "Arife", false), l[1]);
        Assert.Equal(new TakvimSatir(5, "2024-04-10", "2024-04-12", "TAM", "RESMI", "Ramazan Bayramı", false), l[2]);
        Assert.Equal(new TakvimSatir(6, "2024-05-20", "2024-05-21", "TAM", "RESMI", "Örnek", false), l[3]);
        Assert.Equal(new TakvimSatir(7, "2024-07-05", "", "TAM", "RESMI", "Ayrık", false), l[4]);   // ardışık olmayan günler ayrı kayıt
        Assert.Equal(new TakvimSatir(7, "2024-07-09", "2024-07-10", "TAM", "RESMI", "Ayrık", false), l[5]);
        Assert.Equal("IDARI", l[6].Tur);
        Assert.Equal("Kurumsal tatil", l[6].Ad);
        Assert.Equal("30 ŞUBAT Cuma / 1 Gün Bozuk gün", l[7].Baslangic);                              // geçersiz gün: ham metin, sunucu hata verir
        Assert.Equal(8, l.Count);
    }

    [Fact]
    public void Standart_modda_yil_dosyadan_yoksa_parametreden_ikisi_de_yoksa_hata()
    {
        Assert.Equal("2025-05-01", Satirlar(2025, "01 MAYIS Perşembe / 1 Gün Emek ve Dayanışma Günü")[0].Baslangic);
        Assert.Equal(2024, TakvimCozumleyici.Oku(new List<string[]> { new[] { "2024" }, new[] { "01 MAYIS Çarşamba / 1 Gün Emek" } }, 2030).Yil);   // dosyadaki yıl önceliklidir
        var ex = Assert.Throws<GorevException>(() => Satirlar(null, "01 MAYIS Çarşamba / 1 Gün Emek"));
        Assert.Equal("dogrulama", ex.Code);
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
        var l = TakvimCozumleyici.Oku(XlsxOkuyucu.Oku(Xlsx(sayfa, null, stil))).Satirlar;
        Assert.Equal(new TakvimSatir(2, "2026-10-29", "", "TAM", "RESMI", "Bayram", false), Assert.Single(l));
    }

    [Fact]
    public void Xlsxten_standart_takvim_sayfasi_yil_hucresiyle_okunur()
    {
        var sayfa = "<row r=\"1\"><c r=\"E1\"><v>2024</v></c></row>"
                  + "<row r=\"3\"><c r=\"A3\" t=\"inlineStr\"><is><t>10-11-12 NİSAN Çarşamba-Perşembe-Cuma / 3 Gün Ramazan Bayramı</t></is></c></row>";
        var o = TakvimCozumleyici.Oku(XlsxOkuyucu.Oku(Xlsx(sayfa)));
        Assert.Equal(2024, o.Yil);
        var x = Assert.Single(o.Satirlar);
        Assert.Equal(("2024-04-10", "2024-04-12", "Ramazan Bayramı"), (x.Baslangic, x.Bitis, x.Ad));
    }

    [Fact]
    public void Gecersiz_dosya_anlamli_hata_verir()
    {
        var ex = Assert.Throws<GorevException>(() => XlsxOkuyucu.Oku(Encoding.UTF8.GetBytes("bu bir zip değil")));
        Assert.Equal("dogrulama", ex.Code);
    }
}
