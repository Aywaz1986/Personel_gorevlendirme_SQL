# Dilim 16 – El sınaması

Ön koşul: `017_dilim16.sql` uygulanmış olmalı (açılışta göç; sınanmadı, CI doğrular). Eski talep kodları yeniden numaralanır (TLP-2026-0001…).

| # | Kim | Ne yapar | Beklenen |
|---|---|---|---|
| 1 | Sorumlu | Yeni talep girer | Kod `TLP-2026-000N` biçiminde; numara yıl içinde artar |
| 2 | Yönetici | Bekleyen talep kartının tavsiye kutusuna bakar | Yalnız Saha Personeli rolündeki kişiler listelenir (rolü olmayan kişi çıkmaz) |
| 3 | Yönetici | Günlük tek kişi istenen talepte adayın yanındaki **Ata**'ya basar | Kişi görevin tüm günlerine atanır; kartın başlığında "✔ Ad Soyad atandı" |
| 4 | Yönetici | Birden fazla kişi istenen talepte **Ata**'ya basar | Atama ekranı açılır |
| 5 | Yönetici | Adayın çakışan günü olan talepte **Ata**'ya basar | Atama ekranı açılır (çakışma kararı) |
| 6 | Yönetici | Bugünden 14 günden ileri bir güne atama yapmaya çalışır | "İleriye dönük atama sınırı 14 gündür" hatası; 14. güne kadar serbest |
| 7 | Yönetici | Haftalık Özet'i açar (sekme adı "Haftalık Özet") | Varsayılan "Saha personeli (tümü)"; personelin altında telefon (bölüm yok) |
| 8 | Yönetici/Sorumlu | Görevli hücreye bakar | Blokta proje sorumlusu + telefonu; üzerine basınca ayrıntı kartında da |
| 9 | Saha personeli | Haftalık Özet'e bakar | Telefon numaraları görünmez |
| 10 | Yönetici | Boş hafta içi güne bakar | Yeşil kesikli "Müsait"; izin gri, rapor kırmızı; tatil "Tatil" |
| 11 | Yönetici | Bir personele görev atar, matrise döner (en fazla 30 sn) | Hücre otomatik göreve döner |
| 12 | Sorumlu | "İzin / Rapor Bilgisi" sekmesini açar | İzinli/raporlu personel listelenir (7/14/30 gün); hiçbir işlem düğmesi yok |
| 13 | Herkes | Otomatik yenileme (bkz. docs/MIMARI.md) | Matris, talepler, analiz, izin sayfaları 30 sn'de yenilenir; havuz/yetki/ayarlar elle |
