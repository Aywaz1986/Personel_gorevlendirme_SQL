# Köprü komutları (arayüz ↔ C#)

Arayüz ham SQL göndermez; `window.chrome.webview.postMessage({id, cmd, args})` ile adlandırılmış komut çağırır. Yanıt: `{id, ok:true, ms, data}` veya `{id, ok:false, code, error}`. Hata kodları: `komut`, `baglanti`, `yetki`, `cakisma`, `surum`, `dogrulama`, `hata`.
"Kapı" sütunu: sürüm kapısı engelliyse (eski exe / yeni şema) komutun çalışıp çalışmadığı. Dilim 1'deki komutların hiçbiri kapı gerektirmez (kurulum ve durum ekranı engelde de açık kalmalıdır); iş komutları (Dilim 4+) `kapiGerekli: true` ile kaydedilir.

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
