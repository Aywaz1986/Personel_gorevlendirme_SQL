# Köprü komutları (arayüz ↔ C#)

Arayüz ham SQL göndermez; `window.chrome.webview.postMessage({id, cmd, args})` ile adlandırılmış komut çağırır. Yanıt: `{id, ok:true, ms, data}` veya `{id, ok:false, code, error}`. Hata kodları: `komut`, `baglanti`, `yetki`, `cakisma`, `surum`, `dogrulama`, `hata`.
"Kapı" sütunu: sürüm kapısı engelliyse (eski exe / yeni şema) komutun çalışıp çalışmadığı. Dilim 1'deki sistem komutları kapı gerektirmez (kurulum ve durum ekranı engelde de açık kalmalıdır); kimlik/kadro/iş komutları `kapiGerekli: true` ile kaydedilir.

| Komut | Args | Dönüş | Kapı | Not |
|---|---|---|---|---|
| `ping` | – | `{pong, time}` | – | |
| `runtime` | – | uygulama/WebView2 sürümü, Windows kullanıcısı | – | |
| `baglantiDene` | – | `{kayit:false}` ya da bağlantı sonucu | – | `Gorevlendirme.baglanti.json` → `Ozluk.baglanti.json` → kullanıcıya özel (DPAPI) sırasıyla |
| `baglan` | `server, database, encrypt, trust, kaydet` | `{kayit, bagli, info, sunucu, veritabani}` | – | yalnız Windows kimliği |
| `baglantiKapat` / `baglantiUnut` | – | `{tamam}` | – | Unut: kayıtlı bağlantıyı siler |
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
| `eskiVeriDenetle` | `maskele?` (varsayılan true) | `{iptal:true}` ya da `{iptal:false, dosya, sayilar, metin}` | ✔ | Dilim 3b. Yalnız Merkez Yönetici (kadro listesi sunucuda reddeder). STA dosya seçim penceresi açar, `.db`yi SALT OKUNUR okur, hiçbir şey yazmaz. `metin` düz rapor, `sayilar` ekran özeti |

Girdi sütunları (başlık yoksa sıra): Tarih; Ad; Zaman dilimi; Tür (son ikisi isteğe bağlı: Tüm gün, Resmi tatil). Başlık varsa sütunlar adından bulunur. Tarih biçimleri: gg.aa.yyyy, yyyy-aa-gg, gg/aa/yyyy.
