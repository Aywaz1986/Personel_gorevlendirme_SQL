using System.Text.Json;

namespace Gorevlendirme;

/// <summary>Proje havuzu ve akademik takvim komutları. Hepsi sürüm kapısına tabidir; yetkiyi sunucu denetler.</summary>
public static class HavuzTakvimCommands
{
    private static int? OptInt(JsonElement a, string k) =>
        a.ValueKind == JsonValueKind.Object && a.TryGetProperty(k, out var v) && v.ValueKind == JsonValueKind.Number && v.TryGetInt32(out var n) ? n : null;

    private static string? OptS(JsonElement a, string k) =>
        a.ValueKind == JsonValueKind.Object && a.TryGetProperty(k, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() : null;

    private static List<TakvimSatir> Satirlar(JsonElement a)
    {
        var l = new List<TakvimSatir>();
        if (a.ValueKind != JsonValueKind.Object || !a.TryGetProperty("satirlar", out var arr) || arr.ValueKind != JsonValueKind.Array) return l;
        foreach (var e in arr.EnumerateArray())
            l.Add(new TakvimSatir(Args.I(e, "sira"), Args.S(e, "baslangic"), Args.S(e, "bitis"), Args.S(e, "zaman"), Args.S(e, "tur"), Args.S(e, "ad"), Args.B(e, "yillik")));
        return l;
    }

    private static object Okuma(TakvimOkuma o) => new { satirlar = o.Satirlar, yil = o.Yil, mod = o.Mod };

    public static void Register(CommandRegistry r)
    {
        r.Register("havuzEfor", async (st, a) => await HavuzService.EforAsync(st.RequireSql), kapiGerekli: true);
        r.Register("havuzListe", async (st, a) => await HavuzService.ListeAsync(st.RequireSql), kapiGerekli: true);
        r.Register("havuzEkle", async (st, a) => await HavuzService.EkleAsync(st.RequireSql, OptInt(a, "ustId"), Args.S(a, "ad")), kapiGerekli: true);
        r.Register("havuzAdlandir", async (st, a) =>
        {
            await HavuzService.AdlandirAsync(st.RequireSql, Args.I(a, "id"), Args.S(a, "ad"));
            return (object?)new { tamam = true };
        }, kapiGerekli: true);
        r.Register("havuzDurum", async (st, a) => await HavuzService.DurumAsync(st.RequireSql, Args.I(a, "id"), Args.B(a, "aktif")), kapiGerekli: true);
        r.Register("havuzArsiv", async (st, a) => await HavuzService.ArsivAsync(st.RequireSql, Args.I(a, "id"), Args.B(a, "arsiv"), OptS(a, "neden")), kapiGerekli: true);
        r.Register("havuzBirlestir", async (st, a) => await HavuzService.BirlestirAsync(st.RequireSql, Args.I(a, "kaynakId"), Args.I(a, "hedefId")), kapiGerekli: true);

        r.Register("takvimListe", async (st, a) => await TakvimService.ListeAsync(st.RequireSql, OptInt(a, "yil")), kapiGerekli: true);
        r.Register("takvimOzet", async (st, a) => await TakvimService.OzetAsync(st.RequireSql, Args.I(a, "yil")), kapiGerekli: true);
        r.Register("takvimKaydet", async (st, a) => await TakvimService.KaydetAsync(st.RequireSql, OptInt(a, "id"), Args.S(a, "baslangic"), Args.S(a, "bitis"), Args.S(a, "zaman"), Args.S(a, "tur"), Args.S(a, "ad"), Args.B(a, "yillik")), kapiGerekli: true);
        r.Register("takvimSil", async (st, a) =>
        {
            await TakvimService.SilAsync(st.RequireSql, Args.I(a, "id"));
            return (object?)new { tamam = true };
        }, kapiGerekli: true);

        // Dosya/yapıştırma → satırlar (sunucuya gitmez; yalnız biçim çevirir)
        r.Register("takvimMetinOku", (st, a) => Task.FromResult((object?)Okuma(TakvimCozumleyici.Oku(TakvimCozumleyici.MetinSatirlari(Args.S(a, "metin")), OptInt(a, "yil")))));
        r.Register("takvimXlsxOku", (st, a) =>
        {
            byte[] veri;
            try { veri = Convert.FromBase64String(Args.S(a, "base64")); }
            catch (FormatException) { throw new GorevException("dogrulama", "Dosya okunamadı."); }
            if (veri.Length > 10 * 1024 * 1024) throw new GorevException("dogrulama", "Dosya 10 MB'dan büyük.");
            return Task.FromResult((object?)Okuma(TakvimCozumleyici.Oku(XlsxOkuyucu.Oku(veri), OptInt(a, "yil"))));
        });
        r.Register("takvimOnizle", async (st, a) => await TakvimService.OnizleAsync(st.RequireSql, Satirlar(a)), kapiGerekli: true);
        r.Register("takvimUygula", async (st, a) => await TakvimService.UygulaAsync(st.RequireSql, Satirlar(a)), kapiGerekli: true);
    }
}
