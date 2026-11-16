using Microsoft.Data.SqlClient;

namespace Gorevlendirme;

/// <summary>gorev.sp_surum_bilgi çıktısı. Şema kurulu değilse okunamaz (null döner).</summary>
public record SurumBilgisi(int? SemaSurumu, string? MinUygulamaSurumu, string? Ortam, int PollingSaniye, string Hesap)
{
    public static async Task<SurumBilgisi?> OkuAsync(SqlService sql)
    {
        await using var cn = await sql.OpenAsync();
        try
        {
            await using var cmd = new SqlCommand("EXEC gorev.sp_surum_bilgi", cn);
            await using var r = await cmd.ExecuteReaderAsync();
            if (!await r.ReadAsync()) return null;
            string? S(string ad) { var i = r.GetOrdinal(ad); return r.IsDBNull(i) ? null : r.GetString(i); }
            var sema = r.IsDBNull(r.GetOrdinal("sema_surumu")) ? (int?)null : r.GetInt32(r.GetOrdinal("sema_surumu"));
            _ = int.TryParse(S("polling_saniye"), out var poll);
            return new SurumBilgisi(sema, S("min_uygulama_surumu"), S("ortam"), poll > 0 ? poll : 30, S("hesap") ?? "");
        }
        catch (SqlException ex) when (ex.Number is 2812 or 208)   // yordam/nesne yok: şema kurulmamış
        {
            return null;
        }
        catch (SqlException ex) when (ex.Number is 229 or 15151)  // yürütme izni yok
        {
            throw new GorevException("yetki", "gorev şemasına erişim izniniz yok (gorev_kullanici rolü).");
        }
    }
}
