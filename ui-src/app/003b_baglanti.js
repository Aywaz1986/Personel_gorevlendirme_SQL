// Gizli/ortak bağlantı yapılandırması ve yüzen bağlantı penceresi (Dilim 13; Özlük ile aynı davranış).
// Normal kullanıcı bağlantı formunu görmez: bağlantı exe klasöründeki dosyadan sessizce kurulur. Form yalnızca Yönetici bağlantısıyla açılır.

const lsOku = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsYaz = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* depolama yoksa sorun değil */ } };
const yoneticiMi = () => !!(S.kimlik && S.kimlik.yonetici);

function pencereKaldir() { const e = document.getElementById('bglPen'); if (e) e.remove(); }

// Sade bilgi ekranı (form değil): normal kullanıcı sunucu adını görmez, yalnızca ne yapacağını görür.
function bilgiEkrani(durum, mesaj) {
  pencereKaldir();
  const baslik = { yok: 'Bağlantı ayarı yapılmamış', baglanamadi: 'Sunucuya bağlanılamadı', yetkisiz: 'Erişim yetkiniz yok' }[durum] || 'Bağlantı kurulamadı';
  const aciklama = durum === 'yok' ? 'Bu bilgisayar için sunucu bağlantısı tanımlı değil. Lütfen yöneticinize başvurun.'
    : durum === 'yetkisiz' ? 'Windows hesabınız bu uygulamada tanımlı değil. Erişim için yöneticinize başvurun.'
    : 'Sunucuya şu an ulaşılamıyor. Biraz sonra yeniden deneyin; sorun sürerse yöneticinize başvurun.';
  goster(h('div', { class: 'tam' }, h('div', { class: 'kutu' },
    h('h1', { style: 'font-size:20px;margin:0' }, baslik),
    h('p', { style: 'margin:0;color:var(--soluk)' }, aciklama),
    mesaj && durum !== 'yok' ? h('div', { class: 'mesaj kotu', style: 'text-align:left;white-space:pre-wrap;width:100%;box-sizing:border-box' }, mesaj) : null,
    durum === 'yok' ? null : h('button', { class: 'ana', onclick: () => otoBaglan() }, 'Yeniden dene'),
    h('p', { style: 'margin:6px 0 0;font-size:11px' }, h('a', { href: '#', style: 'color:var(--soluk)', onclick: (ev) => { ev.preventDefault(); baglantiFormu(durum === 'yok' ? '' : mesaj); } }, 'Yönetici: bağlantı ayarları')))));
}

// Bağlantı formu: yalnızca yönetici bağlantısı (bilgi ekranındaki bağlantı) ya da pencereden "Bağlantıyı değiştir" ile açılır.
function baglantiFormu(hataMetni) {
  pencereKaldir();
  const bagliydi = !!S.kimlik;
  const b = S.baglanti || {};
  const sunucu = h('input', { class: 'metin', id: 'sunucu', placeholder: 'SUNUCU,PORT', autocomplete: 'off', value: bagliydi ? (b.sunucu || '') : '' });
  const db = h('input', { class: 'metin', id: 'veritabani', placeholder: 'veritabanı adı', autocomplete: 'off', value: bagliydi ? (b.veritabani || '') : '' });
  const sif = h('input', { type: 'checkbox', checked: true });
  const guv = h('input', { type: 'checkbox' });
  const vars = h('input', { type: 'checkbox', id: 'varsayilan' });
  const kutu = h('div', { class: 'mesaj kotu', hidden: !hataMetni, style: 'white-space:pre-wrap' }, hataMetni || '');
  const bilgi = h('div', { class: 'mesaj bilgi', hidden: true });
  const bagla = h('button', { class: 'ana', onclick: async () => {
    kutu.hidden = true; bagla.disabled = true;
    try {
      const sec = { server: sunucu.value, database: db.value, encrypt: sif.checked, trust: guv.checked, kaydet: true };
      await Kopru.cagir('baglan', sec);
      const k = await Kopru.cagir('ben', { tercih: tercihOku() });
      if (vars.checked) {
        if (!k.yonetici) toast('Varsayılan bağlantıyı yalnızca Merkez Yönetici kaydedebilir.', 'uyari');
        else {
          try { const r = await Kopru.cagir('varsayilanBaglantiYaz', { server: sec.server, database: sec.database, encrypt: sec.encrypt, trust: sec.trust }); toast('Varsayılan bağlantı kaydedildi: ' + r.yol); }
          catch (e) { hata(e); }
        }
      }
      S.baglanti = { sunucu: sunucu.value.trim(), veritabani: db.value.trim(), kaynak: 'form' };
      await baslaSonrasi();
    } catch (e) { kutu.textContent = e.message; kutu.hidden = false; bagla.disabled = false; }
  } }, 'Bağlan');
  const sil = h('button', { onclick: async () => {
    try { const r = await Kopru.cagir('varsayilanBaglantiSil', {}); toast(r.silindi ? 'Varsayılan bağlantı dosyası silindi.' : 'Silinecek varsayılan dosya yoktu.'); }
    catch (e) { hata(e); }
  } }, 'Varsayılan bağlantıyı sil');
  if (bagliydi && yoneticiMi()) {
    Kopru.cagir('varsayilanBaglantiDurum', {}).then((d) => { bilgi.textContent = d.mevcut ? 'Bu bilgisayarın varsayılan bağlantısı: ' + d.sunucu + ' / ' + d.veritabani + ' (' + d.yol + ')' : 'Bu bilgisayarda varsayılan bağlantı dosyası yok.'; bilgi.hidden = false; }).catch(() => { /* durum okunamazsa form yine çalışır */ });
  }
  goster(h('div', { class: 'tam' }, h('div', { class: 'kutu', style: 'text-align:left;justify-items:stretch' },
    h('h1', { style: 'font-size:20px;margin:0' }, 'Personel Görevlendirme'),
    h('p', { class: 'alt', style: 'margin:0;color:var(--soluk)' }, 'SQL Server bağlantısı (Windows kimliğiyle). Yetkiniz Windows hesabınızdan belirlenir.'),
    h('label', null, 'Sunucu', sunucu), h('label', null, 'Veritabanı', db),
    h('label', { class: 'onay' }, sif, ' Şifreli bağlantı'), h('label', { class: 'onay' }, guv, ' Sertifikaya güven'),
    h('label', { class: 'onay' }, vars, ' Yönetici: bu bilgileri exe klasöründe varsayılan olarak kaydet (herkes bağlantı penceresi görmeden otomatik bağlanır)'),
    bagla, bagliydi ? h('button', { onclick: () => baslaSonrasi() }, 'Vazgeç') : null,
    bagliydi && yoneticiMi() ? sil : null, bilgi, kutu)));
}

/* ---------- Yüzen bağlantı penceresi ---------- */
function baglantiPenceresi() {
  pencereKaldir();
  const k = S.kimlik, y = yoneticiMi(), b = S.baglanti || {};
  const sat = (a, d) => h('div', { class: 'r' }, h('span', null, a), h('span', null, d));
  const ortam = S.surum && S.surum.ortam;
  const kucuk = lsOku('gorev_pencere') !== '1';
  const col = h('button', { class: 'c', id: 'bglCol', type: 'button', title: 'Ayrıntıyı aç / daralt', 'aria-label': 'Ayrıntıyı aç / daralt' }, kucuk ? '+' : '–');
  const pin = h('button', { class: 'c', id: 'bglPin', type: 'button', 'aria-label': 'İğnele' }, '📌');
  const rf2 = h('button', { class: 'c', id: 'bglRf2', type: 'button', title: 'Sunucudan yenile', 'aria-label': 'Sunucudan yenile' }, '↻');
  const rf = h('button', { class: 'y', id: 'bglRf', type: 'button' }, 'Yenile');
  const chg = y ? h('button', { class: 'y', type: 'button', style: 'margin-top:4px', onclick: () => baglantiFormu() }, 'Bağlantıyı değiştir') : null;
  const el = h('div', { id: 'bglPen', class: kucuk ? 'kucuk' : '', role: 'region', 'aria-label': 'Bağlantı durumu' },
    h('div', { class: 'h' }, h('span', { style: 'color:#6ee7b7' }, '●'), h('b', null, 'Bağlandı'), h('span', { class: 'v' }, S.surum && S.surum.uygulama ? 'v' + S.surum.uygulama : ''), rf2, pin, col),
    h('div', { class: 'b' },
      sat('Sunucu tipi', 'SQL Server'),
      y && b.sunucu ? sat('Sunucu', b.sunucu) : null, y && b.veritabani ? sat('Veritabanı', b.veritabani) : null,
      k ? sat('Kullanıcı', k.hesap) : null, k ? sat('Rol', (k.gorunumler || []).map((g) => ROLAD[g]).join(', ') || '-') : null,
      ortam ? sat('Ortam', ortam) : null, rf, chg));
  document.body.append(el);

  const klemp = (x, yy) => [Math.max(0, Math.min(x, innerWidth - 60)), Math.max(0, Math.min(yy, innerHeight - 40))];
  const sayi = (v) => Number.isFinite(v);
  const kisK = () => { try { return JSON.parse(lsOku('gorev_pencere_pos') || 'null'); } catch (e) { return null; } };
  const orgK = () => { const o = S.pencere; return o && sayi(o.x) && sayi(o.y) ? { x: o.x, y: o.y, w: o.w, h: o.h } : null; };
  const etkin = () => { const kk = kisK(), o = orgK(); return kk && sayi(kk.x) && sayi(kk.y) ? kk : o; };
  const iglendi = () => { const v = lsOku('gorev_pencere_pin'); return v === '1' || (v === null && !!orgK()); };
  const gecerli = () => { const r = el.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; };
  const konum = () => {
    const p = etkin();
    if (!p) { el.style.left = el.style.top = el.style.bottom = el.style.width = el.style.height = ''; el.classList.remove('tasindi', 'olcu'); return; }
    const [x, yy] = klemp(p.x, p.y);
    el.style.left = x + 'px'; el.style.top = yy + 'px'; el.style.bottom = 'auto';
    if (sayi(p.w) && sayi(p.h) && p.w >= 150 && p.h >= 90 && !el.classList.contains('kucuk')) {
      el.style.width = Math.min(p.w, innerWidth - 8) + 'px'; el.style.height = Math.min(p.h, innerHeight - 8) + 'px'; el.classList.add('olcu');
    } else { el.style.width = el.style.height = ''; el.classList.remove('olcu'); }
    el.classList.add('tasindi');
  };
  const durum = () => {
    const ig = iglendi();
    el.classList.toggle('iglendi', ig);
    pin.style.opacity = ig ? '1' : '.55';
    pin.title = ig ? 'İğneyi kaldır (taşıma ve boyutlandırma açılır)' : 'İğnele: konumu kilitle' + (y ? ' ve tüm kullanıcılar için varsayılan yap' : '');
  };
  const yerles = () => { durum(); konum(); };
  yerles();

  pin.onclick = async (e) => {
    e.stopPropagation();
    if (!iglendi()) {
      const g = gecerli();
      if (el.classList.contains('kucuk')) { const eski = kisK() || orgK(); if (eski && sayi(eski.w) && sayi(eski.h)) { g.w = eski.w; g.h = eski.h; } else { delete g.w; delete g.h; } }
      lsYaz('gorev_pencere_pos', JSON.stringify(g)); lsYaz('gorev_pencere_pin', '1');
      if (y) {
        try { await Kopru.cagir('pencereKonumYaz', { x: g.x, y: g.y, w: g.w || 0, h: g.h || 0 }); S.pencere = g; toast('Bağlantı penceresi iğnelendi; konum tüm kullanıcılar için varsayılan oldu'); }
        catch (er) { hata(er); }
      } else toast('Bağlantı penceresi iğnelendi');
    } else {
      lsYaz('gorev_pencere_pin', '0');
      if (y && orgK()) {
        try { await Kopru.cagir('pencereKonumYaz', { sil: true }); S.pencere = null; toast('İğne kaldırıldı; kurum varsayılan konumu da kaldırıldı'); }
        catch (er) { hata(er); }
      }
    }
    yerles();
  };
  col.onclick = () => {
    const kk = el.classList.toggle('kucuk');
    col.textContent = kk ? '+' : '–'; lsYaz('gorev_pencere', kk ? '0' : '1'); konum();
  };
  const yenile = async () => {
    rf.disabled = rf2.disabled = true;
    try { if (S.yenile) await S.yenile(); toast('Sunucudan yenilendi.'); } catch (er) { toast('Yenileme başarısız: ' + (er.message || er), 'kotu'); }
    rf.disabled = rf2.disabled = false;
  };
  rf.onclick = yenile;
  rf2.onclick = (e) => { e.stopPropagation(); yenile(); };

  // Sürükleme (başlıktan; iğneliyken kapalı)
  let s = null;
  const hd = el.querySelector('.h');
  hd.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button') || e.button || iglendi()) return;
    const r = el.getBoundingClientRect();
    s = { dx: e.clientX - r.left, dy: e.clientY - r.top, moved: false };
    hd.setPointerCapture && hd.setPointerCapture(e.pointerId);
  });
  hd.addEventListener('pointermove', (e) => {
    if (!s) return;
    const [x, yy] = klemp(e.clientX - s.dx, e.clientY - s.dy);
    if (!s.moved) { s.moved = true; el.classList.add('suruk'); }
    el.style.left = x + 'px'; el.style.top = yy + 'px'; el.style.bottom = 'auto'; el.classList.add('tasindi');
  });
  const bitir = () => {
    if (!s) return;
    el.classList.remove('suruk');
    if (s.moved) lsYaz('gorev_pencere_pos', JSON.stringify(Object.assign({}, kisK() || {}, { x: parseInt(el.style.left, 10), y: parseInt(el.style.top, 10) })));
    s = null;
  };
  hd.addEventListener('pointerup', bitir); hd.addEventListener('pointercancel', bitir);
  hd.addEventListener('dblclick', (e) => { if (e.target.closest('button') || iglendi()) return; lsYaz('gorev_pencere_pos', ''); yerles(); });

  // Kenar/köşeden boyutlandırma (iğneliyken ve daraltılmışken kapalı)
  el.append(...['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'].map((d) => h('i', { class: 'rz ' + d, 'data-d': d })));
  let rs = null;
  el.querySelectorAll('.rz').forEach((hh) => {
    hh.addEventListener('pointerdown', (e) => {
      if (e.button || iglendi()) return;
      e.stopPropagation(); e.preventDefault();
      rs = { d: hh.dataset.d, x: e.clientX, y: e.clientY, g: gecerli() };
      hh.setPointerCapture && hh.setPointerCapture(e.pointerId); el.classList.add('suruk');
    });
    hh.addEventListener('pointermove', (e) => {
      if (!rs) return;
      const dx = e.clientX - rs.x, dy = e.clientY - rs.y, d = rs.d, g = rs.g;
      let { x, y: yy, w, h: ht } = g;
      if (d.includes('e')) w = g.w + dx;
      if (d.includes('s')) ht = g.h + dy;
      if (d.includes('w')) { w = g.w - dx; x = g.x + dx; }
      if (d.includes('n')) { ht = g.h - dy; yy = g.y + dy; }
      if (w < 220) { if (d.includes('w')) x -= 220 - w; w = 220; }
      if (ht < 70) { if (d.includes('n')) yy -= 70 - ht; ht = 70; }
      w = Math.min(w, innerWidth - 8); ht = Math.min(ht, innerHeight - 8);
      x = Math.max(0, Math.min(x, innerWidth - w)); yy = Math.max(0, Math.min(yy, innerHeight - ht));
      Object.assign(el.style, { left: x + 'px', top: yy + 'px', bottom: 'auto', width: w + 'px', height: ht + 'px' });
      el.classList.add('tasindi', 'olcu');
    });
    const son = () => { if (!rs) return; rs = null; el.classList.remove('suruk'); lsYaz('gorev_pencere_pos', JSON.stringify(gecerli())); };
    hh.addEventListener('pointerup', son); hh.addEventListener('pointercancel', son);
  });
  if (!window.__bglResize) { window.__bglResize = true; addEventListener('resize', () => { const e2 = document.getElementById('bglPen'); if (e2 && e2.classList.contains('tasindi')) gecerliKonumKlemp(e2); }); }
}
function gecerliKonumKlemp(e2) {
  const r = e2.getBoundingClientRect();
  e2.style.left = Math.max(0, Math.min(r.left, innerWidth - 60)) + 'px'; e2.style.top = Math.max(0, Math.min(r.top, innerHeight - 40)) + 'px';
}
