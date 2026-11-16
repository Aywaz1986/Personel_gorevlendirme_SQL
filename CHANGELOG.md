# Değişiklik günlüğü

Her değişiklik önce **Yayınlanmamış** bölümüne yazılır; sürüm yükselince bölüm sürüm başlığına dönüştürülür.

## Yayınlanmamış
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
