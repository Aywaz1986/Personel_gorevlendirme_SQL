namespace Gorevlendirme;

/// <summary>Sunucunun özel hata numaralarını arayüz hata kodlarına çevirir.</summary>
public static class SqlHata
{
    /// <summary>50020 son yönetici · 50021 eksik okuma kapısı · 50022 Özlük kapsamı · 50023 yetki yok · 50024 doğrulama · 50025 ilk yönetici zaten var.</summary>
    public static GorevException Cevir(int numara, string mesaj) => numara switch
    {
        50022 or 50023 => new GorevException("yetki", mesaj),
        50020 or 50021 or 50024 or 50025 or 2601 or 2627 => new GorevException("dogrulama", mesaj),
        229 or 262 or 297 => new GorevException("yetki", "Bu işlem için SQL Server yetkiniz yok."),
        _ => new GorevException("hata", mesaj),
    };
}
