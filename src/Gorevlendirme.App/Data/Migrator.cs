using System.Text;
using System.Text.RegularExpressions;
using Microsoft.Data.SqlClient;

namespace Gorevlendirme;

/// <summary>
/// Şema yönetimi: exe'ye gömülü Sql/NNN_ad.sql betiklerini sırayla, her biri ayrı işlemde uygular.
/// Betikler "GO" satırlarıyla bloklara ayrılır. Uygulananlar gorev.sema_surumleri tablosunda tutulur
/// (Özlük'ün dbo.sema_surumleri tablosundan bağımsız). Kendi kilidi: sp_getapplock 'gorev_sema'.
/// </summary>
public class Migrator
{
    public record Script(int Surum, string Ad, string Metin);

    public const string SahipKullanici = "gorev_sahip";
    public const string KilitKaynagi = "gorev_sema";

    // Betiklerden önce, tekrar çalıştırılabilir kurulum: sahip kullanıcı, şema, sürüm tablosu. Yalnızca gorev nesneleri.
    internal const string KullaniciSql = "IF DATABASE_PRINCIPAL_ID(N'gorev_sahip') IS NULL CREATE USER gorev_sahip WITHOUT LOGIN;";
    internal const string SemaSql = "CREATE SCHEMA gorev AUTHORIZATION gorev_sahip;";
    internal const string SurumTablosuSql = @"
IF OBJECT_ID(N'gorev.sema_surumleri', N'U') IS NULL
CREATE TABLE gorev.sema_surumleri (
    surum           INT NOT NULL CONSTRAINT PK_sema_surumleri PRIMARY KEY,
    ad              NVARCHAR(200) NOT NULL,
    uygulanma       DATETIME2(0) NOT NULL CONSTRAINT DF_sema_surumleri_uygulanma DEFAULT SYSDATETIME(),
    uygulayan       NVARCHAR(256) NOT NULL CONSTRAINT DF_sema_surumleri_uygulayan DEFAULT ORIGINAL_LOGIN(),
    uygulama_surumu NVARCHAR(20) NULL
);";

    private const string SemaSahibiSql =
        "SELECT p.name FROM sys.schemas s JOIN sys.database_principals p ON p.principal_id = s.principal_id WHERE s.name = N'gorev'";

    private static readonly Regex GoRegex =
        new(@"^[ \t]*GO[ \t]*\r?$", RegexOptions.Multiline | RegexOptions.IgnoreCase);

    private const string VersionSql =
        "SELECT CAST(PARSENAME(CAST(SERVERPROPERTY('ProductVersion') AS nvarchar(32)), 4) AS int)";

    private readonly SqlService _sql;
    public Migrator(SqlService sql) { _sql = sql; }

    /// <summary>Betik metnini GO satırlarından bloklara ayırır; boş blokları atar.</summary>
    public static IEnumerable<string> Split(string metin) =>
        GoRegex.Split(metin).Select(x => x.Trim()).Where(x => x.Length > 0);

    public static List<Script> Scripts()
    {
        var asm = typeof(Migrator).Assembly;
        var list = new List<Script>();
        foreach (var n in asm.GetManifestResourceNames())
        {
            if (!n.StartsWith("Sql/", StringComparison.Ordinal) || !n.EndsWith(".sql", StringComparison.OrdinalIgnoreCase)) continue;
            var file = Path.GetFileNameWithoutExtension(n.Substring(4));          // 001_cekirdek
            var us = file.IndexOf('_');
            if (us <= 0 || !int.TryParse(file.AsSpan(0, us), out var v))
                throw new InvalidOperationException("Geçersiz betik adı (NNN_ad.sql olmalı): " + n);
            using var s = asm.GetManifestResourceStream(n)!;
            using var r = new StreamReader(s, Encoding.UTF8);
            list.Add(new Script(v, file.Substring(us + 1), r.ReadToEnd()));
        }
        var sorted = list.OrderBy(x => x.Surum).ToList();
        if (sorted.Select(x => x.Surum).Distinct().Count() != sorted.Count)
            throw new InvalidOperationException("Aynı numaralı birden fazla şema betiği var.");
        return sorted;
    }

    private static async Task<object?> ScalarAsync(SqlConnection cn, SqlTransaction? tx, string sql, params (string, object)[] p)
    {
        await using var cmd = new SqlCommand(sql, cn, tx);
        foreach (var (k, v) in p) cmd.Parameters.AddWithValue(k, v);
        var r = await cmd.ExecuteScalarAsync();
        return r is DBNull ? null : r;
    }

    private static async Task ExecAsync(SqlConnection cn, SqlTransaction? tx, string sql, params (string, object)[] p)
    {
        await using var cmd = new SqlCommand(sql, cn, tx);
        foreach (var (k, v) in p) cmd.Parameters.AddWithValue(k, v);
        await cmd.ExecuteNonQueryAsync();
    }

    private static async Task<List<int>> UygulananAsync(SqlConnection cn)
    {
        var list = new List<int>();
        if (await ScalarAsync(cn, null, "SELECT OBJECT_ID(N'gorev.sema_surumleri', N'U')") is null) return list;
        await using var cmd = new SqlCommand("SELECT surum FROM gorev.sema_surumleri ORDER BY surum", cn);
        await using var r = await cmd.ExecuteReaderAsync();
        while (await r.ReadAsync()) list.Add(r.GetInt32(0));
        return list;
    }

    private static async Task<string> HarmanAsync(SqlConnection cn) =>
        await ScalarAsync(cn, null, "SELECT CAST(DATABASEPROPERTYEX(DB_NAME(), 'Collation') AS nvarchar(128))") as string ?? "";

    public async Task<object> DurumAsync()
    {
        await using var cn = await _sql.OpenAsync();
        var harman = await HarmanAsync(cn);
        var ana = Convert.ToInt32(await ScalarAsync(cn, null, VersionSql) ?? 0);
        var sahip = await ScalarAsync(cn, null, SemaSahibiSql) as string;
        var uyg = await UygulananAsync(cn);
        var scripts = Scripts();
        return new
        {
            harmanlama = harman,
            harmanUygun = harman.StartsWith("Turkish_", StringComparison.OrdinalIgnoreCase),
            sunucuAnaSurum = ana,
            semaVar = sahip is not null,
            semaSahibi = sahip,
            sahipUygun = sahip is null || sahip == SahipKullanici,
            uygulanan = uyg,
            bekleyen = scripts.Where(s => !uyg.Contains(s.Surum)).Select(s => new { surum = s.Surum, ad = s.Ad }).ToList(),
            hedefSurum = scripts.Count == 0 ? 0 : scripts.Max(s => s.Surum),
        };
    }

    /// <summary>Kurulum/yükseltme. db_owner yetkisi gerekir; yetki yoksa SQL Server hatası arayüze döner.</summary>
    public async Task<object> UygulaAsync(bool zorla)
    {
        await using var cn = await _sql.OpenAsync();

        var ana = Convert.ToInt32(await ScalarAsync(cn, null, VersionSql) ?? 0);
        if (ana < 13)
            throw new GorevException("dogrulama", $"SQL Server ana sürümü {ana}; en az 13 (SQL Server 2016) gerekir.");

        var sahip = await ScalarAsync(cn, null, SemaSahibiSql) as string;
        if (sahip is not null && sahip != SahipKullanici)
            throw new GorevException("dogrulama",
                $"'gorev' şeması zaten var ve sahibi '{sahip}' ('{SahipKullanici}' beklenir). Başka bir nesneyle karışmamak için durduruldu.");

        if (sahip is null && !zorla)
        {
            var harman = await HarmanAsync(cn);
            if (!harman.StartsWith("Turkish_", StringComparison.OrdinalIgnoreCase))
                throw new GorevException("dogrulama",
                    $"Veritabanı harmanlaması '{harman}'. Türkçe için Turkish_CI_AS beklenir. " +
                    "Harmanlama sonradan değiştirilemez; yine de devam etmek için 'zorla' işaretleyin.");
        }

        await ExecAsync(cn, null, KullaniciSql);
        if (sahip is null) await ExecAsync(cn, null, SemaSql);
        await ExecAsync(cn, null, SurumTablosuSql);
        var uyg = await UygulananAsync(cn);

        var yapilan = new List<string>();
        foreach (var sc in Scripts())
        {
            if (uyg.Contains(sc.Surum)) continue;

            await using var tx = (SqlTransaction)await cn.BeginTransactionAsync();
            try
            {
                var kilit = Convert.ToInt32(await ScalarAsync(cn, tx,
                    $"DECLARE @r INT; EXEC @r = sp_getapplock @Resource = N'{KilitKaynagi}', @LockMode = 'Exclusive', " +
                    "@LockOwner = 'Transaction', @LockTimeout = 15000; SELECT @r;"));
                if (kilit < 0)
                    throw new GorevException("hata", "Şema güncellemesi başka bir oturumda sürüyor, biraz sonra tekrar deneyin.");

                // Kilidi beklerken başkası uygulamış olabilir
                var var0 = Convert.ToInt32(await ScalarAsync(cn, tx,
                    "SELECT COUNT(*) FROM gorev.sema_surumleri WHERE surum = @v", ("@v", sc.Surum)));
                if (var0 > 0) { await tx.RollbackAsync(); continue; }

                var n = 0;
                foreach (var b in Split(sc.Metin))
                {
                    n++;
                    try { await ExecAsync(cn, tx, b); }
                    catch (SqlException ex)
                    {
                        throw new GorevException("hata", $"{sc.Surum:000}_{sc.Ad}, {n}. blok: {ex.Message}");
                    }
                }
                await ExecAsync(cn, tx,
                    "INSERT gorev.sema_surumleri(surum, ad, uygulama_surumu) VALUES(@v, @a, @u)",
                    ("@v", sc.Surum), ("@a", sc.Ad), ("@u", AppInfo.Version));
                await tx.CommitAsync();
                yapilan.Add($"{sc.Surum:000}_{sc.Ad}");
            }
            catch
            {
                try { await tx.RollbackAsync(); } catch { /* işlem zaten bitmiş olabilir */ }
                throw;
            }
        }

        return new { uygulananlar = yapilan };
    }
}
