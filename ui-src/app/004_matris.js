// Haftalık matris (Dilim 6): 7 günlük ortak tablo; ÖÖ/ÖS bölünmüş hücre. Yalnız okuma; tüm roller görür. Kurallar ve yetki sunucudadır.
const MATRIS_RENK = [['#dbeafe', '#1e3a8a'], ['#fde68a', '#78350f'], ['#bbf7d0', '#14532d'], ['#fbcfe8', '#831843'], ['#e9d5ff', '#4c1d95'], ['#fed7aa', '#7c2d12'], ['#a5f3fc', '#164e63'], ['#e5e7eb', '#1f2937']];
function matrisPazartesi(d) { const t = new Date(d.getFullYear(), d.getMonth(), d.getDate()); t.setDate(t.getDate() - ((t.getDay() + 6) % 7)); return t; }
function matrisGunEkle(iso, n) { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return takvimIso(d); }
function matrisHaftaYazi(bas) {
  const ay = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const a = new Date(bas + 'T00:00:00'), b = new Date(matrisGunEkle(bas, 6) + 'T00:00:00');
  const aralik = a.getMonth() === b.getMonth() ? a.getDate() + ' – ' + b.getDate() + ' ' + ay[a.getMonth()] + ' ' + a.getFullYear()
    : a.getFullYear() === b.getFullYear() ? a.getDate() + ' ' + ay[a.getMonth()] + ' – ' + b.getDate() + ' ' + ay[b.getMonth()] + ' ' + a.getFullYear()
    : a.getDate() + ' ' + ay[a.getMonth()] + ' ' + a.getFullYear() + ' – ' + b.getDate() + ' ' + ay[b.getMonth()] + ' ' + b.getFullYear();
  return aralik + ' · ' + takvimHafta(new Date(matrisGunEkle(bas, 3) + 'T00:00:00')) + '. hafta';
}

async function matrisSayfa() {
  const GUN = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
  const d = { bas: takvimIso(matrisPazartesi(new Date())), bolum: '', ana: '', konum: '', q: '', sadece: true, veri: [], surum: null, tatiller: [], anaListe: [], secili: null, yenileme: null };
  const kap = h('div', { style: 'display:flex;flex-direction:column;gap:12px;min-width:0' });
  const tabloKap = h('div', { style: 'min-width:0' }), ayrintiKap = h('div'), notKap = h('div', { class: 'alt', style: 'color:var(--soluk);font-size:13px' });
  const yenileYazi = h('span', { class: 'alt', style: 'font-size:13px;color:var(--soluk)' });

  async function tatilYukle() {
    const yillar = new Set([d.bas.slice(0, 4), matrisGunEkle(d.bas, 6).slice(0, 4)]); d.tatiller = [];
    for (const y of yillar) { try { d.tatiller = d.tatiller.concat(await Kopru.cagir('takvimListe', { yil: Number(y) })); } catch (e) { /* takvim okunamazsa tatil işareti olmaz */ } }
  }
  function tatilMi(iso) { return d.tatiller.find((x) => x.zaman === 'TAM' && x.baslangic <= iso && (x.bitis || x.baslangic) >= iso); }

  S.yenile = () => yukle(true);
  async function yukle(sessiz) {
    try {
      const [veri, surum] = await Promise.all([
        Kopru.cagir('matrisHafta', { bas: d.bas, bolum: d.bolum, ana: d.ana, konum: d.konum, q: d.q, sadeceGorevli: d.sadece }),
        Kopru.cagir('matrisSurum', { bas: d.bas }),
      ]);
      d.veri = veri; d.surum = surum.surum; d.secili = null;
      yenileYazi.textContent = 'Son yenileme ' + new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' · otomatik (30 sn)';
      ciz();
    } catch (e) { if (!sessiz) hata(e); }
  }
  async function haftayaGit(bas) { d.bas = bas; await tatilYukle(); await yukle(); basKutu.value = takvimTarihYaz(d.bas); haftaYazi.textContent = matrisHaftaYazi(d.bas); }

  const haftaYazi = h('div', { style: 'font-size:18px;font-weight:600;min-width:240px;text-align:center' }, matrisHaftaYazi(d.bas));
  const basKutu = h('input', { type: 'text', class: 'metin', inputmode: 'numeric', maxlength: '10', placeholder: 'GG.AA.YYYY', value: takvimTarihYaz(d.bas), style: 'width:130px', 'aria-label': 'Haftaya git (tarih)' });
  basKutu.addEventListener('input', () => { const x = basKutu.value.replace(/\D/g, '').slice(0, 8); basKutu.value = x.length > 4 ? x.slice(0, 2) + '.' + x.slice(2, 4) + '.' + x.slice(4) : x.length > 2 ? x.slice(0, 2) + '.' + x.slice(2) : x;
    const iso = talepTarihOku(basKutu.value); if (iso) haftayaGit(takvimIso(matrisPazartesi(new Date(iso + 'T00:00:00')))); });
  basKutu.addEventListener('focus', () => basKutu.select());
  const git = (n) => () => haftayaGit(matrisGunEkle(d.bas, 7 * n));

  const qKutu = h('input', { type: 'search', class: 'metin', placeholder: 'Ad ara…', 'aria-label': 'Ad ara', style: 'min-width:200px' });
  let zm = 0; qKutu.addEventListener('input', () => { clearTimeout(zm); zm = setTimeout(() => { d.q = qKutu.value.trim(); yukle(); }, 300); });
  const bolumSec = h('select', { 'aria-label': 'Bölüm' }, h('option', { value: '' }, 'Tüm bölümler'));
  bolumSec.addEventListener('change', () => { d.bolum = bolumSec.value; yukle(); });
  const anaSec = h('select', { 'aria-label': 'Ana Proje' }, h('option', { value: '' }, 'Tüm Ana Projeler'));
  anaSec.addEventListener('change', () => { d.ana = anaSec.value; yukle(); });
  const konumSec = h('select', { 'aria-label': 'Yerleşke' }, h('option', { value: '' }, 'Tüm yerleşkeler'));
  konumSec.addEventListener('change', () => { d.konum = konumSec.value; yukle(); });
  const sadeceKutu = h('input', { type: 'checkbox', checked: true, style: 'min-height:0' });
  sadeceKutu.addEventListener('change', () => { d.sadece = sadeceKutu.checked; yukle(); });

  function renkHaritasi() {
    const adlar = [...new Set(d.veri.flatMap((k) => k.hucreler.map((c) => c.ana)))].sort((a, b) => a.localeCompare(b, 'tr'));
    return new Map(adlar.map((a, i) => [a, MATRIS_RENK[i % MATRIS_RENK.length]]));
  }
  function ciz() {
    const renk = renkHaritasi();
    const gunIso = GUN.map((_, i) => matrisGunEkle(d.bas, i));
    const yari = (k, iso, c, boy) => {
      if (!c) return h('div', { style: 'height:' + boy + 'px' });
      const [bg, fg] = renk.get(c.ana);
      const etiket = c.ana + (c.alt && c.alt !== 'Genel' ? ' › ' + c.alt : '');
      return h('button', { type: 'button', title: c.kod + ' · ' + c.ana + ' › ' + c.alt + ' › ' + c.faaliyet, 'aria-label': k.ad + ', ' + takvimTarihYaz(iso) + ', ' + atamaTamAd(c.zaman) + ', ' + c.ana + ', ' + c.kod,
        style: 'display:block;width:calc(100% - 6px);margin:1px 3px;height:' + boy + 'px;min-height:0;padding:0 4px;border:0;border-radius:5px;font-weight:600;font-size:13px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;cursor:pointer;background:' + bg + ';color:' + fg,
        onclick: () => { d.secili = { ad: k.ad, iso, c }; ayrintiCiz(); } }, etiket);
    };
    const izYari = (k, iso, c, boy) => {
      const rapor = c.tur === 'RAPOR', bekl = c.durum === 'BEKLIYOR';
      const ad = rapor ? 'Rapor' : bekl ? 'İzin (onay bekliyor)' : 'İzin';
      return h('div', { title: c.kod + ' · ' + ad, 'aria-label': k.ad + ', ' + takvimTarihYaz(iso) + ', ' + ad + ', ' + c.kod,
        style: 'margin:1px 3px;height:' + boy + 'px;display:flex;align-items:center;justify-content:center;border-radius:5px;font-size:13px;font-weight:600;overflow:hidden;white-space:nowrap;' +
          (rapor ? 'background:#fde2e2;color:#8a1c1c;border:1px solid #e9a6a6' : 'background:#e7e9ee;color:#3b4252;border:1px ' + (bekl ? 'dashed' : 'solid') + ' #aab0bd') }, (rapor ? '🩺 ' : '🏖 ') + ad);
    };
    const hucre = (k, iso, i) => {
      const o = k.hucreler.filter((c) => c.tarih === iso);
      const iz = (k.izinler || []).filter((c) => c.tarih === iso && c.durum !== 'IPTAL');
      const izBul = (z) => iz.find((c) => c.zaman === z && c.tur === 'RAPOR') || iz.find((c) => c.zaman === z);
      const tam = o.find((c) => c.zaman === 'TAM'), oo = o.find((c) => c.zaman === 'OO'), os = o.find((c) => c.zaman === 'OS');
      const izTam = izBul('TAM'), izOO = izBul('OO'), izOS = izBul('OS');
      const t = tatilMi(iso);
      const bg = t ? 'background:var(--uyari-bg,#fff4d6)' : i >= 5 ? 'background:var(--bg)' : '';
      const yarim = (a, z, ik) => a ? yari(k, iso, a, 26) : (ik || izTam) ? izYari(k, iso, ik || izTam, 26) : yari(k, iso, null, 26);
      return h('td', { style: 'padding:0;width:12%;min-width:110px;vertical-align:top;border-bottom:1px solid var(--cizgi);border-right:1px solid var(--cizgi);' + bg },
        tam ? yari(k, iso, tam, 54) : izTam && !oo && !os ? izYari(k, iso, izTam, 54) : [yarim(oo, 'OO', izOO), yarim(os, 'OS', izOS)]);
    };
    const toplam = gunIso.map((iso) => d.veri.filter((k) => k.hucreler.some((c) => c.tarih === iso)).length);
    const kolon = (x, i) => { const t = tatilMi(x); return h('th', { style: 'padding:8px 4px;text-align:center;font-size:14px;border-bottom:1px solid var(--cizgi);border-right:1px solid var(--cizgi);' + (t ? 'background:var(--uyari-bg,#fff4d6)' : i >= 5 ? 'background:var(--bg);color:var(--soluk)' : ''), title: t ? t.ad : '' },
      GUN[i], h('br'), h('small', { style: 'font-weight:400' }, takvimTarihYaz(x).slice(0, 5)), t ? h('div', { style: 'font-size:11px;font-weight:400' }, 'Tatil') : null); };
    const tablo = h('table', { style: 'border-collapse:collapse;width:100%;min-width:900px' },
      h('thead', null, h('tr', null, h('th', { style: 'position:sticky;left:0;background:var(--kart);text-align:left;padding:8px 12px;min-width:180px;border-bottom:1px solid var(--cizgi);border-right:1px solid var(--cizgi)' }, 'Personel (' + d.veri.length + ')'), gunIso.map(kolon))),
      h('tbody', null, d.veri.map((k) => h('tr', null,
        h('th', { style: 'position:sticky;left:0;background:var(--kart);text-align:left;padding:6px 12px;border-bottom:1px solid var(--cizgi);border-right:1px solid var(--cizgi)' }, h('div', null, k.ad), h('div', { style: 'font-weight:400;font-size:12px;color:var(--soluk)' }, k.bolum || '')),
        gunIso.map((iso, i) => hucre(k, iso, i))))),
      h('tfoot', null, h('tr', null, h('th', { style: 'position:sticky;left:0;background:var(--kart);text-align:left;padding:8px 12px;border-right:1px solid var(--cizgi)' }, 'Günlük görevli sayısı'),
        toplam.map((n) => h('td', { style: 'text-align:center;font-weight:600;padding:8px' }, String(n))))));
    tabloKap.replaceChildren(d.veri.length ? h('div', { class: 'kart', style: 'padding:0;overflow:auto' }, tablo)
      : h('div', { class: 'kart', style: 'text-align:center;color:var(--soluk)' }, d.sadece || d.ana ? 'Bu hafta, seçili filtrelerle görevlendirilmiş personel yok.' : 'Eşleşen personel yok.'));
    notKap.replaceChildren(h('div', { style: 'margin-bottom:6px' }, 'Üst yarı = öğleden önce (ÖÖ), alt yarı = öğleden sonra (ÖS), tek blok = tam gün. Boş hücre = görev yok. Gri blok = izin (kesikli çerçeve: onay bekliyor), kırmızı blok = rapor. Renk Ana Projeyi gösterir; ad hücrede de yazılıdır. Sarı sütun = tatil. Hücreye basınca ayrıntı açılır.'),
      ...[...renk].map(([a, [bg, fg]]) => h('span', { class: 'rozet', style: 'background:' + bg + ';color:' + fg + ';margin-right:6px' }, a)));
    ayrintiCiz();
  }
  function ayrintiCiz() {
    const s = d.secili;
    ayrintiKap.replaceChildren(...(s ? [h('section', { class: 'kart', style: 'max-width:520px' },
      h('div', { class: 'satir', style: 'align-items:center' }, h('b', null, s.ad + ' · ' + takvimGun(s.iso) + ' ' + takvimTarihYaz(s.iso) + ' · ' + atamaTamAd(s.c.zaman)), h('span', { style: 'flex:1' }),
        h('button', { type: 'button', 'aria-label': 'Ayrıntıyı kapat', onclick: () => { d.secili = null; ayrintiCiz(); } }, '✕')),
      h('div', { style: 'line-height:1.7;margin-top:6px' }, h('div', null, s.c.kod + ' · ' + s.c.ana + ' › ' + s.c.alt + ' › ' + s.c.faaliyet),
        h('div', null, '📍 ' + s.c.konum + ' · 🕣 ' + String(s.c.saat).replace(/:/g, '.')), h('div', null, '🧍‍♂️ Proje sorumlusu: ' + s.c.sorumlu)))] : []));
  }

  async function excel() {
    try {
      const o = await Kopru.cagir('matrisExcel', { bas: d.bas, bolum: d.bolum, ana: d.ana, konum: d.konum, q: d.q, sadeceGorevli: d.sadece });
      if (!o.iptal) toast('Excel kaydedildi (' + o.satir + ' personel): ' + o.yol, 'iyi');
    } catch (e) { hata(e); }
  }

  kap.append(
    h('div', { class: 'satir', style: 'align-items:center' }, h('h1', { style: 'margin:0' }, 'Haftalık matris'), h('span', { style: 'flex:1' }), yenileYazi, h('button', { type: 'button', onclick: excel }, "Excel'e aktar")),
    h('div', { class: 'satir', style: 'align-items:center' }, h('button', { type: 'button', 'aria-label': 'Önceki hafta', onclick: git(-1) }, '◀'), haftaYazi,
      h('button', { type: 'button', 'aria-label': 'Sonraki hafta', onclick: git(1) }, '▶'), h('button', { class: 'ana', type: 'button', onclick: () => haftayaGit(takvimIso(matrisPazartesi(new Date()))) }, 'Bu hafta'), basKutu),
    h('div', { class: 'satir', style: 'align-items:center' }, qKutu, bolumSec, anaSec, konumSec, h('label', { style: 'display:flex;gap:6px;align-items:center' }, sadeceKutu, 'Yalnız bu hafta görevi/izni/raporu olanlar')),
    tabloKap, ayrintiKap, notKap);

  try { for (const b of await Kopru.cagir('matrisBolumler')) bolumSec.append(h('option', { value: b }, b)); } catch (e) { /* filtre listesi olmadan da çalışır */ }
  try { for (const x of (await Kopru.cagir('havuzListe', {})).filter((y) => y.seviye === 1 && y.aktif && !y.birlestirildiId).sort((a, b) => a.ad.localeCompare(b.ad, 'tr'))) anaSec.append(h('option', { value: x.ad }, x.ad)); } catch (e) { /* ... */ }
  try { const ks = new Set((await Kopru.cagir('havuzListe', {})).filter((y) => y.seviye === 4 && y.aktif && !y.birlestirildiId).map((y) => y.ad)); for (const k of [...ks].sort((a, b) => a.localeCompare(b, 'tr'))) konumSec.append(h('option', { value: k }, k)); } catch (e) { /* ... */ }
  await tatilYukle();
  await yukle();

  // 30 sn'de bir yalnız hafta sürümü sorulur; değişmişse matris yeniden çekilir. Sayfa kapanınca (DOM'dan kalkınca) durur.
  const sayac = setInterval(async () => {
    if (!kap.isConnected) { clearInterval(sayac); return; }
    try { const s = await Kopru.cagir('matrisSurum', { bas: d.bas }); if (s.surum !== d.surum) await yukle(true); else yenileYazi.textContent = 'Son denetim ' + new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' · otomatik (30 sn)'; } catch (e) { /* sessiz */ }
  }, 30000);
  return kap;
}
