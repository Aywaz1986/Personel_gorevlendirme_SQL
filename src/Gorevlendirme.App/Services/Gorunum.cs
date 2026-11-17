namespace Gorevlendirme;

/// <summary>Rol → görünüm sırası ve açılış görünümü. Çoklu rolde üst menüden görünüm geçişi yapılır.</summary>
public static class Gorunum
{
    public const string Yonetici = "YONETICI";
    public const string Sorumlu = "SORUMLU";
    public const string Saha = "SAHA";

    /// <summary>Öncelik sırası: Yönetici, Proje Sorumlusu, Saha Personeli.</summary>
    public static List<string> Liste(bool yonetici, bool sorumlu, bool saha)
    {
        var l = new List<string>();
        if (yonetici) l.Add(Yonetici);
        if (sorumlu) l.Add(Sorumlu);
        if (saha) l.Add(Saha);
        return l;
    }

    /// <summary>Son seçilen görünüm hâlâ geçerliyse o, değilse en yüksek öncelikli görünüm; hiç rol yoksa null.</summary>
    public static string? Varsayilan(IReadOnlyList<string> liste, string? tercih) =>
        tercih is not null && liste.Contains(tercih) ? tercih : liste.Count > 0 ? liste[0] : null;
}
