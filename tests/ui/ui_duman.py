#!/usr/bin/env python3
"""Arayüz duman testi (Dilim 31): sahte köprüyle her rol × her sekme açılır, sekmedeki görünür düğmelere tek tek basılır;
sayfa hatası (pageerror) ve konsol hatası TABAN DIŞINDAYSA test kırılır.
Sahte köprü bilinmeyen komuta {tamam:true} döndürdüğünden bazı "yanlış şekil" hataları gürültüdür; bunlar tests/ui/duman_taban.json'dadır.
Kullanım: python3 tests/ui/ui_duman.py [--tabani-yaz] [--hizli]   (önce: pip install playwright && playwright install chromium)"""
import json, os, re, subprocess, sys, tempfile, time
KOK = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(KOK, 'tools', 'kilavuz'))
from mock_kopru import mock, ben   # noqa: E402
from playwright.sync_api import sync_playwright   # noqa: E402
TABAN = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'duman_taban.json')
ROLLER = {
    'YONETICI': ben(True, True, False, False, ["YONETICI", "SORUMLU", "SAHA"]),
    'SORUMLU': ben(True, False, True, False, ["SORUMLU"]),
    'SAHA': ben(True, False, False, True, ["SAHA"]),
}
EN_FAZLA_DUGME = 12 if '--hizli' in sys.argv else 30
YIKICI = re.compile(r'^(sil|🗑|kaldır|iptal|sıfırla|kapat)', re.I)   # bu düğmelere basılır ama onay/diyalog reddedilir (dialog dismiss)

JS_HATASI = re.compile(r'is not a function|Cannot read|is not defined|before initialization|is not iterable|undefined|is null|Unexpected|Invalid|Maximum call stack', re.I)

def temiz(m):
    return re.sub(r'\d+', 'N', m)[:200]

def main():
    with tempfile.TemporaryDirectory() as t:
        idx = os.path.join(t, 'index.html')
        subprocess.run([sys.executable, 'build.py', idx], cwd=os.path.join(KOK, 'ui-src'), check=True, stdout=subprocess.DEVNULL)
        bulgular, basla, tik = set(), time.time(), 0
        with sync_playwright() as P:
            b = P.chromium.launch()
            for rol, benv in ROLLER.items():
                pg = b.new_page(viewport={'width': 1500, 'height': 900})
                pg.add_init_script(mock(benv))
                bag = {'sekme': '(açılış)', 'dugme': ''}
                def kaydet(tur, mesaj):
                    bulgular.add(f"{rol} | {bag['sekme']} | {bag['dugme']} | {tur}: {temiz(mesaj)}")
                pg.on('pageerror', lambda e: kaydet('pageerror', str(e)))
                pg.on('console', lambda m: kaydet('console', m.text) if m.type == 'error' else None)
                pg.on('dialog', lambda d: d.dismiss())
                pg.goto('file://' + idx); pg.wait_for_timeout(500)
                sekmeler = [x.strip().split('\n')[0].strip() for x in pg.locator('nav.sekmeler button').all_inner_texts()]
                if not sekmeler: bulgular.add(f"{rol} | (açılış) | | sekme yok"); pg.close(); continue
                for sk in sekmeler:
                    bag['sekme'] = sk; bag['dugme'] = ''
                    def ac():
                        pg.keyboard.press('Escape')
                        try:
                            pg.locator('nav.sekmeler button', has_text=sk).first.click(timeout=1500)
                        except Exception:   # açık pencere engelliyorsa sayfayı yeniden yükle (bu bir uygulama hatası sayılmaz)
                            pg.reload(); pg.wait_for_timeout(500)
                            pg.locator('nav.sekmeler button', has_text=sk).first.click(timeout=5000)
                        pg.wait_for_timeout(250)
                    ac()
                    n = min(pg.locator('.icerik button:visible').count(), EN_FAZLA_DUGME)
                    for i in range(n):
                        ac()
                        d = pg.locator('.icerik button:visible')
                        if i >= d.count(): break
                        bag['dugme'] = (d.nth(i).inner_text() or d.nth(i).get_attribute('aria-label') or d.nth(i).get_attribute('title') or f'#{i}').strip()[:40]
                        try:
                            d.nth(i).click(timeout=1500); tik += 1
                        except Exception:
                            pass
                        pg.wait_for_timeout(120)
                        # Tıklama işleyicileri hatayı yakalayıp toast'a çevirdiği için (hata()) pageerror düşmez; JS hatası gibi görünen kötü toast'ları da yakala
                        for tx in pg.locator('.toast.kotu').all_inner_texts():
                            if JS_HATASI.search(tx): kaydet('toast', tx)
                pg.close()
            b.close()
    bul = sorted(bulgular)
    if '--tabani-yaz' in sys.argv:
        json.dump(bul, open(TABAN, 'w', encoding='utf-8'), ensure_ascii=False, indent=1); print(len(bul), 'bulgu tabana yazıldı'); return 0
    taban = set(json.load(open(TABAN, encoding='utf-8'))) if os.path.exists(TABAN) else set()
    yeni = [x for x in bul if x not in taban]
    print(f"arayüz duman testi: {tik} tıklama, {round(time.time() - basla)} sn, {len(bul)} bulgu, {len(bul) - len(yeni)} bilinen, {len(yeni)} yeni")
    for x in yeni: print("  HATA:", x)
    return 1 if yeni else 0
if __name__ == '__main__': sys.exit(main())
