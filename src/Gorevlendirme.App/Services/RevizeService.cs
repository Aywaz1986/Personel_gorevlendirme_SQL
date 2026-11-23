using System.Text.Json;

namespace Gorevlendirme;

/// <summary>Görev iptali, erken bitiş, atamadan çıkarma, ikame, revize ve sorumlu devri (Dilim 8, 010_revize_ikame.sql). Yetki ve kurallar sunucudadır.</summary>
public static class RevizeService
{
    public sealed record GunGirdisi(string Tarih, string Zaman, int Kisi);

    private static object JsonOku(string? json) =>
        string.IsNullOrWhiteSpace(json) ? Array.Empty<object>() : JsonSerializer.Deserialize<JsonElement>(json);

    private static object? Bos(string? s) => string.IsNullOrWhiteSpace(s) ? null : s;

    public static string GunlerJson(IEnumerable<GunGirdisi> g) => JsonSerializer.Serialize(g.Select(x => new { tarih = x.Tarih, zaman = x.Zaman, kisi = x.Kisi }));

    public static Task IptalAsync(SqlService sql, int id, string neden) => sql.ProcAsync("gorev.sp_talep_iptal", ("@id", id), ("@neden", neden));

    public static async Task<object> ErkenBitirAsync(SqlService sql, int id, string yeniSon, string neden)
    {
        var r = (await sql.ProcAsync("gorev.sp_talep_erken_bitir", ("@id", id), ("@yeni_son", yeniSon), ("@neden", neden))).First();
        return new { talepId = r["talep_id"], durum = r["durum"] };
    }

    public static async Task<object> CikarAsync(SqlService sql, int talepId, string sicil, string? tarih, string? zaman, string neden)
    {
        var r = (await sql.ProcAsync("gorev.sp_atama_cikar", ("@talep_id", talepId), ("@sicil", sicil), ("@tarih", Bos(tarih)), ("@zaman", Bos(zaman)), ("@neden", neden))).First();
        return new { talepId = r["talep_id"], durum = r["durum"], cikarilan = r["cikarilan"] };
    }

    public static async Task<object> IkameAsync(SqlService sql, int talepId, string eski, string yeni, string? bastan, string karar, string? neden)
    {
        var r = (await sql.ProcAsync("gorev.sp_atama_ikame", ("@talep_id", talepId), ("@eski", eski), ("@yeni", yeni), ("@bastan", Bos(bastan)), ("@karar", karar), ("@neden", Bos(neden)))).First();
        return new { talepId = r["talep_id"], durum = r["durum"], degisen = r["degisen"], cikarilan = r["cikarilan"], uyari = r["uyari"] };
    }

    public static Task DevretAsync(SqlService sql, int talepId, string yeniSicil, string? neden) =>
        sql.ProcAsync("gorev.sp_sorumlu_devret", ("@talep_id", talepId), ("@yeni_sicil", yeniSicil), ("@neden", Bos(neden)));

    public static async Task<object> DevirListeAsync(SqlService sql, int talepId) =>
        (await sql.ProcAsync("gorev.sp_sorumlu_devir_listele", ("@talep_id", talepId))).Select(r => new
        { id = r["id"], eski = r["eski"], yeni = r["yeni"], neden = r["neden"], hesap = r["devreden_hesap"], tarih = r["tarih"] }).ToList();

    public static async Task<object> ReviziteAsync(SqlService sql, int talepId, string? gorevMetni, string? nitelik, string? saatBaslangic, string? saatBitis, IEnumerable<GunGirdisi>? gunler, string? neden)
    {
        var g = gunler?.ToList();
        var r = (await sql.ProcAsync("gorev.sp_revize_iste", ("@talep_id", talepId), ("@gorev_metni", Bos(gorevMetni)), ("@nitelik", Bos(nitelik)),
            ("@saat_baslangic", Bos(saatBaslangic)), ("@saat_bitis", Bos(saatBitis)), ("@gunler_json", g == null || g.Count == 0 ? null : GunlerJson(g)), ("@neden", Bos(neden)))).First();
        return new { id = r["id"], kod = r["kod"], durum = r["durum"] };
    }

    public static async Task<object> RevizeOnaylaAsync(SqlService sql, int id, IEnumerable<int>? cikar = null)
    {
        var ids = cikar?.ToArray();
        var r = (await sql.ProcAsync("gorev.sp_revize_onayla", ("@id", id), ("@cikar_json", ids is { Length: > 0 } ? System.Text.Json.JsonSerializer.Serialize(ids) : null))).First();
        return new { id = r["id"], durum = r["durum"] };
    }

    public static async Task<object> FazlalikAsync(SqlService sql, int id) =>
        (await sql.ProcAsync("gorev.sp_revize_fazlalik", ("@id", id))).Select(r => new
        {
            atamaId = r["atama_id"], tarih = r["tarih"], zaman = r["zaman"], sicil = r["sicil_no"], ad = r["adi_soyadi"], atanmis = r["atanmis"], yeni = r["yeni"], fazla = r["fazla"],
        }).ToList();

    public static async Task<object> MusaitlikAsync(SqlService sql, int id) =>
        (await sql.ProcAsync("gorev.sp_revize_musaitlik", ("@id", id))).Select(r => new
        {
            tarih = r["tarih"], zaman = r["zaman"], sicil = r["sicil_no"], ad = r["adi_soyadi"], durum = r["durum"],
        }).ToList();

    public static Task RevizeReddetAsync(SqlService sql, int id, string neden) => sql.ProcAsync("gorev.sp_revize_reddet", ("@id", id), ("@neden", neden));
    public static Task RevizeGeriCekAsync(SqlService sql, int id) => sql.ProcAsync("gorev.sp_revize_geri_cek", ("@id", id));

    public static async Task<object> RevizeListeAsync(SqlService sql, int? talepId, string? durum) =>
        (await sql.ProcAsync("gorev.sp_revize_listele", ("@talep_id", talepId), ("@durum", Bos(durum)))).Select(r => new
        {
            id = r["id"], kod = r["kod"], talepId = r["talep_id"], talepKod = r["talep_kod"], durum = r["durum"], isteyen = r["isteyen"], neden = r["neden"],
            gorevMetni = r["gorev_metni"], nitelik = r["nitelik"], saatBaslangic = r["saat_baslangic"], saatBitis = r["saat_bitis"], gunler = JsonOku(r["gunler_json"] as string),
            tarih = r["olusturma"], retNedeni = r["ret_nedeni"],
        }).ToList();
}
