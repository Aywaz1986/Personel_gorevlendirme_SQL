using System.Text.Json;

namespace Gorevlendirme;

/// <summary>Atama, ret ve bildirim komutları (Dilim 5). Yetkiyi sunucu denetler.</summary>
public static class AtamaCommands
{
    private static string? OptS(JsonElement a, string k) =>
        a.ValueKind == JsonValueKind.Object && a.TryGetProperty(k, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() : null;

    private static List<AtamaService.AtamaGirdisi> Atamalar(JsonElement a)
    {
        var l = new List<AtamaService.AtamaGirdisi>();
        if (a.ValueKind != JsonValueKind.Object || !a.TryGetProperty("atamalar", out var arr) || arr.ValueKind != JsonValueKind.Array) return l;
        foreach (var e in arr.EnumerateArray()) l.Add(new AtamaService.AtamaGirdisi(Args.S(e, "sicil"), Args.S(e, "tarih"), Args.S(e, "zaman")));
        return l;
    }

    public static void Register(CommandRegistry r)
    {
        r.Register("atamaAdaylar", async (st, a) => await AtamaService.AdaylarAsync(st.RequireSql, Args.I(a, "talepId"), OptS(a, "q")), kapiGerekli: true);
        r.Register("atamaCakismaKontrol", async (st, a) => await AtamaService.CakismaKontrolAsync(st.RequireSql, Args.I(a, "talepId"), Atamalar(a)), kapiGerekli: true);
        r.Register("atamaOnayla", async (st, a) => await AtamaService.OnaylaAsync(st.RequireSql, Args.I(a, "talepId"), Atamalar(a), OptS(a, "karar") ?? "REDDET"), kapiGerekli: true);
        r.Register("talepReddet", async (st, a) =>
        {
            await AtamaService.ReddetAsync(st.RequireSql, Args.I(a, "id"), Args.S(a, "neden"));
            return (object?)new { tamam = true };
        }, kapiGerekli: true);
        r.Register("bildirimListe", async (st, a) => await AtamaService.BildirimListeAsync(st.RequireSql, !(a.ValueKind == JsonValueKind.Object && a.TryGetProperty("hepsi", out var h) && h.ValueKind == JsonValueKind.True)), kapiGerekli: true);
        r.Register("bildirimOkundu", async (st, a) =>
        {
            int? id = a.ValueKind == JsonValueKind.Object && a.TryGetProperty("id", out var v) && v.ValueKind == JsonValueKind.Number ? v.GetInt32() : null;
            await AtamaService.BildirimOkunduAsync(st.RequireSql, id);
            return (object?)new { tamam = true };
        }, kapiGerekli: true);
    }
}
