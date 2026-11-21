// Atama paneli (Yönetici): gün/dilim bazında aday atama, çakışma kararı, ret. Kurallar sunucudadır (007_atama.sql).
function atamaTamAd(z) { return z === 'TAM' ? 'Tam gün' : z === 'OO' ? 'Öğleden önce' : 'Öğleden sonra'; }

async function atamaPaneli(talepId, geri) {
  const t = await Kopru.cagir('talepGetir', { id: talepId });
  let adaylar = await Kopru.cagir('atamaAdaylar', { talepId });
  const st = { secili: new Set(), asama: [], cakisma: null, retAcik: false };
  const kap = h('div', { style: 'display:flex;flex-direction:column;gap:14px' });
  const anahtar = (g) => g.tarih + '|' + g.zaman;
  const mevcut = (g) => g.atananlar || [];
  const asamaSayi = (g) => st.asama.filter((x) => x.tarih === g.tarih && x.zaman === g.zaman).length;
  const dolu = (g) => mevcut(g).length + asamaSayi(g) >= g.kisi;
  const istenen = t.gunler.reduce((a, g) => a + g.kisi, 0);
  const atanan = t.gunler.reduce((a, g) => a + mevcut(g).length, 0);
  const adlar = new Map(adaylar.map((a) => [a.sicil, a.ad]));
  const adSicil = (s) => adlar.get(s) || s;

  async function onayla(karar) {
    try {
      const r = await Kopru.cagir('atamaOnayla', { talepId, atamalar: st.asama.map((x) => ({ sicil: x.sicil, tarih: x.tarih, zaman: x.zaman })), karar });
      toast(t.kod + ': ' + r.atanan + ' kişi-gün atandı' + (r.cikarilan ? ', ' + r.cikarilan + ' çakışan atama çıkarıldı' : '') + ' (' + talepDurumAd(r.durum) + ').' + (r.uyari ? ' ' + r.uyari : ''), r.uyari ? 'uyari' : 'iyi');
      geri(true);
    } catch (e) {
      if (e.kod === 'cakisma') await kontrolEt(); else hata(e);
    }
  }
  async function kontrolEt() {
    try {
      const l = await Kopru.cagir('atamaCakismaKontrol', { talepId, atamalar: st.asama.map((x) => ({ sicil: x.sicil, tarih: x.tarih, zaman: x.zaman })) });
      if (l.length) { st.cakisma = l; ciz(); } else await onayla('REDDET');
    } catch (e) { hata(e); }
  }

  function gunTablo() {
    return h('table', { style: 'border-collapse:collapse;width:100%;min-width:520px' },
      h('thead', null, h('tr', null, ['', 'Gün', 'Dilim', 'İstenen', 'Atananlar'].map((x) => h('th', { style: 'text-align:left;font-size:12px;padding:4px 8px' }, x)))),
      h('tbody', null, t.gunler.map((g) => {
        const n = mevcut(g).length + asamaSayi(g);
        const kutu = h('input', { type: 'checkbox', checked: st.secili.has(anahtar(g)), disabled: dolu(g), 'aria-label': takvimTarihYaz(g.tarih) + ' ' + atamaTamAd(g.zaman) + ' seç' });
        kutu.addEventListener('change', () => { if (kutu.checked) st.secili.add(anahtar(g)); else st.secili.delete(anahtar(g)); });
        return h('tr', { style: 'border-top:1px solid var(--cizgi)' },
          h('td', { style: 'padding:8px' }, kutu), h('td', { style: 'padding:8px' }, takvimTarihYaz(g.tarih) + ' ' + takvimGun(g.tarih)), h('td', { style: 'padding:8px' }, atamaTamAd(g.zaman)),
          h('td', { style: 'padding:8px' }, g.kisi + ' kişi'),
          h('td', { style: 'padding:8px' }, rozet(n + ' / ' + g.kisi, n >= g.kisi ? 'iyi' : n > 0 ? 'uyari' : 'bilgi'), ' ',
            h('span', { style: 'font-size:13px' }, [...mevcut(g).map((a) => a.ad), ...st.asama.filter((x) => x.tarih === g.tarih && x.zaman === g.zaman).map((x) => adSicil(x.sicil) + ' (bekliyor)')].join(', '))));
      })));
  }

  function adayListesi() {
    const liste = h('div', { style: 'display:flex;flex-direction:column;gap:8px' });
    const doldur = () => liste.replaceChildren(...(adaylar.length ? adaylar.map((a) => h('div', { class: 'kart', style: 'display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;padding:10px 14px' },
      h('div', { style: 'flex:1 1 220px;min-width:0' }, h('div', { style: 'font-weight:600' }, a.ad), h('div', { class: 'alt' }, (a.bolum || '') + (a.gecmis > 0 ? ' · ' + t.ana + ' projesinde ' + a.gecmis + ' kez çalıştı' : ''))),
      a.onerildi ? rozet('Önerilen', 'bilgi') : null,
      a.buTalepte > 0 ? rozet('Bu talepte ' + a.buTalepte, 'iyi') : null,
      a.cakisanGun > 0 ? rozet('Çakışma: ' + a.cakisanGun + ' gün', 'uyari') : rozet('Müsait', 'iyi'),
      h('button', { type: 'button', onclick: () => {
        const secilenler = t.gunler.filter((g) => st.secili.has(anahtar(g)) && !dolu(g));
        if (!secilenler.length) { toast('Önce soldaki tablodan gün/dilim seçin (dolu satırlar seçilemez).', 'uyari'); return; }
        let eklenen = 0;
        for (const g of secilenler) {
          if (mevcut(g).some((x) => x.sicil === a.sicil) || st.asama.some((x) => x.sicil === a.sicil && x.tarih === g.tarih && (x.zaman === 'TAM' || g.zaman === 'TAM' || x.zaman === g.zaman))) continue;
          if (dolu(g)) continue;
          st.asama.push({ sicil: a.sicil, tarih: g.tarih, zaman: g.zaman }); eklenen++;
        }
        if (!eklenen) toast('Bu kişi seçili günlere zaten atanmış ya da bekliyor.', 'uyari');
        ciz();
      } }, 'Seçili günlere ata'))) : [h('div', { class: 'alt' }, 'Aday bulunamadı.')]));
    doldur();
    const ara = h('input', { type: 'search', class: 'metin', placeholder: 'Ad ara…', 'aria-label': 'Aday ara', style: 'max-width:320px' });
    let zm = 0;
    ara.addEventListener('input', () => { clearTimeout(zm); zm = setTimeout(async () => { try { adaylar = await Kopru.cagir('atamaAdaylar', { talepId, q: ara.value }); adaylar.forEach((a) => adlar.set(a.sicil, a.ad)); doldur(); } catch (e) { hata(e); } }, 250); });
    return h('div', { style: 'display:flex;flex-direction:column;gap:10px' }, ara, liste);
  }

  function ciz() {
    const eksik = Math.max(0, istenen - atanan - st.asama.length);
    const tahmin = atanan + st.asama.length >= istenen ? 'tamamen atandı' : (atanan + st.asama.length > 0 ? 'kısmen atandı' : 'onay bekliyor');
    const oz = [['📍', 'Konum', t.konum], ['🕣', 'Saat', t.saatBaslangic.replace(':', '.') + ' - ' + t.saatBitis.replace(':', '.')], ['📅', 'Tarih', talepTarihOzet(t.gunler)],
      ['📑', 'Proje', t.ana + (t.alt && t.alt !== 'Genel' ? ' › ' + t.alt : '')], ['📡', 'Faaliyet', t.faaliyet], ['🙋‍♀️', 'Önerilen Personel', t.oneri.length ? t.oneri.map((p) => p.ad).join(', ') : '—'],
      ['🧍‍♂️', 'Proje sorumlusu', t.sorumluAdi]];
    const retKutu = st.retAcik ? (() => {
      const neden = h('textarea', { class: 'metin', rows: '2', maxlength: '300', style: 'width:100%', placeholder: 'Ret nedeni (zorunlu)' });
      return h('section', { class: 'kart' }, h('h2', null, 'Talebi reddet'), neden,
        h('div', { class: 'satir', style: 'margin-top:8px' },
          h('button', { class: 'ana', type: 'button', onclick: async () => { try { await Kopru.cagir('talepReddet', { id: talepId, neden: neden.value }); toast(t.kod + ' reddedildi.'); geri(true); } catch (e) { hata(e); } } }, 'Reddet'),
          h('button', { type: 'button', onclick: () => { st.retAcik = false; ciz(); } }, 'Vazgeç')));
    })() : null;
    const cakKutu = st.cakisma ? h('section', { class: 'mesaj uyari', style: 'border:2px solid var(--uyari)' },
      h('h2', { style: 'margin:0 0 8px;font-size:16px' }, 'Çakışma kararı'),
      h('div', null, 'Aşağıdaki kişiler seçilen gün/dilimde başka görevde. Sistem kendi başına karar vermez:'),
      h('ul', { style: 'margin:8px 0' }, st.cakisma.map((c) => h('li', null, c.ad + ' — ' + takvimTarihYaz(c.tarih) + ' ' + atamaTamAd(c.zaman) + ' atanacak; ' + c.cakisanKod + ' (' + atamaTamAd(c.cakisanZaman) + ', sorumlu ' + c.cakisanSorumlu + ') görevinde.'))),
      h('div', { class: 'satir' },
        h('button', { type: 'button', onclick: () => { st.cakisma = null; ciz(); } }, 'Vazgeç'),
        h('button', { class: 'ana', type: 'button', onclick: () => onayla('CIKAR') }, 'Çakışan görevden çıkar ve bu göreve ata')),
      h('div', { class: 'alt', style: 'margin-top:8px;color:inherit' }, 'Çıkarılan görevin sorumlusuna bildirim gider ve işlem denetim kaydına yazılır. İzin ve rapor çakışmasında bu seçenek yoktur (atama reddedilir).')) : null;
    kap.replaceChildren(
      h('div', { class: 'satir', style: 'align-items:center' }, h('h2', { style: 'margin:0;font-size:18px' }, t.kod + ' · atama'), h('span', { style: 'flex:1' }), rozet(talepDurumAd(t.durum), talepDurumTur(t.durum)),
        t.durum === 'ONAY_BEKLIYOR' ? h('button', { type: 'button', onclick: () => { st.retAcik = true; ciz(); } }, 'Reddet…') : null, h('button', { type: 'button', onclick: () => geri(false) }, 'Listeye dön')),
      h('div', { style: 'display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start' },
        h('div', { style: 'flex:999 1 560px;min-width:0;display:flex;flex-direction:column;gap:14px' },
          retKutu,
          h('section', { class: 'kart' }, h('h2', null, '1. Gün ve zaman dilimi'), h('div', { class: 'alt', style: 'margin-bottom:6px' }, 'Satırları işaretleyin, sonra adayın yanındaki düğmeyle atayın. Kısmi atama serbesttir.'), h('div', { style: 'overflow-x:auto' }, gunTablo())),
          h('section', { class: 'kart' }, h('h2', null, '2. Adaylar'), adayListesi()),
          cakKutu),
        h('aside', { style: 'flex:1 1 300px;min-width:0;display:flex;flex-direction:column;gap:14px;position:sticky;top:12px' },
          h('section', { class: 'kart' }, h('h2', null, 'Talep özeti'), oz.map(([em, ad, v]) => h('div', { style: 'display:flex;flex-direction:column;gap:1px;padding:6px 0;border-bottom:1px solid var(--cizgi)' }, h('span', { style: 'font-size:12px;color:var(--soluk)' }, em + ' ' + ad), h('span', { style: 'font-weight:500' }, v))),
            h('div', { class: 'alt', style: 'margin-top:8px' }, t.gorevMetni)),
          h('section', { class: 'kart' }, h('h2', null, 'Karar'),
            h('div', { style: 'margin-bottom:8px' }, 'Atanmış: ', h('b', null, String(atanan)), ' · Bekleyen seçim: ', h('b', null, String(st.asama.length)), ' · Eksik: ', h('b', null, String(eksik))),
            st.asama.length ? h('ul', { style: 'margin:0 0 8px;padding-left:18px;font-size:13px' }, st.asama.map((x, i) => h('li', null, adSicil(x.sicil) + ' — ' + takvimTarihYaz(x.tarih) + ' ' + atamaTamAd(x.zaman) + ' ',
              h('button', { type: 'button', 'aria-label': 'Seçimi kaldır', style: 'min-height:0;padding:0 6px', onclick: () => { st.asama.splice(i, 1); st.cakisma = null; ciz(); } }, '×')))) : h('div', { class: 'alt', style: 'margin-bottom:8px' }, 'Henüz seçim yok.'),
            h('div', { style: 'margin-bottom:10px' }, rozet('Onaylanırsa: ' + tahmin, 'bilgi')),
            h('button', { class: 'ana', type: 'button', disabled: !st.asama.length, style: 'width:100%', onclick: kontrolEt }, 'Atamayı onayla')))));
  }
  ciz();
  return kap;
}
