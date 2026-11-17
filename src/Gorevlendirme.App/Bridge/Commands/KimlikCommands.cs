namespace Gorevlendirme;

/// <summary>Kimlik, kadro, eşleştirme ve istisna komutları. Hepsi sürüm kapısına tabidir; yetkiyi sunucu denetler.</summary>
public static class KimlikCommands
{
    public static void Register(CommandRegistry r)
    {
        r.Register("ben", async (st, a) =>
        {
            var k = await KimlikService.BenAsync(st.RequireSql);
            var gorunumler = Gorunum.Liste(k.Yonetici, k.Sorumlu, k.Saha);
            return (object?)new
            {
                hesap = k.Hesap, kayitli = k.Kayitli, adiSoyadi = k.AdiSoyadi, sicilNo = k.SicilNo, bolum = k.Bolum,
                yonetici = k.Yonetici, sorumlu = k.Sorumlu, saha = k.Saha, kaynak = k.Kaynak,
                gorunumler, varsayilan = Gorunum.Varsayilan(gorunumler, Args.S(a, "tercih")),
            };
        }, kapiGerekli: true);

        r.Register("kadroOzet", async (st, a) => await KadroService.OzetAsync(st.RequireSql), kapiGerekli: true);
        r.Register("kadroListe", async (st, a) => await KadroService.ListeAsync(st.RequireSql), kapiGerekli: true);
        r.Register("kadroEsitle", async (st, a) => await KadroService.EsitleAsync(st.RequireSql), kapiGerekli: true);

        r.Register("eslestirmeListe", async (st, a) => await KadroService.EslestirmeListeAsync(st.RequireSql), kapiGerekli: true);
        r.Register("eslestirmeKaydet", async (st, a) =>
        {
            await KadroService.EslestirmeKaydetAsync(st.RequireSql, Args.S(a, "bolum"), Args.S(a, "rol"));
            return (object?)new { tamam = true };
        }, kapiGerekli: true);

        r.Register("istisnaListe", async (st, a) => await KadroService.IstisnaListeAsync(st.RequireSql), kapiGerekli: true);
        r.Register("istisnaKaydet", async (st, a) =>
        {
            await KadroService.IstisnaKaydetAsync(st.RequireSql, Args.S(a, "hesap"), Args.S(a, "sicilNo"),
                Args.B(a, "yonetici"), Args.B(a, "sorumlu"), Args.B(a, "saha"), Args.B(a, "aktif", true), Args.S(a, "aciklama"));
            return (object?)new { tamam = true };
        }, kapiGerekli: true);
        r.Register("istisnaSil", async (st, a) =>
        {
            await KadroService.IstisnaSilAsync(st.RequireSql, Args.S(a, "hesap"));
            return (object?)new { tamam = true };
        }, kapiGerekli: true);
    }
}
