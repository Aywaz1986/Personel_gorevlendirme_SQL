using System.Globalization;
using System.Text;
using System.Text.Json;

namespace Gorevlendirme;

/// <summary>Kuru çalıştırma sonucu. Metin: kopyalanıp paylaşılabilen düz rapor; Sayilar: ekran özeti.</summary>
public sealed record EskiVeriRaporu(Dictionary<string, int> Sayilar, string Metin);

/// <summary>
/// Eski araç verisini yeni şemayla karşılaştırır ve NE olacağını raporlar; hiçbir şey yazmaz (saf mantık, SQL/SQLite içermez).
/// Eşleme kuralları docs/TASIMA.md ile aynıdır.
/// </summary>
public static class EskiVeriDenetimi
{
    private static readonly string[] GunAnahtarlari = { "pzt", "sal", "car", "per", "cum", "cmt", "paz" };
    private const int Ornek = 25;

    internal static string Maske(string? ad)
    {
        if (string.IsNullOrWhiteSpace(ad)) return "(boş)";
        return string.Join(' ', ad.Split(' ', StringSplitOptions.RemoveEmptyEntries).Select(k => char.ToUpper(k[0], CultureInfo.GetCultureInfo("tr-TR")) + "***"));
    }

    private static double Benzerlik(Dictionary<string, int> x, Dictionary<string, int> y)
    {
        int min = 0, max = 0;
        foreach (var k in x.Keys.Union(y.Keys)) { var a = x.GetValueOrDefault(k); var b = y.GetValueOrDefault(k); min += Math.Min(a, b); max += Math.Max(a, b); }
        return max == 0 ? 0 : (double)min / max;
    }

    private static DateOnly PazartesiOf(DateOnly d) => d.AddDays(-(((int)d.DayOfWeek + 6) % 7));

    internal static string SicilMaske(string? s) => string.IsNullOrWhiteSpace(s) ? "(yok)" : s.Length <= 2 ? "***" : "***" + s[^2..];
    private static string SicilAnahtar(string? s) => (s ?? "").Trim().TrimStart('0').ToUpperInvariant();

    public static EskiVeriRaporu Raporla(EskiVeri v, IReadOnlyList<KadroKisi> kadro, IReadOnlyList<HavuzKaydi> havuz, bool maskele)
    {
        string Ad(string? a) => maskele ? Maske(a) : string.IsNullOrWhiteSpace(a) ? "(boş)" : a;
        var sayi = new Dictionary<string, int>();
        var sb = new StringBuilder();
        var dikkat = 0;
        void Satir(string s = "") => sb.AppendLine(s);
        void Baslik(string s) { Satir(); Satir("## " + s); }
        void Sorun(string s) { dikkat++; Satir("! " + s); }

        // ---------- kadro dizinleri ----------
        var kadroSicil = kadro.Where(k => SicilAnahtar(k.Sicil).Length > 0).GroupBy(k => SicilAnahtar(k.Sicil)).ToDictionary(g => g.Key, g => g.ToList());
        var kadroAd = kadro.GroupBy(k => TakvimCozumleyici.Katla(k.Ad)).ToDictionary(g => g.Key, g => g.ToList());

        // ---------- personel eşleşmesi ----------
        Baslik("1. Personel eşleşmesi");
        var esle = new Dictionary<long, string?>();   // eski personel id -> yeni sicil (null = eşleşmedi)
        int bySicil = 0, byAd = 0, belirsiz = 0, yok = 0, adFarkli = 0;
        var adFarkOrnek = new List<string>(); var belirsizOrnek = new List<string>(); var yokP = new List<EskiPersonel>();
        foreach (var p in v.Personel)
        {
            var sk = SicilAnahtar(p.Sicil);
            if (sk.Length > 0 && kadroSicil.TryGetValue(sk, out var ks) && ks.Count == 1)
            {
                bySicil++; esle[p.Id] = ks[0].Sicil;
                if (TakvimCozumleyici.Katla(ks[0].Ad) != TakvimCozumleyici.Katla(p.Ad)) { adFarkli++; if (adFarkOrnek.Count < Ornek) adFarkOrnek.Add($"eski#{p.Id} {Ad(p.Ad)} ↔ yeni {Ad(ks[0].Ad)}"); }
                continue;
            }
            if (kadroAd.TryGetValue(TakvimCozumleyici.Katla(p.Ad), out var ka))
            {
                if (ka.Count == 1) { byAd++; esle[p.Id] = ka[0].Sicil; continue; }
                belirsiz++; esle[p.Id] = null; if (belirsizOrnek.Count < Ornek) belirsizOrnek.Add($"eski#{p.Id} {Ad(p.Ad)} ({ka.Count} aynı adlı kadro kaydı)");
                continue;
            }
            yok++; esle[p.Id] = null; yokP.Add(p);
        }
        sayi["personel"] = v.Personel.Count; sayi["personelSicil"] = bySicil; sayi["personelAd"] = byAd; sayi["personelBelirsiz"] = belirsiz; sayi["personelYok"] = yok;
        Satir($"Eski personel: {v.Personel.Count} (aktif {v.Personel.Count(p => p.Aktif)}). Yeni kadro: {kadro.Count}.");
        Satir($"Sicil ile eşleşen: {bySicil} · Yalnız adla eşleşen: {byAd} · Belirsiz (aynı ad birden çok): {belirsiz} · Eşleşmeyen: {yok}");
        if (adFarkli > 0) { Sorun($"Sicil eşleşti ama ad farklı: {adFarkli} (yanlış sicil olabilir)"); foreach (var o in adFarkOrnek) Satir("   " + o); }
        if (belirsiz > 0) { Sorun($"Belirsiz eşleşme: {belirsiz}"); foreach (var o in belirsizOrnek) Satir("   " + o); }

        // ---------- hafta / atama çözümleme ----------
        var hafta = new Dictionary<long, DateOnly>(); var haftaBozuk = 0; var haftaPzt = 0;
        foreach (var h in v.Haftalar)
        {
            if (DateOnly.TryParseExact(h.Baslangic, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var d)) { hafta[h.Id] = d; if (d.DayOfWeek != DayOfWeek.Monday) haftaPzt++; }
            else haftaBozuk++;
        }
        var projeIds = v.Projeler.Select(p => p.Id).ToHashSet();
        var personelIds = v.Personel.GroupBy(p => p.Id).ToDictionary(g => g.Key, g => g.First());
        var durumSay = new Dictionary<string, (int Atama, int KisiGun, int HaftaSonu)>();
        var bilinmeyenDurum = new Dictionary<string, int>();
        int haftasiz = 0, gunBozuk = 0, gunYok = 0, personelBilinmeyen = 0, gorevliProjesiz = 0, gorevliProjeKayip = 0;
        var cakisma = new List<string>(); int cakismaSay = 0;
        var kisiGun = new Dictionary<(string, DateOnly), long>();
        var kisiAtama = new Dictionary<string, int>();   // anahtar -> atama sayısı (eşleşmeyenler için)
        DateOnly? min = null, max = null;
        var haftasizListe = new List<(EskiAtama A, string Durum)>();
        var sorumluSay = new Dictionary<string, int>();
        var sorumluAd = new Dictionary<string, string>();

        foreach (var a in v.Atamalar)
        {
            var durum = TakvimCozumleyici.Katla(a.Durum);
            if (durum is not ("gorevli" or "izinli" or "raporlu" or "musait"))
            { bilinmeyenDurum[a.Durum.Length == 0 ? "(boş)" : a.Durum] = bilinmeyenDurum.GetValueOrDefault(a.Durum.Length == 0 ? "(boş)" : a.Durum) + 1; continue; }
            if (!hafta.TryGetValue(a.HaftaId, out var pzt)) { haftasiz++; haftasizListe.Add((a, durum)); continue; }

            var gunler = new List<int>();
            try
            {
                using var doc = JsonDocument.Parse(string.IsNullOrWhiteSpace(a.GunlerJson) ? "{}" : a.GunlerJson);
                if (doc.RootElement.ValueKind != JsonValueKind.Object) throw new JsonException();
                for (var i = 0; i < 7; i++)
                    if (doc.RootElement.TryGetProperty(GunAnahtarlari[i], out var x) && x.ValueKind == JsonValueKind.True) gunler.Add(i);
            }
            catch (JsonException) { gunBozuk++; continue; }
            if (gunler.Count == 0) { gunYok++; continue; }

            // kişi anahtarı
            string? sicil = null; string anahtar;
            if (a.PersonelId is long pid && personelIds.ContainsKey(pid)) { esle.TryGetValue(pid, out sicil); anahtar = sicil != null ? "S:" + sicil : "E:" + pid; }
            else
            {
                personelBilinmeyen++;
                if (kadroAd.TryGetValue(TakvimCozumleyici.Katla(a.PersonelAdi), out var ka) && ka.Count == 1) { sicil = ka[0].Sicil; anahtar = "S:" + sicil; }
                else anahtar = "A:" + TakvimCozumleyici.Katla(a.PersonelAdi);
            }
            if (sicil == null) kisiAtama[anahtar] = kisiAtama.GetValueOrDefault(anahtar) + 1;

            var hs = gunler.Count(g => g >= 5);
            var (ta, tk, th) = durumSay.GetValueOrDefault(durum);
            durumSay[durum] = (ta + 1, tk + gunler.Count, th + hs);

            if (durum != "musait")
                foreach (var g in gunler)
                {
                    var tarih = pzt.AddDays(g);
                    if (min == null || tarih < min) min = tarih;
                    if (max == null || tarih > max) max = tarih;
                    if (kisiGun.TryGetValue((anahtar, tarih), out var onceki) && onceki != a.Id)
                    { cakismaSay++; if (cakisma.Count < Ornek) cakisma.Add($"{tarih:yyyy-MM-dd} kişi {anahtar.Split(':')[0]}:{(maskele ? "***" : anahtar[2..])} atama#{onceki} ve #{a.Id}"); }
                    else kisiGun[(anahtar, tarih)] = a.Id;
                }

            if (durum == "gorevli")
            {
                if (a.ProjeId == null && a.ProjeAdi.Length == 0) gorevliProjesiz++;
                else if (a.ProjeId is long pj && !projeIds.Contains(pj)) gorevliProjeKayip++;
                var k = TakvimCozumleyici.Katla(a.Sorumlu);
                var kk = k.Length == 0 ? "" : k;
                sorumluSay[kk] = sorumluSay.GetValueOrDefault(kk) + 1;
                if (!sorumluAd.ContainsKey(kk)) sorumluAd[kk] = a.Sorumlu;
            }
        }

        Baslik("2. Görevlendirmeler (atamalar)");
        Satir($"Toplam atama satırı: {v.Atamalar.Count} · Hafta kaydı: {v.Haftalar.Count}");
        foreach (var d in new[] { "gorevli", "izinli", "raporlu", "musait" })
        {
            var (ta, tk, th) = durumSay.GetValueOrDefault(d);
            var hedef = d switch { "gorevli" => "→ geçmiş görevlendirme (talep+atama)", "izinli" => "→ onaylı izin", "raporlu" => "→ rapor (evraksız, eski kayıt)", _ => "→ aktarılmaz (müsaitlik türetilir)" };
            Satir($"  {d,-8} atama {ta,6} · kişi-gün {tk,6} (hafta sonu {th}) {hedef}");
            sayi["atama_" + d] = ta; sayi["kisiGun_" + d] = tk;
        }
        if (min != null) Satir($"Tarih aralığı: {min:yyyy-MM-dd} – {max:yyyy-MM-dd}");
        if (haftaBozuk > 0) Sorun($"Hafta başlangıcı okunamayan kayıt: {haftaBozuk}");
        if (haftaPzt > 0) Sorun($"Pazartesi olmayan hafta başlangıcı: {haftaPzt} (gün tarihleri kayabilir)");
        if (haftasiz > 0) Sorun($"Haftası bulunamayan atama: {haftasiz} (aktarılamaz)");
        if (gunBozuk > 0) Sorun($"Gün bilgisi (JSON) bozuk atama: {gunBozuk} (aktarılamaz)");
        if (gunYok > 0) Sorun($"Hiç günü işaretli olmayan atama: {gunYok} (aktarılmaz)");
        foreach (var b in bilinmeyenDurum) Sorun($"Bilinmeyen durum \"{b.Key}\": {b.Value} atama (aktarılmaz)");
        if (personelBilinmeyen > 0) Sorun($"personelId'si personel tablosunda olmayan atama: {personelBilinmeyen} (ada göre denenir)");
        if (gorevliProjesiz > 0) Sorun($"Projesiz/adsız görevli atama: {gorevliProjesiz}");
        if (gorevliProjeKayip > 0) Sorun($"projeId'si projeler tablosunda olmayan görevli atama: {gorevliProjeKayip} (projeAdi kullanılır)");
        if (cakismaSay > 0) { Sorun($"Aynı kişi + aynı gün çakışması: {cakismaSay}"); foreach (var c in cakisma) Satir("   " + c); }
        sayi["cakisma"] = cakismaSay; sayi["haftasiz"] = haftasiz; sayi["gunBozuk"] = gunBozuk;

        if (haftasizListe.Count > 0)
        {
            Baslik("2a. Haftasız atamaların tanısı");
            var eksik = haftasizListe.GroupBy(x => x.A.HaftaId).OrderBy(g => g.Key).ToList();
            var mevcutIds = v.Haftalar.Select(h => h.Id).DefaultIfEmpty(0).ToList();
            Satir($"Farklı eksik haftaId: {eksik.Count} (en küçük {eksik.First().Key}, en büyük {eksik.Last().Key}) · mevcut hafta kaydı: {v.Haftalar.Count} (id {mevcutIds.Min()}–{mevcutIds.Max()})");
            Satir("Durum dağılımı: " + string.Join(", ", haftasizListe.GroupBy(x => x.Durum).OrderByDescending(g => g.Count()).Select(g => $"{g.Key} {g.Count()}")));
            var gm = haftasizListe.Where(x => x.A.Guncelleme is > 946684800000L and < 4102444800000L).Select(x => x.A.Guncelleme!.Value).ToList();
            if (gm.Count > 0) Satir($"Son güncelleme zamanı: {DateTimeOffset.FromUnixTimeMilliseconds(gm.Min()):yyyy-MM-dd} – {DateTimeOffset.FromUnixTimeMilliseconds(gm.Max()):yyyy-MM-dd} ({gm.Count} atamada var)");
            foreach (var g in eksik.Take(Ornek)) Satir($"   haftaId {g.Key}: {g.Count()} atama");
            if (eksik.Count > Ornek) Satir($"   … ve {eksik.Count - Ornek} haftaId daha");
            sayi["haftasizFarkliId"] = eksik.Count;
        }

        if (hafta.Count > 0)
        {
            Baslik("2b. Hafta kimliği – tarih düzeni (haftasız atamaların tarihini çıkarmak için)");
            var sirali = hafta.OrderBy(kv => kv.Key).ToList();
            var haftaAtamaSay = v.Atamalar.GroupBy(a => a.HaftaId).ToDictionary(g => g.Key, g => g.Count());
            Satir($"Hafta kayıtları (id→başlangıç (atama sayısı)), {sirali.Count} adet:");
            for (var i = 0; i < sirali.Count; i += 5)
                Satir("   " + string.Join("  ", sirali.Skip(i).Take(5).Select(kv => $"{kv.Key}→{kv.Value:yyyy-MM-dd}({haftaAtamaSay.GetValueOrDefault(kv.Key)})")));
            int ters = 0, uyumsuz = 0;
            for (var i = 1; i < sirali.Count; i++)
            {
                var a0 = sirali[i - 1]; var b0 = sirali[i];
                var gunFark = b0.Value.DayNumber - a0.Value.DayNumber;
                var beklenen = (int)(b0.Key - a0.Key);
                var tamUyum = gunFark > 0 && gunFark % 7 == 0 && gunFark / 7 == beklenen;
                if (gunFark <= 0) ters++; else if (!tamUyum) uyumsuz++;
                if (beklenen > 1) Satir($"   Boşluk {a0.Key}→{b0.Key}: id farkı {beklenen}, takvimde {(gunFark > 0 ? gunFark / 7.0 : 0):0.#} hafta · " + (tamUyum ? "UYUMLU" : "UYUMSUZ"));
            }
            var uyumlu = ters == 0 && uyumsuz == 0;
            Satir($"Kimlik sırası tarih sırasıyla {(uyumlu ? "TAM UYUMLU (her id bir sonraki haftadır)" : $"uyumsuz (ters {ters}, kaymış {uyumsuz}); tarih çıkarımı güvenilmez, YAPILMADI")}.");
            sayi["idTarihUyumlu"] = uyumlu ? 1 : 0;

            if (uyumlu && haftasizListe.Count > 0)
            {
                var cikarim = new Dictionary<long, DateOnly>();
                foreach (var id in haftasizListe.Select(x => x.A.HaftaId).Distinct())
                {
                    var onceki = sirali.Where(kv => kv.Key < id).Select(kv => (KeyValuePair<long, DateOnly>?)kv).LastOrDefault();
                    if (onceki is { } o) cikarim[id] = o.Value.AddDays(7 * (int)(id - o.Key));
                    else { var sonraki = sirali.Where(kv => kv.Key > id).Select(kv => (KeyValuePair<long, DateOnly>?)kv).FirstOrDefault(); if (sonraki is { } sn) cikarim[id] = sn.Value.AddDays(-7 * (int)(sn.Key - id)); }
                }
                var carpisma = cikarim.Values.Count(d => hafta.ContainsValue(d));
                Satir($"Çıkarım: {cikarim.Count} haftaId için tarih; en erken {(cikarim.Count > 0 ? cikarim.Values.Min() : default):yyyy-MM-dd}, en geç {(cikarim.Count > 0 ? cikarim.Values.Max() : default):yyyy-MM-dd}; var olan haftalarla çakışan tarih: {carpisma}");
                int cAtama = 0, cCakisma = 0; var cDurum = new Dictionary<string, int>(); var cOrnek = new List<string>();
                var cGun = new Dictionary<(string, DateOnly), long>();
                foreach (var (a, durum) in haftasizListe)
                {
                    if (!cikarim.TryGetValue(a.HaftaId, out var pzt2)) continue;
                    var gl = new List<int>();
                    try
                    {
                        using var doc = JsonDocument.Parse(string.IsNullOrWhiteSpace(a.GunlerJson) ? "{}" : a.GunlerJson);
                        if (doc.RootElement.ValueKind != JsonValueKind.Object) continue;
                        for (var i = 0; i < 7; i++) if (doc.RootElement.TryGetProperty(GunAnahtarlari[i], out var xx) && xx.ValueKind == JsonValueKind.True) gl.Add(i);
                    }
                    catch (JsonException) { continue; }
                    if (gl.Count == 0) continue;
                    cAtama++; cDurum[durum] = cDurum.GetValueOrDefault(durum) + gl.Count;
                    if (durum == "musait") continue;
                    string anahtar2;
                    if (a.PersonelId is long pid2 && personelIds.ContainsKey(pid2)) anahtar2 = esle.TryGetValue(pid2, out var sc) && sc != null ? "S:" + sc : "E:" + pid2;
                    else if (kadroAd.TryGetValue(TakvimCozumleyici.Katla(a.PersonelAdi), out var kk2) && kk2.Count == 1) anahtar2 = "S:" + kk2[0].Sicil;
                    else anahtar2 = "A:" + TakvimCozumleyici.Katla(a.PersonelAdi);
                    foreach (var g in gl)
                    {
                        var t = pzt2.AddDays(g);
                        if (kisiGun.ContainsKey((anahtar2, t)) || (cGun.TryGetValue((anahtar2, t), out var once) && once != a.Id))
                        { cCakisma++; if (cOrnek.Count < 10) cOrnek.Add($"{t:yyyy-MM-dd} haftaId {a.HaftaId} atama#{a.Id}"); }
                        else cGun[(anahtar2, t)] = a.Id;
                    }
                }
                Satir($"Tarihi çıkarılabilen atama: {cAtama} (kişi-gün: " + string.Join(", ", cDurum.OrderByDescending(kv => kv.Value).Select(kv => $"{kv.Key} {kv.Value}")) + ")");
                if (cCakisma > 0) { Sorun($"Çıkarılan tarihlerle aynı kişi+gün çakışması: {cCakisma} (çıkarım yanlış olabilir)"); foreach (var o2 in cOrnek) Satir("   " + o2); }
                else Satir("Çıkarılan tarihlerle mevcut kayıtlar arasında çakışma YOK (çıkarımı destekler).");
                sayi["cikarimAtama"] = cAtama; sayi["cikarimCakisma"] = cCakisma; sayi["cikarimCarpisma"] = carpisma;
            }
        }

        if (haftasizListe.Count > 0)
        {
            Baslik("2c. Haftasız atamalar: kopya mı, başka kanıt var mı?");
            // 1) güncelleme zamanı dağılımı (haftalı atamalar ile karşılaştırma)
            var haftali = v.Atamalar.Where(a => hafta.ContainsKey(a.HaftaId) && a.Guncelleme is > 946684800000L and < 4102444800000L).ToList();
            if (haftali.Count > 0)
            {
                var ag = haftali.Select(a => DateTimeOffset.FromUnixTimeMilliseconds(a.Guncelleme!.Value).UtcDateTime).ToList();
                var ayniGun = ag.Count(d => d >= new DateTime(2026, 8, 28) && d < new DateTime(2026, 8, 31));
                Satir($"Haftası olan atamaların güncelleme zamanı: {ag.Min():yyyy-MM-dd} – {ag.Max():yyyy-MM-dd}; 28–30 Ağustos'a düşen: {ayniGun}/{haftali.Count}");
            }

            // 2) kimlik imzası: kişi + günler + durum + proje + metin + sorumlu
            string Anahtar(EskiAtama a)
            {
                if (a.PersonelId is long pid && personelIds.ContainsKey(pid)) return esle.TryGetValue(pid, out var sc) && sc != null ? "S:" + sc : "E:" + pid;
                return kadroAd.TryGetValue(TakvimCozumleyici.Katla(a.PersonelAdi), out var kk) && kk.Count == 1 ? "S:" + kk[0].Sicil : "A:" + TakvimCozumleyici.Katla(a.PersonelAdi);
            }
            string Imza(EskiAtama a, string durum)
            {
                var gl = new List<int>();
                try
                {
                    using var doc = JsonDocument.Parse(string.IsNullOrWhiteSpace(a.GunlerJson) ? "{}" : a.GunlerJson);
                    if (doc.RootElement.ValueKind == JsonValueKind.Object)
                        for (var i = 0; i < 7; i++) if (doc.RootElement.TryGetProperty(GunAnahtarlari[i], out var xx) && xx.ValueKind == JsonValueKind.True) gl.Add(i);
                }
                catch (JsonException) { /* imzada boş gün */ }
                var proje = a.ProjeAdi.Length > 0 ? a.ProjeAdi : (a.ProjeId is long pj && v.Projeler.FirstOrDefault(p => p.Id == pj) is { } pr ? pr.Ad : "");
                return string.Join("|", Anahtar(a), string.Join(",", gl), durum, TakvimCozumleyici.Katla(proje), TakvimCozumleyici.Katla(a.GorevMetni), TakvimCozumleyici.Katla(a.Sorumlu));
            }
            Dictionary<string, int> Set(IEnumerable<(EskiAtama A, string Durum)> l)
            {
                var d = new Dictionary<string, int>();
                foreach (var (a, du) in l) { if (du == "musait") continue; var k = Imza(a, du); d[k] = d.GetValueOrDefault(k) + 1; }
                return d;
            }
            var mevcutSet = new Dictionary<long, Dictionary<string, int>>();
            foreach (var g in v.Atamalar.Where(a => hafta.ContainsKey(a.HaftaId)).GroupBy(a => a.HaftaId))
                mevcutSet[g.Key] = Set(g.Select(a => (a, TakvimCozumleyici.Katla(a.Durum))));
            int kopya = 0, yarim = 0;
            Satir("Her haftasız haftaId için en benzer mevcut hafta (imza benzerliği; 100% = aynı görevlendirmeler):");
            foreach (var g in haftasizListe.GroupBy(x => x.A.HaftaId).OrderBy(g => g.Key))
            {
                var set = Set(g);
                if (set.Count == 0) { Satir($"   haftaId {g.Key}: yalnız müsait kayıt"); continue; }
                var en = mevcutSet.Select(kv => (Id: kv.Key, Sk: Benzerlik(set, kv.Value))).OrderByDescending(x => x.Sk).First();
                if (en.Sk >= 0.8) kopya++; else if (en.Sk >= 0.5) yarim++;
                Satir($"   haftaId {g.Key}: {set.Values.Sum()} atama → en benzer id {en.Id} ({hafta[en.Id]:yyyy-MM-dd}) %{(int)Math.Round(en.Sk * 100)}");
            }
            Satir($"Özet: %80 ve üzeri benzeyen haftasız hafta: {kopya} · %50–80: {yarim} · toplam {haftasizListe.Select(x => x.A.HaftaId).Distinct().Count()}");
            sayi["kopyaHafta"] = kopya; sayi["yarimKopyaHafta"] = yarim;

            // 3) fazla mesai kayıtlarından tarih kanıtı
            var fmGun = v.FazlaMesai.Where(f => f.AtamaId != null && DateOnly.TryParseExact(f.Tarih.Length >= 10 ? f.Tarih[..10] : f.Tarih, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out _))
                .Select(f => (f.AtamaId!.Value, T: DateOnly.ParseExact(f.Tarih[..10], "yyyy-MM-dd", CultureInfo.InvariantCulture))).ToList();
            var atamaHafta = haftasizListe.ToDictionary(x => x.A.Id, x => x.A.HaftaId);
            int kesin = 0, celiski = 0;
            foreach (var g in fmGun.Where(f => atamaHafta.ContainsKey(f.Item1)).GroupBy(f => atamaHafta[f.Item1]).OrderBy(g => g.Key))
            {
                var pazartesiler = g.Select(f => PazartesiOf(f.T)).Distinct().OrderBy(d => d).ToList();
                if (pazartesiler.Count == 1) { kesin++; Satir($"   FM kanıtı: haftaId {g.Key} → {pazartesiler[0]:yyyy-MM-dd} ({g.Count()} kayıt)"); }
                else { celiski++; Satir($"   FM kanıtı ÇELİŞKİLİ: haftaId {g.Key} → {string.Join(", ", pazartesiler.Select(d => d.ToString("yyyy-MM-dd")))}"); }
            }
            Satir($"Fazla mesai kayıtlarından tarihi belli olan haftasız hafta: {kesin} (çelişkili {celiski})");
            sayi["fmTarihliHafta"] = kesin; sayi["fmCeliskili"] = celiski;
        }

        // eşleşmeyen personelin atamaları
        var yokId = yokP.Select(p => p.Id).ToHashSet();
        Baslik("3. Eşleşmeyen personel (aktarılmaz; kararınızı bekler)");
        if (yokP.Count == 0) Satir("Yok.");
        else
        {
            Satir($"{yokP.Count} kişi yeni kadroda yok. Bunlara bağlı atamalar:");
            var perAtama = v.Atamalar.Where(a => a.PersonelId is long x && yokId.Contains(x)).GroupBy(a => a.PersonelId!.Value).ToDictionary(g => g.Key, g => g.Count());
            foreach (var p in yokP.OrderByDescending(p => perAtama.GetValueOrDefault(p.Id)).Take(Ornek))
                Satir($"   eski#{p.Id} {Ad(p.Ad)} sicil {(maskele ? SicilMaske(p.Sicil) : p.Sicil)} {(p.Aktif ? "aktif" : "pasif")} · atama {perAtama.GetValueOrDefault(p.Id)}");
            if (yokP.Count > Ornek) Satir($"   … ve {yokP.Count - Ornek} kişi daha");
            sayi["yokAtama"] = perAtama.Values.Sum();
        }
        if (kisiAtama.Count > 0 && personelBilinmeyen > 0) Satir($"personelId'siz ve ada da eşleşmeyen kişi anahtarı: {kisiAtama.Count}");

        // ---------- sorumlu ----------
        Baslik("4. Sorumlu (atamalardaki metin)");
        var kadroAdlari = new HashSet<string>(kadroAd.Where(kv => kv.Value.Count == 1).Select(kv => kv.Key));
        var eskiSorumluAd = v.Sorumlular.Select(s => TakvimCozumleyici.Katla(s.Ad)).ToHashSet();
        int sEs = 0, sEsmez = 0;
        foreach (var kv in sorumluSay.OrderByDescending(x => x.Value))
        {
            var esl = kv.Key.Length > 0 && kadroAdlari.Contains(kv.Key);
            if (esl) sEs++; else sEsmez++;
        }
        Satir($"Farklı sorumlu metni: {sorumluSay.Count} · kadroda adla eşleşen: {sEs} · eşleşmeyen (metin olarak saklanır): {sEsmez}");
        foreach (var kv in sorumluSay.OrderByDescending(x => x.Value).Take(Ornek))
        {
            var durumu = kv.Key.Length == 0 ? "boş" : kadroAdlari.Contains(kv.Key) ? "kadroda" : eskiSorumluAd.Contains(kv.Key) ? "yalnız eski sorumlular listesinde" : "hiçbir yerde yok";
            Satir($"   {Ad(kv.Key.Length == 0 ? "" : sorumluAd[kv.Key])} · {kv.Value} atama · {durumu}");
        }
        sayi["sorumluFarkli"] = sorumluSay.Count; sayi["sorumluEsmez"] = sEsmez;

        // ---------- proje ağacı ----------
        Baslik("5. Proje ağacı → proje havuzu");
        var proje = v.Projeler.GroupBy(p => p.Id).ToDictionary(g => g.Key, g => g.First());
        int yetim = 0, dongu = 0, asiri = 0, konumlu = 0, konumTasar = 0;
        var derinlik = new SortedDictionary<int, int>();
        foreach (var p in proje.Values)
        {
            var d = 1; var cur = p; var gor = new HashSet<long> { p.Id }; var bozuk = false;
            while (cur.ParentId is long up)
            {
                if (!proje.TryGetValue(up, out var ust)) { yetim++; bozuk = true; break; }
                if (!gor.Add(ust.Id)) { dongu++; bozuk = true; break; }
                d++; cur = ust;
            }
            if (bozuk) continue;
            derinlik[d] = derinlik.GetValueOrDefault(d) + 1;
            if (d > 3) asiri++;
            if (p.Lokasyon.Length > 0) { konumlu++; if (d + 1 > 4) konumTasar++; }
        }
        Satir($"Eski proje kaydı: {v.Projeler.Count} (aktif {v.Projeler.Count(p => p.Aktif)}). Derinlik dağılımı: " + (derinlik.Count == 0 ? "-" : string.Join(", ", derinlik.Select(kv => $"{kv.Key}. düzey {kv.Value}"))));
        Satir("Eşleme: 1. düzey = Ana Proje, 2 = Alt Proje, 3 = Faaliyet; lokasyon dolu ise altına Konum. En fazla 4 düzey.");
        Satir($"Lokasyonu dolu proje: {konumlu}");
        if (yetim > 0) Sorun($"Üst kaydı bulunamayan proje (parentId yetim): {yetim}");
        if (dongu > 0) Sorun($"Döngülü üst-alt ilişkisi: {dongu}");
        if (asiri > 0) Sorun($"3. düzeyden derin proje: {asiri} (havuzda karşılığı yok)");
        if (konumTasar > 0) Sorun($"Lokasyonu Konum olarak eklenemeyecek proje: {konumTasar} (düzey 4'ü aşar)");
        var kardesTekrar = proje.Values.GroupBy(p => (p.ParentId, TakvimCozumleyici.Katla(p.Ad))).Where(g => g.Count() > 1).ToList();
        if (kardesTekrar.Count > 0)
        {
            Sorun($"Aynı üstte aynı adlı kardeş proje grubu: {kardesTekrar.Count} (aktarımda birleştirilir)");
            int ayrisan = 0, birebir = 0;
            foreach (var g in kardesTekrar)
            {
                var lok = g.Select(x => TakvimCozumleyici.Katla(x.Lokasyon)).ToList();
                if (lok.Distinct().Count() == lok.Count) ayrisan++; else birebir++;
            }
            Satir($"   Lokasyonlarıyla ayrışan: {ayrisan} grup (birleştirilince her lokasyon Konum olur) · lokasyonu da aynı olan: {birebir} grup (gerçek tekrar)");
            foreach (var g in kardesTekrar.Take(Ornek)) Satir($"   \"{g.First().Ad}\" × {g.Count()}  (eski#{string.Join(",", g.Select(x => x.Id))}) lokasyon: {string.Join(" | ", g.Select(x => x.Lokasyon.Length == 0 ? "(boş)" : x.Lokasyon))}");
            sayi["kardesAyrisan"] = ayrisan; sayi["kardesBirebir"] = birebir;
        }
        var havuzKok = havuz.Where(h => h.UstId == null).Select(h => TakvimCozumleyici.Katla(h.Ad)).ToHashSet();
        var kokler = proje.Values.Where(p => p.ParentId == null).ToList();
        var zatenVar = kokler.Count(p => havuzKok.Contains(TakvimCozumleyici.Katla(p.Ad)));
        Satir($"Kök (Ana Proje) sayısı: {kokler.Count} · havuzda aynı adla zaten olan: {zatenVar} (yeni oluşturulmaz, altına eklenir)");
        Satir("Kök projeler (en çok 25):");
        foreach (var p in kokler.Take(Ornek)) Satir($"   {(p.Aktif ? "" : "[pasif] ")}{p.Ad}");
        var projesizAd = v.Atamalar.Where(a => TakvimCozumleyici.Katla(a.Durum) == "gorevli" && a.ProjeId == null && a.ProjeAdi.Length > 0).Select(a => TakvimCozumleyici.Katla(a.ProjeAdi)).Distinct().Count();
        if (projesizAd > 0) Satir($"projeId'siz ama projeAdi'li farklı ad: {projesizAd} (Ana Proje altına ad ile açılır)");
        sayi["projeKayit"] = v.Projeler.Count; sayi["projeYetim"] = yetim; sayi["projeDongu"] = dongu; sayi["projeAsiri"] = asiri + konumTasar;

        // ---------- genel ----------
        foreach (var u in v.Uyarilar) Sorun(u);
        Baslik("Sonuç");
        Satir(dikkat == 0 ? "Dikkat gerektiren madde yok." : $"Dikkat gerektiren madde: {dikkat} ('!' ile başlayan satırlar). Bu rapor yalnız önizlemedir; hiçbir veri yazılmadı.");
        sayi["dikkat"] = dikkat;
        return new EskiVeriRaporu(sayi, "ESKİ VERİ – KURU ÇALIŞTIRMA RAPORU (hiçbir şey yazılmadı)" + Environment.NewLine + sb);
    }
}
