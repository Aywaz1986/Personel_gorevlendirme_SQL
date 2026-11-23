# Roller ve yetkiler (Dilim 2'de kesinleşti)

## Roller
| Rol | Kaynak | Açılış ekranı |
|---|---|---|
| Merkez Yönetici | `kullanici_yetki_istisna.yonetici_mi` | Merkez Yönetici ve Atama Paneli |
| Proje Sorumlusu | Özlük bölümü → `rol_bolum_eslestirme`, ya da kişi bazlı istisna | Görev Talep Arayüzü |
| Saha Personeli | Özlük bölümü → `rol_bolum_eslestirme` | Kişisel Görev İzleme ve İzin/Rapor Beyanı |
Kişi bazlı istisna bölüm kuralının üzerine yazar; çoklu rolde üst menüden görünüm geçişi vardır. Sistemde en az 1 aktif yönetici bulunur (`tr_istisna_son_yonetici` tetikleyicisi korur, hata 50020).

## Erişim ilkesi
Bağlanabilmek yetki değildir. `gorev.personel`'de aktif kaydı olmayan veya hiçbir rolü çözülmeyen kişi hiçbir veri/arayüz görmez ("Yetkisiz Erişim").

## Matris (özet)
| İşlem | Yönetici | Sorumlu | Saha |
|---|---|---|---|
| Talep aç / geri çek | vekaleten | kendi taleplerinde | – |
| Atanmış talepte revize isteği, erken bitiş, iptal | doğrudan uygular | kendi talebinde (revize Yönetici onayıyla) | – |
| Revize onay/ret, atamadan çıkarma, ikame | ✔ | – | – |
| Talep listesi, personel arama (öneri için) | hepsi | yalnız kendi talepleri | yok (`yetki`) |
| Talep onay/ret, atama, sorumlu devri | ✔ | – | – |
| Çakışmada karar (vazgeç / çakışandan çıkar ve ata) | ✔ | – | – |
| Havuz yönetimi, akademik takvim/tatil | ✔ | – | – |
| İzin talebi / geri çekme | vekaleten (anında onaylı); onaylı izni geri çekebilir | kendi izni (ONAY_BEKLIYOR iken geri çeker) | kendi izni (aynı) |
| İzin onay/ret/kısaltma | ✔ | – | – |
| Rapor beyanı (evrak zorunlu) / iptal | vekaleten, her raporu iptal | kendi raporu | kendi raporu |
| Rapor evrakını görme | ✔ | yalnız kendi | yalnız kendi |

> Dilim 7 notu: sicili olan her kayıtlı kişi (Sorumlu dahil) kendi izin/raporunu beyan eder. Saha geçmiş tarihli izin giremez. Ret ve rapor iptali nedeni ≥3 karakter zorunludur.
| Haftalık özet (7 gün, Excel) | ✔ | ✔ | ✔ |
| Kadro eşitleme | Özlük yöneticisi olan yönetici | – | – |
| Bölüm–rol eşleştirme, istisna, kullanıcı yönetimi | ✔ | – | – |
| Audit log görüntüleme | ✔ | – | – |
İletişim görünürlüğü: atamadan önce yönetici sorumlunun telefonunu görür; atamadan sonra sorumlu ile atanan personel birbirinin telefonunu görür.

## Rol çözümü (`gorev.sp_ben`)
1. Hesabın aktif **istisna** satırı varsa roller tam olarak onun bayraklarıdır (`yonetici_mi`, `sorumlu_mu`, `saha_mi`); bölüm kuralına bakılmaz.
2. Yoksa aktif `gorev.personel` satırı `kullanici_adi` ile eşleşir (`gorev.fn_hesap_eslesir`: tam eşleşme ya da kayıt alan adsızsa hesabın `\` sonrası; büyük/küçük harf duyarsız, `Latin1_General_CI_AS`). Bölümü `rol_bolum_eslestirme`'den SORUMLU ya da SAHA verir. **Yönetici bölümden gelmez.**
3. Pasif (ayrılmış) kişi rol almaz. Hiç rolü yoksa `kayitli=0` → "Yetkisiz Erişim".
Yönetim yordamlarının hepsi `fn_yonetici_mi()` denetler (50023). Yönetici sayısı sıfıra inemez (50020).

## İlk yönetici
Kurulumdan sonra SSMS'te `db_owner` ile `tools/sql/gorev_ilk_yonetici.sql` bir kez çalıştırılır (`@hesap` boşsa bağlanan hesap). Zaten aktif yönetici varsa 50025 ile reddeder. Uygulama içinde "beni yönetici yap" düğmesi bilinçli olarak YOKTUR (yetki yükseltme riski). Sonraki yöneticiler arayüzden atanır.

## Kadro eşitleme şartı
`sp_ozluk_esitle` çağıranın bağlamında çalışır (Özlük satır düzeyi güvenliği geçerli). Çağıran gorev yöneticisi olmalı **ve** Özlük `sp_ben` çıktısında `kayitli=1, aktif=1` ile `rol='yonetici'` ya da (`rol` ik/goruntuleyici ve `kapsam_org_id` NULL) olmalı. Not: `dbo.sp_ben`'in 9 sütunluk çıktı şekline bağımlıyız; Özlük bunu değiştirirse eşitleme kırılır (test `TestDb.OzlukBenTaklitAsync` aynı şekli taklit eder).

## Dilim 3 yetkileri
Proje havuzu ve takvim: **okuma** her rolde (rolü olan), **yazma** yalnız Merkez Yönetici (`fn_yonetici_mi`). Rolü olmayan kişi okuyamaz (50023). Tatil gününe atama engellenmez; Dilim 5'te yöneticiye uyarı çıkar.

> Dilim 9 (analiz): Yönetici tüm atamaları; Proje Sorumlusu yalnız kendi taleplerinin atamalarını görür; Saha analiz ekranını kullanamaz. İzin ve rapor sütunları yalnız Yönetici'ye gelir.

> Dilim 10 (canlıya geçiş): `sp_canli_kontrol`, `sp_ortam_canli`, `sp_eski_aktar*` yalnız Merkez Yönetici (yetki 50023). Aktarım/geri alma yalnız TEST ortamında. CANLI → TEST dönüşü yalnız `db_owner`'ın elle çalıştırdığı `gorev_geri_donus.sql` ile.


## Dilim 11 – Telefon ve saha notu görünürlüğü
`sp_talep_iletisim`: Yönetici her talebi; Sorumlu yalnız kendi talebini; Saha yalnız kendisine aktif atanmış talebi görür (saha notu + Proje Sorumlusu telefonu). Atananların telefonları yalnız Yönetici ve talebin Sorumlusuna, ve yalnız aktif atama varken gelir. Başkası için 50023 (yetki). `sp_sayaclar` ve `sp_ikame_bekleyenler` rol kapsamıyla sınırlıdır; `musait_gun` yalnız Yönetici.
