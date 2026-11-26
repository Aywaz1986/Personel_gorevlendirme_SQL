// "Proje Havuzu" ve "Akademik Takvim" ayrı sekmeler (Dilim 17).
async function havuzSekmesi() {
  S.yenile = null;
  return await havuzSayfa();
}
async function takvimSekmesi() {
  S.yenile = null;
  const tk = await takvimSayfa();
  return h('div', { style: 'display:flex;flex-direction:column;gap:14px;min-width:0' }, tk.alt);
}
