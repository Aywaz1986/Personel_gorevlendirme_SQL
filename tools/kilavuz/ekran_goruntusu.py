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
  "baglantiDene": {"kayit": True, "bagli": True},
  "surumDurum": {"durum": "tamam", "mesaj": "Sürüm uyumlu.", "engelle": False, "uygulama": "0.1.0", "hedefSema": 3, "sema": 3, "asgari": "0.1.0", "ortam": "TEST", "hesap": "ALAN\\ornek.yonetici", "pollingSaniye": 20},
  "kadroOzet": {"toplam": 4, "aktif": 3, "sonZaman": "2026-11-16T14:20:00", "sonKullanici": "ALAN\\ornek.yonetici", "sonAyrinti": json.dumps({"okunan": 4, "eklenen": 1, "guncellenen": 2, "pasife_alinan": 1, "degismeyen": 0})},
  "kadroListe": KADRO,
  "eslestirmeListe": [{"bolum": "Örnek Bölüm A", "rol": "SORUMLU", "kisi": 14}, {"bolum": "Örnek Bölüm B", "rol": "SAHA", "kisi": 120}, {"bolum": "Örnek Bölüm D", "rol": None, "kisi": 9}],
  "havuzListe": [
    {"id": 1, "ustId": None, "seviye": 1, "ad": "Örnek Ana Proje A", "aktif": True, "birlestirildiId": None},
    {"id": 2, "ustId": 1, "seviye": 2, "ad": "Örnek Alt Proje 1", "aktif": True, "birlestirildiId": None},
    {"id": 3, "ustId": 2, "seviye": 3, "ad": "Örnek Faaliyet", "aktif": True, "birlestirildiId": None},
    {"id": 4, "ustId": 3, "seviye": 4, "ad": "Örnek Yerleşke", "aktif": True, "birlestirildiId": None},
    {"id": 5, "ustId": 1, "seviye": 2, "ad": "Örnek Alt Proje 2", "aktif": True, "birlestirildiId": None},
    {"id": 6, "ustId": None, "seviye": 1, "ad": "Örnek Ana Proje B", "aktif": True, "birlestirildiId": None},
  ],
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
    def menu(ad): pg.locator('nav.menu button', has_text=ad).first.click()
    menu('Kadro'); sh(pg, '01_kadro')
    for ad, n in [('Bölüm–rol', '02_eslestirme'), ('Kişi istisna', '03_istisna')]:
        menu(ad); sh(pg, n)
    menu('Proje havuzu'); sh(pg, '06_havuz')
    menu('Akademik takvim'); pg.wait_for_timeout(300)
    pg.locator('textarea').fill('08 NİSAN Pazartesi / 1 Gün (YILLIK İZİNDEN KESİLECEK)\n10-11-12 NİSAN Çarşamba-Perşembe-Cuma / 3 Gün Ramazan Bayramı\n01 MAYIS Çarşamba / 1 Gün Emek ve Dayanışma Günü'); pg.get_by_role('button', name='Önizle').click(); pg.wait_for_timeout(500); pg.evaluate('window.scrollTo(0,0)'); pg.set_viewport_size({'width': 1200, 'height': 2300}); sh(pg, '07_takvim'); pg.set_viewport_size({'width': 1200, 'height': 800})
    menu('Kadro')
    pg.locator('.gorunum button').click(); sh(pg, '04_gorunum')
    sh(ac(ben(False, False, False, False, [])), '05_yetkisiz')
    ps = ac(ben(True, False, True, False, ["SORUMLU"]))
    sh(ps, '08_talep_liste')
    ps.get_by_role('button', name='Yeni talep').click(); ps.wait_for_timeout(300)
    ti = ps.locator('input.metin')
    ti.nth(0).fill('Örnek Ana Proje A'); ti.nth(1).fill('Örnek Alt Proje 1'); ti.nth(2).fill('Örnek Faaliyet'); ti.nth(3).fill('Örnek Yerleşke')
    ps.get_by_label('Başlangıç tarihi').fill('2026-11-23'); ps.get_by_label('Bitiş tarihi').fill('2026-11-27')
    ps.get_by_role('button', name='Günleri oluştur').click(); ps.wait_for_timeout(300)
    ps.locator('textarea').fill('Örnek görev açıklaması.')
    ps.locator('select').nth(2).select_option('OO')
    ps.set_viewport_size({'width': 1200, 'height': 1700}); sh(ps, '09_talep_form')
    b.close()
