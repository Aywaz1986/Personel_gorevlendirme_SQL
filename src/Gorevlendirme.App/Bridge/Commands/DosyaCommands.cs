using System.Text;
using System.Windows.Forms;

namespace Gorevlendirme;

/// <summary>Arayüzden metin dosyası (CSV/TXT) kaydı (Dilim 29). WebView2'de tarayıcı tarzı "indir" bağlantısı çalışmadığından kayıt penceresi C# tarafında açılır.</summary>
public static class DosyaCommands
{
    private const int EnFazlaKarakter = 5_000_000;

    private static Task<string?> KayitYoluAsync(string ad, string uzanti)
    {
        var tcs = new TaskCompletionSource<string?>();
        var t = new Thread(() =>
        {
            try
            {
                var u = uzanti.TrimStart('.').ToLowerInvariant();
                var ad2 = u == "csv" ? "CSV dosyası" : "Metin dosyası";
                using var d = new SaveFileDialog { Title = "Dosyayı kaydet", Filter = ad2 + " (*." + u + ")|*." + u, FileName = ad, OverwritePrompt = true };
                tcs.SetResult(d.ShowDialog() == DialogResult.OK ? d.FileName : null);
            }
            catch (Exception ex) { tcs.SetException(ex); }
        });
        t.SetApartmentState(ApartmentState.STA);
        t.IsBackground = true;
        t.Start();
        return tcs.Task;
    }

    public static void Register(CommandRegistry r)
    {
        // Kayıt penceresi açar; kullanıcı iptal ederse { iptal = true }. Arayüz yalnız ad ve metin verir; yol seçimi kullanıcıdadır.
        r.Register("dosyaKaydet", async (st, a) =>
        {
            var ad = Path.GetFileName(Args.S(a, "ad"));
            var metin = Args.S(a, "metin");
            if (string.IsNullOrWhiteSpace(ad)) throw new ArgumentException("Dosya adı boş.");
            if (metin.Length > EnFazlaKarakter) throw new ArgumentException("Dosya çok büyük.");
            var uzanti = Path.GetExtension(ad);
            if (!uzanti.Equals(".csv", StringComparison.OrdinalIgnoreCase) && !uzanti.Equals(".txt", StringComparison.OrdinalIgnoreCase)) throw new ArgumentException("Yalnız .csv ve .txt kaydedilir.");
            var yol = await KayitYoluAsync(ad, uzanti);
            if (yol == null) return (object?)new { iptal = true };
            await File.WriteAllTextAsync(yol, metin, new UTF8Encoding(true));
            return (object?)new { iptal = false, yol };
        }, kapiGerekli: false);
    }
}
