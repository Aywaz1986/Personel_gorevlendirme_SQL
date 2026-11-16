using System.Diagnostics;
using Microsoft.Web.WebView2.Core;

namespace Gorevlendirme;

/// <summary>
/// WebView2 çalışma zamanını bulur: önce sistemdekini, yoksa .exe'nin yanındaki sabit sürüm klasörünü.
/// Sabit sürüm ağ paylaşımındaysa (sandbox bu durumda başlamaz) yerel diske bir kez kopyalanır.
/// </summary>
public static class WebViewLocator
{
    public record Result(string? Folder, string Source, string Version);

    public static string ExeDir =>
        Path.GetDirectoryName(Environment.ProcessPath) ?? AppContext.BaseDirectory;

    public static Result Locate(Action<string>? status = null)
    {
        // 1) Sistemde kurulu (Evergreen) çalışma zamanı
        try
        {
            var v = CoreWebView2Environment.GetAvailableBrowserVersionString();
            if (!string.IsNullOrWhiteSpace(v)) return new Result(null, "Sistem", v);
        }
        catch { /* yok sayılır, pakete bakılır */ }

        // 2) Paketle gelen sabit sürüm: "WebView2Runtime" veya "Microsoft.WebView2.FixedVersionRuntime.*"
        try
        {
            foreach (var dir in Directory.GetDirectories(ExeDir))
            {
                var name = Path.GetFileName(dir);
                var uygun = name.Equals("WebView2Runtime", StringComparison.OrdinalIgnoreCase)
                         || name.StartsWith("Microsoft.WebView2.FixedVersionRuntime", StringComparison.OrdinalIgnoreCase);
                if (!uygun || !File.Exists(Path.Combine(dir, "msedgewebview2.exe"))) continue;

                var kaynak = "Paket (sabit sürüm)";
                var klasor = dir;
                if (IsNetworkPath(dir))
                {
                    klasor = EnsureLocalCopy(dir, status);
                    kaynak = "Paket (sabit sürüm, yerel kopya)";
                }

                string ver = "";
                try { ver = CoreWebView2Environment.GetAvailableBrowserVersionString(klasor) ?? ""; } catch { }
                return new Result(klasor, kaynak, ver);
            }
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            throw new InvalidOperationException("Sabit sürüm çalışma zamanı hazırlanamadı: " + ex.Message, ex);
        }

        return new Result(null, "Yok", "");
    }

    private static bool IsNetworkPath(string path)
    {
        try
        {
            var full = Path.GetFullPath(path);
            if (full.StartsWith(@"\\", StringComparison.Ordinal)) return true;   // UNC
            var root = Path.GetPathRoot(full);
            return !string.IsNullOrEmpty(root) && new DriveInfo(root).DriveType == DriveType.Network; // eşlenmiş sürücü
        }
        catch { return false; }
    }

    /// <summary>Çalışma zamanını %LocalAppData%\Gorevlendirme\Runtime\&lt;ad&gt;-&lt;sürüm&gt; altına bir kez kopyalar.</summary>
    private static string EnsureLocalCopy(string src, Action<string>? status)
    {
        var exe = Path.Combine(src, "msedgewebview2.exe");
        var ver = "x";
        try { ver = FileVersionInfo.GetVersionInfo(exe).FileVersion ?? "x"; } catch { }

        var root = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Gorevlendirme", "Runtime");
        Directory.CreateDirectory(root);
        var target = Path.Combine(root, Path.GetFileName(src) + "-" + ver);
        const string marker = ".kopya-tamam";

        if (File.Exists(Path.Combine(target, "msedgewebview2.exe")) && File.Exists(Path.Combine(target, marker)))
            return target;

        status?.Invoke("İlk çalıştırma: WebView2 çalışma zamanı bu bilgisayara kopyalanıyor (yaklaşık 1 dakika)...");
        var tmp = target + ".tmp-" + Guid.NewGuid().ToString("N");
        CopyDir(src, tmp);
        File.WriteAllText(Path.Combine(tmp, marker), DateTime.Now.ToString("o"));

        try
        {
            if (Directory.Exists(target)) Directory.Delete(target, true);   // yarım kalmış eski kopya
            Directory.Move(tmp, target);
        }
        catch
        {
            // Aynı anda başka bir pencere kopyayı tamamlamış olabilir
            if (File.Exists(Path.Combine(target, marker)))
            {
                try { Directory.Delete(tmp, true); } catch { }
            }
            else throw;
        }
        return target;
    }

    private static void CopyDir(string src, string dst)
    {
        Directory.CreateDirectory(dst);
        foreach (var f in Directory.GetFiles(src))
            File.Copy(f, Path.Combine(dst, Path.GetFileName(f)), true);
        foreach (var d in Directory.GetDirectories(src))
            CopyDir(d, Path.Combine(dst, Path.GetFileName(d)));
    }
}
