namespace Gorevlendirme;

public static class SemaCommands
{
    public static void Register(CommandRegistry r)
    {
        // Sürüm kapısı: uygulama / asgari sürüm / şema sürümü. Sonuç AppState.Engel'e işlenir.
        r.Register("surumDurum", async (st, a) =>
        {
            var sql = st.RequireSql;
            var hedef = Migrator.Scripts().Max(s => s.Surum);
            var b = await SurumBilgisi.OkuAsync(sql);
            var s = Surum.Denetle(AppInfo.Version, b?.MinUygulamaSurumu, b?.SemaSurumu, hedef);
            st.Engel = s.Engelle ? s.Mesaj : null;
            return (object?)new
            {
                durum = s.Durum, mesaj = s.Mesaj, engelle = s.Engelle,
                uygulama = AppInfo.Version, hedefSema = hedef,
                sema = b?.SemaSurumu, asgari = b?.MinUygulamaSurumu, ortam = b?.Ortam, hesap = b?.Hesap,
                pollingSaniye = b?.PollingSaniye ?? 30,
            };
        });

        // Yönetici (db_owner) yetkisi gerektirir; yetki yoksa SQL Server hata mesajı arayüze döner.
        r.Register("semaDurum", async (st, a) => await new Migrator(st.RequireSql).DurumAsync());
        r.Register("semaUygula", async (st, a) => await new Migrator(st.RequireSql).UygulaAsync(Args.B(a, "zorla")));
        r.Register("sunucuDenetimi", async (st, a) => await SunucuDenetimi.CalistirAsync(st.RequireSql));
    }
}
