# Kılavuz ekran görüntüleri. Önce: cd ui-src && python3 build.py /tmp/gorev_idx.html
# Sahte (MOCK) WebView2 köprüsüyle çalışır; veriler uydurmadır.
import os, json
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
D = os.path.join(HERE, 'shots') + os.sep
os.makedirs(D, exist_ok=True)

KADRO = [
  {"sicilNo": "1001", "adiSoyadi": "Örnek Personel 1", "bolum": "Örnek Bölüm A", "kullaniciAdi": "ornek.p1", "rol": "SORUMLU", "aktif": True},
  {"sicilNo": "1002", "adiSoyadi": "Örnek Personel 2", "bolum": "Örnek Bölüm B", "kullaniciAdi": "ornek.p2", "rol": "SAHA", "aktif": True},
  {"sicilNo": "1003", "adiSoyadi": "Örnek Personel 3", "bolum": "Örnek Bölüm D", "kullaniciAdi": "ornek.p3", "rol": None, "aktif": True},
  {"sicilNo": "0987", "adiSoyadi": "Örnek Personel 4", "bolum": "Örnek Bölüm B", "kullaniciAdi": None, "rol": None, "aktif": False},
]
VERI = {
  "baglantiDene": {"kayit": True, "bagli": True, "kaynak": "ortak", "sunucu": "ORNEKSUNUCU,1433", "veritabani": "SST_Ozluk"},
  "baglantiBilgi": {"kayit": True, "kaynak": "ortak", "pencere": None},
  "varsayilanBaglantiDurum": {"mevcut": True, "yol": "C:\\Uygulama\\Gorevlendirme.baglanti.json", "sunucu": "ORNEKSUNUCU,1433", "veritabani": "SST_Ozluk", "ozlukDosyasi": False},
  "surumDurum": {"durum": "tamam", "mesaj": "Sürüm uyumlu.", "engelle": False, "uygulama": "0.1.0", "hedefSema": 3, "sema": 3, "asgari": "0.1.0", "ortam": "TEST", "hesap": "ALAN\\ornek.yonetici", "pollingSaniye": 20},
  "kadroOzet": {"toplam": 4, "aktif": 3, "sonZaman": "2026-11-16T14:20:00", "sonKullanici": "ALAN\\ornek.yonetici", "sonAyrinti": json.dumps({"okunan": 4, "eklenen": 1, "guncellenen": 2, "pasife_alinan": 1, "degismeyen": 0})},
  "kadroListe": KADRO,
  "eslestirmeListe": [{"bolum": "Örnek Bölüm A", "rol": "SORUMLU", "kisi": 14}, {"bolum": "Örnek Bölüm B", "rol": "SAHA", "kisi": 120}, {"bolum": "Örnek Bölüm D", "rol": None, "kisi": 9}],
  "havuzEfor": [{"id": 1, "adamGun": 12.5}, {"id": 2, "adamGun": 9.0}, {"id": 3, "adamGun": 9.0}, {"id": 4, "adamGun": 9.0}, {"id": 5, "adamGun": 3.5}, {"id": 6, "adamGun": 0.5}],
  "havuzListe": [
    {"id": 1, "ustId": None, "seviye": 1, "ad": "Örnek Ana Proje A", "aktif": True, "birlestirildiId": None, "arsiv": False, "arsivNeden": None},
    {"id": 2, "ustId": 1, "seviye": 2, "ad": "Örnek Alt Proje 1", "aktif": True, "birlestirildiId": None, "arsiv": False, "arsivNeden": None},
    {"id": 3, "ustId": 2, "seviye": 3, "ad": "Örnek Faaliyet", "aktif": True, "birlestirildiId": None, "arsiv": False, "arsivNeden": None},
    {"id": 4, "ustId": 3, "seviye": 4, "ad": "Örnek Yerleşke", "aktif": True, "birlestirildiId": None, "arsiv": False, "arsivNeden": None},
    {"id": 5, "ustId": 1, "seviye": 2, "ad": "Örnek Alt Proje 2", "aktif": True, "birlestirildiId": None, "arsiv": False, "arsivNeden": None},
    {"id": 6, "ustId": None, "seviye": 1, "ad": "Örnek Ana Proje B", "aktif": True, "birlestirildiId": None, "arsiv": False, "arsivNeden": None},
    {"id": 7, "ustId": 3, "seviye": 4, "ad": "Örnek Yerleşke ", "aktif": True, "birlestirildiId": None, "arsiv": False, "arsivNeden": None},
    {"id": 8, "ustId": 3, "seviye": 4, "ad": "Örnek Salon", "aktif": False, "birlestirildiId": None, "arsiv": False, "arsivNeden": None},
    {"id": 9, "ustId": 3, "seviye": 4, "ad": "Eski Konum", "aktif": True, "birlestirildiId": 4, "arsiv": False, "arsivNeden": None},
  ],
  "talepAtananAdlar": [{"talepId": 1, "adlar": "Örnek Personel 2"}],
  "izinRaporBilgi": [{"sicil": "1006", "ad": "Örnek Personel 6", "gsm": "0532 666 66 66", "tur": "RAPOR", "ilkTarih": "2026-11-24", "sonTarih": "2026-11-27", "durum": "ONAYLI"}, {"sicil": "1007", "ad": "Örnek Personel 7", "gsm": "0532 777 77 77", "tur": "IZIN", "ilkTarih": "2026-11-26", "sonTarih": "2026-11-26", "durum": "BEKLIYOR"}],
  "matrisHafta": [{"sicil": "1002", "ad": "Örnek Personel 2", "bolum": "Örnek Bölüm B", "gsm": "0532 222 22 22", "hucreler": [{"tarih": "2026-11-23", "zaman": "TAM", "talepId": 1, "kod": "TLP-0001", "ana": "Örnek Ana Proje A", "alt": "Genel", "faaliyet": "Örnek Faaliyet", "konum": "Örnek Yerleşke", "saat": "07:30 - 16:35", "sorumluGsm": "0532 111 11 11", "sorumlu": "Örnek Personel 1"}, {"tarih": "2026-11-24", "zaman": "TAM", "talepId": 1, "kod": "TLP-0001", "ana": "Örnek Ana Proje A", "alt": "Genel", "faaliyet": "Örnek Faaliyet", "konum": "Örnek Yerleşke", "saat": "07:30 - 16:35", "sorumlu": "Örnek Personel 1"}, {"tarih": "2026-11-25", "zaman": "OO", "talepId": 1, "kod": "TLP-0002", "ana": "Örnek Ana Proje B", "alt": "Genel", "faaliyet": "Kayıt", "konum": "Salon", "saat": "07:30 - 16:35", "sorumlu": "Örnek Personel 1"}]}, {"sicil": "1004", "ad": "Örnek Personel 4", "bolum": "Örnek Bölüm B", "hucreler": [{"tarih": "2026-11-25", "zaman": "OO", "talepId": 1, "kod": "TLP-0001", "ana": "Örnek Ana Proje A", "alt": "Genel", "faaliyet": "Örnek Faaliyet", "konum": "Örnek Yerleşke", "saat": "07:30 - 16:35", "sorumlu": "Örnek Personel 1"}, {"tarih": "2026-11-25", "zaman": "OS", "talepId": 1, "kod": "TLP-0002", "ana": "Örnek Ana Proje B", "alt": "Genel", "faaliyet": "Kayıt", "konum": "Salon", "saat": "07:30 - 16:35", "sorumlu": "Örnek Personel 1"}, {"tarih": "2026-11-27", "zaman": "TAM", "talepId": 1, "kod": "TLP-0002", "ana": "Örnek Ana Proje B", "alt": "Genel", "faaliyet": "Kayıt", "konum": "Örnek Yerleşke", "saat": "07:30 - 16:35", "sorumlu": "Örnek Personel 1"}]}, {"sicil": "1005", "ad": "Örnek Personel 5", "bolum": "Örnek Bölüm C", "hucreler": [{"tarih": "2026-11-24", "zaman": "TAM", "talepId": 1, "kod": "TLP-0002", "ana": "Örnek Ana Proje B", "alt": "Genel", "faaliyet": "Kayıt", "konum": "Örnek Yerleşke", "saat": "07:30 - 16:35", "sorumlu": "Örnek Personel 1"}, {"tarih": "2026-11-26", "zaman": "TAM", "talepId": 1, "kod": "TLP-0001", "ana": "Örnek Ana Proje A", "alt": "Genel", "faaliyet": "Örnek Faaliyet", "konum": "Örnek Yerleşke", "saat": "07:30 - 16:35", "sorumlu": "Örnek Personel 1"}]}],
  "izinListe": [
    {"id": 1, "kod": "IZN-0001", "sicil": "1000", "ad": "Örnek Kullanıcı", "bolum": "Örnek Bölüm A", "durum": "ONAY_BEKLIYOR", "tur": "Yıllık izin", "aciklama": None, "vekaleten": None, "retNedeni": None, "ilkTarih": "2026-12-07", "sonTarih": "2026-12-11", "gunSayisi": 5, "cakisanAtama": 0, "gunler": []},
    {"id": 2, "kod": "IZN-0002", "sicil": "1000", "ad": "Örnek Kullanıcı", "bolum": "Örnek Bölüm A", "durum": "ONAYLANDI", "tur": "Mazeret izni", "aciklama": "Örnek", "vekaleten": None, "retNedeni": None, "ilkTarih": "2026-11-26", "sonTarih": "2026-11-26", "gunSayisi": 1, "cakisanAtama": 0, "gunler": [{"tarih": "2026-11-26", "zaman": "OS", "durum": "ONAYLI"}]},
  ],
  "raporListe": [
    {"id": 1, "kod": "RPR-0001", "sicil": "1000", "ad": "Örnek Kullanıcı", "bolum": "Örnek Bölüm A", "ilkTarih": "2026-11-16", "sonTarih": "2026-11-18", "aciklama": None, "durum": "AKTIF", "evrakAdi": "rapor.pdf", "evrakTur": "application/pdf", "evrakBoyut": 184320, "eskiKayit": False, "vekaleten": None, "iptalNedeni": None, "cakisanAtama": 0},
  ],
  "gorevlerim": [
    {"tarih": "2026-11-24", "zaman": "TAM", "talepId": 1, "kod": "TLP-0001", "ana": "Örnek Ana Proje A", "alt": "Örnek Alt Proje 1", "faaliyet": "Örnek Faaliyet", "konum": "Örnek Yerleşke", "saat": "07:30 - 16:35", "sorumlu": "Örnek Personel 2", "gorevMetni": "Örnek"},
    {"tarih": "2026-11-25", "zaman": "OO", "talepId": 1, "kod": "TLP-0001", "ana": "Örnek Ana Proje A", "alt": "Örnek Alt Proje 1", "faaliyet": "Örnek Faaliyet", "konum": "Örnek Yerleşke", "saat": "07:30 - 12:30", "sorumlu": "Örnek Personel 2", "gorevMetni": "Örnek"},
  ],
  "revizeListe": [{"id": 1, "kod": "REV-0001", "talepId": 3, "talepKod": "TLP-0003", "durum": "BEKLIYOR", "isteyen": "Örnek Personel 1", "neden": "Ek personel gerekti", "gorevMetni": None, "nitelik": None, "saatBaslangic": None, "saatBitis": None, "gunler": [{"tarih": "2026-11-23", "zaman": "TAM", "kisi": 3}], "tarih": "2026-11-21T10:00:00", "retNedeni": None}],
  "sorumluDevirListe": [],
  "analizAnaProjeler": ["Örnek Ana Proje A", "Örnek Ana Proje B"],
  "analizProje": [
    {"ana": "Örnek Ana Proje A", "alt": "Örnek Alt Proje 1", "faaliyet": "Örnek Faaliyet", "adamGun": 7.5, "kisi": 3, "gun": 5, "talep": 2, "ilk": "2026-11-02", "son": "2026-11-13"},
    {"ana": "Örnek Ana Proje A", "alt": "Genel", "faaliyet": "Örnek Faaliyet 2", "adamGun": 2.0, "kisi": 1, "gun": 2, "talep": 1, "ilk": "2026-11-16", "son": "2026-11-17"},
    {"ana": "Örnek Ana Proje B", "alt": "Genel", "faaliyet": "Örnek Faaliyet", "adamGun": 5.0, "kisi": 2, "gun": 5, "talep": 1, "ilk": "2026-11-09", "son": "2026-11-13"},
  ],
  "matrisSurum": {"surum": "1-7"},
  "matrisBolumler": ["Örnek Bölüm A", "Örnek Bölüm B", "Örnek Bölüm C"],
  "atamaAdaylar": [
    {"sicil": "1002", "ad": "Örnek Personel 2", "bolum": "Örnek Bölüm B", "onerildi": True, "gecmis": 6, "buTalepte": 0, "cakisanGun": 1},
    {"sicil": "1004", "ad": "Örnek Personel 4", "bolum": "Örnek Bölüm B", "onerildi": False, "gecmis": 3, "buTalepte": 0, "cakisanGun": 0},
    {"sicil": "1005", "ad": "Örnek Personel 5", "bolum": "Örnek Bölüm C", "onerildi": False, "gecmis": 0, "buTalepte": 0, "cakisanGun": 0},
  ],
  "talepGetir": {"id": 3, "kod": "TLP-0003", "durum": "ONAY_BEKLIYOR", "sorumluSicil": "1001", "sorumluAdi": "Örnek Personel 1", "ana": "Örnek Ana Proje A", "alt": "Genel", "faaliyet": "Örnek Faaliyet", "konum": "Örnek Yerleşke", "gorevMetni": "Örnek görev açıklaması.", "nitelik": None, "saatBaslangic": "07:30", "saatBitis": "16:35", "retNedeni": None,
    "gunler": [{"tarih": "2026-11-23", "zaman": "TAM", "kisi": 2, "atananlar": [{"id": 1, "sicil": "1004", "ad": "Örnek Personel 4"}]}, {"tarih": "2026-11-24", "zaman": "TAM", "kisi": 2, "atananlar": []}, {"tarih": "2026-11-25", "zaman": "OO", "kisi": 1, "atananlar": []}],
    "oneri": [{"sicil": "1002", "ad": "Örnek Personel 2"}]},
  "bildirimListe": [],
  "personelAra": [{"sicil": "1002", "ad": "Örnek Personel 2", "bolum": "Örnek Bölüm B"}],
  "talepListe": [
    {"id": 3, "kod": "TLP-0003", "durum": "ONAY_BEKLIYOR", "sorumluSicil": "1001", "sorumluAdi": "Örnek Personel 1", "ilkTarih": "2026-11-23", "sonTarih": "2026-11-27", "ana": "Örnek Ana Proje A", "alt": "Genel", "faaliyet": "Örnek Faaliyet", "konum": "Örnek Yerleşke", "gorevMetni": "Örnek görev açıklaması.", "nitelik": None, "saatBaslangic": "07:30", "saatBitis": "16:35", "gunSayisi": 5, "kisiGun": 5.0, "oneri": "Örnek Personel 2", "guncelleme": "2026-11-20 10:00"},
    {"id": 2, "kod": "TLP-0002", "durum": "TAMAMEN_ATANDI", "sorumluSicil": "1001", "sorumluAdi": "Örnek Personel 1", "ilkTarih": "2026-11-16", "sonTarih": "2026-11-20", "ana": "Örnek Ana Proje B", "alt": "Genel", "faaliyet": "Örnek Faaliyet", "konum": "Örnek Yerleşke", "gorevMetni": "Örnek ikinci görev.", "nitelik": None, "saatBaslangic": "08:00", "saatBitis": "17:00", "gunSayisi": 5, "kisiGun": 10.0, "oneri": None, "guncelleme": "2026-11-13 09:00"},
    {"id": 1, "kod": "TLP-0001", "durum": "GERI_CEKILDI", "sorumluSicil": "1001", "sorumluAdi": "Örnek Personel 1", "ilkTarih": "2026-11-09", "sonTarih": "2026-11-09", "ana": "Örnek Ana Proje A", "alt": "Örnek Alt Proje 1", "faaliyet": "Örnek Faaliyet", "konum": "Örnek Yerleşke", "gorevMetni": "Geri çekilen örnek.", "nitelik": None, "saatBaslangic": "07:30", "saatBitis": "16:35", "gunSayisi": 1, "kisiGun": 1.0, "oneri": None, "guncelleme": "2026-11-05 15:30"},
  ],
  "takvimListe": [
    {"id": 1, "baslangic": "2024-04-08", "bitis": "2024-04-08", "zaman": "TAM", "tur": "IDARI", "ad": "İdari izin", "yillik": True, "gun": 1, "kesilen": 1},
    {"id": 2, "baslangic": "2024-04-09", "bitis": "2024-04-09", "zaman": "OS", "tur": "RESMI", "ad": "Ramazan Bayramı arifesi", "yillik": False, "gun": 0.5, "kesilen": 0},
    {"id": 3, "baslangic": "2024-04-10", "bitis": "2024-04-12", "zaman": "TAM", "tur": "RESMI", "ad": "Ramazan Bayramı", "yillik": False, "gun": 3, "kesilen": 0},
    {"id": 4, "baslangic": "2024-05-01", "bitis": "2024-05-01", "zaman": "TAM", "tur": "RESMI", "ad": "Emek ve Dayanışma Günü", "yillik": False, "gun": 1, "kesilen": 0},
    {"id": 5, "baslangic": "2024-06-15", "bitis": "2024-06-21", "zaman": "TAM", "tur": "RESMI", "ad": "Kurban Bayramı", "yillik": False, "gun": 7, "kesilen": 0},
  ],
  "takvimOzet": {"kayit": 5, "resmiGun": 11.5, "idariGun": 1, "kesilenGun": 1},
  "takvimMetinOku": {"satirlar": [
    {"sira": 5, "baslangic": "2024-05-01", "bitis": "", "zaman": "TAM", "tur": "RESMI", "ad": "Emek ve Dayanışma Günü", "yillik": False},
    {"sira": 6, "baslangic": "2024-04-08", "bitis": "", "zaman": "TAM", "tur": "IDARI", "ad": "İdari izin", "yillik": True},
    {"sira": 7, "baslangic": "2024-04-10", "bitis": "2024-04-12", "zaman": "TAM", "tur": "RESMI", "ad": "Ramazan Bayramı", "yillik": False},
    {"sira": 8, "baslangic": "2024-02-30", "bitis": "", "zaman": "TAM", "tur": "RESMI", "ad": "Bozuk tarihli satır", "yillik": False},
  ], "yil": 2024, "mod": "STANDART"},
  "takvimOnizle": [
    {"sira": 5, "baslangic": "2024-05-01", "bitis": "2024-05-01", "zaman": "TAM", "tur": "RESMI", "ad": "Emek ve Dayanışma Günü", "yillik": False, "gun": 1, "durum": "AYNI", "hata": None},
    {"sira": 6, "baslangic": "2024-04-08", "bitis": "2024-04-08", "zaman": "TAM", "tur": "IDARI", "ad": "İdari izin", "yillik": True, "gun": 1, "durum": "AYNI", "hata": None},
    {"sira": 7, "baslangic": "2024-04-10", "bitis": "2024-04-12", "zaman": "TAM", "tur": "RESMI", "ad": "Ramazan Bayramı", "yillik": False, "gun": 3, "durum": "GUNCELLE", "hata": None},
    {"sira": 8, "baslangic": "2024-02-30", "bitis": "", "zaman": "TAM", "tur": "RESMI", "ad": "Bozuk tarihli satır", "yillik": False, "gun": None, "durum": "HATA", "hata": "Tarih okunamadı."},
  ],
  "canliKontrol": [
    {"sira": 1, "kontrol": "Ortam şu an TEST", "zorunlu": True, "tamam": True, "ayrinti": "ORTAM = TEST"},
    {"sira": 2, "kontrol": "En az bir aktif Merkez Yönetici", "zorunlu": True, "tamam": True, "ayrinti": "Yönetici sayısı: 1"},
    {"sira": 3, "kontrol": "Kadro dolu (aktif personel)", "zorunlu": True, "tamam": True, "ayrinti": "Aktif personel: 120"},
    {"sira": 4, "kontrol": "Proje havuzu dolu (en az bir konum)", "zorunlu": True, "tamam": True, "ayrinti": "Aktif konum: 12"},
    {"sira": 5, "kontrol": "Akademik takvim girilmiş", "zorunlu": False, "tamam": True, "ayrinti": "Takvim kaydı: 30"},
    {"sira": 6, "kontrol": "Asgari uygulama sürümü ayarlı (eski exe bağlanamasın)", "zorunlu": False, "tamam": False, "ayrinti": "MIN_UYGULAMA_SURUMU = 0.0.0"},
    {"sira": 7, "kontrol": "Eski araç verisi aktarılmış", "zorunlu": False, "tamam": True, "ayrinti": "Eski talep: 180, tarihsiz geçmiş: 179"},
    {"sira": 8, "kontrol": "Pilotta girilmiş deneme talebi yok", "zorunlu": False, "tamam": True, "ayrinti": "Eski aktarım dışı talep: 0"},
  ],
  "eskiAktarDurum": {"talep": 180, "atama": 640, "izin": 25, "rapor": 6, "gecmis": 179, "havuz": 31, "ortam": "TEST"},
  "rolPersonel": [{"sicil": "1002", "ad": "Örnek Personel 2", "bolum": "Örnek Bölüm B"}, {"sicil": "1003", "ad": "Örnek Personel 3", "bolum": "Örnek Bölüm B"}],
  "sayaclar": {"bekleyenTalep": 2, "izinOnay": 1, "revizeBekleyen": 1, "ikameUyari": 1, "sahadaBugun": 3, "sahaToplam": 6, "onaylanan": 0, "reddedilen": 0, "bildirim": 0},
  "logIslemTurleri": [{"islem": "TALEP_KAYDET", "adet": 3}, {"islem": "ATAMA_ONAY", "adet": 2}],
  "logListe": [{"id": 5, "zaman": "2026-11-23 08:20:11", "kullanici": "ALAN\\ornek.yonetici", "adSoyad": "Örnek Yönetici", "islem": "ATAMA_ONAY", "nesne": "talepler", "nesneId": "1", "ayrinti": "TLP-0001: 2 atama"}],
  "istisnaListe": [{"hesap": "ALAN\\ornek.yonetici", "adiSoyadi": "Örnek Yönetici", "yonetici": True, "sorumlu": True, "saha": False, "aktif": True, "aciklama": "", "sicilNo": "1000"}],
}
def ben(kayitli, y, s, sa, g):
    return {"hesap": "ALAN\\ornek.kullanici", "kayitli": kayitli, "adiSoyadi": "Örnek Kullanıcı", "sicilNo": "1000", "bolum": "Örnek Bölüm A", "yonetici": y, "sorumlu": s, "saha": sa, "kaynak": "ISTISNA", "gorunumler": g, "varsayilan": g[0] if g else None}

def mock(benv):
    v = dict(VERI); v["ben"] = benv
    return """
window.__V=%s; window.__L=[];
window.chrome={webview:{addEventListener(t,f){window.__f=f},postMessage(m){setTimeout(()=>window.__f({data:{id:m.id,ok:true,data:(window.__V[m.cmd]!==undefined?window.__V[m.cmd]:{tamam:true})}}),0)}}};
""" % json.dumps(v)

def sh(pg, n, sel=None):
    pg.wait_for_timeout(500)
    (pg.locator(sel).first.screenshot(path=D + n + '.png') if sel else pg.screenshot(path=D + n + '.png'))
    print(n)

with sync_playwright() as P:
    b = P.chromium.launch()
    def ac(benv):
        pg = b.new_page(viewport={'width': 1200, 'height': 800}); pg.add_init_script(mock(benv))
        pg.goto('file:///tmp/gorev_idx.html'); pg.wait_for_timeout(600); return pg
    pg = ac(ben(True, True, True, False, ["YONETICI", "SORUMLU"]))
    def menu(ad): pg.locator('nav.sekmeler button', has_text=ad).first.click()
    menu('Ayarlar'); pg.wait_for_timeout(300)
    def sekme(ad): pg.locator('button', has_text=ad).first.click(); pg.wait_for_timeout(300)
    sh(pg, '16_ayarlar_gorunum'); sekme('Kadro'); sh(pg, '01_kadro')
    menu('Kullanıcı Yetki'); pg.wait_for_timeout(500)
    pg.get_by_role('button', name='+ Yeni yetkili ekle').click(); pg.wait_for_timeout(200)
    pg.set_viewport_size({'width': 1200, 'height': 1500}); sh(pg, '03_istisna')
    pg.evaluate('window.scrollTo(0, document.body.scrollHeight)'); pg.wait_for_timeout(200); sh(pg, '02_eslestirme')
    pg.set_viewport_size({'width': 1200, 'height': 800})
    menu('Ayarlar'); pg.wait_for_timeout(300); sekme('İşlem Günlüğü'); pg.wait_for_timeout(500); sh(pg, '17_gunluk')
    menu('Proje Havuzu'); pg.wait_for_timeout(500)
    pg.set_viewport_size({'width': 1400, 'height': 1000})
    pg.get_by_role('button', name='Tümünü Aç').click(); pg.wait_for_timeout(300); sh(pg, '06_havuz')
    pg.get_by_role('button', name='⇄ Birleştir').first.click(); pg.wait_for_timeout(300); sh(pg, '25_havuz_birlestir')
    pg.get_by_role('button', name='Vazgeç').first.click(); pg.wait_for_timeout(200)
    menu('Akademik Takvim'); pg.wait_for_timeout(600)
    pg.set_viewport_size({'width': 1400, 'height': 1700}); sh(pg, '21_takvim')
    pg.get_by_role('button', name='AKADEMİK TATİL VE RESMİ TATİL YÖNETİMİ').click(); pg.wait_for_timeout(300)
    pg.locator('textarea').fill('08 NİSAN Pazartesi 1 gün İdari izin\n09 NİSAN Salı Ramazan Bayramı arifesi\n10-11-12 NİSAN Çarşamba-Perşembe-Cuma / 3 Gün Ramazan Bayramı\n01 MAYIS Çarşamba / 1 Gün Emek ve Dayanışma Günü'); pg.get_by_role('button', name='Dosyayı tara').click(); pg.wait_for_timeout(500)
    pg.get_by_role('button', name='Doğrula').click(); pg.wait_for_timeout(400); sh(pg, '07_takvim')
    pg.keyboard.press('Escape')
    pg.get_by_role('button', name='AKADEMİK TATİL VE RESMİ TATİL YÖNETİMİ').click(); pg.wait_for_timeout(300)
    pg.get_by_role('button', name='Vazgeç').first.click() if False else None
    pg.get_by_role('button', name='Düzenle').nth(1).click(); pg.wait_for_timeout(400); sh(pg, '24_takvim_duzenle')
    pg.keyboard.press('Escape')
    pg.set_viewport_size({'width': 1200, 'height': 800})
    pg.evaluate('window.scrollTo(0, 0)'); sh(pg, '04_gorunum', '.ust2')
    sh(ac(ben(False, False, False, False, [])), '05_yetkisiz')
    pg.locator('#bglCol').click(); sh(pg, '18_baglanti_penceresi', '#bglPen')
    pg.locator('#bglPen button', has_text='Bağlantıyı değiştir').click(); sh(pg, '19_baglanti_formu')
    v0 = dict(VERI); v0["baglantiDene"] = {"kayit": False}; v0["baglantiBilgi"] = {"kayit": False, "kaynak": None, "pencere": None}
    q = b.new_page(viewport={'width': 1200, 'height': 700}); q.add_init_script(mock(ben(True, False, False, True, ["SAHA"])).replace(json.dumps(dict(VERI, ben=ben(True, False, False, True, ["SAHA"]))), json.dumps(dict(v0, ben=ben(True, False, False, True, ["SAHA"])))))
    q.goto('file:///tmp/gorev_idx.html'); sh(q, '20_baglanti_yok')
    ps = ac(ben(True, False, True, False, ["SORUMLU"]))
    sh(ps, '08_talep_liste')
    ps.get_by_role('button', name='Yeni talep').click(); ps.wait_for_timeout(300)
    ps.get_by_label('Ana Proje', exact=True).select_option('Örnek Ana Proje A'); ps.wait_for_timeout(100)
    ps.get_by_label('Alt Proje', exact=True).select_option('Örnek Alt Proje 1'); ps.wait_for_timeout(100)
    ps.get_by_label('Faaliyet', exact=True).select_option('Örnek Faaliyet'); ps.wait_for_timeout(100)
    ps.get_by_label('Konum', exact=True).select_option('Örnek Yerleşke')
    ps.get_by_label('Başlangıç tarihi').press_sequentially('23112026'); ps.get_by_label('Bitiş tarihi').press_sequentially('27112026'); ps.wait_for_timeout(300)
    ps.locator('textarea').first.fill('Örnek görev açıklaması.')
    ps.get_by_role('button', name='Öğleden önce').nth(2).click()
    ps.locator('input[type=search]').fill('Örnek'); ps.wait_for_timeout(600); ps.get_by_role('button', name='Örnek Personel 2 ·').click(); ps.wait_for_timeout(200)
    ps.set_viewport_size({'width': 1200, 'height': 1500}); sh(ps, '09_talep_form')
    py = ac(ben(True, False, False, False, ["YONETICI"]))
    py.locator('nav.sekmeler button', has_text='Bekleyen Görev').first.click(); py.wait_for_timeout(200)
    py.get_by_role('button', name='Atama Yap').first.click(); py.wait_for_timeout(400)
    py.locator('input[type=checkbox]').nth(1).check(); py.locator('input[type=checkbox]').nth(2).check()
    py.get_by_role('button', name='Seçili günlere ata').nth(1).click(); py.wait_for_timeout(200)
    py.set_viewport_size({'width': 1200, 'height': 1250}); sh(py, '10_atama_paneli')
    pz = ac(ben(True, False, False, False, ["YONETICI"]))
    pz.locator('nav.sekmeler button', has_text='Bekleyen Görev').first.click(); pz.wait_for_timeout(500)
    pz.set_viewport_size({'width': 1400, 'height': 900}); sh(pz, '22_talep_ozet')
    pz.get_by_role('button', name='Revize & İkame Uyarıları').click(); pz.wait_for_timeout(400); sh(pz, '23_revize_ikame')
    pm = ac(ben(True, False, False, True, ["SAHA"]))
    pm.locator('nav.sekmeler button', has_text='Haftalık Özet').first.click(); pm.wait_for_timeout(400)
    pm.get_by_label('Haftaya git (tarih)').fill(''); pm.get_by_label('Haftaya git (tarih)').press_sequentially('23112026'); pm.wait_for_timeout(500)
    pm.get_by_role('button', name='Örnek Ana Proje A', exact=False).first.click(); pm.wait_for_timeout(200)
    pm.set_viewport_size({'width': 1200, 'height': 900}); sh(pm, '11_matris')
    pi = ac(ben(True, False, False, True, ["SAHA"]))
    pi.locator('nav.sekmeler button', has_text='Görevlerim').first.click(); pi.wait_for_timeout(400)
    pi.get_by_label('İzin başlangıç').fill('07.12.2026'); pi.get_by_label('İzin bitiş').fill('11.12.2026')
    pi.set_viewport_size({'width': 1200, 'height': 1300}); sh(pi, '12_izin_rapor')
    py2 = ac(ben(True, False, False, False, ["YONETICI"]))
    py2.evaluate("window.__V.talepGetir.durum='KISMEN_ATANDI'")
    py2.locator('nav.sekmeler button', has_text='Bekleyen Görev').first.click(); py2.wait_for_timeout(300)
    py2.get_by_role('button', name='Yönet…').first.click(); py2.wait_for_timeout(500)
    py2.get_by_role('button', name='Erken bitir…').click(); py2.wait_for_timeout(200)
    py2.set_viewport_size({'width': 1200, 'height': 1250}); sh(py2, '13_yonet')
    pa = ac(ben(True, False, False, False, ["YONETICI"]))
    pa.locator('nav.sekmeler button', has_text='Personel Analizi').first.click(); pa.wait_for_timeout(500)
    pa.set_viewport_size({'width': 1200, 'height': 700}); sh(pa, '14_analiz')
    pc = ac(ben(True, False, False, False, ["YONETICI"]))
    pc.locator('nav.sekmeler button', has_text='Ayarlar').first.click(); pc.wait_for_timeout(300)
    pc.locator('button', has_text='Sistem').first.click(); pc.wait_for_timeout(500)
    pc.set_viewport_size({'width': 1200, 'height': 1100}); sh(pc, '15_canli')
    b.close()
