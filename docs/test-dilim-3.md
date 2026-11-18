# Dilim 3 sınama listesi (Murat)

Ön koşul: Dilim 2 kurulu ve sen yönetici. SSMS: `SST_Ozluk`, db_owner. Önce `tools/sql/dbo_iz.sql` çalıştır, satırı not et.

## A. Şema 4 ve 5
| # | Yap | Beklenen |
|---|---|---|
| A1 | Yeni exe'yi aç | "Şema yükseltilmeli" (şema 3 → 5; 004 daha önce uygulandıysa 4 → 5). |
| A2 | **Şemayı kur / yükselt** | "Uygulandı: 004_havuz_takvim" ve/veya "005_takvim_standart". |
| A3 | SSMS: `SELECT COUNT(*) FROM gorev.proje_havuzu; SELECT COUNT(*) FROM gorev.takvim_tatil; SELECT MAX(surum) FROM gorev.sema_surumleri;` | Sayılar 0 (004 sınamasında kayıt girdiysen aynı sayıda kalır); sürüm 5. |
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

## C. Akademik takvim (revize: 2024_Takvim standardı)
| # | Yap | Beklenen |
|---|---|---|
| C1 | Yıl 2024 seç; başlangıç 10.04.2024, bitiş 12.04.2024, Tüm gün, Resmi tatil, `Ramazan Bayramı` → Kaydet | Listede "10.04.2024 – 12.04.2024 · 3 gün"; yıl takvimi Nisan'da 10-11-12 mavi. |
| C2 | Başlangıç 08.04.2024, bitiş boş, Tüm gün, İdari tatil, `İdari izin`, "Yıllık izinden kesilir" işaretli | Turuncu 8 Nisan; listede "Kesilir (1 gün)"; üstte "Yıllık izinden kesilecek 1 gün". |
| C3 | 09.04.2024 Öğleden sonra, Resmi, `Arife` | Daire biçiminde işaretlenir; "½ gün". Aynı güne Öğleden önce eklemek de olur. |
| C4 | 11.04.2024'e tek gün Resmi tatil ekle | Hata: "Takvimdeki … kaydıyla çakışıyor". |
| C5 | 09.04.2024'e Tüm gün ekle | Hata (yarım gün varken tüm gün olmaz). |
| C6 | 30.12.2024 – 02.01.2025 ekle; 01.01–30.03 ekle; yarım gün + bitiş tarihi gir | Üçü de hata (tek yıl / 60 gün / yarım gün tek gündür). |
| C7 | Özet kutuları | Resmi/idari gün ve yıllık izinden kesilecek gün sayıları listeyle uyuşur. |
| C8 | **Düzenle** / **Sil** | Çalışır. |
| C9 | Yıl takvimi | HFT ISO hafta numarası (1 Nisan 2024 haftası 14), hafta sonları gri. |

## D. Toplu yükleme
| # | Yap | Beklenen |
|---|---|---|
| D1 | `2024_Takvim.xlsx` dosyasını seç → **Önizle** | Yıl 2024 otomatik seçilir ("Dosyadaki yıl (2024) seçildi"); satırlar Yeni/Hata ile; henüz hiçbir şey yazılmadı. |
| D2 | Önizlemeyi kontrol et | "10-11-12 NİSAN … 3 Gün" tek kayıt (10–12.04); "YILLIK İZİNDEN KESİLECEK" yazanlar İdari + Yıllık "Evet"; "½ Gün" yarım gün. **Takvimdeki 28 Ekim 2024 satırı** (şekilde oval, metinde "1 Gün (YILLIK İZİNDEN KESİLECEK)") nasıl okunuyor? Not al, beklenen mi söyle. |
| D3 | Hatalı satır varsa düzeltilemiyorsa **Uygula** pasif; hatasızsa **Uygula** | "N eklendi, M güncellendi"; yıl takvimi ve özet dolar. |
| D4 | Aynı dosyayı tekrar yükle | Hepsi "Aynı", Uygula pasif. |
| D5 | Sütunlu CSV (Başlangıç; Bitiş; Ad; Tür; Zaman dilimi; Yıllık) ya da Excel'den yapıştırma → Önizle | Doğru okunur; Türkçe karakterler bozulmaz. |
| D6 | SSMS: `SELECT TOP 3 islem, ayrinti FROM gorev.islem_log WHERE islem = N'TAKVIM_TOPLU' ORDER BY id DESC;` | `eklenen=… guncellenen=… ayni=…`. |
| D7 | 004 sınamasından kalan tek günlük kayıtların varsa | 005 sonrası aynen duruyor (AKADEMIK olanlar İdari tatil oldu). |

## E. Yetki
| # | Kim | Yap | Beklenen |
|---|---|---|---|
| E1 | Yönetici olmayan, rolü olan kişi (SSMS, kendi hesabıyla) | `EXEC gorev.sp_havuz_listele; EXEC gorev.sp_takvim_listele @yil=2024; EXEC gorev.sp_takvim_ozet @yil=2024;` | Listeler gelir. |
| E2 | Aynı kişi | `EXEC gorev.sp_havuz_ekle @ust_id=NULL, @ad=N'x';` | Hata 50023. |
| E3 | Rolü olmayan kişi | `EXEC gorev.sp_havuz_listele;` | Hata 50023. |
| E4 | Sen | `tools/sql/dbo_iz.sql` | Başlangıçtaki satırla **birebir aynı**. |

## F. Sıfırla (yalnız TEST; istersen)
`gorev_sifirla.sql` (`@onay = N'SIFIRLA'`): havuz boşalır, takvim ve yetki yapılandırması KALIR.

## G. Kılavuz
`docs/Kullanma-Kilavuzu.docx`: Proje havuzu ve Akademik takvim bölümleri güncel mi.
