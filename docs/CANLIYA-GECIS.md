# Canlıya geçiş planı (Dilim 10)

Ön koşul: Dilim 0–10 birleşmiş, Pazartesi toplu el sınaması (`docs/test-dilim-*.md`) hatasız, Özlük canlıya hazır (Özlük `docs/TASIMA.md`).

## 1. Hazırlık
1. IT'den `SST_Ozluk` **tam yedeği** alınır (Özlük gerçek veri içerir). Yedek alınmadan ilerlenmez.
2. `tools/sql/dbo_iz.sql` çalıştırılıp sonuç saklanır (dbo parmak izi; adım 5'te karşılaştırılır).
3. Son exe sürümü derlenir (Actions → Artifacts); tüm kullanıcılara dağıtılacak klasör hazırlanır.

## 2. Temizlik
1. Pilot verisi atılabilir: `tools/sql/gorev_sifirla.sql` (`SIFIRLA`). Yapılandırma (rol eşleştirme, istisnalar, takvim) korunur.
2. Uygulamada **Kadro → Özlük'ten eşitle** (kadro yeniden dolar).
3. Gerekirse **Proje havuzu** düzenlenir.

## 3. Son aktarım
1. **Eski veri → Aktarım kartı**: önce **Dosya seç ve denetle** (kuru çalıştırma) raporunu okuyun; "dikkat" maddelerini giderin.
2. `AKTAR` yazıp **Dosya seç ve aktar**; özet satırındaki sayıları rapordaki sayılarla karşılaştırın.
3. Yanlışsa **Aktarımı geri al** (`GERIAL`), düzeltip yeniden aktarın. Canlıya geçtikten sonra bu mümkün değildir.

## 4. Geçiş
1. **Sistem → Canlıya geçiş**: zorunlu 4 madde "Tamam" olmalı; uyarı maddelerini (takvim, asgari sürüm, pilot talepleri) gözden geçirin.
2. Asgari sürüm kutusuna dağıttığınız sürümü yazın (eski exe bağlanamasın), `CANLI` yazıp **Canlıya geç**.
3. Sistem sayfasında Ortam = CANLI görünür. Sıfırlama/kaldırma betikleri artık reddeder.
4. Kullanıcılara exe dağıtılır; birkaç kişiyle (Aşama 2) başlayıp toplu yayına (Aşama 3) geçilir.

## 5. Geri dönüş
- Kod sorunu: önceki exe sürümüne dönülür; veri şeması ileri uyumludur (betikler yalnız ekler). Asgari sürümü düşürmek için `UPDATE gorev.sistem_ayarlari SET deger=... WHERE anahtar=N'MIN_UYGULAMA_SURUMU'` (db_owner).
- Veri sorunu (acil): önce yedek alın; `tools/sql/gorev_geri_donus.sql` (`TESTE-DON`) ORTAM'ı TEST'e çevirir; sonra gerekirse `gorev_sifirla.sql` + yeniden aktarım. Özlük verisi (dbo) etkilenmez.
- Son çare: 1. adımdaki yedek (IT) — yalnız Özlük'ü de etkiler; önce IT ile görüşün.
- Sonunda `dbo_iz.sql` yeniden çalıştırılıp 1. adımdaki sonuçla aynı olduğu doğrulanır.
