// "Proje Havuzu & Akademik Takvim" sekmesi (Yönetici): iki ekran alt alta. (Dilim 15'te havuz ağacı ve akademik takvim yıllık çizelgesi yeniden düzenlenecek.)
async function havuzTakvimSayfa() {
  const hv = await havuzSayfa();
  const tk = await takvimSayfa();
  S.yenile = null;
  return h('div', { style: 'display:flex;flex-direction:column;gap:24px;min-width:0' }, hv, tk);
}
