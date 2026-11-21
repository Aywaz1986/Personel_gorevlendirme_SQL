# Dilim 6 sınama listesi – Haftalık matris

Önkoşul: Dilim 5 sınaması yapılmış; en az iki Ana Proje altında birkaç talep atanmış (bir kişiye ÖÖ ve ÖS farklı projeler, biri tam gün). Bir Yönetici, bir Sorumlu, bir Saha hesabı.

| # | Kim | Yap | Beklenen |
|---|---|---|---|
| 1 | Yönetici / Sorumlu / Saha | Menü → **Haftalık matris** | Üç rolde de menüde var; tablo açılır (Saha'da menü: Haftalık matris, Görevlerim). Yalnız okunur. |
| 2 | Herhangi | Atamaların olduğu haftaya git (kutuya GG.AA.YYYY yaz ya da ◀ ▶) | Başlıkta "23 – 29 Kasım 2026 · 48. hafta"; sütunlar Pzt..Paz tarihleriyle; tarihler GG.AA.YYYY. |
| 3 | Herhangi | Hafta ortasından bir tarih yaz (ör. 25.11.2026) | Hafta pazartesiden (23.11) başlar. |
| 4 | Herhangi | Hücreleri incele | Tam gün tek blok; ÖÖ üst yarı, ÖS alt yarı; renk Ana Proje; ad hücrede yazılı; hafta sonu gri; "Günlük görevli sayısı" satırı doğru. |
| 5 | Herhangi | Bir göreve bas | Altta kod, Ana › Alt › Faaliyet, 📍 konum, 🕣 saat, 🧍‍♂️ sorumlu; ✕ kapatır. |
| 6 | Herhangi | Ad ara / Bölüm / Ana Proje seç | Liste daralır; Ana Proje seçilince yalnız o projede görevli kişiler gelir. |
| 7 | Herhangi | "Yalnız bu hafta görevli olanlar" işaretini kaldır | Görevi olmayan aktif kişiler de listelenir; pasif kişi görünmez. |
| 8 | Herhangi | Akademik takvimde tatil olan haftaya git | O günün sütunu sarı, "Tatil" etiketli. |
| 9 | Yönetici + ikinci pencere (Sorumlu/Saha) | Matris açıkken Yönetici başka pencerede o haftaya atama yapsın | En çok 30 sn içinde matris kendiliğinden güncellenir; "Son yenileme" saati değişir. Çıkarılan atama da kalkar. |
| 10 | Herhangi | **Excel'e aktar** → kaydet | Dosya yazılır, "Excel kaydedildi (N personel)" bildirimi; Excel'de açılınca Sicil/Personel/Bölüm + 7 gün sütunu, hücrelerde "Tam gün: Ana › Faaliyet (TLP-…)" ya da "ÖÖ: … / ÖS: …" satırları; ilk satır kalın, ilk üç sütun sabit. |
| 11 | Herhangi | Excel kayıt penceresinde İptal | Hata yok, dosya yazılmaz. |
| 12 | Kadro dışı hesap | Uygulamayı aç | "Yetkisiz Erişim"; matris çağrısı yetki hatası verir. |
| 13 | SSMS | `dbo` parmak izi öncesi/sonrası | Aynı. |

Bilinen sınırlar: izin ve rapor günleri Dilim 7'de eklenir; matris yalnız okunur (atama değişikliği Atama panelinden).
