# Dilim 2 sınama listesi (Murat)

Ön koşul: Dilim 1 kurulu (şema sürüm 1), `SST_Ozluk` yedeği duruyor. Özlük'ün kendi `Ozluk.exe`'si hiç değişmez.
SSMS: `SST_Ozluk`'a **db_owner** ile bağlan, veritabanı kutusunda `SST_Ozluk` seçili (betiklerde `USE` yok). Betikler `tools/sql/` altında.

## A. CI (otomatik)
1. PR'da dört kontrol yeşil: `denetim`, `gizli-bilgi`, `derle`, `sql`. `sql` işi yeni `KimlikTests` sınıfını (SQL girişleriyle: rol çözümü, son yönetici, kadro eşitleme, güvenlik kapısı) çalıştırır.
2. `derle` çıktısından `Gorevlendirme-0.1.N` indirilir.

## B. SSMS – önce
| # | Yap | Beklenen |
|---|---|---|
| B1 | `tools/sql/dbo_iz.sql` çalıştır | Tek satır, 5 sayı. **Not et.** |

## C. Uygulama – şema 2 ve ilk yönetici
| # | Kim | Yap | Beklenen |
|---|---|---|---|
| C1 | Murat | Yeni exe'yi aç (otomatik bağlanır) | Durum: şema 1, bu exe 3 → "Şema yükseltilmeli"; yalnız Sistem sayfası görünür. |
| C2 | Murat | **Şemayı kur / yükselt** | "Uygulandı: 002_kimlik, 003_kadro_esitleme". Şema 3. |
| C3 | Murat | Uygulamayı yeniden aç | **Yetkisiz Erişim** sayfası, altında hesap adın (henüz yönetici değilsin). |
| C4 | Murat (SSMS) | `tools/sql/gorev_ilk_yonetici.sql` çalıştır (`@hesap` boş: kendi hesabın) | "Mesajlar"da hata yok. `SELECT * FROM gorev.kullanici_yetki_istisna;` 1 satır, `yonetici_mi=1, aktif=1`. |
| C5 | Murat (SSMS) | Aynı betiği ikinci kez çalıştır | **Hata 50025** (zaten yönetici var). Tabloda hâlâ 1 satır. |
| C6 | Murat | Uygulamayı yeniden aç | Kabuk açılır: üstte TEST rozeti, adın/hesabın; menü: Atama paneli (Dilim 5), Kadro, Bölüm–rol eşleştirme, Kişi istisnaları, Sistem. |

## D. Kadro eşitleme (Özlük'e yazmaz)
| # | Kim | Yap | Beklenen |
|---|---|---|---|
| D1 | Murat | Kadro → **Kadroyu Özlük'ten eşitle** (Özlük'te yönetici ya da tüm kurum kapsamlı olmalısın) | Sayılar: eklenen = Özlük'teki kişi sayısı, diğerleri 0. Tablo dolar. |
| D2 | Murat | Tekrar eşitle | eklenen 0, değişmeyen = kişi sayısı. |
| D3 | Murat (SSMS) | `SELECT COUNT(*), SUM(CAST(aktif AS int)) FROM gorev.personel;` | Özlük `dbo.personeller` ile aynı sayı; aktif = ayrılış tarihi boş/ileri olanlar. |
| D4 | Murat (SSMS) | `tools/sql/dbo_iz.sql` | B1'deki satırla **birebir aynı** (dbo değişmedi). |
| D5 | Murat (SSMS) | `SELECT TOP 3 islem, ayrinti FROM gorev.islem_log ORDER BY id DESC;` | `KADRO_ESITLE` satırı, JSON sayılarla. |
| D6 | Dar kapsamlı Özlük kullanıcısı (varsa; yoksa atla) | Önce Murat onu istisna ile yönetici yapar, o kişi eşitle der | Hata: "Özlük'te tüm kurum kapsamı gerekli" (yetki). Kadro değişmez. |

## E. Roller
| # | Kim | Yap | Beklenen |
|---|---|---|---|
| E1 | Murat | Bölüm–rol eşleştirme | Tüm Özlük bölümleri, kişi sayılarıyla; "Eşleşme yok" uyarısı. |
| E2 | Murat | Bir bölüme **Saha Personeli**, birine **Proje Sorumlusu** seç | Her seçimde kısa "Kaydedildi". Sayfayı yenileyince seçimler durur. |
| E3 | Murat | Bölümün rolünü boş seç | Eşleşme kalkar. |
| E4 | Murat | Kişi istisnaları → ekle: kadrodan bir kişi, **Proje Sorumlusu** | Listede görünür. |
| E5 | Sorumlu kişi (kendi bilgisayarında exe) | Exe'yi aç | Yönetici menüsü YOK; görünüm Proje Sorumlusu; tek rol olduğundan görünüm menüsü yok. |
| E6 | Aynı kişi | Murat ona Saha rolünü de ekler (istisna: sorumlu + saha), kişi uygulamayı yeniden açar | Üstte "Görünüm" menüsü; seçilen görünüm sonraki açılışta hatırlanır. |
| E7 | Hiçbir bölüm/istisna kaydı olmayan biri | Exe'yi aç | **Yetkisiz Erişim**. Veritabanında hiçbir veri göremez (SSMS'te kendi hesabıyla `SELECT * FROM gorev.personel` → izin hatası). |
| E8 | Pasif (ayrılmış) kişi | Exe'yi aç | Yetkisiz Erişim. |

## F. Son yönetici koruması
| # | Kim | Yap | Beklenen |
|---|---|---|---|
| F1 | Murat | Kişi istisnaları → kendi satırında yöneticiliği kaldır / satırı sil | Hata: "en az bir aktif yönetici". Satır durur. |
| F2 | Murat | İkinci kişiyi yönetici yap, sonra kendi yöneticiliğini kaldır | İzin verilir. Hemen ardından diğer yönetici de kendini kaldırmaya çalışırsa reddedilir. (Kendini kaldırdıysan C4 betiğiyle yeniden yönetici ol: zaten yönetici varsa 50025 verir, o zaman diğer yöneticiden iste.) |
| F3 | Murat (SSMS) | `DELETE FROM gorev.kullanici_yetki_istisna WHERE yonetici_mi=1;` (tek yönetici varken) | **Hata 50020**, kayıt durur. |

## G. Yetki sınırı (SSMS)
| # | Kim | Yap | Beklenen |
|---|---|---|---|
| G1 | Yönetici olmayan kişi (SSMS, kendi hesabıyla) | `EXEC gorev.sp_kadro_listele;` | **Hata 50023**. |
| G2 | Aynı kişi | `EXEC gorev.sp_ozluk_esitle;` | Hata 50023. `gorev.personel` değişmez. |
| G3 | Murat | `tools/sql/dbo_iz.sql` | Yine B1 ile aynı. |

## H. Sıfırla (yalnız TEST; istersen)
`tools/sql/gorev_sifirla.sql` (`@onay = N'SIFIRLA'`): `gorev.personel` boşalır; `rol_bolum_eslestirme` ve `kullanici_yetki_istisna` KALIR (yetkin silinmez). Sonra Kadro → eşitle ile kadro geri gelir.

## I. Kılavuz
`docs/Kullanma-Kilavuzu.docx` açılır: Yetkisiz, Kadro, Eşleştirme, İstisna bölümleri güncel mi.

## Bilinen sınırlar
- T-SQL ve C# yalnızca CI'da sınanır; ilk koşuda derleme hatası çıkarsa dal güncellenir.
- Atama paneli ve talep ekranları sonraki dilimlerde.
