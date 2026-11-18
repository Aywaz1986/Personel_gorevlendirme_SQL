// Proje havuzu: Ana Proje > Alt Proje > Faaliyet > Konum (yalnız Merkez Yönetici). Kurallar sunucudadır.
function havuzSeviyeAd(n) { return ['', 'Ana Proje', 'Alt Proje', 'Faaliyet', 'Konum'][n] || ''; }

async function havuzSayfa() {
  const durum = { liste: [], acik: new Set(), islem: null, ara: '', pasifler: false };
  const kap = h('div');
  const cocuklar = (id) => durum.liste.filter((x) => x.ustId === id);
  const bul = (id) => durum.liste.find((x) => x.id === id);
  const yol = (x) => { const p = []; let c = x; while (c) { p.unshift(c.ad); c = c.ustId == null ? null : bul(c.ustId); } return p.join(' › '); };
  const uyar = (x) => { const a = durum.ara.trim().toLocaleLowerCase('tr-TR'); return !a || yol(x).toLocaleLowerCase('tr-TR').includes(a); };
  const altiUyar = (x) => uyar(x) || cocuklar(x.id).some(altiUyar);

  async function yukle() {
    try { durum.liste = await Kopru.cagir('havuzListe'); durum.islem = null; ciz(); } catch (e) { hata(e); }
  }
  async function yap(cmd, args, mesaj) {
    try { await Kopru.cagir(cmd, args); if (mesaj) toast(mesaj); await yukle(); } catch (e) { hata(e); }
  }

  function ekleKutusu(ustId) {
    const gir = h('input', { type: 'text', class: 'metin', maxlength: '300', placeholder: ustId == null ? 'Yeni Ana Proje adı' : 'Yeni ' + havuzSeviyeAd(bul(ustId).seviye + 1) + ' adı', 'aria-label': 'Yeni kayıt adı' });
    const gonder = () => { const ad = gir.value.trim(); if (!ad) { toast('Ad boş olamaz.', 'uyari'); return; } if (ustId != null) durum.acik.add(ustId); yap('havuzEkle', { ustId, ad }, 'Eklendi.'); };
    gir.addEventListener('keydown', (e) => { if (e.key === 'Enter') gonder(); });
    return h('div', { class: 'satir' }, gir, h('button', { class: 'ana', onclick: gonder }, 'Ekle'),
      ustId != null ? h('button', { onclick: () => { durum.islem = null; ciz(); } }, 'Vazgeç') : null);
  }

  function birlestirKutusu(x) {
    const adaylar = durum.liste.filter((y) => y.seviye === x.seviye && y.id !== x.id && y.aktif && y.birlestirildiId == null);
    const sec = h('select', { 'aria-label': 'Hedef kayıt' }, h('option', { value: '' }, '— Hedef seçin —'), adaylar.map((y) => h('option', { value: y.id }, yol(y))));
    return h('div', { class: 'mesaj uyari', style: 'display:flex;flex-direction:column;gap:8px' },
      h('div', null, '"' + yol(x) + '" kaydı seçtiğiniz hedefle birleşir: altındakiler hedefe taşınır (aynı adlılar kendi içinde birleşir), bu kayıt pasif kalır ve hedefi gösterir. Hiçbir şey silinmez; ancak geri alınamaz.'),
      h('div', { class: 'satir' }, sec,
        h('button', { class: 'ana', onclick: () => { if (!sec.value) { toast('Hedef seçin.', 'uyari'); return; } yap('havuzBirlestir', { kaynakId: x.id, hedefId: Number(sec.value) }, 'Birleştirildi.'); } }, 'Birleştir'),
        h('button', { onclick: () => { durum.islem = null; ciz(); } }, 'Vazgeç')));
  }

  function adKutusu(x) {
    const gir = h('input', { type: 'text', class: 'metin', maxlength: '300', value: x.ad, 'aria-label': 'Yeni ad' });
    return h('div', { class: 'satir' }, gir, h('button', { class: 'ana', onclick: () => yap('havuzAdlandir', { id: x.id, ad: gir.value }, 'Kaydedildi.') }, 'Kaydet'),
      h('button', { onclick: () => { durum.islem = null; ciz(); } }, 'Vazgeç'));
  }

  function dugum(x, derin) {
    const alt = cocuklar(x.id).filter((c) => (durum.pasifler || c.aktif) && altiUyar(c));
    const acik = durum.acik.has(x.id) || !!durum.ara.trim();
    const birlesti = x.birlestirildiId != null;
    const hedef = birlesti ? bul(x.birlestirildiId) : null;
    const islem = durum.islem && durum.islem.id === x.id ? durum.islem.tur : null;
    const eylem = birlesti ? [h('span', { class: 'alt', style: 'font-size:12px' }, '→ birleştirildi: ' + (hedef ? yol(hedef) : '?'))] : [
      x.seviye < 4 && x.aktif ? h('button', { onclick: () => { durum.islem = { id: x.id, tur: 'ekle' }; ciz(); } }, '+ ' + havuzSeviyeAd(x.seviye + 1)) : null,
      h('button', { onclick: () => { durum.islem = { id: x.id, tur: 'ad' }; ciz(); } }, 'Ad değiştir'),
      h('button', { onclick: () => yap('havuzDurum', { id: x.id, aktif: !x.aktif }, x.aktif ? 'Pasife alındı (altındakilerle birlikte).' : 'Etkinleştirildi.') }, x.aktif ? 'Pasife al' : 'Etkinleştir'),
      x.aktif ? h('button', { onclick: () => { durum.islem = { id: x.id, tur: 'birlestir' }; ciz(); } }, 'Birleştir…') : null,
    ];
    const satir = h('div', { class: 'satir', style: 'align-items:center;padding:4px 0;margin-left:' + (derin * 22) + 'px;' + (x.aktif ? '' : 'opacity:.6') },
      cocuklar(x.id).length ? h('button', { 'aria-label': acik ? 'Daralt' : 'Aç', style: 'min-width:32px', onclick: () => { if (durum.acik.has(x.id)) durum.acik.delete(x.id); else durum.acik.add(x.id); ciz(); } }, acik ? '▾' : '▸') : h('span', { style: 'display:inline-block;width:32px' }),
      h('strong', null, x.ad), rozet(havuzSeviyeAd(x.seviye), 'bilgi'), x.aktif ? null : rozet(birlesti ? 'Birleştirildi' : 'Pasif', 'uyari'), eylem);
    return h('div', null, satir,
      islem === 'ekle' ? h('div', { style: 'margin-left:' + ((derin + 1) * 22 + 32) + 'px;padding:4px 0' }, ekleKutusu(x.id)) : null,
      islem === 'ad' ? h('div', { style: 'margin-left:' + ((derin + 1) * 22 + 32) + 'px;padding:4px 0' }, adKutusu(x)) : null,
      islem === 'birlestir' ? h('div', { style: 'margin-left:' + ((derin + 1) * 22 + 32) + 'px;padding:4px 0' }, birlestirKutusu(x)) : null,
      acik ? alt.map((c) => dugum(c, derin + 1)) : null);
  }

  function ciz() {
    const kokler = cocuklar(null).filter((x) => (durum.pasifler || x.aktif) && altiUyar(x));
    const ara = h('input', { type: 'search', class: 'metin', placeholder: 'Ara (ad ya da yol)', value: durum.ara, 'aria-label': 'Ara' });
    ara.addEventListener('input', () => { durum.ara = ara.value; ciz(); const y = kap.querySelector('input[type=search]'); if (y) { y.focus(); y.setSelectionRange(y.value.length, y.value.length); } });
    const toplam = durum.liste.length; const aktif = durum.liste.filter((x) => x.aktif).length;
    kap.replaceChildren(
      h('section', { class: 'kart' }, h('h2', null, 'Yeni Ana Proje'), ekleKutusu(null)),
      h('section', { class: 'kart' },
        h('div', { class: 'satir', style: 'justify-content:space-between;align-items:center;margin-bottom:10px' }, h('strong', null, 'Havuz'),
          h('span', { class: 'alt', style: 'font-size:13px' }, toplam + ' kayıt · ' + aktif + ' aktif')),
        h('div', { class: 'satir', style: 'margin-bottom:10px;align-items:center' }, ara,
          h('label', { class: 'onay' }, h('input', { type: 'checkbox', checked: durum.pasifler, onchange: (e) => { durum.pasifler = e.target.checked; ciz(); } }), 'Pasifleri göster')),
        kokler.length ? kokler.map((x) => dugum(x, 0)) : h('div', { class: 'alt' }, toplam ? 'Eşleşen kayıt yok.' : 'Havuz boş. Yukarıdan ilk Ana Projeyi ekleyin (ya da eski veri aktarımıyla Dilim 3b\'de dolar).')));
  }

  await yukle();
  return h('div', { class: 'icerik', style: 'padding:0' },
    h('div', null, h('h1', null, 'Proje havuzu'),
      h('p', { class: 'alt' }, 'Görev talepleri bu havuzdan seçilir: Ana Proje › Alt Proje › Faaliyet › Konum. Pasife alınan kaydın altındakiler de pasife alınır; birleştirilen kayıt silinmez, hedefi gösterir.')),
    kap);
}
