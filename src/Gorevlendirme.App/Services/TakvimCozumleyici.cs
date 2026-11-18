using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace Gorevlendirme;

/// <summary>Toplu yükleme satırı (bir tatil kaydı). Tarihler ISO (yyyy-MM-dd) ya da okunamayan ham metin; Bitis boşsa tek gün.
/// Zaman TAM/OO/OS; Tur RESMI/IDARI (tanınmazsa ham metin: sunucu reddeder).</summary>
public sealed record TakvimSatir(int Sira, string Baslangic, string Bitis, string Zaman, string Tur, string Ad, bool Yillik);

/// <summary>Okuma sonucu. Mod: STANDART (2024_Takvim.xlsx gibi liste satırları) ya da TABLO (sütunlu CSV/yapıştırma).</summary>
public sealed record TakvimOkuma(List<TakvimSatir> Satirlar, int? Yil, string Mod);

/// <summary>CSV / yapıştırılan Excel metni / .xlsx hücreleri → takvim satırları. Sunucu yine doğrular; burada yalnızca biçim çevrilir.</summary>
public static class TakvimCozumleyici
{
    private static readonly string[] TarihBicimleri =
    {
        "yyyy-MM-dd", "d.M.yyyy", "dd.MM.yyyy", "d/M/yyyy", "dd/MM/yyyy", "yyyy/MM/dd", "d.M.yyyy HH:mm", "d.M.yyyy HH:mm:ss",
        "yyyy-MM-dd HH:mm:ss", "yyyy-MM-ddTHH:mm:ss", "d.MM.yyyy", "dd.M.yyyy",
    };

    private static readonly Regex StandartSatirRe = new(
        @"^\s*(?<gunler>\d{1,2}(?:\s*-\s*\d{1,2})*)\s+(?<ay>[^\s\d/]+)\s+(?<gunad>[^/]*)/\s*(?<aciklama>.+?)\s*$",
        RegexOptions.Compiled | RegexOptions.CultureInvariant, TimeSpan.FromSeconds(1));
    private static readonly Regex GunSayisiRe = new(@"(?<n>\d+(?:[.,]\d+)?)\s*[gG][uüUÜ][nN]", RegexOptions.Compiled | RegexOptions.CultureInvariant, TimeSpan.FromSeconds(1));
    private static readonly Regex ParantezRe = new(@"\([^)]*\)", RegexOptions.Compiled, TimeSpan.FromSeconds(1));
    private static readonly Regex YilRe = new(@"^\s*(20\d\d)\s*$", RegexOptions.Compiled, TimeSpan.FromSeconds(1));

    private static readonly Dictionary<string, int> Aylar = new()
    {
        ["ocak"] = 1, ["subat"] = 2, ["mart"] = 3, ["nisan"] = 4, ["mayis"] = 5, ["haziran"] = 6,
        ["temmuz"] = 7, ["agustos"] = 8, ["eylul"] = 9, ["ekim"] = 10, ["kasim"] = 11, ["aralik"] = 12,
    };

    /// <summary>Türkçe harfleri ve I/İ ayrımını yok sayan karşılaştırma biçimi.</summary>
    internal static string Katla(string? s)
    {
        if (string.IsNullOrWhiteSpace(s)) return "";
        var sb = new StringBuilder(s.Length);
        foreach (var c in s.Trim())
        {
            sb.Append(c switch
            {
                'İ' or 'I' or 'ı' or 'i' => 'i',
                'Ö' or 'ö' => 'o',
                'Ü' or 'ü' => 'u',
                'Ğ' or 'ğ' => 'g',
                'Ş' or 'ş' => 's',
                'Ç' or 'ç' => 'c',
                _ => char.ToLowerInvariant(c),
            });
        }
        return string.Join(' ', sb.ToString().Split(' ', StringSplitOptions.RemoveEmptyEntries));
    }

    private static bool TarihMi(string? s) => DateTime.TryParseExact((s ?? "").Trim(), TarihBicimleri, CultureInfo.InvariantCulture, DateTimeStyles.None, out _);

    internal static string TarihCevir(string? s)
    {
        var t = (s ?? "").Trim();
        return DateTime.TryParseExact(t, TarihBicimleri, CultureInfo.InvariantCulture, DateTimeStyles.None, out var d) ? d.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) : t;
    }

    internal static string ZamanCevir(string? s) => Katla(s) switch
    {
        "" or "tam" or "tam gun" or "tum gun" or "gun" => "TAM",
        "oo" or "ogleden once" or "sabah" => "OO",
        "os" or "ogleden sonra" or "yarim gun" => "OS",
        _ => (s ?? "").Trim(),
    };

    internal static string TurCevir(string? s) => Katla(s) switch
    {
        "" or "resmi" or "resmi tatil" => "RESMI",
        "idari" or "idari tatil" or "idari izin" or "kurumsal" or "kurumsal tatil" => "IDARI",
        _ => (s ?? "").Trim(),
    };

    internal static bool EvetMi(string? s)
    {
        var k = Katla(s);
        return k is "e" or "evet" or "1" or "true" or "x" or "var" || k.Contains("kesil", StringComparison.Ordinal);
    }

    /// <summary>Girdiyi çözer. Standart takvim listesi satırı bulunursa STANDART modu, yoksa sütunlu TABLO modu kullanılır.
    /// STANDART modda yıl: sayfada tek başına duran 20xx hücresi, yoksa <paramref name="yil"/>; ikisi de yoksa hata.</summary>
    public static TakvimOkuma Oku(IReadOnlyList<string[]> satirlar, int? yil = null)
    {
        for (var i = 0; i < satirlar.Count; i++)
            if (StandartSatirRe.IsMatch(Birlestir(satirlar[i])) && AyBul(StandartSatirRe.Match(Birlestir(satirlar[i])).Groups["ay"].Value) > 0)
                return Standart(satirlar, yil);
        return new TakvimOkuma(Tablo(satirlar), null, "TABLO");
    }

    private static string Birlestir(string[] h) => string.Join(" ", h.Where(x => !string.IsNullOrWhiteSpace(x)).Select(x => x.Trim()));

    private static int AyBul(string ay) => Aylar.TryGetValue(Katla(ay), out var n) ? n : 0;

    // ---- STANDART: "10-11-12 NİSAN Çarşamba-Perşembe-Cuma / 3 Gün Ramazan Bayramı (YILLIK İZİNDEN KESİLECEK)" ----
    private static TakvimOkuma Standart(IReadOnlyList<string[]> satirlar, int? yil)
    {
        int? bulunan = null;
        for (var i = 0; i < Math.Min(satirlar.Count, 6) && bulunan == null; i++)
            foreach (var h in satirlar[i]) { var m = YilRe.Match(h ?? ""); if (m.Success) { bulunan = int.Parse(m.Groups[1].Value, CultureInfo.InvariantCulture); break; } }
        var y = bulunan ?? yil ?? throw new GorevException("dogrulama", "Takvim yılı bulunamadı; yılı seçip yeniden deneyin.");
        var sonuc = new List<TakvimSatir>();
        for (var i = 0; i < satirlar.Count; i++)
        {
            var metin = Birlestir(satirlar[i]);
            var m = StandartSatirRe.Match(metin);
            if (!m.Success) continue;
            var ay = AyBul(m.Groups["ay"].Value);
            if (ay == 0) { sonuc.Add(new TakvimSatir(i + 1, metin, "", "TAM", "RESMI", metin, false)); continue; }   // sunucu "tarih okunamadı" der

            var aciklama = m.Groups["aciklama"].Value;
            var yillik = Katla(aciklama).Contains("yillik izinden kesilecek", StringComparison.Ordinal);
            var gunM = GunSayisiRe.Match(aciklama);
            var gun = gunM.Success && double.TryParse(gunM.Groups["n"].Value.Replace(',', '.'), NumberStyles.Float, CultureInfo.InvariantCulture, out var g) ? g : 1;
            var ad = ParantezRe.Replace(aciklama, " ");
            ad = GunSayisiRe.Replace(ad, " ");
            ad = string.Join(' ', ad.Split(' ', StringSplitOptions.RemoveEmptyEntries)).Trim(' ', '-', '–', ',', '/', ':');
            if (ad.Length == 0) ad = yillik ? "İdari izin" : "Tatil";
            var idari = yillik || Katla(ad).Contains("kurumsal", StringComparison.Ordinal) || Katla(ad).Contains("idari", StringComparison.Ordinal);
            var yarim = gun is > 0 and < 1;

            foreach (var (b, e) in Araliklar(m.Groups["gunler"].Value))
            {
                if (!Gecerli(y, ay, b) || !Gecerli(y, ay, e)) { sonuc.Add(new TakvimSatir(i + 1, metin, "", "TAM", "RESMI", ad, yillik)); continue; }
                sonuc.Add(new TakvimSatir(i + 1, Iso(y, ay, b), b == e ? "" : Iso(y, ay, e), yarim && b == e ? "OS" : "TAM", idari ? "IDARI" : "RESMI", ad, yillik));
            }
        }
        return new TakvimOkuma(sonuc, y, "STANDART");
    }

    private static bool Gecerli(int y, int ay, int gun) => gun >= 1 && gun <= DateTime.DaysInMonth(y, ay);
    private static string Iso(int y, int ay, int gun) => new DateTime(y, ay, gun).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

    /// <summary>"10-11-12" → (10,12); "20-21" → (20,21); "10-12" → (10,12) aralık; "5-9-10" → (5,5),(9,10).</summary>
    internal static List<(int, int)> Araliklar(string gunler)
    {
        var s = gunler.Split('-', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).Select(x => int.Parse(x, CultureInfo.InvariantCulture)).ToList();
        var r = new List<(int, int)>();
        if (s.Count == 2 && s[1] > s[0]) { r.Add((s[0], s[1])); return r; }
        var bas = s[0]; var son = s[0];
        for (var i = 1; i < s.Count; i++)
        {
            if (s[i] == son + 1) son = s[i];
            else { r.Add((bas, son)); bas = son = s[i]; }
        }
        r.Add((bas, son));
        return r;
    }

    // ---- TABLO: başlık varsa sütun adlarından; yoksa Başlangıç; [Bitiş]; Ad; Tür; Zaman dilimi; Yıllık ----
    private static List<TakvimSatir> Tablo(IReadOnlyList<string[]> satirlar)
    {
        var sonuc = new List<TakvimSatir>();
        int cB = 0, cE = 1, cAd = 2, cTur = 3, cZ = 4, cY = 5, bas = 0;
        var basliklar = Array.Empty<string>();
        if (satirlar.Count > 0)
        {
            basliklar = satirlar[0].Select(Katla).ToArray();
            var baslikMi = basliklar.Any(b => b.StartsWith("tarih", StringComparison.Ordinal) || b.StartsWith("baslangic", StringComparison.Ordinal)) && !TarihMi(satirlar[0].FirstOrDefault());
            if (baslikMi)
            {
                bas = 1;
                int Bul(Func<string, bool> f) => Array.FindIndex(basliklar, b => f(b));
                cB = Math.Max(0, Bul(b => b.StartsWith("baslangic", StringComparison.Ordinal) || b.StartsWith("tarih", StringComparison.Ordinal)));
                cE = Bul(b => b.StartsWith("bitis", StringComparison.Ordinal) || b == "son");
                cAd = Bul(b => b.StartsWith("ad", StringComparison.Ordinal) || b.Contains("aciklama", StringComparison.Ordinal) || b.Contains("tatil", StringComparison.Ordinal) && !b.Contains("tur", StringComparison.Ordinal));
                cTur = Bul(b => b == "tur" || b.StartsWith("tur ", StringComparison.Ordinal));
                cZ = Bul(b => b.Contains("zaman", StringComparison.Ordinal) || b.Contains("dilim", StringComparison.Ordinal));
                cY = Bul(b => b.Contains("yillik", StringComparison.Ordinal) || b.Contains("kesil", StringComparison.Ordinal));
            }
            else basliklar = Array.Empty<string>();
        }
        for (var i = bas; i < satirlar.Count; i++)
        {
            var h = satirlar[i];
            if (h.All(x => string.IsNullOrWhiteSpace(x))) continue;
            string Al(int c) => c >= 0 && c < h.Length ? h[c] : "";
            if (basliklar.Length > 0)
            {
                sonuc.Add(new TakvimSatir(i + 1, TarihCevir(Al(cB)), TarihCevir(Al(cE)), ZamanCevir(Al(cZ)), TurCevir(Al(cTur)), Al(cAd).Trim(), EvetMi(Al(cY))));
                continue;
            }
            // Başlıksız: 2. hücre tarih ya da boşsa "Başlangıç; Bitiş; Ad; Tür; Zaman; Yıllık", değilse "Tarih; Ad; Zaman; Tür; Yıllık"
            if (h.Length < 2 || string.IsNullOrWhiteSpace(h[1]) && h.Length >= 3 || TarihMi(Al(1)))
                sonuc.Add(new TakvimSatir(i + 1, TarihCevir(Al(0)), TarihCevir(Al(1)), ZamanCevir(Al(4)), TurCevir(Al(3)), Al(2).Trim(), EvetMi(Al(5))));
            else
                sonuc.Add(new TakvimSatir(i + 1, TarihCevir(Al(0)), "", ZamanCevir(Al(2)), TurCevir(Al(3)), Al(1).Trim(), EvetMi(Al(4))));
        }
        return sonuc;
    }

    /// <summary>CSV / TSV metni (Excel'den yapıştırma dahil) hücrelere ayırır. Ayraç: sekme, ; ya da , (ilk dolu satıra göre). Tırnak desteklenir.</summary>
    public static List<string[]> MetinSatirlari(string? metin)
    {
        var sonuc = new List<string[]>();
        if (string.IsNullOrWhiteSpace(metin)) return sonuc;
        metin = metin.TrimStart('﻿');
        var ilk = metin.Split('\n').FirstOrDefault(l => !string.IsNullOrWhiteSpace(l)) ?? "";
        var ayrac = ilk.Contains('\t', StringComparison.Ordinal) ? '\t' : ilk.Contains(';', StringComparison.Ordinal) ? ';' : ',';
        var hucre = new StringBuilder();
        var satir = new List<string>();
        var tirnakta = false;
        void HucreBitir() { satir.Add(hucre.ToString()); hucre.Clear(); }
        void SatirBitir() { HucreBitir(); sonuc.Add(satir.ToArray()); satir.Clear(); }
        for (var i = 0; i < metin.Length; i++)
        {
            var c = metin[i];
            if (tirnakta)
            {
                if (c == '"') { if (i + 1 < metin.Length && metin[i + 1] == '"') { hucre.Append('"'); i++; } else tirnakta = false; }
                else hucre.Append(c);
            }
            else if (c == '"' && hucre.Length == 0) tirnakta = true;
            else if (c == ayrac) HucreBitir();
            else if (c == '\r') { }
            else if (c == '\n') SatirBitir();
            else hucre.Append(c);
        }
        if (hucre.Length > 0 || satir.Count > 0) SatirBitir();
        return sonuc;
    }
}
