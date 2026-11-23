// Ayarlar: Görünüm (yazı/tema; herkes), Kullanıcılar ve yetkiler, Rol eşleştirme, Kadro, İşlem günlüğü, Eski veri, Sistem (Yönetici).
// Görünüm tercihleri bu bilgisayarda (tarayıcı deposu) tutulur; yetki ve veri ayarları sunucudadır.
const AYAR_VARSAYILAN = { olcek: 100, tablo: 0, font: 'varsayilan', tema: 'sistem' };
const AYAR_FONT = { varsayilan: ['Varsayılan (Segoe UI)', '"Segoe UI",system-ui,sans-serif'], calibri: ['Calibri', 'Calibri,"Segoe UI",sans-serif'], arial: ['Arial', 'Arial,Helvetica,sans-serif'], tahoma: ['Tahoma', 'Tahoma,"Segoe UI",sans-serif'], serif: ['Georgia (serif)', 'Georgia,"Times New Roman",serif'] };

function gorunumOku() {
  try { return Object.assign({}, AYAR_VARSAYILAN, JSON.parse(localStorage.getItem('ayar.gorunum') || '{}')); } catch (e) { return Object.assign({}, AYAR_VARSAYILAN); }
}
function gorunumYaz(a) { try { localStorage.setItem('ayar.gorunum', JSON.stringify(a)); } catch (e) { /* depolama yoksa oturumluk kalır */ } }
function gorunumUygula(a) {
  a = a || gorunumOku();
  const k = document.documentElement;
  k.style.zoom = String(Math.max(70, Math.min(160, Number(a.olcek) || 100)) / 100);
  k.style.setProperty('--tablo-yz', a.tablo ? a.tablo + 'px' : 'inherit');
  document.body.style.fontFamily = (AYAR_FONT[a.font] || AYAR_FONT.varsayilan)[1];
  if (a.tema === 'acik' || a.tema === 'koyu') k.setAttribute('data-tema', a.tema); else k.removeAttribute('data-tema');
}

function ayarGorunum() {
  const a = gorunumOku();
  const kaydet = () => { gorunumYaz(a); gorunumUygula(a); };
  const sec = (ad, secenekler, deger, degisti) => {
    const s = h('select', { 'aria-label': ad }, secenekler.map(([v, t]) => h('option', { value: String(v), selected: String(v) === String(deger) }, t)));
    s.addEventListener('change', () => degisti(s.value)); return s;
  };
  const satir = (ad, ipucu, kontrol) => h('div', { class: 'satir', style: 'align-items:center;padding:8px 0;border-bottom:1px solid var(--cizgi)' },
    h('div', { style: 'flex:1;min-width:220px' }, h('b', null, ad), h('div', { class: 'alt' }, ipucu)), kontrol);
  return h('section', { class: 'kart' }, h('h2', null, 'Görünüm ve yazı ayarları'),
    satir('Genel yazı boyutu', 'Tüm ekranı büyütür veya küçültür.', sec('Genel yazı boyutu', [[85, 'Küçük (%85)'], [100, 'Normal (%100)'], [115, 'Büyük (%115)'], [130, 'Çok büyük (%130)'], [150, 'En büyük (%150)']], a.olcek, (v) => { a.olcek = Number(v); kaydet(); })),
    satir('Tablo ve matris yazısı', 'Matris, analiz ve liste tablolarının yazı boyutu.', sec('Tablo yazısı', [[0, 'Genel ile aynı'], [12, '12 px'], [13, '13 px'], [14, '14 px'], [16, '16 px'], [18, '18 px']], a.tablo, (v) => { a.tablo = Number(v); kaydet(); })),
    satir('Yazı tipi', 'Arayüzün yazı ailesi.', sec('Yazı tipi', Object.entries(AYAR_FONT).map(([k, v]) => [k, v[0]]), a.font, (v) => { a.font = v; kaydet(); })),
    satir('Tema', 'Sistem: Windows ayarını izler.', sec('Tema', [['sistem', 'Sistem'], ['acik', 'Açık'], ['koyu', 'Koyu']], a.tema, (v) => { a.tema = v; kaydet(); })),
    h('div', { class: 'satir', style: 'margin-top:12px' }, h('button', { type: 'button', onclick: () => { Object.assign(a, AYAR_VARSAYILAN); kaydet(); toast('Varsayılan görünüm yüklendi.'); S.ayarSekme = 'gorunum'; kabukCiz(); } }, 'Varsayılana dön')),
    h('div', { class: 'alt', style: 'margin-top:8px' }, 'Bu ayarlar yalnız bu bilgisayardaki sizin görünümünüzü etkiler.'));
}

function ayarLogZaman(z) { const s = String(z || ''); return s.length >= 19 ? takvimTarihYaz(s.slice(0, 10)) + ' ' + s.slice(11, 19) : s; }
async function ayarGunluk() {
  const f = S.logFiltre = S.logFiltre || { bas: '', bit: '', islem: '', q: '' };
  let turler = [];
  try { turler = await Kopru.cagir('logIslemTurleri', {}); } catch (e) { return mesajKutu('kotu', e.message); }
  const kap = h('div', { style: 'display:flex;flex-direction:column;gap:12px' });
  const bas = h('input', { type: 'text', class: 'metin', placeholder: 'GG.AA.YYYY', value: f.bas, style: 'width:120px', 'aria-label': 'Başlangıç' });
  const bit = h('input', { type: 'text', class: 'metin', placeholder: 'GG.AA.YYYY', value: f.bit, style: 'width:120px', 'aria-label': 'Bitiş' });
  const q = h('input', { type: 'search', class: 'metin', placeholder: 'Kullanıcı, ad veya ayrıntıda ara…', value: f.q, style: 'min-width:240px', 'aria-label': 'Ara' });
  const islem = h('select', { 'aria-label': 'İşlem türü' }, h('option', { value: '' }, 'Tüm işlemler'), turler.map((t) => h('option', { value: t.islem, selected: t.islem === f.islem }, t.islem + ' (' + t.adet + ')')));
  const sonuc = h('div');
  async function getir() {
    f.bas = bas.value; f.bit = bit.value; f.q = q.value; f.islem = islem.value;
    const b = f.bas.trim() ? talepTarihOku(f.bas) : null, e = f.bit.trim() ? talepTarihOku(f.bit) : null;
    if ((f.bas.trim() && !b) || (f.bit.trim() && !e)) { toast('Tarihi GG.AA.YYYY biçiminde yazın.', 'kotu'); return; }
    try {
      const l = await Kopru.cagir('logListe', { bas: b || '', bit: e || '', islem: f.islem, q: f.q, ust: 500 });
      sonuc.replaceChildren(h('div', { class: 'alt', style: 'margin-bottom:6px' }, l.length + ' kayıt (en yeni önce; en fazla 500)'),
        h('div', { style: 'overflow:auto' }, h('table', { style: 'border-collapse:collapse;width:100%;font-size:var(--tablo-yz,inherit)' },
          h('thead', null, h('tr', null, ['Tarih-saat', 'Kullanıcı', 'Ad Soyad', 'İşlem', 'Nesne', 'Ayrıntı'].map((x) => h('th', { style: 'text-align:left;padding:6px 8px;border-bottom:2px solid var(--cizgi)' }, x)))),
          h('tbody', null, l.map((r) => h('tr', null, [ayarLogZaman(r.zaman), r.kullanici, r.adSoyad, r.islem, (r.nesne || '') + (r.nesneId ? ' #' + r.nesneId : ''), r.ayrinti || ''].map((x) => h('td', { style: 'padding:5px 8px;border-bottom:1px solid var(--cizgi);vertical-align:top' }, String(x)))))))));
    } catch (e2) { hata(e2); }
  }
  kap.append(h('section', { class: 'kart' }, h('h2', null, 'İşlem günlüğü'),
    h('div', { class: 'alt', style: 'margin-bottom:8px' }, 'Her yazma işleminde işlemi yapan Windows hesabı ve saati sunucu tarafından kaydedilir; kayıtlar değiştirilemez.'),
    h('div', { class: 'satir', style: 'align-items:center' }, h('label', null, 'Başlangıç ', bas), h('label', null, 'Bitiş ', bit), islem, q, h('button', { class: 'ana', type: 'button', onclick: getir }, 'Listele'))), sonuc);
  await getir();
  return kap;
}

async function ayarlarSayfa() {
  const yon = S.gorunum === 'YONETICI';
  const sekmeler = [['gorunum', 'Görünüm ve yazı', async () => ayarGorunum()]];
  if (yon) sekmeler.push(['kullanici', 'Kullanıcılar ve yetkiler', istisnaSayfa], ['eslestirme', 'Rol eşleştirme', eslestirmeSayfa], ['kadro', 'Kadro', kadroSayfa],
    ['gunluk', 'İşlem günlüğü', ayarGunluk], ['eskiveri', 'Eski veri', eskiVeriSayfa], ['sistem', 'Sistem', sistemIcerik]);
  if (!sekmeler.some((x) => x[0] === S.ayarSekme)) S.ayarSekme = 'gorunum';
  const kap = h('div', { style: 'display:flex;flex-direction:column;gap:14px;min-width:0' });
  const govde = h('div', { style: 'min-width:0' });
  async function ciz() {
    // Rol/kadro değişmiş olabilir: talep ekranının rol listeleri yeniden okunur.
    Object.keys(talepRolOnbellek).forEach((k) => delete talepRolOnbellek[k]);
    S.yenile = null;
    kap.replaceChildren(h('h1', { style: 'margin:0' }, 'Ayarlar'),
      h('div', { class: 'satir', style: 'align-items:center' }, sekmeler.map(([id, ad]) => h('button', { type: 'button', class: S.ayarSekme === id ? 'ana' : '', onclick: () => { S.ayarSekme = id; ciz(); } }, ad))), govde);
    govde.replaceChildren(h('div', { class: 'alt' }, 'Yükleniyor…'));
    const sek = sekmeler.find((x) => x[0] === S.ayarSekme);
    try { govde.replaceChildren(await sek[2]()); } catch (e) { govde.replaceChildren(mesajKutu('kotu', e.message)); }
  }
  await ciz();
  return kap;
}
