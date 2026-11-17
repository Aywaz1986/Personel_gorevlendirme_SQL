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
