namespace Gorevlendirme;

public static class AppInfo
{
    /// <summary>Derleme sürümü (CI: 0.1.&lt;çalışma no&gt;). Asgari sürüm kapısı bunu kullanır.</summary>
    public static string Version =>
        typeof(AppInfo).Assembly.GetName().Version?.ToString(3) ?? "0.0.0";
}
