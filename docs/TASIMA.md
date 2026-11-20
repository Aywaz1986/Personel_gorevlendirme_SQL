# Eski veri taşıma (`gorevlendirme.db` → `gorev.*`)

**Durum (19.11.2026):** Dilim 3b yalnız 1–2. adımı (kuru çalıştırma raporu) uygular: menüde **Eski veri** ekranı. Hedef tablolar (talep, atama, izin, rapor) Dilim 4–7'de geldiği için gerçek aktarım (3. adım) rapor incelendikten sonra, hedef tablolar varken yapılır. Okuma `Microsoft.Data.Sqlite` ile salt okunurdur; rapor ad/sicil maskelemeyi (varsayılan açık) destekler.

Neden erken (Dilim 3b): "hangi personel hangi göreve gitti" bilgisi ilk talepten itibaren gerekir (sistem tavsiye listesi, Ana Proje takibi, sorumlunun geçmişi). Taşınmazsa gelen talepler elle uğraştırır.
Kapsam dışı: fazla mesai, yıllık izin tabloları (`fazla_mesai`, `izin_fm_hareket`, `yillik_izin_*`) taşınmaz.

## Kaynak (eski araç, SQLite)
`personel`, `projeler` (`parentId` ağacı, `lokasyon`), `sorumlular`, `haftalar` (`haftaBaslangic`), `atamalar` (`personelId`, `gunler` JSON pzt..paz, `durum` görevli/izinli/raporlu/müsait, `projeId`, `projeAdi`, `gorevMetni`, `sorumlu` metin).

## Yöntem
1. Exe'de yönetici ekranı "Eski veri" (denetim): `gorevlendirme.db` seçilir (salt okunur açılır).
2. **Kuru çalıştırma raporu** (hiçbir şey yazmaz): kayıt sayıları, personel eşleşmesi (eşleşen/eşleşmeyen ad listesi), proje ağacı önizlemesi, sorumlu metin eşleşmesi, uyarılar. Kullanıcı raporu inceler/gönderir; depoya veri girmez.
3. **Aktarım:** tek işlemde, her kayıt `kaynak='ESKI_ARAC'` ile işaretlenir (gerekirse yalnız bunlar kaldırılabilir).

## Eşleme kuralları (taslak, rapora göre kesinleşir)
| Eski | Yeni |
|---|---|
| `personel` (sicil) | `gorev.personel` ile `sicil_no` üzerinden eşleşir; sicil yoksa normalize ad (büyük/küçük, Türkçe karakter, çoklu boşluk); eşleşmeyen raporlanır, aktarılmaz |
| `projeler` ağacı | `proje_havuzu`: kök = Ana Proje, alt = Alt Proje, `lokasyon`/yerleşke = Konum; eksik seviyeler için varsayılan metin (rapor önizler); eski aktif/pasif bilgisi korunur |
| `atamalar` durum=görevli | geçmiş talep (`talep_kodu` `ESKI-<id>`, durum TAMAMLANDI) + `talep_gunleri` (her `gunler` günü için TAM) + `atamalar` (AKTIF, `eski_kayit`) |
| durum=izinli | `izin_talepleri` ONAYLANDI + `izin_gunleri` ONAYLI (TAM) |
| durum=raporlu | `raporlar` `eski_kayit=1`, evrak yok (kısıt: `eski_kayit=1 OR evrak IS NOT NULL`) |
| durum=müsait | kayıt açılmaz (müsaitlik türetilir) |
| `sorumlu` (metin) | `gorev.personel` ile ad eşleşirse `sorumlu_sicil_no`, yoksa metin olarak saklanır (`sorumlu_adi_eski`) |
| yarım gün | eski araçta yok; hepsi TAM |
Çakışma: eski araç aynı personel+gün çakışmasını önlediği için beklenmez; rapor çakışan kayıt bulursa raporlar.

## Açık noktalar
- Eski projelerde "Faaliyet" karşılığı yok (varsayılan metin).
- Eşleşmeyen personelin geçmişi (ayrılmış kişiler): `gorev.personel`'e "pasif, Özlük'te yok" kaydı mı açılsın? Rapordan sonra karar.
