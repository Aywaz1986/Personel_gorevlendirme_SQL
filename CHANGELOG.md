# Değişiklik günlüğü

Her değişiklik önce **Yayınlanmamış** bölümüne yazılır; sürüm yükselince bölüm sürüm başlığına dönüştürülür.

## Yayınlanmamış
### Dilim 3b – Eski veri: kuru çalıştırma raporu (2026-11) — DEVAM EDİYOR (dal `dilim-3b-eski-veri-rapor`; Dilim 3 PR #4 birleşti)
**Oturum devir notu (her adımda güncelle; yeni oturum önce buradan devam eder):**
- Kapsam kararı (19.11.2026, Claude): hedef tabloları (talep, atama, izin, rapor) Dilim 4–7'de geliyor; bu yüzden 3b = YALNIZ salt okunur "Eski veriyi denetle" raporu (hiçbir şey yazmaz). Gerçek aktarım (kaynak='ESKI_ARAC') hedef tablolar varken, Murat raporu inceledikten sonra (Dilim 4+ içinde) yapılır. `docs/TASIMA.md` buna göre güncellenir.
- Eski şema (04_sqlite_dosya_katmani.js): personel(adSoyad,sicil,aktif…), projeler(ad,lokasyon,aktif,parentId), sorumlular, haftalar(haftaBaslangic), atamalar(haftaId,personelId,personelAdi,gunler JSON {pzt..paz:true},durum gorevli/izinli/raporlu/musait,projeId,projeAdi,gorevMetni,sorumlu).
- Tasarım: `Microsoft.Data.Sqlite` (salt okunur, `Mode=ReadOnly`); `EskiVeriOkuyucu` (SQLite→bellek modeli, eksik tablo/sütuna dayanıklı), `EskiVeriDenetimi` (saf rapor mantığı, birim testli), komut `eskiVeriDenetle` (STA OpenFileDialog; ad/sicil maskeleme seçeneği, varsayılan açık), ekran "Eski veri".
- [x] 1. Kod yazıldı (EskiVeri.cs, EskiVeriDenetimi.cs, EskiVeriCommands.cs, ui-src/app/004_eski_veri.js, menü "Eski veri"; derlenmedi, CI)
- [x] 2. Testler yazıldı (tests/Gorevlendirme.Tests/EskiVeriTests.cs, geçici SQLite dosyasıyla; BridgeTests komut listesi)
- [x] 3. Belgeler (TASIMA, ARAYUZ, MIMARI, PLAN, README, test-dilim-3b). Kılavuz bölümü: aktarım gerçekleşince eklenecek (ekran geçici denetim aracı).
- [x] CI: faturalama düzeldi; ilk koşuda iki derleme hatam çıktı (KadroKisi/HavuzKaydi SqlTests csproj dışında, EskiVeriTests using Xunit eksik) düzeltildi; 4/4 yeşil (20.11.2026).
- [x] 4. PR açıldı, sınama listesi sohbette. Sıradaki: Murat raporu çalıştırıp maskeli metni gönderir → gerçek aktarım dilimi.
### Dilim 3 – Proje havuzu ve akademik takvim (2026-11) (dal `dilim-3-havuz-takvim`; Dilim 2 PR #3 birleşti)
**Oturum devir notu (her adımda güncelle):**
- Kararlar (Murat, 17.11.2026): takvim yalnız tatil/kapalı gün (tarih + TAM/OO/OS + tür + ad); tatil gününe atama ENGELLENMEZ, yöneticiye UYARI çıkar (Dilim 5'te uygulanır); toplu yükleme: CSV dosyası + Excel'den yapıştır + .xlsx (C#'ta paketsiz ZipArchive okuyucu).
- Tasarım: `proje_havuzu` tek tablo, `ust_id` + `seviye` 1..4 (Ana Proje/Alt Proje/Faaliyet/Konum); ad kardeşler arasında tekil; pasife alma altını da pasife alır; birleştirme yumuşak: kaynak pasif + `birlestirildi_id`, çocuklar hedefe taşınır (aynı adlılar özyinelemeli birleşir). Listeleme yordamları her rolde, yazma yalnız yönetici.
- [x] 1. `004_havuz_takvim.sql` yazıldı (fn_kayitli_mi, proje_havuzu, takvim_tatil, sp_havuz_*, sp_takvim_*; sifirla takvim_tatil'i korur). SINANMADI.
- [x] 2. C#: `HavuzService`, `TakvimService`, `TakvimCozumleyici`, `XlsxOkuyucu` (paketsiz), `HavuzTakvimCommands`, `SqlHata` 2601/2627. Derlenmedi (CI).
- [x] 3. Arayüz: `ui-src/app/004_havuz.js`, `004_takvim.js`; menüye eklendi. JS sözdizimi OK.
- [x] 4. Testler yazıldı (`HavuzTakvimTests` SQL, `TakvimTests` C#). CI ilk koşu: SQL geçici tablo harmanlama çakışması (004 #s/#o → COLLATE DATABASE_DEFAULT) ve 1 C# test beklentisi düzeltildi; 2. koşu izleniyor.
- [x] 5. Belgeler (README, PLAN, ARAYUZ, MIMARI, YETKI, SQL, test-dilim-3) ve kılavuz (docx: havuz + takvim bölümleri, 7 ekran görüntüsü) güncellendi.
- **REVİZYON (18.11.2026, Murat `2024_Takvim.xlsx` paylaştı: "takvim çok basit kaldı, standart yapı bu"):** standart: yıllık takvim (12 ay, HFT=ISO hafta no, PT..PZ), renk/işaret: Resmi Tatil (mavi), İdari Tatil (turuncu), Yarım Gün (daire); altında tatil listesi `GG[-GG..] AY GünAdları / N Gün Ad (YILLIK İZİNDEN KESİLECEK)`; en altta "YILLIK İZİNDEN TOPLAM … GÜN KESİLECEK". Karar: tatil artık ARALIK kaydı (başlangıç–bitiş), tür RESMI/IDARI (AKADEMIK kalktı), yarım gün = OO/OS tek günlük kayıt, `yillik_izinden_kesilir` bayrağı + yıl özeti; yıllık izin modülü yok, toplam yalnız bilgi. Yeni `005_takvim_standart.sql` (004'ü değiştirmez; veriyi taşır). Yıl takvimi ekranı + standart .xlsx'i doğrudan okuyan içe aktarma (liste satırlarını ayrıştırır).
- [x] R1. 005 SQL (SINANMADI) · [x] R2. C# · [x] R3. Arayüz (yıl takvimi, özet, aralıklı form, standart .xlsx içe aktarma) · [x] R4. Testler (SQL + C#, 2024 örnekleriyle) · [x] R5. Belgeler + kılavuz · [x] R6. push + CI yeşil (4/4) + sınama listesi sohbette (açık soru: 28 Ekim 2024 oval mi, "1 Gün yıllık izinden" mi)
- [x] 6. PR açıldı, CI yeşil (SQL testleri geçti). Murat el sınaması (`docs/test-dilim-3.md`) ve birleştirme bekleniyor.
### Dilim 2 – Kimlik, roller, kadro eşitleme (2026-11) — DEVAM EDİYOR (dal `dilim-2-kimlik-kadro`)
**Oturum devir notu (her adımda güncelle; yeni oturum önce buradan devam eder):**
- [x] 1. SQL: `002_kimlik.sql` (personel kopyası, bölüm→rol eşleştirme, kişi istisnası, `sp_ben`, yönetim yordamları, son-yönetici tetikleyicisi 50020) yazıldı, dbo koruma denetimi geçti. SQL sunucuda SINANMADI.
- [x] 2. SQL: `003_kadro_esitleme.sql` (`sp_ozluk_esitle`: yalnız `INSERT #geçici ... SELECT/EXEC` ile dbo okur; %80 kapısı 50021; Özlük yöneticisi/tüm kapsam şartı 50022; silmez, pasife alır). SINANMADI.
- [x] 3. `tools/sql/gorev_ilk_yonetici.sql` (ilk yönetici betiği, 50025) ve `gorev_sifirla.sql` yama (yetki yapılandırma tabloları korunur).
- [x] 4. C#: `SqlHata`, `SqlService.ProcAsync`, `Gorunum`, `KimlikService`, `KadroService`, `KimlikCommands`. Derlenmedi (ortamda dotnet yok; CI'da bakılacak).
- [x] 5. Arayüz: `ui-src/app/002..006` (ortak, sistem, kadro/eşleştirme/istisna, kabuk, başlangıç + Yetkisiz sayfa). JS sözdizimi denetimi geçti.
- [x] 6. Testler yazıldı: `tests/Gorevlendirme.SqlTests/KimlikTests.cs`, `tests/Gorevlendirme.Tests/KimlikTests.cs`, `BridgeTests` ve mevcut SQL testleri `TestDb.Hedef`'e uyarlandı. Henüz çalıştırılmadı.
- [x] 7. Belgeler yazıldı: README durum tablosu, PLAN, ARAYUZ, MIMARI, YETKI, SQL.md, `docs/test-dilim-2.md` (DILIMLER değişmedi; içerik zaten Dilim 2'yi tanımlıyor).
- [x] 8. Kılavuz aracı: `tools/kilavuz/{README.md,ekran_goruntusu.py,kilavuz.js}` + `docs/Kullanma-Kilavuzu.docx` üretildi (5 ekran görüntüsü, sahte köprü).
- [x] 9. PR #3 açıldı. CI tamamen YEŞİL (derle, guvenlik, dbo-koruma, sql-test: SQL Server 2019 konteynerinde 34/34 test geçti; ilk koşudaki CS1656 test derleme hatası düzeltildi).
- [ ] 9b. Commit + push + PR (`gh api`, 403 nedeniyle `gh pr create` değil) + CI izleme (yalnız hata satırları).
- [ ] 10. Sohbette sınama listesi (SSMS adımlarıyla) ver.
- Güvenlik notu: dbo.* dokunulmaz; her SQL değişikliğinden sonra `python3 -I tools/dbo_koruma.py`. Özlük verisine zarar riski olan hiçbir adım atlanmaz; sınanmamış T-SQL "sınanmadı" diye işaretlenir.
### Dilim 1 – Şema çekirdeği ve kabuk (2026-11)
- `gorev_sahip` (girişsiz sahip), `gorev_kullanici` (rol), `gorev` şeması, `gorev.sema_surumleri` (Özlük'ünkinden bağımsız), `gorev.sistem_ayarlari` (`ORTAM`, `MIN_UYGULAMA_SURUMU`, `POLLING_SANIYE`), `gorev.islem_log` (değiştirilemez; kullanıcıyı sunucu yazar), `gorev.sp_surum_bilgi`.
- `Migrator` (kendi kilidi `gorev_sema`, şema sahibi doğrulaması), `Surum` sürüm kapısı, `SunucuDenetimi`, exe kabuğu (WebView2, bağlantı, durum ekranı, şema kurulumu).
- `tools/sql/gorev_sifirla.sql`, `gorev_kaldir.sql` (ORTAM=CANLI reddi, açık onay, yalnız `gorev`), `dbo_iz.sql` (dbo parmak izi).
- CI: `build` (derleme + SQL'siz testler + exe), `sql-test` (SQL Server konteyneri: kurulum, yetki, değiştirilemez günlük, sıfırla/kaldır, dbo dokunulmazlığı).
- Dilim 0: `main` üzerindeki ilk CI koşusundaki "Repository not found" hatası geçici çıktı; yeniden çalıştırmada geçti. `docs/PLAN.md` durumu düzeltildi.
### Dilim 0 – İskelet (2026-11)
- Depo iskeleti: `CLAUDE.md` (değişmez kararlar), `README.md`, `docs/` (PLAN, DILIMLER, MIMARI, SQL, YETKI, TASIMA).
- `tools/dbo_koruma.py` + `tools/test_dbo_koruma.py`: `gorev` betiklerinde `dbo.*` yazma/DDL/GRANT yasağının otomatik denetimi (SQL Server gerektirmez). İstisna listesi `tools/dbo_koruma_izinler.json`.
- GitHub Actions: `guvenlik` (gitleaks), `dbo-koruma`.
