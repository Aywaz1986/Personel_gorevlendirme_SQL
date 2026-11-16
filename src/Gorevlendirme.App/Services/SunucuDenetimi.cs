using Microsoft.Data.SqlClient;

namespace Gorevlendirme;

/// <summary>
/// "Sunucu denetimi": canlı sunucuda şema, rol ve yetki düzenini yan etkisiz sınar (hiçbir şey yazılmaz).
/// Sonuç satırı: ad, durum (tamam | uyari | hata | atlandi), ayrinti.
/// </summary>
public static class SunucuDenetimi
{
    private record Sonuc(string ad, string durum, string ayrinti);

    public static async Task<object> CalistirAsync(SqlService sql)
    {
        var liste = new List<Sonuc>();

        async Task Adim(string ad, Func<SqlConnection, Task<(string durum, string ayrinti)>> f)
        {
            try
            {
                await using var cn = await sql.OpenAsync();
                var (d, s) = await f(cn);
                liste.Add(new Sonuc(ad, d, s));
            }
            catch (SqlException ex) when (ex.Number is 229 or 297 or 300)
            {
                liste.Add(new Sonuc(ad, "atlandi", "Yetkiniz yok: " + ex.Message));
            }
            catch (Exception ex)
            {
                liste.Add(new Sonuc(ad, "hata", ex.Message));
            }
        }

        static async Task<object?> Skaler(SqlConnection cn, string q)
        {
            await using var cmd = new SqlCommand(q, cn);
            var v = await cmd.ExecuteScalarAsync();
            return v is DBNull ? null : v;
        }

        await Adim("Veritabanı harmanlaması", async cn =>
        {
            var h = (string?)await Skaler(cn, "SELECT CAST(DATABASEPROPERTYEX(DB_NAME(), 'Collation') AS NVARCHAR(128))") ?? "";
            return h.StartsWith("Turkish_", StringComparison.OrdinalIgnoreCase)
                ? ("tamam", h) : ("uyari", $"{h} (Turkish_CI_AS beklenir)");
        });

        await Adim("SQL Server sürümü", async cn =>
        {
            var ana = Convert.ToInt32(await Skaler(cn,
                "SELECT CAST(PARSENAME(CAST(SERVERPROPERTY('ProductVersion') AS nvarchar(32)), 4) AS int)") ?? 0);
            return ana >= 13 ? ("tamam", $"ana sürüm {ana}") : ("hata", $"ana sürüm {ana}; en az 13 (2016) gerekir");
        });

        await Adim("gorev şeması ve sahibi", async cn =>
        {
            var sahip = (string?)await Skaler(cn,
                "SELECT p.name FROM sys.schemas s JOIN sys.database_principals p ON p.principal_id = s.principal_id WHERE s.name = N'gorev'");
            if (sahip is null) return ("hata", "gorev şeması yok (yönetici 'Şemayı kur' çalıştırmalı)");
            return sahip == Migrator.SahipKullanici ? ("tamam", sahip) : ("hata", $"sahip '{sahip}', '{Migrator.SahipKullanici}' beklenir");
        });

        await Adim("Şema sürümü", async cn =>
        {
            var hedef = Migrator.Scripts().Max(s => s.Surum);
            var mevcut = Convert.ToInt32(await Skaler(cn, "SELECT ISNULL(MAX(surum), 0) FROM gorev.sema_surumleri") ?? 0);
            return mevcut >= hedef ? ("tamam", $"{mevcut}") : ("hata", $"Sunucuda {mevcut}, uygulama {hedef} bekliyor: şema güncellenmeli");
        });

        await Adim("Rol üyeliği (gorev_kullanici)", async cn =>
        {
            var uye = Convert.ToInt32(await Skaler(cn, "SELECT ISNULL(IS_MEMBER(N'gorev_kullanici'), -1)") ?? -1);
            return uye == 1 ? ("tamam", "üye")
                : ("uyari", "gorev_kullanici rolünde görünmüyorsunuz (Authenticated Users üyeliği ya da yönetici hesabı olmayabilir)");
        });

        await Adim("Tablolara doğrudan yetki yok", async cn =>
        {
            var dbOwner = Convert.ToInt32(await Skaler(cn, "SELECT ISNULL(IS_MEMBER(N'db_owner'), 0)") ?? 0) == 1;
            var okur = Convert.ToInt32(await Skaler(cn,
                "SELECT ISNULL(HAS_PERMS_BY_NAME(N'gorev.islem_log', N'OBJECT', N'SELECT'), 0)") ?? 0) == 1;
            if (dbOwner) return ("tamam", "db_owner olduğunuz için yetki beklenen ölçüde görünür; sıradan kullanıcı için ayrıca sınanmalı");
            return okur ? ("hata", "Sıradan kullanıcı gorev tablosunu doğrudan okuyabiliyor (yetki sızıntısı)") : ("tamam", "yalnızca yordamla erişim");
        });

        await Adim("Sürüm bilgisi (sp_surum_bilgi)", async cn =>
        {
            await using var cmd = new SqlCommand("EXEC gorev.sp_surum_bilgi", cn);
            await using var r = await cmd.ExecuteReaderAsync();
            if (!await r.ReadAsync()) return ("hata", "Satır dönmedi");
            var ortam = r.IsDBNull(r.GetOrdinal("ortam")) ? "?" : r.GetString(r.GetOrdinal("ortam"));
            return ("tamam", "ORTAM=" + ortam + ", hesap=" + r.GetString(r.GetOrdinal("hesap")));
        });

        return new { sonuc = liste, ozet = new { tamam = liste.Count(x => x.durum == "tamam"), uyari = liste.Count(x => x.durum == "uyari"), hata = liste.Count(x => x.durum == "hata") } };
    }
}
