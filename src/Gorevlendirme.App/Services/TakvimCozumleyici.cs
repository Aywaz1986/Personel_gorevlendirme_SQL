using System.Globalization;
using System.Text;

namespace Gorevlendirme;

/// <summary>Toplu yükleme satırı: tarih ISO (yyyy-MM-dd) ya da okunamayan ham metin; zaman TAM/OO/OS; tür RESMI/AKADEMIK/IDARI (tanınmazsa ham metin).</summary>
public sealed record TakvimSatir(int Sira, string Tarih, string Zaman, string Tur, string Ad);

/// <summary>CSV / yapıştırılan Excel metni (ya da .xlsx'ten gelen hücreler) → takvim satırları. Sunucu yine doğrular; burada yalnızca biçim çevrilir.</summary>
public static class TakvimCozumleyici
{
    private static readonly string[] TarihBicimleri =
    {
        "yyyy-MM-dd", "d.M.yyyy", "dd.MM.yyyy", "d/M/yyyy", "dd/MM/yyyy", "yyyy/MM/dd", "d.M.yyyy HH:mm", "d.M.yyyy HH:mm:ss",
        "yyyy-MM-dd HH:mm:ss", "yyyy-MM-ddTHH:mm:ss", "d.MM.yyyy", "dd.M.yyyy",
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

    internal static string TarihCevir(string? s)
    {
        var t = (s ?? "").Trim();
        return DateTime.TryParseExact(t, TarihBicimleri, CultureInfo.InvariantCulture, DateTimeStyles.None, out var d) ? d.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) : t;
    }

    internal static string ZamanCevir(string? s) => Katla(s) switch
    {
        "" or "tam" or "tam gun" or "tum gun" or "gun" => "TAM",
        "oo" or "ogleden once" or "sabah" => "OO",
        "os" or "ogleden sonra" => "OS",
        _ => (s ?? "").Trim(),
    };

    internal static string TurCevir(string? s) => Katla(s) switch
    {
        "" or "resmi" or "resmi tatil" => "RESMI",
        "akademik" or "akademik takvim" or "akademik tatil" => "AKADEMIK",
        "idari" or "idari izin" => "IDARI",
        _ => (s ?? "").Trim(),
    };

    /// <summary>Başlık satırı varsa sütunlar adlarından (tarih, ad/açıklama, zaman/dilim, tür) bulunur; yoksa sıra: Tarih; Ad; Zaman dilimi; Tür (son ikisi isteğe bağlı).</summary>
    public static List<TakvimSatir> Cozumle(IReadOnlyList<string[]> satirlar)
    {
        var sonuc = new List<TakvimSatir>();
        int cTarih = 0, cAd = 1, cZaman = 2, cTur = 3, baslangic = 0;
        if (satirlar.Count > 0)
        {
            var ilk = satirlar[0];
            var basliklar = ilk.Select(Katla).ToArray();
            var baslikMi = basliklar.Any(b => b.StartsWith("tarih", StringComparison.Ordinal)) && !DateTime.TryParseExact(ilk.FirstOrDefault()?.Trim() ?? "", TarihBicimleri, CultureInfo.InvariantCulture, DateTimeStyles.None, out _);
            if (baslikMi)
            {
                baslangic = 1;
                int Bul(Func<string, bool> f, int varsayilan) { var i = Array.FindIndex(basliklar, b => f(b)); return i >= 0 ? i : varsayilan; }
                cTarih = Bul(b => b.StartsWith("tarih", StringComparison.Ordinal), 0);
                cAd = Bul(b => b.StartsWith("ad", StringComparison.Ordinal) || b.Contains("aciklama", StringComparison.Ordinal) || b.Contains("tatil", StringComparison.Ordinal), 1);
                cZaman = Bul(b => b.Contains("zaman", StringComparison.Ordinal) || b.Contains("dilim", StringComparison.Ordinal), -1);
                cTur = Bul(b => b == "tur" || b.StartsWith("tur ", StringComparison.Ordinal), -1);
            }
        }
        for (var i = baslangic; i < satirlar.Count; i++)
        {
            var h = satirlar[i];
            if (h.All(x => string.IsNullOrWhiteSpace(x))) continue;
            string Al(int c) => c >= 0 && c < h.Length ? h[c] : "";
            sonuc.Add(new TakvimSatir(i + 1, TarihCevir(Al(cTarih)), ZamanCevir(Al(cZaman)), TurCevir(Al(cTur)), Al(cAd).Trim()));
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
