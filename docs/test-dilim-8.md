# Dilim 8 – El sınaması (revize, iptal, ikame, devir)

Ön koşul: `010_revize_ikame.sql` uygulanmış (açılışta otomatik). Yönetici, Sorumlu ve iki Saha kişisi; en az bir kısmen/tamamen atanmış, **henüz başlamamış** talep.

| # | Kim | Ne yapar | Beklenen |
|---|---|---|---|
| 1 | Sorumlu | Talepler listesinde atanmış talepte **Yönet…** | Gün tablosu ve atananlar; Revize iste / Erken bitir / Görevi iptal et düğmeleri (Sorumlu devret yok) |
| 2 | Yönetici | Aynı panel | Ek olarak **Çıkar**, **İkame…** (kişi yanında) ve **Sorumlu devret…** |
| 3 | Sorumlu | **Revize iste**: görev metnini/saati değiştirir, gönderir | "Yönetici onayı bekleniyor"; Revizeler'de REV-nnnn *Onay bekliyor*; Yöneticiye bildirim |
| 4 | Sorumlu | Bekleyen revize varken ikinci revize dener | Reddedilir (bekleyen revize var) |
| 5 | Yönetici | Revizede **Onayla** | Metin/saat talebe işlenir; Sorumluya bildirim |
| 6 | Sorumlu | Kişi sayısını artıran revize ister, Yönetici onaylar | Talep *Kısmen atandı* kalır/olur (istenen > atanan) |
| 7 | Sorumlu | Atanmış günü kaldıran ya da kişi sayısını atanandan aza indiren revize ister; Yönetici onaylar | "önce kişileri görevden çıkarın" hatası; revize bekler; **Reddet…** (nedenle) → Sorumluya bildirim |
| 8 | Yönetici | **Çıkar** (nedenli) | O günkü atama kalkar; kişiye ve Sorumluya bildirim; durum yeniden hesaplanır |
| 9 | Yönetici | **İkame…**: yeni kişi seç → İkameyi uygula | Eski kişinin (bugünden sonraki) günleri yeni kişiye geçer; ikisine bildirim |
| 10 | Yönetici | Yeni kişi aynı gün başka görevdeyse ikame | **Çakışma kararı** kutusu; *Çakışan görevden çıkar* → diğer görev sorumlusuna bildirim |
| 11 | Yönetici | Yeni kişi izinli/raporluysa ikame | Reddedilir (izinli/raporlu) |
| 12 | Sorumlu/Yönetici | **Erken bitir…**: yeni son gün + neden | Sonraki gün ve atamalar kalkar; etkilenen kişiye bildirim; son tarih kısalır |
| 13 | Sorumlu/Yönetici | **Görevi iptal et…** (nedenli) | Talep *İptal*; tüm atamalar kalkar; kişilere bildirim; matriste görünmez |
| 14 | Yönetici | Geçmiş günü atanmış (başlamış) talepte iptal dener | "Görev başlamış; Erken bitiş kullanın" |
| 15 | Yönetici | **Sorumlu devret…** (yeni kişi + neden) | Sorumlu değişir; her iki kişiye bildirim; geçmiş altta listelenir |
| 16 | Başka Sorumlu | Başkasının talebinde iptal/revize dener | Yetki hatası |
