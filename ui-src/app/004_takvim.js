// Akademik takvim: tatil / kapalı gün (yalnız Merkez Yönetici düzenler). Kurallar sunucudadır.
function takvimTarihYaz(iso) { const p = String(iso).split('-'); return p.length === 3 ? p[2] + '.' + p[1] + '.' + p[0] : String(iso); }
function takvimGun(iso) { const d = new Date(iso + 'T00:00:00'); return isNaN(d) ? '' : d.toLocaleDateString('tr-TR', { weekday: 'long' }); }
function takvimZamanAd(z) { return z === 'TAM' ? 'Tüm gün' : z === 'OO' ? 'Öğleden önce (ÖÖ)' : z === 'OS' ? 'Öğleden sonra (ÖS)' : z; }
function takvimTurAd(t) { return t === 'RESMI' ? 'Resmi tatil' : t === 'IDARI' ? 'Yıllık izin (idari)' : t; }
// Kategori (kullanıcı dili) <-> sunucu alanları: Yıllık İzin = IDARI (+ yıllık izinden kesilir bayrağı), Resmi Tatil = RESMI, Yarım Gün = OO/OS.
function takvimKategoriSatirdan(x) { return x.zaman !== 'TAM' ? 'YARIM' : x.tur === 'RESMI' ? 'RESMI' : 'YILLIK'; }
function takvimKategoriAlanlar(kat, dilim, tur, yillik) {
  if (kat === 'RESMI') return { tur: 'RESMI', zaman: 'TAM', yillik: false };
  if (kat === 'YARIM') return { tur: tur || 'RESMI', zaman: dilim === 'OS' ? 'OS' : 'OO', yillik: !!yillik };
  return { tur: 'IDARI', zaman: 'TAM', yillik: yillik !== false };
}
const TAKVIM_KATEGORI = [['YILLIK', 'Yıllık İzin'], ['RESMI', 'Resmi Tatil'], ['YARIM', 'Yarım Gün']];
const AY_RENK = ['#2f6fd6', '#7c3aed', '#0e9488', '#d97706', '#16a34a', '#db2777', '#dc2626', '#0891b2', '#9333ea', '#ea580c', '#4f46e5', '#475569'];
function takvimAyAd(i) { return ['OCAK', 'ŞUBAT', 'MART', 'NİSAN', 'MAYIS', 'HAZİRAN', 'TEMMUZ', 'AĞUSTOS', 'EYLÜL', 'EKİM', 'KASIM', 'ARALIK'][i]; }
function takvimIso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function takvimHafta(d) { const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const g = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - g); const b = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); return Math.ceil(((t - b) / 86400000 + 1) / 7); }
function takvimAralikYaz(x) { return x.bitis && x.bitis !== x.baslangic ? takvimTarihYaz(x.baslangic) + ' – ' + takvimTarihYaz(x.bitis) : takvimTarihYaz(x.baslangic) + ' ' + takvimGun(x.baslangic); }
function takvimGunYaz(g) { return g === 0.5 ? '½ gün' : g + ' gün'; }

function takvimDosyaOku(dosya) {
  return new Promise((coz, red) => {
    const xlsx = /\.xlsx$/i.test(dosya.name);
    const fr = new FileReader();
    fr.onerror = () => red(new Error('Dosya okunamadı.'));
    if (xlsx) {
      fr.onload = () => { const b = new Uint8Array(fr.result); let s = ''; for (let i = 0; i < b.length; i += 8192) s += String.fromCharCode.apply(null, b.subarray(i, i + 8192)); coz({ xlsx: btoa(s) }); };
      fr.readAsArrayBuffer(dosya);
    } else {
      fr.onload = () => {
        if (String(fr.result).includes('�')) { const f2 = new FileReader(); f2.onload = () => coz({ metin: String(f2.result) }); f2.onerror = () => red(new Error('Dosya okunamadı.')); f2.readAsText(dosya, 'windows-1254'); }
        else coz({ metin: String(fr.result) });
      };
      fr.readAsText(dosya, 'utf-8');
    }
  });
}

// ---- Akademik ve Kurumsal Takvim Yönetimi (prototip uyarlaması; sunucu kaydı ARALIK tutar, ekran prototipteki gibi gün gün çizer) ----
const TK_AYLAR = ['OCAK', 'ŞUBAT', 'MART', 'NİSAN', 'MAYIS', 'HAZİRAN', 'TEMMUZ', 'AĞUSTOS', 'EYLÜL', 'EKİM', 'KASIM', 'ARALIK'];
const TK_GUNLER = ['PT', 'S', 'Ç', 'P', 'C', 'CT', 'PZ'];
const TK_TUR_SUNUCU = { RESMI_TATIL: 'RESMI', IDARI_IZIN: 'IDARI', AKADEMIK_TATIL: 'AKADEMIK' };
const TK_TUR_PROTO = { RESMI: 'RESMI_TATIL', IDARI: 'IDARI_IZIN', AKADEMIK: 'AKADEMIK_TATIL' };
function tkEsc(x) { return x == null ? '' : String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
function tkTurEtiket(t) { return t === 'RESMI_TATIL' ? 'Resmi Tatil' : t === 'IDARI_IZIN' ? 'İdari & Kurumsal Tatil' : 'Akademik Tatil'; }
function tkDilimEtiket(d) { return d === 'TAM' ? 'Tam Gün' : d === 'OO' ? 'Öğleden Önce (ÖÖ)' : 'Öğleden Sonra (ÖS)'; }
function tkTr(n) { return Number(n || 0).toFixed(1).replace('.', ','); }
function tkAgirlik(d) { return d === 'TAM' ? 1 : 0.5; }
function tkRozet(t) { return t === 'RESMI_TATIL' ? 'type-badge-resmi' : t === 'IDARI_IZIN' ? 'type-badge-idari' : 'type-badge-akademik'; }
function tkGunler(b, e, haftaSonuAtla) {
  const l = [], s = new Date(b + 'T00:00:00'), z = new Date(e + 'T00:00:00');
  for (let d = new Date(s); d <= z; d.setDate(d.getDate() + 1)) { if (haftaSonuAtla && (d.getDay() + 6) % 7 >= 5) continue; l.push(takvimIso(d)); }
  return l;
}
// Ardışık günleri (aynı tür/dilim/ad) tek aralık kayda toplar: sunucuya az kayıt gider.
function tkAraliklaYap(gunler, tur, dilim, ad) {
  const s = []; let b = null, o = null;
  const kapat = () => { if (b) s.push({ baslangic: b, bitis: o, zaman: dilim, tur, ad, yillik: tur === 'IDARI' }); };
  gunler.forEach((g) => {
    const ard = o && Math.round((new Date(g + 'T00:00:00') - new Date(o + 'T00:00:00')) / 86400000) === 1;
    if (b && ard && dilim === 'TAM') o = g; else { kapat(); b = g; o = g; }
  });
  kapat();
  return s.map((x, i) => ({ sira: i + 1, ...x }));
}

async function takvimSayfa() {
  const MIN = 2020, MAX = 2035;
  const D = { yil: Math.min(MAX, Math.max(MIN, new Date().getFullYear())), liste: [], ozet: null, filtre: 'ALL', ara: '' };
  const kok = h('div', { class: 'tkv' });
  const TK = {};
  window.TK = TK;
  const SO = S.gorunum !== 'YONETICI';   // Proje Sorumlusu / Saha: yalnız görüntüleme (sunucu da yazmayı reddeder)

  const gunKayitlari = () => {   // iso -> {id, tur, dilim, aciklama} (yarım gün tam günü ezmez)
    const m = new Map();
    D.liste.forEach((x) => tkGunler(x.baslangic, x.bitis || x.baslangic, false).forEach((g) => {
      const t = TK_TUR_PROTO[x.tur] || 'RESMI_TATIL'; const k = m.get(g);
      if (!k || x.zaman === 'TAM') m.set(g, { id: x.id, tur: t, dilim: x.zaman, aciklama: x.ad, rec: x });
    }));
    return m;
  };
  async function yukle() {
    try { D.liste = await Kopru.cagir('takvimListe', { yil: D.yil }); D.ozet = await Kopru.cagir('takvimOzet', { yil: D.yil }); }
    catch (e) { hata(e); }
    ciz();
  }

  function kpi() {
    const o = D.ozet || { resmiGun: 0, idariGun: 0, kesilenGun: 0 };
    const yarim = D.liste.filter((x) => x.zaman !== 'TAM').length;
    const kartlar = [
      ['Resmi Tatil', tkTr(o.resmiGun), 'Gün', 'Mavi (#0070C0)', 'rgba(0, 112, 192, 0.14)', '#0070C0', '#0070C0'],
      ['İdari / Kurumsal Tatil', tkTr(o.idariGun), 'Gün', 'Turuncu (#FF9900)', 'rgba(255, 153, 0, 0.18)', '#d97706', '#FF9900'],
      ['Yarım Gün (ÖÖ / ÖS)', String(yarim), 'Kayıt', '0,5 Gün Dilimi', 'rgba(15, 118, 110, 0.15)', '#0F766E', '#0F766E'],
      ['Yıllık İzinden Kesilecek Toplam', tkTr(o.kesilenGun), 'Gün', D.yil + ' Yılı Kesinti', 'rgba(245, 158, 11, 0.20)', '#b45309', 'linear-gradient(90deg, #FF9900, #ef4444)'],
    ];
    return kartlar.map((c) => `<div class="glass-card kpi-card"><div class="kpi-top-bar" style="background:${c[6]};"></div><div class="kpi-header"><span class="kpi-title">${c[0]}</span><span class="kpi-pill" style="background:${c[4]}; color:${c[5]};">${c[3]}</span></div><div class="kpi-value-row"><span class="kpi-value">${c[1]}</span><span class="kpi-unit">${c[2]}</span></div></div>`).join('');
  }

  function matris() {
    const harita = gunKayitlari(); let html = '';
    for (let m = 0; m < 12; m++) {
      const ilk = new Date(D.yil, m, 1), gun = new Date(D.yil, m + 1, 0).getDate(), basOfs = (ilk.getDay() + 6) % 7;
      let satirlar = '', imlec = 1 - basOfs;
      for (let w = 0; w < 6; w++) {
        const orta = new Date(D.yil, m, Math.max(1, Math.min(gun, imlec + 3)));
        let td = `<td class="cell-hft">${imlec <= gun ? takvimHafta(orta) : ''}</td>`;
        for (let dow = 0; dow < 7; dow++) {
          const hs = dow >= 5, hsCls = hs ? (dow === 5 ? 'cell-weekend-bg cell-weekend-start' : 'cell-weekend-bg') : '';
          if (imlec < 1 || imlec > gun) td += `<td class="${hsCls}"></td>`;
          else {
            const iso = takvimIso(new Date(D.yil, m, imlec)), it = harita.get(iso); let cls = 'day-btn';
            if (it) { const sf = it.dilim === 'TAM' ? 'tam' : it.dilim === 'OO' ? 'oo' : 'os'; cls += ' cell-' + (it.tur === 'RESMI_TATIL' ? 'resmi' : it.tur === 'IDARI_IZIN' ? 'idari' : 'akademik') + '-' + sf; }
            td += `<td class="${hsCls}"><button type="button" class="${cls}" ${SO ? 'style="cursor:default"' : `onclick="TK.tek('${iso}')"`} onmouseenter="TK.ipucu(event,'${iso}')" onmousemove="TK.ipucuTasi(event)" onmouseleave="TK.ipucuGizle()"><span>${imlec}</span>${it && it.dilim !== 'TAM' ? '<span class="half-dot"></span>' : ''}</button></td>`;
          }
          imlec++;
        }
        satirlar += `<tr>${td}</tr>`;
      }
      html += `<article class="glass-card month-card"><div class="month-header"><span class="month-name">${TK_AYLAR[m]} ${D.yil}</span><span class="month-badge">${String(m + 1).padStart(2, '0')}. Ay</span></div><table class="month-table"><thead><tr><th class="col-hft">HFT</th>${TK_GUNLER.map((d, i) => `<th class="${i >= 5 ? (i === 5 ? 'col-weekend col-weekend-start' : 'col-weekend') : ''}">${d}</th>`).join('')}</tr></thead><tbody>${satirlar}</tbody></table></article>`;
    }
    return html;
  }

  function aralikYaz(x) { return x.bitis && x.bitis !== x.baslangic ? takvimTarihYaz(x.baslangic) + ' – ' + takvimTarihYaz(x.bitis) : takvimTarihYaz(x.baslangic); }
  function tablo() {
    let satirlar = D.liste.slice().sort((a, b) => a.baslangic.localeCompare(b.baslangic));
    if (D.filtre !== 'ALL') satirlar = satirlar.filter((x) => TK_TUR_PROTO[x.tur] === D.filtre);
    const q = D.ara.trim().toLocaleLowerCase('tr-TR');
    if (q) satirlar = satirlar.filter((x) => aralikYaz(x).includes(q) || x.ad.toLocaleLowerCase('tr-TR').includes(q));
    const govde = satirlar.length ? satirlar.map((x) => {
      const t = TK_TUR_PROTO[x.tur] || 'RESMI_TATIL', yarim = x.zaman !== 'TAM';
      return `<tr><td style="font-family:var(--font-mono); font-weight:800; white-space:nowrap;">${aralikYaz(x)}</td><td style="font-weight:600;">${tkEsc(x.ad)}</td><td><span class="type-badge ${tkRozet(t)}">${tkTurEtiket(t)}</span></td><td><span class="slot-badge ${yarim ? 'slot-badge-half' : ''}">${tkDilimEtiket(x.zaman)}</span></td>${SO ? '' : `<td style="text-align:right; white-space:nowrap;"><div style="display:inline-flex; align-items:center; gap:6px;"><button type="button" class="btn btn-ghost" style="min-height:30px; padding:4px 10px; font-size:0.73rem;" onclick="TK.tekKayit(${x.id})" title="Düzenle">✎ Düzenle</button><button type="button" class="btn btn-danger" style="min-height:30px; padding:4px 10px; font-size:0.73rem;" onclick="TK.silSor(${x.id})" title="Sil">🗑 Sil</button></div></td></tr>`}`;
    }).join('') : `<tr><td colspan="${SO ? 4 : 5}" style="text-align:center; padding:28px; color:var(--text-muted);">${D.yil} yılı için seçili kriterlere uygun kayıt bulunamadı.</td></tr>`;
    return { govde, adet: satirlar.length };
  }

  function ciz() {
    const t = tablo(), kes = D.ozet ? D.ozet.kesilenGun : 0;
    const aktif = (f) => (D.filtre === f ? ' active' : '');
    const yilSecenek = []; for (let y = MIN; y <= MAX; y++) yilSecenek.push(`<option value="${y}"${y === D.yil ? ' selected' : ''}>${y}</option>`);
    const kaydirma = window.scrollY;
    kok.innerHTML = `
<header class="glass-header"><div class="container-max header-inner">
  <div class="brand-group"><div class="brand-icon" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></div>
  <div><h1 class="brand-title">Akademik ve Kurumsal Takvim Yönetimi</h1><p class="brand-subtitle">Yıllık Resmi Tatil, İdari İzin ve Akademik Takvim Planlama</p></div></div>
  <div class="header-controls">
    <div class="year-selector-box" role="group" aria-label="Takvim Yılı Seçici"><button type="button" class="year-step-btn" onclick="TK.yil(-1)" title="Önceki Yıl"${D.yil <= MIN ? ' disabled' : ''}>◀</button><div class="year-select-wrapper"><span class="year-select-label">Yıl:</span><select class="year-select" onchange="TK.yilSec(this.value)" aria-label="Takvim Yılı">${yilSecenek.join('')}</select></div><button type="button" class="year-step-btn" onclick="TK.yil(1)" title="Sonraki Yıl"${D.yil >= MAX ? ' disabled' : ''}>▶</button></div>
    ${SO ? '<span class="slot-badge">🔒 Salt okunur</span>' : ''}
    ${SO ? '' : `<button type="button" class="btn btn-primary" onclick="TK.tek()"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg><span>+ Yeni Tatil Günü Ekle</span></button>`}
    ${SO ? '' : `<button type="button" class="btn btn-success" onclick="TK.toplu('RANGE')"><span>📋 Toplu Tatil Ekle</span></button>`}
    ${SO ? '' : `<button type="button" class="btn btn-ghost" onclick="TK.csv()"><span>📥 Excel Şablonu İndir (CSV)</span></button>`}
  </div></div></header>
<main class="container-max main-stack">
  <section class="kpi-grid">${kpi()}</section>
  <section class="glass-panel legend-bar"><div class="legend-items"><span style="font-weight:800; font-size:0.72rem; text-transform:uppercase; letter-spacing:0.04em; color:var(--text-muted);">Renk Kodları:</span>
    <span class="legend-item"><span class="swatch cell-resmi-tam">29</span><span>Resmi Tatil</span></span><span class="legend-item"><span class="swatch cell-idari-tam">19</span><span>İdari / Kurumsal Tatil</span></span><span class="legend-item"><span class="swatch cell-akademik-tam">15</span><span>Akademik Tatil</span></span><span class="legend-item"><span class="swatch cell-idari-half">9</span><span>Yarım Gün (ÖÖ / ÖS)</span></span><span class="legend-item"><span class="swatch" style="background:var(--cal-weekend-header-bg); color:var(--cal-weekend-header-text); border-color:var(--cal-weekend-divider);">CT</span><span>Hafta Sonu (CT / PZ)</span></span></div>
    <div style="font-size:0.74rem; font-weight:600; color:var(--color-resmi);">${SO ? 'Takvim yalnızca görüntüleme içindir; değişiklik Merkez Yönetici tarafından yapılır.' : 'Takvim üzerindeki herhangi bir güne tıklayarak tatil ekleyebilir veya düzenleyebilirsiniz.'}</div></section>
  <section class="calendar-matrix" aria-label="12 Aylık Takvim Matrisi">${matris()}</section>
  <section class="glass-panel list-section"><div class="list-header"><div><h2 class="list-title"><span>${D.yil} Yılı Tatil ve İdari İzin Listesi</span><span class="count-badge">${t.adet} Kayıt</span></h2></div>
    <div class="list-toolbar"><input type="text" class="search-box" placeholder="Tarih veya açıklama ara..." value="${tkEsc(D.ara)}" oninput="TK.ara(this.value)" id="tk-ara" /><div class="filter-pills"><button type="button" class="filter-pill${aktif('ALL')}" onclick="TK.filtre('ALL')">Tümü</button><button type="button" class="filter-pill${aktif('RESMI_TATIL')}" onclick="TK.filtre('RESMI_TATIL')">Resmi Tatil</button><button type="button" class="filter-pill${aktif('IDARI_IZIN')}" onclick="TK.filtre('IDARI_IZIN')">İdari / Kurumsal Tatil</button><button type="button" class="filter-pill${aktif('AKADEMIK_TATIL')}" onclick="TK.filtre('AKADEMIK_TATIL')">Akademik Tatil</button></div></div></div>
    <div class="table-responsive"><table class="data-table"><thead><tr><th>Tarih</th><th>Tatil / İdari İzin Açıklaması</th><th>Tatil Türü</th><th>Zaman Dilimi</th>${SO ? '' : '<th style="text-align:right;">İşlemler</th>'}</tr></thead><tbody>${t.govde}</tbody></table></div>
    <div class="deduction-banner"><div><div class="deduction-banner-title">Yıllık İzinden Kesilecek Toplam: ${tkTr(kes)} Gün</div><div class="deduction-banner-sub">${D.yil} takvim yılındaki turuncu (#FF9900) İdari / Kurumsal Tatil günlerinin otomatik toplamıdır (Tam Gün = 1,0 • ÖÖ/ÖS = 0,5).</div></div><div style="display:flex; flex-wrap:wrap; gap:6px;"><span class="type-badge type-badge-resmi">Resmi Tatil</span><span class="type-badge type-badge-idari">İdari & Kurumsal Tatil</span><span class="type-badge type-badge-akademik">Akademik Tatil</span></div></div>
  </section>
</main>
<div class="modal-backdrop" role="dialog" aria-modal="true"><div class="glass-panel modal-box"></div></div>
<div class="glass-panel cal-tooltip"></div><div class="toast-stack"></div>`;
    const ara = kok.querySelector('#tk-ara'); if (ara && D.araOdak) { ara.focus(); ara.setSelectionRange(ara.value.length, ara.value.length); }
    window.scrollTo(0, kaydirma);
  }

  const kutu = () => kok.querySelector('.modal-box');
  const modalAc = (html) => { kutu().innerHTML = html; kok.querySelector('.modal-backdrop').classList.add('open'); };
  const el = (id) => kok.querySelector('#' + id);
  const bildir = (baslik, mesaj, renk) => {
    const y = kok.querySelector('.toast-stack'); if (!y) return;
    const t = document.createElement('div'); t.className = 'toast-item'; t.style.borderLeftColor = renk || '#0070C0';
    t.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;"><div><div style="font-weight:800; font-size:0.82rem;">${tkEsc(baslik)}</div><div style="color:var(--text-secondary); margin-top:2px; line-height:1.4;">${tkEsc(mesaj)}</div></div><button type="button" style="border:none; background:transparent; color:var(--text-muted); font-weight:800; cursor:pointer;">✕</button></div>`;
    t.querySelector('button').onclick = () => t.remove(); y.appendChild(t); setTimeout(() => t.remove(), 4000);
  };
  const sunucu = async (komut, arg, basari) => {
    try { const r = await Kopru.cagir(komut, arg); await yukle(); if (basari) bildir(basari[0], basari[1], '#10b981'); return r; }
    catch (e) { bildir('İşlem Yapılamadı', e && e.message ? e.message : String(e), '#ef4444'); return null; }
  };

  TK.yil = (d) => { D.yil = Math.max(MIN, Math.min(MAX, D.yil + d)); yukle(); };
  TK.yilSec = (v) => { D.yil = Number(v); yukle(); };
  TK.filtre = (f) => { D.filtre = f; D.araOdak = false; ciz(); };
  TK.ara = (v) => { D.ara = v; D.araOdak = true; ciz(); };
  TK.kapat = () => kok.querySelector('.modal-backdrop').classList.remove('open');
  TK.ipucu = (ev, iso) => {
    const tip = kok.querySelector('.cal-tooltip'), it = gunKayitlari().get(iso);
    tip.innerHTML = !it ? `<div style="font-weight:800; color:var(--text-primary);">${takvimTarihYaz(iso)}</div><div style="color:var(--text-muted); margin-top:2px;">Standart Takvim Günü</div><div style="color:var(--color-resmi); font-weight:700; margin-top:5px;">Tatil eklemek için tıklayın →</div>`
      : `<div style="font-weight:800; color:var(--text-primary); margin-bottom:5px;">${takvimTarihYaz(iso)}</div><div style="display:flex; flex-wrap:wrap; gap:5px; margin-bottom:6px;"><span class="type-badge ${tkRozet(it.tur)}">${tkTurEtiket(it.tur)}</span><span class="slot-badge ${it.dilim !== 'TAM' ? 'slot-badge-half' : ''}">${tkDilimEtiket(it.dilim)}</span></div><div style="font-weight:600; color:var(--text-primary); line-height:1.35;">${tkEsc(it.aciklama)}</div>`;
    tip.style.display = 'block'; TK.ipucuTasi(ev);
  };
  TK.ipucuTasi = (ev) => { const tip = kok.querySelector('.cal-tooltip'); if (tip.style.display !== 'block') return; let l = ev.clientX + 14, t = ev.clientY + 14; if (l + 295 > innerWidth) l = ev.clientX - 295; if (t + 125 > innerHeight) t = ev.clientY - 125; tip.style.left = Math.max(8, l) + 'px'; tip.style.top = Math.max(8, t) + 'px'; };
  TK.ipucuGizle = () => { kok.querySelector('.cal-tooltip').style.display = 'none'; };

  // 1) Tekil ekle / düzenle (güne tıklayınca o günü içeren kayıt düzenlenir)
  TK.tekKayit = (id) => { const x = D.liste.find((k) => k.id === id); if (x) TK.tek(x.baslangic); };
  TK.tek = (iso) => {
    if (SO) return;
    const tarih = iso || D.yil + '-' + new Date().toISOString().slice(5, 10);
    const var_ = gunKayitlari().get(tarih), x = var_ ? var_.rec : null, ay = (v, d) => (v === d ? ' selected' : '');
    const turSunucu = x ? x.tur : 'RESMI';
    modalAc(`<div class="modal-header"><div><h3 style="font-size:1rem; font-weight:800;">${x ? 'Tatil Günü Düzenle' : 'Yeni Tatil Günü Ekle'}</h3><p style="font-size:0.74rem; color:var(--text-muted); margin-top:2px;">Tam Gün veya Yarım Gün (ÖÖ / ÖS) olarak tanımlayabilirsiniz</p></div><button type="button" class="btn btn-ghost btn-icon" onclick="TK.kapat()">✕</button></div>
<div class="modal-body"><div class="form-grid-2"><div><label class="form-label" for="tk-tarih">Tarih:</label><input type="text" id="tk-tarih" class="form-control" placeholder="GG.AA.YYYY" maxlength="10" inputmode="numeric" value="${takvimTarihYaz(x ? x.baslangic : tarih)}" /></div>
<div><label class="form-label" for="tk-dilim">Zaman Dilimi:</label><select id="tk-dilim" class="form-control"><option value="TAM"${ay(x && x.zaman, 'TAM')}>Tam Gün</option><option value="OO"${ay(x && x.zaman, 'OO')}>Öğleden Önce (ÖÖ)</option><option value="OS"${ay(x && x.zaman, 'OS')}>Öğleden Sonra (ÖS)</option></select></div></div>
<div class="form-grid-2"><div><label class="form-label" for="tk-bitis">Bitiş Tarihi (boşsa tek gün):</label><input type="text" id="tk-bitis" class="form-control" placeholder="GG.AA.YYYY" maxlength="10" inputmode="numeric" value="${x && x.bitis !== x.baslangic ? takvimTarihYaz(x.bitis) : ''}" /></div>
<div><label class="form-label" for="tk-tur">Tatil Türü:</label><select id="tk-tur" class="form-control"><option value="RESMI_TATIL"${ay(turSunucu, 'RESMI')}>Resmi Tatil (Mavi #0070C0)</option><option value="IDARI_IZIN"${ay(turSunucu, 'IDARI')}>İdari & Kurumsal Tatil (Turuncu #FF9900)</option><option value="AKADEMIK_TATIL"${ay(turSunucu, 'AKADEMIK')}>Akademik Tatil (Turkuaz #0F766E)</option></select></div></div>
<div><label class="form-label" for="tk-ad">Tatil / İdari İzin Açıklaması:</label><input type="text" id="tk-ad" class="form-control" maxlength="200" value="${x ? tkEsc(x.ad) : ''}" placeholder="Örn: Ramazan Bayramı Arifesi - Yıllık İzinden Kesilecek" /></div>
<div class="modal-footer">${x ? `<button type="button" class="btn btn-danger" onclick="TK.silSor(${x.id})">🗑 Sil</button>` : '<span></span>'}<div style="display:flex; gap:8px;"><button type="button" class="btn btn-ghost" onclick="TK.kapat()">Vazgeç</button><button type="button" class="btn btn-success" onclick="TK.tekKaydet(${x ? x.id : 'null'})">Kaydet</button></div></div></div>`);
  };
  TK.tekKaydet = async (id) => {
    const b = talepTarihOku(el('tk-tarih').value), e = talepTarihOku(el('tk-bitis').value) || b, dilim = el('tk-dilim').value, tur = TK_TUR_SUNUCU[el('tk-tur').value];
    if (!b) { bildir('Tarih Gerekli', 'Lütfen geçerli bir tarih giriniz (GG.AA.YYYY).', '#ef4444'); return; }
    const ad = el('tk-ad').value.trim() || tkTurEtiket(el('tk-tur').value);
    const yil = Number(b.slice(0, 4));
    const r = await sunucu('takvimKaydet', { id, baslangic: b, bitis: e, zaman: dilim, tur, ad, yillik: tur === 'IDARI' }, null);
    if (r) { TK.kapat(); if (yil >= MIN && yil <= MAX && yil !== D.yil) { D.yil = yil; await yukle(); } bildir('Takvim Güncellendi', takvimTarihYaz(b) + ' (' + tkDilimEtiket(dilim) + ') kaydedildi.', '#10b981'); }
  };

  // 2) Toplu ekle: sekme 1 tarih aralığı, sekme 2 satır yapıştır / dosya
  TK.toplu = (sekme) => {
    const y = D.yil, aktif = (s) => (sekme === s ? ' active' : '');
    modalAc(`<div class="modal-header"><div><h3 style="font-size:1rem; font-weight:800;">📋 Toplu Tatil Ekle</h3><p style="font-size:0.74rem; color:var(--text-muted); margin-top:2px;">Tarih aralığı seçerek veya Excel satırlarını yapıştırarak toplu tatil tanımlayın</p></div><button type="button" class="btn btn-ghost btn-icon" onclick="TK.kapat()">✕</button></div>
<div class="modal-body"><div class="filter-pills" style="width:100%;"><button type="button" class="filter-pill${aktif('RANGE')}" style="flex:1;" onclick="TK.toplu('RANGE')">Tarih Aralığı Ekle</button><button type="button" class="filter-pill${aktif('PASTE')}" style="flex:1;" onclick="TK.toplu('PASTE')">Excel Satırları Yapıştır</button></div>
${sekme === 'RANGE' ? `<div class="form-grid-2"><div><label class="form-label" for="tk-b1">Başlangıç Tarihi:</label><input type="text" id="tk-b1" class="form-control" placeholder="GG.AA.YYYY" maxlength="10" inputmode="numeric" value="07.09.${y}" oninput="TK.onizle()" onchange="TK.onizle()" /></div><div><label class="form-label" for="tk-b2">Bitiş Tarihi:</label><input type="text" id="tk-b2" class="form-control" placeholder="GG.AA.YYYY" maxlength="10" inputmode="numeric" value="11.09.${y}" oninput="TK.onizle()" onchange="TK.onizle()" /></div></div>
<div class="form-grid-2"><div><label class="form-label" for="tk-btur">Tatil Türü:</label><select id="tk-btur" class="form-control"><option value="IDARI_IZIN">İdari & Kurumsal Tatil (Turuncu #FF9900)</option><option value="RESMI_TATIL">Resmi Tatil (Mavi #0070C0)</option><option value="AKADEMIK_TATIL">Akademik Tatil (Turkuaz #0F766E)</option></select></div><div><label class="form-label" for="tk-bdilim">Zaman Dilimi:</label><select id="tk-bdilim" class="form-control" onchange="TK.onizle()"><option value="TAM">Tam Gün</option><option value="OO">Öğleden Önce (ÖÖ)</option><option value="OS">Öğleden Sonra (ÖS)</option></select></div></div>
<label class="checkbox-card"><input type="checkbox" id="tk-hs" checked onchange="TK.onizle()" /><span>Hafta sonlarını (Cumartesi – Pazar) hariç tut</span></label>
<div><label class="form-label" for="tk-bad">Açıklama:</label><input type="text" id="tk-bad" class="form-control" maxlength="200" value="Kurumsal Tatil - Yıllık İzinden Kesilecek" /></div>
<div id="tk-onizle" style="padding:10px 14px; border-radius:10px; background:rgba(0,112,192,0.12); border:1px solid rgba(0,112,192,0.25); font-weight:700; color:var(--color-resmi);"></div>
<div class="modal-footer"><span></span><div style="display:flex; gap:8px;"><button type="button" class="btn btn-ghost" onclick="TK.kapat()">Vazgeç</button><button type="button" class="btn btn-success" onclick="TK.aralikKaydet()">Aralığı Ekle</button></div></div>`
: `<div><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;"><label class="form-label" style="margin:0;">Excel Satırlarını Yapıştırın:</label><button type="button" class="btn btn-ghost" style="min-height:28px; padding:4px 10px; font-size:0.72rem;" onclick="TK.ornek()">Örnek Satırları Doldur</button></div>
<textarea id="tk-yapistir" rows="6" class="form-control" style="font-family:var(--font-mono); font-size:0.74rem;" placeholder="10-11-12 NİSAN Çarşamba-Perşembe-Cuma / Ramazan Bayramı&#10;19-23 AĞUSTOS Pazartesi-Cuma / Kurumsal Tatil - Yıllık İzinden Kesilecek"></textarea></div>
<div style="font-size:0.74rem; color:var(--text-secondary);">Desteklenen biçimler: <code>10-11-12 NİSAN ... / Açıklama</code>, <code>19-23 AĞUSTOS ...</code> veya <code>GG.AA.YYYY;Tatil Türü;Zaman Dilimi;Açıklama</code>. Ya da bir dosya seçin (.xlsx / .csv): satırlar yukarıya çevrilir, gözden geçirip ekleyin.</div>
<div><input type="file" id="tk-dosya" accept=".csv,.txt,.xlsx" onchange="TK.dosya(this)" aria-label="Dosya seç" /></div>
<div class="modal-footer"><span></span><div style="display:flex; gap:8px;"><button type="button" class="btn btn-ghost" onclick="TK.kapat()">Vazgeç</button><button type="button" class="btn btn-success" onclick="TK.yapistirKaydet()">Satırları Ayrıştır ve Ekle</button></div></div>`}</div>`);
    if (sekme === 'RANGE') TK.onizle();
  };
  TK.onizle = () => {
    const b = talepTarihOku((el('tk-b1') || {}).value || ''), e = talepTarihOku((el('tk-b2') || {}).value || ''), kutuEl = el('tk-onizle'); if (!kutuEl) return;
    if (!b || !e) { kutuEl.textContent = 'Tarihleri GG.AA.YYYY biçiminde girin.'; return; }
    const g = tkGunler(b, e, el('tk-hs').checked);
    kutuEl.textContent = 'Seçili aralıkta ' + g.length + ' gün (' + tkTr(g.length * tkAgirlik(el('tk-bdilim').value)) + ' Gün) takvime eklenecek.';
  };
  TK.aralikKaydet = async () => {
    const b = talepTarihOku(el('tk-b1').value), e = talepTarihOku(el('tk-b2').value), dilim = el('tk-bdilim').value, turK = el('tk-btur').value;
    const g = b && e ? tkGunler(b, e, el('tk-hs').checked) : [];
    if (!g.length) { bildir('Geçersiz Aralık', 'Eklenecek uygun gün bulunamadı.', '#ef4444'); return; }
    const tur = TK_TUR_SUNUCU[turK], ad = el('tk-bad').value.trim() || tkTurEtiket(turK);
    const r = await sunucu('takvimUygula', { satirlar: tkAraliklaYap(g, tur, dilim, ad) }, null);
    if (r) { TK.kapat(); const yl = Number(g[0].slice(0, 4)); if (yl >= MIN && yl <= MAX && yl !== D.yil) { D.yil = yl; await yukle(); } bildir('Toplu Tatil Eklendi', g.length + ' gün başarıyla takvime işlendi.', '#10b981'); }
  };
  TK.ornek = () => { el('tk-yapistir').value = '10-11-12 NİSAN Çarşamba-Perşembe-Cuma / Ramazan Bayramı\n11-12 KASIM Pazartesi-Salı / Kurumsal Tatil - Yıllık İzinden Kesilecek\n31 ARALIK Salı / Yılbaşı Arifesi 0,5 Gün (ÖS)'; };
  TK.dosya = async (inp) => {
    if (!inp.files || !inp.files.length) return;
    try {
      const o = await takvimDosyaOku(inp.files[0]);
      const ok = o.xlsx ? await Kopru.cagir('takvimXlsxOku', { base64: o.xlsx, yil: D.yil }) : await Kopru.cagir('takvimMetinOku', { metin: o.metin, yil: D.yil });
      if (!ok.satirlar.length) { bildir('Okunacak Satır Yok', 'Dosyada tarih satırı bulunamadı.', '#ef4444'); return; }
      const satir = [];
      ok.satirlar.forEach((x) => tkGunler(x.baslangic, x.bitis || x.baslangic, false).forEach((g) => satir.push(takvimTarihYaz(g) + ';' + tkTurEtiket(TK_TUR_PROTO[x.tur] || 'RESMI_TATIL') + ';' + tkDilimEtiket(x.zaman) + ';' + x.ad)));
      el('tk-yapistir').value = satir.join('\n'); bildir('Dosya Okundu', satir.length + ' gün satırı listeye eklendi; gözden geçirip "Satırları Ayrıştır ve Ekle"ye basın.', '#0070C0');
    } catch (e) { bildir('Dosya Okunamadı', e && e.message ? e.message : String(e), '#ef4444'); }
  };
  TK.yapistirKaydet = async () => {
    const ham = el('tk-yapistir').value.trim();
    if (!ham) { bildir('Boş Giriş', 'Lütfen yapıştırılacak satırları giriniz.', '#ef4444'); return; }
    const ayAd = { OCAK: 1, ŞUBAT: 2, SUBAT: 2, MART: 3, NİSAN: 4, NISAN: 4, MAYIS: 5, HAZİRAN: 6, HAZIRAN: 6, TEMMUZ: 7, AĞUSTOS: 8, AGUSTOS: 8, EYLÜL: 9, EYLUL: 9, EKİM: 10, EKIM: 10, KASIM: 11, ARALIK: 12 };
    const p2 = (n) => String(n).padStart(2, '0'), satirlar = [];
    const turBul = (u, ipucu) => (/AKADEM/.test(u) ? 'AKADEMIK' : /İDARİ|IDARI|KURUMSAL|YILLIK İZİNDEN|YILLIK IZINDEN/.test(u) || ipucu ? 'IDARI' : 'RESMI');
    ham.split('\n').map((l) => l.trim()).filter(Boolean).forEach((satir) => {
      const u = satir.toLocaleUpperCase('tr-TR'), m = u.match(/^(\d{1,2}(?:-\d{1,2})*)\s+([A-ZÇĞİÖŞÜ]+)\b/);
      if (m && ayAd[m[2]]) {
        let gunler = m[1].split('-').map(Number).filter((n) => n >= 1 && n <= 31);
        if (gunler.length === 2 && gunler[1] > gunler[0]) { const a = []; for (let d = gunler[0]; d <= gunler[1]; d++) a.push(d); gunler = a; }
        const yarim = /0,5|0\.5|YARIM|ARİFE|ARIFE/.test(u), dilim = yarim ? (/ÖÖ|\(OO\)/.test(u) ? 'OO' : 'OS') : 'TAM', sl = satir.indexOf('/');
        const tur = turBul(u, false), ad = sl >= 0 ? satir.slice(sl + 1).trim() : satir;
        gunler.forEach((d) => { const iso = D.yil + '-' + p2(ayAd[m[2]]) + '-' + p2(d); satirlar.push({ baslangic: iso, bitis: iso, zaman: dilim, tur, ad, yillik: tur === 'IDARI' }); });
        return;
      }
      const ay = satir.includes(';') ? ';' : satir.includes('|') ? '|' : null;
      if (ay) {
        const p = satir.split(ay).map((x) => x.trim().replace(/^"|"$/g, '')), iso = talepTarihOku(p[0]);
        if (iso) {
          const t1 = (p[1] || '').toLocaleUpperCase('tr-TR'), t2 = (p[2] || '').toLocaleUpperCase('tr-TR');
          const tur = /AKADEM/.test(t1) ? 'AKADEMIK' : /İDARİ|IDARI|KURUMSAL/.test(t1) ? 'IDARI' : 'RESMI';
          const dilim = /ÖÖ|ÖNCE/.test(t2) ? 'OO' : /ÖS|SONRA|YARIM/.test(t2) ? 'OS' : 'TAM';
          satirlar.push({ baslangic: iso, bitis: iso, zaman: dilim, tur, ad: p[3] || p[2] || tkTurEtiket(TK_TUR_PROTO[tur]), yillik: tur === 'IDARI' });
        }
      }
    });
    if (!satirlar.length) { bildir('Ayrıştırma Başarısız', 'Girilen satır formatı tanınamadı. Lütfen örnek formatı kullanınız.', '#ef4444'); return; }
    const r = await sunucu('takvimUygula', { satirlar: satirlar.map((x, i) => ({ sira: i + 1, ...x })) }, null);
    if (r) { TK.kapat(); bildir('Excel Satırları Aktarıldı', satirlar.length + ' gün başarıyla takvime eklendi.', '#10b981'); }
  };

  // 3) Silme
  TK.silSor = (id) => {
    const x = D.liste.find((k) => k.id === id); if (!x) return;
    modalAc(`<div class="modal-header"><h3 style="font-size:1rem; font-weight:800;">Tatil Kaydını Sil</h3><button type="button" class="btn btn-ghost btn-icon" onclick="TK.kapat()">✕</button></div><div class="modal-body"><p style="color:var(--text-secondary); line-height:1.5;"><strong>${tkEsc(aralikYaz(x))}</strong> tarihli tatil kaydını silmek istediğinize emin misiniz?</p><div class="modal-footer"><span></span><div style="display:flex; gap:8px;"><button type="button" class="btn btn-ghost" onclick="TK.kapat()">Vazgeç</button><button type="button" class="btn btn-danger" onclick="TK.sil(${id})">Evet, Sil</button></div></div></div>`);
  };
  TK.sil = async (id) => { TK.kapat(); await sunucu('takvimSil', { id }, ['Kayıt Silindi', 'Seçili tatil kaydı takvimden kaldırıldı.']); };

  // CSV şablonu (Excel uyumlu, ; ayraçlı, UTF-8 BOM)
  TK.csv = () => {
    const satir = ['Tarih;Tatil_Turu;Zaman_Dilimi;Aciklama'];
    const gunler = []; D.liste.forEach((x) => tkGunler(x.baslangic, x.bitis || x.baslangic, false).forEach((g) => gunler.push([g, x])));
    if (gunler.length) gunler.sort((a, b) => a[0].localeCompare(b[0])).forEach(([g, x]) => satir.push(takvimTarihYaz(g) + ';' + tkTurEtiket(TK_TUR_PROTO[x.tur]) + ';' + tkDilimEtiket(x.zaman) + ';"' + x.ad.replace(/"/g, '""') + '"'));
    else { satir.push('01.01.' + D.yil + ';Resmi Tatil;Tam Gün;"Yılbaşı"'); satir.push('23.04.' + D.yil + ';Resmi Tatil;Tam Gün;"Ulusal Egemenlik ve Çocuk Bayramı"'); satir.push('28.10.' + D.yil + ';İdari & Kurumsal Tatil;Öğleden Sonra (ÖS);"Cumhuriyet Bayramı Arifesi"'); }
    dosyaKaydet('Akademik_Kurumsal_Takvim_' + D.yil + '.csv', satir.join('\r\n')).then((tamam) => { if (tamam) bildir('CSV Şablonu Kaydedildi', D.yil + ' yılına ait Excel uyumlu CSV şablonu kaydedildi.', '#0070C0'); });
  };

  await yukle();
  return { ust: h('div'), alt: kok };
}
