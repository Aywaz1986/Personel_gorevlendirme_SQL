#!/usr/bin/env python3
"""Prototip HTML'inin <style> içeriğini uygulamaya alır: tüm seçicileri .ÖNEK altına kapsar.
:root / html[data-theme=light] / body -> .ÖNEK ; html[data-theme=dark] -> :root[data-koyu="1"] .ÖNEK
Kullanım: proto_css.py prototip.html önek > cikti.css"""
import re, sys
html = open(sys.argv[1], encoding='utf-8').read()
P = sys.argv[2]
css = re.search(r'<style[^>]*>(.*?)</style>', html, re.S).group(1)
css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
DARK = ':root[data-koyu="1"]'

def sel(s):
    s = s.strip()
    if not s: return s
    if s == ':root' or re.fullmatch(r'html\[data-theme="light"\]', s) or s == 'body' or s == 'html': return '.' + P
    m = re.match(r'html\[data-theme="dark"\]\s*(.*)$', s)
    if m: return DARK + ' .' + P + (' ' + m.group(1) if m.group(1) else '')
    m = re.match(r'html\[data-theme="light"\]\s+(.*)$', s)
    if m: return '.' + P + ' ' + m.group(1)
    if s.startswith('*'): return '.' + P + ' ' + s
    return '.' + P + ' ' + s

def parse(t, kf=False):
    out, i, n = [], 0, len(t)
    while i < n:
        j = t.find('{', i)
        if j < 0: break
        head = t[i:j].strip()
        d, k = 1, j + 1
        while d and k < n:
            d += (t[k] == '{') - (t[k] == '}'); k += 1
        body = t[j + 1:k - 1]
        if head.startswith('@keyframes'):
            out.append(head.replace('@keyframes ', '@keyframes ' + P + '-') + '{' + body + '}')
        elif head.startswith('@media'):
            out.append(head + '{' + parse(body) + '}')
        else:
            out.append(','.join(sel(x) for x in head.split(',')) + '{' + re.sub(r'\s+', ' ', body).strip() + '}')
        i = k
    return '\n'.join(out)

res = parse(css)
# keyframes adı öneklendi: animation: ad -> önek-ad
for m in set(re.findall(r'@keyframes ' + P + r'-(\w+)', res)):
    res = re.sub(r'(animation(?:-name)?\s*:[^;}]*?)\b' + m + r'\b', r'\1' + P + '-' + m, res)
print(res)
