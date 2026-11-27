# Dilim 27 sınama listesi (SQL 022 + arayüz) — SQL SINANMADI, CI'da SqlTests
Önce veritabanını güncelleyin (uygulama açılışında şema 22'ye yükselir).
1. **Birleştirmede efor:** iki Yerleşke (aynı faaliyet altında, ör. "Ankara İvedik" ve "Konya Ereğli") için birer talep açıp atayın. Ağaçta efor görünür. "Ankara İvedik" → ⇄ Birleştir → "Konya Ereğli". Beklenen: kaynak ağaçtan kalkar, "Konya Ereğli" efor satırı iki talebin toplamını gösterir; Talepler ekranında eski talep artık hedef yerleşke adıyla görünür.
2. **Faaliyet birleştirme:** farklı alt projelerdeki aynı adlı iki Faaliyeti birleştirin: Birleştir düğmesi her satırda var; alt yerleşkeleri hedefe taşınır, eforlar toplanır.
3. **Taşı → aynı isim:** bir Faaliyeti, içinde aynı adlı faaliyet bulunan Alt Projeye taşımayı deneyin: pencerede sarı uyarı çıkar, düğme "⇄ Birleştir" olur; onayla → birleşir (eski "Aynı isim var, taşınamaz" kilidi yok). Ana Proje → başka Ana Projenin altına taşımada isim çakışması hâlâ uyarı verir (seviyeler farklı).
4. **Yerleşke taşıma:** Yerleşkeyi başka Faaliyete taşıyın: eski faaliyetten kalkar, yeni faaliyette görünür, efor yeni yola geçer. Hâlâ eski faaliyette kalan bir durum görürseniz kayıt numaralarını bildirin.
5. **Silme:** eforu 0 olan boş bir Ana Proje (ya da alt dalıyla) → 🗑 Sil → onay → kalıcı silinir. Eforlu kayıtta 🗑 Sil görünmez; yalnız ⏻ Pasife Al. Efor 0 ama talebi olan kayıtta Sil denenirse "talep kayıtları var… pasife alın" uyarısı çıkar.
6. **Yetki:** Yönetici dışında havuz komutları yetki hatası verir (Sorumlu/Saha zaten havuz ekranını görmez).
7. **Onarım:** daha önce (022 öncesi) birleştirilmiş kayıtlara bağlı kalmış eski talepler, güncellemeden sonra hedef kayıt altında görünür.
