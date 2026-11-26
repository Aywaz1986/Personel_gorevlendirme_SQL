using System.Text.Json;

namespace Gorevlendirme;

/// <summary>Görev talebi komutları (Dilim 4). Hepsi sürüm kapısına tabidir; yetkiyi sunucu denetler.</summary>
public static class TalepCommands
{
    private static int? OptInt(JsonElement a, string k) =>
        a.ValueKind == JsonValueKind.Object && a.TryGetProperty(k, out var v) && v.ValueKind == JsonValueKind.Number && v.TryGetInt32(out var n) ? n : null;

    private static string? OptS(JsonElement a, string k) =>
        a.ValueKind == JsonValueKind.Object && a.TryGetProperty(k, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() : null;

    private static List<TalepService.GunGirdisi> Gunler(JsonElement a)
    {
        var l = new List<TalepService.GunGirdisi>();
        if (a.ValueKind != JsonValueKind.Object || !a.TryGetProperty("gunler", out var arr) || arr.ValueKind != JsonValueKind.Array) return l;
        foreach (var e in arr.EnumerateArray())
            l.Add(new TalepService.GunGirdisi(Args.S(e, "tarih"), Args.S(e, "zaman"), Args.I(e, "kisi")));
        return l;
    }

    private static List<string> Oneri(JsonElement a)
    {
        var l = new List<string>();
        if (a.ValueKind != JsonValueKind.Object || !a.TryGetProperty("oneri", out var arr) || arr.ValueKind != JsonValueKind.Array) return l;
        foreach (var e in arr.EnumerateArray())
            if (e.ValueKind == JsonValueKind.String && e.GetString() is { Length: > 0 } s) l.Add(s);
        return l;
    }

    public static void Register(CommandRegistry r)
    {
        r.Register("personelAra", async (st, a) => await TalepService.PersonelAraAsync(st.RequireSql, Args.S(a, "q")), kapiGerekli: true);
        r.Register("talepAtananAdlar", async (st, a) => await TalepService.AtananAdlarAsync(st.RequireSql), kapiGerekli: true);
        r.Register("izinRaporBilgi", async (st, a) => await TalepService.IzinRaporBilgiAsync(st.RequireSql, a.ValueKind == JsonValueKind.Object && a.TryGetProperty("gun", out var g) && g.TryGetInt32(out var gi) ? gi : 14), kapiGerekli: true);
        r.Register("talepListe", async (st, a) => await TalepService.ListeAsync(st.RequireSql, OptS(a, "durum")), kapiGerekli: true);
        r.Register("talepGetir", async (st, a) => await TalepService.GetirAsync(st.RequireSql, Args.I(a, "id")), kapiGerekli: true);
        r.Register("talepKaydet", async (st, a) => await TalepService.KaydetAsync(st.RequireSql, OptInt(a, "id"), OptS(a, "sorumluSicil"),
            Args.S(a, "ana"), OptS(a, "alt"), Args.S(a, "faaliyet"), Args.S(a, "konum"), Args.S(a, "saatBaslangic"), Args.S(a, "saatBitis"),
            Args.S(a, "gorevMetni"), OptS(a, "nitelik"), Gunler(a), Oneri(a), Args.B(a, "gonder")), kapiGerekli: true);
        r.Register("talepGeriCek", async (st, a) =>
        {
            await TalepService.GeriCekAsync(st.RequireSql, Args.I(a, "id"));
            return (object?)new { tamam = true };
        }, kapiGerekli: true);
    }
}
