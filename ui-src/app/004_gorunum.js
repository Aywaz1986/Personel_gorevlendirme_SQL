// Görünüm ayarları (Dilim 14): Özlük'teki Yazı Ayarları (alan bazında yazı tipi/boyutu) ve Tema modülünün (hazır + özel temalar, buzlu cam) uyarlaması.
// Tercihler bu bilgisayardadır (tarayıcı deposu); yetki ve veri ayarları sunucudadır. Varsayılan yazı tipi (Inter) yapının içine gömülüdür.
const YAZI_ALANLARI = [
  { id: 'genel', ad: 'Genel arayüz', ip: 'Üst çubuk, düğmeler, bildirimler, listeler ve özel ayarı olmayan tüm metinler', d: 14 },
  { id: 'baslik', ad: 'Başlıklar', ip: 'Sayfa ve kart başlıkları', d: 22 },
  { id: 'tablo', ad: 'Tablolar ve matris', ip: 'Haftalık matris, analiz ve liste tabloları', d: 13 },
  { id: 'form', ad: 'Form alanları', ip: 'Giriş ve metin kutuları, açılır listeler', d: 14 },
  { id: 'talep', ad: 'Talep kartları', ip: 'Talep kartları, tavsiye kutusu ve atama paneli', d: 14 },
  { id: 'ayar', ad: 'Ayarlar sayfası', ip: 'Ayarlar sekmelerinin açıklama ve seçenek metinleri', d: null },
];
const YAZI_SISTEM = '"Inter","Segoe UI",system-ui,-apple-system,Arial,sans-serif';
const YAZI_ORTAK = ['Inter', 'Segoe UI', 'Calibri', 'Arial', 'Tahoma', 'Verdana', 'Trebuchet MS', 'Cambria', 'Georgia', 'Consolas'];
const GORUNUM_VARSAYILAN = { olcek: 100, tema: 'celik', cam: true, yazi: {}, fontlar: [] };

// Tema: v = renk belirteçleri; cam = buzlu cam; rad = köşe; blur = bulanıklık; opak = kart opaklığı (cam); zemin = 3 renkli degrade zemin.
const TEMA_RENKLER = [['bg', 'Sayfa zemini'], ['kart', 'Kart zemini'], ['yazi', 'Yazı rengi'], ['soluk', 'Soluk yazı'], ['cizgi', 'Çizgi / kenarlık'], ['vurgu', 'Vurgu rengi'], ['vurguBg', 'Açık vurgu zemini'], ['nav', 'Üst çubuk'], ['nav2', 'Üst şerit (koyu)']];
const TEMA_ZEMIN = ['Zemin rengi 1', 'Zemin rengi 2', 'Zemin rengi 3'];
const TEMA_HEX = /^#[0-9a-fA-F]{6}$/;
const TEMA_HAZIR = [
  { id: 'celik', ad: 'Çelik (varsayılan)', hazir: true, cam: false, rad: 12, blur: 0, opak: 100, zemin: ['#f1f5f9', '#f1f5f9', '#f1f5f9'], v: { bg: '#f1f5f9', kart: '#ffffff', yazi: '#0f172a', soluk: '#64748b', cizgi: '#e2e8f0', vurgu: '#2b6cb0', vurguBg: '#ebf4ff', nav: '#1b365d', nav2: '#10233f' } },
  { id: 'gokmavi', ad: 'Gök Mavi', hazir: true, cam: true, rad: 22, blur: 16, opak: 50, zemin: ['#9dc1f6', '#c9b8f4', '#92d3ee'], v: { bg: '#dbe6f6', kart: '#ffffff', yazi: '#10243f', soluk: '#546a88', cizgi: '#c4d6ee', vurgu: '#2f6fd0', vurguBg: '#e6effc', nav: '#2f5fb0', nav2: '#1d4592' } },
  { id: 'buzul', ad: 'Buzul', hazir: true, cam: true, rad: 16, blur: 16, opak: 55, zemin: ['#a9cdff', '#c6b8ff', '#9fdcf5'], v: { bg: '#d9e8fb', kart: '#ffffff', yazi: '#102a43', soluk: '#4a6580', cizgi: '#c3d6ee', vurgu: '#2f86f0', vurguBg: '#e8f2ff', nav: '#2c5fa8', nav2: '#1c4a80' } },
  { id: 'gececami', ad: 'Gece Camı', hazir: true, cam: true, rad: 16, blur: 18, opak: 62, zemin: ['#4a32c8', '#1b6fd1', '#a02d85'], v: { bg: '#0b1020', kart: '#1b1f48', yazi: '#eaf0ff', soluk: '#aab6d8', cizgi: '#3a3f6e', vurgu: '#8d7bff', vurguBg: '#1f2350', nav: '#141234', nav2: '#0c1a3a' } },
  { id: 'kurumsalcam', ad: 'Kurumsal Cam (koyu lacivert)', hazir: true, cam: true, rad: 14, blur: 18, opak: 62, zemin: ['#070d19', '#0d192e', '#142644'], v: { bg: '#0a1426', kart: '#0f1c32', yazi: '#f1f5f9', soluk: '#94a3b8', cizgi: '#27364f', vurgu: '#38bdf8', vurguBg: '#0f2a44', nav: '#070d19', nav2: '#0d192e' } },
  { id: 'gunbatimi', ad: 'Gün Batımı', hazir: true, cam: true, rad: 16, blur: 16, opak: 52, zemin: ['#ffb98a', '#ff9fc0', '#cdb6ff'], v: { bg: '#fbe3d6', kart: '#ffffff', yazi: '#3a1f2e', soluk: '#7a5062', cizgi: '#efc9c9', vurgu: '#e0397a', vurguBg: '#ffe9de', nav: '#b0245e', nav2: '#6a2f4c' } },
  { id: 'okyanus', ad: 'Okyanus', hazir: true, cam: true, rad: 16, blur: 18, opak: 62, zemin: ['#0f8a86', '#146a9a', '#1b8a63'], v: { bg: '#04222c', kart: '#0a3844', yazi: '#e4fbff', soluk: '#9cc9cf', cizgi: '#1f5a66', vurgu: '#12c9c0', vurguBg: '#0d3a45', nav: '#05404a', nav2: '#062f3d' } },
];
const TEMA_KOYU_DURUM = { iyi: '#6fd08c', uyari: '#f0b35a', kotu: '#ff8f86', 'iyi-bg': '#17301f', 'uyari-bg': '#3a2c10', 'kotu-bg': '#3b1a18' };
const TEMA_ACIK_DURUM = { iyi: '#1b7f3b', uyari: '#a15c00', kotu: '#b3261e', 'iyi-bg': '#e4f4ea', 'uyari-bg': '#fff1d9', 'kotu-bg': '#fde7e5' };

const Tema = {
  ozel() { try { const r = JSON.parse(lsOku('ayar.temalar') || '[]'); return (Array.isArray(r) ? r : []).map((x) => Tema.temizle(x)).filter(Boolean).slice(0, 10); } catch (e) { return []; } },
  ozelYaz(l) { lsYaz('ayar.temalar', JSON.stringify(l)); },
  temizle(t) {
    if (!t || typeof t !== 'object') return null;
    const id = String(t.id || '').replace(/[^a-z0-9_]/g, '').slice(0, 40), ad = String(t.ad || '').trim().slice(0, 40);
    if (!id || !ad || TEMA_HAZIR.some((x) => x.id === id)) return null;
    const v = {}; for (const [k] of TEMA_RENKLER) v[k] = TEMA_HEX.test((t.v || {})[k] || '') ? t.v[k] : TEMA_HAZIR[0].v[k];
    const z = TEMA_ZEMIN.map((_, i) => (TEMA_HEX.test((t.zemin || [])[i] || '') ? t.zemin[i] : v.bg));
    const n = (x, a, b, d) => (Number.isFinite(+x) ? Math.min(b, Math.max(a, Math.round(+x))) : d);
    return { id, ad, hazir: false, cam: !!t.cam, rad: n(t.rad, 0, 32, 12), blur: n(t.blur, 0, 30, 0), opak: n(t.opak, 20, 100, 100), zemin: z, v };
  },
  liste() { return TEMA_HAZIR.concat(Tema.ozel()); },
  bul(id) { return Tema.liste().find((x) => x.id === id) || TEMA_HAZIR[0]; },
  rgba(hex, opak) { const n = parseInt(hex.slice(1), 16); return opak >= 100 ? hex : 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + (opak / 100).toFixed(2) + ')'; },
  koyuMu(t) { const n = parseInt(t.v.bg.slice(1), 16); return (0.299 * (n >> 16 & 255) + 0.587 * (n >> 8 & 255) + 0.114 * (n & 255)) / 255 < 0.45; },
  uygula(t, camAcik) {
    const el = document.documentElement, s = el.style;
    if (!t) { // sistem teması: Windows ayarını izler (CSS)
      ['--bg', '--kart', '--yazi', '--soluk', '--cizgi', '--vurgu', '--vurgu-bg', '--vurgu-yazi', '--nav', '--nav2', '--baslik', '--anabtn', '--celik', '--rad', '--blur', '--zemin', '--iyi', '--uyari', '--kotu', '--iyi-bg', '--uyari-bg', '--kotu-bg'].forEach((k) => s.removeProperty(k));
      el.removeAttribute('data-tema'); el.removeAttribute('data-cam'); el.removeAttribute('data-koyu'); return;
    }
    const koyu = Tema.koyuMu(t), cam = t.cam && camAcik !== false;
    const v = t.v;
    s.setProperty('--bg', v.bg); s.setProperty('--yazi', v.yazi); s.setProperty('--soluk', v.soluk); s.setProperty('--cizgi', v.cizgi);
    s.setProperty('--vurgu', v.vurgu); s.setProperty('--celik', v.vurgu); s.setProperty('--vurgu-bg', v.vurguBg); s.setProperty('--vurgu-yazi', koyu && (t.id === 'okyanus' || t.id === 'kurumsalcam') ? '#032028' : '#ffffff');
    s.setProperty('--nav', v.nav); s.setProperty('--nav2', v.nav2); s.setProperty('--baslik', koyu ? v.yazi : v.nav); s.setProperty('--anabtn', koyu ? v.vurgu : v.nav);
    s.setProperty('--kart', Tema.rgba(v.kart, cam ? t.opak : 100));
    s.setProperty('--rad', t.rad + 'px'); s.setProperty('--blur', (cam ? t.blur : 0) + 'px');
    s.setProperty('--zemin', cam ? 'radial-gradient(circle at 12% 8%,' + t.zemin[0] + ' 0,transparent 42%),radial-gradient(circle at 88% 18%,' + t.zemin[1] + ' 0,transparent 38%),radial-gradient(circle at 55% 100%,' + t.zemin[2] + ' 0,transparent 45%),' + v.bg : v.bg);
    const d = koyu ? TEMA_KOYU_DURUM : TEMA_ACIK_DURUM; for (const k of Object.keys(d)) s.setProperty('--' + k, d[k]);
    el.setAttribute('data-koyu', koyu ? '1' : '0'); el.setAttribute('data-cam', cam ? '1' : '0'); el.setAttribute('data-tema', t.id);
    el.style.colorScheme = koyu ? 'dark' : 'light';
  },
};

function gorunumOku() {
  let a = {};
  try { a = JSON.parse(lsOku('ayar.gorunum') || '{}') || {}; } catch (e) { a = {}; }
  const r = Object.assign({}, GORUNUM_VARSAYILAN, a);
  // Eski (Dilim 12) tercihleri taşı: tablo boyutu, yazı ailesi, açık/koyu tema.
  if (!a.yazi || typeof a.yazi !== 'object') r.yazi = {};
  if (a.tablo && !r.yazi.tablo) r.yazi.tablo = { size: Number(a.tablo) };
  const eski = { calibri: 'Calibri', arial: 'Arial', tahoma: 'Tahoma', serif: 'Georgia' };
  if (eski[a.font] && !r.yazi.genel) r.yazi.genel = { font: eski[a.font] };
  if (r.tema === 'acik') r.tema = 'celik'; else if (r.tema === 'koyu') r.tema = 'gececami';
  if (!Array.isArray(r.fontlar)) r.fontlar = [];
  return r;
}
function gorunumYaz(a) { const c = Object.assign({}, a); delete c.tablo; delete c.font; lsYaz('ayar.gorunum', JSON.stringify(c)); }
function yaziGecerli(a, id) {
  const sc = YAZI_ALANLARI.find((x) => x.id === id), y = (a.yazi || {})[id] || {};
  const genel = (a.yazi || {}).genel || {};
  return { size: y.size != null ? y.size : (sc.d != null ? sc.d : (genel.size != null ? genel.size : 14)), font: y.font || '', ozel: y.size != null };
}
function gorunumUygula(a) {
  a = a || gorunumOku();
  const k = document.documentElement, s = k.style;
  s.zoom = String(Math.max(50, Math.min(200, Number(a.olcek) || 100)) / 100);
  for (const sc of YAZI_ALANLARI) {
    const y = yaziGecerli(a, sc.id);
    s.setProperty('--fs-' + sc.id, (sc.id === 'ayar' && !y.ozel ? 'var(--fs-genel)' : y.size + 'px'));
    s.setProperty('--ff-' + sc.id, y.font ? '"' + y.font + '",' + YAZI_SISTEM : (sc.id === 'genel' ? YAZI_SISTEM : 'var(--ff-genel)'));
  }
  Tema.uygula(a.tema === 'sistem' ? null : Tema.bul(a.tema), a.cam);
}

function ayarGorunum() {
  const a = gorunumOku();
  const kaydet = () => { gorunumYaz(a); gorunumUygula(a); };
  const sec = (ad, secenekler, deger, degisti) => {
    const s = h('select', { 'aria-label': ad }, secenekler.map(([v, t]) => h('option', { value: String(v), selected: String(v) === String(deger) }, t)));
    s.addEventListener('change', () => degisti(s.value)); return s;
  };
  const kap = h('div', { style: 'display:flex;flex-direction:column;gap:14px;min-width:0' });
  const fontlar = () => Array.from(new Set(YAZI_ORTAK.concat(a.fontlar, Object.values(a.yazi).map((y) => y && y.font).filter(Boolean))));
  let duzen = null; // tema düzenleme taslağı
  let onizleme = false;
  function ciz() {
    // ---- Yazı ve boyut ----
    const zoomAdimlar = [50, 67, 75, 80, 85, 90, 95, 100, 110, 125, 150, 175, 200];
    const satirlar = YAZI_ALANLARI.map((sc) => {
      const y = yaziGecerli(a, sc.id);
      const fs = h('select', { 'aria-label': sc.ad + ' yazı tipi' }, h('option', { value: '' }, sc.id === 'genel' ? 'Varsayılan (Inter)' : 'Genel arayüzle aynı'), fontlar().map((f) => h('option', { value: f, selected: f === y.font }, f)));
      const bt = h('input', { type: 'number', class: 'metin', min: 9, max: 40, step: 0.5, value: y.size, style: 'width:80px', 'aria-label': sc.ad + ' boyutu (px)' });
      fs.addEventListener('change', () => { (a.yazi[sc.id] = a.yazi[sc.id] || {}).font = fs.value; kaydet(); });
      bt.addEventListener('change', () => { const v = parseFloat(bt.value); if (v >= 9 && v <= 40) { (a.yazi[sc.id] = a.yazi[sc.id] || {}).size = v; kaydet(); ciz(); } });
      return h('div', { class: 'satir', style: 'align-items:center;padding:8px 0;border-bottom:1px solid var(--cizgi)' },
        h('div', { style: 'flex:1;min-width:220px' }, h('b', null, sc.ad), h('div', { class: 'alt' }, sc.ip)), fs, bt, h('span', { class: 'alt' }, 'px'));
    });
    const ozelFont = h('input', { type: 'text', class: 'metin', placeholder: 'Özel yazı tipi adı yazın, Enter', style: 'min-width:240px' });
    ozelFont.addEventListener('keydown', (e) => { if (e.key === 'Enter' && ozelFont.value.trim()) { a.fontlar.push(ozelFont.value.trim().slice(0, 60)); kaydet(); ciz(); } });
    const yerel = h('button', { type: 'button', onclick: async () => {
      if (!window.queryLocalFonts) { toast('Bu pencere yerel yazı tipi listesini desteklemiyor; özel yazı tipi adını elle yazın.', 'uyari'); return; }
      try { const l = await window.queryLocalFonts(); a.fontlar = Array.from(new Set(a.fontlar.concat(l.map((x) => x.family)))).slice(0, 400); kaydet(); ciz(); toast('Bilgisayardaki yazı tipleri yüklendi.'); } catch (e) { toast('Yazı tipleri okunamadı: ' + (e.message || e), 'uyari'); }
    } }, 'Bilgisayardaki yazı tiplerini yükle');
    const yazi = h('section', { class: 'kart' }, h('h2', null, 'Yazı tipi ve boyutu'),
      h('div', { class: 'alt', style: 'margin-bottom:6px' }, 'Varsayılan yazı tipi (Inter) uygulamaya gömülüdür. Dilediğiniz alan için başka bir yazı tipi ve boyut seçebilirsiniz.'),
      satirlar, h('div', { class: 'satir', style: 'margin-top:10px;align-items:center' }, yerel, ozelFont));
    // ---- Yakınlaştırma ----
    const zm = a.olcek;
    const zmSec = h('select', { 'aria-label': 'Yakınlaştırma' }, Array.from(new Set(zoomAdimlar.concat([zm]))).sort((x, y2) => x - y2).map((v) => h('option', { value: v, selected: v === zm }, '%' + v)));
    zmSec.addEventListener('change', () => { a.olcek = Number(zmSec.value); kaydet(); });
    const adim = (d) => { const c = a.olcek; const n = d > 0 ? zoomAdimlar.find((x) => x > c) : zoomAdimlar.slice().reverse().find((x) => x < c); if (n) { a.olcek = n; kaydet(); ciz(); } };
    const yakin = h('section', { class: 'kart' }, h('h2', null, 'Yakınlaştırma'),
      h('div', { class: 'satir', style: 'align-items:center' }, h('button', { type: 'button', onclick: () => adim(-1), 'aria-label': 'Uzaklaştır' }, '−'), zmSec, h('button', { type: 'button', onclick: () => adim(1), 'aria-label': 'Yakınlaştır' }, '+'),
        h('span', { class: 'alt' }, 'Tüm arayüzü büyütür veya küçültür.')));
    // ---- Tema ----
    const mevcut = a.tema;
    const sw = (t) => h('span', { class: 'thsw' }, [t.v.nav, t.v.vurgu, t.v.bg, t.v.kart].map((c) => h('i', { style: 'background:' + c })));
    const kartlar = [h('button', { type: 'button', class: 'thcard', 'aria-pressed': String(mevcut === 'sistem'), onclick: () => { a.tema = 'sistem'; kaydet(); ciz(); } }, h('span', { class: 'thsw' }, h('i', { style: 'background:#f4f6f9' }), h('i', { style: 'background:#12161c' })), h('b', null, 'Sistem'), h('small', { class: 'alt' }, 'Windows ayarını izler'))]
      .concat(Tema.liste().map((t) => h('button', { type: 'button', class: 'thcard', 'aria-pressed': String(mevcut === t.id), onclick: () => { a.tema = t.id; kaydet(); ciz(); } }, sw(t), h('b', null, t.ad), h('small', { class: 'alt' }, t.cam ? 'Buzlu cam' : (t.hazir ? 'Düz' : 'Özel') + (t.cam ? '' : '')))));
    const cur = Tema.liste().find((t) => t.id === mevcut);
    const dugmeler = h('div', { class: 'satir', style: 'margin-top:10px;align-items:center' },
      h('label', { class: 'onay' }, h('input', { type: 'checkbox', checked: a.cam !== false, onchange: (e) => { a.cam = e.target.checked; kaydet(); } }), ' Buzlu cam efekti (kapatırsanız düz görünüm)'),
      h('span', { style: 'flex:1' }),
      h('button', { type: 'button', onclick: () => { duzen = JSON.parse(JSON.stringify(cur || TEMA_HAZIR[0])); duzen.id = 't' + Date.now().toString(36); duzen.ad = (duzen.ad || 'Tema') + ' (kopya)'; duzen.hazir = false; duzen.yeni = true; ciz(); } }, 'Seçili temadan yeni tema'),
      cur && !cur.hazir ? h('button', { type: 'button', onclick: () => { duzen = JSON.parse(JSON.stringify(cur)); ciz(); } }, 'Seçili temayı düzenle') : null,
      cur && !cur.hazir ? h('button', { type: 'button', onclick: () => { if (!confirm('“' + cur.ad + '” teması silinsin mi?')) return; Tema.ozelYaz(Tema.ozel().filter((x) => x.id !== cur.id)); a.tema = 'celik'; kaydet(); ciz(); } }, 'Sil') : null);
    let temaGovde;
    if (duzen) {
      const t = duzen, q = {};
      const renk = (k, ad, v, z) => { const i = h('input', { type: 'color', value: v }); q[k] = i; i.addEventListener('input', onizle); return h('label', { class: 'threnk' }, i, h('span', null, ad)); };
      const adi = h('input', { type: 'text', class: 'metin', maxlength: 40, value: t.ad, 'aria-label': 'Tema adı', style: 'width:240px' });
      const cam = h('input', { type: 'checkbox', checked: t.cam }); const rad = h('input', { type: 'range', min: 0, max: 32, value: t.rad }); const bl = h('input', { type: 'range', min: 0, max: 30, value: t.blur }); const op = h('input', { type: 'range', min: 20, max: 100, value: t.opak });
      function oku() { t.ad = adi.value; t.cam = cam.checked; t.rad = +rad.value; t.blur = +bl.value; t.opak = +op.value; TEMA_RENKLER.forEach(([k]) => { t.v[k] = q[k].value; }); TEMA_ZEMIN.forEach((_, i) => { t.zemin[i] = q['z' + i].value; }); return t; }
      function onizle() { Tema.uygula(Tema.temizle(Object.assign({}, oku(), { id: 'onizleme' })), true); onizleme = true; }
      [cam, rad, bl, op].forEach((e) => e.addEventListener('input', onizle));
      temaGovde = h('div', null, h('label', { style: 'display:inline-grid' }, 'Tema adı', adi),
        h('div', { class: 'thedit' }, TEMA_RENKLER.map(([k, ad]) => renk(k, ad, t.v[k])), TEMA_ZEMIN.map((ad, i) => renk('z' + i, ad, t.zemin[i]))),
        h('div', { class: 'satir', style: 'margin-top:10px;align-items:center' }, h('label', { class: 'onay' }, cam, ' Buzlu cam görünüm'), h('label', { class: 'onay' }, 'Köşe ', rad), h('label', { class: 'onay' }, 'Bulanıklık ', bl), h('label', { class: 'onay' }, 'Kart opaklığı ', op)),
        h('div', { class: 'satir', style: 'margin-top:12px' },
          h('button', { class: 'ana', type: 'button', onclick: () => {
            const yt = Tema.temizle(oku()); if (!yt) { toast('Tema adı boş olamaz.', 'kotu'); return; }
            const l = Tema.ozel().filter((x) => x.id !== yt.id);
            if (l.length >= 10) { toast('En çok 10 özel tema tanımlanabilir.', 'kotu'); return; }
            if (l.some((x) => x.ad.toLowerCase() === yt.ad.toLowerCase()) || TEMA_HAZIR.some((x) => x.ad.toLowerCase() === yt.ad.toLowerCase())) { toast('Bu adda başka bir tema var.', 'kotu'); return; }
            Tema.ozelYaz(l.concat([yt])); a.tema = yt.id; duzen = null; kaydet(); ciz(); toast('Tema kaydedildi.');
          } }, 'Kaydet'), h('button', { type: 'button', onclick: () => { duzen = null; kaydet(); ciz(); } }, 'Vazgeç')),
        h('div', { class: 'alt', style: 'margin-top:6px' }, 'Değişiklikler anında görünür; Kaydet’e basmazsanız Vazgeç ile geri alınır.'));
    } else temaGovde = h('div', null, h('div', { class: 'thgrid' }, kartlar), dugmeler, h('div', { class: 'alt', style: 'margin-top:8px' }, 'Cam temalarda bulanıklık yavaş bilgisayarlarda zorlayabilir; “Buzlu cam efekti” ile düz görünüme geçebilirsiniz.'));
    const tema = h('section', { class: 'kart' }, h('h2', null, 'Tema'), temaGovde);
    const sifirla = h('div', { class: 'satir' }, h('button', { type: 'button', onclick: () => { const ozel = a.fontlar; Object.assign(a, JSON.parse(JSON.stringify(GORUNUM_VARSAYILAN)), { fontlar: ozel }); duzen = null; kaydet(); ciz(); toast('Varsayılan görünüm yüklendi.'); } }, 'Yazı ve görünümü varsayılana döndür'),
      h('span', { class: 'alt', style: 'align-self:center' }, 'Bu ayarlar yalnız bu bilgisayardaki sizin görünümünüzü etkiler.'));
    kap.replaceChildren(tema, yazi, yakin, ayarLogo(), sifirla);
  }
  ciz();
  return kap;
}
