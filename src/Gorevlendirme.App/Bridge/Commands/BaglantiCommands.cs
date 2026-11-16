namespace Gorevlendirme;

public static class BaglantiCommands
{
    public static void Register(CommandRegistry r)
    {
        // Kayıtlı bağlantı (ortak dosya, yoksa kullanıcıya özel) varsa bağlanır; yoksa arayüz formu gösterir.
        r.Register("baglantiDene", async (st, a) =>
        {
            var c = SharedConnection.Load() ?? ConnectionStore.Load();
            if (c is null) return new { kayit = false };
            return (object?)await BaglanAsync(st, c, kaydet: false);
        });

        r.Register("baglan", async (st, a) =>
        {
            var server = Args.S(a, "server").Trim();
            var db = Args.S(a, "database").Trim();
            if (server.Length == 0 || db.Length == 0 || server.Length > 200 || db.Length > 128
                || server.Any(char.IsControl) || db.Any(char.IsControl))
                throw new GorevException("dogrulama", "Sunucu ve veritabanı adı geçerli olmalı.");
            var c = new ConnInfo(server, db, true, "", "", Args.B(a, "encrypt", true), Args.B(a, "trust"));
            return (object?)await BaglanAsync(st, c, Args.B(a, "kaydet", true));
        });

        r.Register("baglantiKapat", (st, a) =>
        {
            st.Sql = null; st.Engel = null;
            return Task.FromResult<object?>(new { tamam = true });
        });

        r.Register("baglantiUnut", (st, a) =>
        {
            ConnectionStore.Clear();
            st.Sql = null; st.Engel = null;
            return Task.FromResult<object?>(new { tamam = true });
        });
    }

    private static async Task<object> BaglanAsync(AppState st, ConnInfo c, bool kaydet)
    {
        var sql = new SqlService(c);
        object info;
        try { info = await sql.InfoAsync(); }
        catch (Exception ex) { throw new GorevException("baglanti", "Bağlanılamadı: " + ex.Message); }
        st.Sql = sql;
        if (kaydet) ConnectionStore.Save(c);
        return new { kayit = true, bagli = true, info, sunucu = c.Server, veritabani = c.Database };
    }
}
