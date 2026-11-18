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
    {"id": 1, "tarih": "2026-10-28", "zaman": "OS", "tur": "RESMI", "ad": "Cumhuriyet Bayramı arifesi"},
    {"id": 2, "tarih": "2026-10-29", "zaman": "TAM", "tur": "RESMI", "ad": "Cumhuriyet Bayramı"},
    {"id": 3, "tarih": "2026-12-01", "zaman": "TAM", "tur": "AKADEMIK", "ad": "Örnek akademik kapalı gün"},
  ],
  "takvimMetinOku": [{"sira": 2, "tarih": "2026-05-01", "zaman": "TAM", "tur": "RESMI", "ad": "1 Mayıs"}],
  "takvimOnizle": [
    {"sira": 2, "tarih": "2026-05-01", "zaman": "TAM", "tur": "RESMI", "ad": "1 Mayıs", "durum": "YENI", "hata": None},
    {"sira": 3, "tarih": "2026-10-29", "zaman": "TAM", "tur": "RESMI", "ad": "Cumhuriyet Bayramı", "durum": "AYNI", "hata": None},
    {"sira": 4, "tarih": "", "zaman": "TAM", "tur": "RESMI", "ad": "Bozuk tarihli satır", "durum": "HATA", "hata": "Tarih okunamadı."},
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
    pg.locator('textarea').fill('Tarih; Ad\n01.05.2026; 1 Mayıs'); pg.get_by_role('button', name='Önizle').click(); sh(pg, '07_takvim')
    pg.locator('nav.menu button').nth(0).click()
    pg.locator('.gorunum button').click(); sh(pg, '04_gorunum')
    sh(ac(ben(False, False, False, False, [])), '05_yetkisiz')
    b.close()
