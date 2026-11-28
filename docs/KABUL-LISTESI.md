# Kabul listesi (rol × sekme) — birleştirmeden önce bir kez baştan sona

Otomatik denetimler (CI) şunlardır: `arayuz` iş akışı (komut/alan tutarlılığı, ESLint, duman testi), `sql-test` (yordamlar, yetki matrisi). Bu liste **gözle/elle** doğrulanacakları kapsar. Hata bulursan: sekme + düğme + ne bekledin / ne oldu → hata kaydı; düzeltince önce otomatik denetime karşılık gelen kontrolü ekleriz.
Her satır: ✔ çalışıyor · ✘ hata (not) · — uygulanamaz.

## Her rolde ortak
- [ ] Giriş: doğru ad/rol, doğru görünüm; kayıtsız kişi "yetkisiz" ekranı görür.
- [ ] Yenile: sekmenin verisi yenilenir; yetki/rol değişikliği uygulamayı kapatmadan yansır; açık pencere/yazı alanı bozulmaz.
- [ ] Koyu/açık tema, sekmeler arası geçiş, içerik alanı tam genişlik (logo soluna … Görünüm Geçişi sağına).
- [ ] Hata durumunda anlaşılır Türkçe mesaj (teknik metin / "undefined" yok).

## Yönetici
| Sekme | Kontrol |
|---|---|
| Bekleyen Talepler | Anlık arama (talep no, proje/faaliyet, talep sahibi, personel) · Revize & İkame Uyarıları açılır · İletişim varsayılan açık, gizle/göster · Atama onayı (çakışma seçenekleri) · Reddet/iptal · Yönet paneli: kişi çıkar, ikame, sorumlu devri, Revize (metin, saat, kişi sayısı, yeni son tarih → hafta sonu/tatil dahil), Erken bitir, Proje bağlamı, İptal |
| İzin Onayları | İzin/rapor kaydı, çakışma penceresi, ret, kısaltma, iptal, arşiv, CSV kaydı (Kaydet penceresi) |
| Haftalık Özet | Hazır görünümler (odak, süzgeç sıfırlama) · arama · bölüm/proje/yerleşke süzgeçleri · kartta Ana + Alt Proje · karta tıkla: Görevi yönet / Süre uzat-Revize · izin/rapor kartları |
| Ana Proje & Personel Analizi | Tablo/grafik açılır, süzgeçler çalışır |
| Proje Havuzu | Ekle, yeniden adlandır, Taşı/Birleştir (eforlar ve talepler hedefe geçer), Sil (efor 0 / bağlı talep mesajı), pasife al, arşiv |
| Akademik Takvim | Ekle/düzenle/sil, tatil, Excel/CSV şablonu (Kaydet penceresi), yıl değişimi |
| Kullanıcı Yetki | İstisna ekle/aktif-pasif/sil · Saha personeli listesine ekle kutusu · kadro eşitleme · bölüm eşleştirme |
| Ayarlar | Bağlantı, görünüm tercihleri |

## Proje Sorumlusu
- [ ] Yeni talep (proje yolu, günler, kişi sayısı), aktif taleplerim, geri çekme, revize isteği, sorumlu devri isteği.
- [ ] Haftalık Özet ve Akademik Takvim **salt okunur** (ekleme/silme yok; boş günde "tıkla" ipucu yok).
- [ ] İzin / Rapor Bilgisi: yalnız görüntüleme.

## Saha Personeli
- [ ] Görevlerim: kendi görevleri, izin talebi, rapor beyanı (belge yükleme 10 MB sınırı), iptal.
- [ ] "Saha personeli listesine ekle" işareti kaldırılmış kişi: ekranlar açılır, ama listelerde/atama adaylarında yoktur.
- [ ] Haftalık Özet ve Akademik Takvim salt okunur.

## Yetki sınırı (negatif)
- [ ] Sorumlu/Saha yönetici ekranlarına ve komutlarına ulaşamaz (arayüzde menü yok; zorlansa bile sunucu yetki hatası verir — `YetkiMatrisiTests` otomatik doğrular).

- [ ] Revize > Yeni son tarih ile uzatma: atanmış kişiler yeni günlere otomatik atanır, Haftalık Özet'te görünür; atlananlar bildirimde sayılır (Dilim 32).
- [ ] Her tarih kutusunun yanında 📅 seçici var (Dilim 32).

- [ ] Ayarlar yalnız Yenile yanındaki düğmeden açılır; Bekleyen Talepler alt sekmeleri Atanmış/Bekleyen/Revize/İzin Onayları (Dilim 33).
- [ ] Sorumlu/Saha 20 dk boşta uygulama kapanır, Yönetici kapanmaz (Dilim 33).

- [ ] Sorumlu vekâleten başka Sorumlu adına talep açar; açan listede görür (Dilim 34).
- [ ] Takvimde aynı güne ÖÖ + ÖS eklenir ve ikisi görünür; Şablon Yükle önizlemeli (Dilim 34).
