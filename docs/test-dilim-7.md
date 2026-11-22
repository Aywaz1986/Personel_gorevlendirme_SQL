# Dilim 7 – El sınaması (izin ve rapor)

Ön koşul: `009_izin_rapor.sql` uygulanmış (uygulama açılışında otomatik). En az bir Yönetici, bir Sorumlu, bir Saha kişisi.

| # | Kim | Ne yapar | Beklenen |
|---|---|---|---|
| 1 | Saha | Menüden **Görevlerim**'i açar | Önümüzdeki 90 gün/geçmiş 14 gündeki kendi görevleri listelenir; izin ve rapor formları görünür |
| 2 | Saha | İzin talebi: tür, 07.12.2026–11.12.2026, **Talebi gönder** | "Yönetici onayı bekleniyor"; listede IZN-nnnn *Onay bekliyor* |
| 3 | Saha | Aynı talepte **Geri çek** | Durum *Geri çekildi* |
| 4 | Saha | Geçmiş tarihli izin dener | Reddedilir (hata mesajı) |
| 5 | Yönetici | **İzin ve rapor**: bekleyen izni görür (bildirim bandı + liste) | Bekleyen sayısı yazar |
| 6 | Yönetici | **Reddet…** nedensiz dener, sonra nedenle | Nedensiz hata; nedenle *Reddedildi*, kişiye bildirim |
| 7 | Yönetici | Aynı günlerde atanmış kişinin izni için **Onayla** | Çakışma kutusu çıkar: Vazgeç / Çakışan görevden çıkar |
| 8 | Yönetici | **Çakışan görevden çıkar…** seçer | İzin onaylanır; kişi o günlerde görevden çıkar, görev sorumlusuna bildirim gider, talep durumu yeniden hesaplanır |
| 9 | Yönetici | Onaylı izinli kişiyi Atama ekranında o güne atamaya çalışır | Atama reddedilir ("izinli/raporlu") |
| 10 | Yönetici | İzin ekranında **Vekaleten** kişi seçip izin kaydeder | Anında *Onaylandı*, "vekaleten" yazar; çakışma varsa karar sorulur |
| 11 | Yönetici | Onaylı izinde **Kısalt…** ile yeni son gün | İzin kısalır; hiç gün kalmazsa *Geri çekildi* |
| 12 | Saha | Rapor: tarih aralığı, **Evrak seç…** (PDF), **Raporu kaydet** | RPR-nnnn *Geçerli*; evrak adı ve boyutu görünür |
| 13 | Saha | Evraksız ya da .exe/10 MB üstü evrak dener | Reddedilir |
| 14 | Saha | Aralıkta kendi onaylı izni varsa | İzin günleri iptal olur (rapor kazanır) |
| 15 | Yönetici | Raporlu kişinin görevi varsa | Görev durur (AKTIF kalır), Yöneticiye "ikame gerekli" bildirimi; rapor satırında ⚠ uyarı |
| 16 | Saha | **Evrakı kaydet** | Kayıt penceresi; dosya orijinaliyle aynı |
| 17 | Yönetici | Raporda **İptal et…** (nedenli) | Rapor *İptal*; o günlere atama yeniden yapılabilir |
| 18 | Herkes | **Haftalık matris** | İzin: gri blok (kesikli = onay bekliyor), rapor: kırmızı blok; yarım gün izin ilgili yarıda |
| 19 | Saha | Başkasının raporunu/evrakını görmeyi dener | Göremez (yalnız kendi kayıtları gelir) |
