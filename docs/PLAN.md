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
| 3b | Eski veri: kuru çalıştırma raporu (aktarım rapordan sonra) | hayır | [~] dal `dilim-3b-eski-veri-rapor` |
| 4 | Talep (Proje Sorumlusu) | evet | [ ] |
| 5 | Atama (Yönetici), çakışma kararı | evet | [ ] |
| 6 | Haftalık matris | evet | [ ] |
| 7 | İzin ve rapor | evet | [ ] |
| 8 | Revize, iptal, ikame, devir | evet | [ ] |
| 9 | Analiz ve arşiv | evet | [ ] |
| 10 | Canlıya geçiş | evet | [ ] |
