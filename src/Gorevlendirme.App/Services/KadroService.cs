namespace Gorevlendirme;

/// <summary>Kadro, bölüm–rol eşleştirme ve kişi istisnaları. Yetki denetimi sunucudadır (Merkez Yönetici); burada tekrar edilmez.</summary>
public static class KadroService
{
    public static async Task<object> OzetAsync(SqlService sql)
    {
        var r = (await sql.ProcAsync("gorev.sp_kadro_ozet")).First();
        return new { toplam = r["toplam"], aktif = r["aktif"], sonZaman = r["son_zaman"], sonKullanici = r["son_kullanici"], sonAyrinti = r["son_ayrinti"] };
    }

    public static async Task<object> ListeAsync(SqlService sql) =>
        (await sql.ProcAsync("gorev.sp_kadro_listele")).Select(r => new
        {
            sicilNo = r["sicil_no"], adiSoyadi = r["adi_soyadi"], bolum = r["bolum"],
            kullaniciAdi = r["kullanici_adi"], aktif = r["aktif"], rol = r["rol"],
        }).ToList();

    /// <summary>Eski veri denetimi için: kadro satırları (yalnız Merkez Yönetici okur; yetki sunucuda).</summary>
    public static async Task<List<KadroKisi>> KisilerAsync(SqlService sql) =>
        (await sql.ProcAsync("gorev.sp_kadro_listele")).Select(r =>
            new KadroKisi(Convert.ToString(r["sicil_no"]) ?? "", Convert.ToString(r["adi_soyadi"]) ?? "", r["aktif"] is not (false or 0))).ToList();

    public static async Task<object> EsitleAsync(SqlService sql)
    {
        var r = (await sql.ProcAsync("gorev.sp_ozluk_esitle")).First();
        return new { okunan = r["okunan"], eklenen = r["eklenen"], guncellenen = r["guncellenen"], pasifeAlinan = r["pasife_alinan"], degismeyen = r["degismeyen"] };
    }

    public static async Task<object> EslestirmeListeAsync(SqlService sql) =>
        (await sql.ProcAsync("gorev.sp_eslestirme_listele")).Select(r => new { bolum = r["bolum"], rol = r["rol"], kisi = r["kisi"] }).ToList();

    /// <param name="rol">SORUMLU, SAHA; boş ise eşleşme kaldırılır.</param>
    public static Task EslestirmeKaydetAsync(SqlService sql, string bolum, string? rol) =>
        sql.ProcAsync("gorev.sp_eslestirme_kaydet", ("@bolum", bolum), ("@rol", string.IsNullOrWhiteSpace(rol) ? null : rol));

    public static async Task<object> IstisnaListeAsync(SqlService sql) =>
        (await sql.ProcAsync("gorev.sp_istisna_listele")).Select(r => new
        {
            hesap = r["hesap"], sicilNo = r["sicil_no"], adiSoyadi = r["adi_soyadi"],
            yonetici = r["yonetici_mi"], sorumlu = r["sorumlu_mu"], saha = r["saha_mi"], aktif = r["aktif"], aciklama = r["aciklama"],
        }).ToList();

    public static Task IstisnaKaydetAsync(SqlService sql, string hesap, string? sicilNo, bool yonetici, bool sorumlu, bool saha, bool aktif, string? aciklama) =>
        sql.ProcAsync("gorev.sp_istisna_kaydet", ("@hesap", hesap), ("@sicil_no", string.IsNullOrWhiteSpace(sicilNo) ? null : sicilNo),
            ("@yonetici_mi", yonetici), ("@sorumlu_mu", sorumlu), ("@saha_mi", saha), ("@aktif", aktif),
            ("@aciklama", string.IsNullOrWhiteSpace(aciklama) ? null : aciklama));

    public static Task IstisnaSilAsync(SqlService sql, string hesap) => sql.ProcAsync("gorev.sp_istisna_sil", ("@hesap", hesap));
}
