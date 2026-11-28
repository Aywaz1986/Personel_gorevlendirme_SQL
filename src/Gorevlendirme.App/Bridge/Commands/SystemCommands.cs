namespace Gorevlendirme;

public static class SystemCommands
{
    public static void Register(CommandRegistry r)
    {
        // Boşta kalma zaman aşımı (Dilim 33): arayüz 20 dk işlem olmayınca (Sorumlu/Saha) uygulamayı kapatır. Yetki gerektirmez, veri döndürmez.
        r.Register("uygulamaKapat", (st, a) =>
        {
            var f = System.Windows.Forms.Application.OpenForms.Count > 0 ? System.Windows.Forms.Application.OpenForms[0] : null;
            if (f != null) f.BeginInvoke(new Action(System.Windows.Forms.Application.Exit)); else System.Windows.Forms.Application.Exit();
            return Task.FromResult<object?>(new { kapaniyor = true });
        }, kapiGerekli: false);
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
