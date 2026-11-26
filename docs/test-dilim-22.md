# Dilim 22 sınama listesi
1. Proje Havuzu → "+ Yeni Ana Proje": Alt Proje alanını boş bırakıp ana proje + faaliyet + yerleşke ekle. Beklenen: ağaçta ana proje altında doğrudan faaliyet görünür, "Genel" satırı görünmez.
2. Alt projeli bir ana projede "+ Faaliyet" (ana satırında): faaliyet doğrudan ana projenin altına eklenir.
3. Talep formunda alt proje boş bırakılıp kaydet: talep kaydedilir, kartlarda "Genel" yazmaz.
4. (Test ortamı) gorev_sifirla.sql çalıştır: Proje Havuzu boş (kayıt numaraları kaldığı yerden sürer).
5. Eski veri → Kuru çalıştırma raporu: "projeId'siz/yetim ... çözülen / çözülemeyen" satırına bak; "AİC/MCT Karapınar" ayrı kök olarak açılmamalı. Aktarım sonrası havuzda AİC/MCT tek ana proje, Karapınar/Temelli/Aksaray Konum.
