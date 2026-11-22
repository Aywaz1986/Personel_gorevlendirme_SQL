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
  "matrisHafta": [{"sicil": "1002", "ad": "Örnek Personel 2", "bolum": "Örnek Bölüm B", "hucreler": [{"tarih": "2026-11-23", "zaman": "TAM", "talepId": 1, "kod": "TLP-0001", "ana": "Örnek Ana Proje A", "alt": "Genel", "faaliyet": "Örnek Faaliyet", "konum": "Örnek Yerleşke", "saat": "07:30 - 16:35", "sorumlu": "Örnek Personel 1"}, {"tarih": "2026-11-24", "zaman": "TAM", "talepId": 1, "kod": "TLP-0001", "ana": "Örnek Ana Proje A", "alt": "Genel", "faaliyet": "Örnek Faaliyet", "konum": "Örnek Yerleşke", "saat": "07:30 - 16:35", "sorumlu": "Örnek Personel 1"}, {"tarih": "2026-11-25", "zaman": "OO", "talepId": 1, "kod": "TLP-0002", "ana": "Örnek Ana Proje B", "alt": "Genel", "faaliyet": "Kayıt", "konum": "Salon", "saat": "07:30 - 16:35", "sorumlu": "Örnek Personel 1"}]}, {"sicil": "1004", "ad": "Örnek Personel 4", "bolum": "Örnek Bölüm B", "hucreler": [{"tarih": "2026-11-25", "zaman": "OO", "talepId": 1, "kod": "TLP-0001", "ana": "Örnek Ana Proje A", "alt": "Genel", "faaliyet": "Örnek Faaliyet", "konum": "Örnek Yerleşke", "saat": "07:30 - 16:35", "sorumlu": "Örnek Personel 1"}, {"tarih": "2026-11-25", "zaman": "OS", "talepId": 1, "kod": "TLP-0002", "ana": "Örnek Ana Proje B", "alt": "Genel", "faaliyet": "Kayıt", "konum": "Salon", "saat": "07:30 - 16:35", "sorumlu": "Örnek Personel 1"}, {"tarih": "2026-11-27", "zaman": "TAM", "talepId": 1, "kod": "TLP-0002", "ana": "Örnek Ana Proje B", "alt": "Genel", "faaliyet": "Kayıt", "konum": "Örnek Yerleşke", "saat": "07:30 - 16:35", "sorumlu": "Örnek Personel 1"}]}, {"sicil": "1005", "ad": "Örnek Personel 5", "bolum": "Örnek Bölüm C", "hucreler": [{"tarih": "2026-11-24", "zaman": "TAM", "talepId": 1, "kod": "TLP-0002", "ana": "Örnek Ana Proje B", "alt": "Genel", "faaliyet": "Kayıt", "konum": "Örnek Yerleşke", "saat": "07:30 - 16:35", "sorumlu": "Örnek Personel 1"}, {"tarih": "2026-11-26", "zaman": "TAM", "talepId": 1, "kod": "TLP-0001", "ana": "Örnek Ana Proje A", "alt": "Genel", "faaliyet": "Örnek Faaliyet", "konum": "Örnek Yerleşke", "saat": "07:30 - 16:35", "sorumlu": "Örnek Personel 1"}]}],
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
    ps.get_by_label('Ana Proje', exact=True).select_option('Örnek Ana Proje A'); ps.wait_for_timeout(100)
    ps.get_by_label('Alt Proje', exact=True).select_option('Örnek Alt Proje 1'); ps.wait_for_timeout(100)
    ps.get_by_label('Faaliyet', exact=True).select_option('Örnek Faaliyet'); ps.wait_for_timeout(100)
    ps.get_by_label('Konum', exact=True).select_option('Örnek Yerleşke')
    ps.get_by_label('Başlangıç tarihi').press_sequentially('23112026'); ps.get_by_label('Bitiş tarihi').press_sequentially('27112026'); ps.wait_for_timeout(300)
    ps.locator('textarea').fill('Örnek görev açıklaması.')
    ps.get_by_role('button', name='Öğleden önce').nth(2).click()
    ps.locator('input[type=search]').fill('Örnek'); ps.wait_for_timeout(600); ps.get_by_role('button', name='Örnek Personel 2 (1002)').click(); ps.wait_for_timeout(200)
    ps.set_viewport_size({'width': 1200, 'height': 1500}); sh(ps, '09_talep_form')
    py = ac(ben(True, False, False, False, ["YONETICI"]))
    py.locator('nav.menu button', has_text='Talepler').first.click(); py.wait_for_timeout(200)
    py.get_by_role('button', name='Ata', exact=True).first.click(); py.wait_for_timeout(400)
    py.locator('input[type=checkbox]').nth(1).check(); py.locator('input[type=checkbox]').nth(2).check()
    py.get_by_role('button', name='Seçili günlere ata').nth(1).click(); py.wait_for_timeout(200)
    py.set_viewport_size({'width': 1200, 'height': 1250}); sh(py, '10_atama_paneli')
    pm = ac(ben(True, False, False, True, ["SAHA"]))
    pm.get_by_label('Haftaya git (tarih)').fill(''); pm.get_by_label('Haftaya git (tarih)').press_sequentially('23112026'); pm.wait_for_timeout(500)
    pm.get_by_role('button', name='Örnek Ana Proje A', exact=False).first.click(); pm.wait_for_timeout(200)
    pm.set_viewport_size({'width': 1200, 'height': 900}); sh(pm, '11_matris')
    pi = ac(ben(True, False, False, True, ["SAHA"]))
    pi.locator('nav.menu button', has_text='Görevlerim').first.click(); pi.wait_for_timeout(400)
    pi.get_by_label('İzin başlangıç').fill('07.12.2026'); pi.get_by_label('İzin bitiş').fill('11.12.2026')
    pi.set_viewport_size({'width': 1200, 'height': 1300}); sh(pi, '12_izin_rapor')
    py2 = ac(ben(True, False, False, False, ["YONETICI"]))
    py2.evaluate("window.__V.talepGetir.durum='KISMEN_ATANDI'")
    py2.locator('nav.menu button', has_text='Talepler').first.click(); py2.wait_for_timeout(300)
    py2.get_by_role('button', name='Yönet…').first.click(); py2.wait_for_timeout(500)
    py2.get_by_role('button', name='Erken bitir…').click(); py2.wait_for_timeout(200)
    py2.set_viewport_size({'width': 1200, 'height': 1250}); sh(py2, '13_yonet')
    pa = ac(ben(True, False, False, False, ["YONETICI"]))
    pa.locator('nav.menu button', has_text='Analiz').first.click(); pa.wait_for_timeout(500)
    pa.set_viewport_size({'width': 1200, 'height': 700}); sh(pa, '14_analiz')
    b.close()
