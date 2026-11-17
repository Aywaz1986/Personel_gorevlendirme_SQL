# Kullanma kılavuzu üretimi
Çıktı: `docs/Kullanma-Kilavuzu.docx` (her dilimde güncel tutulur; bkz. CLAUDE.md).
1. `cd ui-src && python3 build.py /tmp/gorev_idx.html`
2. `python3 tools/kilavuz/ekran_goruntusu.py` → `tools/kilavuz/shots/*.png` (sahte köprü + uydurma veri; `.gitignore`'da). Playwright gerekir.
3. `cd tools/kilavuz && NODE_PATH=$(npm root -g) node kilavuz.js` (npm `docx` gerekir) → `docs/Kullanma-Kilavuzu.docx`
Metin `kilavuz.js` içindedir; ekran/komut/yetki değişince ilgili bölümü ve görüntüyü güncelle.
