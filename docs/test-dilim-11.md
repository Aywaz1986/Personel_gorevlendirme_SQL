# Dilim 11 – El sınaması (senaryo tamamlama)

Ön koşul: `013_senaryo_tamamlama.sql` uygulanmış (açılışta otomatik). Önce yedek alın. Sunucuda sınanmadı; CI SQL testleri var.

| # | Kim | Ne yapar | Beklenen |
|---|---|---|---|
| 1 | Sorumlu | Yeni talepte **Saha / Operasyon Notu** alanına uzun metin (araç, KKD, giriş kişisi…) yazar, kaydeder | Alan çok satırlı, 1000 karaktere kadar; "Aranan nitelik" ifadesi hiçbir yerde yok |
| 2 | Sorumlu | 1000+ karakter yazmayı dener | Alan keser / sunucu "1000 karakteri geçemez" der |
| 3 | Sorumlu | Talep listesinde **İletişim / Saha notu** | Not + kendi telefonu görünür; atama yoksa atananlar gelmez |
| 4 | Yönetici | Atanmış talepte aynı düğme | Saha notu, Proje Sorumlusu telefonu (tıklanınca tel:), atananların ad/bölüm/telefonu |
| 5 | Saha | Görevlerim → satırda **Göster** | Saha notu + Proje Sorumlusu telefonu; atananlar listesi YOK |
| 6 | Saha | Atanmadığı bir talebin iletişimini zorlar | Yetki hatası |
| 7 | Yönetici | Atama ekranında aday kartı | "Proje: N görev · X adam-gün · yerleşke · talep günlerinde müsait: Y" |
| 8 | Yönetici | Analiz → Personel | Yeni sütunlar: Müsait gün, Tatil günü, Tatilde çalışma; Sorumluda "Müsait gün" yok |
| 9 | Yönetici | Analiz → Excel | Aynı sütunlar Excel'de |
| 10 | Yönetici/Sorumlu | Haftalık matris → **Yerleşke** filtresi | Yalnız seçilen konumdaki görevler; Excel aynı filtreyle |
| 11 | Yönetici | Raporlu kişiye ileri tarihli atama varken rapor girer | Talepler sayfasında "İkame personel bekleyen görevler" kutusu (neden: Raporlu) |
| 12 | Yönetici | Kadroda pasif/ayrılmış kişinin ileri atamasının bulunması | Kutuda "Ayrıldı / pasif" |
| 13 | Yönetici | Kutudan **Yönet…** | İkame akışı açılır; ikame sonrası satır kutudan kalkar |
| 14 | Yönetici | Menü rozetleri | Talepler: bekleyen+revize+ikame; İzin ve rapor: onay bekleyen; üzerine gelince döküm |
| 15 | Sorumlu | Menü rozeti | Onaylanan/reddedilen/revize/ikame toplamı |
| 16 | Saha | Görevlerim rozeti | Okunmamış bildirim sayısı |
| 17 | Herhangi | 30 sn bekler; form açıkken | Liste yenilenir; açık form/yazılı alan bozulmaz. Üstteki Yenile düğmesi anında yeniler |
| 18 | Yönetici | Rapor evrakını indirir | Dosya adı `Ad_Soyad_yyyymmdd_RPR-NNNN.pdf` |
| 19 | Yönetici | Revize ekranında alan etiketi | "Saha / Operasyon Notu" |
