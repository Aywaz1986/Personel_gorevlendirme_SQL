#!/usr/bin/env python3
"""Arayüz betiğini (build çıktısındaki tek <script>) ESLint ile denetler (Dilim 31).
Kurallar tools/lint/eslint.config.mjs'de (tanımsız değişken, tanımlanmadan kullanım/TDZ, yinelenen anahtar, ulaşılamaz kod…).
Bilinen eski bulgular tools/arayuz_lint_taban.json'dadır (rule + kaynak satırı); TABANDA OLMAYAN her bulgu hatadır.
Kullanım: python3 tools/arayuz_lint.py [--tabani-yaz]"""
import json, os, re, subprocess, sys, tempfile
KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TABAN = os.path.join(KOK, 'tools', 'arayuz_lint_taban.json')
LINT = os.path.join(KOK, 'tools', 'lint')

def main():
    with tempfile.TemporaryDirectory() as t:
        idx = os.path.join(t, 'index.html')
        subprocess.run([sys.executable, 'build.py', idx], cwd=os.path.join(KOK, 'ui-src'), check=True, stdout=subprocess.DEVNULL)
        js = re.findall(r'<script[^>]*>(.*?)</script>', open(idx, encoding='utf-8').read(), re.S)[-1]
        yol = os.path.join(LINT, '_arayuz_uretilen.js'); open(yol, 'w', encoding='utf-8').write(js)   # eslint temel yolu içinde olmalı
        satirlar = js.split('\n')
        eslint = os.path.join(LINT, 'node_modules', '.bin', 'eslint')
        r = subprocess.run([eslint, '-c', os.path.join(LINT, 'eslint.config.mjs'), '-f', 'json', yol], capture_output=True, text=True, cwd=LINT)
        if not r.stdout.strip(): print(r.stderr); return 2
        os.remove(yol)
        mesajlar = [m for m in json.loads(r.stdout)[0]['messages'] if 'line' in m]
    bulgular = sorted({f"{m['ruleId']} | {m['message']} | {satirlar[m['line'] - 1].strip()[:140]}" for m in mesajlar})
    if '--tabani-yaz' in sys.argv:
        json.dump(bulgular, open(TABAN, 'w', encoding='utf-8'), ensure_ascii=False, indent=1); print(len(bulgular), 'bulgu tabana yazıldı'); return 0
    taban = set(json.load(open(TABAN, encoding='utf-8')))
    yeni = [b for b in bulgular if b not in taban]
    print(f"arayüz lint: {len(mesajlar)} bulgu, {len(bulgular) - len(yeni)} bilinen (taban), {len(yeni)} yeni")
    for b in yeni: print("  HATA:", b)
    return 1 if yeni else 0
if __name__ == '__main__': sys.exit(main())
