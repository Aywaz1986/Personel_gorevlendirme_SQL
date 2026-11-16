using System.Reflection;

namespace Gorevlendirme;

/// <summary>
/// Arayüz dosyaları exe içine gömülüdür (Ui/ klasörü). Açılışta bu derlemeye özel bir klasöre açılır
/// (%LocalAppData%\Gorevlendirme\ui\&lt;derleme kimliği&gt;) ve WebView2'ye bu klasör gösterilir.
/// Sunucu paylaşımında düzenlenebilir bir arayüz klasörü kalmaz; sürüm ile arayüz her zaman eşleşir.
/// </summary>
public static class UiHost
{
    private const string Prefix = "Ui/";

    public static string EnsureExtracted()
    {
        var asm = typeof(UiHost).Assembly;
        var id = asm.ManifestModule.ModuleVersionId.ToString("N");
        var root = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Gorevlendirme", "ui");
        var target = Path.Combine(root, id);
        const string marker = ".tamam";
        if (File.Exists(Path.Combine(target, marker))) return target;

        Directory.CreateDirectory(root);
        var tmp = target + ".tmp-" + Guid.NewGuid().ToString("N");
        Directory.CreateDirectory(tmp);
        var tmpFull = Path.GetFullPath(tmp) + Path.DirectorySeparatorChar;

        foreach (var name in asm.GetManifestResourceNames())
        {
            if (!name.StartsWith(Prefix, StringComparison.Ordinal)) continue;
            var rel = name.Substring(Prefix.Length).Replace('\\', '/');
            var dest = Path.GetFullPath(Path.Combine(tmp, rel));
            if (!dest.StartsWith(tmpFull, StringComparison.OrdinalIgnoreCase)) continue;   // yol kaçışına karşı
            Directory.CreateDirectory(Path.GetDirectoryName(dest)!);
            using var s = asm.GetManifestResourceStream(name)!;
            using var f = File.Create(dest);
            s.CopyTo(f);
        }
        File.WriteAllText(Path.Combine(tmp, marker), DateTime.Now.ToString("o"));

        try { Directory.Move(tmp, target); }
        catch
        {
            // Aynı anda başka bir pencere açmış olabilir
            if (File.Exists(Path.Combine(target, marker))) { try { Directory.Delete(tmp, true); } catch { } }
            else throw;
        }
        CleanOld(root, id);
        return target;
    }

    private static void CleanOld(string root, string keep)
    {
        try
        {
            foreach (var d in Directory.GetDirectories(root))
            {
                if (Path.GetFileName(d).StartsWith(keep, StringComparison.Ordinal)) continue;
                try { Directory.Delete(d, true); } catch { /* başka sürüm açık olabilir */ }
            }
        }
        catch { }
    }
}
