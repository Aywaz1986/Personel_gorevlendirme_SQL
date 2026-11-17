using Microsoft.Data.SqlClient;

namespace Gorevlendirme;

/// <summary>Tüm SQL erişimi burada. Parametreli sorgular, bağlantı havuzu, eşzamansız.</summary>
public class SqlService
{
    private readonly string _cs;

    public SqlService(ConnInfo c)
    {
        var b = new SqlConnectionStringBuilder
        {
            DataSource = c.Server,
            InitialCatalog = c.Database,
            ApplicationName = "Gorevlendirme",
            ConnectTimeout = 20,
            CommandTimeout = 120,
            Pooling = true,
            Encrypt = c.Encrypt ? SqlConnectionEncryptOption.Mandatory : SqlConnectionEncryptOption.Optional,
            TrustServerCertificate = c.Trust,
        };
        if (c.WindowsAuth) b.IntegratedSecurity = true;
        else { b.UserID = c.User; b.Password = c.Password; }
        _cs = b.ConnectionString;
    }

    public async Task<SqlConnection> OpenAsync()
    {
        var cn = new SqlConnection(_cs);
        await cn.OpenAsync();
        return cn;
    }

    public async Task<object> InfoAsync()
    {
        await using var cn = await OpenAsync();
        await using var cmd = new SqlCommand(@"
SELECT CAST(SERVERPROPERTY('ProductVersion') AS nvarchar(50)),
       CAST(SERVERPROPERTY('Edition') AS nvarchar(100)),
       @@SERVERNAME, DB_NAME(), ORIGINAL_LOGIN()", cn);
        await using var r = await cmd.ExecuteReaderAsync();
        await r.ReadAsync();
        var edition = r.GetString(1);
        return new
        {
            version = r.GetString(0), edition, server = r.GetString(2), db = r.GetString(3), login = r.GetString(4),
            express = edition.Contains("Express", StringComparison.OrdinalIgnoreCase),
        };
    }

    /// <summary>
    /// Saklı yordam çağırır (adlandırılmış komutların tek SQL yolu; ham SQL gönderilmez). Satırlar sözlük olarak döner.
    /// Sunucu hataları (50020-50025, izin) <see cref="GorevException"/>'a çevrilir.
    /// </summary>
    public async Task<List<Dictionary<string, object?>>> ProcAsync(string ad, params (string Ad, object? Deger)[] p)
    {
        var rows = new List<Dictionary<string, object?>>();
        try
        {
            await using var cn = await OpenAsync();
            await using var cmd = new SqlCommand(ad, cn) { CommandType = System.Data.CommandType.StoredProcedure };
            foreach (var (k, v) in p) cmd.Parameters.AddWithValue(k, v ?? DBNull.Value);
            await using var r = await cmd.ExecuteReaderAsync();
            while (await r.ReadAsync())
            {
                var d = new Dictionary<string, object?>(StringComparer.Ordinal);
                for (var i = 0; i < r.FieldCount; i++) d[r.GetName(i)] = r.IsDBNull(i) ? null : r.GetValue(i);
                rows.Add(d);
            }
        }
        catch (SqlException ex)
        {
            throw SqlHata.Cevir(ex.Number, ex.Message);
        }
        return rows;
    }
}
