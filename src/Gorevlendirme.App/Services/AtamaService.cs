using System.Text.Json;

namespace Gorevlendirme;

/// <summary>Atama (Yönetici), ret ve bildirim. Kurallar ve yetki sunucudadır (007_atama.sql).</summary>
public static class AtamaService
{
    public sealed record AtamaGirdisi(string Sicil, string Tarih, string Zaman);

    public static string Json(IEnumerable<AtamaGirdisi> g) =>
        JsonSerializer.Serialize(g.Select(x => new { sicil = x.Sicil, tarih = x.Tarih, zaman = x.Zaman }));

    public static async Task<object> AdaylarAsync(SqlService sql, int talepId, string? q) =>
        (await sql.ProcAsync("gorev.sp_atama_adaylar", ("@talep_id", talepId), ("@q", string.IsNullOrWhiteSpace(q) ? null : q))).Select(r => new
        {
            sicil = r["sicil_no"], ad = r["adi_soyadi"], bolum = r["bolum"], onerildi = r["onerildi"], gecmis = r["gecmis"], buTalepte = r["bu_talepte"], cakisanGun = r["cakisan_gun"],
            toplamGorev = r["toplam_gorev"], adamGun = r["adam_gun"], yerlesker = r["yerlesker"] is DBNull ? null : r["yerlesker"], talepGun = r["talep_gun"], izinRaporGun = r["izin_rapor_gun"],
        }).ToList();

    public static async Task<object> CakismaKontrolAsync(SqlService sql, int talepId, IEnumerable<AtamaGirdisi> g) =>
        (await sql.ProcAsync("gorev.sp_atama_cakisma_kontrol", ("@talep_id", talepId), ("@atamalar_json", Json(g)))).Select(r => new
        {
            sicil = r["sicil_no"], ad = r["adi_soyadi"], tarih = r["tarih"], zaman = r["zaman"], cakisanTalepId = r["cakisan_talep_id"],
            cakisanKod = r["cakisan_kod"], cakisanZaman = r["cakisan_zaman"], cakisanSorumlu = r["cakisan_sorumlu"],
        }).ToList();

    public static async Task<object> OnaylaAsync(SqlService sql, int talepId, IEnumerable<AtamaGirdisi> g, string karar)
    {
        var r = (await sql.ProcAsync("gorev.sp_atama_onayla", ("@talep_id", talepId), ("@atamalar_json", Json(g)), ("@karar", karar))).First();
        return new { talepId = r["talep_id"], durum = r["durum"], atanan = r["atanan"], cikarilan = r["cikarilan"], uyari = r["uyari"] };
    }

    public static Task ReddetAsync(SqlService sql, int id, string neden) => sql.ProcAsync("gorev.sp_talep_reddet", ("@id", id), ("@neden", neden));

    public static async Task<object> BildirimListeAsync(SqlService sql, bool sadeceOkunmamis) =>
        (await sql.ProcAsync("gorev.sp_bildirim_listele", ("@sadece_okunmamis", sadeceOkunmamis))).Select(r => new
        {
            id = r["id"], tur = r["tur"], mesaj = r["mesaj"], talepId = r["talep_id"], tarih = r["tarih"], okundu = r["okundu"],
        }).ToList();

    public static Task BildirimOkunduAsync(SqlService sql, int? id) => sql.ProcAsync("gorev.sp_bildirim_okundu", ("@id", id));
}
