using System.Globalization;
using System.Text.Json;

namespace Gorevlendirme;

public sealed record AktarimPlani(string Json, Dictionary<string, int> Sayilar, string Ozet);

/// <summary>Eski araç verisini <c>gorev.sp_eski_aktar</c> için JSON'a çevirir (Dilim 10). Saf mantık: SQL ve dosya gerektirmez, birim testlenir.
/// Kurallar: görevli+haftalı → talep+atama (eşleşen kişi) ya da tarihsiz geçmiş (eşleşmeyen kişi / haftasız); izinli → onaylı izin; raporlu → evraksız rapor;
/// müsait aktarılmaz. Aynı kişi+gün tek kayıtta kalır (rapor &gt; görev &gt; izin).</summary>
public static class EskiAktarim
{
    private static string Ak(string? s) { var k = TakvimCozumleyici.Katla(s); var sb = new System.Text.StringBuilder(k.Length); foreach (var c in k) if (char.IsLetterOrDigit(c)) sb.Append(c); return sb.ToString(); }

    /// <summary>Atamadaki serbest proje metnini (ProjeId yok/yetim) eski proje kaydına çözer; çözemezse null.
    /// Sıra: (1) ad birebir (2) ad+lokasyon birleşik ("AİC/MCT Karapınar") (3) en uzun proje adı öneki + kalan metin bilinen bir lokasyon.
    /// Amaç: "Ad Lokasyon" metni ayrı bir kök proje olarak AÇILMASIN, ilgili ana projenin Konum'u olsun.</summary>
    internal static Func<string, EskiProje?> ProjeAdiCozucu(IEnumerable<EskiProje> projeler)
    {
        var liste = projeler.Where(p => Ak(p.Ad).Length > 0).OrderBy(p => p.Id).ToList();
        var tamAd = new Dictionary<string, EskiProje>();
        var adLok = new Dictionary<string, EskiProje>();
        foreach (var p in liste) { tamAd.TryAdd(Ak(p.Ad), p); if (Ak(p.Lokasyon).Length > 0) adLok.TryAdd(Ak(p.Ad) + Ak(p.Lokasyon), p); }
        var lokasyonlar = liste.Select(p => Ak(p.Lokasyon)).Where(l => l.Length > 0).ToHashSet();
        return metin =>
        {
            var k = Ak(metin);
            if (k.Length == 0) return null;
            if (adLok.TryGetValue(k, out var al)) return al;
            if (tamAd.TryGetValue(k, out var ta)) return ta;
            foreach (var p in liste.OrderByDescending(x => Ak(x.Ad).Length))
            {
                var ad = Ak(p.Ad);
                if (ad.Length < 3 || k.Length <= ad.Length || !k.StartsWith(ad, StringComparison.Ordinal)) continue;
                var kalan = k[ad.Length..];
                if (!lokasyonlar.Contains(kalan)) continue;
                return adLok.TryGetValue(ad + kalan, out var eslesen) ? eslesen : p;
            }
            return null;
        };
    }

    private static readonly string[] GunAnahtarlari = { "pzt", "sal", "car", "per", "cum", "cmt", "paz" };
    private const int AzamiGun = 92;   // talepler.CK_talepler_tarih

    public static AktarimPlani Planla(EskiVeri v, IReadOnlyList<KadroKisi> kadro)
    {
        var kadroSicil = kadro.Where(k => EskiVeriDenetimi.SicilAnahtar(k.Sicil).Length > 0).GroupBy(k => EskiVeriDenetimi.SicilAnahtar(k.Sicil)).ToDictionary(g => g.Key, g => g.ToList());
        var kadroAd = kadro.GroupBy(k => TakvimCozumleyici.Katla(k.Ad)).ToDictionary(g => g.Key, g => g.ToList());
        var personel = v.Personel.GroupBy(p => p.Id).ToDictionary(g => g.Key, g => g.First());
        var proje = v.Projeler.GroupBy(p => p.Id).ToDictionary(g => g.Key, g => g.First());
        var adCoz = ProjeAdiCozucu(v.Projeler);

        string? SicilBul(string sicil, string ad)
        {
            var sk = EskiVeriDenetimi.SicilAnahtar(sicil);
            if (sk.Length > 0 && kadroSicil.TryGetValue(sk, out var ks) && ks.Count == 1) return ks[0].Sicil;
            if (kadroAd.TryGetValue(TakvimCozumleyici.Katla(ad), out var ka) && ka.Count == 1) return ka[0].Sicil;
            return null;
        }

        var esle = new Dictionary<long, string?>();
        foreach (var p in v.Personel) esle[p.Id] = SicilBul(p.Sicil, p.Ad);

        var hafta = new Dictionary<long, DateOnly>();
        foreach (var h in v.Haftalar)
            if (DateOnly.TryParseExact(h.Baslangic, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var d)) hafta[h.Id] = d;

        // proje yolu: kökten yaprağa en çok 3 ad (Ana/Alt/Faaliyet); eksikler "Genel"; lokasyon = Konum
        (string Ana, string Alt, string Faaliyet, string Konum, string Proje) Yol(EskiAtama a)
        {
            var zincir = new List<string>();
            var pr0 = a.ProjeId is long pid0 && proje.TryGetValue(pid0, out var pk0) ? pk0 : (a.ProjeAdi.Length > 0 ? adCoz(a.ProjeAdi) : null);
            if (pr0 is { } pr)
            {
                var cur = pr; var gor = new HashSet<long>();
                while (cur != null && gor.Add(cur.Id))
                {
                    if (cur.Ad.Length > 0) zincir.Insert(0, cur.Ad);
                    cur = cur.ParentId is long up && proje.TryGetValue(up, out var u) ? u : null;
                }
                var lok = pr.Lokasyon;
                var ana = zincir.Count > 0 ? zincir[0] : (a.ProjeAdi.Length > 0 ? a.ProjeAdi : "(Projesiz)");
                return (ana, zincir.Count > 1 ? zincir[1] : "Genel", zincir.Count > 2 ? zincir[2] : "Genel", lok.Length > 0 ? lok : "Belirtilmemiş", pr.Ad);
            }
            var ad = a.ProjeAdi.Length > 0 ? a.ProjeAdi : "(Projesiz)";
            return (ad, "Genel", "Genel", "Belirtilmemiş", a.ProjeAdi);
        }

        string? SorumluSicil(string ad) => ad.Length == 0 ? null : kadroAd.TryGetValue(TakvimCozumleyici.Katla(ad), out var k) && k.Count == 1 ? k[0].Sicil : null;

        var gorevAdaylari = new List<(EskiAtama A, string? Sicil, List<DateOnly> Gunler)>();
        var izinGun = new Dictionary<string, HashSet<DateOnly>>();
        var raporGun = new Dictionary<string, HashSet<DateOnly>>();
        var tarihsiz = new List<object>();
        int atlanan = 0, tarihsizEsmeyen = 0;

        foreach (var a in v.Atamalar)
        {
            var durum = TakvimCozumleyici.Katla(a.Durum);
            if (durum is not ("gorevli" or "izinli" or "raporlu")) { if (durum != "musait") atlanan++; continue; }
            string? sicil = null; var kisiVar = false;
            if (a.PersonelId is long pid && personel.TryGetValue(pid, out var pk)) { kisiVar = true; sicil = esle[pid]; _ = pk; }
            else sicil = SicilBul("", a.PersonelAdi);
            var adi = a.PersonelId is long p2 && personel.TryGetValue(p2, out var pp) ? pp.Ad : a.PersonelAdi;
            _ = kisiVar;

            if (!hafta.TryGetValue(a.HaftaId, out var pzt))
            {
                if (durum == "gorevli" && (sicil != null || adi.Length > 0))
                {
                    var y = Yol(a);
                    tarihsiz.Add(new { sicil, personelAdi = sicil == null ? adi : null, ana = y.Ana, proje = y.Proje.Length > 0 ? y.Proje : null, metin = a.GorevMetni.Length > 0 ? a.GorevMetni : null, sorumluAdi = a.Sorumlu.Length > 0 ? a.Sorumlu : null });
                }
                else atlanan++;
                continue;
            }
            var gunler = new List<DateOnly>();
            try
            {
                using var doc = JsonDocument.Parse(string.IsNullOrWhiteSpace(a.GunlerJson) ? "{}" : a.GunlerJson);
                if (doc.RootElement.ValueKind == JsonValueKind.Object)
                    for (var i = 0; i < 7; i++)
                        if (doc.RootElement.TryGetProperty(GunAnahtarlari[i], out var x) && x.ValueKind == JsonValueKind.True) gunler.Add(pzt.AddDays(i));
            }
            catch (JsonException) { /* günsüz */ }
            if (gunler.Count == 0) { atlanan++; continue; }

            if (sicil == null)
            {
                // eşleşmeyen kişi: tarihli kayıt tutulamaz; kim-nereye bilgisi tarihsiz geçmişe
                if (durum == "gorevli" && adi.Length > 0)
                {
                    var y = Yol(a); tarihsizEsmeyen++;
                    tarihsiz.Add(new { sicil = (string?)null, personelAdi = adi, ana = y.Ana, proje = y.Proje.Length > 0 ? y.Proje : null, metin = a.GorevMetni.Length > 0 ? a.GorevMetni : null, sorumluAdi = a.Sorumlu.Length > 0 ? a.Sorumlu : null });
                }
                else atlanan++;
                continue;
            }
            if (durum == "gorevli") gorevAdaylari.Add((a, sicil, gunler));
            else if (durum == "izinli") { if (!izinGun.TryGetValue(sicil, out var s)) izinGun[sicil] = s = new(); foreach (var g in gunler) s.Add(g); }
            else { if (!raporGun.TryGetValue(sicil, out var s)) raporGun[sicil] = s = new(); foreach (var g in gunler) s.Add(g); }
        }

        // öncelik: rapor > görev > izin; aynı kişi+gün tek kayıt
        var gorevGun = new HashSet<(string, DateOnly)>();
        var gorevler = new List<object>();
        int cakisanAtlanan = 0, talepSay = 0, atamaSay = 0;
        foreach (var (a, sicil, gunler) in gorevAdaylari.OrderBy(x => x.A.Id))
        {
            var kalan = gunler.Where(g => !(raporGun.TryGetValue(sicil!, out var r) && r.Contains(g)) && !gorevGun.Contains((sicil!, g))).OrderBy(g => g).ToList();
            cakisanAtlanan += gunler.Count - kalan.Count;
            if (kalan.Count == 0) continue;
            foreach (var g in kalan) gorevGun.Add((sicil!, g));
            var y = Yol(a); var ss = SorumluSicil(a.Sorumlu);
            // ≤92 gün aralığına bölerek
            var i = 0;
            while (i < kalan.Count)
            {
                var ilk = kalan[i]; var parca = new List<string>();
                while (i < kalan.Count && kalan[i].DayNumber - ilk.DayNumber <= AzamiGun) { parca.Add(kalan[i].ToString("yyyy-MM-dd")); i++; }
                gorevler.Add(new { eskiId = a.Id, sicil, ana = y.Ana, alt = y.Alt, faaliyet = y.Faaliyet, konum = y.Konum, metin = a.GorevMetni.Length > 0 ? a.GorevMetni : null, sorumluSicil = ss, sorumluAdi = ss == null && a.Sorumlu.Length > 0 ? a.Sorumlu : null, gunler = parca });
                talepSay++; atamaSay += parca.Count;
            }
        }
        var izinler = new List<object>();
        foreach (var (sicil, set) in izinGun)
        {
            var kalan = set.Where(g => !gorevGun.Contains((sicil, g)) && !(raporGun.TryGetValue(sicil, out var r) && r.Contains(g))).OrderBy(g => g).Select(g => g.ToString("yyyy-MM-dd")).ToList();
            if (kalan.Count > 0) izinler.Add(new { sicil, gunler = kalan });
        }
        var raporlar = new List<object>(); int raporGunSay = 0;
        foreach (var (sicil, set) in raporGun)
        {
            var sirali = set.OrderBy(g => g).ToList();
            var ilk = sirali[0]; var son = ilk;
            for (var i = 1; i < sirali.Count; i++)
            {
                if (sirali[i].DayNumber - son.DayNumber <= 1) son = sirali[i];
                else { raporlar.Add(new { sicil, ilk = ilk.ToString("yyyy-MM-dd"), son = son.ToString("yyyy-MM-dd") }); ilk = son = sirali[i]; }
            }
            raporlar.Add(new { sicil, ilk = ilk.ToString("yyyy-MM-dd"), son = son.ToString("yyyy-MM-dd") });
            raporGunSay += sirali.Count;
        }

        var sayi = new Dictionary<string, int>
        {
            ["talep"] = talepSay, ["atama"] = atamaSay, ["izin"] = izinler.Count, ["rapor"] = raporlar.Count, ["raporGun"] = raporGunSay,
            ["tarihsiz"] = tarihsiz.Count, ["tarihsizEslesmeyen"] = tarihsizEsmeyen, ["cakisanAtlanan"] = cakisanAtlanan, ["atlanan"] = atlanan,
        };
        var json = JsonSerializer.Serialize(new { gorevler, tarihsiz, izinler, raporlar });
        var ozet = $"Talep {talepSay} · atama (kişi-gün) {atamaSay} · izinli kişi {izinler.Count} · rapor {raporlar.Count} ({raporGunSay} gün) · tarihsiz geçmiş {tarihsiz.Count} (kadroda eşleşmeyen {tarihsizEsmeyen}) · çakışma nedeniyle atlanan gün {cakisanAtlanan} · aktarılmayan {atlanan}";
        return new AktarimPlani(json, sayi, ozet);
    }
}
