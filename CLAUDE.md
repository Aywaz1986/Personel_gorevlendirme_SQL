# Gorevlendirme.App – çalışma kuralları (Claude için)

Proje: Merkezi Personel Görevlendirme, Talep ve İzleme Sistemi. Özlük (SQL Server) ile aynı sunucu/veritabanını (`SST_Ozluk`) kullanan, kurulum gerektirmeyen tek exe (.NET + WinForms + WebView2 + Microsoft.Data.SqlClient). Eski tek dosya HTML aracının (`Aywaz1986/personel-gorevlendirme-araci`) SQL Server karşılığıdır; atama mantığı korunur, talep akışı eklenir.
Önce `README.md`, sonra `docs/PLAN.md` oku; başka dosyayı gerektikçe aç. Standartlar: `docs/SQL.md`, yetki: `docs/YETKI.md`, mimari: `docs/MIMARI.md`, eski veri: `docs/TASIMA.md`. Ortak şablon: Özlük deposu `docs/SQL-ORTAK-YAPI.md` (bu projede bilinçli bir istisna var: `docs/SQL.md` §1).

## KESİN KURAL: dbo.* nesnelerine dokunulmaz (kullanıcı talimatı, 16.11.2026)
- `dbo.*` tablolarına, görünümlerine, yordamlarına YAZMA, DDL (CREATE/ALTER/DROP/TRUNCATE) ve GRANT/DENY/REVOKE YAPILMAZ. Özlük'ün kendi rolü `ozluk_kullanici` zaten `dbo.personeller` üzerinde SELECT sahibidir; yeni yetki eklenmez.
- `dbo` okuması yalnızca iki yerde: `dbo.personeller` (kadro eşitleme) ve `dbo.sp_ben` (EXEC); yalnızca `*_kadro_esitleme.sql` dosyasında ve yalnızca `INSERT #geçici ... SELECT/EXEC` biçiminde. Sonra işlem geçici tablodan yapılır.
- Bu kural CI'da `tools/dbo_koruma.py` ile denetlenir (`tools/test_dbo_koruma.py`). Denetimi susturmak için `tools/dbo_koruma_izinler.json`'ı değiştirmek yazılı onay gerektirir.

## Token tasarrufu (kullanıcı ücretsiz planda)
- Büyük dosyaları baştan sona OKUMA; önce `grep -n`, `sed -n`, kesit.
- Sohbette kısa yaz. Uzun açıklama `docs/` içine gider.
- Her dilimi tek seferde bitir: yaz → dalda commit → `gh run watch` → yalnızca hata satırlarını oku (`gh run view --log-failed | tail -40`).
- Belgeler (CLAUDE.md, README.md, docs/PLAN.md, docs/YETKI.md, docs/SQL.md) her zaman güncel olur: karar, yetki, komut veya durum değişince aynı dalda, aynı commit'te güncelle.
- Dilim bitince güncelle: `docs/PLAN.md` durumu, `CHANGELOG.md`, `README.md` durum tablosu, yeni komutlar `docs/ARAYUZ.md`, mimari değişirse `docs/MIMARI.md`.
- Kullanma kılavuzu: `docs/Kullanma-Kilavuzu.docx` (resimli) her zaman güncel tutulur (kullanıcı kalıcı kural olarak istedi, 16.11.2026): ekran, menü, komut, yetki veya akış değişen her dilimde aynı commit'te `tools/kilavuz/kilavuz.js` içindeki bölümü düzelt, gerekiyorsa `tools/kilavuz/ekran_goruntusu.py` ile görüntüleri yenile, `node kilavuz.js` ile docx'i üret. (Araç ilk arayüz dilimi olan Dilim 2'de Özlük'teki `tools/kilavuz` uyarlanarak kurulur.) Başka Word/rapor yalnızca istenirse.
- Dilim teslim mesajına sınama listesini (madde madde, kim/ne yapar/beklenen) sohbette yaz; kullanıcı birleştirmeden önce depodaki belgeleri göremiyor.
- Karmaşık ekranlarda kodlamadan önce tasarım önizlemesi göster (kullanıcı tercihi).

## Kararlar (değişmez, kullanıcı onayladı)
- Kapsam: Fazla mesai ve yıllık izin BU SÜRÜMDE YOK (ileride gerekirse ayrıca konuşulur).
- Veritabanı: `SST_Ozluk` içinde yalnızca `gorev` şeması, baştan sona kendine ait tablolar/yordamlar/rol (`gorev_sahip`, `gorev_kullanici`). Ayrı test veritabanı yok; geliştirme `SST_Ozluk`'ta `gorev.*` ile sürer (gerçek Özlük verisi aynı veritabanında!). Önlemler: `docs/SQL.md` §5 (ORTAM bayrağı, `gorev_sifirla.sql`/`gorev_kaldir.sql` yalnızca gorev nesneleri, dbo koruma denetimi, ilk kurulumdan önce tam yedek).
- Kimlik: Windows kimliği; bağlantı Özlük'teki `NT AUTHORITY\Authenticated Users` girişinden. Görevlendirme erişimi `gorev` tablolarındaki kayıttan gelir (kadro + bölüm eşleştirme + kişi bazlı istisna); kayıtsız/pasif kişi hiçbir veri göremez. İşlemi yapanı sunucu yazar (`ORIGINAL_LOGIN()`), istemci kullanıcı adı göndermez.
- Kadro: `gorev.personel`, Özlük `dbo.personeller`'in beş alanlık kopyasıdır; yalnızca `gorev.sp_ozluk_esitle` yazar. Bunu Özlük'te yönetici/tüm kurum kapsamlı biri çalıştırır (Özlük satır düzeyi güvenliği çağıranın kapsamıyla sınırlar; `EXECUTE AS OWNER` bunu değiştirmez). Okunan satır sayısı eşiğin altındaysa iptal; hiçbir şey silinmez, ayrılanlar pasife alınır.
- Yazma: kullanıcı rolüne tablolara doğrudan yazma yok; yazma `WITH EXECUTE AS OWNER` yordamlarla (`gorev_sahip` sahibi; `dbo`'da hiçbir yetkisi yok). Yalnızca kadro eşitleme yordamı çağıran bağlamında çalışır (dbo okuması için), `dbo`'ya yazmaz.
- Atama çakışması: aynı gün ve aynı zaman diliminde (TAM/ÖÖ/ÖS) çakışmada sistem kendi başına karar vermez; yöneticiye seçim sunulur: vazgeç ya da "çakışan görevden çıkar ve yeni göreve ata" (çakışan görevin sorumlusuna bildirim + audit log). İzin ve rapor çakışması her zaman reddedilir.
- Rapor evrakı veritabanında (`varbinary(max)`); PDF/JPG/PNG, en fazla 10 MB.
- Eski `gorevlendirme.db` verisi (hangi personel hangi göreve gitti) taşınacak ve İLK dilimlerde (3b) alınacak; tavsiye listesi ve Ana Proje takibi bunsuz çalışmaz. Önce kuru çalıştırma raporu (`docs/TASIMA.md`).
- Arayüz ham SQL göndermez; C# tarafında adlandırılmış komutlar (`Bridge`). Arayüz exe içine gömülür, çalışma zamanı CDN/bağımlılığı yok.
- Adlandırma: Türkçe küçük harf `snake_case` (ortak yapıya uygun); `docs/SQL.md`'deki harita 02 numaralı dokümandaki adları karşılar.
- T-SQL'i sunucuya gelmeden sınayamazsın; "sınanmadı" diye işaretle. Ortamda .NET SDK yok: derleme ve testler GitHub Actions'ta.

## Çalışma düzeni
- `main`'e doğrudan push yok. Dal: `dilim-N-ad`. Kullanıcı Actions çıktısını (Artifacts) indirip dener, onaylarsa dal birleştirilir.
- Depoya veri, parola, fotoğraf, Excel, `.db`, bağlantı bilgisi KONMAZ (`.gitignore`). Sınama verisi uydurmadır.
- Kullanıcı Türkçe konuşur (Murat); yazışma, belge ve arayüz metinleri Türkçe.
- Eski araç (`personel-gorevlendirme-araci`) ayrı bir projedir; karıştırma. Yalnızca atama mantığı ve veri kaynağı olarak başvurulur.
