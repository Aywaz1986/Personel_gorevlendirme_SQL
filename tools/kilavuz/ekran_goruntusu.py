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
    sh(pg, '01_kadro')
    for i, n in [(3, '02_eslestirme'), (4, '03_istisna')]:
        pg.locator('nav.menu button').nth(i).click(); sh(pg, n)
    pg.locator('nav.menu button').nth(1).click(); sh(pg, '06_havuz')
    pg.locator('nav.menu button').nth(2).click(); pg.wait_for_timeout(300)
    pg.locator('textarea').fill('08 NİSAN Pazartesi / 1 Gün (YILLIK İZİNDEN KESİLECEK)\n10-11-12 NİSAN Çarşamba-Perşembe-Cuma / 3 Gün Ramazan Bayramı\n01 MAYIS Çarşamba / 1 Gün Emek ve Dayanışma Günü'); pg.get_by_role('button', name='Önizle').click(); pg.wait_for_timeout(500); pg.evaluate('window.scrollTo(0,0)'); pg.set_viewport_size({'width': 1200, 'height': 2300}); sh(pg, '07_takvim'); pg.set_viewport_size({'width': 1200, 'height': 800})
    pg.locator('nav.menu button').nth(0).click()
    pg.locator('.gorunum button').click(); sh(pg, '04_gorunum')
    sh(ac(ben(False, False, False, False, [])), '05_yetkisiz')
    b.close()
