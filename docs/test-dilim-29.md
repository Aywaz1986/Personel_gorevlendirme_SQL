# Dilim 29 sınama listesi — SQL 024 SINANMADI (CI'da SqlTests)
Önce uygulamayı açın (şema 24'e yükselir).
1. **Yönetici – Bekleyen Görev Talepleri:** "Revize & İkame Uyarıları" düğmesine tıklayın. Beklenen: revize talepleri ve ikame bekleyenler listesi açılır; başka sekmeye tıklayınca normal liste döner; Yenile çalışır.
2. **Haftalık Özet – Hızlı Atama:** "⚡ Hızlı Atama" → yalnız haftada boş günü olan personel satırları kalır, müsait hücreler vurgulu. "Tüm Ekip" → hepsi geri gelir.
3. **Haftalık Özet – Gölbaşı Saha Odak:** yerleşke adı "Gölbaşı" içeren görevli personel kalır ("Ankara Gölbaşı" dahil). "Çakışma & İkame" → yalnız çakışması olan satırlar. Boşsa açıklayıcı mesaj.
4. **Hazır görünüm süzgeç sıfırlama:** Bölüm/Ana Proje seç, "Görevli/izinli olanlar" süzgecini aç; sonra bir hazır görünüm seç → süzgeçler varsayılana döner.
5. **Akademik Takvim → Excel Şablonu:** düğmeye tıklayın. Beklenen: Windows "Kaydet" penceresi, dosya adı Akademik_Kurumsal_Takvim_YYYY.csv; kaydedince bildirim; İptal'de hiçbir şey olmaz; dosya Excel'de açılır (Türkçe karakterler doğru).
6. **İzin/Rapor arşivi CSV ve Eski veri raporu:** aynı kayıt penceresi açılır.
7. **Kullanıcı Yetki → istisna → Saha Personeli kartı:** işaretleyince altında "Saha personeli listesine ekle" kutusu (varsayılan işaretli). İşareti kaldırıp kaydet → liste satırında "⊘ Listede değil".
8. **Etkisi:** o kişi Haftalık Özet'te, atama/öneri adaylarında ve "saha toplam" sayacında yok; kendisi girişte saha ekranlarını (izin/rapor, görevlerim) kullanabilir. Kutuyu tekrar işaretle → listelere geri döner.
