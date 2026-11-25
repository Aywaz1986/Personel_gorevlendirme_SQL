# Dilim 14 – El sınaması (yeni arayüz tasarımı)

Ön koşul: `015_sayac_sahada.sql` sunucuya uygulanmış olmalı (uygulama açılışta göçü yapar; sınanmadı, CI SqlTests doğrular).

| # | Kim | Ne yapar | Beklenen |
|---|---|---|---|
| 1 | Yalnız Saha rolü olan kişi | Açar | Üst çubukta yalnız "Saha Personeli" düğmesi; Yönetici/Sorumlu düğmeleri hiç görünmez |
| 2 | Çok rollü kişi (Yönetici+Sorumlu) | Düğmelere basar | Yalnız sahip olduğu iki düğme var; geçişte sekme şeridi değişir, son seçim hatırlanır |
| 3 | Yönetici | KPI kartlarına bakar | Bekleyen talep, izin onayı, revize/ikame, aktif sahadaki personel (bugün atanan / toplam saha) sayıları doğru |
| 4 | Yönetici | Sekme şeridine bakar | Talepler, İzin Onayları, Revize & İkame, Matris, Analiz, Proje Havuzu & Akademik Takvim, Kullanıcı Yetki, Ayarlar; rozetler sayıyı gösterir |
| 5 | Yönetici | Talep kartını açar | Altta ortalanmış küçük "Atama Yap / Gün Bazlı Böl" ve "Zorunlu Açıklamayla Reddet"; sağda kaydırmalı Ana Proje bazlı geçmiş deneyim tavsiye kutusu |
| 6 | Yönetici | "Atama Yap / Gün Bazlı Böl"e basar | Atama paneli açılır, eski akış aynen çalışır |
| 7 | Yönetici | Reddet'e basar, açıklamayı boş bırakır | Reddedilmez; açıklama zorunlu uyarısı |
| 8 | Yönetici | Kullanıcı Yetki sekmesini açar | Kullanıcı rolleri, yönetici tanımları, işlem günlüğü; sağ üstte "+ Yeni yetkili ekle" |
| 9 | Yönetici | "+ Yeni yetkili ekle"yle kadrodan kişi seçip rol verir | Kişi listede görünür; işlem günlüğünde kayıt var |
| 10 | Yönetici | Ayarlar sekmesine bakar | Görünüm ve yazı, Kadro, Eski veri, Sistem; kullanıcı/rol/günlük YOK |
| 11 | Herkes | Ayarlar › Görünüm ve yazı: tema seçer, buzlu cam düzeyini değiştirir | Renkler/cam anında değişir; yenileyince korunur; başka bilgisayarda aynı değil |
| 12 | Herkes | Yazı Ayarları: alan seçip yazı tipi/boyutu değiştirir, sıfırlar | Yalnız o alan değişir; sıfırlayınca gömülü varsayılan (Inter) döner |
| 13 | Herkes | Koyu temada tüm sayfaları gezer | Başlık ve düğmeler okunur; taşma yok |
| 14 | Yönetici | Proje Havuzu & Akademik Takvim sekmesi | İskelet sayfa görünür (tam işlev Dilim 15) |

Bilinen eksikler: Sorumlu iki sütunlu form ve vekâlet düğmesi tam birebir değil.
