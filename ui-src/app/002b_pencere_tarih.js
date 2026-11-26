// Ortak: açılır pencere (Dilim 17) ve tüm GG.AA.YYYY kutularına takvimden tarih seçici.
function pencereAc(baslik, govde) {
  const perde = h('div', { class: 'perde' });
  const esc = (e) => { if (e.key === 'Escape') kapat(); };
  const kapat = () => { perde.remove(); document.removeEventListener('keydown', esc); };
  perde.addEventListener('mousedown', (e) => { if (e.target === perde) kapat(); });
  document.addEventListener('keydown', esc);
  perde.append(h('div', { class: 'pencere', role: 'dialog', 'aria-modal': 'true', 'aria-label': baslik },
    h('div', { class: 'pbas' }, h('h2', { style: 'margin:0' }, baslik), h('button', { type: 'button', 'aria-label': 'Kapat', onclick: kapat }, '✕')),
    h('div', { class: 'pgovde' }, govde)));
  document.body.append(perde);
  return kapat;
}

// Özel takvim açılır penceresi: hafta PAZARTESİ'den başlar (tarayıcının/işletim sisteminin yerel ayarına bağlı değildir).
const TS_AY = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const TS_GUN = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
let tsAcik = null;
function tarihTakvimAc(inp, dugme) {
  if (tsAcik) { const ayni = tsAcik.dugme === dugme; tsAcik.kapat(); if (ayni) return; }
  const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const secili = talepTarihOku(inp.value) || '', bugun = iso(new Date());
  let g = secili ? new Date(secili + 'T00:00:00') : new Date(); g = new Date(g.getFullYear(), g.getMonth(), 1);
  const kutu = h('div', { class: 'tsp', role: 'dialog', 'aria-label': 'Takvim' });
  const kapat = () => { kutu.remove(); document.removeEventListener('mousedown', disTik, true); document.removeEventListener('keydown', esc, true); window.removeEventListener('resize', kapat); tsAcik = null; };
  const disTik = (e) => { if (!kutu.contains(e.target) && e.target !== dugme) kapat(); };
  const esc = (e) => { if (e.key === 'Escape') { e.stopPropagation(); kapat(); inp.focus(); } };
  const sec = (d) => { inp.value = takvimTarihYaz(iso(d)); inp.dispatchEvent(new Event('input', { bubbles: true })); inp.dispatchEvent(new Event('change', { bubbles: true })); kapat(); inp.focus(); };
  function ciz() {
    const ilk = (g.getDay() + 6) % 7, gun = new Date(g.getFullYear(), g.getMonth() + 1, 0).getDate(), hucre = [];
    for (let i = 0; i < ilk; i++) hucre.push(h('span', { class: 'tsp-bos' }));
    for (let n = 1; n <= gun; n++) {
      const d = new Date(g.getFullYear(), g.getMonth(), n), k = iso(d), hs = (ilk + n - 1) % 7 >= 5;
      hucre.push(h('button', { type: 'button', class: 'tsp-g' + (hs ? ' hs' : '') + (k === bugun ? ' bugun' : '') + (k === secili ? ' sec' : ''), 'aria-label': takvimTarihYaz(k), onclick: () => sec(d) }, String(n)));
    }
    const yilSec = h('select', { 'aria-label': 'Yıl', onchange: (e) => { g = new Date(Number(e.target.value), g.getMonth(), 1); ciz(); } }, Array.from({ length: 21 }, (_, i) => g.getFullYear() - 10 + i).map((y) => h('option', { value: y, selected: y === g.getFullYear() }, String(y))));
    const aySec = h('select', { 'aria-label': 'Ay', onchange: (e) => { g = new Date(g.getFullYear(), Number(e.target.value), 1); ciz(); } }, TS_AY.map((a, i) => h('option', { value: i, selected: i === g.getMonth() }, a)));
    kutu.replaceChildren(h('div', { class: 'tsp-ust' }, h('button', { type: 'button', 'aria-label': 'Önceki ay', onclick: () => { g = new Date(g.getFullYear(), g.getMonth() - 1, 1); ciz(); } }, '◀'), aySec, yilSec, h('button', { type: 'button', 'aria-label': 'Sonraki ay', onclick: () => { g = new Date(g.getFullYear(), g.getMonth() + 1, 1); ciz(); } }, '▶')),
      h('div', { class: 'tsp-izgara' }, TS_GUN.map((x, i) => h('span', { class: 'tsp-b' + (i >= 5 ? ' hs' : '') }, x)), hucre),
      h('div', { class: 'tsp-alt' }, h('button', { type: 'button', onclick: () => sec(new Date()) }, 'Bugün'), h('button', { type: 'button', onclick: () => { inp.value = ''; inp.dispatchEvent(new Event('input', { bubbles: true })); inp.dispatchEvent(new Event('change', { bubbles: true })); kapat(); } }, 'Temizle')));
  }
  ciz(); document.body.append(kutu);
  const r = dugme.getBoundingClientRect(), w = kutu.offsetWidth, hh = kutu.offsetHeight;
  kutu.style.left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8)) + 'px';
  kutu.style.top = (r.bottom + hh + 8 > window.innerHeight ? Math.max(8, r.top - hh - 4) : r.bottom + 4) + 'px';
  document.addEventListener('mousedown', disTik, true); document.addEventListener('keydown', esc, true); window.addEventListener('resize', kapat);
  tsAcik = { dugme, kapat };
}
function tarihSeciciEkle(inp) {
  if (inp.dataset.tsec) return;
  inp.dataset.tsec = '1';
  const dugme = h('button', { type: 'button', class: 'tsec', title: 'Takvimden seç (hafta Pazartesi başlar)', 'aria-label': 'Takvimden tarih seç', onclick: () => tarihTakvimAc(inp, dugme) }, '📅');
  const sar = h('span', { class: 'tsec-sar' });
  inp.replaceWith(sar);
  sar.append(inp, dugme);
}
function tarihSeciciTara() {
  document.querySelectorAll('input[type="text"][placeholder*="GG.AA.YYYY"]').forEach((i) => { if (i.parentNode) tarihSeciciEkle(i); });
}
(function tarihSeciciBaslat() {
  let bekle = false;
  const gozcu = new MutationObserver(() => { if (bekle) return; bekle = true; requestAnimationFrame(() => { bekle = false; tarihSeciciTara(); }); });
  const baslat = () => { gozcu.observe(document.body, { childList: true, subtree: true }); tarihSeciciTara(); };
  if (document.body) baslat(); else document.addEventListener('DOMContentLoaded', baslat);
})();
