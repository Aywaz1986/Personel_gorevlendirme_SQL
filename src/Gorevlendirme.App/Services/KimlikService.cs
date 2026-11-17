namespace Gorevlendirme;

public record Kimlik(string Hesap, bool Kayitli, string AdiSoyadi, string? SicilNo, string? Bolum,
                     bool Yonetici, bool Sorumlu, bool Saha, string Kaynak);

public static class KimlikService
{
    /// <summary>gorev.sp_ben: bağlanan kişinin kimliği ve rolleri. Yetki sunucudaki kayıttan gelir.</summary>
    public static async Task<Kimlik> BenAsync(SqlService sql)
    {
        var r = (await sql.ProcAsync("gorev.sp_ben")).FirstOrDefault()
                ?? throw new GorevException("hata", "Kimlik bilgisi okunamadı.");
        static bool B(object? o) => o is bool b && b;
        return new Kimlik(
            Convert.ToString(r["hesap"]) ?? "", B(r["kayitli"]), Convert.ToString(r["adi_soyadi"]) ?? "",
            r["sicil_no"] as string, r["bolum"] as string, B(r["yonetici"]), B(r["sorumlu"]), B(r["saha"]),
            Convert.ToString(r["kaynak"]) ?? "YOK");
    }
}
