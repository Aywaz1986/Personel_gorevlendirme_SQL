namespace Gorevlendirme;

/// <summary>Dilim 11 komutları: talep iletişim/saha notu, rozet sayaçları, ikame uyarıları.</summary>
public static class SenaryoCommands
{
    public static void Register(CommandRegistry r)
    {
        r.Register("talepIletisim", async (st, a) => await SenaryoService.IletisimAsync(st.RequireSql, Args.I(a, "talepId")), kapiGerekli: true);
        r.Register("sayaclar", async (st, a) => await SenaryoService.SayaclarAsync(st.RequireSql), kapiGerekli: true);
        r.Register("ikameBekleyenler", async (st, a) => await SenaryoService.IkameBekleyenlerAsync(st.RequireSql), kapiGerekli: true);
    }
}
