// Kabuk (Dilim 14, yeni tasarım): iki katmanlı koyu üst çubuk, yetkiye göre rol düğmeleri, KPI kartları, sekme şeridi, alt bilgi.
const SAYFALAR = {
  YONETICI: [['talep', 'Bekleyen Görev Talepleri', talepSayfa], ['izin', 'İzin Onayları', izinRaporSayfa], ['revize', 'Revize & İkame Uyarıları', revizeIkameSayfa], ['matris', 'Ortak 7 Günlük Özet Matris', matrisSayfa],
    ['analiz', 'Ana Proje & Personel Analizi', analizSayfa], ['havuz', 'Proje Havuzu & Akademik Takvim', havuzTakvimSayfa], ['yetki', 'Kullanıcı Yetki & Audit Log', yetkiSayfa], ['ayarlar', 'Ayarlar', ayarlarSayfa]],
  SORUMLU: [['talep', 'Yeni Görev Talebi & Aktif Taleplerim', talepSayfa], ['matris', 'Ortak 7 Günlük Özet Matris', matrisSayfa], ['analiz', 'Ana Proje & Personel Analizi', analizSayfa], ['izin', 'İzin ve Rapor', izinRaporSayfa], ['ayarlar', 'Ayarlar', ayarlarSayfa]],
  SAHA: [['gorevim', 'Görevlerim, İzin Talebi & Rapor Beyanı', izinRaporSayfa], ['matris', 'Ortak 7 Günlük Özet Matris', matrisSayfa], ['ayarlar', 'Ayarlar', ayarlarSayfa]],
};
const ROL_DUGME = { YONETICI: 'Merkez Yönetici Paneli', SORUMLU: 'Proje Sorumlusu Talep Arayüzü', SAHA: 'Saha Personeli İzleme & Beyan' };
const SAYFA_BASLIK = {
  YONETICI: ['Merkez Yönetici ve Atama Paneli', 'Kesin manuel onay ilkesi • Eşzamanlı ÖÖ/ÖS zaman dilimi kilidi ve vekalet yönetimi'],
  SORUMLU: ['Proje Sorumlusu Görev Talep ve Takip Arayüzü', 'Hiyerarşik proje talebi, geçmiş görev kopyalama, erken bitiş ve sorumlu devri yönetimi'],
};
function bosSayfa(baslik, metin) {
  return h('div', { class: 'icerik', style: 'padding:0' }, h('h1', null, baslik), h('div', { class: 'kart', style: 'text-align:center;border-style:dashed;color:var(--soluk)' }, metin));
}

async function kabukCiz() {
  const k = S.kimlik;
  if (!document.getElementById('bglPen')) baglantiPenceresi();
  const gl = k.gorunumler;
  const sayfalar = SAYFALAR[S.gorunum];
  if (!S.sayfa || !sayfalar.some((x) => x[0] === S.sayfa)) S.sayfa = sayfalar[0][0];
  const icerik = h('div', { class: 'icerik' });
  const rozetler = {};
  const kpiKutu = h('div', { class: 'kpiler', hidden: true });
  const sekmeler = h('nav', { class: 'sekmeler', 'aria-label': 'Ana menü' });
  for (const [id, ad] of sayfalar) {
    const r = h('span', { class: 'sayac', hidden: true });
    rozetler[id] = r;
    sekmeler.append(h('button', { class: id === S.sayfa ? 'secili' : '', onclick: () => { S.sayfa = id; kabukCiz(); } }, ad, r));
  }
  const kpiKart = (t, ad, n, cip, ek) => h('div', { class: 'kpi ' + t + (ek || '') }, h('div', { class: 'ad' }, ad), h('div', { class: 'alt2' }, h('div', { class: 'n' }, n), h('span', { class: 'cp' }, cip)));
  // Sayaçlar (30 sn): Yönetici → KPI kartları + sekme rozetleri; Sorumlu → Talepler; Saha → Görevlerim (okunmamış bildirim).
  async function sayacYukle() {
    try {
      const c = await Kopru.cagir('sayaclar', {});
      S.sonYenileme = Date.now();
      const topla = (...a) => a.reduce((t, x) => t + (Number(x) || 0), 0);
      const yon = S.gorunum === 'YONETICI';
      const ver = { talep: yon ? topla(c.bekleyenTalep) : topla(c.onaylanan, c.reddedilen, c.revizeBekleyen, c.ikameUyari), izin: yon ? topla(c.izinOnay) : 0, revize: topla(c.revizeBekleyen, c.ikameUyari), gorevim: topla(c.bildirim) };
      const ipucu = { talep: yon ? 'Bekleyen talep ' + (c.bekleyenTalep || 0) : 'Onaylanan ' + (c.onaylanan || 0) + ' · reddedilen ' + (c.reddedilen || 0) + ' · revize bekleyen ' + (c.revizeBekleyen || 0) + ' · ikame ihtiyacı ' + (c.ikameUyari || 0),
        izin: 'Onay bekleyen izin ' + (c.izinOnay || 0), revize: 'Revize ' + (c.revizeBekleyen || 0) + ' · ikame uyarısı ' + (c.ikameUyari || 0), gorevim: 'Okunmamış bildirim ' + (c.bildirim || 0) };
      const renk = { talep: '', izin: 'sari', revize: 'kirmizi', gorevim: '' };
      for (const id of Object.keys(rozetler)) { const n = ver[id] || 0; rozetler[id].hidden = n === 0; rozetler[id].textContent = String(n); rozetler[id].title = ipucu[id] || ''; rozetler[id].className = 'sayac ' + (renk[id] || ''); }
      if (yon) {
        kpiKutu.hidden = false;
        kpiKutu.replaceChildren(kpiKart('t1', 'Bekleyen Talepler', c.bekleyenTalep || 0, 'Onay / Kısmi'), kpiKart('t2', 'İzin Onayları', c.izinOnay || 0, 'Tam / Yarım Gün'), kpiKart('t3', 'Revize Talepleri', c.revizeBekleyen || 0, 'Süre / Kişi'),
          kpiKart('t4', 'Rapor Kaynaklı İkame', c.ikameUyari || 0, 'Acil İkame', c.ikameUyari > 0 ? ' acil' : ''),
          kpiKart('t5', 'Aktif Sahadaki Personel', h('span', null, String(c.sahadaBugun || 0), ' ', h('small', null, '/ ' + (c.sahaToplam || 0))), 'Bugün Sahada'));
      }
    } catch (e) { /* sayaç yüklenemezse menü yine çalışır */ }
  }
  S.sayacYukle = sayacYukle;
  async function elleYenile() {
    await sayacYukle();
    if (S.yenile) { try { await S.yenile(); } catch (e) { hata(e); } } else { kabukCiz(); return; }
    toast('Yenilendi.');
  }
  const sayacEl = h('b', null, '30 sn');
  S.sonYenileme = Date.now();
  const ortam = S.surum && S.surum.ortam;
  const camSinif = () => (document.documentElement.getAttribute('data-cam') === '1' ? ' cam' : '');
  const ust1 = h('div', { class: 'ust1' + camSinif() },
    h('div', { class: 'g' }, h('span', { class: 'yesil' }, h('span', { class: 'nokta' }), 'SQL Server: Aktif' + (S.surum && S.surum.uygulama ? ' (v' + S.surum.uygulama + ')' : '')), h('span', null, '|'),
      h('span', null, 'Windows Oturumu: ', h('b', null, k.hesap + (k.adiSoyadi ? ' (' + k.adiSoyadi + ')' : ''))),
      ortam ? h('span', { class: 'cip', style: ortam === 'CANLI' ? 'background:#7f1d1d;color:#fff' : '' }, ortam) : null,
      gl.length > 1 ? h('span', { class: 'cip' }, 'Kurulumsuz Merkezi Ağ İstemcisi • Çoklu Rol Yetkili') : h('span', { class: 'cip' }, 'Kurulumsuz Merkezi Ağ İstemcisi')),
    h('div', { class: 'g' }, h('span', { class: 'say', title: 'Veriler 30 saniyede bir kendiliğinden yenilenir' }, 'Oto-Yenileme: ', sayacEl),
      h('button', { class: 'yen', onclick: elleYenile, title: 'Verileri şimdi yenile' }, '⟳ Yenile')));
  // Yetkisi olmayan rollere ait düğmeler hiç gösterilmez; yalnızca kişinin rolleri listelenir.
  const rolDugmeleri = h('div', { class: 'rolsec' }, h('span', { class: 'et' }, gl.length > 1 ? 'Görünüm geçişi:' : 'Görünüm:'),
    gl.filter((g) => ROL_DUGME[g]).map((g) => h('button', { class: g === S.gorunum ? 'secili' : '', title: ROLAD[g], onclick: () => { if (g === S.gorunum) return; S.gorunum = g; S.sayfa = null; tercihYaz(g); kabukCiz(); } }, ROL_DUGME[g])));
  const ust2 = h('div', { class: 'ust2' + camSinif() },
    h('div', { class: 'marka' }, h('div', { class: 'logo' }, '👥'), h('div', null, h('h1', null, 'Merkezi Personel Görevlendirme, Talep ve İzleme Sistemi'),
      h('p', { class: 'alt' }, 'Özlük Entegreli Operasyon Planlama • Tam Gün (1.0) / ÖÖ (0.5) / ÖS (0.5) Zaman Dilimi Motoru'))), rolDugmeleri);

  // Sayfa başlığı: Yönetici/Sorumlu için başlık bloğu; Saha için kimlik şeridi.
  let baslik = null;
  if (SAYFA_BASLIK[S.gorunum]) {
    const [t, a] = SAYFA_BASLIK[S.gorunum];
    baslik = h('div', { class: 'sayfabas' }, h('div', null, h('h1', null, t), h('p', { class: 'alt' }, a)),
      S.gorunum === 'YONETICI' ? h('div', { class: 'gorunum' }, h('button', { class: 'ana', 'aria-haspopup': 'true', style: 'background:var(--nav);border-color:var(--baslik);border-radius:10px;padding:10px 18px;font-weight:600', onclick: (ev) => {
        const var_ = ev.currentTarget.parentNode.querySelector('.acilir'); if (var_) { var_.remove(); return; }
        const git = (sayfa, acilis) => { S.sayfa = sayfa; S.acilis = acilis || null; kabukCiz(); };
        ev.currentTarget.parentNode.append(h('div', { class: 'acilir' },
          h('button', { onclick: () => git('talep', 'yeniTalep') }, 'Görev talebi gir (vekâleten)'), h('button', { onclick: () => git('izin', 'izin') }, 'İzin girişi (vekâleten)'), h('button', { onclick: () => git('izin', 'rapor') }, 'Rapor girişi (vekâleten)')));
      } }, '+ Doğrudan Görev / İzin / Rapor Girişi (Vekalet)')) : null);
  } else if (S.gorunum === 'SAHA') {
    baslik = h('div', { class: 'kart', style: 'background:linear-gradient(90deg,var(--nav2),var(--celik));color:#fff;border:0;display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between' },
      h('div', null, h('div', { style: 'font-size:11px;font-weight:700;letter-spacing:.06em;opacity:.85' }, 'SAHA PERSONELİ İZLEME VE BEYAN GÖRÜNÜMÜ'),
        h('div', { style: 'font-size:22px;font-weight:700' }, k.adiSoyadi, h('span', { style: 'font-size:13px;font-weight:400;opacity:.9' }, '  (' + [k.sicilNo ? 'Sicil: ' + k.sicilNo : null, 'Windows: ' + k.hesap, k.bolum].filter(Boolean).join(' • ') + ')'))));
  }

  const altbilgi = h('footer', { class: 'altbilgi' },
    h('span', null, h('b', null, 'Merkezi Görevlendirme Sistemi' + (S.surum && S.surum.uygulama ? ' v' + S.surum.uygulama : '')), ' • Özlük kadro kaynağı: ', h('code', null, 'gorev.personel')),
    h('span', null, 'Standart Adam-Gün: ', h('b', null, 'Tam = 1.0'), ' | ', h('b', null, 'ÖÖ = 0.5'), ' | ', h('b', null, 'ÖS = 0.5')));
  goster(h('div', { class: 'kabuk' }, ust1, ust2, h('main', { class: 'icerik', style: 'flex:1' }, baslik, S.gorunum === 'YONETICI' ? kpiKutu : null, sekmeler, icerik), altbilgi));
  // icerik, main içinde: sayfa gövdesi ayrı kapta
  icerik.className = 'sayfa-govde'; icerik.style.cssText = 'display:grid;gap:16px;min-width:0';
  const sayfa = sayfalar.find((x) => x[0] === S.sayfa);
  S.yenile = null;
  clearInterval(S.zaman); clearInterval(S.saniye);
  sayacYukle();
  S.saniye = setInterval(() => { if (!sekmeler.isConnected) { clearInterval(S.saniye); return; } sayacEl.textContent = Math.max(0, 30 - Math.floor((Date.now() - S.sonYenileme) / 1000)) + ' sn'; }, 1000);
  S.zaman = setInterval(async () => {
    if (!sekmeler.isConnected) { clearInterval(S.zaman); return; }
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
    kopya, h('button', { onclick: () => otoBaglan() }, 'Yeniden dene'),
    h('p', { style: 'margin:6px 0 0;font-size:11px' }, h('a', { href: '#', style: 'color:var(--soluk)', onclick: (ev) => { ev.preventDefault(); baglantiFormu(); } }, 'Yönetici: bağlantı ayarları')))));
}
