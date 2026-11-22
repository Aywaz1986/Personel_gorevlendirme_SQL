using System.IO.Compression;
using System.Security;
using System.Text;
using System.Text.Json;

namespace Gorevlendirme;

/// <summary>Haftalık matris → .xlsx (paketsiz: ZipArchive + XML, satır içi metin). Sunucuya bağlı değildir; birim testlidir.</summary>
public static class MatrisExcel
{
    private static readonly string[] GunAd = { "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz" };

    /// <summary>Matris satırlarından (sicil, ad, bolum, hucreler_json) çalışma sayfası verisi: başlık + her kişi için bir satır.</summary>
    public static List<List<string>> Tablo(DateTime pazartesi, IEnumerable<(string Sicil, string Ad, string Bolum, string? HucrelerJson)> kisiler) =>
        Tablo(pazartesi, kisiler.Select(k => (k.Sicil, k.Ad, k.Bolum, k.HucrelerJson, (string?)null)));

    /// <summary>İzin ve rapor günleri de (izinler_json) ilgili gün hücresine eklenir.</summary>
    public static List<List<string>> Tablo(DateTime pazartesi, IEnumerable<(string Sicil, string Ad, string Bolum, string? HucrelerJson, string? IzinlerJson)> kisiler)
    {
        var tablo = new List<List<string>>();
        var baslik = new List<string> { "Sicil", "Personel", "Bölüm" };
        for (var i = 0; i < 7; i++) { var d = pazartesi.AddDays(i); baslik.Add(GunAd[i] + " " + d.ToString("dd.MM.yyyy")); }
        tablo.Add(baslik);
        foreach (var k in kisiler)
        {
            var satir = new List<string> { k.Sicil, k.Ad, k.Bolum };
            var gunler = new List<string>[7];
            for (var i = 0; i < 7; i++) gunler[i] = new List<string>();
            if (!string.IsNullOrWhiteSpace(k.HucrelerJson))
            {
                using var doc = JsonDocument.Parse(k.HucrelerJson);
                foreach (var h in doc.RootElement.EnumerateArray())
                {
                    if (!DateTime.TryParseExact(S(h, "tarih"), "yyyy-MM-dd", null, System.Globalization.DateTimeStyles.None, out var t)) continue;
                    var idx = (int)(t.Date - pazartesi.Date).TotalDays;
                    if (idx < 0 || idx > 6) continue;
                    var dilim = S(h, "zaman") switch { "OO" => "ÖÖ", "OS" => "ÖS", _ => "Tam gün" };
                    gunler[idx].Add(dilim + ": " + S(h, "ana") + " › " + S(h, "faaliyet") + " (" + S(h, "kod") + ")");
                }
            }
            if (!string.IsNullOrWhiteSpace(k.IzinlerJson))
            {
                using var doc2 = JsonDocument.Parse(k.IzinlerJson);
                foreach (var h in doc2.RootElement.EnumerateArray())
                {
                    if (!DateTime.TryParseExact(S(h, "tarih"), "yyyy-MM-dd", null, System.Globalization.DateTimeStyles.None, out var t)) continue;
                    var idx = (int)(t.Date - pazartesi.Date).TotalDays;
                    if (idx < 0 || idx > 6) continue;
                    var dilim = S(h, "zaman") switch { "OO" => "ÖÖ", "OS" => "ÖS", _ => "Tam gün" };
                    var ad = S(h, "tur") == "RAPOR" ? "Rapor" : S(h, "durum") == "BEKLIYOR" ? "İzin (onay bekliyor)" : "İzin";
                    gunler[idx].Add(dilim + ": " + ad + " (" + S(h, "kod") + ")");
                }
            }
            for (var i = 0; i < 7; i++) satir.Add(string.Join("\n", gunler[i]));
            tablo.Add(satir);
        }
        return tablo;
    }

    private static string S(JsonElement e, string ad) => e.TryGetProperty(ad, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() ?? "" : "";

    /// <summary>Tabloyu tek sayfalık .xlsx baytlarına çevirir (ilk satır kalın, hücrelerde satır sarma).</summary>
    public static byte[] Xlsx(List<List<string>> tablo, string sayfaAdi = "Haftalık matris", int dondur = 3, ISet<int>? sayiSutunlari = null)
    {
        using var ms = new MemoryStream();
        using (var z = new ZipArchive(ms, ZipArchiveMode.Create, true))
        {
            Yaz(z, "[Content_Types].xml", "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\"><Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/><Default Extension=\"xml\" ContentType=\"application/xml\"/><Override PartName=\"/xl/workbook.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml\"/><Override PartName=\"/xl/worksheets/sheet1.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml\"/><Override PartName=\"/xl/styles.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml\"/></Types>");
            Yaz(z, "_rels/.rels", "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\"><Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument\" Target=\"xl/workbook.xml\"/></Relationships>");
            Yaz(z, "xl/workbook.xml", "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><workbook xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\" xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\"><sheets><sheet name=\"" + Kac(sayfaAdi) + "\" sheetId=\"1\" r:id=\"rId1\"/></sheets></workbook>");
            Yaz(z, "xl/_rels/workbook.xml.rels", "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\"><Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet\" Target=\"worksheets/sheet1.xml\"/><Relationship Id=\"rId2\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles\" Target=\"styles.xml\"/></Relationships>");
            Yaz(z, "xl/styles.xml", "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><styleSheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\"><fonts count=\"2\"><font><sz val=\"11\"/><name val=\"Calibri\"/></font><font><b/><sz val=\"11\"/><name val=\"Calibri\"/></font></fonts><fills count=\"2\"><fill><patternFill patternType=\"none\"/></fill><fill><patternFill patternType=\"gray125\"/></fill></fills><borders count=\"1\"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count=\"1\"><xf numFmtId=\"0\" fontId=\"0\" fillId=\"0\" borderId=\"0\"/></cellStyleXfs><cellXfs count=\"3\"><xf numFmtId=\"0\" fontId=\"0\" fillId=\"0\" borderId=\"0\" xfId=\"0\"/><xf numFmtId=\"0\" fontId=\"1\" fillId=\"0\" borderId=\"0\" xfId=\"0\" applyFont=\"1\"><alignment vertical=\"top\" wrapText=\"1\"/></xf><xf numFmtId=\"0\" fontId=\"0\" fillId=\"0\" borderId=\"0\" xfId=\"0\" applyAlignment=\"1\"><alignment vertical=\"top\" wrapText=\"1\"/></xf></cellXfs></styleSheet>");
            var sb = new StringBuilder("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><worksheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\"><sheetViews><sheetView workbookViewId=\"0\"><pane " + (dondur > 0 ? "xSplit=\"" + dondur + "\" " : "") + "ySplit=\"1\" topLeftCell=\"" + Sutun(dondur) + "2\" activePane=\"" + (dondur > 0 ? "bottomRight" : "bottomLeft") + "\" state=\"frozen\"/></sheetView></sheetViews><cols><col min=\"1\" max=\"1\" width=\"10\" customWidth=\"1\"/><col min=\"2\" max=\"2\" width=\"28\" customWidth=\"1\"/><col min=\"3\" max=\"3\" width=\"24\" customWidth=\"1\"/><col min=\"4\" max=\"10\" width=\"34\" customWidth=\"1\"/></cols><sheetData>");
            for (var r = 0; r < tablo.Count; r++)
            {
                sb.Append("<row r=\"").Append(r + 1).Append("\">");
                for (var c = 0; c < tablo[r].Count; c++)
                    {
                    if (r > 0 && sayiSutunlari != null && sayiSutunlari.Contains(c) && decimal.TryParse(tablo[r][c], System.Globalization.NumberStyles.Number, System.Globalization.CultureInfo.InvariantCulture, out var sayi))
                        sb.Append("<c r=\"").Append(Sutun(c)).Append(r + 1).Append("\" s=\"2\"><v>").Append(sayi.ToString(System.Globalization.CultureInfo.InvariantCulture)).Append("</v></c>");
                    else
                        sb.Append("<c r=\"").Append(Sutun(c)).Append(r + 1).Append("\" t=\"inlineStr\" s=\"").Append(r == 0 ? 1 : 2).Append("\"><is><t xml:space=\"preserve\">").Append(Kac(tablo[r][c])).Append("</t></is></c>");
                }
                sb.Append("</row>");
            }
            sb.Append("</sheetData></worksheet>");
            Yaz(z, "xl/worksheets/sheet1.xml", sb.ToString());
        }
        return ms.ToArray();
    }

    private static string Sutun(int i) { var s = ""; for (i++; i > 0; i = (i - 1) / 26) s = (char)('A' + (i - 1) % 26) + s; return s; }
    private static string Kac(string s) => SecurityElement.Escape(new string(s.Where(ch => ch >= ' ' || ch == '\n' || ch == '\t').ToArray())) ?? "";
    private static void Yaz(ZipArchive z, string ad, string icerik)
    {
        var e = z.CreateEntry(ad); using var w = new StreamWriter(e.Open(), new UTF8Encoding(false)); w.Write(icerik);
    }
}
