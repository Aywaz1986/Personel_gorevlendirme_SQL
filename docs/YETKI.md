# Roller ve yetkiler (taslak – Dilim 2'de kesinleşir)

## Roller
| Rol | Kaynak | Açılış ekranı |
|---|---|---|
| Merkez Yönetici | `kullanici_yetki_istisna.yonetici_mi` | Merkez Yönetici ve Atama Paneli |
| Proje Sorumlusu | Özlük bölümü → `rol_bolum_eslestirme`, ya da kişi bazlı istisna | Görev Talep Arayüzü |
| Saha Personeli | Özlük bölümü → `rol_bolum_eslestirme` | Kişisel Görev İzleme ve İzin/Rapor Beyanı |
Kişi bazlı istisna bölüm kuralının üzerine yazar; çoklu rolde üst menüden görünüm geçişi vardır. Sistemde en az 1 aktif yönetici bulunur (tetikleyici korur).

## Erişim ilkesi
Bağlanabilmek yetki değildir. `gorev.personel`'de aktif kaydı olmayan veya hiçbir rolü çözülmeyen kişi hiçbir veri/arayüz görmez ("Yetkisiz Erişim").

## Matris (özet)
| İşlem | Yönetici | Sorumlu | Saha |
|---|---|---|---|
| Talep aç / revize / geri çek / iptal | vekaleten | kendi taleplerinde | – |
| Talep onay/ret, atama, ikame, sorumlu devri | ✔ | – | – |
| Çakışmada karar (vazgeç / çakışandan çıkar ve ata) | ✔ | – | – |
| Havuz yönetimi, akademik takvim/tatil | ✔ | – | – |
| İzin talebi / geri çekme | vekaleten (anında onaylı) | – | kendi izni |
| İzin onay/ret/kısaltma | ✔ | – | – |
| Rapor beyanı | vekaleten, düzeltme/iptal | – | kendi raporu |
| Haftalık özet (7 gün, Excel) | ✔ | ✔ | ✔ |
| Kadro eşitleme | Özlük yöneticisi olan yönetici | – | – |
| Bölüm–rol eşleştirme, istisna, kullanıcı yönetimi | ✔ | – | – |
| Audit log görüntüleme | ✔ | – | – |
İletişim görünürlüğü: atamadan önce yönetici sorumlunun telefonunu görür; atamadan sonra sorumlu ile atanan personel birbirinin telefonunu görür.
