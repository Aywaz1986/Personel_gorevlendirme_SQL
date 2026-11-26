// Logo (Dilim 17): Özlük'teki gibi sol üst köşede küçük logo + ekranın arkasında silik filigran. Bu bilgisayarda saklanır (tarayıcı deposu).
const LOGO_MAX = 300 * 1024;
function logoOku() {
  let a = {};
  try { a = JSON.parse(lsOku('ayar.logo') || '{}') || {}; } catch (e) { a = {}; }
  return { img: typeof a.img === 'string' && /^data:image\/(png|jpeg|svg\+xml|webp);base64,/.test(a.img) ? a.img : '', ust: a.ust !== false, filigran: a.filigran !== false, opak: Math.max(2, Math.min(30, Number(a.opak) || 8)) };
}
function logoYaz(a) { lsYaz('ayar.logo', JSON.stringify(a)); }
function logoUygula() {
  const a = logoOku();
  let f = document.getElementById('filigran');
  if (!a.img || !a.filigran) { if (f) f.remove(); return; }
  if (!f) { f = document.createElement('div'); f.id = 'filigran'; f.setAttribute('aria-hidden', 'true'); document.body.append(f); }
  f.style.backgroundImage = 'url("' + a.img + '")';
  f.style.opacity = String(a.opak / 100);
}
function logoKutusu() {
  const a = logoOku();
  return a.img && a.ust ? h('img', { class: 'logo-img', src: a.img, alt: 'Logo' }) : h('div', { class: 'logo' }, '👥');
}
function ayarLogo() {
  const a = logoOku();
  const kap = h('section', { class: 'kart' }, h('h2', null, 'Logo ve filigran'));
  const kaydet = () => { logoYaz(a); logoUygula(); };
  function ciz() {
    const dosya = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/svg+xml,image/webp', 'aria-label': 'Logo dosyası' });
    dosya.addEventListener('change', () => {
      const d = dosya.files && dosya.files[0]; if (!d) return;
      if (d.size > LOGO_MAX) { toast('Logo en çok 300 KB olabilir.', 'kotu'); return; }
      const fr = new FileReader();
      fr.onload = () => { a.img = String(fr.result); kaydet(); ciz(); toast('Logo kaydedildi.'); };
      fr.readAsDataURL(d);
    });
    const opak = h('input', { type: 'range', min: 2, max: 30, value: a.opak, 'aria-label': 'Filigran koyuluğu' });
    opak.addEventListener('input', () => { a.opak = +opak.value; kaydet(); });
    kap.replaceChildren(h('h2', null, 'Logo ve filigran'),
      h('div', { class: 'alt', style: 'margin-bottom:8px' }, 'Seçtiğiniz logo sol üst köşede görünür; ekranın arkasında silik filigran olarak da durur. PNG, JPG, SVG veya WebP; en çok 300 KB. Yalnız bu bilgisayarda saklanır.'),
      h('div', { class: 'satir', style: 'align-items:center' },
        a.img ? h('img', { src: a.img, alt: 'Logo önizleme', style: 'height:48px;max-width:160px;object-fit:contain;border:1px solid var(--cizgi);border-radius:8px;padding:4px;background:#fff' }) : h('span', { class: 'alt' }, 'Henüz logo seçilmedi.'),
        dosya,
        a.img ? h('button', { type: 'button', onclick: () => { a.img = ''; kaydet(); ciz(); } }, 'Logoyu kaldır') : null),
      h('div', { class: 'satir', style: 'align-items:center;margin-top:10px' },
        h('label', { class: 'onay' }, h('input', { type: 'checkbox', checked: a.ust, onchange: (e) => { a.ust = e.target.checked; kaydet(); } }), ' Sol üstte göster'),
        h('label', { class: 'onay' }, h('input', { type: 'checkbox', checked: a.filigran, onchange: (e) => { a.filigran = e.target.checked; kaydet(); } }), ' Arka planda filigran'),
        h('label', { class: 'onay' }, 'Filigran koyuluğu ', opak)),
      h('div', { class: 'alt', style: 'margin-top:6px' }, 'Değişiklik üst çubuktaki logoda bir sonraki sayfa değişiminde görünür.'));
  }
  ciz();
  return kap;
}
