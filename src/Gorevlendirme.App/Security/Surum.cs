namespace Gorevlendirme;

/// <summary>Sürüm denetimi: kaza önleme (güvenlik değil). Kopyalanmış eski exe yeni şemaya bağlanamaz.</summary>
public static class Surum
{
    public record Sonuc(string Durum, string Mesaj)
    {
        public bool Engelle => Durum is "uygulamaEski" or "semaYeni";
    }

    public static bool TryParse(string? s, out Version v)
    {
        v = new Version(0, 0, 0);
        if (string.IsNullOrWhiteSpace(s) || !Version.TryParse(s.Trim(), out var p)) return false;
        v = p; return true;
    }

    /// <summary>-1/0/1; çözümlenemeyen metin 0.0.0 sayılır.</summary>
    public static int Karsilastir(string? a, string? b)
    {
        TryParse(a, out var x); TryParse(b, out var y);
        return Normalize(x).CompareTo(Normalize(y));
    }

    private static Version Normalize(Version v) => new(v.Major, Math.Max(v.Minor, 0), Math.Max(v.Build, 0), Math.Max(v.Revision, 0));

    /// <param name="uygulama">Çalışan exe sürümü.</param>
    /// <param name="asgari">Veritabanındaki asgari uygulama sürümü (null: kayıt yok).</param>
    /// <param name="dbSema">Veritabanındaki en yüksek şema sürümü (null: şema yok).</param>
    /// <param name="hedefSema">Bu exe'nin bildiği en yüksek şema betiği.</param>
    public static Sonuc Denetle(string uygulama, string? asgari, int? dbSema, int hedefSema)
    {
        if (dbSema is null)
            return new("semaYok", "Şema kurulu değil (yönetici 'Şemayı kur' çalıştırmalı).");
        if (asgari is not null && Karsilastir(uygulama, asgari) < 0)
            return new("uygulamaEski", $"Bu uygulama sürümü ({uygulama}) eski; en az {asgari} gerekir. Güncel exe'yi kullanın.");
        if (dbSema > hedefSema)
            return new("semaYeni", $"Veritabanı şeması ({dbSema}) bu uygulamanın bildiğinden ({hedefSema}) yeni. Güncel exe'yi kullanın.");
        if (dbSema < hedefSema)
            return new("semaEski", $"Veritabanı şeması ({dbSema}) bu uygulamadan ({hedefSema}) eski; yönetici şemayı yükseltmeli.");
        return new("tamam", "Sürüm uyumlu.");
    }
}
