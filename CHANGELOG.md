# Değişiklik günlüğü

Her değişiklik önce **Yayınlanmamış** bölümüne yazılır; sürüm yükselince bölüm sürüm başlığına dönüştürülür.

## Yayınlanmamış
### Dilim 0 – İskelet (2026-11)
- Depo iskeleti: `CLAUDE.md` (değişmez kararlar), `README.md`, `docs/` (PLAN, DILIMLER, MIMARI, SQL, YETKI, TASIMA).
- `tools/dbo_koruma.py` + `tools/test_dbo_koruma.py`: `gorev` betiklerinde `dbo.*` yazma/DDL/GRANT yasağının otomatik denetimi (SQL Server gerektirmez). İstisna listesi `tools/dbo_koruma_izinler.json`.
- GitHub Actions: `guvenlik` (gitleaks), `dbo-koruma`.
