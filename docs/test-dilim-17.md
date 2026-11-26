# Dilim 17 sınama listesi (yalnız arayüz; SQL gerekmez)
1. Yönetici › Bekleyen Görev Talepleri: onay bekleyen kart 3 sütun (Özet | Görev ve Saha Bilgisi | Tavsiye Bloğu); dar pencerede alt alta.
2. Aynı sayfada düğmeler: Tümü, Bekleyen, Atanmış, Revize & İkame Uyarıları (sayı), Kapalı. Revize düğmesi eski sekmenin içeriğini açar; İncele/Yönet çalışır; başka düğmeye dönünce liste yenilenir.
3. Üst sekmelerde ayrı "Revize & İkame" sekmesi yok; Talepler rozeti bekleyen + revize + ikame toplamıdır.
4. Kullanıcı Yetki: alt alta Yönetici Tanımı/istisnalar, sonra bölüm→rol eşleştirme; işlem günlüğü burada yok.
5. Ayarlar › İşlem Günlüğü (yalnız Yönetici): filtre ve liste eskisi gibi; Sorumlu/Saha bu sekmeyi görmez.
6. Proje Havuzu sekmesi yalnız havuz; Akademik Takvim ayrı sekme: 3×4 renkli aylar, altında ayrıntı listesi.
7. "AKADEMİK TATİL VE RESMİ TATİL YÖNETİMİ" düğmesi pencere açar: ekleme, düzenleme, silme, Excel/CSV toplu ekleme çalışır; Esc/✕ kapatır; kayıt sonrası çizelge güncellenir.
8. Tüm GG.AA.YYYY kutularında 📅: tıklayınca takvim açılır, seçilen tarih kutuya GG.AA.YYYY yazılır (Analiz, Haftalık Özet, İzin/Rapor, Revize, Talep formu, Günlük).
9. Analiz: tarih kutuları, Uygula ve hızlı düğmeler aynı hizada.
10. Ayarlar › Görünüm › Logo ve filigran: logo seç → sol üstte görünür, arkada silik filigran; koyuluk ayarı; kaldır; 300 KB üstü reddedilir; yeniden açınca kalır (bu bilgisayarda).
11. Talep kartı/formu: 5 gün × 1 kişi "günlük 1 kişi" yazar (5 kişi-gün/5 kişi değil); günlük 2+ kişi istenirse "günlük N kişi". Durum rozeti tek kişilikte "(x/5 gün)". Yönetici günleri farklı kişilere bölerse (atama ekranı) kabul edilir.
12. Haftalık Özet: görev hücresine tıklayınca açılan ayrıntı, talep Özet'iyle aynı satır düzeninde (Talep, Proje, Faaliyet, Konum, Saat, Tarih, Proje sorumlusu + tel).
13. Akademik Takvim yönetimi: kayıt ekledikten sonra Düzenle → form mavi çerçeveli ve görünür gelir ("Kaydı düzenliyorsunuz…"), Kaydet güncellemeyi yapar. Hata olursa toast'taki metni bildirin.
