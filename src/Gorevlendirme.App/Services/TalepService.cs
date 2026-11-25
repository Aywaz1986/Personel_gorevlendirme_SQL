using System.Text.Json;

namespace Gorevlendirme;

/// <summary>Görev talebi (Proje Sorumlusu). Yetki ve doğrulama sunucudadır (006_talep.sql); burada yalnızca çağrı ve biçim çevirme vardır.</summary>
public static class TalepService
{
    public sealed record GunGirdisi(string Tarih, string Zaman, int Kisi);

    public static async Task<object> PersonelAraAsync(SqlService sql, string q) =>
        (await sql.ProcAsync("gorev.sp_personel_ara", ("@q", q))).Select(r => new
        {
            sicil = r["sicil_no"], ad = r["adi_soyadi"], bolum = r["bolum"],
        }).ToList();

    public static async Task<object> ListeAsync(SqlService sql, string? durum) =>
        (await sql.ProcAsync("gorev.sp_talep_listele", ("@durum", string.IsNullOrWhiteSpace(durum) ? null : durum))).Select(r => new
        {
            id = r["id"], kod = r["kod"], durum = r["durum"], sorumluSicil = r["sorumlu_sicil_no"], sorumluAdi = r["sorumlu_adi"],
            ilkTarih = r["ilk_tarih"], sonTarih = r["son_tarih"], ana = r["ana"], alt = r["alt"], faaliyet = r["faaliyet"], konum = r["konum"],
            gorevMetni = r["gorev_metni"], nitelik = r["nitelik"], saatBaslangic = r["saat_baslangic"], saatBitis = r["saat_bitis"],
            gunSayisi = r["gun_sayisi"], kisiGun = r["kisi_gun"], oneri = r["oneri"], atanan = r["atanan"], istenen = r["istenen"], retNedeni = r["ret_nedeni"], guncelleme = r["guncelleme"],
        }).ToList();

    /// <summary>Talep başına aktif atananların adları (görev başlığında "X atandı").</summary>
    public static async Task<object> AtananAdlarAsync(SqlService sql) =>
        (await sql.ProcAsync("gorev.sp_talep_atanan_adlar")).Select(r => new { talepId = r["talep_id"], adlar = r["adlar"] }).ToList();

    /// <summary>Sorumlu/Yönetici için salt okunur: önümüzdeki günlerde izinli ya da raporlu personel.</summary>
    public static async Task<object> IzinRaporBilgiAsync(SqlService sql, int gun) =>
        (await sql.ProcAsync("gorev.sp_izin_rapor_bilgi", ("@gun", gun))).Select(r => new
        {
            sicil = r["sicil_no"], ad = r["adi_soyadi"], gsm = r["gsm_no"], tur = r["tur"],
            ilkTarih = Convert.ToDateTime(r["ilk_tarih"]).ToString("yyyy-MM-dd"), sonTarih = Convert.ToDateTime(r["son_tarih"]).ToString("yyyy-MM-dd"), durum = r["durum"],
        }).ToList();

    public static async Task<object> GetirAsync(SqlService sql, int id)
    {
        var r = (await sql.ProcAsync("gorev.sp_talep_getir", ("@id", id))).First();
        return new
        {
            id = r["id"], kod = r["kod"], durum = r["durum"], sorumluSicil = r["sorumlu_sicil_no"], sorumluAdi = r["sorumlu_adi"],
            ana = r["ana"], alt = r["alt"], faaliyet = r["faaliyet"], konum = r["konum"],
            gorevMetni = r["gorev_metni"], nitelik = r["nitelik"], saatBaslangic = r["saat_baslangic"], saatBitis = r["saat_bitis"], retNedeni = r["ret_nedeni"],
            gunler = JsonOku(r["gunler_json"] as string), oneri = JsonOku(r["oneri_json"] as string),
        };
    }

    private static object JsonOku(string? json) =>
        string.IsNullOrWhiteSpace(json) ? Array.Empty<object>() : JsonSerializer.Deserialize<JsonElement>(json);

    public static string GunlerJson(IEnumerable<GunGirdisi> g) =>
        JsonSerializer.Serialize(g.Select(x => new { tarih = x.Tarih, zaman = x.Zaman, kisi = x.Kisi }));

    public static async Task<object> KaydetAsync(SqlService sql, int? id, string? sorumluSicil, string ana, string? alt, string faaliyet, string konum,
        string saatBaslangic, string saatBitis, string gorevMetni, string? nitelik, IEnumerable<GunGirdisi> gunler, IEnumerable<string> oneri, bool gonder)
    {
        var r = (await sql.ProcAsync("gorev.sp_talep_kaydet",
            ("@id", id), ("@sorumlu_sicil", sorumluSicil), ("@ana", ana), ("@alt", alt), ("@faaliyet", faaliyet), ("@konum", konum),
            ("@saat_baslangic", saatBaslangic), ("@saat_bitis", saatBitis), ("@gorev_metni", gorevMetni), ("@nitelik", nitelik),
            ("@gunler_json", GunlerJson(gunler)), ("@oneri_json", JsonSerializer.Serialize(oneri)), ("@gonder", gonder))).First();
        return new { id = r["id"], kod = r["kod"], durum = r["durum"], uyari = r["uyari"] };
    }

    public static Task GeriCekAsync(SqlService sql, int id) => sql.ProcAsync("gorev.sp_talep_geri_cek", ("@id", id));
}
