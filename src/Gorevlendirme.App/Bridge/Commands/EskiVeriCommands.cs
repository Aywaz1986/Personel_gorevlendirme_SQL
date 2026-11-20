using System.Windows.Forms;

namespace Gorevlendirme;

/// <summary>Eski araç verisi: yalnız salt okunur kuru çalıştırma raporu (Dilim 3b). Hiçbir şey yazılmaz. Yetkiyi sunucu denetler (kadro listesi yalnız Merkez Yönetici'ye açıktır).</summary>
public static class EskiVeriCommands
{
    /// <summary>Dosya seçim penceresi STA iş parçacığında açılır. İptalde null.</summary>
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

    public static void Register(CommandRegistry r)
    {
        r.Register("eskiVeriDenetle", async (st, a) =>
        {
            var sql = st.RequireSql;
            var kadro = await KadroService.KisilerAsync(sql);          // yönetici değilse sunucu 50023 verir; dosya açılmadan reddedilir
            var havuz = await HavuzService.DuzListeAsync(sql);
            var yol = await DosyaSecAsync();
            if (yol == null) return new { iptal = true };
            var maskele = a.ValueKind == System.Text.Json.JsonValueKind.Object && a.TryGetProperty("maskele", out var m) && m.ValueKind == System.Text.Json.JsonValueKind.False ? false : true;
            var rapor = await Task.Run(() => EskiVeriDenetimi.Raporla(EskiVeriOkuyucu.Oku(yol), kadro, havuz, maskele));
            return new { iptal = false, dosya = Path.GetFileName(yol), sayilar = rapor.Sayilar, metin = rapor.Metin };
        }, kapiGerekli: true);
    }
}
