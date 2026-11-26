# Dilim 20 sınama listesi (Kullanıcı Yetki Yönetimi)
1. Yönetici › Kullanıcı Yetki: üstte 4 kart (Aktif Merkez Yöneticisi, İstisna/Çoklu Rol, Eşleştirilmiş Bölüm Oranı, Kapsamdaki Personel); iki bölüm alt alta.
2. Bölüm 1: arama (ad, sicil, hesap, bölüm) ve Tümü / Merkez Yöneticiler / İstisna-Çoklu Roller / Pasifler süzgeçleri çalışır.
3. "+ Yeni Yetki / İstisna Tanımla": personel adı yazılınca bölüm ve bölüm rolü görünür; rol seçilmeden veya gerekçe boşken kaydedilmez; 2 rol seçilince sarı çoklu rol uyarısı çıkar; kayıt tabloya düşer.
4. ✎ Düzenle aynı pencereyi açar (personel değişmez); 🗑️ Kaldır onay ister, kişi bölüm kuralına döner.
5. Tek aktif yöneticide satırda 🔒 Son Yönetici; Pasif'e alma/Kaldır/yönetici rolünü silme denenince kırmızı güvenlik bandı çıkar, kayıt değişmez.
6. Bölüm 2: bir bölümün rolünü değiştirince "Kaydedilmedi" yazar ve düğme "(1 Değişiklik)" olur; Kaydet işler, son güncelleyen/zaman dolar; seçimi eskiye çevirmek taslağı siler.
7. "Kapsam Dışı" seçilen bölüm kaydedilir; o bölümün kişileri (istisnası yoksa) giriş yapınca hiçbir sekme görmez. Karar verilmemiş bölümde sarı "Eşleşme bekliyor" bandı ve süzgeç sayacı çıkar.
8. "👥 n Personel ▾" bölümün aktif personelini açar; istisnalılar ⚡ işaretlidir.
9. "🔍 Etkin Yetki Test Et": personel seçince yetki kaynağı, roller, görünüm geçişi, açılış ekranı ve sekmeler görünür; istisnalı kişide Bölüm 1, diğerinde Bölüm 2 kaynağı yazar.
10. "🔄 Özlükten Güncelle" onay sorar ve kadroyu eşitler (Özlük'te tüm kurum kapsamlı yönetici gerekir).
11. Yönetici olmayan roller bu sekmeyi görmez.
