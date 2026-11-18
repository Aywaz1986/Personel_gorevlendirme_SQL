# Dilim 3 sınama listesi (Murat)

Ön koşul: Dilim 2 kurulu ve sen yönetici. SSMS: `SST_Ozluk`, db_owner. Önce `tools/sql/dbo_iz.sql` çalıştır, satırı not et.

## A. Şema 4
| # | Yap | Beklenen |
|---|---|---|
| A1 | Yeni exe'yi aç | "Şema yükseltilmeli" (şema 3 → 4). |
| A2 | **Şemayı kur / yükselt** | "Uygulandı: 004_havuz_takvim". |
| A3 | SSMS: `SELECT COUNT(*) FROM gorev.proje_havuzu; SELECT COUNT(*) FROM gorev.takvim_tatil;` | 0 ve 0. |
| A4 | Menü | "Proje havuzu" ve "Akademik takvim" görünür. |

## B. Proje havuzu
| # | Yap | Beklenen |
|---|---|---|
| B1 | Yeni Ana Proje: `Örnek Ana Proje` → Ekle | Ağaçta görünür, rozet "Ana Proje". |
| B2 | Satırda **+ Alt Proje** → `Örnek Alt` → Ekle; sonra **+ Faaliyet**, **+ Konum** | Dört seviye iç içe. Konum satırında "+" düğmesi YOK. |
| B3 | Aynı üstte aynı adı (büyük/küçük harf farkıyla) tekrar ekle | Hata: aynı adlı kayıt zaten var. |
| B4 | **Ad değiştir** | Yeni ad kaydedilir. |
| B5 | Ana Projeyi **Pasife al** | Altındakilerin hepsi pasif (soluk, "Pasif" rozeti); "Pasifleri göster" kapalıysa ağaçtan kalkar. |
| B6 | Alt kaydı **Etkinleştir** (üst pasifken) | Hata: üst pasif. Önce üstü etkinleştir. |
| B7 | İki Ana Proje + her birinde aynı adlı bir Alt Proje kur; birini **Birleştir…** ile diğerine birleştir | Çocukları hedefe taşınır; aynı adlılar birleşir; kaynak "Birleştirildi" rozetiyle ve hedef yoluyla görünür, düğmesi yok. Hiçbir kayıt silinmez. |
| B8 | Farklı seviyedeki kayıtları birleştirmeyi dene | Listede sadece aynı seviye çıkar. |
| B9 | SSMS: `SELECT TOP 10 islem, nesne_id, ayrinti FROM gorev.islem_log ORDER BY id DESC;` | HAVUZ_EKLE / HAVUZ_PASIF / HAVUZ_BIRLESTIR kayıtları. |

## C. Akademik takvim
| # | Yap | Beklenen |
|---|---|---|
| C1 | Tarih 29.10.2026, Tüm gün, Resmi tatil, `Cumhuriyet Bayramı` → Kaydet | Tabloda "29.10.2026 Perşembe Tüm gün Resmi tatil". |
| C2 | Aynı tarihe "Öğleden önce" ekle | Hata: TAM ile yarım gün birlikte olamaz. |
| C3 | 28.10.2026 Öğleden sonra `Arife` | Kaydedilir. |
| C4 | **Düzenle** / **Sil** | Çalışır. |

## D. Toplu yükleme
| # | Yap | Beklenen |
|---|---|---|
| D1 | Excel'de 4 sütun yaz (Tarih, Ad, Zaman dilimi, Tür; ilk satır başlık); kopyala → kutuya yapıştır → **Önizle** | Her satır Yeni / Güncellenecek / Aynı / Hata ile. Henüz hiçbir şey yazılmadı (SSMS: sayı değişmedi). |
| D2 | Bozuk tarihli bir satır ekleyip tekrar önizle | O satır "Tarih okunamadı"; **Uygula** pasif. |
| D3 | Hatayı düzelt → **Uygula** | "N eklendi, M güncellendi"; kayıtlar tabloda. |
| D4 | Aynı veriyi tekrar yükle | Hepsi "Aynı", Uygula pasif (yapılacak şey yok). |
| D5 | `.csv` dosyası seç (Excel'den "CSV (noktalı virgülle ayrılmış)" kaydet) → Önizle | Türkçe karakterler doğru (UTF-8 ya da Windows-1254). |
| D6 | `.xlsx` dosyası seç (tarih sütunu gerçek tarih hücresi) → Önizle | Tarihler doğru okunur. |
| D7 | SSMS: `SELECT TOP 3 islem, ayrinti FROM gorev.islem_log WHERE islem = N'TAKVIM_TOPLU' ORDER BY id DESC;` | `eklenen=… guncellenen=… ayni=…`. |

## E. Yetki
| # | Kim | Yap | Beklenen |
|---|---|---|---|
| E1 | Yönetici olmayan, rolü olan kişi (SSMS, kendi hesabıyla) | `EXEC gorev.sp_havuz_listele; EXEC gorev.sp_takvim_listele;` | Listeler gelir. |
| E2 | Aynı kişi | `EXEC gorev.sp_havuz_ekle @ust_id=NULL, @ad=N'x';` | Hata 50023. |
| E3 | Rolü olmayan kişi | `EXEC gorev.sp_havuz_listele;` | Hata 50023. |
| E4 | Sen | `tools/sql/dbo_iz.sql` | Başlangıçtaki satırla **birebir aynı**. |

## F. Sıfırla (yalnız TEST; istersen)
`gorev_sifirla.sql` (`@onay = N'SIFIRLA'`): havuz boşalır, takvim ve yetki yapılandırması KALIR.

## G. Kılavuz
`docs/Kullanma-Kilavuzu.docx`: Proje havuzu ve Akademik takvim bölümleri güncel mi.
