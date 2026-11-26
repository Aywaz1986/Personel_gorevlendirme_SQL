using System.Text.Json;
using System.Windows.Forms;

namespace Gorevlendirme;

/// <summary>Haftalık matris komutları (Dilim 6): okuma ve Excel çıktısı. Yetkiyi sunucu denetler (kayıtlı her rol).</summary>
public static class MatrisCommands
{
    private static string? OptS(JsonElement a, string k) =>
        a.ValueKind == JsonValueKind.Object && a.TryGetProperty(k, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() : null;
    private static bool OptB(JsonElement a, string k, bool varsayilan) =>
        a.ValueKind == JsonValueKind.Object && a.TryGetProperty(k, out var v) && (v.ValueKind == JsonValueKind.True || v.ValueKind == JsonValueKind.False) ? v.GetBoolean() : varsayilan;

    /// <summary>Kayıt penceresi STA iş parçacığında açılır. İptalde null.</summary>
    private static Task<string?> KayitYoluAsync(string ad)
    {
        var tcs = new TaskCompletionSource<string?>();
        var t = new Thread(() =>
        {
            try
            {
                using var d = new SaveFileDialog { Title = "Haftalık matrisi kaydet", Filter = "Excel çalışma kitabı (*.xlsx)|*.xlsx", FileName = ad, OverwritePrompt = true };
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
        r.Register("matrisHafta", async (st, a) => await MatrisService.HaftaAsync(st.RequireSql, Args.S(a, "bas"), OptS(a, "bolum"), OptS(a, "ana"), OptS(a, "q"), OptB(a, "sadeceGorevli", true), OptS(a, "konum"), OptB(a, "sadeceMusait", false), OptB(a, "sadeceSaha", false)), kapiGerekli: true);
        r.Register("matrisSurum", async (st, a) => (object?)new { surum = await MatrisService.SurumAsync(st.RequireSql, Args.S(a, "bas")) }, kapiGerekli: true);
        r.Register("matrisBolumler", async (st, a) => await MatrisService.BolumlerAsync(st.RequireSql), kapiGerekli: true);
        r.Register("matrisExcel", async (st, a) =>
        {
            var sql = st.RequireSql;
            var bas = Args.S(a, "bas");
            var satirlar = await sql.ProcAsync("gorev.sp_matris_hafta", ("@bas", bas), ("@bolum", OptS(a, "bolum")), ("@ana", OptS(a, "ana")), ("@q", OptS(a, "q")), ("@sadece_gorevli", OptB(a, "sadeceGorevli", true)), ("@konum", OptS(a, "konum")), ("@sadece_musait", OptB(a, "sadeceMusait", false)), ("@sadece_saha", OptB(a, "sadeceSaha", false)));
            var pzt = DateTime.ParseExact(bas, "yyyy-MM-dd", null).Date;
            pzt = pzt.AddDays(-(((int)pzt.DayOfWeek + 6) % 7));
            var tablo = MatrisExcel.Tablo(pzt, satirlar.Select(r => (Convert.ToString(r["sicil_no"]) ?? "", Convert.ToString(r["adi_soyadi"]) ?? "", Convert.ToString(r["bolum"]) ?? "", r["hucreler_json"] as string, r["izinler_json"] as string)));
            var yol = await KayitYoluAsync("haftalik-matris-" + pzt.ToString("yyyy-MM-dd") + ".xlsx");
            if (yol == null) return (object?)new { iptal = true };
            await File.WriteAllBytesAsync(yol, MatrisExcel.Xlsx(tablo));
            return (object?)new { iptal = false, yol, satir = tablo.Count - 1 };
        }, kapiGerekli: true);
    }
}
