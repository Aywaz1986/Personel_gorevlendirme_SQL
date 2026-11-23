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

Test listesi: `docs/test-dilim-8.md`. Uygulanan: `010_revize_ikame.sql`, 11 komut (`talepIptal` … `revizeListe`), `004_revize.js` (talep listesinde atanmış taleplerde **Yönet…**). Kararlar (Murat'a sorulmadan varsayılan; Pazartesi sınamasında teyit): iptal yalnız atama başlamış ve **hiçbir günü geçmemiş** talepte; başlamışsa erken bitiş. İkame çakışmada Dilim 5/7'deki karar kutusunu kullanır (izin/rapor her zaman red). Revize: Sorumlu ister, Yönetici onaylar (Yönetici doğrudan uygular); atanmış kişiden az kişi sayısı ya da atanmış günün kaldırılması onaylanamaz (önce çıkarılır).

## Dilim 9 – Analiz ve arşiv
Ana Proje bazlı adam-gün (TAM=1,0, ÖÖ/ÖS=0,5), personel detay analizi, arşiv, Excel.

Test listesi: `docs/test-dilim-9.md`. Uygulanan: `011_analiz.sql` (salt okuma yordamları), 6 komut (`analizProje` … `analizExcel`), `004_analiz.js` (menüde **Analiz**: Proje adam-gün / Personel / Arşiv sekmeleri). Varsayılanlar (Pazartesi sınamasında teyit): yalnız AKTIF atamalar sayılır; Yönetici tümünü, Sorumlu yalnız kendi taleplerini görür, Saha göremez; izin/rapor sütunları yalnız Yönetici'de; rapor günü takvim günü olarak sayılır; "arşiv" = tarihsiz eski görevler + geçmiş dönemleri tarih aralığıyla sorgulama.

## Dilim 10 – Canlıya geçiş
Son aktarım, `sp_ortam_canli`, Özlük ile birlikte yayın, geri dönüş planı, tam fonksiyon testi.

Test listesi: `docs/test-dilim-10.md`; geçiş adımları: `docs/CANLIYA-GECIS.md`. Uygulanan: `012_canli_aktarim.sql` (`fn_canli_kontrol`, `sp_canli_kontrol`, `sp_ortam_canli`, `sp_eski_aktar`, `sp_eski_aktar_durum`, `sp_eski_aktar_geri_al`), 5 komut (`canliKontrol`, `canliyaGec`, `eskiAktarDurum`, `eskiAktar`, `eskiAktarGeriAl`), Sistem sayfasında **Canlıya geçiş** kartı, Eski veri sayfasında **Aktarım** kartı, `tools/sql/gorev_geri_donus.sql`. Varsayılanlar (Pazartesi sınamasında teyit): eşleşmeyen sorumlu → aktarımı yapan Yönetici sorumlu olur (eski ad talep metnine eklenir); kadroda eşleşmeyen kişinin görevleri tarihsiz geçmişe adıyla gider; eski görevlere varsayılan saat 07:30–16:35; aynı kişi+gün çakışmasında öncelik rapor > görev > izin; canlıya geçişten sonra uygulama içinden geri dönüş yok.

## Dilim 11 – Senaryo tamamlama
İş senaryosu belgesiyle karşılaştırma sonrası eksiklerin kapatılması (Murat 22.11.2026: "hiçbir eksik olmamalı"; eksikler tekrar tekrar belirlenecek).

Test listesi: `docs/test-dilim-11.md`. Uygulanan: `013_senaryo_tamamlama.sql`. Kararlar: **nitelik → "Saha / Operasyon Notu"** (fiziksel sütun `nitelik` ve köprü bağımsız değişkeni aynı kalır; yalnız arayüz adı ve uzunluk 1000); belgeler veritabanında kalır; bağlantı ekranı aynen durur. Yeni: `talepIletisim` (saha notu + sorumlu/atanan telefonu; görünürlük Yönetici / kendi Sorumlusu / atanmış Saha, atananlar listesi Saha'ya kapalı), `sayaclar` (menü rozetleri), `ikameBekleyenler` (rapor / ayrılma / birim değişikliği nedeniyle ikame bekleyen ileri atamalar; "birim" nedeni bölüm eşleştirmesi eksikse gürültülü olabilir), aday kartında görev/adam-gün/yerleşke/müsait gün, analizde müsait gün + tatil + tatilde çalışma, matriste `konum` süzgeci, rapor evrakı standart adı, 30 sn otomatik yenileme.

## Dilim 12 – Senaryo eksikleri ve Ayarlar
Murat 23.11.2026: eksikler bitmeden görsel/yapılandırmaya geçilmez; Özlük'teki ayar yapısı buraya taşınır (yazı ayarları, kullanıcılar, rol eşleştirme ayarlara); rol eşleşmesine göre talep ekranı personel listeleri.

Test listesi: `docs/test-dilim-12.md`. Uygulanan: `014_senaryo_eksikleri.sql`. Yeni: **Ayarlar** menüsü (herkes: Görünüm; Yönetici: Kullanıcılar ve yetkiler, Rol eşleştirme, Kadro, İşlem günlüğü, Eski veri, Sistem); `rolPersonel` (SORUMLU/SAHA listeleri: kişi başı istisna varsa o, yoksa bölüm eşleştirmesi); `logListe`/`logIslemTurleri`; `raporDuzelt`; `revizeFazlalik`/`revizeMusaitlik` + `revizeOnayla.cikar`; `analizKirilim`; `matrisHafta.sadeceMusait`. Karar: yazı/tema tercihi bilgisayara özeldir (sunucuya yazılmaz). Atama aday listesi (Yönetici) henüz rolle süzülmez; yalnız talep ekranı listeleri rol bazlıdır.

## Dilim 13 – Gizli bağlantı yapılandırması ve yüzen pencere
Murat 23.11.2026: Özlük'teki gizli bağlantı yapılandırması ve yüzen bağlantı penceresi aynı özelliklerle bu uygulamaya. Test listesi: `docs/test-dilim-13.md`. SQL değişikliği yok.
- Bağlantı sırası: `Gorevlendirme.baglanti.json` (exe klasörü) → `Ozluk.baglanti.json` → kullanıcıya özel (DPAPI). Yalnızca Windows kimliği; parola/kullanıcı adı dosyada yok.
- Normal kullanıcı form görmez: ayar yoksa "Bağlantı ayarı yapılmamış", ulaşılamıyorsa "Sunucuya bağlanılamadı" (Yeniden dene); form yalnızca "Yönetici: bağlantı ayarları" bağlantısı ya da pencerede "Bağlantıyı değiştir" ile.
- Yönetici formda "varsayılan olarak kaydet" derse dosya yazılır (atomik); yazılamazsa hata. Yazma/silme komutları sunucuda etkin Yönetici ister.
- Yüzen pencere: sürükle, kenardan boyutlandır, çift tık sıfırla, daralt/aç, iğne. Yönetici iğnelerse konum `Gorevlendirme.pencere.json` ile herkes için varsayılan (Özlük'te veritabanında; burada `dbo`/şema değişikliği olmaması için dosyada). Kişisel konum/iğne bilgisayara özel (localStorage). Sunucu/veritabanı adı yalnızca Yönetici'ye görünür.

