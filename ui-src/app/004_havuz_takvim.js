// "Proje Havuzu & Akademik Takvim" sekmesi (Yönetici): üstte iki yönetim kartı (Proje/Görev Havuzu, Akademik Takvim & Resmi Tatil), altta yıllık takvim çizelgesi.
async function havuzTakvimSayfa() {
  const hv = await havuzSayfa();
  const tk = await takvimSayfa();
  S.yenile = null;
  return h('div', { style: 'display:flex;flex-direction:column;gap:18px;min-width:0' },
    h('div', { class: 'hv-izgara' },
      h('section', { class: 'kart', style: 'min-width:0' }, h('h2', null, 'Proje / Görev Havuzu Yönetimi'),
        h('p', { class: 'alt', style: 'margin:0 0 8px;font-size:12px' }, 'Görev talepleri bu havuzdan seçilir: Ana Proje › Alt Proje › Faaliyet › Yerleşke. Tamamlananlar pasife alınır (analiz bozulmaz), reddedilenler arşivlenir, mükerrerler veri kaybı olmadan birleştirilir; her işlem işlem günlüğüne yazılır.'), hv),
      h('section', { class: 'kart', style: 'min-width:0' }, h('h2', null, 'Akademik Takvim & Resmi Tatil Yönetimi'), tk.ust)),
    h('div', null, h('h2', { style: 'margin:0 0 8px' }, 'Akademik Takvim – Yıllık Çizelge'), tk.alt));
}
