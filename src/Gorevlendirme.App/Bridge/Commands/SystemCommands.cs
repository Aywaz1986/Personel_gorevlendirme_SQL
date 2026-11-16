namespace Gorevlendirme;

public static class SystemCommands
{
    public static void Register(CommandRegistry r)
    {
        r.Register("ping", (st, a) =>
            Task.FromResult<object?>(new { pong = true, time = DateTime.Now.ToString("HH:mm:ss.fff") }));

        r.Register("runtime", (st, a) =>
            Task.FromResult<object?>(new
            {
                uygulamaSurumu = AppInfo.Version,
                webview2Kaynak = st.Runtime.Source,
                webview2Surum = st.Runtime.Version,
                windowsKullanici = Environment.UserDomainName + "\\" + Environment.UserName,
            }));
    }
}
