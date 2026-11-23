using System.Security.Cryptography;
using System.Text.Json;

namespace Gorevlendirme;

/// <summary>Kullanıcıya özel bağlantı kaydı (Windows DPAPI ile şifreli).</summary>
public static class ConnectionStore
{
    private static string FilePath => Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "Gorevlendirme", "conn.dat");

    public static void Save(ConnInfo c)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(FilePath)!);
        var plain = JsonSerializer.SerializeToUtf8Bytes(c);
        File.WriteAllBytes(FilePath, ProtectedData.Protect(plain, null, DataProtectionScope.CurrentUser));
    }

    public static ConnInfo? Load()
    {
        try
        {
            if (!File.Exists(FilePath)) return null;
            var plain = ProtectedData.Unprotect(File.ReadAllBytes(FilePath), null, DataProtectionScope.CurrentUser);
            return JsonSerializer.Deserialize<ConnInfo>(plain);
        }
        catch { return null; }
    }

    public static void Clear()
    {
        try { if (File.Exists(FilePath)) File.Delete(FilePath); } catch { /* silinemezse sorun değil */ }
    }
}

/// <summary>
/// Ortak varsayılan bağlantı: exe klasöründeki <c>Gorevlendirme.baglanti.json</c>; yoksa aynı klasördeki Özlük'ün
/// <c>Ozluk.baglanti.json</c> dosyası (aynı sunucu/veritabanı) okunur. Parola/kullanıcı adı TUTULMAZ.
/// Normal kullanıcı bağlantı penceresi görmez; dosyayı yalnızca Yönetici komutla yazar/siler.
/// </summary>
public static class SharedConnection
{
    public const string FileName = "Gorevlendirme.baglanti.json";
    public const string OzlukFileName = "Ozluk.baglanti.json";

    private static string Klasor => Path.GetDirectoryName(Environment.ProcessPath) ?? AppContext.BaseDirectory;
    public static string DefaultPath => Path.Combine(Klasor, FileName);
    public static string OzlukPath => Path.Combine(Klasor, OzlukFileName);

    private record Dosya(string Server, string Database, bool Encrypt = true, bool Trust = false);
    private static readonly JsonSerializerOptions Secenek = new() { PropertyNameCaseInsensitive = true, WriteIndented = true };

    /// <summary>Sunucu ve veritabanı adı doğrulaması; hata iletisini döndürür, geçerliyse null.</summary>
    public static string? Dogrula(string? server, string? db)
    {
        server = server?.Trim() ?? ""; db = db?.Trim() ?? "";
        if (server.Length == 0 || db.Length == 0 || server.Length > 200 || db.Length > 128
            || server.Any(char.IsControl) || db.Any(char.IsControl))
            return "Sunucu ve veritabanı adı geçerli olmalı.";
        return null;
    }

    public static ConnInfo? Read(string path)
    {
        try
        {
            if (!File.Exists(path)) return null;
            var d = JsonSerializer.Deserialize<Dosya>(File.ReadAllText(path), Secenek);
            if (d is null || Dogrula(d.Server, d.Database) is not null) return null;
            return new ConnInfo(d.Server.Trim(), d.Database.Trim(), true, "", "", d.Encrypt, d.Trust);
        }
        catch { return null; }
    }

    /// <summary>Kaynağıyla birlikte okur: "ortak" (kendi dosyası), "ozluk" (Özlük'ün dosyası) ya da null.</summary>
    public static (ConnInfo? Bilgi, string? Kaynak) LoadKaynakli(string? kendi = null, string? ozluk = null)
    {
        var c = Read(kendi ?? DefaultPath);
        if (c is not null) return (c, "ortak");
        c = Read(ozluk ?? OzlukPath);
        return c is not null ? (c, "ozluk") : (null, null);
    }

    public static ConnInfo? Load() => LoadKaynakli().Bilgi;

    /// <summary>Varsayılan bağlantıyı yazar (önce .tmp, sonra taşıma). Klasör yazılamazsa istisna atar.</summary>
    public static void Write(string path, string server, string db, bool encrypt, bool trust)
    {
        var hata = Dogrula(server, db);
        if (hata is not null) throw new ArgumentException(hata);
        var tmp = path + ".tmp";
        File.WriteAllText(tmp, JsonSerializer.Serialize(new Dosya(server.Trim(), db.Trim(), encrypt, trust), Secenek));
        File.Move(tmp, path, overwrite: true);
    }

    public static bool Delete(string path)
    {
        if (!File.Exists(path)) return false;
        File.Delete(path);
        return true;
    }
}

/// <summary>Yüzen bağlantı penceresinin tüm kullanıcılar için varsayılan konumu/boyutu (exe klasöründeki <c>Gorevlendirme.pencere.json</c>).</summary>
public static class PencereKonumu
{
    public const string FileName = "Gorevlendirme.pencere.json";
    public record Konum(int X, int Y, int W, int H);
    private static string Klasor => Path.GetDirectoryName(Environment.ProcessPath) ?? AppContext.BaseDirectory;
    public static string DefaultPath => Path.Combine(Klasor, FileName);

    public static Konum? Read(string? path = null)
    {
        try
        {
            path ??= DefaultPath;
            if (!File.Exists(path)) return null;
            var k = JsonSerializer.Deserialize<Konum>(File.ReadAllText(path), new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            return k is not null && Gecerli(k) ? k : null;
        }
        catch { return null; }
    }

    public static bool Gecerli(Konum k) =>
        k.X is >= -100 and <= 20000 && k.Y is >= -100 and <= 20000 && k.W is >= 0 and <= 5000 && k.H is >= 0 and <= 5000;

    public static void Write(string path, Konum k)
    {
        if (!Gecerli(k)) throw new ArgumentException("Konum geçersiz.");
        var tmp = path + ".tmp";
        File.WriteAllText(tmp, JsonSerializer.Serialize(k));
        File.Move(tmp, path, overwrite: true);
    }

    public static bool Delete(string path)
    {
        if (!File.Exists(path)) return false;
        File.Delete(path);
        return true;
    }
}
