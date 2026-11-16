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
| 0 | İskelet, belgeler, dbo koruma denetimi | dal `dilim-0-iskelet` (denetim testleri geçti) |
| 1 | Şema çekirdeği, ORTAM bayrağı, kaldır/sıfırla, `Migrator`, kabuk | bekliyor |
| 2 | Kimlik, roller, kadro eşitleme, ilk arayüz, kılavuz aracı | bekliyor |
| 3 / 3b | Proje havuzu + takvim / **eski veri aktarımı** | bekliyor |
| 4–10 | Talep, atama, haftalık matris, izin/rapor, revize/ikame, analiz, canlıya geçiş | bekliyor |

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

## Depo yapısı
```text
src/Gorevlendirme.App/   (Dilim 1'den itibaren) Bridge, Data, Security, Services, Shell, Sql, Ui
tests/                   (Dilim 1'den itibaren) *.Tests (SQL'siz), *.SqlTests (CI'da SQL Server)
ui-src/                  (Dilim 2) arayüz kaynağı, build.py ile birleşir
tools/                   dbo_koruma.py (+ test), sql/ (gorev_kaldir, gorev_sifirla), kilavuz/
docs/                    belgeler
.github/workflows/       guvenlik (gitleaks), dbo-koruma
```
