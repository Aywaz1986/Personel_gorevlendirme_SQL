import sys, glob
# Kullanım: python build.py ../src/Gorevlendirme.App/Ui/index.html
if len(sys.argv) != 2:
    sys.exit("Kullanım: python build.py <çıktı index.html>")
s = open('head.txt', encoding='utf-8').read()
for f in sorted(glob.glob('app/*.js')):
    s += open(f, encoding='utf-8').read()
s += open('tail.txt', encoding='utf-8').read()
import os
os.makedirs(os.path.dirname(os.path.abspath(sys.argv[1])), exist_ok=True)
open(sys.argv[1], 'w', encoding='utf-8').write(s)
