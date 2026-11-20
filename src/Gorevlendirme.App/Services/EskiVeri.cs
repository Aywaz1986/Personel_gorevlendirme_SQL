using Microsoft.Data.Sqlite;

namespace Gorevlendirme;

public sealed record EskiPersonel(long Id, string Ad, string Sicil, bool Aktif);
public sealed record EskiProje(long Id, string Ad, string Lokasyon, bool Aktif, long? ParentId);
public sealed record EskiSorumlu(long Id, string Ad, bool Aktif);
public sealed record EskiHafta(long Id, string Baslangic);
public sealed record EskiAtama(long Id, long HaftaId, long? PersonelId, string PersonelAdi, string GunlerJson, string Durum, long? ProjeId, string ProjeAdi, string GorevMetni, string Sorumlu);

/// <summary>Eski aracın (gorevlendirme.db) bellekteki kopyası; yalnız denetim raporu için gereken alanlar.</summary>
public sealed class EskiVeri
{
    public List<EskiPersonel> Personel { get; } = new();
    public List<EskiProje> Projeler { get; } = new();
    public List<EskiSorumlu> Sorumlular { get; } = new();
    public List<EskiHafta> Haftalar { get; } = new();
    public List<EskiAtama> Atamalar { get; } = new();
    /// <summary>Okuma sırasında görülen yapı sorunları (eksik tablo/sütun vb.).</summary>
    public List<string> Uyarilar { get; } = new();
}

/// <summary>SQLite dosyasını SALT OKUNUR açıp <see cref="EskiVeri"/> modeline yükler. Eksik tablo ve sütunlara dayanıklıdır.</summary>
public static class EskiVeriOkuyucu
{
    public static EskiVeri Oku(string yol)
    {
        if (!File.Exists(yol)) throw new GorevException("dogrulama", "Dosya bulunamadı.");
        var v = new EskiVeri();
        try
        {
            var cs = new SqliteConnectionStringBuilder { DataSource = yol, Mode = SqliteOpenMode.ReadOnly, Pooling = false }.ToString();
            using var cn = new SqliteConnection(cs);
            cn.Open();
            foreach (var r in Satirlar(cn, "personel", v))
                v.Personel.Add(new EskiPersonel(L(r, "id") ?? 0, S(r, "adSoyad"), S(r, "sicil"), Aktif(r)));
            foreach (var r in Satirlar(cn, "projeler", v))
                v.Projeler.Add(new EskiProje(L(r, "id") ?? 0, S(r, "ad"), S(r, "lokasyon"), Aktif(r), L(r, "parentId")));
            foreach (var r in Satirlar(cn, "sorumlular", v))
                v.Sorumlular.Add(new EskiSorumlu(L(r, "id") ?? 0, S(r, "adSoyad"), Aktif(r)));
            foreach (var r in Satirlar(cn, "haftalar", v))
                v.Haftalar.Add(new EskiHafta(L(r, "id") ?? 0, S(r, "haftaBaslangic")));
            foreach (var r in Satirlar(cn, "atamalar", v))
                v.Atamalar.Add(new EskiAtama(L(r, "id") ?? 0, L(r, "haftaId") ?? 0, L(r, "personelId"), S(r, "personelAdi"), S(r, "gunler"), S(r, "durum"),
                    L(r, "projeId"), S(r, "projeAdi"), S(r, "gorevMetni"), S(r, "sorumlu")));
        }
        catch (SqliteException ex)
        {
            throw new GorevException("dogrulama", "Dosya geçerli bir SQLite veritabanı değil ya da okunamadı: " + ex.Message);
        }
        return v;
    }

    private static List<Dictionary<string, object?>> Satirlar(SqliteConnection cn, string tablo, EskiVeri v)
    {
        var liste = new List<Dictionary<string, object?>>();
        using (var kontrol = cn.CreateCommand())
        {
            kontrol.CommandText = "SELECT 1 FROM sqlite_master WHERE type='table' AND name = $t";
            kontrol.Parameters.AddWithValue("$t", tablo);
            if (kontrol.ExecuteScalar() == null) { v.Uyarilar.Add("Tablo yok: " + tablo); return liste; }
        }
        using var cmd = cn.CreateCommand();
        cmd.CommandText = "SELECT * FROM \"" + tablo + "\"";   // tablo adı sabit listeden gelir
        using var rd = cmd.ExecuteReader();
        while (rd.Read())
        {
            var d = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
            for (var i = 0; i < rd.FieldCount; i++) d[rd.GetName(i)] = rd.IsDBNull(i) ? null : rd.GetValue(i);
            liste.Add(d);
        }
        return liste;
    }

    private static string S(Dictionary<string, object?> r, string k) => r.TryGetValue(k, out var o) && o != null ? Convert.ToString(o, System.Globalization.CultureInfo.InvariantCulture)!.Trim() : "";
    private static long? L(Dictionary<string, object?> r, string k) =>
        r.TryGetValue(k, out var o) && o != null && long.TryParse(Convert.ToString(o, System.Globalization.CultureInfo.InvariantCulture), out var n) ? n : null;
    private static bool Aktif(Dictionary<string, object?> r) => !r.TryGetValue("aktif", out var o) || o == null || L(r, "aktif") != 0;
}
