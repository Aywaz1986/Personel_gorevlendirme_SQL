using Microsoft.Data.Sqlite;
using Xunit;

namespace Gorevlendirme.Tests;

public class EskiVeriTests : IDisposable
{
    private readonly string _dir = Path.Combine(Path.GetTempPath(), "gorev-eski-" + Guid.NewGuid().ToString("N"));
    public EskiVeriTests() => Directory.CreateDirectory(_dir);
    public void Dispose() { SqliteConnection.ClearAllPools(); try { Directory.Delete(_dir, true); } catch { /* geçici klasör */ } }

    private string DbYap(Action<SqliteConnection> doldur)
    {
        var yol = Path.Combine(_dir, "eski.db");
        using (var cn = new SqliteConnection(new SqliteConnectionStringBuilder { DataSource = yol, Pooling = false }.ToString()))
        {
            cn.Open();
            doldur(cn);
        }
        return yol;
    }

    private static void Exec(SqliteConnection cn, string sql) { using var c = cn.CreateCommand(); c.CommandText = sql; c.ExecuteNonQuery(); }

    private static void TamSema(SqliteConnection cn)
    {
        Exec(cn, "CREATE TABLE personel (id INTEGER PRIMARY KEY, adSoyad TEXT, sicil TEXT, aktif INTEGER DEFAULT 1);");
        Exec(cn, "CREATE TABLE projeler (id INTEGER PRIMARY KEY, ad TEXT, lokasyon TEXT, aktif INTEGER DEFAULT 1, parentId INTEGER);");
        Exec(cn, "CREATE TABLE sorumlular (id INTEGER PRIMARY KEY, adSoyad TEXT, aktif INTEGER DEFAULT 1);");
        Exec(cn, "CREATE TABLE haftalar (id INTEGER PRIMARY KEY, haftaBaslangic TEXT);");
        Exec(cn, "CREATE TABLE atamalar (id INTEGER PRIMARY KEY, haftaId INTEGER, personelId INTEGER, personelAdi TEXT, gunler TEXT, durum TEXT, projeId INTEGER, projeAdi TEXT, gorevMetni TEXT, sorumlu TEXT);");
    }

    private static void Ornek(SqliteConnection cn)
    {
        TamSema(cn);
        Exec(cn, @"INSERT INTO personel (id, adSoyad, sicil, aktif) VALUES (1, 'Ali Veli', '0100', 1), (2, 'Ayşe Kaya', '', 1), (3, 'Zeynep Yok', '999', 0), (4, 'Mehmet Aynı', '', 1);");
        Exec(cn, @"INSERT INTO projeler (id, ad, lokasyon, aktif, parentId) VALUES
            (1, 'Ana', '', 1, NULL), (2, 'Alt', '', 1, 1), (3, 'Faaliyet', 'Kampüs', 1, 2), (4, 'Çok derin', '', 1, 3),
            (5, 'Yetim', '', 1, 77), (6, 'Döngü A', '', 1, 7), (7, 'Döngü B', '', 1, 6), (8, 'Aynı', '', 1, 1), (9, 'aynı', '', 1, 1);");
        Exec(cn, "INSERT INTO haftalar (id, haftaBaslangic) VALUES (1, '2026-03-02');");   // pazartesi
        Exec(cn, @"INSERT INTO atamalar (id, haftaId, personelId, personelAdi, gunler, durum, projeId, projeAdi, gorevMetni, sorumlu) VALUES
            (1, 1, 1, 'Ali Veli', '{""pzt"":true,""sal"":true}', 'gorevli', 1, 'Ana', '', 'Ayşe Kaya'),
            (2, 1, 1, 'Ali Veli', '{""sal"":true}', 'izinli', NULL, '', '', ''),
            (3, 1, 2, 'Ayşe Kaya', '{""cmt"":true}', 'raporlu', NULL, '', '', ''),
            (4, 1, 3, 'Zeynep Yok', '{""pzt"":true}', 'gorevli', 99, 'Silinmiş', '', ''),
            (5, 5, 1, 'Ali Veli', '{""pzt"":true}', 'gorevli', 1, 'Ana', '', ''),
            (6, 1, 1, 'Ali Veli', 'xx', 'gorevli', 1, 'Ana', '', ''),
            (7, 1, 1, 'Ali Veli', '{""car"":true}', 'tatil', NULL, '', '', ''),
            (8, 1, 2, 'Ayşe Kaya', '{""per"":true}', 'musait', NULL, '', '', '');");
    }

    private static readonly KadroKisi[] Kadro =
    {
        new("100", "ALİ VELİ", true), new("200", "Ayşe Kaya", true), new("300", "Mehmet Aynı", true), new("301", "Mehmet Aynı", true),
    };
    private static readonly HavuzKaydi[] Havuz = { new(1, null, 1, "ana") };

    [Fact]
    public void Okuyucu_tum_tablolari_okur_dosyayi_degistirmez()
    {
        var yol = DbYap(Ornek);
        var once = System.Security.Cryptography.SHA256.HashData(File.ReadAllBytes(yol));
        var v = EskiVeriOkuyucu.Oku(yol);
        Assert.Equal(4, v.Personel.Count);
        Assert.Equal(9, v.Projeler.Count);
        Assert.Single(v.Haftalar);
        Assert.Equal(8, v.Atamalar.Count);
        Assert.False(v.Personel.Single(p => p.Id == 3).Aktif);
        Assert.Equal(7, v.Projeler.Single(p => p.Id == 6).ParentId);
        Assert.Null(v.Projeler.Single(p => p.Id == 1).ParentId);
        Assert.Empty(v.Uyarilar);
        Assert.Equal(once, System.Security.Cryptography.SHA256.HashData(File.ReadAllBytes(yol)));
        Assert.False(File.Exists(yol + "-journal"));
    }

    [Fact]
    public void Okuyucu_eksik_tablo_ve_sutuna_dayaniklidir()
    {
        var yol = DbYap(cn =>
        {
            Exec(cn, "CREATE TABLE personel (id INTEGER PRIMARY KEY, adSoyad TEXT);");   // sicil ve aktif sütunu yok
            Exec(cn, "INSERT INTO personel (id, adSoyad) VALUES (1, 'Ali Veli');");
        });
        var v = EskiVeriOkuyucu.Oku(yol);
        var p = Assert.Single(v.Personel);
        Assert.Equal(("Ali Veli", "", true), (p.Ad, p.Sicil, p.Aktif));
        Assert.Contains("Tablo yok: atamalar", v.Uyarilar);
        Assert.Equal(4, v.Uyarilar.Count);
    }

    [Fact]
    public void Okuyucu_olmayan_ya_da_bozuk_dosyada_dogrulama_hatasi_verir()
    {
        Assert.Equal("dogrulama", Assert.Throws<GorevException>(() => EskiVeriOkuyucu.Oku(Path.Combine(_dir, "yok.db"))).Code);
        var bozuk = Path.Combine(_dir, "bozuk.db");
        File.WriteAllText(bozuk, "bu bir sqlite dosyası değil, ama yeterince uzun bir metin " + new string('x', 200));
        Assert.Equal("dogrulama", Assert.Throws<GorevException>(() => EskiVeriOkuyucu.Oku(bozuk)).Code);
    }

    [Fact]
    public void Rapor_personel_atama_proje_ve_sorumlu_sayilarini_dogru_cikarir()
    {
        var v = EskiVeriOkuyucu.Oku(DbYap(Ornek));
        var r = EskiVeriDenetimi.Raporla(v, Kadro, Havuz, maskele: true);
        var s = r.Sayilar;
        Assert.Equal((4, 1, 1, 1, 1), (s["personel"], s["personelSicil"], s["personelAd"], s["personelBelirsiz"], s["personelYok"]));   // '0100' ↔ '100'; İ/i katlanır
        Assert.Equal(2, s["atama_gorevli"]);          // #1 ve #4 (#5 haftasız, #6 bozuk gün)
        Assert.Equal(3, s["kisiGun_gorevli"]);        // 2 + 1
        Assert.Equal(1, s["atama_izinli"]);
        Assert.Equal(1, s["atama_raporlu"]);
        Assert.Equal(1, s["atama_musait"]);           // müsait sayılır ama aktarılmaz
        Assert.Equal(1, s["cakisma"]);                // Ali: salı hem görevli hem izinli
        Assert.Equal(1, s["haftasiz"]);
        Assert.Equal(1, s["haftasizFarkliId"]);
        Assert.Contains("2a. Haftasız atamaların tanısı", r.Metin, StringComparison.Ordinal);
        Assert.Contains("haftaId 5: 1 atama", r.Metin, StringComparison.Ordinal);
        Assert.Equal((0, 1), (s["kardesAyrisan"], s["kardesBirebir"]));   // "Aynı"/"aynı" ikisi de lokasyonsuz: gerçek tekrar
        Assert.Equal(1, s["gunBozuk"]);
        Assert.Equal(1, s["yokAtama"]);
        Assert.Equal((1, 2, 1), (s["projeYetim"], s["projeDongu"], s["projeAsiri"]));
        Assert.Equal((2, 1), (s["sorumluFarkli"], s["sorumluEsmez"]));
        Assert.True(s["dikkat"] > 5);
        Assert.Contains("Tatil".ToLowerInvariant(), r.Metin.ToLowerInvariant());      // bilinmeyen durum uyarısı
        Assert.Contains("2026-03-03", r.Metin);                                          // çakışma tarihi (salı)
        Assert.Contains("Kök (Ana Proje) sayısı: 1 · havuzda aynı adla zaten olan: 1", r.Metin, StringComparison.Ordinal);
    }

    [Fact]
    public void Maskeleme_acikken_ad_ve_sicil_metinde_gorunmez_kapaliyken_gorunur()
    {
        var v = EskiVeriOkuyucu.Oku(DbYap(Ornek));
        var gizli = EskiVeriDenetimi.Raporla(v, Kadro, Havuz, maskele: true).Metin;
        Assert.DoesNotContain("Zeynep", gizli, StringComparison.Ordinal);
        Assert.Contains("Z***", gizli, StringComparison.Ordinal);
        Assert.DoesNotContain("999", gizli, StringComparison.Ordinal);
        var acik = EskiVeriDenetimi.Raporla(v, Kadro, Havuz, maskele: false).Metin;
        Assert.Contains("Zeynep Yok", acik, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData("Ayşe Kaya", "A*** K***")]
    [InlineData("ilker  öz", "İ*** Ö***")]
    [InlineData("", "(boş)")]
    public void Ad_maskesi_bas_harfi_korur_turkce_buyutur(string girdi, string beklenen) => Assert.Equal(beklenen, EskiVeriDenetimi.Maske(girdi));

    [Theory]
    [InlineData("12345", "***45")] [InlineData("12", "***")] [InlineData("", "(yok)")]
    public void Sicil_maskesi_son_iki_haneyi_birakir(string girdi, string beklenen) => Assert.Equal(beklenen, EskiVeriDenetimi.SicilMaske(girdi));

    [Fact]
    public void Bos_veri_cokmez_ve_dikkat_sifir_olur()
    {
        var r = EskiVeriDenetimi.Raporla(new EskiVeri(), Array.Empty<KadroKisi>(), Array.Empty<HavuzKaydi>(), true);
        Assert.Equal(0, r.Sayilar["dikkat"]);
        Assert.Contains("Dikkat gerektiren madde yok", r.Metin, StringComparison.Ordinal);
    }

    [Fact]
    public void Sicil_eslesti_ama_ad_farkliysa_uyarilir()
    {
        var v = new EskiVeri();
        v.Personel.Add(new EskiPersonel(1, "Başka Kişi", "100", true));
        var r = EskiVeriDenetimi.Raporla(v, Kadro, Havuz, false);
        Assert.Equal(1, r.Sayilar["personelSicil"]);
        Assert.Contains("ad farklı", r.Metin, StringComparison.Ordinal);
    }

    private static EskiVeri HaftaliVeri(string id4Baslangic)
    {
        var v = new EskiVeri();
        v.Personel.Add(new EskiPersonel(1, "Ali Veli", "100", true));
        v.Haftalar.Add(new EskiHafta(1, "2026-03-02")); v.Haftalar.Add(new EskiHafta(4, id4Baslangic));
        v.Atamalar.Add(new EskiAtama(1, 1, 1, "Ali Veli", "{\"pzt\":true}", "gorevli", null, "P", "", ""));
        v.Atamalar.Add(new EskiAtama(2, 2, 1, "Ali Veli", "{\"pzt\":true,\"sal\":true}", "gorevli", null, "P", "", ""));   // haftasız (id 2)
        v.Atamalar.Add(new EskiAtama(3, 3, 1, "Ali Veli", "{\"cum\":true}", "izinli", null, "", "", ""));                    // haftasız (id 3)
        v.Atamalar.Add(new EskiAtama(4, 4, 1, "Ali Veli", "{\"pzt\":true}", "gorevli", null, "P", "", ""));
        return v;
    }

    [Fact]
    public void Haftasiz_atamalar_kimlik_tarih_duzeni_uyumluysa_tarihe_cikarilir()
    {
        var r = EskiVeriDenetimi.Raporla(HaftaliVeri("2026-03-23"), Kadro, Havuz, true);   // id 1→4 = 3 hafta: uyumlu
        Assert.Equal(1, r.Sayilar["idTarihUyumlu"]);
        Assert.Equal(2, r.Sayilar["cikarimAtama"]);
        Assert.Equal(0, r.Sayilar["cikarimCakisma"]);
        Assert.Equal(0, r.Sayilar["cikarimCarpisma"]);
        Assert.Contains("Boşluk 1→4: id farkı 3, takvimde 3 hafta · UYUMLU", r.Metin, StringComparison.Ordinal);
        Assert.Contains("en erken 2026-03-09, en geç 2026-03-16", r.Metin, StringComparison.Ordinal);
    }

    [Fact]
    public void Haftasiz_atamalar_kimlik_tarih_duzeni_uyumsuzsa_tarih_cikarilmaz()
    {
        var r = EskiVeriDenetimi.Raporla(HaftaliVeri("2026-03-30"), Kadro, Havuz, true);   // id 1→4 = 4 hafta: bir hafta atlanmış
        Assert.Equal(0, r.Sayilar["idTarihUyumlu"]);
        Assert.False(r.Sayilar.ContainsKey("cikarimAtama"));
        Assert.Contains("YAPILMADI", r.Metin, StringComparison.Ordinal);
    }

    [Fact]
    public void Cikarilan_tarih_mevcut_kayitla_cakisirsa_uyari_verir()
    {
        var v = HaftaliVeri("2026-03-23");
        v.Atamalar.Add(new EskiAtama(5, 4, 1, "Ali Veli", "{\"pzt\":true}", "gorevli", null, "P", "", ""));   // aynı haftada ikinci kayıt (çakışma 2026-03-23)
        v.Atamalar.Add(new EskiAtama(6, 3, 1, "Ali Veli", "{\"cum\":true}", "izinli", null, "", "", ""));     // haftasız id 3, aynı kişi/gün (cuma 03-20) → çıkarım çakışması
        var r = EskiVeriDenetimi.Raporla(v, Kadro, Havuz, true);
        Assert.Equal(1, r.Sayilar["cikarimCakisma"]);
        Assert.Equal(1, r.Sayilar["cakisma"]);
    }

    [Fact]
    public void Haftasiz_hafta_mevcut_haftanin_kopyasiysa_ve_fazla_mesai_tarih_veriyorsa_raporlanir()
    {
        var v = new EskiVeri();
        v.Personel.Add(new EskiPersonel(1, "Ali Veli", "100", true));
        v.Haftalar.Add(new EskiHafta(26, "2026-07-20"));
        v.Atamalar.Add(new EskiAtama(1, 26, 1, "Ali Veli", "{\"pzt\":true,\"sal\":true}", "gorevli", null, "Proje A", "", "Ayşe Kaya", 1788000000000));
        v.Atamalar.Add(new EskiAtama(2, 2, 1, "Ali Veli", "{\"pzt\":true,\"sal\":true}", "gorevli", null, "PROJE A", "", "ayşe kaya", 1788000000000));   // haftasız, aynı imza
        v.Atamalar.Add(new EskiAtama(3, 3, 1, "Ali Veli", "{\"cum\":true}", "gorevli", null, "Başka", "", ""));            // haftasız, benzeri yok
        v.FazlaMesai.Add(new EskiFm(3, "2026-03-13 00:00:00"));                                                              // cuma → hafta pazartesi 2026-03-09
        var r = EskiVeriDenetimi.Raporla(v, Kadro, Havuz, true);
        Assert.Equal(1, r.Sayilar["kopyaHafta"]);
        Assert.Equal(1, r.Sayilar["fmTarihliHafta"]);
        Assert.Contains("haftaId 2: 1 atama → en benzer id 26 (2026-07-20) %100", r.Metin, StringComparison.Ordinal);
        Assert.Contains("FM kanıtı: haftaId 3 → 2026-03-09", r.Metin, StringComparison.Ordinal);
    }

    [Fact]
    public void Okuyucu_fazla_mesai_tablosu_yoksa_uyari_vermez()
    {
        var v = EskiVeriOkuyucu.Oku(DbYap(Ornek));
        Assert.Empty(v.FazlaMesai);
        Assert.Empty(v.Uyarilar);
    }
}
