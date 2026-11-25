// "Proje Havuzu" ve "Akademik Takvim" ayrı sekmeler (Dilim 17).
async function havuzSekmesi() {
  S.yenile = null;
  return h('section', { class: 'kart', style: 'min-width:0' }, h('h2', null, 'Proje / Görev Havuzu'),
    h('p', { class: 'alt', style: 'margin:0 0 8px;font-size:12px' }, 'Görev talepleri bu havuzdan seçilir: Ana Proje › Alt Proje › Faaliyet › Yerleşke. Tamamlananlar pasife alınır (analizlerde kalır).'),
    await havuzSayfa());
}
async function takvimSekmesi() {
  S.yenile = null;
  const tk = await takvimSayfa();
  return h('div', { style: 'display:flex;flex-direction:column;gap:14px;min-width:0' }, tk.alt);
}
