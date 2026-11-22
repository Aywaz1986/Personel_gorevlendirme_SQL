using System.Text.Json;
using System.Windows.Forms;

namespace Gorevlendirme;

/// <summary>İzin, rapor ve kişisel görev komutları (Dilim 7). Yetkiyi sunucu denetler. Rapor evrakı dosya yolundan C# tarafında okunur (arayüzden bayt taşınmaz).</summary>
public static class IzinRaporCommands
{
    private static string? OptS(JsonElement a, string k) =>
        a.ValueKind == JsonValueKind.Object && a.TryGetProperty(k, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() : null;

    private static List<IzinRaporService.GunGirdisi> Gunler(JsonElement a)
    {
        var l = new List<IzinRaporService.GunGirdisi>();
        if (a.ValueKind != JsonValueKind.Object || !a.TryGetProperty("gunler", out var arr) || arr.ValueKind != JsonValueKind.Array) return l;
        foreach (var e in arr.EnumerateArray()) l.Add(new IzinRaporService.GunGirdisi(Args.S(e, "tarih"), Args.S(e, "zaman")));
        return l;
    }

    private static Task<T> Sta<T>(Func<T> f)
    {
        var tcs = new TaskCompletionSource<T>();
        var t = new Thread(() => { try { tcs.SetResult(f()); } catch (Exception ex) { tcs.SetException(ex); } });
        t.SetApartmentState(ApartmentState.STA); t.IsBackground = true; t.Start();
        return tcs.Task;
    }

    public static void Register(CommandRegistry r)
    {
        r.Register("izinKaydet", async (st, a) => await IzinRaporService.IzinKaydetAsync(st.RequireSql, OptS(a, "sicil"), Args.S(a, "tur"), OptS(a, "aciklama"), Gunler(a), OptS(a, "karar") ?? "REDDET"), kapiGerekli: true);
        r.Register("izinOnayla", async (st, a) => await IzinRaporService.IzinOnaylaAsync(st.RequireSql, Args.I(a, "id"), OptS(a, "karar") ?? "REDDET"), kapiGerekli: true);
        r.Register("izinReddet", async (st, a) => { await IzinRaporService.IzinReddetAsync(st.RequireSql, Args.I(a, "id"), Args.S(a, "neden")); return (object?)new { tamam = true }; }, kapiGerekli: true);
        r.Register("izinGeriCek", async (st, a) => { await IzinRaporService.IzinGeriCekAsync(st.RequireSql, Args.I(a, "id")); return (object?)new { tamam = true }; }, kapiGerekli: true);
        r.Register("izinKisalt", async (st, a) => { await IzinRaporService.IzinKisaltAsync(st.RequireSql, Args.I(a, "id"), Args.S(a, "yeniSon")); return (object?)new { tamam = true }; }, kapiGerekli: true);
        r.Register("izinListe", async (st, a) => await IzinRaporService.IzinListeAsync(st.RequireSql, OptS(a, "durum"), OptS(a, "sicil")), kapiGerekli: true);

        r.Register("raporEvrakSec", async (st, a) =>
        {
            var yol = await Sta<string?>(() =>
            {
                using var d = new OpenFileDialog { Title = "Rapor evrakını seçin", Filter = "Rapor evrakı (*.pdf;*.jpg;*.jpeg;*.png)|*.pdf;*.jpg;*.jpeg;*.png", CheckFileExists = true };
                return d.ShowDialog() == DialogResult.OK ? d.FileName : null;
            });
            if (yol == null) return (object?)new { iptal = true };
            var fi = new FileInfo(yol);
            if (fi.Length > IzinRaporService.EvrakEnFazlaBayt) throw new GorevException("dogrulama", "Rapor evrakı en fazla 10 MB olabilir.");
            return (object?)new { iptal = false, yol, ad = fi.Name, boyut = fi.Length };
        }, kapiGerekli: true);
        r.Register("raporKaydet", async (st, a) =>
        {
            var yol = Args.S(a, "evrakYol");
            if (string.IsNullOrWhiteSpace(yol) || !File.Exists(yol)) throw new GorevException("dogrulama", "Rapor evrakı seçilmemiş ya da dosya bulunamadı.");
            return await IzinRaporService.RaporKaydetAsync(st.RequireSql, OptS(a, "sicil"), Args.S(a, "ilkTarih"), Args.S(a, "sonTarih"), OptS(a, "aciklama"), await File.ReadAllBytesAsync(yol), Path.GetFileName(yol));
        }, kapiGerekli: true);
        r.Register("raporIptal", async (st, a) => { await IzinRaporService.RaporIptalAsync(st.RequireSql, Args.I(a, "id"), Args.S(a, "neden")); return (object?)new { tamam = true }; }, kapiGerekli: true);
        r.Register("raporListe", async (st, a) => await IzinRaporService.RaporListeAsync(st.RequireSql, OptS(a, "sicil"), Args.B(a, "iptalDahil")), kapiGerekli: true);
        r.Register("raporEvrakKaydet", async (st, a) =>
        {
            var (veri, ad) = await IzinRaporService.RaporEvrakAsync(st.RequireSql, Args.I(a, "id"));
            var yol = await Sta<string?>(() =>
            {
                using var d = new SaveFileDialog { Title = "Rapor evrakını kaydet", FileName = ad, OverwritePrompt = true };
                return d.ShowDialog() == DialogResult.OK ? d.FileName : null;
            });
            if (yol == null) return (object?)new { iptal = true };
            await File.WriteAllBytesAsync(yol, veri);
            return (object?)new { iptal = false, yol };
        }, kapiGerekli: true);
        r.Register("gorevlerim", async (st, a) => await IzinRaporService.GorevlerimAsync(st.RequireSql, OptS(a, "bas"), OptS(a, "bit")), kapiGerekli: true);
    }
}
