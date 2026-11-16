using Gorevlendirme;
using Microsoft.Data.SqlClient;
using Xunit;

namespace Gorevlendirme.SqlTests;

/// <summary>Ortam değişkeni yoksa atlanır (yerelde SQL Server olmadan çalışan geliştirici için).</summary>
public sealed class SqlFactAttribute : FactAttribute
{
    public SqlFactAttribute()
    {
        if (string.IsNullOrEmpty(Environment.GetEnvironmentVariable("GOREV_TEST_SERVER")))
            Skip = "GOREV_TEST_SERVER tanımlı değil (SQL Server gerektirir).";
    }
}

/// <summary>
/// Her test kendi taze veritabanını kullanır: Turkish_CI_AS harmanlamasıyla açılır (canlı sunucudaki gibi; konteyner
/// varsayılanı farklıdır). Bağlanan hesap (sa) kurulumu yapan db_owner'dır. Test sonunda veritabanı silinir.
/// </summary>
public sealed class TestDb : IAsyncDisposable
{
    private static string Server => Environment.GetEnvironmentVariable("GOREV_TEST_SERVER") ?? "";
    private static string User => Environment.GetEnvironmentVariable("GOREV_TEST_USER") ?? "sa";
    private static string Password => Environment.GetEnvironmentVariable("GOREV_TEST_PASSWORD") ?? "";

    public string Db { get; } = "gorev_ci_" + Guid.NewGuid().ToString("N")[..8];
    public Migrator Migrator { get; private set; } = null!;

    private static string Cs(string db) =>
        $"Server={Server};Database={db};User Id={User};Password={Password};TrustServerCertificate=true;Encrypt=false;Connect Timeout=30";

    public static async Task<SqlConnection> AcAsync(string db)
    {
        var cn = new SqlConnection(Cs(db));
        await cn.OpenAsync();
        return cn;
    }

    public Task<SqlConnection> AcAsync() => AcAsync(Db);

    public static async Task<TestDb> OlusturAsync()
    {
        var t = new TestDb();
        Exception? son = null;
        for (var i = 0; i < 30; i++)   // konteyner ilk açılışta birkaç saniye hazır olmaz
        {
            try { await using var cn = await AcAsync("master"); son = null; break; }
            catch (Exception e) { son = e; await Task.Delay(2000); }
        }
        if (son != null) throw son;
        await using (var cn = await AcAsync("master"))
        await using (var cmd = new SqlCommand($"CREATE DATABASE [{t.Db}] COLLATE Turkish_CI_AS", cn))
            await cmd.ExecuteNonQueryAsync();
        t.Migrator = new Migrator(new SqlService(new ConnInfo(Server, t.Db, false, User, Password, false, true)));
        return t;
    }

    public SqlService Servis => new(new ConnInfo(Server, Db, false, User, Password, false, true));

    public async Task<object?> SkalerAsync(string sql)
    {
        await using var cn = await AcAsync();
        await using var cmd = new SqlCommand(sql, cn);
        var v = await cmd.ExecuteScalarAsync();
        return v is DBNull ? null : v;
    }

    public async Task ExecAsync(string sql)
    {
        await using var cn = await AcAsync();
        await using var cmd = new SqlCommand(sql, cn);
        await cmd.ExecuteNonQueryAsync();
    }

    /// <summary>Hata beklenen sorgu: SqlException numarasını döndürür; hata yoksa test başarısız olur.</summary>
    public async Task<int> HataNoAsync(string sql)
    {
        try { await ExecAsync(sql); }
        catch (SqlException e) { return e.Number; }
        throw new Xunit.Sdk.XunitException("Hata bekleniyordu ama sorgu başarılı oldu: " + sql);
    }

    /// <summary>
    /// dbo parmak izi: dbo nesneleri (ad, tür, değiştirilme zamanı), tablo içerikleri ve dbo üzerindeki yetki sayısı.
    /// Kurulum/sıfırlama/kaldırma öncesi ve sonrası aynı olmalıdır.
    /// </summary>
    public async Task<string> DboIzAsync()
    {
        var sb = new System.Text.StringBuilder();
        await using var cn = await AcAsync();
        await using (var cmd = new SqlCommand(@"
SELECT o.name, o.type, CONVERT(varchar(33), o.modify_date, 126) FROM sys.objects o
WHERE o.schema_id = SCHEMA_ID(N'dbo') AND o.is_ms_shipped = 0 ORDER BY o.name", cn))
        await using (var r = await cmd.ExecuteReaderAsync())
            while (await r.ReadAsync()) sb.Append(r.GetString(0)).Append('|').Append(r.GetString(1)).Append('|').Append(r.GetString(2)).Append(';');
        await using (var cmd = new SqlCommand("SELECT COUNT(*), ISNULL(CHECKSUM_AGG(CHECKSUM(*)), 0) FROM dbo.ozluk_taklit", cn))
        await using (var r = await cmd.ExecuteReaderAsync())
        { await r.ReadAsync(); sb.Append("satir=").Append(r.GetInt32(0)).Append(",ck=").Append(r.GetInt32(1)).Append(';'); }
        await using (var cmd = new SqlCommand(@"
SELECT COUNT(*) FROM sys.database_permissions p
WHERE (p.class = 1 AND p.major_id IN (SELECT object_id FROM sys.objects WHERE schema_id = SCHEMA_ID(N'dbo') AND is_ms_shipped = 0))
   OR (p.class = 3 AND p.major_id = SCHEMA_ID(N'dbo'))", cn))
            sb.Append("yetki=").Append(await cmd.ExecuteScalarAsync());
        return sb.ToString();
    }

    /// <summary>Özlük'ü taklit eden dbo nesneleri: tablo + veri + bir role verilmiş SELECT.</summary>
    public Task DboTaklitKurAsync() => ExecAsync(@"
CREATE TABLE dbo.ozluk_taklit (id INT IDENTITY(1,1) PRIMARY KEY, sicil_no NVARCHAR(20) NOT NULL, adi_soyadi NVARCHAR(100) NOT NULL);
INSERT INTO dbo.ozluk_taklit (sicil_no, adi_soyadi) VALUES (N'1', N'Ayşe Örnek'), (N'2', N'Ali Örnek'), (N'3', N'Işık Örnek');
CREATE ROLE ozluk_taklit_rol;
GRANT SELECT ON dbo.ozluk_taklit TO ozluk_taklit_rol;");

    public async ValueTask DisposeAsync()
    {
        try
        {
            SqlConnection.ClearAllPools();
            await using var cn = await AcAsync("master");
            await using var cmd = new SqlCommand($"ALTER DATABASE [{Db}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [{Db}]", cn);
            await cmd.ExecuteNonQueryAsync();
        }
        catch { /* temizlik başarısızsa test sonucunu bozmasın */ }
    }

    /// <summary>tools/sql altındaki betiği bulur (depo kökü yukarı doğru aranır).</summary>
    public static string BetikOku(string ad)
    {
        var d = new DirectoryInfo(AppContext.BaseDirectory);
        while (d != null && !File.Exists(Path.Combine(d.FullName, "tools", "sql", ad))) d = d.Parent;
        if (d == null) throw new FileNotFoundException("tools/sql/" + ad + " bulunamadı");
        return File.ReadAllText(Path.Combine(d.FullName, "tools", "sql", ad));
    }

    /// <summary>Betikteki @onay satırını doldurur; satır biçimi değişirse test başarısız olur (biçimi kilitler).</summary>
    public static string Onayli(string betik, string onay)
    {
        const string bos = "DECLARE @onay NVARCHAR(20) = N'';";
        if (!betik.Contains(bos)) throw new Xunit.Sdk.XunitException("Betikte '" + bos + "' satırı yok.");
        return betik.Replace(bos, $"DECLARE @onay NVARCHAR(20) = N'{onay}';");
    }
}
