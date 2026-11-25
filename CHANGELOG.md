# Değişiklik günlüğü

Her değişiklik önce **Yayınlanmamış** bölümüne yazılır; sürüm yükselince bölüm sürüm başlığına dönüştürülür.

## Yayınlanmamış
### Dilim 16 – Mantık ve matris (2026-11) — DEVAM EDİYOR (dal `dilim-16-mantik-matris`, Dilim 15 dalından; PR sırası … → #21 → bu)
**Oturum devir notu (her adımda güncelle):**
- İstek (Murat 24.11.2026, 16 madde): Dilim 16 = 1, 2, 7, 11–16; Dilim 17 = 3, 4, 5, 6, 8, 9, 10 (görünüm).
- [x] 1. `017_dilim16.sql` (sınanmadı; CI SqlTests), servis/komutlar, Dilim16Tests, TestDb.MigrateAsync (ufuk 3650 gün)
- [x] 2. Arayüz: Ata, atandı rozeti, Haftalık Özet, İzin/Rapor Bilgisi
- [x] 3. Belgeler, `docs/test-dilim-16.md`, kılavuz, ekran görüntüleri
- [x] 4. Push, CI yeşil (4/4), PR açıldı (taban dilim-15-takvim-havuz)
- [ ] Sonra: Dilim 17

### Dilim 15 – Akademik takvim + Proje/Görev Havuzu yönetimi (2026-11) — DEVAM EDİYOR (dal `dilim-15-takvim-havuz`, Dilim 14 dalından; PR sırası … → #19 → #20 → bu)
**Oturum devir notu (her adımda güncelle):**
- Karar (Murat 24.11.2026 istek dosyası, madde 5–6): takvim tür combobox + Excel'de tarih başına tür seçimi + yıllık çizelge; havuz merkezî kademeli panel, ad düzeltme, birleştirme, pasife alma, arşiv, denetim. Takvim şeması değişmedi; havuzda yalnız arşiv eklendi.
- [x] 1. `016_havuz_arsiv.sql` (sınanmadı; CI SqlTests), `havuzArsiv` komutu, SqlTests + BridgeTests
- [x] 2. Arayüz: `004_havuz.js`, `004_takvim.js`, `004_havuz_takvim.js`
- [x] 3. Belgeler, `docs/test-dilim-15.md`, kılavuz (bölüm 6–7) + ekran görüntüleri
- [x] 4. Push, CI yeşil (4/4), PR açıldı (taban dilim-14-yeni-tasarim)

### Dilim 14 – Yeni arayüz tasarımı (2026-11) — DEVAM EDİYOR (dal `dilim-14-yeni-tasarim`, Dilim 13 dalından; PR sırası … → #19 → bu)
**Oturum devir notu (her adımda güncelle):**
- Karar (Murat 24.11.2026): referans tasarım aktarılır; istek 1–4 + yazı/tema/cam Dilim 14, istek 5–6 (akademik takvim, havuz yönetimi) Dilim 15.
- [x] 1. Üst çubuk/rol düğmeleri/KPI/sekme şeridi, talep kartı + tavsiye kutusu, Kullanıcı Yetki (+ Yeni yetkili ekle), Ayarlar ayrı sekme
- [x] 2. Gömülü yazı tipi, Yazı Ayarları, tema + buzlu cam (`004_gorunum.js`)
- [x] 3. `015_sayac_sahada.sql` (sınanmadı; CI SqlTests), SenaryoTests
- [x] 4. Belgeler, `docs/test-dilim-14.md`, kılavuz + ekran görüntüleri
- [x] 5. Push, CI yeşil (4/4), PR açıldı (taban dilim-13-baglanti-yapilandirma)
- [ ] Sonra: Dilim 15 (madde 5–6), `016+` göçü

### Dilim 13 – Gizli bağlantı yapılandırması + yüzen pencere (2026-11) — DEVAM EDİYOR (dal `dilim-13-baglanti-yapilandirma`, Dilim 12 dalından; PR sırası … → #17 → bu)
**Oturum devir notu (her adımda güncelle):**
- Karar (Murat 23.11.2026): Özlük'teki gizli/ortak bağlantı yapılandırması ve yüzen bağlantı penceresi aynı özelliklerle buraya. SQL değişikliği YOK (şema sürümü aynı).
- [x] 1. C#: SharedConnection (doğrulama, atomik yazma, silme, kaynak), PencereKonumu, 5 yeni komut (Yönetici denetimli); birim testleri `BaglantiYapilandirmaTests`, BridgeTests
- [x] 2. Arayüz: sessiz bağlanma, bilgi ekranları, yönetici formu (+varsayılan kaydet/sil), yüzen pencere (sürükle, boyutlandır, iğne, kurum varsayılanı)
- [x] 3. Belgeler (README, PLAN, DILIMLER, ARAYUZ, MIMARI, YETKI), `docs/test-dilim-13.md`, kılavuz (2.1)
- [x] 4. Push, CI yeşil (4/4), PR açıldı (taban dilim-12-senaryo-eksikleri)

### Dilim 12 – Senaryo eksikleri ve Ayarlar (2026-11) — DEVAM EDİYOR (dal `dilim-12-senaryo-eksikleri`, Dilim 11 dalından; PR sırası #12 → … → #16 → bu)
**Oturum devir notu (her adımda güncelle):**
- Kararlar (Murat 23.11.2026): eksikler bitmeden görsel/yapılandırma yok; ayarlar Özlük'teki gibi tek yerde (yazı ayarları, kullanıcılar, rol eşleştirme); talep ekranı listeleri rol eşleşmesinden gelir.
- [x] 1. `014_senaryo_eksikleri.sql` — sunucuda sınanmadı
- [x] 2. C# komutları, testler (Dilim12Tests)
- [x] 3. Arayüz: Ayarlar, günlük, rapor düzelt, revize seçimi/müsaitlik, kırılım, müsait süzgeci, sayaç şeridi, rol listeleri
- [x] 4. Belgeler, test-dilim-12.md, kılavuz (8.10)
- [x] 4b. Atama panelinde sorumlu telefonu + saha notu (senaryo yeniden kontrol)
- [x] 5. Push, CI yeşil (4/4), PR açıldı (taban dilim-11-senaryo-tamamlama)

### Dilim 11 – Senaryo tamamlama (2026-11) — DEVAM EDİYOR (dal `dilim-11-senaryo-tamamlama`, Dilim 10 dalından; PR sırası #12 → #13 → #14 → #15 → bu)
**Oturum devir notu (her adımda güncelle; yeni oturum önce buradan devam eder):**
- Kararlar (Murat 22.11.2026): senaryodaki tüm özellikler eksiksiz; nitelik yerine Saha / Operasyon Notu; belgeler veritabanında; bağlantı ekranı kalır; eksikler tekrar belirlenecek. Sonraki: yapılandırma + görsel düzenleme.
- [x] 1. `013_senaryo_tamamlama.sql` — sunucuda sınanmadı
- [x] 2. C#: SenaryoService/Commands (3 komut), aday/analiz/matris/evrak alanları, testler
- [x] 3. Arayüz: saha notu, iletişim, ikame kutusu, rozetler, yenileme, yerleşke süzgeci, analiz sütunları
- [x] 4. Belgeler, test-dilim-11.md, kılavuz
- [x] 5. Push, CI yeşil (4/4), PR açıldı (taban dilim-10-canli-gecis); Murat'ın el sınaması (`docs/test-dilim-11.md`)

### Dilim 10 – Canlıya geçiş (2026-11) — DEVAM EDİYOR (dal `dilim-10-canli-gecis`, Dilim 9 dalından; PR sırası #12 → #13 → #14 → bu; Murat testleri Pazartesi 23.11.2026 toplu yapacak)
**Oturum devir notu (her adımda güncelle; yeni oturum önce buradan devam eder):**
- Varsayılanlar (Murat'a sorulmadı; Pazartesi teyit): bkz. `docs/DILIMLER.md` Dilim 10.
- [x] 1. `012_canli_aktarim.sql` (kontrol, ortam_canli, eski_aktar/durum/geri_al) — sunucuda sınanmadı
- [x] 2. C#: EskiAktarim (planlayıcı), CanliService, CanliCommands (5 komut), BridgeTests
- [x] 3. Testler: CanliTests (4 SQL), EskiAktarimTests (birim)
- [x] 4. Arayüz: Sistem "Canlıya geçiş" kartı, Eski veri "Aktarım" kartı
- [x] 5. `tools/sql/gorev_geri_donus.sql`
- [x] 6. Belgeler (CANLIYA-GECIS.md, test-dilim-10.md), kılavuz 8.8 + ekran görüntüsü 15
- [x] 7. Push, CI yeşil (4/4), PR açıldı (taban dilim-9-analiz). Murat'ın el sınaması (`docs/test-dilim-10.md`)

### Dilim 9 – Analiz ve arşiv (2026-11) — DEVAM EDİYOR (dal `dilim-9-analiz`, Dilim 8 dalından; PR #12 → #13 → bu sırayla birleşecek; Murat testleri Pazartesi 23.11.2026 toplu yapacak)
**Oturum devir notu (her adımda güncelle; yeni oturum önce buradan devam eder):**
- Varsayılanlar (Murat'a sorulmadı; Pazartesi teyit): yalnız AKTIF atamalar; Yönetici tümü / Sorumlu kendi talepleri / Saha yok; izin-rapor sütunları yalnız Yönetici; rapor günü = takvim günü; arşiv = tarihsiz eski görevler + tarih aralığı sorgusu.
- [x] 1. `011_analiz.sql` (5 salt okuma yordamı) — sunucuda sınanmadı
- [x] 2. C#: AnalizService (+ Excel tabloları), AnalizCommands (6 komut), MatrisExcel.Xlsx sayısal hücre/dondurma, BridgeTests
- [x] 3. Testler: AnalizTests (2 SQL), AnalizTabloTests (3 birim)
- [x] 4. Arayüz `004_analiz.js` (Analiz sayfası, menü Yönetici+Sorumlu); ekran görüntüsü 14
- [x] 5. Belgeler, test-dilim-9.md, kılavuz 8.7
- [x] 6. Push, CI yeşil (4/4), PR #14 açıldı (taban dilim-8-revize-ikame). Murat'ın el sınaması (`docs/test-dilim-9.md`)

### Dilim 8 – Revize, iptal, ikame, devir (2026-11) — DEVAM EDİYOR (dal `dilim-8-revize-ikame`; Dilim 7 PR #12 CI yeşil, birleştirme Murat'ta; Murat testleri Pazartesi 23.11.2026 toplu yapacak)
**Oturum devir notu (her adımda güncelle; yeni oturum önce buradan devam eder):**
- Kararlar (Murat'a sorulmadı, varsayılan; Pazartesi teyit): iptal yalnız hiç günü geçmemiş atanmış talepte, başlamışsa erken bitiş; ikame çakışmada Dilim 5/7 karar kutusu; revize Sorumlu ister / Yönetici onaylar (Yönetici doğrudan uygular); atanmış kişiden az kişi sayısı onaylanamaz.
- [x] 1. `010_revize_ikame.sql` (sorumlu_devir, revize_talepleri, 11 yordam) — sunucuda sınanmadı
- [x] 2. C#: RevizeService, RevizeCommands (11 komut), MainForm kaydı, BridgeTests, SqlTests csproj
- [x] 3. Testler: RevizeTests (4 SQL)
- [x] 4. Arayüz `004_revize.js` (Yönet… paneli) + talep listesi düğmesi; ekran görüntüsü 13
- [x] 5. Belgeler, test-dilim-8.md, kılavuz 8.6
- [ ] 6. Push, CI, PR (Dilim 7 birleşince base main), Murat'ın el sınaması (`docs/test-dilim-8.md`)

### Dilim 7 – İzin ve rapor (2026-11) — DEVAM EDİYOR (dal `dilim-7-izin-rapor`; Dilim 6 PR #11 birleştirme Murat'ta)
**Oturum devir notu (her adımda güncelle; yeni oturum önce buradan devam eder):**
- Kararlar (Murat, 21.11.2026): rapor kaydedilir, çakışan atama durur + Yönetici uyarılır; izin onayında çakışmayı Yönetici seçer (vazgeç / çakışandan çıkar). Rapor izinden önceliklidir. Murat testleri Pazartesi (23.11.2026) toplu yapacak.
- [x] 1. `009_izin_rapor.sql` (tablolar, tetikleyici 50031, 12 yordam, matris ALTER) — sunucuda sınanmadı
- [x] 2. C#: IzinRaporService, IzinRaporCommands (12 komut), SqlHata 50031, MatrisService/Excel izin eklemesi
- [x] 3. Testler: IzinRaporTests (4 SQL), EvrakTests, MatrisExcelIzinTests, BridgeTests
- [x] 4. Arayüz `004_izin_rapor.js`, matris izin/rapor hücreleri, menü; ekran görüntüsü 12
- [x] 5. Belgeler, test-dilim-7.md, kılavuz 8.5
- [x] 6. Push, CI yeşil (4/4), PR açıldı. Murat el sınaması (`docs/test-dilim-7.md`) Pazartesi 23.11.2026

### Dilim 6 – Haftalık matris (2026-11) — DEVAM EDİYOR (dal `dilim-6-matris`; Dilim 5 PR #9 CI yeşil, birleştirme Murat'ta)
**Oturum devir notu (her adımda güncelle; yeni oturum önce buradan devam eder):**
- Tasarım önizlemesi Murat'a gönderildi (21.11.2026, matris_onizleme.png); itiraz gelmedi. Kararlar: tüm roller görür (YETKI matrisi), yalnız okuma; hücre ÖÖ üst / ÖS alt / TAM tek blok; renk Ana Proje; 30 sn'de yalnız sürüm sorgusu; Excel sunucu tarafında paketsiz xlsx; izin/rapor Dilim 7'de.
- [x] 1. `008_matris.sql`: atamalar.surum, fn_hafta_basi, sp_matris_hafta/surum/bolumler
- [x] 2. C#: MatrisService, MatrisExcel, MatrisCommands (matrisHafta/Surum/Bolumler/Excel), MainForm kaydı, BridgeTests, SqlTests cs
- [x] 3. Arayüz `004_matris.js` + menü (3 rol); ekran görüntüsü 11
- [x] 4. Testler: `MatrisTests` (3 SQL), `MatrisExcelTests` (2, SQL'siz)
- [x] 5. Belgeler (README, PLAN, DILIMLER, ARAYUZ, MIMARI, SQL, test-dilim-6.md) ve kılavuz Bölüm 8.4
- [ ] 6. Push, CI, PR, Murat'ın el sınaması (`docs/test-dilim-6.md`)

### Dilim 5 – Atama (Yönetici) (2026-11) — DEVAM EDİYOR (dal `dilim-5-atama`; Dilim 4 PR #7/#8 birleşti)
**Oturum devir notu (her adımda güncelle; yeni oturum önce buradan devam eder):**
- Kararlar: atama gün+dilim (TAM/OO/OS) bazlıdır; kısmi atama serbest; talep durumu atanana göre (ONAY_BEKLIYOR/KISMEN_ATANDI/TAMAMEN_ATANDI). Çakışmada varsayılan REDDET (hata 50030 → arayüzde karar kutusu); karar CIKAR ise çakışan atama CIKARILDI olur, o talebin sorumlusuna bildirim + günlük ATAMA_CIKAR. TAM, OO ve OS ile çakışır; OO/OS birbiriyle çakışmaz. İzin/rapor çakışması Dilim 7'de (her zaman red). Ret nedeni zorunlu (≥3 karakter), yalnız ONAY_BEKLIYOR talep reddedilir.
- [x] 1. `007_atama.sql`: atamalar, bildirimler, fn_atama_cakisma, sp_atama_adaylar/cakisma_kontrol/onayla, sp_talep_reddet, sp_bildirim_listele/okundu; sp_talep_listele/getir yeniden tanımlandı
- [x] 2. C#: AtamaService, AtamaCommands (atamaAdaylar, atamaCakismaKontrol, atamaOnayla, talepReddet, bildirimListe, bildirimOkundu), SqlHata 50030, BridgeTests, SqlTests cs
- [x] 3. Arayüz: `004_atama.js` (atama paneli), `004_talep.js` (Ata/Atananlar/bildirim bandı/ret nedeni), menüden "yakında" düğmesi kaldırıldı
- [x] 4. SQL testleri `AtamaTests.cs` (7 test; yerelde çalıştırılamadı, CI doğrular)
- [x] 5. Belgeler (README, PLAN, DILIMLER, ARAYUZ, MIMARI, SQL, test-dilim-5.md) ve kılavuz Bölüm 8.3 (resim 10)
- [x] 5b. Talep formu ilk tasarıma döndürüldü (Murat, 21.11.2026): sıra 1 Talep sahibi (Windows oturumundan; Yönetici vekâleten listeden), 2 Proje ve görev tanımı (havuz ComboBox, yoksa elle yaz ve otomatik havuza), 3 Gün ve zaman dilimi (GG.AA.YYYY, günler kendiliğinden, Tam/ÖÖ/ÖS düğmeleri, −/+ kişi), 4 Önerilen personel; Özet etiket:değer yan yana, geniş. Yalnız `004_talep.js`; sunucu değişmedi.
- [ ] 6. Push, CI (4 iş), PR, Murat'ın el sınaması (`docs/test-dilim-5.md`)

### Dilim 4 – Talep (Proje Sorumlusu) (2026-11) — DEVAM EDİYOR (dal `dilim-4-talep`; Dilim 3 ve 3b PR #4/#5/#6 birleşti)
**Oturum devir notu (her adımda güncelle; yeni oturum önce buradan devam eder):**
- Tasarım önizlemesi (Claude Design, 20.11.2026) Murat'a gösterildi: "ilk izlenim gayet güzel". Murat'ın örnek talebi: Konum Ankara İvedik, saat 07:30-16:35, 23-27 Kasım 2026 (5 gün), Proje Toroman, Faaliyet AY Kabul, Önerilen Personel Ahmet Sümbül, Proje sorumlusu Erdem Efe → modele eklendi: talep düzeyinde saat aralığı, önerilen personel (bağlayıcı değil), talep sahibi (Sorumlu; Yönetici vekâleten seçer). Alt Proje boşsa "Genel".
- Kararlar (Claude, Murat itiraz etmezse): Sorumlu personel ADI yazmaz ama ÖNERİ girebilir; onay bekleyen talep serbestçe revize edilir, onaydan sonra revize Dilim 8; havuzda olmayan ad talep kaydedilirken havuza kaynak='TALEP' ile eklenir (tasarım önizlemesindeki "onayda eklenir" yerine; Yönetici havuz ekranından birleştirir/pasife alır). Hafta sonu/tatil günü engellenmez, uyarı döner. Tarihsiz eski geçmiş için `gecmis_gorev` tablosu açıldı (doldurma: eski veri aktarımı).
- [x] 1. `006_talep.sql`: fn_ben_sicil, fn_sorumlu_mu, talepler, talep_gunleri, talep_oneri, gecmis_gorev; sp_personel_ara, sp_talep_kaydet/geri_cek/listele/getir. SINANMADI (CI).
- [x] 2. C#: `TalepService`, `TalepCommands` (personelAra, talepListe, talepGetir, talepKaydet, talepGeriCek), MainForm kaydı, BridgeTests listesi, SqlTests csproj.
- [x] 3. Arayüz: `ui-src/app/004_talep.js` (liste + form), menü: Sorumlu "Görev Talep Arayüzü", Yönetici "Talepler". JS sözdizimi OK.
- [x] 4. SQL testleri `TalepTests.cs` (8 test), BridgeTests komut listesi.
- [x] 5. Belgeler (ARAYUZ, MIMARI, YETKI, SQL, PLAN, README, DILIMLER, TASIMA, `docs/test-dilim-4.md`); kılavuz Bölüm 8 + ekran görüntüleri 08/09 (menü sırası değiştiği için ekran betiği adla seçer).
- [x] 5b. (21.11.2026, Murat isteği) Formda tasarım önizlemesindeki sağ Özet kartı ve Kurallar notu: başlıklar 📍 Konum, 🕣 Saat, 📅 Tarih, 📑 Proje, 📡 Faaliyet, 🙋‍♀️ Önerilen Personel, 🧍‍♂️ Proje sorumlusu; canlı güncellenir, gönder/taslak düğmeleri kartın içinde. Kılavuz ve görüntü yenilendi.
- [x] 6. Push, CI 4/4 yeşil (ilk koşuda 006'da islem_log SEMA kaydı eksikti, düzeltildi), PR açıldı; sınama listesi sohbette. Sıradaki: Murat sınar → birleştirme → Dilim 5 (Atama).
### Dilim 3b – Eski veri: kuru çalıştırma raporu (2026-11) — DEVAM EDİYOR (dal `dilim-3b-eski-veri-rapor`; Dilim 3 PR #4 birleşti)
**Oturum devir notu (her adımda güncelle; yeni oturum önce buradan devam eder):**
- Kapsam kararı (19.11.2026, Claude): hedef tabloları (talep, atama, izin, rapor) Dilim 4–7'de geliyor; bu yüzden 3b = YALNIZ salt okunur "Eski veriyi denetle" raporu (hiçbir şey yazmaz). Gerçek aktarım (kaynak='ESKI_ARAC') hedef tablolar varken, Murat raporu inceledikten sonra (Dilim 4+ içinde) yapılır. `docs/TASIMA.md` buna göre güncellenir.
- Eski şema (04_sqlite_dosya_katmani.js): personel(adSoyad,sicil,aktif…), projeler(ad,lokasyon,aktif,parentId), sorumlular, haftalar(haftaBaslangic), atamalar(haftaId,personelId,personelAdi,gunler JSON {pzt..paz:true},durum gorevli/izinli/raporlu/musait,projeId,projeAdi,gorevMetni,sorumlu).
- Tasarım: `Microsoft.Data.Sqlite` (salt okunur, `Mode=ReadOnly`); `EskiVeriOkuyucu` (SQLite→bellek modeli, eksik tablo/sütuna dayanıklı), `EskiVeriDenetimi` (saf rapor mantığı, birim testli), komut `eskiVeriDenetle` (STA OpenFileDialog; ad/sicil maskeleme seçeneği, varsayılan açık), ekran "Eski veri".
- [x] 1. Kod yazıldı (EskiVeri.cs, EskiVeriDenetimi.cs, EskiVeriCommands.cs, ui-src/app/004_eski_veri.js, menü "Eski veri"; derlenmedi, CI)
- [x] 2. Testler yazıldı (tests/Gorevlendirme.Tests/EskiVeriTests.cs, geçici SQLite dosyasıyla; BridgeTests komut listesi)
- [x] 3. Belgeler (TASIMA, ARAYUZ, MIMARI, PLAN, README, test-dilim-3b). Kılavuz bölümü: aktarım gerçekleşince eklenecek (ekran geçici denetim aracı).
- [x] CI: faturalama düzeldi; ilk koşuda iki derleme hatam çıktı (KadroKisi/HavuzKaydi SqlTests csproj dışında, EskiVeriTests using Xunit eksik) düzeltildi; 4/4 yeşil (20.11.2026).
- [x] İLK GERÇEK RAPOR (20.11.2026, Murat, maskeli): 9 eski personel hepsi sicille eşleşti (kadro 265); 765 atama (görevli 284, izinli 45, raporlu 5, müsait 132 işlenen 466) · **299 atama haftasız** (haftaId haftalar tablosunda yok; eski araç hafta silmez → tanı gerek) · 3 görevli atamada projeId kayıp · 41 hafta, 2025-12-22–2026-11-20 · sorumlu 32 farklı metin (2 eşleşmez: boş 13, bir eski sorumlu) · proje 138 (58 kök, 80 alt; derinlik ≤2, 102 lokasyonlu; 15 kardeş-tekrar grubu — büyük olasılıkla lokasyonla ayrışıyor, Konum olarak birleştirilecek).
- [x] 5. (CI yeşil, 20.11.2026) Tanı sürümü: rapora "2a. Haftasız atamaların tanısı" (eksik haftaId aralığı, durum dağılımı, güncelleme tarihi) ve kardeş-tekrar gruplarında lokasyon listesi eklendi; CI sonrası Murat raporu yeniden çalıştırır. Haftasız 299 atama çözülmeden aktarım dilimi başlamaz.
- [x] İKİNCİ RAPOR (Murat): haftasız 299 atamanın haftaId'leri 2–25 (24 farklı, ardışık), mevcut hafta kayıtları id 1 ve 26–65 (41 adet); durum: görevli 179, müsait 88, izinli 32; hepsi 2026-08-28–30'da güncellenmiş (toplu işlem). Proje kardeş-tekrar 15 grubun 15'i lokasyonla ayrışıyor (gerçek tekrar yok) → birleştir + lokasyon=Konum doğrulandı.
- [x] ÜÇÜNCÜ RAPOR (2b sonucu): hafta id'leri tarih sırasında DEĞİL (id1→2026-08-31, 26–55 karışık sıra = toplu içe aktarma, 56–66 gezinme sırası); 42 hafta, 2025-12-15–2026-11-23 arası 49 pazartesiden yalnız 7'si eksik, oysa haftasız haftaId 24 adet → çıkarım YAPILMADI (güvenilmez); 299 haftasız atama 28–30 Ağustos'ta toplu güncellenmiş. Hipotez: eski kayıtların kopyası ya da haftaları sonradan yeniden aktarılmış.
- [x] DÖRDÜNCÜ RAPOR (2c sonucu): haftasız 24 haftaId'nin hiçbiri mevcut haftaların kopyası değil (en yüksek benzerlik %43; %80+ yok); fazla mesai kanıtı yok; "28–30 Ağustos güncelleme" haftalı atamalarda da var (286/478) → toplu işlem tüm DB'yi etkilemiş, orphan'ları ayırt etmez. Sonuç: 299 atama gerçek ve tarihi bilinmiyor; 2–25 haftaları büyük olasılıkla 2025-12-15'ten ÖNCE (aralıkta yalnız 7 boş pazartesi var). Çözüm adayı: Ağustos öncesi yedek .db'den hafta id→tarih almak (rapor 2b'ye hafta başına atama sayısı eklendi, id eşleşmesi sayılarla doğrulanır); olmazsa: aktarma ya da tarihsiz geçmiş (proje takibi için) — Murat karar verir.
- [x] KARAR (Murat, 20.11.2026): haftasız 299 atama için 2. seçenek — görevli olanlar (179) TARİHSİZ geçmiş olarak aktarılır ("kim gitti" bilinsin); izinli/müsait haftasızlar aktarılmaz; Ağustos öncesi için proje ağacı + kim gittiği yeterli. docs/TASIMA.md ve rapor metni güncellendi. Hedef tablo biçimi Dilim 4 tasarımında.
- [x] 7. Rapor 2c eklendi (CI yeşil): haftasız haftaId başına en benzer mevcut hafta (imza benzerliği), haftalı atamaların güncelleme zamanı dağılımı, fazla_mesai.tarih'ten hafta kanıtı. Murat yeniden çalıştırır; karar: %80+ benzeyenler kopya sayılıp aktarılmaz, kanıtlı olanlar tarihlenir, kalanı Murat'a sorulur.
- [x] 6. (kısmen geçersiz; 3. rapora bak) Rapor 2b eklendi: hafta id→tarih listesi, id–tarih düzeni kontrolü (1→26 boşluğu 25 hafta mı?), uyumluysa haftasız atamalara tarih ÇIKARIMI + çakışma kontrolü. Murat yeniden çalıştırır; sonuç uyumluysa aktarım dilimi çıkarımı kullanır (işaretli "çıkarım"), değilse 299 atama aktarılmaz/elle karara bırakılır.
- [x] 4. PR açıldı (#5), sınama listesi sohbette. Sıradaki: Murat raporu çalıştırıp maskeli metni gönderir → gerçek aktarım dilimi.
### Dilim 3 – Proje havuzu ve akademik takvim (2026-11) (dal `dilim-3-havuz-takvim`; Dilim 2 PR #3 birleşti)
**Oturum devir notu (her adımda güncelle):**
- Kararlar (Murat, 17.11.2026): takvim yalnız tatil/kapalı gün (tarih + TAM/OO/OS + tür + ad); tatil gününe atama ENGELLENMEZ, yöneticiye UYARI çıkar (Dilim 5'te uygulanır); toplu yükleme: CSV dosyası + Excel'den yapıştır + .xlsx (C#'ta paketsiz ZipArchive okuyucu).
- Tasarım: `proje_havuzu` tek tablo, `ust_id` + `seviye` 1..4 (Ana Proje/Alt Proje/Faaliyet/Konum); ad kardeşler arasında tekil; pasife alma altını da pasife alır; birleştirme yumuşak: kaynak pasif + `birlestirildi_id`, çocuklar hedefe taşınır (aynı adlılar özyinelemeli birleşir). Listeleme yordamları her rolde, yazma yalnız yönetici.
- [x] 1. `004_havuz_takvim.sql` yazıldı (fn_kayitli_mi, proje_havuzu, takvim_tatil, sp_havuz_*, sp_takvim_*; sifirla takvim_tatil'i korur). SINANMADI.
- [x] 2. C#: `HavuzService`, `TakvimService`, `TakvimCozumleyici`, `XlsxOkuyucu` (paketsiz), `HavuzTakvimCommands`, `SqlHata` 2601/2627. Derlenmedi (CI).
- [x] 3. Arayüz: `ui-src/app/004_havuz.js`, `004_takvim.js`; menüye eklendi. JS sözdizimi OK.
- [x] 4. Testler yazıldı (`HavuzTakvimTests` SQL, `TakvimTests` C#). CI ilk koşu: SQL geçici tablo harmanlama çakışması (004 #s/#o → COLLATE DATABASE_DEFAULT) ve 1 C# test beklentisi düzeltildi; 2. koşu izleniyor.
- [x] 5. Belgeler (README, PLAN, ARAYUZ, MIMARI, YETKI, SQL, test-dilim-3) ve kılavuz (docx: havuz + takvim bölümleri, 7 ekran görüntüsü) güncellendi.
- **REVİZYON (18.11.2026, Murat `2024_Takvim.xlsx` paylaştı: "takvim çok basit kaldı, standart yapı bu"):** standart: yıllık takvim (12 ay, HFT=ISO hafta no, PT..PZ), renk/işaret: Resmi Tatil (mavi), İdari Tatil (turuncu), Yarım Gün (daire); altında tatil listesi `GG[-GG..] AY GünAdları / N Gün Ad (YILLIK İZİNDEN KESİLECEK)`; en altta "YILLIK İZİNDEN TOPLAM … GÜN KESİLECEK". Karar: tatil artık ARALIK kaydı (başlangıç–bitiş), tür RESMI/IDARI (AKADEMIK kalktı), yarım gün = OO/OS tek günlük kayıt, `yillik_izinden_kesilir` bayrağı + yıl özeti; yıllık izin modülü yok, toplam yalnız bilgi. Yeni `005_takvim_standart.sql` (004'ü değiştirmez; veriyi taşır). Yıl takvimi ekranı + standart .xlsx'i doğrudan okuyan içe aktarma (liste satırlarını ayrıştırır).
- [x] R1. 005 SQL (SINANMADI) · [x] R2. C# · [x] R3. Arayüz (yıl takvimi, özet, aralıklı form, standart .xlsx içe aktarma) · [x] R4. Testler (SQL + C#, 2024 örnekleriyle) · [x] R5. Belgeler + kılavuz · [x] R6. push + CI yeşil (4/4) + sınama listesi sohbette (açık soru: 28 Ekim 2024 oval mi, "1 Gün yıllık izinden" mi)
- [x] 6. PR açıldı, CI yeşil (SQL testleri geçti). Murat el sınaması (`docs/test-dilim-3.md`) ve birleştirme bekleniyor.
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
