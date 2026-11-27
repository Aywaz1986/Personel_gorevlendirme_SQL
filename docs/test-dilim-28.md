# Dilim 28 sınama listesi (SQL 023 + arayüz) — SQL SINANMADI, CI'da SqlTests
Önce veritabanını güncelleyin (uygulama açılışında şema 23'e yükselir).
1. **Yönetici – Haftalık Özet:** atanmış bir görev kartına tıklayın → "⚙ Görevi yönet" düğmesi görünür. Beklenen: talep yönet paneli pencerede açılır; kapatınca matris yenilenir.
2. **Kişi değiştir:** panelde bir kişiyi "İkame…" ile değiştirin (ya da "Çıkar"). Beklenen: matriste yeni kişi, eski kişiye bildirim.
3. **Sorumlu devri:** "Sorumlu devret…" → yeni sorumlu → kart ayrıntısında yeni sorumlu görünür.
4. **Süre/metin:** "Revize…" ile görev metni, saha notu, saat ve gün başına kişi sayısını değiştirin → hemen uygulanır. "Erken bitir…" ile yeni son gün → sonraki günler kalkar.
5. **İptal:** "Görevi iptal et…" → neden → atamalar kalkar, matristen kaybolur.
6. **Proje bağlamı:** "Proje bağlamı…" → Ana/Alt/Faaliyet/Yerleşke adlarını değiştirin (listeden ya da yeni ad) → Uygula. Beklenen: atamalar yerinde; Talepler ve Haftalık Özet'te yeni yol; Havuz eforu yeni yolda; atananlara ve sorumluya "proje bağlamı değiştirildi" bildirimi.
7. **Reddedilenler:** aynı yolu tekrar uygulamak, pasif ya da birleştirilmiş adı yazmak, atanmamış (bekleyen) talepte denemek → anlaşılır hata.
8. **Yetki:** Proje Sorumlusu/Saha kartta "Görevi yönet" görmez; Sorumlu panelinde "Proje bağlamı…" yoktur.
