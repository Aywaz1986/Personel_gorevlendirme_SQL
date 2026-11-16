namespace Gorevlendirme;

/// <summary>Oturum boyunca komutların paylaştığı durum.</summary>
public class AppState
{
    public WebViewLocator.Result Runtime { get; }
    public SqlService? Sql { get; set; }
    /// <summary>Sürüm kapısı engeli (eski exe / yeni şema). Doluysa kapı gerektiren komutlar çalışmaz.</summary>
    public string? Engel { get; set; }

    public AppState(WebViewLocator.Result runtime) { Runtime = runtime; }

    public SqlService RequireSql =>
        Sql ?? throw new GorevException("baglanti", "Önce SQL Server'a bağlanın.");
}
