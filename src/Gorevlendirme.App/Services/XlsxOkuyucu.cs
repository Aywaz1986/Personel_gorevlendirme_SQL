using System.Globalization;
using System.IO.Compression;
using System.Xml;
using System.Xml.Linq;

namespace Gorevlendirme;

/// <summary>Paketsiz .xlsx okuyucu (ZipArchive + XML): ilk çalışma sayfasının hücrelerini metin olarak verir. Tarih biçimli sayılar yyyy-MM-dd olur.</summary>
public static class XlsxOkuyucu
{
    private static readonly XNamespace Ns = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
    private static readonly XNamespace Rel = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
    private static readonly XNamespace PkgRel = "http://schemas.openxmlformats.org/package/2006/relationships";
    private const long EnFazlaGirdi = 50L * 1024 * 1024;
    private const int EnFazlaSatir = 20000;

    private static XDocument? Yukle(ZipArchive z, string ad)
    {
        var e = z.GetEntry(ad);
        if (e == null) return null;
        if (e.Length > EnFazlaGirdi) throw new GorevException("dogrulama", "Excel dosyası çok büyük.");
        using var s = e.Open();
        using var xr = XmlReader.Create(s, new XmlReaderSettings { DtdProcessing = DtdProcessing.Prohibit, XmlResolver = null });
        return XDocument.Load(xr);
    }

    public static List<string[]> Oku(byte[] veri)
    {
        try
        {
            using var z = new ZipArchive(new MemoryStream(veri), ZipArchiveMode.Read);
            var sayfaYolu = ilkSayfaYolu(z);
            var sayfa = Yukle(z, sayfaYolu) ?? throw new GorevException("dogrulama", "Excel çalışma sayfası okunamadı.");
            var ortak = OrtakMetinler(Yukle(z, "xl/sharedStrings.xml"));
            var tarihStilleri = TarihStilleri(Yukle(z, "xl/styles.xml"));
            var satirlar = new List<string[]>();
            foreach (var row in sayfa.Descendants(Ns + "row"))
            {
                if (satirlar.Count >= EnFazlaSatir) throw new GorevException("dogrulama", $"En fazla {EnFazlaSatir} satır okunur.");
                var hucreler = new SortedDictionary<int, string>();
                var sonSutun = -1;
                foreach (var c in row.Elements(Ns + "c"))
                {
                    var sutun = SutunNo((string?)c.Attribute("r"), sonSutun + 1);
                    sonSutun = sutun;
                    hucreler[sutun] = HucreMetni(c, ortak, tarihStilleri);
                }
                var dizi = new string[hucreler.Count == 0 ? 0 : hucreler.Keys.Max() + 1];
                Array.Fill(dizi, "");
                foreach (var (k, v) in hucreler) dizi[k] = v;
                satirlar.Add(dizi);
            }
            return satirlar;
        }
        catch (InvalidDataException) { throw new GorevException("dogrulama", "Dosya geçerli bir .xlsx değil."); }
        catch (XmlException) { throw new GorevException("dogrulama", "Excel dosyasının içeriği okunamadı."); }

        static string ilkSayfaYolu(ZipArchive z)
        {
            var wb = Yukle(z, "xl/workbook.xml");
            var rels = Yukle(z, "xl/_rels/workbook.xml.rels");
            var rid = wb?.Descendants(Ns + "sheet").FirstOrDefault()?.Attribute(Rel + "id")?.Value;
            var hedef = rid == null ? null : rels?.Descendants(PkgRel + "Relationship").FirstOrDefault(r => (string?)r.Attribute("Id") == rid)?.Attribute("Target")?.Value;
            if (hedef == null) return "xl/worksheets/sheet1.xml";
            hedef = hedef.TrimStart('/');
            return hedef.StartsWith("xl/", StringComparison.Ordinal) ? hedef : "xl/" + hedef;
        }
    }

    private static List<string> OrtakMetinler(XDocument? d) =>
        d == null ? new List<string>() : d.Descendants(Ns + "si").Select(si => string.Concat(si.Descendants(Ns + "t").Where(t => t.Parent?.Name != Ns + "rPh").Select(t => t.Value))).ToList();

    private static HashSet<int> TarihStilleri(XDocument? d)
    {
        var sonuc = new HashSet<int>();
        if (d == null) return sonuc;
        var ozel = d.Descendants(Ns + "numFmt").ToDictionary(n => (int?)n.Attribute("numFmtId") ?? -1, n => (string?)n.Attribute("formatCode") ?? "");
        var xfs = d.Descendants(Ns + "cellXfs").FirstOrDefault()?.Elements(Ns + "xf").ToList() ?? new List<XElement>();
        for (var i = 0; i < xfs.Count; i++)
        {
            var id = (int?)xfs[i].Attribute("numFmtId") ?? 0;
            var yerlesik = id is (>= 14 and <= 22) or (>= 27 and <= 36) or (>= 45 and <= 47) or (>= 50 and <= 58);
            var tarihMi = yerlesik || (ozel.TryGetValue(id, out var kod) && KodTarihMi(kod));
            if (tarihMi) sonuc.Add(i);
        }
        return sonuc;
    }

    private static bool KodTarihMi(string kod)
    {
        var temiz = System.Text.RegularExpressions.Regex.Replace(kod, "\"[^\"]*\"|\\[[^\\]]*\\]|\\\\.", "", System.Text.RegularExpressions.RegexOptions.None, TimeSpan.FromSeconds(1));
        return temiz.Contains('y', StringComparison.OrdinalIgnoreCase) || temiz.Contains('d', StringComparison.OrdinalIgnoreCase);
    }

    private static int SutunNo(string? basvuru, int varsayilan)
    {
        if (string.IsNullOrEmpty(basvuru)) return varsayilan;
        var n = 0; var var_ = false;
        foreach (var ch in basvuru)
        {
            if (ch is >= 'A' and <= 'Z') { n = (n * 26) + (ch - 'A' + 1); var_ = true; }
            else if (ch is >= 'a' and <= 'z') { n = (n * 26) + (ch - 'a' + 1); var_ = true; }
            else break;
        }
        return var_ ? n - 1 : varsayilan;
    }

    private static string HucreMetni(XElement c, List<string> ortak, HashSet<int> tarihStilleri)
    {
        var t = (string?)c.Attribute("t");
        if (t == "inlineStr") return string.Concat(c.Descendants(Ns + "t").Select(x => x.Value));
        var v = c.Element(Ns + "v")?.Value ?? "";
        if (t == "s") return int.TryParse(v, NumberStyles.Integer, CultureInfo.InvariantCulture, out var i) && i >= 0 && i < ortak.Count ? ortak[i] : "";
        if (t == "str" || t == "b" || t == "e") return v;
        var stil = (int?)c.Attribute("s") ?? 0;
        if (tarihStilleri.Contains(stil) && double.TryParse(v, NumberStyles.Float, CultureInfo.InvariantCulture, out var gun) && gun is > 0 and < 2958466)
            return new DateTime(1899, 12, 30).AddDays(Math.Floor(gun)).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
        return v;
    }
}
