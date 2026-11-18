# Değişiklik günlüğü

Her değişiklik önce **Yayınlanmamış** bölümüne yazılır; sürüm yükselince bölüm sürüm başlığına dönüştürülür.

## Yayınlanmamış
### Dilim 3 – Proje havuzu ve akademik takvim (2026-11) — DEVAM EDİYOR (dal `dilim-3-havuz-takvim`; Dilim 2 PR #3 birleşti)
**Oturum devir notu (her adımda güncelle):**
- Kararlar (Murat, 17.11.2026): takvim yalnız tatil/kapalı gün (tarih + TAM/OO/OS + tür + ad); tatil gününe atama ENGELLENMEZ, yöneticiye UYARI çıkar (Dilim 5'te uygulanır); toplu yükleme: CSV dosyası + Excel'den yapıştır + .xlsx (C#'ta paketsiz ZipArchive okuyucu).
- Tasarım: `proje_havuzu` tek tablo, `ust_id` + `seviye` 1..4 (Ana Proje/Alt Proje/Faaliyet/Konum); ad kardeşler arasında tekil; pasife alma altını da pasife alır; birleştirme yumuşak: kaynak pasif + `birlestirildi_id`, çocuklar hedefe taşınır (aynı adlılar özyinelemeli birleşir). Listeleme yordamları her rolde, yazma yalnız yönetici.
- [x] 1. `004_havuz_takvim.sql` yazıldı (fn_kayitli_mi, proje_havuzu, takvim_tatil, sp_havuz_*, sp_takvim_*; sifirla takvim_tatil'i korur). SINANMADI.
- [x] 2. C#: `HavuzService`, `TakvimService`, `TakvimCozumleyici`, `XlsxOkuyucu` (paketsiz), `HavuzTakvimCommands`, `SqlHata` 2601/2627. Derlenmedi (CI).
- [x] 3. Arayüz: `ui-src/app/004_havuz.js`, `004_takvim.js`; menüye eklendi. JS sözdizimi OK.
- [x] 4. Testler yazıldı (`HavuzTakvimTests` SQL, `TakvimTests` C#). CI ilk koşu: SQL geçici tablo harmanlama çakışması (004 #s/#o → COLLATE DATABASE_DEFAULT) ve 1 C# test beklentisi düzeltildi; 2. koşu izleniyor.
- [ ] 5. Belgeler (PLAN, README, DILIMLER, ARAYUZ, MIMARI, YETKI, SQL, test-dilim-3), kılavuz
- [ ] 6. Commit, push, PR (gh api), CI, sınama listesi
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
