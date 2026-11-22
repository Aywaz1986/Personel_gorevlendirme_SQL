using System.Text.Json;
using System.Windows.Forms;

namespace Gorevlendirme;

/// <summary>Canlıya geçiş ve eski veri aktarımı komutları (Dilim 10). Yetkiyi sunucu denetler.</summary>
public static class CanliCommands
{
    private static Task<string?> DosyaSecAsync()
    {
        var tcs = new TaskCompletionSource<string?>();
        var t = new Thread(() =>
        {
            try
            {
                using var d = new OpenFileDialog { Title = "Eski araç veritabanını seçin (gorevlendirme.db)", Filter = "SQLite veritabanı (*.db;*.sqlite)|*.db;*.sqlite|Tüm dosyalar|*.*", CheckFileExists = true };
                tcs.SetResult(d.ShowDialog() == DialogResult.OK ? d.FileName : null);
            }
            catch (Exception ex) { tcs.SetException(ex); }
        });
        t.SetApartmentState(ApartmentState.STA);
        t.IsBackground = true;
        t.Start();
        return tcs.Task;
    }

    private static string? OptS(JsonElement a, string k) =>
        a.ValueKind == JsonValueKind.Object && a.TryGetProperty(k, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() : null;

    public static void Register(CommandRegistry r)
    {
        r.Register("canliKontrol", async (st, a) => await CanliService.KontrolAsync(st.RequireSql), kapiGerekli: true);
        r.Register("canliyaGec", async (st, a) => { await CanliService.CanliyaGecAsync(st.RequireSql, Args.S(a, "onay"), OptS(a, "minSurum")); return (object?)new { tamam = true }; }, kapiGerekli: true);
        r.Register("eskiAktarDurum", async (st, a) => await CanliService.DurumAsync(st.RequireSql), kapiGerekli: true);
        r.Register("eskiAktar", async (st, a) =>
        {
            var sql = st.RequireSql;
            var kadro = await KadroService.KisilerAsync(sql);          // yönetici değilse 50023; dosya açılmadan reddedilir
            var yol = await DosyaSecAsync();
            if (yol == null) return new { iptal = true, dosya = (string?)null, ozet = (string?)null, sonuc = (object?)null };
            var plan = await Task.Run(() => EskiAktarim.Planla(EskiVeriOkuyucu.Oku(yol), kadro));
            var sonuc = await CanliService.AktarAsync(sql, plan.Json);
            return new { iptal = false, dosya = (string?)Path.GetFileName(yol), ozet = (string?)plan.Ozet, sonuc = (object?)sonuc };
        }, kapiGerekli: true);
        r.Register("eskiAktarGeriAl", async (st, a) => { await CanliService.GeriAlAsync(st.RequireSql, Args.S(a, "onay")); return (object?)new { tamam = true }; }, kapiGerekli: true);
    }
}
