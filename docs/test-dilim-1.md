# Dilim 1 sınama listesi (Murat)

Ön koşul: IT'den `SST_Ozluk` tam yedeği alındı (Özlük gerçek veri içeriyor). Özlük'ün kendi `Ozluk.exe`'si bu sınamalarda hiç değişmez.
SSMS: `SST_Ozluk` veritabanına **Yönetici (db_owner)** hesabınla bağlan; sol üstteki veritabanı kutusunda `SST_Ozluk` seçili olsun (betiklerde `USE` yok).
Betikler depoda `tools/sql/` altındadır (GitHub'dan dosyayı açıp içeriği SSMS'e yapıştır).

## A. CI (otomatik, indirmeden önce)
1. PR'daki dört kontrol yeşil: `denetim` (dbo-koruma), `gizli-bilgi`, `derle`, `sql`.
2. `derle` çıktısından `Gorevlendirme-0.1.N` indirilir (Artifacts).

## B. SSMS – kurulumdan ÖNCE
| # | Yap | Beklenen |
|---|---|---|
| B1 | `tools/sql/dbo_iz.sql` çalıştır | Tek satır sonuç. **Satırı not et** (5 sayı). |
| B2 | `SELECT SCHEMA_ID(N'gorev') AS sema, DATABASE_PRINCIPAL_ID(N'gorev_sahip') AS sahip, DATABASE_PRINCIPAL_ID(N'gorev_kullanici') AS rol;` | Üç sütun da `NULL` (henüz kurulu değil). |

## C. Uygulama – kurulum (exe)
| # | Kim | Yap | Beklenen |
|---|---|---|---|
| C1 | Murat | `Gorevlendirme.exe`'yi çalıştır | Pencere açılır, "SQL Server bağlantısı" formu görünür (kayıtlı bağlantı yoksa). |
| C2 | Murat | Sunucu `…,…` ve veritabanı `SST_Ozluk` yaz, **Bağlan** | "Bağlı: sunucu / SST_Ozluk (DOMAIN\kullanıcı)". Altta Durum kartı: Şema sürümü "kurulu değil", sarı uyarı "Şema kurulu değil…". |
| C3 | Murat | **Şemayı kur / yükselt** düğmesine bas | Yeşil "Uygulandı: 001_cekirdek". Durum: şema 1 (bu exe: 1), Ortam **TEST**, mesaj "Sürüm uyumlu." |
| C4 | Murat | **Şemayı kur / yükselt** düğmesi | Düğme artık görünmez. |
| C5 | Murat | **Sunucu denetimi** | Tablo; satırların hepsi `tamam` (rol üyeliği satırı `uyari` olabilir: aşağıda D4). `hata` olmamalı. |
| C6 | Murat | Pencereyi kapat, exe'yi yeniden aç | Bağlantı formu çıkmadan otomatik bağlanır (kayıtlı bağlantı). |
| C7 | Murat | **Bağlantıyı kapat** | Form geri gelir. |

## D. SSMS – kurulumdan SONRA
| # | Yap | Beklenen |
|---|---|---|
| D1 | `SELECT * FROM gorev.sema_surumleri;` | 1 satır: `1 \| cekirdek \| tarih \| hesabın \| 0.1.N` |
| D2 | `SELECT anahtar, deger FROM gorev.sistem_ayarlari ORDER BY id;` | `ORTAM=TEST`, `MIN_UYGULAMA_SURUMU=0.0.0`, `POLLING_SANIYE=30` |
| D3 | `SELECT s.name AS sema, p.name AS sahip FROM sys.schemas s JOIN sys.database_principals p ON p.principal_id=s.principal_id WHERE s.name=N'gorev';` | `gorev \| gorev_sahip` |
| D4 | `SELECT r.name AS rol, m.name AS uye FROM sys.database_role_members rm JOIN sys.database_principals r ON r.principal_id=rm.role_principal_id JOIN sys.database_principals m ON m.principal_id=rm.member_principal_id WHERE r.name=N'gorev_kullanici';` | `NT AUTHORITY\Authenticated Users` üyedir. Satır yoksa Özlük'te bu kullanıcı bulunmuyordur: bana bildir. |
| D5 | `SELECT TOP 5 * FROM gorev.islem_log;` | 1 satır: `SEMA \| sema_surumleri \| 1 \| 001_cekirdek uygulandı`; `kullanici` sütununda **senin** Windows hesabın. |
| D6 | `tools/sql/dbo_iz.sql` çalıştır | Sonuç B1 ile **birebir aynı** (dbo'ya dokunulmadı kanıtı). |
| D7 | Özlük'ü (`Ozluk.exe`) normal aç | Eskisi gibi çalışır, personel listesi gelir. |

## E. SSMS – yetki ve değiştirilemez günlük
Bu bölüm geçici bir test kullanıcısı açar ve en sonda siler.
| # | Yap | Beklenen |
|---|---|---|
| E1 | `CREATE USER gorev_deneme WITHOUT LOGIN; ALTER ROLE gorev_kullanici ADD MEMBER gorev_deneme;` | Başarılı. |
| E2 | `EXECUTE AS USER = N'gorev_deneme'; EXEC gorev.sp_surum_bilgi; REVERT;` | 1 satır: şema 1, ortam TEST, hesap = senin hesabın. |
| E3 | `EXECUTE AS USER = N'gorev_deneme'; SELECT * FROM gorev.islem_log; REVERT;` | **Hata 229** "SELECT permission was denied". |
| E4 | `EXECUTE AS USER = N'gorev_deneme'; INSERT INTO gorev.islem_log (islem) VALUES (N'X'); REVERT;` | **Hata 229**. |
| E5 | `EXECUTE AS USER = N'gorev_deneme'; UPDATE gorev.sistem_ayarlari SET deger=N'CANLI' WHERE anahtar=N'ORTAM'; REVERT;` | **Hata 229**. |
| E6 | `REVERT;` (E3–E5 hata verdiyse güvenli olması için bir kez daha) ardından `DROP USER gorev_deneme;` | Başarılı. |
| E7 | `INSERT INTO gorev.islem_log (islem, ayrinti) VALUES (N'DENEME', N'ssms');` | 1 satır eklenir. |
| E8 | `UPDATE gorev.islem_log SET islem=N'X';` | **Hata 50010** "gorev.islem_log değiştirilemez." |
| E9 | `DELETE FROM gorev.islem_log;` | **Hata 50010**. |
| E10 | `SELECT TOP 1 kullanici FROM gorev.islem_log WHERE islem=N'DENEME';` | Senin Windows hesabın (istemci göndermedi, sunucu yazdı). |

## F. SSMS – ORTAM bayrağı ve sürüm kapısı
| # | Yap | Beklenen |
|---|---|---|
| F1 | `UPDATE gorev.sistem_ayarlari SET deger=N'BELIRSIZ' WHERE anahtar=N'ORTAM';` | **Hata 547** (CHECK kısıtı). |
| F2 | `UPDATE gorev.sistem_ayarlari SET deger=N'CANLI' WHERE anahtar=N'ORTAM';` sonra exe'de **Yenile** | Ortam rozeti kırmızı **CANLI**. |
| F3 | `tools/sql/gorev_sifirla.sql` içinde `@onay` satırına `SIFIRLA` yaz, çalıştır | **Hata 50013** "ORTAM TEST değil…". `SELECT COUNT(*) FROM gorev.islem_log;` değişmez. |
| F4 | `tools/sql/gorev_kaldir.sql` içinde `@onay` = `KALDIR`, çalıştır | **Hata 50013**; şema yerinde (`SELECT SCHEMA_ID(N'gorev')` dolu). |
| F5 | `UPDATE gorev.sistem_ayarlari SET deger=N'TEST' WHERE anahtar=N'ORTAM';` | Geri alındı. |
| F6 | `UPDATE gorev.sistem_ayarlari SET deger=N'99.0.0' WHERE anahtar=N'MIN_UYGULAMA_SURUMU';` sonra exe'de **Yenile** | Kırmızı mesaj: "Bu uygulama sürümü (0.1.N) eski; en az 99.0.0 gerekir." |
| F7 | `UPDATE gorev.sistem_ayarlari SET deger=N'0.0.0' WHERE anahtar=N'MIN_UYGULAMA_SURUMU';` sonra **Yenile** | "Sürüm uyumlu." |

## G. SSMS – sıfırla ve kaldır
| # | Yap | Beklenen |
|---|---|---|
| G1 | `gorev_sifirla.sql`'i **`@onay` boş** çalıştır | **Hata 50012** "Onay verilmedi". Veri yerinde. |
| G2 | `@onay` = `SIFIRLA` yaz, çalıştır | Sonuç tablosunda `islem_log` için silinen satır sayısı (E7 + SEMA + DENEME satırları). |
| G3 | `SELECT islem FROM gorev.islem_log;` | Tek satır: `SIFIRLA`. |
| G4 | `SELECT anahtar, deger FROM gorev.sistem_ayarlari; SELECT COUNT(*) FROM gorev.sema_surumleri;` | Ayarlar aynen duruyor, sürüm kaydı 1. |
| G5 | `DELETE FROM gorev.islem_log;` | Yine **Hata 50010** (tetikleyici yeniden etkin). |
| G6 | `tools/sql/dbo_iz.sql` | B1 ile **aynı**. |
| G7 | `gorev_kaldir.sql`, `@onay` = `KALDIR`, çalıştır | Sonuç: kaldırılan nesne listesi (yordam, tablolar, üyelik, rol, şema, kullanıcı). |
| G8 | B2 sorgusunu tekrar çalıştır | Yine üç sütun `NULL`. |
| G9 | `tools/sql/dbo_iz.sql` | B1 ile **aynı**; Özlük (`Ozluk.exe`) normal çalışır. |
| G10 | Exe → Bağlan → **Şemayı kur** | Yeniden kurulur (C3 gibi); temiz kurulum tekrarlanabilir. |

## Hata bildirirken
Hangi madde (ör. E3), ekrandaki/SSMS'teki tam hata metni ve numarası, ve `dbo_iz.sql` sonucu yeterli.
