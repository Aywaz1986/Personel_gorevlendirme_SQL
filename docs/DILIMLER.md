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
`talepler`, `talep_gunleri`, `talep_oneri`, `gecmis_gorev` (tarihsiz eski geçmiş; doldurma eski veri aktarımında); form (havuzdan veya yeni hiyerarşi yazımı; Alt Proje boşsa "Genel"), talep düzeyinde saat aralığı, önerilen personel (bağlayıcı değil), kopyalama, revize (onaydan önce), geri çekme, durum rozetleri. Test listesi: `docs/test-dilim-4.md`.

## Dilim 5 – Atama (Yönetici)
`atamalar`, `sp_atama_onayla` (`SERIALIZABLE`+`UPDLOCK`); kısmi ve gün bazlı bölünmüş atama; çakışmada yönetici kararı (vazgeç / çakışandan çıkar ve ata); Ana Proje geçmişinden tavsiye listesi; ret nedeni zorunlu.

Test listesi: `docs/test-dilim-5.md`. Uygulanan: `atamalar` (gün+dilim satırı, AKTIF/CIKARILDI), `bildirimler`, `sp_atama_adaylar`, `sp_atama_cakisma_kontrol`, `sp_atama_onayla`, `sp_talep_reddet`; hata kodu 50030 (çakışma).

## Dilim 6 – Haftalık matris
7 günlük ortak tablo (ÖÖ/ÖS bölünmüş hücre), filtreler, hafta geçişi, 30 sn yenileme (`rowversion`), Excel çıktısı.

Test listesi: `docs/test-dilim-6.md`. Uygulanan: `008_matris.sql`, `matrisHafta/Surum/Bolumler/Excel`, `004_matris.js`; tüm roller görür. İzin/rapor hücreleri Dilim 7'de eklenecek.

## Dilim 7 – İzin ve rapor
`izin_talepleri/_gunleri`, `raporlar` (varbinary, ≤10 MB, PDF/JPG/PNG), rapor–izin çakışma önceliği, vekaleten giriş, ikame uyarıları.

Test listesi: `docs/test-dilim-7.md`. Uygulanan: `009_izin_rapor.sql`, 12 komut (`izinKaydet` … `gorevlerim`), `004_izin_rapor.js` (Saha "Görevlerim"; Sorumlu/Yönetici "İzin ve rapor"), matriste izin/rapor hücreleri. Kararlar (Murat, 21.11.2026): rapor kaydedilir, çakışan atama DURUR ve Yönetici uyarılır; izin onayında çakışmayı Yönetici seçer (vazgeç / çakışandan çıkar).

## Dilim 8 – Revize, iptal, ikame
`revize_talepleri`, `sorumlu_devir`; erken bitiş, görev iptali, personel değiştirme, kişi sayısı değişimi.

## Dilim 9 – Analiz ve arşiv
Ana Proje bazlı adam-gün (TAM=1,0, ÖÖ/ÖS=0,5), personel detay analizi, arşiv, Excel.

## Dilim 10 – Canlıya geçiş
Son aktarım, `sp_ortam_canli`, Özlük ile birlikte yayın, geri dönüş planı, tam fonksiyon testi.
