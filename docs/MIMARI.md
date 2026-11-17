# Mimari

## 1. Katmanlar
```mermaid
flowchart TB
  subgraph EXE[Gorevlendirme.App.exe]
    UI[WebView2: gömülü arayüz]
    BR[Bridge: adlandırılmış komutlar]
    SV[Services]
    DT[Data: SqlService, ConnInfo, Migrator]
    SEC[Security: Surum, Yetki]
  end
  subgraph SQL[SST_Ozluk @ TOKA03]
    G[gorev.* tablolar, yordamlar]
    D[(dbo.* Özlük: yalnız okuma)]
  end
  UI --> BR --> SV --> DT --> G
  SV --> SEC
  G -. sp_ozluk_esitle: yalnız SELECT / EXEC sp_ben .-> D
```
Arayüz ham SQL göndermez. Uygulama `gorev` yordamlarını çağırır; yazma yalnız yordamla (`gorev_sahip` bağlamı).

## 2. Kimlik ve rol çözümü
```mermaid
sequenceDiagram
  participant U as Kullanıcı (Windows)
  participant A as exe
  participant S as gorev.sp_ben
  U->>A: açar
  A->>S: bağlan (ORIGINAL_LOGIN)
  S->>S: gorev.personel (aktif) kullanıcı adı eşleşmesi
  S->>S: rol_bolum_eslestirme (bölüm → rol) + kullanici_yetki_istisna (üzerine yazar)
  alt kayıtsız / pasif / yetkisiz
    S-->>A: hiçbir veri yok, "Yetkisiz Erişim" ekranı
  else
    S-->>A: roller (çoklu rolde görünüm geçişi), ad, telefon
  end
```
Giriş denetimi yalnızca `gorev` tablolarına bakar (dbo okuması yok). En az 1 aktif yönetici zorunlu (tetikleyici).

## 3. Kadro eşitleme (`sp_ozluk_esitle`)
1. Çağıran: gorev yöneticisi **ve** Özlük'te aktif `yonetici` ya da tüm kurum kapsamlı (`kapsam_org_id` boş). Aksi halde hata.
2. `dbo.personeller` → `#ozluk` (beş alan + ayrılış durumu); `dbo.sp_ben` → `#ben` (rol doğrulaması). Özlük satır düzeyi güvenliği çağıranın kapsamıyla süzer.
3. Güvenlik kapısı: okunan satır < aktif `gorev.personel` sayısının %80'i ise iptal.
4. `MERGE gorev.personel` (sicil_no anahtar): ekle, güncelle, ayrılanı pasife al; asla silme. Başarıda `son_esitleme` ayarı güncellenir.
5. Tetik: Özlük yöneticisi girişinde otomatik + "Kadroyu Özlük'ten eşitle" düğmesi. Diğerlerinde düğme kapalı, "son eşitleme" görünür.

## 4. Ortam ve sıfırlama
`gorev.sistem_ayarlari.ORTAM` (`TEST`/`CANLI`) sıfırlama betiklerini korur; ayrıntı `docs/SQL.md` §5.

## 5. Eşzamanlılık
Onay/atama yordamları `SERIALIZABLE` + `UPDLOCK`: aynı personel, aynı gün ve dilimde çakışma sunucuda yakalanır (rapor 50002, izin 50003, atama 50004). Ekranlar 30 sn'de bir yenilenir (`rowversion` ile değişiklik yoklaması; yalnız değişen veri çekilir).

## Dilim 1 ekleri
- **Kurulum sırası:** `Migrator.UygulaAsync` → (1) sahip kontrolü: `gorev` şeması başka sahiple varsa dur; (2) `CREATE USER gorev_sahip WITHOUT LOGIN`, `CREATE SCHEMA gorev AUTHORIZATION gorev_sahip`, `gorev.sema_surumleri`; (3) bekleyen betikler, her biri ayrı işlemde ve `sp_getapplock 'gorev_sema'` altında.
- **Sürüm kapısı:** `gorev.sp_surum_bilgi` (herkes çağırır) → `Surum.Denetle(uygulama, MIN_UYGULAMA_SURUMU, şema, hedef)` → engel `AppState.Engel`'e yazılır, `kapiGerekli` komutlar reddedilir.
- **Okuma/yazma:** `gorev_kullanici` yalnızca `EXECUTE ON SCHEMA::gorev` alır; tablolara doğrudan yetkisi yoktur. Yordamlar `WITH EXECUTE AS OWNER` (= `gorev_sahip`) çalışır; `ORIGINAL_LOGIN()` gerçek bağlanan hesabı verir.

## Dilim 2: kimlik ve arayüz katmanı
- C#: `KimlikService` (`gorev.sp_ben`), `KadroService` (kadro/eşleştirme/istisna yordamları), `Gorunum` (rol→görünüm listesi ve varsayılan), `SqlHata` (sunucu hata no → arayüz kodu), `SqlService.ProcAsync` (yalnız adlandırılmış yordam), `KimlikCommands` (köprü; hepsi sürüm kapısına tabi).
- Arayüz (`ui-src/app/`): 001 köprü, 002 ortak (h(), durum, toast), 003 sistem, 004 kadro/eşleştirme/istisna, 005 kabuk (başlık, ORTAM rozeti, görünüm menüsü, menü), 006 başlangıç (sürüm durumu → `ben` → Yetkisiz ya da kabuk). Yetki kararı sunucudadır; arayüzdeki menü yalnızca görünümdür.
