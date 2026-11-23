using System.Text.Json;

namespace Gorevlendirme;

/// <summary>Görev iptali, erken bitiş, çıkarma, ikame, revize ve sorumlu devri komutları (Dilim 8). Yetkiyi sunucu denetler.</summary>
public static class RevizeCommands
{
    private static string? OptS(JsonElement a, string k) =>
        a.ValueKind == JsonValueKind.Object && a.TryGetProperty(k, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() : null;

    private static int? OptI(JsonElement a, string k) =>
        a.ValueKind == JsonValueKind.Object && a.TryGetProperty(k, out var v) && v.ValueKind == JsonValueKind.Number && v.TryGetInt32(out var i) ? i : null;

    private static List<int>? Cikar(JsonElement a)
    {
        if (a.ValueKind != JsonValueKind.Object || !a.TryGetProperty("cikar", out var arr) || arr.ValueKind != JsonValueKind.Array) return null;
        return arr.EnumerateArray().Where(x => x.ValueKind == JsonValueKind.Number && x.TryGetInt32(out _)).Select(x => x.GetInt32()).ToList();
    }

    private static List<RevizeService.GunGirdisi>? Gunler(JsonElement a)
    {
        if (a.ValueKind != JsonValueKind.Object || !a.TryGetProperty("gunler", out var arr) || arr.ValueKind != JsonValueKind.Array) return null;
        var l = new List<RevizeService.GunGirdisi>();
        foreach (var e in arr.EnumerateArray()) l.Add(new RevizeService.GunGirdisi(Args.S(e, "tarih"), Args.S(e, "zaman"), Args.I(e, "kisi")));
        return l;
    }

    public static void Register(CommandRegistry r)
    {
        r.Register("talepIptal", async (st, a) => { await RevizeService.IptalAsync(st.RequireSql, Args.I(a, "id"), Args.S(a, "neden")); return (object?)new { tamam = true }; }, kapiGerekli: true);
        r.Register("talepErkenBitir", async (st, a) => await RevizeService.ErkenBitirAsync(st.RequireSql, Args.I(a, "id"), Args.S(a, "yeniSon"), Args.S(a, "neden")), kapiGerekli: true);
        r.Register("atamaCikar", async (st, a) => await RevizeService.CikarAsync(st.RequireSql, Args.I(a, "talepId"), Args.S(a, "sicil"), OptS(a, "tarih"), OptS(a, "zaman"), Args.S(a, "neden")), kapiGerekli: true);
        r.Register("atamaIkame", async (st, a) => await RevizeService.IkameAsync(st.RequireSql, Args.I(a, "talepId"), Args.S(a, "eski"), Args.S(a, "yeni"), OptS(a, "bastan"), OptS(a, "karar") ?? "REDDET", OptS(a, "neden")), kapiGerekli: true);
        r.Register("sorumluDevret", async (st, a) => { await RevizeService.DevretAsync(st.RequireSql, Args.I(a, "talepId"), Args.S(a, "yeniSicil"), OptS(a, "neden")); return (object?)new { tamam = true }; }, kapiGerekli: true);
        r.Register("sorumluDevirListe", async (st, a) => await RevizeService.DevirListeAsync(st.RequireSql, Args.I(a, "talepId")), kapiGerekli: true);
        r.Register("revizeIste", async (st, a) => await RevizeService.ReviziteAsync(st.RequireSql, Args.I(a, "talepId"), OptS(a, "gorevMetni"), OptS(a, "nitelik"), OptS(a, "saatBaslangic"), OptS(a, "saatBitis"), Gunler(a), OptS(a, "neden")), kapiGerekli: true);
        r.Register("revizeOnayla", async (st, a) => await RevizeService.RevizeOnaylaAsync(st.RequireSql, Args.I(a, "id"), Cikar(a)), kapiGerekli: true);
        r.Register("revizeFazlalik", async (st, a) => await RevizeService.FazlalikAsync(st.RequireSql, Args.I(a, "id")), kapiGerekli: true);
        r.Register("revizeMusaitlik", async (st, a) => await RevizeService.MusaitlikAsync(st.RequireSql, Args.I(a, "id")), kapiGerekli: true);
        r.Register("revizeReddet", async (st, a) => { await RevizeService.RevizeReddetAsync(st.RequireSql, Args.I(a, "id"), Args.S(a, "neden")); return (object?)new { tamam = true }; }, kapiGerekli: true);
        r.Register("revizeGeriCek", async (st, a) => { await RevizeService.RevizeGeriCekAsync(st.RequireSql, Args.I(a, "id")); return (object?)new { tamam = true }; }, kapiGerekli: true);
        r.Register("revizeListe", async (st, a) => await RevizeService.RevizeListeAsync(st.RequireSql, OptI(a, "talepId"), OptS(a, "durum")), kapiGerekli: true);
    }
}
