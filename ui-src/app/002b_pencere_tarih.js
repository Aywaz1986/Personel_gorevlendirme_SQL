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

function tarihSeciciEkle(inp) {
  if (inp.dataset.tsec) return;
  inp.dataset.tsec = '1';
  const gizli = h('input', { type: 'date', tabindex: '-1', 'aria-hidden': 'true', class: 'tsec-gizli' });
  const dugme = h('button', { type: 'button', class: 'tsec', title: 'Takvimden seç', 'aria-label': 'Takvimden tarih seç', onclick: () => {
    gizli.value = talepTarihOku(inp.value) || '';
    try { gizli.showPicker(); } catch (e) { gizli.focus(); gizli.click(); }
  } }, '📅');
  gizli.addEventListener('change', () => {
    if (!gizli.value) return;
    inp.value = takvimTarihYaz(gizli.value);
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    inp.dispatchEvent(new Event('change', { bubbles: true }));
  });
  const sar = h('span', { class: 'tsec-sar' });
  inp.replaceWith(sar);
  sar.append(inp, dugme, gizli);
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
