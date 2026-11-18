# SQL standartları (gorev şeması)

Genel şablon: Özlük deposu `docs/SQL-ORTAK-YAPI.md`. Bu belge o şablondan **farklı veya ek** olan noktaları ve `gorev` şemasının kurallarını yazar. T-SQL sunucuda sınanmadan "sınanmadı" diye işaretlenir.

## 1. Şablondan bilinçli sapma
- Şablon: proje başına ayrı veritabanı. **Bu projede:** `SST_Ozluk` içinde yalnızca `gorev` şeması (karar 15.11.2026). Gerekçe: kadro Özlük'te yaşıyor, tek doğru kaynak korunur, veritabanları arası izin/sertifika gerekmez.
- Bunun bedeli ve önlemleri: §5 (ortak veritabanında geliştirme), §2 (dbo yasağı), §4 (kendi sürüm kapısı).
- Şablonun geri kalanı geçerlidir: Windows kimliği, `ORIGINAL_LOGIN()`, yazma yalnız yordamla, her betik tek işlemde, uygulanmış betik değişmez, `COLLATE DATABASE_DEFAULT`, sürüm denetimi, CI'da SQL Server testi.

## 2. dbo koruma (kesin kural)
- `dbo.*`'a yazma, DDL, GRANT/DENY/REVOKE yok. Yeni yetki gerekmez: `ozluk_kullanici` rolü `dbo.personeller` üzerinde zaten SELECT sahibidir, `dbo.sp_ben` çağrılabilir.
- İzinli dbo okuması yalnız `src/Gorevlendirme.App/Sql/*_kadro_esitleme.sql` içinde ve yalnız şu biçimde:
  ```sql
  INSERT INTO #ozluk (sicil_no, adi_soyadi, bolum, gsm_no, kullanici_adi, ayrilis_tarihi)
  SELECT sicil_no, adi_soyadi, bolum, gsm_no, kullanici_adi, ayrilis_tarihi FROM dbo.personeller;
  INSERT INTO #ben (hesap, rol, kapsam_org_id, aktif) EXEC dbo.sp_ben;
  ```
  `#ozluk` sütunları `COLLATE DATABASE_DEFAULT` ile tanımlanır; sonraki `MERGE` yalnız `gorev.personel` ile `#ozluk` arasındadır.
- Her gorev nesnesi şema belirtir (`gorev.ad`); şemasız ad dbo'ya çözülebilir. Dinamik SQL, `USE`, veritabanları arası ad, sunucu düzeyi işlemler yasak (istisna: `gorev_kaldir.sql`, `gorev_sifirla.sql`, yalnız `SCHEMA_ID(N'gorev')` ile sınırlı).
- Denetim: `tools/dbo_koruma.py` (CI `dbo-koruma`), testi `tools/test_dbo_koruma.py`. Her deyim `;` ile biter (denetim bunu varsayar).

## 3. Sahiplik, roller, yazma
- `gorev_sahip`: girişsiz veritabanı kullanıcısı (`CREATE USER ... WITHOUT LOGIN`), `gorev` şemasının sahibi (`AUTHORIZATION`). `dbo`'da hiçbir yetkisi yoktur.
- `gorev_kullanici`: rol; `NT AUTHORITY\Authenticated Users` üyedir (Özlük'te zaten var olan kullanıcı; yalnızca rol üyeliği eklenir). Tablolara doğrudan yetki yok; yalnızca `EXECUTE ON SCHEMA::gorev` verilir (okuma da yordamlarla yapılır).
- Yazma yordamları `WITH EXECUTE AS OWNER` (= `gorev_sahip`). Tek istisna `sp_ozluk_esitle`: çağıran bağlamında çalışır, çünkü dbo okuması çağıranın Özlük kapsamıyla yapılmalıdır (satır düzeyi güvenlik `ORIGINAL_LOGIN()` kullanır). Yazmaları sahiplik zinciriyle `gorev` tablolarına gider; çağıranın `gorev` tablolarında doğrudan yetkisi yoktur.
- Günlükte işlemi yapanı sunucu yazar (`ORIGINAL_LOGIN()`); yordam parametresi olarak kullanıcı adı alınmaz.

## 4. Betik ve sürüm düzeni
- Betiklerden önce `Migrator` açılışta (tekrar çalıştırılabilir) `gorev_sahip` kullanıcısını, `gorev` şemasını (sahip `gorev_sahip`) ve `gorev.sema_surumleri`'ni kurar; `gorev` şeması başka bir sahiple varsa kurulum durur. `001_cekirdek.sql`: rol, `sistem_ayarlari`, `islem_log` (+ değiştirilemez tetikleyici), `sp_surum_bilgi`.
- Dosya `src/Gorevlendirme.App/Sql/NNN_ad.sql`, exe'ye gömülür; `GO` ile bloklanır, her betik tek işlemde, `gorev.sema_surumleri`'ne işlenir (Özlük'ün `dbo.sema_surumleri`'nden bağımsız).
- Kendi `Migrator`'ı ve kendi kilidi (`sp_getapplock`, kaynak `gorev_sema`). Uygulanmış betik değişmez; düzeltme yeni numara + `CREATE OR ALTER`.
- Sürüm kapısı `gorev.sistem_ayarlari` anahtarı `MIN_UYGULAMA_SURUMU` (Özlük'ünkinden ayrı). Uygulama < asgari ya da şema > uygulama ise bağlantı engellenir.

## 5. Ortak veritabanında geliştirme: test sıfırlama önlemleri
Geliştirme ayrı test veritabanı olmadan `SST_Ozluk` üzerinde sürer (karar 16.11.2026). Önlemler:
1. **dbo koruma denetimi** (§2): yanlışlıkla Özlük nesnesine dokunan betik CI'da düşer.
2. **ORTAM bayrağı:** `gorev.sistem_ayarlari` anahtarı `ORTAM` = `TEST` | `CANLI`. İlk kurulum `TEST`. Dilim 1'de değeri yalnızca `db_owner` elle değiştirir (`UPDATE gorev.sistem_ayarlari ...`); `gorev.sp_ortam_canli` (yalnız gorev yöneticisi, tek yönlü) Dilim 10'da (canlıya geçiş) eklenir; geri dönüş yalnızca `db_owner`'ın elle SQL'iyle.
3. **`tools/sql/gorev_sifirla.sql`** (verileri temizle, şemayı bırak) ve **`tools/sql/gorev_kaldir.sql`** (tüm gorev nesnelerini ve rolleri kaldır): ikisi de dinamik olarak yalnızca `SCHEMA_ID(N'gorev')` altındaki nesneleri bulur; ORTAM `CANLI` ise çalışmayı reddeder; onay için dosya başındaki `@onay` değişkenine açıkça `SIFIRLA`/`KALDIR` yazılması gerekir. Hata kodları: 50011 yapılacak şey yok, 50012 onay yok, 50013 ORTAM TEST değil, 50014 başka şemadan gorev'e yabancı anahtar var. `gorev_sifirla` `sema_surumleri` ve `sistem_ayarlari`'na dokunmaz, IDENTITY sayaçlarını sıfırlamaz (denetim `DBCC`'yi yasaklar). Audit tetikleyicisi `DROP`'u engellemez.
4. **Yedek:** ilk kurulumdan ve canlıya geçişten önce IT'den `SST_Ozluk` tam yedeği (Özlük gerçek veri içeriyor).
5. **dbo parmak izi:** `tools/sql/dbo_iz.sql` (yalnız sistem katalogları) kurulum/sıfırla/kaldır öncesi ve sonrası çalıştırılır; sonuç aynı olmalı. CI'da eşdeğeri `DboKorumaTests`.
6. **Tohum veri:** test için uydurma veri `tools/sql/gorev_test_tohum.sql` (Dilim 1'den sonra); gerçek veri depoya girmez.

## 6. Ad haritası (02 numaralı doküman → bu proje)
| 02 | Bu proje (`gorev.`) | Not |
|---|---|---|
| Sistem_Ayarlari | `sistem_ayarlari` | + `ORTAM`, `MIN_UYGULAMA_SURUMU`, `POLLING_SANIYE` |
| Rol_Bolum_Eslestirme | `rol_bolum_eslestirme` | Özlük bölüm adı → rol |
| Kullanici_Yetki_Istisna | `kullanici_yetki_istisna` | anahtar: `hesap` (+ isteğe bağlı `sicil_no`) |
| Proje_Gorev_Havuzu | `proje_havuzu` | Ana → Alt → Faaliyet → Konum |
| Akademik_Takvim_Tatiller | `takvim_tatil` | aralık (baslangic–bitis), TAM/OO/OS, RESMI/IDARI, yıllık izinden kesilir |
| Gorev_Talepleri | `talepler` | |
| Gorev_Talep_Gunleri | `talep_gunleri` | |
| Gorev_Atamalari | `atamalar` | çakışma kilidi `sp_atama_onayla` |
| Gorev_Revize_Talepleri | `revize_talepleri` | |
| Gorev_Sorumlu_Devir | `sorumlu_devir` | |
| Personel_Izin_Talepleri / _Gunleri | `izin_talepleri` / `izin_gunleri` | |
| Personel_Saglik_Raporlari | `raporlar` | evrak `varbinary(max)`, ≤ 10 MB; eski kayıtlar için `eski_kayit` |
| Islem_Gunlugu_AuditLog | `islem_log` | değiştirilemez; kullanıcı `DEFAULT ORIGINAL_LOGIN()` |
| (yeni) | `sema_surumleri`, `personel`, `kullanici_ayar` | `personel` Özlük kadro kopyası |
Anahtarlar: her tabloda `INT/BIGINT IDENTITY id`, iş anahtarı ayrı `UNIQUE`, `rowversion`; önekler `PK_ FK_ UQ_ CK_ DF_ IX_`; yordam `sp_`, işlev `fn_`.

## 7. Yazım kuralları (denetimle uyumlu)
- Her deyim `;` ile biter. `UPDATE/DELETE` ya `gorev.tablo` hedefler ya da takma ad + `FROM gorev...` kullanır.
- `FROM/JOIN/USING` kaynakları `gorev.`, `#`, `@`, `sys.` veya CTE. `SELECT ... INTO` yalnız `#`/`@` hedefine.
- `#temp` sütunlarına `COLLATE DATABASE_DEFAULT`.
- Çakışma kontrolleri `SERIALIZABLE` + `UPDLOCK`; çakışmada hata kodları: 50002 rapor, 50003 izin, 50004 atama (uygulama bunu "çakışan görevden çıkar ve ata" seçeneğine çevirir).

## Dilim 2 notları
- Tablolar: `personel` (Özlük kopyası, beş alan + aktif), `rol_bolum_eslestirme`, `kullanici_yetki_istisna`. `gorev_sifirla.sql` kadro kopyasını ve günlüğü temizler; `sema_surumleri`, `sistem_ayarlari`, `rol_bolum_eslestirme`, `kullanici_yetki_istisna` KORUNUR (yetki yapılandırması kaybolmasın). IDENTITY sayaçları sıfırlanmaz (DBCC yasak).
- `sp_ozluk_esitle`: `EXECUTE AS` yok; dbo okuması yalnız `INSERT #geçici ... SELECT/EXEC` ile `003_kadro_esitleme.sql` içinde. Hata kodları: 50020 son yönetici, 50021 eksik okuma (<%80 ya da sıfır satır), 50022 Özlük yetkisi yok, 50023 gorev yöneticisi değil, 50024 doğrulama, 50025 ilk yönetici zaten var.
- `dbo.sp_ben` çıktı şekli (9 sütun) bağımlılığı kırılgandır: `hesap, ad, rol, kapsam_org_id, aktif, kayitli, yetkiler, kapali, kapali_mesaj`.
- `tools/sql/gorev_ilk_yonetici.sql`: ilk yönetici betiği.

## Dilim 3 notları
- `proje_havuzu`, `takvim_tatil`, `fn_kayitli_mi`, `sp_havuz_*`, `sp_takvim_*` (`004_havuz_takvim.sql`; takvim `005_takvim_standart.sql` ile yeniden kuruldu). `gorev_sifirla.sql` havuzu temizler, `takvim_tatil`'i (kurum yapılandırması) KORUR.
- Geçici tablo sütunları `COLLATE DATABASE_DEFAULT`; Türkçe harmanlamada i/I eşit değildir, kod karşılaştırmalarında `COLLATE Latin1_General_CI_AS` kullanılır (`RESMI`, `OO` …).
- Takvim kodları ASCII: TAM/OO/OS; arayüz ÖÖ/ÖS gösterir.
