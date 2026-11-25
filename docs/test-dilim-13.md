# Dilim 13 – El sınaması (gizli bağlantı + yüzen pencere)

Ön koşul: yok (SQL değişikliği yok). Sınama bilgisayarında exe klasörü yazılabilir olmalı (Program Files değil).

| # | Kim | Ne yapar | Beklenen |
|---|---|---|---|
| 1 | Yönetici | exe klasöründe dosya yokken açar | "Bağlantı ayarı yapılmamış" bilgi ekranı; form yok; altta küçük "Yönetici: bağlantı ayarları" bağlantısı |
| 2 | Yönetici | Bağlantısına tıklar, sunucu/veritabanı yazar, "varsayılan olarak kaydet" işaretler, Bağlan | Bağlanır; "Varsayılan bağlantı kaydedildi" bildirimi; klasörde `Gorevlendirme.baglanti.json` oluşur (parola yok) |
| 3 | Normal kullanıcı | Aynı exe'yi açar | Form görmeden kendiliğinden bağlanır; kendi rolünün ekranı açılır |
| 4 | Normal kullanıcı | Sol alttaki pencereyi açar (+) | Sunucu tipi, kullanıcı, rol, ortam görünür; sunucu ve veritabanı adı YOK; "Bağlantıyı değiştir" YOK |
| 5 | Yönetici | Pencereyi açar | Sunucu ve veritabanı adı görünür; "Bağlantıyı değiştir" var |
| 6 | Herkes | Başlığından sürükler, kenardan boyutlandırır, sayfayı yeniler | Konum/boyut korunur; başlığa çift tık konumu sıfırlar |
| 7 | Yönetici | 📌 iğneler | "iğnelendi; konum tüm kullanıcılar için varsayılan oldu"; `Gorevlendirme.pencere.json` oluşur; iğneliyken taşınmaz/boyutlanmaz |
| 8 | Normal kullanıcı (başka bilgisayar/yeni profil) | Açar | Pencere yöneticinin iğnelediği yerde açılır |
| 9 | Yönetici | İğneyi kaldırır | Kurum varsayılanı da kalkar (`pencere.json` silinir) |
| 10 | Herkes | Pencerede Yenile / ↻ | Listeler sunucudan yenilenir, "Sunucudan yenilendi" bildirimi |
| 11 | Yönetici | Bağlantıyı değiştir → yanlış sunucu yazar | Hata iletisi formda; eski bağlantıya dönmek için Vazgeç çalışır |
| 12 | Yönetici | Formda "Varsayılan bağlantıyı sil" | Dosya silinir; sonraki açılışta (Özlük dosyası yoksa) "Bağlantı ayarı yapılmamış" |
| 13 | Normal kullanıcı | Sunucu kapalıyken açar | "Sunucuya bağlanılamadı" + Yeniden dene; sunucu adı gösterilmez; sunucu dönünce Yeniden dene bağlanır |
| 14 | Yetkisiz hesap | Açar | "Yetkisiz Erişim"; Yeniden dene çalışır; yönetici bağlantısı görünür |
| 15 | Yönetici | exe klasörü salt okunurken varsayılan kaydetmeyi dener | "dosya" hatası iletisi; uygulama çalışmaya devam eder |
| 16 | Yönetici | Yalnız `Ozluk.baglanti.json` varken açar | Görevlendirme dosyası olmadan Özlük'ün dosyasıyla bağlanır |
