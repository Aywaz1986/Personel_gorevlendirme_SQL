# Dilim 12 – El sınaması (senaryo eksikleri, Ayarlar, rol bazlı listeler)

Ön koşul: `014_senaryo_eksikleri.sql` uygulanmış (açılışta otomatik). Önce yedek alın. T-SQL sunucuda sınanmadı; CI SQL testleri var.

| # | Kim | Ne yapar | Beklenen |
|---|---|---|---|
| 1 | Yönetici | Menü | Kadro, Bölüm–rol, Kişi istisna, Eski veri, Sistem ayrı menü değil; **Ayarlar** sekmeleri içinde |
| 2 | Herkes | Ayarlar › Görünüm: yazı boyutu, tablo yazısı, yazı tipi, tema | Anında uygulanır; uygulama kapanıp açılınca korunur; "Varsayılana dön" çalışır |
| 3 | Yönetici | Ayarlar › İşlem günlüğü; tarih/işlem/metin süzgeci | Hesap, ad soyad, işlem, nesne, ayrıntı görünür; Sorumlu/Saha bu sekmeyi görmez |
| 4 | Yönetici | Rol eşleştirme'de bir bölümü SAHA yapar | Talep formundaki "Önerilen personel" listesinde o bölümün kişileri çıkar |
| 5 | Yönetici | Kişiyi Kullanıcılar ve yetkiler'de Sorumlu yapar | Yönetici vekâleten talep açarken talep sahibi listesinde görünür; Saha-only kişi görünmez |
| 6 | Sorumlu | Talep formu, "Önerilen personel" kutusuna tıklar | Yalnız Saha rolündeki personel listelenir (ad yazınca süzülür) |
| 7 | Yönetici | Atanmış kişili talepte kişi sayısını 2→1 düşüren revize bekler; Onayla | "Çıkarılacak kişileri seçin" kutusu; seçilen çıkar, revize uygulanır, çıkarılana bildirim gider |
| 8 | Yönetici | Aynı revizede seçim yapmadan onaylamayı dener | Sunucu reddeder (fazla atama) |
| 9 | Sorumlu/Yönetici | Revizeyle gün ekler; revize kartına bakar | "Eklenen günlerde atanmış kişilerin durumu": raporlu/izinli/başka görevde/müsait |
| 10 | Yönetici | İzin ve rapor › raporda **Tarihi düzelt…** | Yeni tarihler kaydedilir; yeni aralıktaki izin günleri iptal; çakışan atama uyarısı; başka raporla çakışırsa red |
| 11 | Yönetici | Analiz › Proje kırılımı; Excel | Ana → Alt → Yerleşke → Personel adam-gün ara toplamlarıyla; Excel aynı |
| 12 | Sorumlu | Analiz › Proje kırılımı | Yalnız kendi talepleri |
| 13 | Yönetici | Matris › Personel süzgeci = Sadece müsaitler | Hafta içinde boş yarım günü olan aktif personel; tamamen dolu kişi görünmez |
| 14 | Yönetici | Talepler sayfası üst şeridi | Bekleyen Görev Talepleri / İzin Onayları / Revize Talepleri / Rapor Kaynaklı İkame ayrı sayaçlar; İzin Onayları izin sayfasına götürür |
| 15 | Saha | Menü | Matris, Görevlerim, Ayarlar (yalnız Görünüm) |
