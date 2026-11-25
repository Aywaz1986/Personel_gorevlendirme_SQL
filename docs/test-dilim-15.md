# Dilim 15 – El sınaması (akademik takvim + havuz yönetimi)

Ön koşul: `016_havuz_arsiv.sql` uygulanmış olmalı (uygulama açılışta göçü yapar; sınanmadı, CI SqlTests doğrular). Hepsi Yönetici ile, **Proje Havuzu & Akademik Takvim** sekmesinde.

| # | Kim | Ne yapar | Beklenen |
|---|---|---|---|
| 1 | Yönetici | Sekmeyi açar | Üstte iki kart (solda Havuz, sağda Takvim), altta tam genişlikte yıllık çizelge; dar ekranda alt alta |
| 2 | Yönetici | Ana Proje seçer | Alt Proje listesi dolar; Alt Proje seçince Faaliyet, Faaliyet seçince Yerleşke listesi dolar; üst değişince alttakiler sıfırlanır |
| 3 | Yönetici | "Yeni Ana Proje" kutusuna ad yazıp Ekle'ye basar | Eklenir; aynı ad (büyük/küçük harf farksız) ikinci kez eklenemez |
| 4 | Yönetici | Seçili kayıtta "+ Alt Proje/Faaliyet/Yerleşke" ile alt kayıt ekler | Alt kayıt eklenir; Yerleşke altına ekleme düğmesi yoktur |
| 5 | Yönetici | "Ad düzelt" ile yazım hatasını düzeltir | Ad değişir; eski talepler yeni adı gösterir |
| 6 | Yönetici | Aynı projenin iki yazılışını "Birleştir…" ile birleştirir | Altındakiler hedefe taşınır; kaynak silinmez, "Birleştirildi" rozetiyle hedefi gösterir; eski talep/atama/analiz verisi bozulmaz |
| 7 | Yönetici | "Tamamlandı (pasife al)" der | Kayıt ve altındakiler pasif; yeni talep formunda görünmez; Analiz ve geçmiş talepler aynen durur |
| 8 | Yönetici | "Arşivle…" der, nedeni boş bırakır, sonra neden yazar | Boşken uyarı; nedenle arşive alınır (Arşiv rozeti), yeni talepte görünmez |
| 9 | Yönetici | Arşivdeki kaydı "Arşivden çıkar" der, sonra "Etkinleştir" | Önce pasif döner, sonra aktif olur; arşivdeyken doğrudan etkinleştirilemez |
| 10 | Yönetici | Kullanıcı Yetki › işlem günlüğüne bakar | HAVUZ_EKLE, ADLANDIR, PASIF, BIRLESTIR, ARSIV, ARSIVDEN_CIKAR kayıtları kim/ne zaman ile var |
| 11 | Yönetici | Takvim kartında tarih, tür (Yıllık İzin ya da Resmi Tatil) ve ad girip "Takvime ekle" der | Kayıt eklenir; yıllık çizelgede Resmi mavi, Yıllık İzin turuncu görünür |
| 12 | Yönetici | Dilimi ÖÖ seçip tek gün ekler | Yarım gün kaydı (daire) oluşur; çok günlüyse hata |
| 13 | Yönetici | Excel'i (.xlsx) seçip "Dosyayı tara" der | Bulunan tarih sayısı yazılır; her satırda tür seçici (Yıllık İzin / Resmi Tatil / Yarım Gün + ÖÖ/ÖS) |
| 14 | Yönetici | Bazı satırları değiştirir, birinin işaretini kaldırır, "Hepsini şuna çevir…" dener, "Doğrula" der | Satırlar Yeni/Güncellenecek/Aynı/hata görünür; hiçbir şey kaydedilmez |
| 15 | Yönetici | Hatalı satır varken "Seçilenleri takvime ekle" | Düğme pasif; hatasız olunca eklenir ve çizelge güncellenir |
| 16 | Normal kullanıcı (Sorumlu/Saha) | Havuz/takvim yazma komutunu denemek (sekme zaten yok) | Sekme görünmez; sunucu yazmayı reddeder (yetki) |

Bilinen sınır: "2024 takvim tasarımı" olarak Dilim 3b'deki yıllık çizelge (renk ve açıklamalar) korundu; farklı renk/açıklama gerekiyorsa söyleyin.
