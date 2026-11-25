namespace Gorevlendirme;

public static class BaglantiCommands
{
    public static void Register(CommandRegistry r)
    {
        // Kayıtlı bağlantı (ortak dosya, yoksa kullanıcıya özel) varsa bağlanır; yoksa arayüz formu gösterir.
        r.Register("baglantiDene", async (st, a) =>
        {
            var (c, kaynak) = SharedConnection.LoadKaynakli();
            if (c is null) { c = ConnectionStore.Load(); kaynak = c is null ? null : "yerel"; }
            if (c is null) return new { kayit = false };
            return (object?)await BaglanAsync(st, c, kaydet: false, kaynak);
        });

        // Bağlantı yokken de çağrılır: kayıt var mı, hangi kaynaktan, yüzen pencerenin kurum varsayılan konumu. Sunucu adı DÖNMEZ.
        r.Register("baglantiBilgi", (st, a) =>
        {
            var (c, kaynak) = SharedConnection.LoadKaynakli();
            if (c is null) { c = ConnectionStore.Load(); kaynak = c is null ? null : "yerel"; }
            return Task.FromResult<object?>(new { kayit = c is not null, kaynak, pencere = PencereKonumu.Read() });
        });

        // Yönetici: bu bilgisayarın (exe klasörünün) varsayılan bağlantısı. Yalnızca etkin Yönetici yazabilir.
        r.Register("varsayilanBaglantiYaz", async (st, a) =>
        {
            await YoneticiAsync(st);
            var server = Args.S(a, "server").Trim(); var db = Args.S(a, "database").Trim();
            var hata = SharedConnection.Dogrula(server, db);
            if (hata is not null) throw new GorevException("dogrulama", hata);
            try { SharedConnection.Write(SharedConnection.DefaultPath, server, db, Args.B(a, "encrypt", true), Args.B(a, "trust")); }
            catch (Exception ex) when (ex is UnauthorizedAccessException or IOException)
            { throw new GorevException("dosya", "Varsayılan bağlantı dosyası yazılamadı (" + SharedConnection.DefaultPath + "): " + ex.Message); }
            return (object?)new { tamam = true, yol = SharedConnection.DefaultPath };
        }, kapiGerekli: true);

        r.Register("varsayilanBaglantiSil", async (st, a) =>
        {
            await YoneticiAsync(st);
            try { return (object?)new { tamam = true, silindi = SharedConnection.Delete(SharedConnection.DefaultPath) }; }
            catch (Exception ex) when (ex is UnauthorizedAccessException or IOException)
            { throw new GorevException("dosya", "Varsayılan bağlantı dosyası silinemedi: " + ex.Message); }
        }, kapiGerekli: true);

        r.Register("varsayilanBaglantiDurum", async (st, a) =>
        {
            await YoneticiAsync(st);
            var o = SharedConnection.Read(SharedConnection.DefaultPath);
            return (object?)new { mevcut = o is not null, yol = SharedConnection.DefaultPath, sunucu = o?.Server, veritabani = o?.Database,
                ozlukDosyasi = SharedConnection.Read(SharedConnection.OzlukPath) is not null };
        }, kapiGerekli: true);

        // Yönetici: yüzen pencerenin konumunu tüm kullanıcılar için varsayılan yapar (x,y,w,h) ya da kaldırır (sil=true).
        r.Register("pencereKonumYaz", async (st, a) =>
        {
            await YoneticiAsync(st);
            try
            {
                if (Args.B(a, "sil")) return (object?)new { tamam = true, silindi = PencereKonumu.Delete(PencereKonumu.DefaultPath) };
                var k = new PencereKonumu.Konum(Args.I(a, "x"), Args.I(a, "y"), Args.I(a, "w"), Args.I(a, "h"));
                if (!PencereKonumu.Gecerli(k)) throw new GorevException("dogrulama", "Konum geçersiz.");
                PencereKonumu.Write(PencereKonumu.DefaultPath, k);
                return (object?)new { tamam = true };
            }
            catch (Exception ex) when (ex is UnauthorizedAccessException or IOException)
            { throw new GorevException("dosya", "Konum dosyası yazılamadı: " + ex.Message); }
        }, kapiGerekli: true);

        r.Register("baglan", async (st, a) =>
        {
            var server = Args.S(a, "server").Trim();
            var db = Args.S(a, "database").Trim();
            var dh = SharedConnection.Dogrula(server, db);
            if (dh is not null) throw new GorevException("dogrulama", dh);
            var c = new ConnInfo(server, db, true, "", "", Args.B(a, "encrypt", true), Args.B(a, "trust"));
            return (object?)await BaglanAsync(st, c, Args.B(a, "kaydet", true), "form");
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

    private static async Task YoneticiAsync(AppState st)
    {
        var k = await KimlikService.BenAsync(st.RequireSql);
        if (!k.Kayitli || !k.Yonetici) throw new GorevException("yetki", "Bu işlem yalnızca Merkez Yönetici içindir.");
    }

    private static async Task<object> BaglanAsync(AppState st, ConnInfo c, bool kaydet, string? kaynak)
    {
        var sql = new SqlService(c);
        object info;
        try { info = await sql.InfoAsync(); }
        catch (Exception ex) { throw new GorevException("baglanti", "Bağlanılamadı: " + ex.Message); }
        st.Sql = sql;
        if (kaydet) ConnectionStore.Save(c);
        return new { kayit = true, bagli = true, kaynak, info, sunucu = c.Server, veritabani = c.Database };
    }
}
