using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace Gorevlendirme;

public class MainForm : Form
{
    private const string Host = "app.local";
    private readonly WebView2 _wv = new() { Dock = DockStyle.Fill };
    private readonly Label _lbl = new()
    {
        Dock = DockStyle.Fill, TextAlign = ContentAlignment.MiddleCenter,
        Font = new Font("Segoe UI", 12f), Text = "Başlatılıyor...", BackColor = Color.White,
    };
    private Bridge? _bridge;

    public MainForm()
    {
        Text = $"Personel Görevlendirme · {AppInfo.Version}";
        Width = 1280;
        Height = 820;
        StartPosition = FormStartPosition.CenterScreen;
        Controls.Add(_wv);
        Controls.Add(_lbl);
        _lbl.BringToFront();
        Load += async (_, _) => await InitAsync();
    }

    private async Task InitAsync()
    {
        try
        {
            var loc = await Task.Run(() =>
                WebViewLocator.Locate(m => BeginInvoke((Action)(() => _lbl.Text = m))));
            if (loc.Source == "Yok")
            {
                MessageBox.Show(
                    "WebView2 çalışma zamanı bulunamadı.\n\n" +
                    "Sistemde kurulu değil ve uygulama klasöründe 'WebView2Runtime' (sabit sürüm) klasörü yok.\n" +
                    "README.md içindeki ilgili adıma bakın.",
                    Text, MessageBoxButtons.OK, MessageBoxIcon.Error);
                Close();
                return;
            }

            // Kullanıcı verisi yazılabilir bir yerde olmalı (sabit sürüm klasörü salt okunur olabilir)
            var userData = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Gorevlendirme", "WebView2");
            Directory.CreateDirectory(userData);

            var env = await CoreWebView2Environment.CreateAsync(loc.Folder, userData);
            await _wv.EnsureCoreWebView2Async(env);

            var core = _wv.CoreWebView2;
            var www = UiHost.EnsureExtracted();   // arayüz exe içinden açılır
            core.SetVirtualHostNameToFolderMapping(Host, www, CoreWebView2HostResourceAccessKind.Allow);

            // Güvenlik: yalnızca kendi sayfamıza gidilebilir; yeni pencere ve harici bağlantı yok
            core.NavigationStarting += (_, e) =>
            {
                if (!e.Uri.StartsWith($"https://{Host}/", StringComparison.OrdinalIgnoreCase)) e.Cancel = true;
            };
            core.NewWindowRequested += (_, e) => e.Handled = true;
            core.DownloadStarting += (_, e) => e.Cancel = true;   // indirme özellikleri sonraki dilimlerde
            core.Settings.AreDefaultContextMenusEnabled = false;
            // Geliştirici araçları yalnızca "Gorevlendirme.exe --gelistirici" ile açılır
            core.Settings.AreDevToolsEnabled =
                Environment.GetCommandLineArgs().Any(x => x.Equals("--gelistirici", StringComparison.OrdinalIgnoreCase));

            var reg = new CommandRegistry();
            SystemCommands.Register(reg);
            BaglantiCommands.Register(reg);
            SemaCommands.Register(reg);
            KimlikCommands.Register(reg);
            HavuzTakvimCommands.Register(reg);
            EskiVeriCommands.Register(reg);
            TalepCommands.Register(reg);
            AtamaCommands.Register(reg);
            MatrisCommands.Register(reg);
            var state = new AppState(loc);
            _bridge = new Bridge(core, state, reg);
            core.WebMessageReceived += async (_, e) =>
            {
                // Yalnızca kendi sayfamızdan gelen mesajlar işlenir
                if (!e.Source.StartsWith($"https://{Host}/", StringComparison.OrdinalIgnoreCase)) return;
                await _bridge.HandleAsync(e.WebMessageAsJson);
            };

            core.Navigate($"https://{Host}/index.html");
            _lbl.Visible = false;
        }
        catch (Exception ex)
        {
            MessageBox.Show("Başlatma hatası:\n\n" + ex, Text, MessageBoxButtons.OK, MessageBoxIcon.Error);
            Close();
        }
    }
}
