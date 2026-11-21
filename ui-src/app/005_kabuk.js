// Kabuk: üst çubuk (ortam, görünüm geçişi), rol bazlı menü ve sayfalar.
const SAYFALAR = {
  YONETICI: [['talep', 'Talepler', talepSayfa], ['matris', 'Haftalık matris', matrisSayfa], ['kadro', 'Kadro', kadroSayfa], ['havuz', 'Proje havuzu', havuzSayfa], ['takvim', 'Akademik takvim', takvimSayfa], ['eskiveri', 'Eski veri', eskiVeriSayfa], ['eslestirme', 'Bölüm–rol eşleştirme', eslestirmeSayfa], ['istisna', 'Kişi istisnaları', istisnaSayfa], ['sistem', 'Sistem', sistemIcerik]],
  SORUMLU: [['talep', 'Görev Talep Arayüzü', talepSayfa], ['matris', 'Haftalık matris', matrisSayfa]],
  SAHA: [['matris', 'Haftalık matris', matrisSayfa], ['gorevim', 'Görevlerim', async () => bosSayfa('Kişisel görev izleme', 'Görev izleme, izin ve rapor beyanı Dilim 7\'de gelir.')]],
};
function bosSayfa(baslik, metin) {
  return h('div', { class: 'icerik', style: 'padding:0' }, h('h1', null, baslik), h('div', { class: 'kart', style: 'text-align:center;border-style:dashed;color:var(--soluk)' }, metin));
}

async function kabukCiz() {
  const k = S.kimlik; const gl = k.gorunumler;
  const sayfalar = SAYFALAR[S.gorunum];
  if (!S.sayfa || !sayfalar.some((x) => x[0] === S.sayfa)) S.sayfa = sayfalar[0][0];
  const icerik = h('div', { class: 'icerik' });
  const menu = h('nav', { class: 'menu', 'aria-label': 'Ana menü' });
  for (const [id, ad] of sayfalar) menu.append(h('button', { class: id === S.sayfa ? 'secili' : '', onclick: () => { S.sayfa = id; kabukCiz(); } }, ad));
  let acilir = null;
  const ust = h('div', { class: 'ust' }, h('div', { class: 'sol' }, h('strong', { style: 'font-size:17px' }, 'Personel Görevlendirme'),
    S.surum && S.surum.ortam ? rozet(S.surum.ortam, S.surum.ortam === 'CANLI' ? 'kotu' : 'iyi') : null),
    h('div', { class: 'sag' },
      gl.length > 1 ? h('div', { class: 'gorunum' },
        h('button', { 'aria-haspopup': 'true', onclick: () => { if (acilir) { acilir.remove(); acilir = null; return; }
          acilir = h('div', { class: 'acilir' }, gl.map((g) => h('button', { class: g === S.gorunum ? 'secili' : '', onclick: () => { S.gorunum = g; S.sayfa = null; tercihYaz(g); kabukCiz(); } }, ROLAD[g] + (g === S.gorunum ? ' ✓' : ''))));
          ust.querySelector('.gorunum').append(acilir); } }, 'Görünüm: ' + ROLAD[S.gorunum] + ' ▾')) : null,
      h('span', { style: 'color:var(--soluk);font-size:13px' }, k.adiSoyadi + ' · ' + k.hesap)));
  goster(h('div', { class: 'kabuk' }, ust, h('div', { class: 'govde' }, menu, icerik)));
  const sayfa = sayfalar.find((x) => x[0] === S.sayfa);
  try { icerik.replaceChildren(await sayfa[2]()); } catch (e) { icerik.replaceChildren(mesajKutu('kotu', e.message)); }
}

function yetkisizSayfa(k) {
  const kopya = h('button', { onclick: async () => { try { await navigator.clipboard.writeText(k.hesap); toast('Hesap adı kopyalandı.'); } catch (e) { toast('Kopyalanamadı; hesap adını elle yazın.', 'uyari'); } } }, 'Hesap adını kopyala');
  goster(h('div', { class: 'tam' }, h('div', { class: 'kutu' },
    h('h1', { style: 'font-size:20px;margin:0' }, 'Yetkisiz Erişim'),
    h('p', { style: 'margin:0;color:var(--soluk)' }, 'Windows hesabınız bu uygulamada tanımlı değil ya da hiçbir rolü yok. Veritabanına bağlanabilmek yetki anlamına gelmez.'),
    h('div', { class: 'kod' }, k.hesap), h('p', { style: 'margin:0;color:var(--soluk);font-size:13px' }, 'Erişim için bu hesap adını merkez yöneticisine iletin.'),
    kopya, h('button', { onclick: async () => { await Kopru.cagir('baglantiKapat'); baglantiFormu(); } }, 'Bağlantıyı kapat'))));
}
