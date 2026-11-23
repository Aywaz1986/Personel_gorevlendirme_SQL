# Gorevlendirme.App (Personel Görevlendirme – SQL Server sürümü)

Merkezi personel görevlendirme, talep ve izleme sistemi: proje sorumluları talep açar, merkez yöneticisi onaylayıp atar, saha personeli kendi görevini, izin ve rapor beyanını izler.
Teknoloji: .NET + WinForms kabuğu + WebView2 + Microsoft.Data.SqlClient; kurulum gerektirmeyen tek exe. Veriler Özlük ile aynı sunucudaki `SST_Ozluk` veritabanında, yalnızca `gorev` şemasında durur.

> Bu depo, eski tek dosya HTML/SQLite aracından (`personel-gorevlendirme-araci`) **ayrı bir projedir**. Atama mantığı korunur; talep akışı, ÖÖ/ÖS yarım gün, izin/rapor beyanı, çok kullanıcılı çalışma eklenir. Fazla mesai ve yıllık izin bu sürümde yoktur.

## Çalışma kuralları (önce bunları okuyun)
1. **dbo.* nesnelerine dokunulmaz.** Yazma, DDL, GRANT yok; okuma yalnızca kadro eşitleme yordamında. CI `tools/dbo_koruma.py` ile denetler.
2. **Dallı akış.** `main`'e doğrudan yazılmaz. Her dilim `dilim-N-ad` dalında gelir, GitHub Actions derler, exe indirilip denenir, onaylanırsa birleştirilir.
3. **Bir dilim bitmiş sayılması için:** kod derleniyor + testler geçiyor + sınama listesi yazılmış + `CHANGELOG.md`, `docs/PLAN.md`, `README.md` ve (ekran/akış değiştiyse) `docs/Kullanma-Kilavuzu.docx` güncel.
4. **Sınanmayan şey "bitti" değildir.** SQL Server gerektiren dilimler sunucuda denenmeden `[~]` kalır.
5. **Depoya veri girmez:** personel verisi, `.db`, Excel, fotoğraf, parola, bağlantı bilgisi. Sınama verisi uydurmadır.
6. **Kararlar `CLAUDE.md` içinde ve değişmezdir**; değişecekse önce yazılı onay.

## Süreç durumu
Ayrıntı: [`docs/PLAN.md`](docs/PLAN.md), dilim içerikleri: [`docs/DILIMLER.md`](docs/DILIMLER.md). Değişiklikler: [`CHANGELOG.md`](CHANGELOG.md).

| Dilim | Konu | Durum |
|---|---|---|
| 0 | İskelet, belgeler, dbo koruma denetimi | birleştirildi |
| 1 | Şema çekirdeği, ORTAM bayrağı, kaldır/sıfırla, `Migrator`, kabuk | birleştirildi |
| 2 | Kimlik, roller, kadro eşitleme, ilk arayüz, kılavuz aracı | birleştirildi (PR #3) |
| 3 | Proje havuzu + akademik takvim | dal `dilim-3-havuz-takvim` (kodlandı; CI, el sınaması bekliyor) |
| 3b | **Eski veri: kuru çalıştırma raporu** | kodlandı, CI/el sınaması bekliyor |
| 4 | **Talep (Proje Sorumlusu)**: talep formu, liste, kopyala, revize, geri çek, önerilen personel | dal `dilim-4-talep` (kodlandı; CI, el sınaması bekliyor) |
| 5 | **Atama (Yönetici)**: gün/dilim bazlı atama, kısmi atama, çakışma kararı, ret nedeni, bildirim, aday önerisi | dal `dilim-5-atama` (kodlandı; CI, el sınaması bekliyor) |
| 6 | **Haftalık matris**: 7 günlük ortak tablo (ÖÖ/ÖS bölünmüş hücre), filtreler, hafta geçişi, 30 sn yenileme, Excel çıktısı | dal `dilim-6-matris` (kodlandı; CI, el sınaması bekliyor) |
| 7 | **İzin ve rapor**: izin talebi/onay/ret/kısaltma, vekaleten giriş, rapor evrakı (veritabanında), rapor kazanır, matriste izin/rapor hücreleri, Saha "Görevlerim" | dal `dilim-7-izin-rapor` (kodlandı; CI, el sınaması bekliyor) |
| 8 | **Revize, iptal, ikame, devir**: görev iptali, erken bitiş, atamadan çıkarma, ikame (personel değiştirme), revize isteği/onayı (metin, saat, kişi sayısı), sorumlu devri | dal `dilim-8-revize-ikame` (kodlandı; CI, el sınaması bekliyor) |
| 9 | **Analiz ve arşiv**: ana proje bazlı adam-gün, personel analizi (izin/rapor dahil), kişi detayı, tarihsiz geçmiş görevler arşivi, Excel'e aktarma | dal `dilim-9-analiz` (kodlandı; CI, el sınaması bekliyor) |
| 10 | **Canlıya geçiş**: canlı kontrol listesi + tek yönlü `sp_ortam_canli`, eski veri gerçek aktarımı (geri alınabilir), geri dönüş betiği, tam fonksiyon testi | dal `dilim-10-canli-gecis` (kodlandı; CI, el sınaması bekliyor) |
| 11 | **Senaryo tamamlama**: Saha / Operasyon Notu (nitelik yerine), talep iletişim (telefon), aday özeti, müsait/tatil analizi, yerleşke filtresi, ikame bekleyen kutusu, menü rozetleri, 30 sn yenileme, standart evrak adı | dal `dilim-11-senaryo-tamamlama` (kodlandı; CI, el sınaması bekliyor) |
| 12 | **Senaryo eksikleri + Ayarlar**: Ayarlar sayfası (yazı/tema, kullanıcılar, rol eşleştirme, kadro, işlem günlüğü), rol bazlı talep listeleri, revizede kişi seçerek çıkarma + müsaitlik, rapor tarihi düzeltme, analiz kırılımı, "Sadece müsaitler", ayrı sayaçlar | dal `dilim-12-senaryo-eksikleri` (kodlandı; CI, el sınaması bekliyor) |
| 13 | **Gizli bağlantı + yüzen pencere**: bağlantı exe klasöründeki dosyadan sessizce kurulur (normal kullanıcı form görmez), Yönetici varsayılanı yazar/siler, iğnelenebilir yüzen bağlantı penceresi (Özlük ile aynı), sade bilgi ekranları | dal `dilim-13-baglanti-yapilandirma`, test: `docs/test-dilim-13.md` |

## Belgeler
| Dosya | İçerik |
|---|---|
| `CLAUDE.md` | Claude için kurallar ve değişmez kararlar |
| `docs/PLAN.md` | Durum, dış bağımlılıklar, dilim tablosu |
| `docs/DILIMLER.md` | Her dilimin içeriği ve bitiş ölçütü |
| `docs/MIMARI.md` | Katmanlar, kimlik akışı, kadro eşitleme, ortam bayrağı |
| `docs/SQL.md` | Şema standartları, ad haritası, betik düzeni, dbo koruma, test sıfırlama |
| `docs/YETKI.md` | Roller ve yetki matrisi |
| `docs/TASIMA.md` | Eski `gorevlendirme.db` → `gorev.*` aktarımı |
| `docs/ARAYUZ.md` | Köprü komutları (arayüz ↔ C#) |
| `docs/test-dilim-N.md` | Dilim sınama listeleri (SSMS adımları dahil) |

## Depo yapısı
```text
src/Gorevlendirme.App/   Bridge, Data (Migrator), Security (Surum), Services, Shell, Sql (gömülü betikler), Ui (üretilir)
tests/                   Gorevlendirme.Tests (SQL'siz), Gorevlendirme.SqlTests (CI'da SQL Server)
ui-src/                  arayüz kaynağı; `python build.py ../src/Gorevlendirme.App/Ui/index.html` ile birleşir (index.html depoda yok)
tools/                   dbo_koruma.py (+ test), sql/ (gorev_kaldir, gorev_sifirla, gorev_geri_donus, dbo_iz), kilavuz/ (Dilim 2)
docs/                    belgeler
.github/workflows/       guvenlik (gitleaks), dbo-koruma, build (derle + test + exe), sql-test (SQL Server konteyneri)
```
