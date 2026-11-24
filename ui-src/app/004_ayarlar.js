// Ayarlar: Görünüm ve yazı (herkes), Kadro, Eski veri, Sistem (Yönetici). Kullanıcı rolleri, yönetici tanımı ve işlem günlüğü "Kullanıcı Yetki & Audit Log" sekmesindedir.
// Görünüm tercihleri bu bilgisayarda (tarayıcı deposu) tutulur; yetki ve veri ayarları sunucudadır.
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
  if (yon) sekmeler.push(['kadro', 'Kadro', kadroSayfa], ['eskiveri', 'Eski veri', eskiVeriSayfa], ['sistem', 'Sistem', sistemIcerik]);
  if (!sekmeler.some((x) => x[0] === S.ayarSekme)) S.ayarSekme = 'gorunum';
  const kap = h('div', { style: 'display:flex;flex-direction:column;gap:14px;min-width:0' });
  const govde = h('div', { style: 'min-width:0' });
  async function ciz() {
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
