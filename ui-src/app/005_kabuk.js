// Kabuk: üst çubuk (ortam, görünüm geçişi), rol bazlı menü ve sayfalar.
const SAYFALAR = {
  YONETICI: [['talep', 'Talepler', talepSayfa], ['matris', 'Haftalık matris', matrisSayfa], ['izin', 'İzin ve rapor', izinRaporSayfa], ['analiz', 'Analiz', analizSayfa], ['havuz', 'Proje havuzu', havuzSayfa], ['takvim', 'Akademik takvim', takvimSayfa], ['ayarlar', 'Ayarlar', ayarlarSayfa]],
  SORUMLU: [['talep', 'Görev Talep Arayüzü', talepSayfa], ['matris', 'Haftalık matris', matrisSayfa], ['izin', 'İzin ve rapor', izinRaporSayfa], ['analiz', 'Analiz', analizSayfa], ['ayarlar', 'Ayarlar', ayarlarSayfa]],
  SAHA: [['matris', 'Haftalık matris', matrisSayfa], ['gorevim', 'Görevlerim', izinRaporSayfa], ['ayarlar', 'Ayarlar', ayarlarSayfa]],
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
  const rozetler = {};
  for (const [id, ad] of sayfalar) {
    const r = h('span', { class: 'sayac', hidden: true, style: 'margin-left:6px;background:var(--kotu,#c0392b);color:#fff;border-radius:10px;padding:0 7px;font-size:12px;font-weight:600' });
    rozetler[id] = r;
    menu.append(h('button', { class: id === S.sayfa ? 'secili' : '', onclick: () => { S.sayfa = id; kabukCiz(); } }, ad, r));
  }
  // Rozet sayaçları: Yönetici → Talepler (bekleyen + revize + ikame), İzin ve rapor (izin onayı); Sorumlu → Talepler; Saha → Görevlerim (okunmamış bildirim).
  async function sayacYukle() {
    try {
      const c = await Kopru.cagir('sayaclar', {});
      const topla = (...a) => a.reduce((t, x) => t + (Number(x) || 0), 0);
      const ver = { talep: S.gorunum === 'YONETICI' ? topla(c.bekleyenTalep, c.revizeBekleyen, c.ikameUyari) : topla(c.onaylanan, c.reddedilen, c.revizeBekleyen, c.ikameUyari),
        izin: S.gorunum === 'YONETICI' ? topla(c.izinOnay) : 0, gorevim: topla(c.bildirim) };
      const ipucu = { talep: S.gorunum === 'YONETICI' ? 'Bekleyen talep ' + (c.bekleyenTalep || 0) + ' · revize ' + (c.revizeBekleyen || 0) + ' · ikame uyarısı ' + (c.ikameUyari || 0)
        : 'Onaylanan ' + (c.onaylanan || 0) + ' · reddedilen ' + (c.reddedilen || 0) + ' · revize bekleyen ' + (c.revizeBekleyen || 0) + ' · ikame ihtiyacı ' + (c.ikameUyari || 0),
        izin: 'Onay bekleyen izin ' + (c.izinOnay || 0), gorevim: 'Okunmamış bildirim ' + (c.bildirim || 0) };
      for (const id of Object.keys(rozetler)) { const n = ver[id] || 0; rozetler[id].hidden = n === 0; rozetler[id].textContent = String(n); rozetler[id].title = ipucu[id] || ''; }
    } catch (e) { /* sayaç yüklenemezse menü yine çalışır */ }
  }
  let acilir = null;
  const ust = h('div', { class: 'ust' }, h('div', { class: 'sol' }, h('strong', { style: 'font-size:17px' }, 'Personel Görevlendirme'),
    S.surum && S.surum.ortam ? rozet(S.surum.ortam, S.surum.ortam === 'CANLI' ? 'kotu' : 'iyi') : null),
    h('div', { class: 'sag' },
      gl.length > 1 ? h('div', { class: 'gorunum' },
        h('button', { 'aria-haspopup': 'true', onclick: () => { if (acilir) { acilir.remove(); acilir = null; return; }
          acilir = h('div', { class: 'acilir' }, gl.map((g) => h('button', { class: g === S.gorunum ? 'secili' : '', onclick: () => { S.gorunum = g; S.sayfa = null; tercihYaz(g); kabukCiz(); } }, ROLAD[g] + (g === S.gorunum ? ' ✓' : ''))));
          ust.querySelector('.gorunum').append(acilir); } }, 'Görünüm: ' + ROLAD[S.gorunum] + ' ▾')) : null,
      h('button', { title: 'Verileri şimdi yenile (otomatik yenileme 30 saniyede bir)', onclick: async () => { await sayacYukle(); if (S.yenile) { try { await S.yenile(); } catch (e) { hata(e); } } else { kabukCiz(); } toast('Yenilendi.'); } }, 'Yenile'),
      h('span', { style: 'color:var(--soluk);font-size:13px' }, k.adiSoyadi + ' · ' + k.hesap)));
  goster(h('div', { class: 'kabuk' }, ust, h('div', { class: 'govde' }, menu, icerik)));
  const sayfa = sayfalar.find((x) => x[0] === S.sayfa);
  S.yenile = null;
  clearInterval(S.zaman);
  sayacYukle();
  S.zaman = setInterval(async () => {
    if (!menu.isConnected) { clearInterval(S.zaman); return; }
    if (document.hidden) return;
    sayacYukle();
    const a = document.activeElement;
    if (S.yenile && !(a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && icerik.contains(a))) { try { await S.yenile(); } catch (e) { /* sessiz */ } }
  }, 30000);
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
