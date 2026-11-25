// Proje Sorumlusu için izin / rapor BİLGİ ekranı (Dilim 16): yalnız okuma. İzinli ve raporlu personel görünür; onay, ret, giriş ya da düzeltme yoktur.
async function izinBilgiSayfa() {
  const d = { gun: 14, liste: [] };
  const kap = h('div', { style: 'display:flex;flex-direction:column;gap:12px;min-width:0' });
  async function yukle() {
    try { d.liste = await Kopru.cagir('izinRaporBilgi', { gun: d.gun }); ciz(); } catch (e) { hata(e); }
  }
  S.yenile = yukle;
  function ciz() {
    const gunSec = h('select', { 'aria-label': 'Kaç gün ilerisi', onchange: (e) => { d.gun = Number(e.target.value); yukle(); } }, [7, 14, 30].map((n) => h('option', { value: n, selected: d.gun === n }, 'Bugünden ' + n + ' gün')));
    const bugun = takvimIso(new Date());
    const satir = (x) => h('tr', null,
      h('td', null, h('b', null, x.ad)), h('td', null, x.gsm || '-'),
      h('td', null, x.tur === 'RAPOR' ? rozet('Rapor', 'kotu') : rozet(x.durum === 'ONAYLI' ? 'İzin' : 'İzin (onay bekliyor)', x.durum === 'ONAYLI' ? 'bilgi' : 'uyari')),
      h('td', null, izinTarihAralik(x.ilkTarih, x.sonTarih)),
      h('td', null, x.ilkTarih <= bugun && x.sonTarih >= bugun ? rozet('Şu an', 'iyi') : ''));
    kap.replaceChildren(
      h('div', { class: 'satir', style: 'align-items:center' }, h('h1', { style: 'margin:0' }, 'İzin / Rapor Bilgisi'), h('span', { style: 'flex:1' }), gunSec),
      h('div', { class: 'mesaj bilgi', style: 'margin:0' }, 'Bu ekran yalnızca bilgi amaçlıdır: izinli ve raporlu personeli gösterir. Onay, giriş ya da düzeltme işlemleri Merkez Yönetici ve ilgili personel tarafından yapılır. Atama yaparken bu kişiler Merkez Yönetici ekranında müsait görünmez.'),
      h('div', { class: 'kart', style: 'padding:0;overflow:auto' }, h('table', { style: 'width:100%;min-width:560px' },
        h('thead', null, h('tr', null, ['Personel', 'İletişim', 'Durum', 'Tarih', ''].map((x) => h('th', null, x)))),
        h('tbody', null, d.liste.length ? d.liste.map(satir) : h('tr', null, h('td', { colspan: '5', class: 'alt' }, 'Bu aralıkta izinli ya da raporlu personel yok.'))))));
  }
  await yukle();
  return kap;
}
