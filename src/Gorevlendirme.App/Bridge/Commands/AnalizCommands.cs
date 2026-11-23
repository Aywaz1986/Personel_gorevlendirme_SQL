using System.Text.Json;

namespace Gorevlendirme;

/// <summary>Analiz ve arşiv komutları (Dilim 9). Yetki ve kapsam (Yönetici tümü, Sorumlu kendi talepleri) sunucudadır.</summary>
public static class AnalizCommands
{
    private static string? OptS(JsonElement a, string k) =>
        a.ValueKind == JsonValueKind.Object && a.TryGetProperty(k, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() : null;

    private static Task<string?> KayitYoluAsync(string ad)
    {
        var tcs = new TaskCompletionSource<string?>();
        var t = new Thread(() =>
        {
            try
            {
                using var d = new SaveFileDialog { Title = "Analizi kaydet", Filter = "Excel çalışma kitabı (*.xlsx)|*.xlsx", FileName = ad, OverwritePrompt = true };
                tcs.SetResult(d.ShowDialog() == DialogResult.OK ? d.FileName : null);
            }
            catch (Exception e) { tcs.SetException(e); }
        });
        t.SetApartmentState(ApartmentState.STA); t.IsBackground = true; t.Start();
        return tcs.Task;
    }

    public static void Register(CommandRegistry r)
    {
        r.Register("analizAnaProjeler", async (st, a) => await AnalizService.AnaProjelerAsync(st.RequireSql), kapiGerekli: true);
        r.Register("analizProje", async (st, a) => await AnalizService.ProjeAsync(st.RequireSql, Args.S(a, "bas"), Args.S(a, "bit"), OptS(a, "ana")), kapiGerekli: true);
        r.Register("analizKirilim", async (st, a) => await AnalizService.KirilimAsync(st.RequireSql, Args.S(a, "bas"), Args.S(a, "bit"), OptS(a, "ana")), kapiGerekli: true);
        r.Register("analizPersonel", async (st, a) => await AnalizService.PersonelAsync(st.RequireSql, Args.S(a, "bas"), Args.S(a, "bit"), OptS(a, "bolum"), OptS(a, "q")), kapiGerekli: true);
        r.Register("analizPersonelDetay", async (st, a) => await AnalizService.DetayAsync(st.RequireSql, Args.S(a, "sicil"), Args.S(a, "bas"), Args.S(a, "bit")), kapiGerekli: true);
        r.Register("arsivGecmis", async (st, a) => await AnalizService.ArsivAsync(st.RequireSql, OptS(a, "q"), OptS(a, "ana")), kapiGerekli: true);
        r.Register("analizExcel", async (st, a) =>
        {
            var sql = st.RequireSql; var tur = Args.S(a, "tur"); var bas = Args.S(a, "bas"); var bit = Args.S(a, "bit");
            List<List<string>> tablo; string sayfa, dosya; ISet<int>? sayi = null; var dondur = 0;
            switch (tur)
            {
                case "proje": tablo = AnalizService.ProjeTablo(await AnalizService.ProjeHamAsync(sql, bas, bit, OptS(a, "ana"))); sayfa = "Proje adam-gün"; dosya = $"analiz-proje-{bas}-{bit}.xlsx"; sayi = AnalizService.ProjeSayiSutunlari; break;
                case "kirilim": tablo = AnalizService.KirilimTablo(await AnalizService.KirilimHamAsync(sql, bas, bit, OptS(a, "ana"))); sayfa = "Proje kırılımı"; dosya = $"analiz-kirilim-{bas}-{bit}.xlsx"; sayi = AnalizService.KirilimSayiSutunlari; break;
                case "personel":
                    var ham = await AnalizService.PersonelHamAsync(sql, bas, bit, OptS(a, "bolum"), OptS(a, "q"));
                    var izin = ham.Count > 0 && ham[0]["izin_gun"] is not (DBNull or null);   // izin/rapor yalnız Yönetici'ye gelir
                    tablo = AnalizService.PersonelTablo(ham, izin); sayfa = "Personel adam-gün"; dosya = $"analiz-personel-{bas}-{bit}.xlsx";
                    sayi = izin ? new HashSet<int> { 3, 4, 5, 6, 7 } : new HashSet<int> { 3, 4, 5 }; break;
                case "detay": tablo = AnalizService.DetayTablo(await AnalizService.DetayHamAsync(sql, Args.S(a, "sicil"), bas, bit)); sayfa = "Kişi detayı"; dosya = $"analiz-kisi-{Args.S(a, "sicil")}-{bas}-{bit}.xlsx"; break;
                case "arsiv": tablo = AnalizService.ArsivTablo(await AnalizService.ArsivHamAsync(sql, OptS(a, "q"), OptS(a, "ana"))); sayfa = "Geçmiş görevler"; dosya = "arsiv-gecmis-gorevler.xlsx"; break;
                default: throw new GorevException("dogrulama", "Bilinmeyen analiz türü.");
            }
            var yol = await KayitYoluAsync(dosya);
            if (yol == null) return (object?)new { iptal = true };
            await File.WriteAllBytesAsync(yol, MatrisExcel.Xlsx(tablo, sayfa, dondur, sayi));
            return (object?)new { iptal = false, yol, satir = tablo.Count - 1 };
        }, kapiGerekli: true);
    }
}
