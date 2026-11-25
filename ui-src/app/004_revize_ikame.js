// "Revize & İkame Uyarıları" sekmesi (Yönetici): onay bekleyen revizeler ile ikame bekleyen görevler. Karar/ikame işlemleri "Yönet…" paneliyle yapılır.
const IKAME_NEDEN = { RAPOR: 'Raporlu', AYRILDI: 'Ayrıldı / pasif', BIRIM: 'Birim değişikliği' };
async function revizeIkameSayfa() {
  const kap = h('div', { style: 'display:flex;flex-direction:column;gap:14px;min-width:0' });
  let panel = null;
  async function yukle() {
    try {
      const [rv, ik] = await Promise.all([Kopru.cagir('revizeListe', { durum: 'BEKLIYOR' }), Kopru.cagir('ikameBekleyenler', {})]);
      ciz(rv, ik);
    } catch (e) { hata(e); }
  }
  S.yenile = async () => { if (!panel) await yukle(); };
  async function ac(talepId) {
    try { panel = await talepYonetPaneli(talepId, async (yenile) => { panel = null; await yukle(); if (S.sayacYukle) S.sayacYukle(); }); kap.replaceChildren(panel); } catch (e) { hata(e); }
  }
  function ciz(rv, ik) {
    const ozet = (x) => [x.gorevMetni ? 'görev metni' : null, x.nitelik ? 'saha notu' : null, x.saatBaslangic ? 'saat ' + x.saatBaslangic + '–' + x.saatBitis : null, (x.gunler || []).length ? 'gün / kişi sayısı' : null].filter(Boolean).join(', ');
    kap.replaceChildren(
      h('section', { class: 'kart' }, h('h2', { style: 'font-size:16px;color:var(--nav)' }, 'Revize talepleri (' + rv.length + ')'),
        rv.length ? rv.map((x) => h('div', { class: 'satir', style: 'align-items:center;padding:8px 0;border-top:1px solid var(--cizgi)' },
          h('span', { class: 'cipi' }, x.kod), h('b', null, x.talepKod), h('span', { class: 'alt', style: 'flex:1;min-width:220px' }, x.isteyen + ' · değişen: ' + (ozet(x) || '—') + (x.neden ? ' · ' + x.neden : '')),
          h('button', { class: 'ana', onclick: () => ac(x.talepId) }, 'İncele / Karar ver…'))) : h('div', { class: 'alt' }, 'Onay bekleyen revize yok.')),
      h('section', { class: 'kart', style: ik.length ? 'border-color:#f59e0b' : '' }, h('h2', { style: 'font-size:16px;color:var(--nav)' }, 'Rapor / ayrılış kaynaklı ikame uyarıları (' + ik.length + ')'),
        ik.length ? ik.map((x) => h('div', { class: 'satir', style: 'align-items:center;padding:8px 0;border-top:1px solid var(--cizgi)' },
          rozet(IKAME_NEDEN[x.neden] || x.neden, 'uyari'), h('span', { style: 'flex:1;min-width:220px' }, x.kod + ' · ' + x.ad + ' · ' + takvimTarihYaz(x.ilk) + (x.ilk !== x.son ? ' – ' + takvimTarihYaz(x.son) : '') + ' (' + x.gun + ' gün) · Sorumlu: ' + x.sorumlu),
          h('button', { onclick: () => ac(x.talepId) }, 'İkame / Yönet…'))) : h('div', { class: 'alt' }, 'İkame personel bekleyen görev yok.')));
  }
  await yukle();
  return kap;
}
