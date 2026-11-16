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
/// </summary>
public static class SharedConnection
{
    public const string FileName = "Gorevlendirme.baglanti.json";
    public const string OzlukFileName = "Ozluk.baglanti.json";

    private static string Klasor => Path.GetDirectoryName(Environment.ProcessPath) ?? AppContext.BaseDirectory;
    public static string DefaultPath => Path.Combine(Klasor, FileName);

    private record Dosya(string Server, string Database, bool Encrypt = true, bool Trust = false);

    public static ConnInfo? Read(string path)
    {
        try
        {
            if (!File.Exists(path)) return null;
            var d = JsonSerializer.Deserialize<Dosya>(File.ReadAllText(path), new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            if (d is null || string.IsNullOrWhiteSpace(d.Server) || string.IsNullOrWhiteSpace(d.Database)) return null;
            return new ConnInfo(d.Server.Trim(), d.Database.Trim(), true, "", "", d.Encrypt, d.Trust);
        }
        catch { return null; }
    }

    public static ConnInfo? Load() => Read(DefaultPath) ?? Read(Path.Combine(Klasor, OzlukFileName));
}
