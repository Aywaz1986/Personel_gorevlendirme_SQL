using Microsoft.Data.SqlClient;
using Xunit;

namespace Gorevlendirme.SqlTests;

/// <summary>Komut-rol matrisi (Dilim 31): "yalnız Yönetici" işaretli her yordam (tanımında <c>fn_yonetici_mi() = 0 THROW 50023</c>) Sorumlu ve Saha kullanıcısına
/// tüm parametreler NULL gelse bile önce yetki hatası vermelidir. Yeni yönetici yordamı eklenip yetki denetimi unutulursa ya da doğrulamadan sonraya konursa bu test kırılır.</summary>
public class YetkiMatrisiTests
{
    private static async Task<List<(string Ad, List<string> Parametreler)>> YoneticiYordamlariAsync(TestDb t)
    {
        await using var c = await t.AcAsync();
        var adlar = new List<string>();
        await using (var k = new SqlCommand(@"SELECT p.name FROM sys.procedures p JOIN sys.sql_modules m ON m.object_id = p.object_id
            WHERE SCHEMA_NAME(p.schema_id) = N'gorev' AND m.definition LIKE N'%fn_yonetici_mi() = 0 THROW 50023%' ORDER BY p.name", c))
        await using (var r = await k.ExecuteReaderAsync()) while (await r.ReadAsync()) adlar.Add(r.GetString(0));
        var sonuc = new List<(string, List<string>)>();
        foreach (var ad in adlar)
        {
            var ps = new List<string>();
            await using var k = new SqlCommand("SELECT name FROM sys.parameters WHERE object_id = OBJECT_ID(@o) ORDER BY parameter_id", c);
            k.Parameters.AddWithValue("@o", "gorev." + ad);
            await using var r = await k.ExecuteReaderAsync();
            while (await r.ReadAsync()) ps.Add(r.GetString(0));
            sonuc.Add((ad, ps));
        }
        return sonuc;
    }

    [SqlFact]
    public async Task Yalniz_yonetici_yordamlari_sorumlu_ve_sahaya_yetki_hatasi_verir()
    {
        await using var t = await TestDb.OlusturAsync();
        await t.MigrateAsync();
        await t.ExecAsync(@"INSERT INTO gorev.personel (sicil_no, adi_soyadi, bolum) VALUES (N'1001', N'Sorumlu Kişi', N'Proje'), (N'1002', N'Saha Kişi', N'Teknik');");
        var (hs, sorumlu) = await t.KisiAsync();
        var (h1, saha) = await t.KisiAsync();
        await t.ExecAsync($@"INSERT INTO gorev.kullanici_yetki_istisna (hesap, sicil_no, sorumlu_mu) VALUES (N'{hs}', N'1001', 1);
            INSERT INTO gorev.kullanici_yetki_istisna (hesap, sicil_no, saha_mi) VALUES (N'{h1}', N'1002', 1);");

        var yordamlar = await YoneticiYordamlariAsync(t);
        Assert.True(yordamlar.Count >= 15, $"Beklenenden az yönetici yordamı bulundu ({yordamlar.Count}); arama deseni bozulmuş olabilir.");
        var ihlal = new List<string>();
        foreach (var (ad, ps) in yordamlar)
            foreach (var (rol, servis) in new[] { ("SORUMLU", sorumlu), ("SAHA", saha) })
            {
                try { await servis.ProcAsync("gorev." + ad, ps.Select(p => (p, (object?)null)).ToArray()); ihlal.Add($"{rol}: gorev.{ad} hata vermedi"); }
                catch (GorevException e) when (e.Code == "yetki") { }
                catch (Exception e) { ihlal.Add($"{rol}: gorev.{ad} → {e.GetType().Name} {(e as GorevException)?.Code} {e.Message}"); }
            }
        Assert.True(ihlal.Count == 0, "Yetki denetimi eksik/sıra dışı yordamlar:\n" + string.Join("\n", ihlal));
    }
}
