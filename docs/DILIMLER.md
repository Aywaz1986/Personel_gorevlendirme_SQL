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

## Dilim 14 – Yeni arayüz tasarımı
Murat 24.11.2026: referans tasarım ("Merkezi Personel Görevlendirme Arayüz Tasarımı") renk, yapı ve buton işleviyle aktarılır. Test listesi: `docs/test-dilim-14.md`. SQL: yalnız `015_sayac_sahada.sql` (`sp_sayaclar` + `sahada_bugun`, `saha_toplam`).
- Üst çubuk: yalnızca kişinin sahip olduğu rollerin düğmesi görünür (yetkisiz roller gizli); KPI kartları; sekme şeridi (Yönetici: Talepler, İzin Onayları, Revize & İkame, Matris, Analiz, Proje Havuzu & Akademik Takvim, Kullanıcı Yetki, Ayarlar).
- Talep kartı: altta ortalanmış küçük "Atama Yap / Gün Bazlı Böl" ve "Zorunlu Açıklamayla Reddet"; sağda kaydırmalı "Ana Proje bazlı geçmiş deneyim tavsiye" kutusu.
- Kullanıcı Yetki sekmesi: kullanıcı rolleri, yönetici tanımları, işlem günlüğü; sağ üstte "+ Yeni yetkili ekle". Ayarlar'dan bu üçü kaldırıldı.
- Ayarlar › Görünüm ve yazı: Özlük'teki Yazı Ayarları (alan bazında yazı tipi/boyutu), hazır + özel temalar, buzlu cam. Varsayılan yazı tipi yapıya gömülü (`ui-src/fonts`, `build.py`). Tercihler bilgisayara özel.
- Eksik/bilinçli: Sorumlu iki sütunlu form ve vekâlet düğmesi (gezinme penceresi) tam birebir değil; Proje Havuzu & Akademik Takvim sayfası Dilim 15'e kadar iskelettir.

## Dilim 15 – Akademik takvim ve Proje/Görev Havuzu yönetimi
Murat 24.11.2026 istek dosyası madde 5–6. Test listesi: `docs/test-dilim-15.md`. SQL: `016_havuz_arsiv.sql` (`proje_havuzu.arsiv/arsiv_neden/arsiv_tarih`, `sp_havuz_arsivle`, `sp_havuz_listele` genişledi, `sp_havuz_durum` arşivdekini etkinleştirmez). Yeni komut: `havuzArsiv`.
- Havuz (sekmenin sol kartı): kademeli açılır listeler (Ana Proje → Alt Proje → Faaliyet → Yerleşke), seçili kayda işlemler + ağaç. Ad düzelt, Tamamlandı (pasife al; analiz bozulmaz, yeni talep listelerinde gizli), Birleştir (veri kaybı yok, kaynak hedefi gösterir), Arşivle (nedenli; altındakilerle), tümü `islem_log`'da (HAVUZ_EKLE/ADLANDIR/PASIF/AKTIF/BIRLESTIR/ARSIV/ARSIVDEN_CIKAR).
- Takvim (sağ kart + alt çizelge): tür combobox **Yıllık İzin** (= `IDARI` + yıllık izinden kesilir bayrağı) / **Resmi Tatil** (`RESMI`) / **Yarım Gün** (ÖÖ/ÖS). Takvim şeması değişmedi.
- Excel/CSV/yapıştır: dosya taranır, bulunan her tarih için tür seçilir (toplu çevirme, satır dışlama), Doğrula (önizleme) sonra toplu ekleme; hatalıysa hiçbiri eklenmez.
- Varsayım: "2024 tasarımı" olarak Dilim 3b'deki standart (2024_Takvim.xlsx: mavi resmi, turuncu idari/yıllık izin, daire yarım gün, ISO hafta) yıllık çizelge korunmuştur; farklı renk/açıklama istenirse ayrıca düzeltilir.

## Dilim 16 – Mantık ve matris (Murat 24.11.2026 istek listesi 1, 2, 7, 11–16)
Test listesi: `docs/test-dilim-16.md`. SQL: `017_dilim16.sql`. Yeni komutlar: `talepAtananAdlar`, `izinRaporBilgi`; `matrisHafta/matrisExcel` + `sadeceSaha`.
- Talep kodu `TLP-YYYY-NNNN` (yıl + yıl içi sıra; `yil`,`yil_sira` + `trg_talepler_kod`; eski kayıtlar oluşturma yılına göre yeniden numaralanır).
- Adaylar (`sp_atama_adaylar`) yalnız SAHA rolündeki kişiler. Tavsiye kutusunda **Ata**: günlük tek kişi isteniyorsa tüm günlere tek tıkla; çok kişi/çakışma varsa atama ekranı.
- Atama ufku: `sistem_ayarlari.ATAMA_UFKU_GUN` (varsayılan 14); `sp_atama_onayla` daha ilerisini reddeder (50024). Geriye dönük atama sınırlanmadı.
- Görev kartı başlığında "✔ Ad atandı" (`sp_talep_atanan_adlar`).
- Haftalık Özet (eski "Ortak 7 Günlük Özet Matris"): varsayılan "Saha personeli (tümü)"; boş hafta içi günler yeşil "Müsait"; personel adı altında telefon (bölüm kaldırıldı); görev bloğu altında sorumlu + telefon. Telefonlar yalnız Yönetici ve Sorumluya (Saha göremez).
- Sorumlu "İzin / Rapor Bilgisi": `sp_izin_rapor_bilgi`, yalnız okuma.
- Otomatik yenileme denetimi: aşağıda (MIMARI).

## Dilim 17 – Görünüm (Murat 24.11.2026 istek listesi 3, 4, 5, 6, 8, 9, 10)
Test listesi: `docs/test-dilim-17.md`. Yalnız arayüz; SQL/komut değişikliği yok.
- Yönetici talep kartı üç sütun: Özet | Görev ve Saha Bilgisi | Ana Proje Bazlı Geçmiş Görev Tavsiye Bloğu (`.govde3`).
- Kullanıcı Yetki: tek sütun (Yönetici tanımı, bölüm→rol eşleştirme); işlem günlüğü Ayarlar › İşlem Günlüğü.
- Proje Havuzu ve Akademik Takvim ayrı sekmeler; takvim 3×4 renkli ay başlıkları, altında ayrıntılar, "AKADEMİK TATİL VE RESMİ TATİL YÖNETİMİ" düğmesi yönetimi açılır pencerede açar.
- Revize & İkame Uyarıları: Talepler sayfasında 4. düğme (Kapalı 5.).
- Tarih seçici: `placeholder` içinde GG.AA.YYYY olan her metin kutusuna 📅 (`002b_pencere_tarih.js`, MutationObserver).
- Logo: Ayarlar › Görünüm › Logo ve filigran (`004_logo.js`); sol üst logo + silik filigran, tarayıcı deposunda.
- Hizalama: `.satir` kontrolleri 40 px, alt hizalı; Analiz tarih kutuları/düğmeleri düzeltildi.

## Dilim 18 – Proje Havuzu ağaç-tablo (Murat 25.11.2026: "Ağaç-Tablo Prototipi")
Test listesi: `docs/test-dilim-18.md`. Kademeli açılır listeler ve eski ağaç kalktı; tek ağaç-tablo: Hiyerarşi | Kapsam Özeti | Toplam Efor | Durum | Hızlı İşlemler.
- Üstte özet kartları (Ana Proje/Alt Proje/Faaliyet/Yerleşke aktif–pasif sayıları, toplam adam-gün); arama; Tümü / Sadece Aktifler / Pasif-Arşiv; derinlik düğmeleri.
- Satır içi ad düzeltme (Enter/Esc), "+ Alt kayıt", Pasife al/Aktifleştir, Birleştir, Arşivle (mevcut komutlar).
- Yeni: `havuzEfor` komutu + `018_havuz_efor.sql` (`sp_havuz_efor`, yalnız Yönetici; TAM=1,0 ÖÖ/ÖS=0,5, üst düğümlere yuvarlanır).
- Prototipten alınmayanlar: SQL çekmecesi ve ekran içi audit paneli (günlük Ayarlar'da).
