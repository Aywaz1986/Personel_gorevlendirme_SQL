# Dilim 4 sınama listesi – Talep (Proje Sorumlusu)

Önkoşul: yeni exe (Actions Artifacts); en az bir Merkez Yönetici, bir Proje Sorumlusu (bölüm eşleştirmesi ya da kişi istisnası, **kadroda sicili olan**), bir Saha personeli; kadro eşitlenmiş. İsterseniz Yönetici ile havuza birkaç kayıt ekleyin.

| # | Kim | Yap | Beklenen |
|---|---|---|---|
| 1 | Sorumlu | Menü → **Görev Talep Arayüzü** | Boş liste "Henüz talep yok" ve **Yeni talep** düğmesi. Menüde yalnız bu sayfa vardır. |
| 2 | Sorumlu | Yeni talep → Ana Proje: Toroman, Alt Proje boş, Faaliyet: AY Kabul, Konum: Ankara İvedik | Havuzda yoksa altta "Havuzda olmayan ad(lar) yazıldı…" uyarısı; havuzda varsa yazdıkça öneri listesi gelir. |
| 3 | Sorumlu | Tarih 23.11.2026–27.11.2026, saat 07:30–16:35, günlük kişi 1 → **Günleri oluştur** | Pzt–Cum 5 satır (Tam gün, 1 kişi); hafta sonu satırı yok. Toplam "5 kişi-gün". |
| 4 | Sorumlu | Bir günü **Öğleden önce** yap, kişi 2 yap; bir günü **Kaldır** | Toplam kişi-gün güncellenir (ÖÖ/ÖS = 0,5 × kişi). |
| 5 | Sorumlu | Görev metni yaz; Önerilen personel kutusuna 2+ harf (ör. "Ahmet") yaz, çıkan kişiye bas | Kişi rozet olarak eklenir; × ile kaldırılır; kadroda olmayan/pasif kişi aramada çıkmaz. |
| 5b | Sorumlu | Formu doldururken sağdaki **Özet** kartına bak | 📍 Konum, 🕣 Saat (07.30 - 16.35), 📅 Tarih (ör. 23-27 Kasım 2026 - 5 gün), 📑 Proje, 📡 Faaliyet, 🙋‍♀️ Önerilen Personel, 🧍‍♂️ Proje sorumlusu yazdıkça güncellenir; Gönder/Taslak düğmeleri bu kartta, altında Kurallar notu. |
| 6 | Sorumlu | **Taslak olarak kaydet** | "TLP-NNNN taslak olarak kaydedildi"; listede **Taslak** rozeti. |
| 7 | Sorumlu | Taslakta **Revize** → bir şey değiştir → **Talebi gönder** | Aynı kod korunur; rozet **Onay bekliyor**; günler/öneriler yeni halini gösterir. |
| 8 | Sorumlu | Yeni talepte tarih aralığına bir tatil günü (Akademik takvimde TAM kayıtlı) dahil et | "Günleri oluştur" o günü atlar ve "Tatil nedeniyle atlanan: …" notu çıkar. **Tek gün ekle** ile elle eklenirse kayıtta uyarı döner (engellenmez). Cumartesi elle eklenince "hafta sonuna denk geliyor" uyarısı. |
| 9 | Sorumlu | Bir talepte **Kopyala** | Aynı proje/saat/metin/öneriyle yeni form açılır, **günler boş**; kaydedince yeni kod alır. |
| 10 | Sorumlu | **Geri çek** (onay sorusuna Evet) | Rozet **Geri çekildi**; Revize/Geri çek düğmeleri kaybolur, **Kopyala** kalır. |
| 11 | Sorumlu | Yeni talepte Ana Proje boş / saat ters / günsüz gönder | Anlamlı hata mesajı (örn. "Ana Proje, Faaliyet ve Konum boş olamaz", "Saat aralığı geçersiz", "En az bir gün ekleyin"). |
| 12 | Sorumlu #2 | Başka Sorumlu'nun talebini görmeye çalış | Listede yalnız kendi talepleri görünür. |
| 13 | Yönetici | Menü → **Talepler** | Tüm talepler; her kartta talep sahibinin adı görünür. |
| 14 | Yönetici | Yeni talep → "Talep sahibi" aramasından bir Sorumlu seç → gönder | Talep seçilen kişi adına açılır; Sorumlu kendi listesinde görür. |
| 15 | Yönetici | Başka Sorumlu'nun talebinde Revize / Geri çek | Çalışır (vekâleten). |
| 16 | Yönetici | Proje havuzu ekranına bak | Talepten gelen yeni adlar (Toroman › Genel › AY Kabul › Ankara İvedik) görünür; birleştirme/pasife alma çalışır. Pasife alınmış bir adla talep açmayı dene → "havuzda pasif" hatası. |
| 17 | Saha | Menü | "Görevlerim" (yer tutucu); talep ekranı yok. |
| 18 | SSMS (yönetici) | `SELECT TOP 20 * FROM gorev.islem_log ORDER BY id DESC` | TALEP_GONDER / TALEP_KAYDET / TALEP_GERI_CEK ve HAVUZ_EKLE satırları, işlemi yapan kişiyle. |
| 19 | SSMS | `SELECT * FROM gorev.talepler; SELECT * FROM gorev.talep_gunleri;` | Beklenen satırlar; `kod` TLP-NNNN; saat TIME(0). `dbo` parmak izi (tools/sql/dbo_iz.sql) öncesi/sonrası aynı. |

Bilinen sınır: onaylanmış/atanmış talepte revize ve iptal Dilim 8'dedir; onay/ret ve atama Dilim 5'tedir (bu dilimde rozetler yalnız Taslak / Onay bekliyor / Geri çekildi görünür).
