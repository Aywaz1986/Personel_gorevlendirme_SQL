# Dilim planı – ayrıntı

Her dilimin ortak kuralı: dal `dilim-N-ad` → Actions derler ve testler çalışır → exe indirilip denenir → birleştirme. Sınama listesi dilim teslim mesajında sohbette verilir. Karmaşık ekranlarda önce tasarım önizlemesi.

## Dilim 0 – İskelet (SQL gerekmez)
Depo yapısı, belgeler, `CLAUDE.md`, gitleaks, dbo koruma denetimi + testi.
Bitiş: `python3 tools/test_dbo_koruma.py` geçer; CI `dbo-koruma` ve `guvenlik` yeşil.

## Dilim 1 – Şema çekirdeği ve kabuk (SQL gerekir)
`gorev_sahip`, `gorev_kullanici`, `gorev` şeması; `sema_surumleri`, `sistem_ayarlari` (`ORTAM`, `MIN_UYGULAMA_SURUMU`), `islem_log` (değiştirilemez); `tools/sql/gorev_sifirla.sql`, `gorev_kaldir.sql`; `sp_surum_bilgi`; `Migrator` (kendi kilidi), `Surum`, `SunucuDenetimi`; exe kabuğu (WebView2, bağlantı, sürüm kapısı, şema kurulumu); `sql-test.yml` (CI'da SQL Server); `tools/sql/dbo_iz.sql`. `sp_ortam_canli` yönetici kavramıyla Dilim 2'ye kaldı.
Bitiş: temiz kurulum/yükseltme tekrarlanabilir; `gorev_kaldir` yalnız gorev nesnelerini kaldırır, `dbo`'ya dokunmadığı CI testiyle kanıtlı; ORTAM=CANLI iken sıfırlama reddedilir.

## Dilim 2 – Kimlik, kadro, ilk arayüz
`personel`, `rol_bolum_eslestirme`, `kullanici_yetki_istisna`, `sp_ben`, son yönetici koruması; `*_kadro_esitleme.sql` (`sp_ozluk_esitle`); rol bazlı açılış ekranı + görünüm geçişi; tasarım önizlemesi; `tools/kilavuz` kurulumu.
Bitiş: yetkisiz kişi hiçbir veri görmez; yönetici kadroyu eşitler; güvenlik kapısı (eksik okuma) testli.

## Dilim 3 – Proje havuzu ve akademik takvim
`proje_havuzu` (4 seviye, birleştirme, pasife alma), `takvim_tatil` (TAM/ÖÖ/ÖS, Excel/CSV yükleme).

## Dilim 3b – Eski veri aktarımı (ERKEN)
`docs/TASIMA.md`: kuru çalıştırma raporu, aktarım, `ESKI_ARAC` işareti. Bitiş: kullanıcı raporu onaylar; aktarım sonrası geçmiş görevler ve proje havuzu dolu.

## Dilim 4 – Talep (Proje Sorumlusu)
`talepler`, `talep_gunleri`; form (havuzdan veya yeni hiyerarşi yazımı), kopyalama, geri çekme, canlı rozetler.

## Dilim 5 – Atama (Yönetici)
`atamalar`, `sp_atama_onayla` (`SERIALIZABLE`+`UPDLOCK`); kısmi ve gün bazlı bölünmüş atama; çakışmada yönetici kararı (vazgeç / çakışandan çıkar ve ata); Ana Proje geçmişinden tavsiye listesi; ret nedeni zorunlu.

## Dilim 6 – Haftalık matris
7 günlük ortak tablo (ÖÖ/ÖS bölünmüş hücre), filtreler, hafta geçişi, 30 sn yenileme (`rowversion`), Excel çıktısı.

## Dilim 7 – İzin ve rapor
`izin_talepleri/_gunleri`, `raporlar` (varbinary, ≤10 MB, PDF/JPG/PNG), rapor–izin çakışma önceliği, vekaleten giriş, ikame uyarıları.

## Dilim 8 – Revize, iptal, ikame
`revize_talepleri`, `sorumlu_devir`; erken bitiş, görev iptali, personel değiştirme, kişi sayısı değişimi.

## Dilim 9 – Analiz ve arşiv
Ana Proje bazlı adam-gün (TAM=1,0, ÖÖ/ÖS=0,5), personel detay analizi, arşiv, Excel.

## Dilim 10 – Canlıya geçiş
Son aktarım, `sp_ortam_canli`, Özlük ile birlikte yayın, geri dönüş planı, tam fonksiyon testi.
