namespace Gorevlendirme;

/// <summary>Dilim 11 komutları: talep iletişim/saha notu, rozet sayaçları, ikame uyarıları.</summary>
public static class SenaryoCommands
{
    private static string? Opt(System.Text.Json.JsonElement a, string k) =>
        a.ValueKind == System.Text.Json.JsonValueKind.Object && a.TryGetProperty(k, out var v) && v.ValueKind == System.Text.Json.JsonValueKind.String ? v.GetString() : null;

    public static void Register(CommandRegistry r)
    {
        r.Register("talepIletisim", async (st, a) => await SenaryoService.IletisimAsync(st.RequireSql, Args.I(a, "talepId")), kapiGerekli: true);
        r.Register("sayaclar", async (st, a) => await SenaryoService.SayaclarAsync(st.RequireSql), kapiGerekli: true);
        r.Register("rolPersonel", async (st, a) => await SenaryoService.RolPersonelAsync(st.RequireSql, Args.S(a, "rol"), a.ValueKind == System.Text.Json.JsonValueKind.Object && a.TryGetProperty("q", out var qv) && qv.ValueKind == System.Text.Json.JsonValueKind.String ? qv.GetString() : null), kapiGerekli: true);
        r.Register("logListe", async (st, a) => await SenaryoService.LogListeAsync(st.RequireSql, Opt(a, "bas"), Opt(a, "bit"), Opt(a, "islem"), Opt(a, "q"), a.ValueKind == System.Text.Json.JsonValueKind.Object && a.TryGetProperty("ust", out var uv) && uv.ValueKind == System.Text.Json.JsonValueKind.Number && uv.TryGetInt32(out var u) ? u : 500), kapiGerekli: true);
        r.Register("logIslemTurleri", async (st, a) => await SenaryoService.LogIslemTurleriAsync(st.RequireSql), kapiGerekli: true);
        r.Register("raporDuzelt", async (st, a) => await SenaryoService.RaporDuzeltAsync(st.RequireSql, Args.I(a, "id"), Args.S(a, "ilkTarih"), Args.S(a, "sonTarih"), Opt(a, "neden")), kapiGerekli: true);
        r.Register("ikameBekleyenler", async (st, a) => await SenaryoService.IkameBekleyenlerAsync(st.RequireSql), kapiGerekli: true);
    }
}
