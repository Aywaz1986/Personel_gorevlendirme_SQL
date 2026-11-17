# Değişiklik günlüğü

Her değişiklik önce **Yayınlanmamış** bölümüne yazılır; sürüm yükselince bölüm sürüm başlığına dönüştürülür.

## Yayınlanmamış
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
- [ ] 9. Commit + push + PR (`gh api`, 403 nedeniyle `gh pr create` değil) + CI izleme (yalnız hata satırları).
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
