# Dilim 5 sınama listesi – Atama (Yönetici)

Önkoşul: Dilim 4 sınaması yapılmış; kadroda en az 6 aktif kişi; bir Yönetici, bir Proje Sorumlusu (kadroda sicili olan), bir Saha personeli. Sorumlu ile birkaç talep gönderilmiş (ONAY_BEKLIYOR).

| # | Kim | Yap | Beklenen |
|---|---|---|---|
| 1 | Yönetici | Menü → Talepler | Menüde artık "Atama paneli (yakında)" yok. Onay bekleyen kartlarda **Ata** düğmesi var; ayrıca Reddet panel içinde. |
| 2 | Yönetici | Bir talepte **Ata** | Panel açılır: solda gün/dilim tablosu (atanan/istenen), altta adaylar, sağda Talep özeti (📍🕣📅📑📡🙋‍♀️🧍‍♂️) ve Karar kartı. |
| 3 | Yönetici | Adaylara bak | Önerilen kişi en üstte "Önerilen" rozetiyle; o Ana Projede önceden çalışanlar sonra ("… projesinde N kez çalıştı"); çakışması olana "Çakışma: N gün", yoksa "Müsait". Pasif kişi görünmez. Üstteki kutuyla ad aranır. |
| 4 | Yönetici | Tablodan 1–2 satırı işaretle → bir adayda **Seçili günlere ata** | Seçimler "(bekliyor)" olarak satıra düşer, Karar kartında listelenir; × ile kaldırılır. Dolu satırın kutusu pasiftir. |
| 5 | Yönetici | **Atamayı onayla** (kısmi) | "N kişi-gün atandı (Kısmen atandı)"; listede rozet **Kısmen atandı**, kartta "atanan 1/3". |
| 6 | Yönetici | Aynı talepte Ata → kalan boşlukları doldur → onayla | Rozet **Tamamen atandı**; artık Ata düğmesi yok. |
| 7 | Sorumlu | Taleplerim | Bildirim bandı: "TLP-… kişi-gün ataması yapıldı". **Atananlar** düğmesi gün gün isimleri gösterir. **Tümünü okundu say** bandı kaldırır. |
| 8 | Yönetici | İki talebe aynı kişiyi aynı güne (tam gün) atamaya çalış (2. talepte) | **Çakışma kararı** kutusu: kişi, gün, çakışan talep kodu ve sorumlusu; **Vazgeç** ve **Çakışan görevden çıkar ve bu göreve ata**. Hiçbir şey yazılmamıştır. |
| 9 | Yönetici | **Vazgeç** | Kutu kapanır, seçimler korunur, kayıt yok. |
| 10 | Yönetici | Aynı yeniden dene → **Çakışan görevden çıkar ve bu göreve ata** | Atama yapılır; ilk talep eksilir (rozeti Onay bekliyor/Kısmen olur); ilk talebin sorumlusunda bildirim: "… görevden çıkarıldı". |
| 11 | Yönetici | Aynı kişiye aynı güne ÖÖ talebinde ÖÖ, başka talepte ÖS ata | Çakışma çıkmaz (ÖÖ ile ÖS örtüşmez). Tam gün ile ÖÖ/ÖS ise çakışır. |
| 12 | Yönetici | İstenenden fazla kişi seç (aynı dilim) | Sunucu "Bir gün/dilimde istenen kişi sayısı aşılıyor" der (arayüz zaten dolu satırı seçtirmez). |
| 13 | Yönetici | Onay bekleyen talepte **Reddet…** → nedeni boş bırakıp Reddet | "Ret nedeni zorunludur." |
| 14 | Yönetici | Neden yazıp Reddet | Rozet **Reddedildi**; Sorumlu kartında kırmızı "Ret nedeni: …" ve bildirim. |
| 15 | Yönetici | Atama başlamış (Kısmen atandı) talebi reddetmeye çalış | Reddet… düğmesi yok; zorlanırsa "Yalnızca onay bekleyen talep reddedilir". |
| 16 | Sorumlu / Saha | Atama komutunu çalıştırma | Menüde zaten yok; SSMS ile `EXEC gorev.sp_atama_onayla …` denenirse yetki hatası. |
| 17 | Yönetici | Tatil günü olan bir gün için ata | Atama yapılır, toast'ta "N gün tatil/kapalı gün kaydıyla çakışıyor." uyarısı. |
| 18 | SSMS | `SELECT * FROM gorev.atamalar; SELECT TOP 20 * FROM gorev.islem_log ORDER BY id DESC;` | Çıkarılan satır `CIKARILDI` (kim, ne zaman, nedeni); TALEP_ATAMA / ATAMA_CIKAR / TALEP_RED log satırları. |
| 19 | SSMS | `dbo` parmak izi (tools/sql/dbo_iz.sql) öncesi/sonrası | Aynı. |

Bilinen sınırlar: izin/rapor çakışması Dilim 7'de eklenir; atamanın geri alınması, personel değiştirme, erken bitiş Dilim 8'dedir; haftalık matris Dilim 6'dadır.
