namespace Gorevlendirme;

/// <summary>Gorev şemasındaki kadro satırı (eşleştirme için).</summary>
public sealed record KadroKisi(string Sicil, string Ad, bool Aktif);
/// <summary>Gorev şemasındaki proje havuzu satırı.</summary>
public sealed record HavuzKaydi(int Id, int? UstId, int Seviye, string Ad);
