# Dilim 9 – El sınaması (analiz ve arşiv)

Ön koşul: `011_analiz.sql` uygulanmış (açılışta otomatik). Birkaç ana projede atama, en az bir izin ve bir rapor kaydı.

| # | Kim | Ne yapar | Beklenen |
|---|---|---|---|
| 1 | Yönetici | Menüden **Analiz** → Proje adam-gün | Bu ayın atamaları ana › alt › faaliyet satırlarında; ana proje toplamı ve genel toplam görünür |
| 2 | Yönetici | Elle say: 1 tam gün + 2 yarım gün atama | Adam-gün 2,0 (tam 1,0; ÖÖ/ÖS 0,5) |
| 3 | Yönetici | Tarih aralığını değiştirir (Bu yıl, Geçen yıl, elle GG.AA.YYYY), ana proje süzer | Liste aralığa/süzgece göre değişir; bitişi başlangıçtan önce yazarsa hata |
| 4 | Yönetici | **Personel** sekmesi | Kişi başına adam-gün, görev günü, proje sayısı, izin ve rapor günü, proje dağılımı |
| 5 | Yönetici | Bir kişi satırına tıklar | Gün gün görev / izin / rapor dökümü açılır |
| 6 | Yönetici | Ad veya bölümle süzer | Liste daralır |
| 7 | Sorumlu | Analiz sayfasını açar | Yalnız kendi taleplerinin atamaları; izin ve rapor sütunları yok; kişi dökümünde yalnız görevler |
| 8 | Saha | Menüde Analiz var mı? | Yok (komutu çağıramaz) |
| 9 | Yönetici | **Arşiv** sekmesi, arama | Eski araçtan gelen tarihsiz "kim hangi projeye gitti" kayıtları; arama çalışır |
| 10 | Yönetici | Her sekmede **Excel'e aktar** | Kayıt penceresi; dosya Excel'de açılır; adam-gün sütunları sayı olarak toplanabilir |
