# Köprü komutları (arayüz ↔ C#)

Arayüz ham SQL göndermez; `window.chrome.webview.postMessage({id, cmd, args})` ile adlandırılmış komut çağırır. Yanıt: `{id, ok:true, ms, data}` veya `{id, ok:false, code, error}`. Hata kodları: `komut`, `baglanti`, `yetki`, `cakisma`, `surum`, `dogrulama`, `hata`.
"Kapı" sütunu: sürüm kapısı engelliyse (eski exe / yeni şema) komutun çalışıp çalışmadığı. Dilim 1'deki sistem komutları kapı gerektirmez (kurulum ve durum ekranı engelde de açık kalmalıdır); kimlik/kadro/iş komutları `kapiGerekli: true` ile kaydedilir.

| Komut | Args | Dönüş | Kapı | Not |
|---|---|---|---|---|
| `ping` | – | `{pong, time}` | – | |
| `runtime` | – | uygulama/WebView2 sürümü, Windows kullanıcısı | – | |
| `baglantiDene` | – | `{kayit:false}` ya da bağlantı sonucu (`kaynak`: ortak/ozluk/yerel) | – | `Gorevlendirme.baglanti.json` → `Ozluk.baglanti.json` → kullanıcıya özel (DPAPI) sırasıyla |
| `baglan` | `server, database, encrypt, trust, kaydet` | `{kayit, bagli, info, sunucu, veritabani}` | – | yalnız Windows kimliği |
| `baglantiKapat` / `baglantiUnut` | – | `{tamam}` | – | Unut: kayıtlı bağlantıyı siler |
| `baglantiBilgi` | – | `{kayit, kaynak, pencere:{x,y,w,h}\|null}` | – | bağlantı gerekmez; sunucu adı DÖNMEZ |
| `varsayilanBaglantiYaz` | `server, database, encrypt, trust` | `{tamam, yol}` | Yönetici | exe klasörüne `Gorevlendirme.baglanti.json`; yazılamazsa `dosya` hatası |
| `varsayilanBaglantiSil` / `varsayilanBaglantiDurum` | – | `{tamam, silindi}` / `{mevcut, yol, sunucu, veritabani, ozlukDosyasi}` | Yönetici | |
| `pencereKonumYaz` | `x, y, w, h` ya da `sil:true` | `{tamam}` | Yönetici | yüzen pencerenin kurum varsayılan konumu (`Gorevlendirme.pencere.json`) |
| `surumDurum` | – | `{durum, mesaj, engelle, uygulama, hedefSema, sema, asgari, ortam, hesap, pollingSaniye}` | – | `AppState.Engel`'i ayarlar |
| `semaDurum` | – | harmanlama, şema sahibi, uygulanan/bekleyen betikler | – | |
| `semaUygula` | `zorla` | `{uygulananlar}` | – | db_owner gerekir |
| `sunucuDenetimi` | – | `{sonuc[], ozet}` | – | yan etkisiz |
| `ben` | `tercih?` | `{hesap, kayitli, adiSoyadi, sicilNo, bolum, yonetici, sorumlu, saha, kaynak, gorunumler[], varsayilan}` | ✔ | rol çözümü sunucuda (`gorev.sp_ben`); `kaynak`: ISTISNA / BOLUM; `varsayilan` = geçerli tercih, yoksa en üst rol |
| `kadroOzet` | – | kişi/aktif sayısı, son eşitleme (zaman, kişi, sayılar) | ✔ | yalnız yönetici |
| `kadroListe` | – | kadro kopyası + çözülen rol | ✔ | yalnız yönetici |
| `kadroEsitle` | – | `{okunan, eklenen, guncellenen, pasifeAlinan, degismeyen}` | ✔ | yalnız yönetici; Özlük'te yönetici/tüm kapsam şartı; %80 kapısı; silmez |
| `eslestirmeListe` | – | bölüm, rol, kişi sayısı (eşleşmesiz bölümler dahil) | ✔ | yalnız yönetici |
| `eslestirmeKaydet` | `bolum, rol` | `{tamam}` | ✔ | rol SORUMLU/SAHA; boş rol eşleşmeyi kaldırır; YONETICI bölümden gelmez |
| `istisnaListe` | – | kişi istisnaları (+ kadrodan ad) | ✔ | yalnız yönetici |
| `istisnaKaydet` | `hesap, sicilNo, yonetici, sorumlu, saha, aktif, aciklama` | `{tamam}` | ✔ | son aktif yöneticiyi kaldıran işlem reddedilir (`dogrulama`) |
| `istisnaSil` | `hesap` | `{tamam}` | ✔ | son yönetici silinemez |

Yeni hata eşlemesi: sunucu 50022/50023 → `yetki`; 50020/50021/50024/50025 → `dogrulama`.

## Dilim 3 komutları (proje havuzu, takvim)
| Komut | Bağımsız değişken | Sonuç | Kapı | Not |
|---|---|---|---|---|
| `havuzListe` | – | `[{id, ustId, seviye, ad, aktif, birlestirildiId}]` | ✔ | her rolde (rolü olan) okur |
| `havuzEkle` | `ustId?, ad` | `{id}` | ✔ | yalnız yönetici; seviye üstten türer (1 Ana Proje … 4 Konum); kardeşler arasında ad tekil |
| `havuzAdlandir` | `id, ad` | `{tamam}` | ✔ | birleştirilmiş kayıt değişmez |
| `havuzDurum` | `id, aktif` | `{etkilenen}` | ✔ | pasife alma altını da alır; etkinleştirme için üst aktif olmalı |
| `talepAtananAdlar` | – | `[{talepId, adlar}]` | ✔ (Yönetici/Sorumlu) | görev başlığında "atandı"; Sorumlu yalnız kendi talepleri |
| `izinRaporBilgi` | `gun?` (7/14/30) | `[{sicil,ad,gsm,tur,ilkTarih,sonTarih,durum}]` | ✔ (Yönetici/Sorumlu) | salt okunur izin/rapor bilgisi |
| `havuzArsiv` | `id, arsiv, neden?` | `{etkilenen}` | ✔ (Yönetici) | arşivle: neden zorunlu, altındakilerle pasif + arşiv; `arsiv:false` yalnız bayrağı kaldırır (pasif kalır). `havuzListe` artık `arsiv, arsivNeden, arsivTarih` döner |
| `havuzBirlestir` | `kaynakId, hedefId` | `{birlesen, tasinan}` | ✔ | aynı seviye; çocuklar taşınır, aynı adlılar birleşir; kaynak pasif + `birlestirildiId` |
| `takvimListe` | `yil?` | `[{id, baslangic(ISO), bitis(ISO), zaman, tur, ad, yillik, gun, kesilen}]` | ✔ | her rolde okur; `gun` takvim günü (yarım gün 0.5), `kesilen` yıllık izinden düşecek iş günü |
| `takvimOzet` | `yil` | `{kayit, resmiGun, idariGun, kesilenGun}` | ✔ | her rolde okur; "kesilen" yalnız bilgi (yıllık izin modülü yok) |
| `takvimKaydet` | `id?, baslangic(ISO), bitis?(ISO; boşsa tek gün), zaman(TAM/OO/OS), tur(RESMI/IDARI), ad, yillik(bool)` | `{id}` | ✔ | yalnız yönetici; kayıt tek yıl içinde ve <60 gün; yarım gün yalnız tek günde; TAM ile yarım gün çakışamaz, ÖÖ+ÖS aynı güne konabilir |
| `takvimSil` | `id` | `{tamam}` | ✔ | yalnız yönetici |
| `takvimMetinOku` | `metin, yil?` | `{satirlar:[{sira, baslangic, bitis, zaman, tur, ad, yillik}], yil, mod(STANDART/TABLO)}` | – | CSV/TSV/Excel yapıştırma ya da standart takvim liste satırları ("10-11-12 NİSAN … / 3 Gün Ramazan Bayramı (YILLIK İZİNDEN KESİLECEK)") → satırlar (sunucuya gitmez). STANDART modda yıl: sayfadaki 20xx hücresi, yoksa `yil`, yoksa `dogrulama` |
| `takvimXlsxOku` | `base64, yil?` | aynı | – | .xlsx (≤10 MB), ilk sayfa; paketsiz okuyucu |
| `takvimOnizle` | `satirlar[]` | `[{sira, baslangic, bitis, zaman, tur, ad, yillik, gun, durum(YENI/GUNCELLE/AYNI/HATA), hata}]` | ✔ | yazmaz; eşleşme anahtarı baslangic+bitis+zaman |
| `takvimUygula` | `satirlar[]` | `{eklenen, guncellenen, ayni}` | ✔ | ya hepsi ya hiçbiri; hatalı satır varsa `dogrulama` |
| `personelAra` | `q` (≥2 harf) | `[{sicil, ad, bolum}]` (en çok 20, yalnız aktif) | ✔ | Sorumlu/Yönetici; Saha `yetki` |
| `talepListe` | `durum?` | `[{id, kod, durum, sorumluSicil, sorumluAdi, ilkTarih, sonTarih, ana, alt, faaliyet, konum, gorevMetni, nitelik, saatBaslangic, saatBitis, gunSayisi, kisiGun, oneri, guncelleme}]` | ✔ | Yönetici hepsini, Sorumlu yalnız kendisininkini görür |
| `talepGetir` | `id` | başlık alanları + `retNedeni`, `gunler[{tarih, zaman, kisi, atananlar[{id, sicil, ad}]}]`, `oneri[{sicil, ad}]` | ✔ | form doldurma / kopyalama |
| `talepKaydet` | `id?, sorumluSicil?, ana, alt?, faaliyet, konum, saatBaslangic, saatBitis (ss:dd), gorevMetni, nitelik?, gunler[{tarih(yyyy-aa-gg), zaman(TAM/OO/OS), kisi}], oneri[sicil], gonder` | `{id, kod, durum, uyari}` | ✔ | yeni ya da (TASLAK/ONAY_BEKLIYOR iken) değiştir; `gonder` → ONAY_BEKLIYOR; havuzda olmayan ad `kaynak='TALEP'` ile eklenir; hafta sonu/tatil → `uyari` (engellemez); `sorumluSicil` yalnız Yönetici için |
| `talepGeriCek` | `id` | `{tamam}` | ✔ | yalnız TASLAK/ONAY_BEKLIYOR; sahibi ya da Yönetici |
| `atamaAdaylar` | `talepId, q?` | `[{sicil, ad, bolum, onerildi, gecmis, buTalepte, cakisanGun}]` (en çok 60; önerilen › proje geçmişi › az çakışma) | ✔ | yalnız Yönetici |
| `atamaCakismaKontrol` | `talepId, atamalar[{sicil, tarih, zaman}]` | `[{sicil, ad, tarih, zaman, cakisanTalepId, cakisanKod, cakisanZaman, cakisanSorumlu}]` | ✔ | kaydetmez; karar kutusunu doldurur |
| `atamaOnayla` | `talepId, atamalar[], karar` (`REDDET` varsayılan / `CIKAR`) | `{talepId, durum, atanan, cikarilan, uyari}` | ✔ | çakışmada `REDDET` → hata kodu `cakisma` (50030); `CIKAR` çakışan atamaları çıkarır, o talebin sorumlusuna bildirim yazar |
| `talepReddet` | `id, neden` (zorunlu) | `{tamam}` | ✔ | yalnız ONAY_BEKLIYOR; sorumluya bildirim |
| `bildirimListe` | `hepsi?` | `[{id, tur, mesaj, talepId, tarih, okundu}]` | ✔ | yalnız kendi bildirimleri (varsayılan okunmamışlar) |
| `bildirimOkundu` | `id?` (boşsa hepsi) | `{tamam}` | ✔ | |
| `matrisHafta` | `bas (yyyy-aa-gg; sunucu pazartesiye çeker), bolum?, ana?, q?, sadeceGorevli? (varsayılan true)` | `[{sicil, ad, bolum, hucreler[{tarih, zaman, talepId, kod, ana, alt, faaliyet, konum, saat, sorumlu}]}]` | ✔ | kayıtlı her rol; yalnız AKTIF atamalar; `ana` filtresi görevli şartı getirir |
| `matrisSurum` | `bas` | `{surum}` | ✔ | haftanın atama `rowversion` + satır sayısı; arayüz 30 sn'de bir sorar |
| `matrisBolumler` | – | `[bolum]` | ✔ | filtre listesi |
| `matrisExcel` | `bas, bolum?, ana?, q?, sadeceGorevli?` | `{iptal, yol?, satir?}` | ✔ | kayıt penceresi açar; `.xlsx` (Sicil, Personel, Bölüm, 7 gün) yazar; iptalde `iptal:true` |
| `canliKontrol` | – | `[{sira, kontrol, zorunlu, tamam, ayrinti}]` | Yönetici | canlıya geçiş kontrol listesi (8 madde) |
| `canliyaGec` | `onay` (`CANLI`), `minSurum?` | `{tamam}` | Yönetici | zorunlu maddeler tamamsa ORTAM=CANLI (tek yönlü); asgari sürümü ayarlar |
| `eskiAktarDurum` | – | `{talep, atama, izin, rapor, gecmis, havuz, ortam}` | Yönetici | `kaynak='ESKI_ARAC'` sayıları |
| `eskiAktar` | – | `{iptal}` ya da `{iptal:false, dosya, ozet, sonuc}` | Yönetici | dosya seçer, planlar, tek işlemde yazar; yalnız TEST; ikinci aktarım reddedilir |
| `eskiAktarGeriAl` | `onay` (`GERIAL`) | `{tamam}` | Yönetici | yalnız eski araç kayıtlarını siler; yalnız TEST |
| `eskiVeriDenetle` | `maskele?` (varsayılan true) | `{iptal:true}` ya da `{iptal:false, dosya, sayilar, metin}` | ✔ | Dilim 3b. Yalnız Merkez Yönetici (kadro listesi sunucuda reddeder). STA dosya seçim penceresi açar, `.db`yi SALT OKUNUR okur, hiçbir şey yazmaz. `metin` düz rapor, `sayilar` ekran özeti |

Girdi sütunları (başlık yoksa sıra): Tarih; Ad; Zaman dilimi; Tür (son ikisi isteğe bağlı: Tüm gün, Resmi tatil). Başlık varsa sütunlar adından bulunur. Tarih biçimleri: gg.aa.yyyy, yyyy-aa-gg, gg/aa/yyyy.

## Dilim 7 komutları (izin, rapor, kişisel görev)
| Komut | Girdi | Çıktı | Yetki | Not |
|---|---|---|---|---|
| `izinKaydet` | `sicil?` (vekaleten), `tur, aciklama?, gunler[{tarih, zaman}], karar?` (`REDDET`/`CIKAR`) | `{id, kod, durum}` | herkes (kayıtlı) | Yönetici: anında ONAYLANDI; çakışan atamada `REDDET` → hata kodu `cakisma` (50030); diğerleri ONAY_BEKLIYOR + Yöneticiye bildirim |
| `izinOnayla` | `id, karar?` | `{id, durum, cikarilan}` | Yönetici | çakışmada `cakisma`; `CIKAR` atamadan çıkarır + sorumluya bildirim |
| `izinReddet` | `id, neden` (≥3) | `{tamam}` | Yönetici | |
| `izinGeriCek` | `id` | `{tamam}` | sahibi (ONAY_BEKLIYOR); Yönetici ONAYLANDI da | |
| `izinKisalt` | `id, yeniSon` | `{tamam}` | Yönetici | kalan gün yoksa GERI_CEKILDI |
| `izinListe` | `durum?, sicil?` | `[{id, kod, sicil, ad, bolum, durum, tur, aciklama, vekaleten, retNedeni, ilkTarih, sonTarih, gunSayisi, cakisanAtama, gunler[]}]` | herkes | Yönetici hepsini, diğerleri kendi kayıtlarını görür |
| `raporEvrakSec` | – | `{iptal, yol?, ad?, boyut?}` | herkes | açma penceresi (STA); PDF/JPG/PNG ≤10 MB |
| `raporKaydet` | `sicil?, ilkTarih, sonTarih, aciklama?, evrakYol` | `{id, kod, cakisanAtama}` | herkes | dosya C# tarafında okunur, tür imzadan doğrulanır; izin günleri iptal, çakışan atama durur + bildirim |
| `raporIptal` | `id, neden` (≥3) | `{tamam}` | sahibi / Yönetici | |
| `raporListe` | `sicil?, iptalDahil?` | `[{id, kod, ..., evrakAdi, evrakBoyut, cakisanAtama}]` | herkes | evrak baytı dönmez |
| `raporEvrakKaydet` | `id` | `{iptal, yol?}` | sahibi / Yönetici | kayıt penceresi |
| `gorevlerim` | `bas?, bit?` | `[{tarih, zaman, kod, ana, alt, faaliyet, konum, saat, sorumlu}]` | herkes | kendi AKTIF atamaları (varsayılan −14/+90 gün) |

`matrisHafta` satırına `izinler[{tarih, zaman, tur (IZIN/RAPOR), durum, kod}]` eklendi.

## Dilim 8 komutları (iptal, erken bitiş, ikame, revize, devir)
| Komut | Girdi | Çıktı | Yetki | Not |
|---|---|---|---|---|
| `talepIptal` | `id, neden` (≥3) | `{tamam}` | Yönetici; Sorumlu kendi talebi | yalnız KISMEN/TAMAMEN_ATANDI ve geçmiş günü AKTIF atama yoksa; atamalar kalkar, kişilere `GOREV_IPTAL` bildirimi |
| `talepErkenBitir` | `id, yeniSon, neden` | `{talepId, durum}` | Yönetici; Sorumlu kendi talebi | yeni son gün sonrası gün ve atamalar kalkar (`ERKEN_BITIS` bildirimi) |
| `atamaCikar` | `talepId, sicil, tarih?, zaman?, neden` | `{talepId, durum, cikarilan}` | Yönetici | tarih boşsa kişinin tüm aktif atamaları |
| `atamaIkame` | `talepId, eski, yeni, bastan?, karar?, neden?` | `{talepId, durum, degisen, cikarilan, uyari}` | Yönetici | çakışmada `REDDET` → `cakisma` (50030); `CIKAR`; izin/rapor `izin_rapor` |
| `sorumluDevret` | `talepId, yeniSicil, neden?` | `{tamam}` | Yönetici | kapanmış talepte yok; her iki sorumluya bildirim |
| `sorumluDevirListe` | `talepId` | `[{id, eski, yeni, neden, hesap, tarih}]` | Yönetici; Sorumlu kendi talebi | |
| `revizeIste` | `talepId, gorevMetni?, nitelik?, saatBaslangic?, saatBitis?, gunler?[{tarih, zaman, kisi}], neden?` | `{id, kod, durum}` | Yönetici (anında uygular); Sorumlu kendi talebi (BEKLIYOR) | bir talepte tek bekleyen revize; boş alan değişmez |
| `revizeOnayla` | `id` | `{id, durum}` | Yönetici | atanmış kişiden az kişi sayısı / atanmış gün kaldırma → `dogrulama`, revize bekler |
| `revizeReddet` | `id, neden` (≥3) | `{tamam}` | Yönetici | |
| `revizeGeriCek` | `id` | `{tamam}` | isteyen Sorumlu / Yönetici | |
| `revizeListe` | `talepId?, durum?` | `[{id, kod, talepId, talepKod, durum, isteyen, neden, gorevMetni, nitelik, saatBaslangic, saatBitis, gunler[], tarih, retNedeni}]` | Yönetici hepsi; Sorumlu kendi talepleri | |

## Dilim 9 komutları (analiz ve arşiv)
| Komut | Girdi | Çıktı | Yetki | Not |
|---|---|---|---|---|
| `analizAnaProjeler` | – | `[ad]` | Yönetici, Sorumlu | filtre listesi |
| `analizProje` | `bas, bit, ana?` | `[{ana, alt, faaliyet, adamGun, kisi, gun, talep, ilk, son}]` | Yönetici (tümü), Sorumlu (kendi talepleri) | en çok 3 yıl; TAM=1,0 ÖÖ/ÖS=0,5 |
| `analizPersonel` | `bas, bit, bolum?, q?` | `[{sicil, ad, bolum, adamGun, gun, proje, izinGun?, raporGun?, projeler[{ana, adam_gun}]}]` | aynı | `izinGun/raporGun` yalnız Yönetici (Sorumlu'da null); görevi ya da izni/raporu olanlar |
| `analizPersonelDetay` | `sicil, bas, bit` | `[{tarih, zaman, tur (GOREV/IZIN/RAPOR), ana, alt, faaliyet, konum, kod, sorumlu}]` | aynı | izin türü `faaliyet` alanında gelir; izin/rapor satırları yalnız Yönetici |
| `arsivGecmis` | `q?, ana?` | `[{id, personel, bolum, proje, gorevMetni, sorumlu, kaynak, aktarim}]` | Yönetici, Sorumlu | tarihsiz eski görevler, en çok 2000 satır |
| `analizExcel` | `tur` (`proje`/`personel`/`detay`/`arsiv`), `bas, bit`, filtreler, `sicil` (detay) | `{iptal, yol?, satir?}` | aynı | kayıt penceresi; sayı sütunları sayısal hücre |

## Dilim 11 – Senaryo tamamlama
| Komut | Girdi | Çıktı | Yetki | Not |
|---|---|---|---|---|
| `talepIletisim` | `talepId` | `{talepId, kod, sahaNotu, sorumluAd, sorumluGsm, atananlar?[{sicil, ad, bolum, gsm}]}` | Yönetici; kendi talebinin Sorumlusu; atanmış Saha | `atananlar` yalnız aktif atama varken ve Yönetici/Sorumlu için |
| `sayaclar` | – | `{bekleyenTalep?, izinOnay?, revizeBekleyen, ikameUyari, onaylanan?, reddedilen?, bildirim}` | kayıtlı herkes | sekme rozetleri ve KPI kartları; role göre boş alanlar; Yönetici için ayrıca `sahadaBugun`, `sahaToplam` (Dilim 14) |
| `ikameBekleyenler` | – | `[{talepId, kod, ad, sicil, ilk, son, gun, neden (RAPOR/AYRILDI/BIRIM)}]` | Yönetici (tümü), Sorumlu (kendi) | ileri tarihli aktif atama |

Değişen: `matrisHafta`/`matrisExcel` + `konum?` (yerleşke süzgeci, son isteğe bağlı bağımsız değişken); `atamaAdaylar` + `toplamGorev, adamGun, yerlesker, talepGun, izinRaporGun`; `analizPersonel` + `musaitGun?` (yalnız Yönetici), `tatilGun`, `tatilCalismaGun`; `rapor evrakı` dosya adı `Ad_Soyad_yyyymmdd_KOD.uzantı`; `talepKaydet/revizeIste` `nitelik` = Saha / Operasyon Notu (≤1000).

## Dilim 12 – Senaryo eksikleri
| Komut | Girdi | Çıktı | Yetki |
|---|---|---|---|
| `rolPersonel` | `rol` (SORUMLU/SAHA), `q?` | `[{sicil, ad, bolum}]` | SORUMLU: Yönetici; SAHA: Yönetici, Sorumlu |
| `logListe` | `bas?, bit?, islem?, q?, ust?` | `[{id, zaman, kullanici, adSoyad, islem, nesne, nesneId, ayrinti}]` | Yönetici |
| `logIslemTurleri` | – | `[{islem, adet}]` | Yönetici |
| `raporDuzelt` | `id, ilkTarih, sonTarih, neden?` | `{id, kod, izinIptal, cakisanAtama}` | Yönetici |
| `revizeFazlalik` | `id` | `[{atamaId, tarih, zaman, sicil, ad, atanmis, yeni, fazla}]` | Yönetici |
| `revizeMusaitlik` | `id` | `[{tarih, zaman, sicil, ad, durum (MUSAIT/GOREV/IZIN/RAPOR)}]` | Yönetici, talebin Sorumlusu |
| `analizKirilim` | `bas, bit, ana?` | `[{ana, alt, yerleske, sicil, ad, adamGun, gun}]`; Excel: `analizExcel tur=kirilim` | Yönetici, Sorumlu (kendi) |

Değişen: `revizeOnayla` + `cikar?: [atamaId]` (çıkarılacaklar önce çıkarılır); `matrisHafta/matrisExcel` + `sadeceMusait?`. Arayüz: menüde Kadro/Eşleştirme/İstisna/Eski veri/Sistem yerine **Ayarlar** (sekmeli).

Dilim 16: `matrisHafta`/`matrisExcel` yeni `sadeceSaha`; `matrisHafta` satırında `gsm`, hücrede `sorumluGsm` (yalnız Yönetici/Sorumlu için dolu). `atamaAdaylar` yalnız SAHA rolü. `atamaOnayla` ufuktan ilerisini reddeder.
