# Gorevlendirme.App – plan ve durum

Durum işaretleri: [ ] bekliyor · [~] kodlandı, sınanmadı · [x] sınandı ve birleştirildi · [!] engelli

## Dış bağımlılıklar
- [ ] IT: ilk kurulumdan önce `SST_Ozluk` tam yedeği (gerçek Özlük verisi aynı veritabanında)
- [x] Özlük şeması ve rolleri hazır (`SST_Ozluk`, `ozluk_kullanici`, `dbo.sp_ben`)
- [ ] Kullanıcı: eski `gorevlendirme.db` ile kuru çalıştırma raporu (Dilim 3b)
- [ ] Kullanıcı: iş akışı dokümanlarındaki (01, 02) iş kuralı farkları için gerektikçe onay

## Kararlar (özet; tam liste CLAUDE.md)
dbo.* dokunulmaz · `SST_Ozluk` içinde `gorev` şeması · FM ve yıllık izin yok · çakışmada yönetici seçer · rapor evrakı veritabanında · eski veri erken taşınır · kılavuz güncel tutulur.

## Dilimler
Ayrıntı: `docs/DILIMLER.md`.

| # | Dilim | SQL gerekir | Durum |
|---|---|---|---|
| 0 | İskelet, belgeler, dbo koruma denetimi | hayır | [x] birleştirildi (PR #1); `main` CI yeşil (ilk koşuda checkout "Repository not found" geçici hatası, yeniden çalıştırmada geçti) |
| 1 | Şema çekirdeği, ORTAM, kaldır/sıfırla, Migrator, kabuk | evet | [x] birleştirildi (PR #2), testler geçti |
| 2 | Kimlik, kadro eşitleme, ilk arayüz, kılavuz aracı | evet | [x] birleştirildi (PR #3) |
| 3 | Proje havuzu, akademik takvim | evet | [x] birleştirildi (PR #4) |
| 3b | Eski veri: kuru çalıştırma raporu (aktarım rapordan sonra) | hayır | [x] birleştirildi (PR #5, #6) |
| 4 | Talep (Proje Sorumlusu) | evet | [~] dal `dilim-4-talep` (kodlandı; CI/el sınaması bekliyor) |
| 5 | Atama (Yönetici), çakışma kararı | evet | [~] dal `dilim-5-atama` (kodlandı; CI/el sınaması bekliyor) |
| 6 | Haftalık matris | evet | [~] dal `dilim-6-matris` (kodlandı; CI/el sınaması bekliyor) |
| 7 | İzin ve rapor | evet | `[~]` kodlandı, CI/el sınaması bekliyor |
| 8 | Revize, iptal, ikame, devir | evet | [~] kodlandı, CI/el sınaması bekliyor |
| 9 | Analiz ve arşiv | evet | [~] kodlandı, CI/el sınaması bekliyor |
| 10 | Canlıya geçiş | evet | [~] kodlandı, CI/el sınaması bekliyor |
| 11 | Senaryo tamamlama | evet | [~] kodlandı, CI/el sınaması bekliyor |
| 12 | Senaryo eksikleri + Ayarlar | evet | [~] kodlandı, CI/el sınaması bekliyor |
| 13 | Gizli bağlantı yapılandırması + yüzen bağlantı penceresi | evet | [~] kodlandı, CI/el sınaması bekliyor |
| 14 | Yeni arayüz tasarımı (rol düğmeleri, sekme şeridi, talep kartı, Kullanıcı Yetki, yazı/tema/cam) | evet | [~] kodlandı, CI/el sınaması bekliyor |
| 15 | Akademik takvim yönetimi (Yıllık İzin/Resmi Tatil/Yarım Gün, Excel tarama + tür seçimi, yıllık çizelge) + Proje/Görev Havuzu merkezî panel (kademeli liste, arşiv) | evet | [~] kodlandı, CI/el sınaması bekliyor |
