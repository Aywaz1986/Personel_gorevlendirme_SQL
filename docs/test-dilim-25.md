# Dilim 25 sınama listesi (İzin ve Sağlık Raporu ekranı)
Yalnız arayüz değişti; sunucu komutları ve SQL aynı. Önceki dilimlerin dalları birlikte denenir.
1. **Yönetici → İzin Onayları**: üst şerit (Vekaleten düğmeleri), 4 KPI kartı (Onay bekleyen / İkame bekleyen / Bugün aktif izinli-raporlu / Bu ay adam-gün), 3 sekme prototiple aynı görünür; koyu temada okunur.
2. **İzin sekmesi**: arama (ad/sicil/kayıt no), durum hapları (Tümü/Onay bekleyenler/Onaylananlar/Reddedilen-iptal) ve tür süzgeci tabloyu anında süzer; yazarken kutu odağı kaybolmaz.
3. Bekleyen izinde **Onayla**: çakışma yoksa onaylanır; kişinin o günlerde ataması varsa "Çakışma kararı" penceresi çıkar → Vazgeç ya da "Çakışan görevden çıkar ve izni uygula".
4. **Reddet**: pencerede açıklama boşsa uyarır; yazılınca reddedilir, satırda "Gerekçe" görünür, personel kendi ekranında görür.
5. Gün rozetine tıkla → "Gün bazlı izin detayı" (gün katsayısı, durum). Onaylı izinde oradan "Gün kırılımını düzenle" açılır.
6. Onaylı izinde **Erken dönüş / kısalt**: son günlerin işaretini kaldır → Uygula → izin o güne kısalır, satır "Kısaltıldı" olur; tüm işaretler kalkarsa izin tümüyle iptal edilir. Ortadaki gün kaldırılınca sonraki günler de kalkar.
7. **İzni iptal et** → onay penceresi → izin iptal, günler Müsait.
8. **Sağlık raporları ve ikame uyarıları** sekmesi: kırmızı ikame bandı (varsa) + rapor tablosu. "Hızlı ikame personel ata" ikame/yönet panelini pencerede açar; ikame yapınca pencere kapanır ve liste yenilenir.
9. **Evrakı görüntüle / düzenle**: evrak adı/boyutu, "Evrakı kaydet" (dosya kaydetme penceresi), tarih düzeltme (Yönetici), iptal gerekçesi (≥3 karakter) ile "Geçersiz raporu iptal et".
10. **Arşiv** sekmesi: izin+rapor birleşik, arama ve tür haplı süzgeç; "Arşivi CSV indir" → Excel'de ; ayraçlı, Türkçe karakterli açılır, süzgeçteki kayıtlar iner.
11. **＋ Vekaleten izin tanımla / 🏥 Vekaleten rapor gir**: pencerede iki sekme, kişi arama (boşsa kendi adına). İzin: tarih/dilim/açıklama → canlı hesap kutusu → "Kaydet ve onayla" (anında onaylı; çakışmada karar kutusu). Rapor: tarihler + evrak seç → "Raporu takvime işle".
12. **Sorumlu / Saha görünümü**: yan yana "Yeni izin talebi" ve "Belgeli sağlık raporu beyanı" kartları. Tarih yazınca "Hesaplanan net izin süresi" (adam-gün, iş günü, atlanan tatiller) anında değişir; Öğleden önce/sonra seçince 0,5 katsayı. Saha'da görev gününe denk gelen izinde sarı çakışma uyarısı çıkar.
13. Rapor formunda evrak seçmeden kaydet → "Rapor belgesi zorunludur" uyarısı; geçersiz tür/boyut → kırmızı doğrulama kutusu; dosya adı önizlemesi tarihe göre güncellenir.
14. "Kişisel izin ve rapor kayıtlarım": rapor ve izin satırları, gün rozetleri, red gerekçesi kırmızı kutuda; bekleyen izinde **Talebi geri çek** çalışır.
15. Saha: "Görevlerim" tablosu ve "Göster" ile saha notu/sorumlu telefonu aynen çalışır.
**Prototipten bilerek ayrılanlar:** rol değiştirici ve tema düğmesi yok (uygulamanınki kullanılır); "Kalan yıllık izin" ve hastane alanı yok (modül/alan yok); ağ arşiv yolu yok (evrak veritabanında); hızlı ikame mevcut ikame panelini kullanır; örnek/hatalı dosya düğmeleri yok (gerçek dosya seçilir).
