// Dilim 9: analiz ve arşiv. Adam-gün: Tam gün = 1,0; öğleden önce/sonra = 0,5. Yalnız aktif atamalar sayılır.
function analizSayi(n) { return Number(n).toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }); }
function analizIso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

async function analizSayfa() {
  const yon = S.gorunum === 'YONETICI';
  const bugun = new Date();
  const d = { sekme: 'proje', bas: analizIso(new Date(bugun.getFullYear(), bugun.getMonth(), 1)), bit: analizIso(bugun), ana: '', bolum: '', q: '', aq: '', proje: [], kisiler: [], arsiv: [], detay: null, anaListe: [], bolumler: [], yuk: false };
  const kap = h('div', { style: 'display:flex;flex-direction:column;gap:14px;min-width:0' });
  const th = (x, sag) => h('th', { style: 'text-align:' + (sag ? 'right' : 'left') + ';padding:6px 8px;border-bottom:1px solid var(--cizgi);white-space:nowrap' }, x);
  const td = (x, sag, kalin) => h('td', { style: 'padding:6px 8px;border-bottom:1px solid var(--cizgi);' + (sag ? 'text-align:right;' : '') + (kalin ? 'font-weight:600;background:var(--vurgu-bg)' : '') }, x);

  async function yukle() {
    d.yuk = true; ciz();
    try {
      if (d.sekme === 'proje') d.proje = await Kopru.cagir('analizProje', { bas: d.bas, bit: d.bit, ana: d.ana });
      else if (d.sekme === 'personel') { d.kisiler = await Kopru.cagir('analizPersonel', { bas: d.bas, bit: d.bit, bolum: d.bolum, q: d.q }); d.detay = null; }
      else d.arsiv = await Kopru.cagir('arsivGecmis', { q: d.aq, ana: d.ana });
    } catch (e) { hata(e); }
    d.yuk = false; ciz();
  }
  async function excel(ek) {
    try { const r = await Kopru.cagir('analizExcel', Object.assign({ bas: d.bas, bit: d.bit }, ek)); if (!r.iptal) toast('Excel kaydedildi (' + r.satir + ' satır).'); } catch (e) { hata(e); }
  }

  function filtre() {
    const bas = h('input', { type: 'text', class: 'metin', value: takvimTarihYaz(d.bas), style: 'width:120px', 'aria-label': 'Başlangıç' });
    const bit = h('input', { type: 'text', class: 'metin', value: takvimTarihYaz(d.bit), style: 'width:120px', 'aria-label': 'Bitiş' });
    const uygula = () => { const b = talepTarihOku(bas.value), s = talepTarihOku(bit.value); if (!b || !s) { toast('Tarihi GG.AA.YYYY biçiminde yazın.', 'kotu'); return; } d.bas = b; d.bit = s; yukle(); };
    const hizli = (ad, f) => h('button', { type: 'button', onclick: () => { const [b, s] = f(); d.bas = analizIso(b); d.bit = analizIso(s); yukle(); } }, ad);
    const y = bugun.getFullYear(), a = bugun.getMonth();
    const ana = h('select', { 'aria-label': 'Ana proje', onchange: (e) => { d.ana = e.target.value; yukle(); } }, h('option', { value: '' }, 'Tüm ana projeler'), d.anaListe.map((x) => h('option', { value: x, selected: x === d.ana }, x)));
    return h('div', { class: 'satir', style: 'align-items:center' },
      d.sekme === 'arsiv' ? null : [h('label', null, 'Başlangıç ', bas), h('label', null, 'Bitiş ', bit), h('button', { class: 'ana', type: 'button', onclick: uygula }, 'Uygula'),
        hizli('Bu ay', () => [new Date(y, a, 1), bugun]), hizli('Son 3 ay', () => [new Date(y, a - 2, 1), bugun]), hizli('Bu yıl', () => [new Date(y, 0, 1), bugun]), hizli('Geçen yıl', () => [new Date(y - 1, 0, 1), new Date(y - 1, 11, 31)])],
      d.sekme === 'personel' ? null : ana);
  }

  function projeSekmesi() {
    if (!d.proje.length) return h('div', { class: 'kart', style: 'color:var(--soluk)' }, 'Bu dönemde atama yok.');
    const gruplar = {}; d.proje.forEach((r) => { (gruplar[r.ana] = gruplar[r.ana] || []).push(r); });
    const genel = d.proje.reduce((t, r) => t + r.adamGun, 0);
    const govde = [];
    Object.keys(gruplar).forEach((ana) => {
      const g = gruplar[ana];
      govde.push(h('tr', null, td('📑 ' + ana, false, true), td('', false, true), td('', false, true), td(analizSayi(g.reduce((t, r) => t + r.adamGun, 0)), true, true), td('', true, true), td('', true, true), td('', true, true)));
      g.forEach((r) => govde.push(h('tr', null, td(''), td(r.alt), td(r.faaliyet), td(analizSayi(r.adamGun), true), td(String(r.kisi), true), td(String(r.gun), true), td(String(r.talep), true))));
    });
    return h('div', { style: 'overflow:auto' }, h('table', { style: 'border-collapse:collapse;width:100%' },
      h('thead', null, h('tr', null, th('Ana proje'), th('Alt proje'), th('Faaliyet'), th('Adam-gün', true), th('Kişi', true), th('Gün', true), th('Talep', true))),
      h('tbody', null, govde), h('tfoot', null, h('tr', null, td('Genel toplam', false, true), td('', false, true), td('', false, true), td(analizSayi(genel), true, true), td('', true, true), td('', true, true), td('', true, true)))));
  }

  function personelSekmesi() {
    const ara = h('input', { type: 'text', class: 'metin', placeholder: 'Ad ya da sicil ara…', value: d.q, style: 'width:220px', 'aria-label': 'Personel ara' });
    ara.addEventListener('keydown', (e) => { if (e.key === 'Enter') { d.q = ara.value; yukle(); } });
    const bol = h('select', { 'aria-label': 'Bölüm', onchange: (e) => { d.bolum = e.target.value; yukle(); } }, h('option', { value: '' }, 'Tüm bölümler'), d.bolumler.map((x) => h('option', { value: x, selected: x === d.bolum }, x)));
    const tablo = d.kisiler.length ? h('div', { style: 'overflow:auto' }, h('table', { style: 'border-collapse:collapse;width:100%' },
      h('thead', null, h('tr', null, th('Ad soyad'), th('Bölüm'), th('Adam-gün', true), th('Görev günü', true), th('Proje', true), yon ? th('İzin (gün)', true) : null, yon ? th('Rapor (gün)', true) : null, th('Projeler'))),
      h('tbody', null, d.kisiler.map((k) => h('tr', { style: 'cursor:pointer', onclick: async () => { try { d.detay = { k, satirlar: await Kopru.cagir('analizPersonelDetay', { sicil: k.sicil, bas: d.bas, bit: d.bit }) }; ciz(); } catch (e) { hata(e); } } },
        td(k.ad + ' (' + k.sicil + ')'), td(k.bolum || ''), td(analizSayi(k.adamGun), true), td(String(k.gun), true), td(String(k.proje), true),
        yon ? td(k.izinGun == null ? '' : analizSayi(k.izinGun), true) : null, yon ? td(k.raporGun == null ? '' : String(k.raporGun), true) : null,
        td((k.projeler || []).map((p) => p.ana + ' (' + analizSayi(p.adam_gun) + ')').join('; '))))))) : h('div', { class: 'kart', style: 'color:var(--soluk)' }, 'Bu dönemde kayıt yok.');
    return h('div', { style: 'display:flex;flex-direction:column;gap:10px' }, h('div', { class: 'satir', style: 'align-items:center' }, ara, bol, h('button', { type: 'button', onclick: () => { d.q = ara.value; yukle(); } }, 'Ara')), tablo, detay());
  }

  function detay() {
    if (!d.detay) return null;
    const { k, satirlar } = d.detay;
    return h('section', { class: 'kart' }, h('div', { class: 'satir', style: 'align-items:center' }, h('h2', { style: 'margin:0' }, k.ad + ' · ' + takvimTarihYaz(d.bas) + ' – ' + takvimTarihYaz(d.bit)), h('span', { style: 'flex:1' }),
      h('button', { type: 'button', onclick: () => excel({ tur: 'detay', sicil: k.sicil }) }, 'Excel\'e aktar'), h('button', { type: 'button', onclick: () => { d.detay = null; ciz(); } }, 'Kapat')),
      h('div', { style: 'overflow:auto;margin-top:8px' }, h('table', { style: 'border-collapse:collapse;width:100%' },
        h('thead', null, h('tr', null, th('Tarih'), th('Dilim'), th('Tür'), th('Proje / izin türü'), th('Kod'), th('Sorumlu'))),
        h('tbody', null, satirlar.map((r) => h('tr', null, td(takvimTarihYaz(r.tarih) + ' ' + takvimGun(r.tarih)), td(atamaTamAd(r.zaman)),
          td(r.tur === 'GOREV' ? 'Görev' : r.tur === 'IZIN' ? 'İzin' : 'Rapor'), td(r.tur === 'GOREV' ? r.ana + ' › ' + r.alt + ' › ' + r.faaliyet : (r.faaliyet || '')), td(r.kod || ''), td(r.sorumlu || '')))))));
  }

  function arsivSekmesi() {
    const ara = h('input', { type: 'text', class: 'metin', placeholder: 'Kişi, proje ya da görev ara…', value: d.aq, style: 'width:280px', 'aria-label': 'Arşiv ara' });
    ara.addEventListener('keydown', (e) => { if (e.key === 'Enter') { d.aq = ara.value; yukle(); } });
    return h('div', { style: 'display:flex;flex-direction:column;gap:10px' },
      h('div', { class: 'alt' }, 'Eski araçtan aktarılan, tarihi bilinmeyen "kim hangi projeye gitti" kayıtları (en fazla 2000 satır).'),
      h('div', { class: 'satir', style: 'align-items:center' }, ara, h('button', { type: 'button', onclick: () => { d.aq = ara.value; yukle(); } }, 'Ara')),
      d.arsiv.length ? h('div', { style: 'overflow:auto' }, h('table', { style: 'border-collapse:collapse;width:100%' },
        h('thead', null, h('tr', null, th('Personel'), th('Bölüm'), th('Proje'), th('Görev'), th('Sorumlu'))),
        h('tbody', null, d.arsiv.map((r) => h('tr', null, td(r.personel || ''), td(r.bolum || ''), td(r.proje || ''), td(r.gorevMetni || ''), td(r.sorumlu || '')))))) : h('div', { class: 'kart', style: 'color:var(--soluk)' }, 'Kayıt yok.'));
  }

  function ciz() {
    const sek = (id, ad) => h('button', { type: 'button', class: d.sekme === id ? 'ana' : '', onclick: () => { d.sekme = id; d.detay = null; yukle(); } }, ad);
    const exc = d.sekme === 'proje' ? () => excel({ tur: 'proje', ana: d.ana }) : d.sekme === 'personel' ? () => excel({ tur: 'personel', bolum: d.bolum, q: d.q }) : () => excel({ tur: 'arsiv', q: d.aq, ana: d.ana });
    kap.replaceChildren(h('h1', { style: 'margin:0' }, 'Analiz'),
      h('div', { class: 'alt' }, 'Adam-gün: tam gün 1,0 · öğleden önce/sonra 0,5. Yalnız aktif atamalar sayılır.' + (yon ? '' : ' Yalnız kendi talepleriniz.')),
      h('div', { class: 'satir', style: 'align-items:center' }, sek('proje', 'Proje adam-gün'), sek('personel', 'Personel'), sek('arsiv', 'Arşiv (geçmiş görevler)'), h('span', { style: 'flex:1' }), h('button', { type: 'button', onclick: exc }, 'Excel\'e aktar')),
      filtre(), d.yuk ? h('div', { class: 'alt' }, 'Yükleniyor…') : d.sekme === 'proje' ? projeSekmesi() : d.sekme === 'personel' ? personelSekmesi() : arsivSekmesi());
  }

  try { d.anaListe = await Kopru.cagir('analizAnaProjeler'); } catch (e) { /* filtre listesi olmadan da çalışır */ }
  try { d.bolumler = await Kopru.cagir('matrisBolumler'); } catch (e) { /* aynı */ }
  ciz(); await yukle();
  return kap;
}
