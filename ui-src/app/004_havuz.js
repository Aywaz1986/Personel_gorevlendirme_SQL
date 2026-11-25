// Proje / Görev Havuzu yönetimi: Ana Proje > Alt Proje > Faaliyet > Yerleşke (yalnız Merkez Yönetici). Kurallar sunucudadır.
// Merkezî panel: kademeli açılır listeler (üst seçilince alt kırılım yüklenir) + seçili kayda işlem düğmeleri + ağaç görünümü.
// Pasif = tamamlandı (analizde kalır, yeni talep listelerinde gizli); Arşiv = reddedilen/geçersiz tanım (nedenli); birleştirme veri kaybı yoktur.
function havuzSeviyeAd(n) { return ['', 'Ana Proje', 'Alt Proje', 'Faaliyet', 'Yerleşke'][n] || ''; }

async function havuzSayfa() {
  const durum = { liste: [], acik: new Set(), islem: null, ara: '', pasifler: false, sec: [null, null, null, null] };
  const kap = h('div');
  const cocuklar = (id) => durum.liste.filter((x) => x.ustId === id);
  const bul = (id) => durum.liste.find((x) => x.id === id);
  const yol = (x) => { const p = []; let c = x; while (c) { p.unshift(c.ad); c = c.ustId == null ? null : bul(c.ustId); } return p.join(' › '); };
  const uyar = (x) => { const a = durum.ara.trim().toLocaleLowerCase('tr-TR'); return !a || yol(x).toLocaleLowerCase('tr-TR').includes(a); };
  const altiUyar = (x) => uyar(x) || cocuklar(x.id).some(altiUyar);
  const gorunur = (x) => (durum.pasifler || (x.aktif && !x.arsiv)) && x.birlestirildiId == null;
  const secili = () => { for (let i = 3; i >= 0; i--) if (durum.sec[i] != null) return bul(durum.sec[i]); return null; };

  async function yukle() {
    try { durum.liste = await Kopru.cagir('havuzListe'); durum.sec = durum.sec.map((id) => (id != null && bul(id) && bul(id).birlestirildiId == null ? id : null)); durum.islem = null; ciz(); } catch (e) { hata(e); }
  }
  async function yap(cmd, args, mesaj) {
    try { await Kopru.cagir(cmd, args); if (mesaj) toast(mesaj); await yukle(); } catch (e) { hata(e); }
  }
  const kapat = () => { durum.islem = null; ciz(); };

  function ekleKutusu(ustId) {
    const gir = h('input', { type: 'text', class: 'metin', maxlength: '300', placeholder: ustId == null ? 'Yeni Ana Proje adı' : 'Yeni ' + havuzSeviyeAd(bul(ustId).seviye + 1) + ' adı', 'aria-label': 'Yeni kayıt adı' });
    const gonder = () => { const ad = gir.value.trim(); if (!ad) { toast('Ad boş olamaz.', 'uyari'); return; } if (ustId != null) durum.acik.add(ustId); yap('havuzEkle', { ustId, ad }, 'Eklendi.'); };
    gir.addEventListener('keydown', (e) => { if (e.key === 'Enter') gonder(); });
    return h('div', { class: 'satir' }, gir, h('button', { class: 'ana', onclick: gonder }, 'Ekle'), ustId != null ? h('button', { onclick: kapat }, 'Vazgeç') : null);
  }
  function birlestirKutusu(x) {
    const adaylar = durum.liste.filter((y) => y.seviye === x.seviye && y.id !== x.id && y.aktif && y.birlestirildiId == null);
    const sec = h('select', { 'aria-label': 'Hedef kayıt' }, h('option', { value: '' }, '— Hedef seçin —'), adaylar.map((y) => h('option', { value: y.id }, yol(y))));
    return h('div', { class: 'mesaj uyari', style: 'display:flex;flex-direction:column;gap:8px' },
      h('div', null, '"' + yol(x) + '" kaydı seçtiğiniz hedefle birleşir: altındakiler hedefe taşınır (aynı adlılar kendi içinde birleşir), geçmiş talep/atama/rapor kayıtları bozulmaz; bu kayıt pasif kalır ve hedefi gösterir. Hiçbir şey silinmez; ancak geri alınamaz.'),
      h('div', { class: 'satir' }, sec,
        h('button', { class: 'ana', onclick: () => { if (!sec.value) { toast('Hedef seçin.', 'uyari'); return; } yap('havuzBirlestir', { kaynakId: x.id, hedefId: Number(sec.value) }, 'Birleştirildi.'); } }, 'Birleştir'),
        h('button', { onclick: kapat }, 'Vazgeç')));
  }
  function adKutusu(x) {
    const gir = h('input', { type: 'text', class: 'metin', maxlength: '300', value: x.ad, 'aria-label': 'Yeni ad' });
    return h('div', { class: 'satir' }, gir, h('button', { class: 'ana', onclick: () => yap('havuzAdlandir', { id: x.id, ad: gir.value }, 'Kaydedildi.') }, 'Kaydet'), h('button', { onclick: kapat }, 'Vazgeç'));
  }
  function arsivKutusu(x) {
    const gir = h('input', { type: 'text', class: 'metin', maxlength: '300', placeholder: 'Neden (zorunlu): reddedildi, geçersiz, hatalı tanım…', 'aria-label': 'Arşivleme nedeni' });
    return h('div', { class: 'mesaj uyari', style: 'display:flex;flex-direction:column;gap:8px' },
      h('div', null, '"' + yol(x) + '" ve altındakiler arşive alınır (yeni taleplerde görünmez; geçmiş kayıtlar ve raporlar bozulmaz; silinmez). Arşivden çıkarılabilir.'),
      h('div', { class: 'satir' }, gir, h('button', { class: 'ana', onclick: () => { if (!gir.value.trim()) { toast('Neden yazın.', 'uyari'); return; } yap('havuzArsiv', { id: x.id, arsiv: true, neden: gir.value }, 'Arşive alındı.'); } }, 'Arşivle'), h('button', { onclick: kapat }, 'Vazgeç')));
  }
  function islemKutusu(x) {
    const i = durum.islem && durum.islem.id === x.id ? durum.islem.tur : null;
    return i === 'ekle' ? ekleKutusu(x.id) : i === 'ad' ? adKutusu(x) : i === 'birlestir' ? birlestirKutusu(x) : i === 'arsiv' ? arsivKutusu(x) : null;
  }
  const islemAc = (x, tur) => () => { durum.islem = { id: x.id, tur }; ciz(); };
  function eylemler(x) {
    if (x.birlestirildiId != null) { const hd = bul(x.birlestirildiId); return [h('span', { class: 'alt', style: 'font-size:12px' }, '→ birleştirildi: ' + (hd ? yol(hd) : '?'))]; }
    if (x.arsiv) return [h('button', { onclick: () => yap('havuzArsiv', { id: x.id, arsiv: false }, 'Arşivden çıkarıldı (pasif).') }, 'Arşivden çıkar')];
    return [
      x.seviye < 4 && x.aktif ? h('button', { onclick: islemAc(x, 'ekle') }, '+ ' + havuzSeviyeAd(x.seviye + 1)) : null,
      h('button', { onclick: islemAc(x, 'ad') }, 'Ad düzelt'),
      h('button', { onclick: () => yap('havuzDurum', { id: x.id, aktif: !x.aktif }, x.aktif ? 'Tamamlandı: pasife alındı (altındakilerle birlikte).' : 'Etkinleştirildi.') }, x.aktif ? 'Tamamlandı (pasife al)' : 'Etkinleştir'),
      x.aktif ? h('button', { onclick: islemAc(x, 'birlestir') }, 'Birleştir…') : null,
      h('button', { onclick: islemAc(x, 'arsiv') }, 'Arşivle…'),
    ];
  }
  const durumRozet = (x) => x.birlestirildiId != null ? rozet('Birleştirildi', 'uyari') : x.arsiv ? rozet('Arşiv', 'kotu') : x.aktif ? null : rozet('Pasif (tamamlandı)', 'uyari');

  function kademeli() {
    const kutular = [];
    for (let sv = 1; sv <= 4; sv++) {
      const ust = sv === 1 ? null : durum.sec[sv - 2];
      const secenek = sv === 1 || ust != null ? durum.liste.filter((x) => x.seviye === sv && x.ustId === ust && gorunur(x)) : [];
      const sec = h('select', { 'aria-label': havuzSeviyeAd(sv), disabled: sv > 1 && ust == null,
        onchange: (e) => { durum.sec[sv - 1] = e.target.value ? Number(e.target.value) : null; for (let k = sv; k < 4; k++) durum.sec[k] = null; durum.islem = null; ciz(); } },
        h('option', { value: '' }, '— ' + havuzSeviyeAd(sv) + ' —'),
        secenek.map((x) => h('option', { value: x.id, selected: durum.sec[sv - 1] === x.id }, x.ad + (x.arsiv ? ' (arşiv)' : x.aktif ? '' : ' (pasif)'))));
      kutular.push(h('label', { style: 'flex:1 1 150px;min-width:140px;display:flex;flex-direction:column;gap:3px' }, h('span', { class: 'alt', style: 'font-size:12px' }, havuzSeviyeAd(sv)), sec));
    }
    const x = secili();
    return h('div', null,
      h('div', { class: 'satir', style: 'gap:8px;align-items:flex-end' }, kutular),
      h('div', { style: 'margin-top:10px;display:flex;flex-direction:column;gap:8px' },
        x ? h('div', { class: 'satir', style: 'align-items:center' }, h('strong', null, yol(x)), rozet(havuzSeviyeAd(x.seviye), 'bilgi'), durumRozet(x), eylemler(x)) : h('div', { class: 'alt' }, 'Kademeli seçimle bir kayıt seçin ya da aşağıdan yeni Ana Proje ekleyin.'),
        x ? islemKutusu(x) : null,
        h('div', null, h('div', { class: 'alt', style: 'font-size:12px;margin-bottom:3px' }, 'Yeni Ana Proje'), ekleKutusu(null))));
  }

  function dugum(x, derin) {
    const alt = cocuklar(x.id).filter((c) => (durum.pasifler || (c.aktif && !c.arsiv)) && altiUyar(c) && (durum.pasifler || c.birlestirildiId == null));
    const acik = durum.acik.has(x.id) || !!durum.ara.trim();
    const satir = h('div', { class: 'satir', style: 'align-items:center;padding:4px 0;margin-left:' + (derin * 22) + 'px;' + (x.aktif ? '' : 'opacity:.6') },
      cocuklar(x.id).length ? h('button', { 'aria-label': acik ? 'Daralt' : 'Aç', style: 'min-width:32px', onclick: () => { if (durum.acik.has(x.id)) durum.acik.delete(x.id); else durum.acik.add(x.id); ciz(); } }, acik ? '▾' : '▸') : h('span', { style: 'display:inline-block;width:32px' }),
      h('strong', null, x.ad), rozet(havuzSeviyeAd(x.seviye), 'bilgi'), durumRozet(x), eylemler(x));
    const ik = islemKutusu(x);
    return h('div', null, satir, ik ? h('div', { style: 'margin-left:' + ((derin + 1) * 22 + 32) + 'px;padding:4px 0' }, ik) : null, acik ? alt.map((c) => dugum(c, derin + 1)) : null);
  }

  function ciz() {
    const kokler = cocuklar(null).filter((x) => (durum.pasifler || (x.aktif && !x.arsiv)) && x.birlestirildiId == null && altiUyar(x));
    const ara = h('input', { type: 'search', class: 'metin', placeholder: 'Ağaçta ara (ad ya da yol)', value: durum.ara, 'aria-label': 'Ara' });
    ara.addEventListener('input', () => { durum.ara = ara.value; ciz(); const y = kap.querySelector('input[type=search]'); if (y) { y.focus(); y.setSelectionRange(y.value.length, y.value.length); } });
    const toplam = durum.liste.length, aktif = durum.liste.filter((x) => x.aktif).length, arsiv = durum.liste.filter((x) => x.arsiv).length;
    kap.replaceChildren(
      h('div', { class: 'satir', style: 'justify-content:space-between;align-items:center;margin-bottom:8px' }, h('span', { class: 'alt', style: 'font-size:13px' }, toplam + ' kayıt · ' + aktif + ' aktif · ' + arsiv + ' arşiv')),
      kademeli(),
      h('div', { style: 'margin-top:14px;border-top:1px solid var(--cizgi);padding-top:10px' },
        h('div', { class: 'satir', style: 'margin-bottom:8px;align-items:center' }, h('strong', null, 'Ağaç'), ara,
          h('label', { class: 'onay' }, h('input', { type: 'checkbox', checked: durum.pasifler, onchange: (e) => { durum.pasifler = e.target.checked; ciz(); } }), 'Pasif / arşiv / birleştirilenleri göster')),
        h('div', { style: 'max-height:380px;overflow:auto' }, kokler.length ? kokler.map((x) => dugum(x, 0)) : h('div', { class: 'alt' }, toplam ? 'Eşleşen kayıt yok.' : 'Havuz boş. Yeni Ana Proje ekleyin (ya da eski veri aktarımıyla dolar).'))));
  }

  await yukle();
  return h('div', null, kap);
}
