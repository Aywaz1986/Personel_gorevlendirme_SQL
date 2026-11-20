# Dilim 3b sınama listesi – Eski veri denetimi

Önkoşul: yeni exe (Actions Artifacts), Merkez Yönetici hesabı, eski aracın `gorevlendirme.db` dosyası (kopyasını kullan; yine de dosya salt okunur açılır). Şema değişikliği YOK (yeni sürüm gerekmez).

| # | Kim | Yap | Beklenen |
|---|---|---|---|
| 1 | Yönetici | Menü → **Eski veri** | Açıklama ve "Dosya seç ve denetle" düğmesi; "Ad soyad ve sicilleri maskele" işaretli gelir. |
| 2 | Yönetici | Düğmeye bas, `gorevlendirme.db` seç | Pencere açılır; seçince birkaç saniye içinde özet kutuları ve rapor metni görünür. |
| 3 | Yönetici | Rapor 1. bölüm | Eski personel sayısı = eski araçtaki sayı; "Sicil ile eşleşen / Yalnız adla / Belirsiz / Eşleşmeyen" toplamı personel sayısına eşit. |
| 4 | Yönetici | Rapor 2. bölüm | Görevli/izinli/raporlu/müsait atama ve kişi-gün sayıları; tarih aralığı eski aracın ilk-son haftasıyla uyuşur. Birkaç haftayı eski araçta elle say, karşılaştır. |
| 5 | Yönetici | `!` ile başlayan satırlar | Her biri anlamlı (çakışma, haftasız atama, derin proje vb.). Beklenmedik olanı not al. |
| 6 | Yönetici | Rapor 5. bölüm | Proje ağacı derinliği ve kök proje listesi eski araçtakiyle uyuşur. |
| 7 | Yönetici | Maskeleme kapalı + tekrar çalıştır | Rapor gerçek adları gösterir (yalnız kendi ekranında); açıkken "A*** K***" biçimi. |
| 8 | Yönetici | **Panoya kopyala** / **Dosyaya kaydet** | Metin panoya gelir / `eski-veri-raporu.txt` iner. |
| 9 | Yönetici | Pencerede İptal | Hata yok, rapor değişmez. |
| 10 | Yönetici | Geçerli olmayan dosya seç (ör. .txt) | "Dosya geçerli bir SQLite veritabanı değil…" hatası. |
| 11 | Yönetici | Dosyanın tarih/boyutuna bak | İşlemden sonra değişmemiş (salt okunur). SSMS'te `gorev` tablolarında satır sayısı değişmemiş. |
| 12 | Rolü olan, yönetici olmayan | Menüde "Eski veri" görünmez | Görünmez; komut elle çağrılsa sunucu 50023 verir. |

**Rapor bana gönderilecek:** maskeli metni sohbete yapıştır (ya da özet sayıları). Gerçek aktarım dilimini rapora göre kesinleştiririm.
