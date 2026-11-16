namespace Gorevlendirme;

/// <summary>Arayüze kodlu hata döndürmek için. Kodlar: komut, baglanti, yetki, cakisma, surum, dogrulama, hata.</summary>
public class GorevException : Exception
{
    public string Code { get; }
    public GorevException(string code, string message) : base(message) => Code = code;
}
