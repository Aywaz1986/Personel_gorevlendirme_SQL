# Dilim 32 sınama listesi

1. **Yönetici – süre uzat:** 2 günlük, atanmış (ör. Ahmet) görevi aç → Revize → Yeni son tarih'i 3 gün ileri al → "Revizeyi uygula". Beklenen: bildirimde "3 atama yeni günlere otomatik yapıldı"; Haftalık Özet'te Ahmet yeni günlerde görünür.
2. **Hafta sonu:** Cuma biten görevi Pazartesiye uzat. Beklenen: cumartesi/pazar/pazartesi atamaları da oluşur.
3. **İzin çakışması:** Ahmet'in onaylı iznine denk gelen güne uzat. Beklenen: o gün atanmaz, bildirimde "1 atama yapılamadı", görev "Kısmen atandı".
4. **Başka görev:** Ahmet uzatılan günde başka görevde. Beklenen: o gün atanmaz, diğer görevden çıkarılmaz.
5. **Kapasite:** Yeni günlerde kişi sayısı 1 iken görevde 2 kişi var. Beklenen: ilk kişi atanır, diğeri "yapılamadı"da sayılır.
6. **Saha bildirimi:** Ahmet'in hesabı → bildirimlerde "görevi uzatıldı; yeni günlere atandınız".
7. **Sorumlu revizesi:** Sorumlu uzatma ister, Yönetici onaylar. Beklenen: onayda aynı otomatik atama çalışır.
8. **Tarih seçici:** Revize > Yeni son tarih, İzin/Rapor, Analiz, Matris, Takvim, Ayarlar, İkame tarihi: her tarih kutusunun yanında 📅 görünür; seçince GG.AA.YYYY yazılır.
9. **Denetim:** `python3 tools/arayuz_denetim.py` → 0 hata.
