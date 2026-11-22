# Dilim 10 – El sınaması (canlıya geçiş + tam fonksiyon testi)

Ön koşul: `012_canli_aktarim.sql` uygulanmış (açılışta otomatik), ortam TEST. Eski aracın `gorevlendirme.db` dosyası hazır.
**Önce yedek alın** (Özlük aynı veritabanında).

## A. Eski veri aktarımı
| # | Kim | Ne yapar | Beklenen |
|---|---|---|---|
| 1 | Yönetici | Eski veri → **Dosya seç ve denetle** | Kuru çalıştırma raporu (önceki gibi), hiçbir şey yazılmaz |
| 2 | Yönetici | Aktarım kartında sayılar | Hepsi 0 |
| 3 | Yönetici | `AKTAR` yazmadan **Dosya seç ve aktar** | "Onay için AKTAR yazın" uyarısı |
| 4 | Yönetici | `AKTAR` yazar, dosyayı seçer | "Aktarıldı: Talep … atama … izin … rapor … tarihsiz …" özeti; kart sayıları dolar |
| 5 | Yönetici | Haftalık matris, Analiz, Arşiv | Eski görevler matriste/analizde görünür; tarihsiz geçmiş Arşiv'de |
| 6 | Yönetici | Aktarılmış bir talebi açar | Metinde varsa "[Eski sorumlu: …]"; saat 07:30–16:35 |
| 7 | Yönetici | Tekrar aktarmayı dener | Buton kapalı; zorla çağrılırsa "daha önce yapılmış" hatası |
| 8 | Yönetici | `GERIAL` yazar, **Aktarımı geri al** | Sayılar 0; eski araç kayıtları gitti, elle girilen talepler duruyor |
| 9 | Yönetici | Yeniden aktarır | Aynı sayılarla başarılı |
| 10 | Saha | Eski veri menüsü | Yok (komut yetkisizdir) |

## B. Canlıya geçiş kontrolü
| # | Kim | Ne yapar | Beklenen |
|---|---|---|---|
| 11 | Yönetici | Sistem → Canlıya geçiş kartı | 8 maddelik liste; zorunlu eksik varsa düğme pasif ve uyarı |
| 12 | Yönetici | Havuz boşken (yeni kurulumda) bakar | "Proje havuzu dolu" Eksik, geçiş kapalı |
| 13 | Yönetici | Aktarım sonrası **Kontrolü yenile** | Zorunlular Tamam; "Eski araç verisi aktarılmış" Tamam |
| 14 | Yönetici | Yanlış onay (`EVET`) ile **Canlıya geç** | Hata, ortam TEST kalır |
| 15 | Yönetici | `CANLI` + asgari sürüm yazar, geçer | "Sistem CANLI ortama alındı"; Ortam = CANLI (kırmızı rozet) |
| 16 | Yönetici | Eski veri → aktar / geri al | Kapalı: "Sistem CANLI: aktarım ve geri alma kapalıdır" |
| 17 | db_owner | `gorev_sifirla.sql` çalıştırır | "ORTAM TEST değil" ile reddedilir |
| 18 | Eski exe (asgari sürümden düşük) | Bağlanır | Sürüm kapısı engeller |

## C. Tam fonksiyon turu (canlıdan önce, TEST'te)
| # | Kim | Ne yapar | Beklenen |
|---|---|---|---|
| 19 | Yönetici | Kadro eşitle, bölüm eşleştir, istisna ata | Dilim 3 listesi (`test-dilim-3.md`) geçer |
| 20 | Sorumlu | Talep aç, gönder; Yönetici ata (çakışma kararı dahil) | `test-dilim-4/5.md` |
| 21 | Yönetici | Matris, Excel | `test-dilim-6.md` |
| 22 | Yönetici/Saha | İzin, rapor, çakışma | `test-dilim-7.md` |
| 23 | Yönetici | İptal, erken bitiş, ikame, devir, revize | `test-dilim-8.md` |
| 24 | Yönetici/Sorumlu | Analiz, arşiv, Excel | `test-dilim-9.md` |
| 25 | db_owner | `dbo_iz.sql` önce/sonra | Sonuç aynı (dbo'ya dokunulmadı) |
| 26 | db_owner | `gorev_geri_donus.sql` (`TESTE-DON`) canlıdan sonra | ORTAM TEST olur, log satırı yazılır; sonra tekrar canlıya geçilebilir |
