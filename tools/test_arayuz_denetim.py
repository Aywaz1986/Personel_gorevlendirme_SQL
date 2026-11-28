#!/usr/bin/env python3
"""arayuz_denetim.py'nin kendi testleri (yanlış-negatif olmasın diye)."""
import os, sys, tempfile, unittest
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import arayuz_denetim as d

class T(unittest.TestCase):
    def test_anahtarlar(self):
        n = "{ a, b: 1, 'c': { x: 1, y: 2 }, ...ek, d: f(1, 2), e: 'x,y' }"
        self.assertEqual(d.ust_anahtarlar(n), {'a', 'b', 'c', 'd', 'e'})
    def test_dengeli(self):
        s = "{ a: '}', b: {c: 1} } kalan"
        self.assertEqual(s[:d.dengeli(s, 0)], "{ a: '}', b: {c: 1} }")
    def test_cs_anahtar(self):
        g = 'Args.S(a, "ad"), OptS(a, "alt"), Args.B(a, "aktif", true)'
        self.assertEqual(d.anahtarlar_cs(g), {'ad', 'alt', 'aktif'})
    def test_bilinmeyen_komut_ve_alan_yakalanir(self):
        with tempfile.TemporaryDirectory() as t:
            os.makedirs(os.path.join(t, 'ui-src', 'app')); os.makedirs(os.path.join(t, 'src', 'Gorevlendirme.App', 'Bridge', 'Commands')); os.makedirs(os.path.join(t, 'docs')); os.makedirs(os.path.join(t, 'tools'))
            open(os.path.join(t, 'ui-src', 'app', 'x.js'), 'w').write("Kopru.cagir('yok', { a: 1 }); Kopru.cagir('var', { ad: 1, yanlis: 2 });")
            open(os.path.join(t, 'src', 'Gorevlendirme.App', 'Bridge', 'Commands', 'c.cs'), 'w').write('r.Register("var", async (st, a) => await S(Args.S(a, "ad")));')
            open(os.path.join(t, 'docs', 'ARAYUZ.md'), 'w').write('| `var` |')
            open(os.path.join(t, 'tools', 'arayuz_denetim_izinler.json'), 'w').write('{"alan_istisnalari": {}, "belgesiz_komutlar": [], "arayuzsuz_komutlar": []}')
            d.KOK = t
            import io, contextlib
            b = io.StringIO()
            with contextlib.redirect_stdout(b): kod = d.main()
            self.assertEqual(kod, 1)
            self.assertIn("'yok'", b.getvalue()); self.assertIn("yanlis", b.getvalue())

if __name__ == '__main__': unittest.main()
