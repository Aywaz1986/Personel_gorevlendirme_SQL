// Haftalık Özet (Dilim 19): "7 Günlük Personel Durum Matrisi" prototipinin (Murat, 26.11.2026) uyarlaması.
// KPI şeridi, hazır görünümler, 5 katmanlı özelleştirme çekmecesi, odak, gruplama, sabitleme, ÖÖ/ÖS bölünmüş hücreler.
// Yalnız okuma; kurallar ve yetki sunucudadır. Tercihler yalnız bu bilgisayarda (localStorage) tutulur; yoksa varsayılanla açılır.
function matrisPazartesi(d) { const t = new Date(d.getFullYear(), d.getMonth(), d.getDate()); t.setDate(t.getDate() - ((t.getDay() + 6) % 7)); return t; }
function matrisGunEkle(iso, n) { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return takvimIso(d); }
function matrisHaftaYazi(bas) {
  const ay = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const a = new Date(bas + 'T00:00:00'), b = new Date(matrisGunEkle(bas, 6) + 'T00:00:00');
  const aralik = a.getMonth() === b.getMonth() ? a.getDate() + ' – ' + b.getDate() + ' ' + ay[a.getMonth()] + ' ' + a.getFullYear()
    : a.getFullYear() === b.getFullYear() ? a.getDate() + ' ' + ay[a.getMonth()] + ' – ' + b.getDate() + ' ' + ay[b.getMonth()] + ' ' + a.getFullYear()
    : a.getDate() + ' ' + ay[a.getMonth()] + ' ' + a.getFullYear() + ' – ' + b.getDate() + ' ' + ay[b.getMonth()] + ' ' + b.getFullYear();
  return aralik + ' (HFT ' + takvimHafta(new Date(matrisGunEkle(bas, 3) + 'T00:00:00')) + ')';
}

const HZ_VARSAYILAN = { yogunluk: 'STANDART', konum: true, kod: true, sorumlu: true, gsm: true, musait: true, grup: 'YOK', renk: 'DURUM', odak: 'YOK', haftaSonu: 'NORMAL', takvim: true };
const HZ_HAZIR = [
  { id: 'H_TUM', ad: '📋 Tüm Ekip', hazir: true, t: { ...HZ_VARSAYILAN } },
  { id: 'H_HIZLI', ad: '⚡ Hızlı Atama (Müsaitler Üstte)', hazir: true, t: { ...HZ_VARSAYILAN, yogunluk: 'KOMPAKT', grup: 'DURUM', odak: 'MUSAIT', haftaSonu: 'DAR' } },
  { id: 'H_GOLBASI', ad: '📍 Gölbaşı Saha Odak', hazir: true, t: { ...HZ_VARSAYILAN, renk: 'YERLESKE', odak: 'LOC:Gölbaşı' } },
  { id: 'H_CAKISMA', ad: '⚠️ Çakışma & İkame', hazir: true, t: { ...HZ_VARSAYILAN, yogunluk: 'DETAYLI', odak: 'CAKISMA' } },
];
const HZ_PROJE_RENK = ['#0070C0', '#7C3AED', '#0891B2', '#D97706', '#059669', '#DB2777', '#EA580C', '#64748B'];
const HZ_AG = { TAM: 1, OO: 0.5, OS: 0.5 };
function hzOku(k, yedek) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : yedek; } catch (e) { return yedek; } }
function hzYaz(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* kalıcı olmayabilir; ekran yine çalışır */ } }
const hzTr = (n) => Number(n || 0).toFixed(1).replace('.', ',');
const hzNorm = (x) => String(x || '').toLocaleLowerCase('tr-TR').replace(/ı/g, 'i').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const hzMerkez = (k) => /gölbaşı|golbasi/i.test(k || '');

async function matrisSayfa() {
  const GUN = ['PT', 'S', 'Ç', 'P', 'C', 'CT', 'PZ'];
  const yonetici = S.gorunum === 'YONETICI';
  const d = { bas: takvimIso(matrisPazartesi(new Date())), bolum: '', ana: '', konum: '', q: '', sadece: false, saha: true, musait: false, veri: [], surum: null, tatiller: [], anaListe: [], konumListe: [],
    t: { ...HZ_VARSAYILAN, ...hzOku('gorev_hafta_tercih', {}) }, ozel: hzOku('gorev_hafta_goruntuler', []), sabit: new Set(hzOku('gorev_hafta_sabit', [])), aktif: null };
  const kap = h('div', { class: 'hz' });
  const kpiKap = h('section', { class: 'hz-kpis' }), hazirKap = h('div', { class: 'hz-hazir' }), lejantKap = h('section', { class: 'hz-lejant' }), tabloKap = h('div', { style: 'min-width:0' });
  const yenileYazi = h('span', { class: 'alt', style: 'font-size:12px;color:var(--soluk)' });

  async function tatilYukle() {
    const yillar = new Set([d.bas.slice(0, 4), matrisGunEkle(d.bas, 6).slice(0, 4)]); d.tatiller = [];
    for (const y of yillar) { try { d.tatiller = d.tatiller.concat(await Kopru.cagir('takvimListe', { yil: Number(y) })); } catch (e) { /* takvim okunamazsa tatil işareti olmaz */ } }
  }
  const tatiller = (iso) => d.t.takvim ? d.tatiller.filter((x) => x.baslangic <= iso && (x.bitis || x.baslangic) >= iso) : [];
  const tercihYaz = () => hzYaz('gorev_hafta_tercih', d.t);

  S.yenile = () => yukle(true);
  async function yukle(sessiz) {
    try {
      const [veri, surum] = await Promise.all([
        Kopru.cagir('matrisHafta', { bas: d.bas, bolum: d.bolum, ana: d.ana, konum: d.konum, q: '', sadeceGorevli: d.sadece, sadeceMusait: d.musait, sadeceSaha: d.saha }),
        Kopru.cagir('matrisSurum', { bas: d.bas }),
      ]);
      d.veri = veri; d.surum = surum.surum;
      yenileYazi.textContent = 'Son yenileme ' + new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' · otomatik (30 sn)';
      ciz();
    } catch (e) { if (!sessiz) hata(e); }
  }
  async function haftayaGit(bas) { d.bas = bas; await tatilYukle(); await yukle(); basKutu.value = takvimTarihYaz(d.bas); haftaSecYenile(); }

  // ---- Hafta gezgini ----
  const haftaSec = h('select', { class: 'hz-hsec', 'aria-label': 'Hafta seçimi' });
  haftaSec.addEventListener('change', () => haftayaGit(haftaSec.value));
  function haftaSecYenile() {
    const bugun = takvimIso(matrisPazartesi(new Date())), liste = [];
    for (let n = -8; n <= 12; n++) liste.push(matrisGunEkle(bugun, 7 * n));
    if (!liste.includes(d.bas)) { liste.push(d.bas); liste.sort(); }
    haftaSec.replaceChildren(...liste.map((b) => h('option', { value: b }, matrisHaftaYazi(b) + (b === bugun ? ' – Aktif Hafta' : b > bugun ? '' : ''))));
    haftaSec.value = d.bas;
  }
  const basKutu = h('input', { type: 'text', class: 'metin', inputmode: 'numeric', maxlength: '10', placeholder: 'GG.AA.YYYY', value: takvimTarihYaz(d.bas), style: 'width:120px', 'aria-label': 'Haftaya git (tarih)' });
  basKutu.addEventListener('input', () => { const x = basKutu.value.replace(/\D/g, '').slice(0, 8); basKutu.value = x.length > 4 ? x.slice(0, 2) + '.' + x.slice(2, 4) + '.' + x.slice(4) : x.length > 2 ? x.slice(0, 2) + '.' + x.slice(2) : x;
    const iso = talepTarihOku(basKutu.value); if (iso) haftayaGit(takvimIso(matrisPazartesi(new Date(iso + 'T00:00:00')))); });
  basKutu.addEventListener('focus', () => basKutu.select());
  const git = (n) => () => haftayaGit(matrisGunEkle(d.bas, 7 * n));

  const qKutu = h('input', { type: 'search', class: 'metin hz-ara', placeholder: 'Personel, proje, yerleşke veya talep no ara…', 'aria-label': 'Ara' });
  qKutu.addEventListener('input', () => { d.q = qKutu.value.trim().toLocaleLowerCase('tr-TR'); ciz(true); });
  const bolumSec = h('select', { 'aria-label': 'Bölüm' }, h('option', { value: '' }, 'Tüm bölümler'));
  bolumSec.addEventListener('change', () => { d.bolum = bolumSec.value; yukle(); });
  const anaSec = h('select', { 'aria-label': 'Ana Proje' }, h('option', { value: '' }, 'Tüm Ana Projeler'));
  anaSec.addEventListener('change', () => { d.ana = anaSec.value; yukle(); });
  const konumSec = h('select', { 'aria-label': 'Yerleşke' }, h('option', { value: '' }, 'Tüm yerleşkeler'));
  konumSec.addEventListener('change', () => { d.konum = konumSec.value; yukle(); });
  const modSec = h('select', { 'aria-label': 'Personel süzgeci' }, h('option', { value: 'saha' }, 'Saha personeli (tümü)'), h('option', { value: 'gorevli' }, 'Görevli / izinli olanlar'), h('option', { value: 'musait' }, 'Sadece müsaitler'), h('option', { value: 'tum' }, 'Tüm personel'));
  modSec.addEventListener('change', () => { d.sadece = modSec.value === 'gorevli'; d.musait = modSec.value === 'musait'; d.saha = modSec.value === 'saha'; yukle(); });

  // ---- Gün çözümleme: her personel × gün × zaman dilimi (OO/OS) için tek durum ----
  function gunCoz(k, iso, i) {
    const o = k.hucreler.filter((c) => c.tarih === iso);
    const iz = (k.izinler || []).filter((c) => c.tarih === iso && c.durum !== 'IPTAL');
    const izBul = (z) => iz.find((c) => c.zaman === z && c.tur === 'RAPOR') || iz.find((c) => c.zaman === z);
    const tum = tatiller(iso);
    const tb = (z) => tum.find((x) => x.zaman === z);
    const hs = i >= 5;
    const dilim = (z) => {
      const a = o.find((c) => c.zaman === 'TAM') || o.find((c) => c.zaman === z);
      const ik = izBul('TAM') || izBul(z);
      const tt = tb('TAM') || tb(z);
      if (a) { const cak = ik && ik.durum !== 'BEKLIYOR' ? ik : (ik || null); return { tur: 'GOREV', c: a, cakisma: cak }; }
      if (ik) return { tur: 'IZIN', c: ik };
      if (tt) return { tur: 'TATIL', t: tt };
      return { tur: hs ? 'BOS' : 'MUSAIT' };
    };
    return { iso, i, hs, OO: dilim('OO'), OS: dilim('OS'), tamAtama: o.find((c) => c.zaman === 'TAM') || null, tamIzin: izBul('TAM') || null, tamTatil: tb('TAM') || null };
  }
  function odakUyar(s) {
    const od = d.t.odak; if (!od || od === 'YOK') return true;
    if (od === 'MUSAIT') return s.tur === 'MUSAIT';
    if (od === 'CAKISMA') return s.tur === 'GOREV' && !!s.cakisma;
    if (od.startsWith('PROJ:')) return s.tur === 'GOREV' && s.c.ana === od.slice(5);
    if (od.startsWith('LOC:')) return s.tur === 'GOREV' && hzNorm(s.c.konum).includes(hzNorm(od.slice(4)));   // Gölbaşı → "Ankara Gölbaşı …" gibi adlar da eşleşir
    return true;
  }
  function kategori(k) {
    let musait = false, ana = null, konum = null;
    for (let i = 0; i < 5; i++) { const g = gunCoz(k, matrisGunEkle(d.bas, i), i); for (const z of ['OO', 'OS']) { const s = g[z]; if (s.tur === 'MUSAIT') musait = true; if (s.tur === 'GOREV') { ana = ana || s.c.ana; konum = konum || s.c.konum; } } }
    return { musait, ana, konum };
  }
  // Odak etkinken (hazır görünümler dahil) haftada odağa uyan hücresi olmayan personel satırı gizlenir; uyan hücreler vurgulu, kalanlar soluk kalır.
  function odakSatir(k) {
    if (!d.t.odak || d.t.odak === 'YOK') return true;
    for (let i = 0; i < 7; i++) { const g = gunCoz(k, matrisGunEkle(d.bas, i), i); if (odakUyar(g.OO) || odakUyar(g.OS)) return true; }
    return false;
  }
  function aramaUyar(k) {
    if (!d.q) return true;
    if (k.ad.toLocaleLowerCase('tr-TR').includes(d.q) || (k.gsm || '').includes(d.q)) return true;
    return k.hucreler.some((c) => [c.ana, c.alt, c.faaliyet, c.konum, c.kod, c.sorumlu].some((x) => (x || '').toLocaleLowerCase('tr-TR').includes(d.q)));
  }
  function gruplar() {
    const l = d.veri.filter(aramaUyar).filter(odakSatir), sb = l.filter((k) => d.sabit.has(k.sicil)), dg = l.filter((k) => !d.sabit.has(k.sicil)), g = [];
    if (sb.length) g.push({ b: '📌 Sabitlenen Personel', l: sb });
    if (d.t.grup === 'YOK') { if (dg.length) g.push({ b: sb.length ? 'Tüm Saha Personeli' : null, l: dg }); }
    else if (d.t.grup === 'DURUM') {
      const a = [], b = [], c = [];
      dg.forEach((k) => { const x = kategori(k); (x.musait ? a : x.ana ? b : c).push(k); });
      if (a.length) g.push({ b: '🟢 Hafta İçi Müsait Günü Bulunanlar', l: a }); if (b.length) g.push({ b: '🔵 Tam Hafta Görevli Ekip', l: b }); if (c.length) g.push({ b: '🟠 İzinli / Raporlu Personel', l: c });
    } else {
      const m = new Map();
      dg.forEach((k) => { const x = kategori(k); const a = d.t.grup === 'PROJE' ? (x.ana || 'Proje Ataması Bekleyen / İzinli') : (x.konum || 'Merkez / Atamasız'); if (!m.has(a)) m.set(a, []); m.get(a).push(k); });
      m.forEach((v, a) => g.push({ b: (d.t.grup === 'PROJE' ? '📁 ' : '📍 Yerleşke: ') + a, l: v }));
    }
    return g;
  }
  function renkHaritasi() {
    const adlar = [...new Set([...d.anaListe, ...d.veri.flatMap((k) => k.hucreler.map((c) => c.ana))])].sort((a, b) => a.localeCompare(b, 'tr'));
    return new Map(adlar.map((a, i) => [a, HZ_PROJE_RENK[i % HZ_PROJE_RENK.length]]));
  }

  // ---- KPI şeridi ----
  function kpi() {
    let gor = 0, mus = 0, izr = 0; const cak = new Set();
    d.veri.forEach((k) => { for (let i = 0; i < 7; i++) { const g = gunCoz(k, matrisGunEkle(d.bas, i), i);
      for (const z of ['OO', 'OS']) { const s = g[z]; if (s.tur === 'GOREV') { gor += 0.5; if (s.cakisma) cak.add(k.sicil + g.iso); } else if (s.tur === 'IZIN') izr += 0.5; else if (s.tur === 'MUSAIT') mus += 0.5; } } });
    const kart = (ad, v, birim, rozet, renk) => h('div', { class: 'hz-kpi', style: '--k:' + renk }, h('div', { class: 'hz-kpi-ust' }, h('span', null, ad), h('span', { class: 'hz-kr' }, rozet)), h('div', { class: 'hz-kpi-sayi' }, v, h('small', null, ' ' + birim)));
    kpiKap.replaceChildren(kart('Toplam Saha Personeli', String(d.veri.length), 'Personel', 'SST • KYD', 'var(--vurgu)'), kart('Görevli Adam-Gün', hzTr(gor), 'Adam-Gün', 'Aktif Atama', '#0284c7'),
      kart('Müsait Adam-Gün', hzTr(mus), 'Adam-Gün', 'Atamaya Açık', 'var(--iyi)'), kart('İzin / Rapor', hzTr(izr), 'Gün', 'İzinli + Raporlu', 'var(--uyari)'),
      kart('İkame / Çakışma Uyarısı', String(cak.size), 'Kayıt', cak.size ? 'Acil Aksiyon' : 'Sorun Yok', cak.size ? 'var(--kotu)' : 'var(--iyi)'));
  }

  // ---- Hazır görünümler ----
  function hazirCiz() {
    const hepsi = [...HZ_HAZIR, ...d.ozel];
    hazirKap.replaceChildren(h('span', { class: 'hz-et' }, 'Hazır Görünümler:'),
      ...hepsi.map((p) => h('button', { type: 'button', class: 'hz-pil' + (d.aktif === p.id ? ' on' : ''), onclick: () => hazirUygula(p) }, p.ad,
        p.hazir ? null : h('span', { class: 'hz-sil', title: 'Görünümü sil', onclick: (e) => { e.stopPropagation(); d.ozel = d.ozel.filter((x) => x.id !== p.id); hzYaz('gorev_hafta_goruntuler', d.ozel); if (d.aktif === p.id) d.aktif = 'H_TUM'; ciz(); toast('Görünüm silindi.'); } }, '✕'))),
      h('span', { style: 'flex:1' }),
      h('button', { type: 'button', class: 'hz-kb', onclick: kaydetAc }, '+ Görünümü Kaydet'), h('button', { type: 'button', class: 'hz-kb', onclick: () => { d.t = { ...HZ_VARSAYILAN }; d.aktif = 'H_TUM'; tercihYaz(); ciz(); toast('Varsayılana sıfırlandı.'); } }, '↺ Varsayılana Sıfırla'));
  }
  // Hazır görünüm tekrarlanabilir olsun: araç çubuğu süzgeçleri (bölüm, proje, yerleşke, arama, personel süzgeci) varsayılana döner.
  function hazirUygula(p) {
    d.t = { ...HZ_VARSAYILAN, ...p.t }; d.aktif = p.id; tercihYaz();
    const degisti = d.bolum || d.ana || d.konum || d.sadece || d.musait || !d.saha;
    d.bolum = ''; d.ana = ''; d.konum = ''; d.q = ''; d.sadece = false; d.musait = false; d.saha = true;
    bolumSec.value = ''; anaSec.value = ''; konumSec.value = ''; modSec.value = 'saha'; qKutu.value = '';
    if (degisti) yukle(); else ciz();
    toast('"' + p.ad + '" görünümü yüklendi.');
  }
  function kaydetAc() {
    const gir = h('input', { type: 'text', class: 'metin', maxlength: '60', placeholder: 'Örn: 🎯 Konya AKSS Takip', style: 'width:100%' });
    let kapat = () => {};
    const kaydet = () => { const ad = gir.value.trim(); if (!ad) { toast('Görünüm için kısa bir ad yazın.', 'uyari'); return; }
      const id = 'OZEL_' + Date.now(); d.ozel.push({ id, ad, t: { ...d.t } }); d.aktif = id; hzYaz('gorev_hafta_goruntuler', d.ozel); kapat(); ciz(); toast('"' + ad + '" kişisel görünümlere eklendi.', 'iyi'); };
    gir.addEventListener('keydown', (e) => { if (e.key === 'Enter') kaydet(); });
    kapat = pencereAc('+ Kişisel Görünüm Profili Kaydet', h('div', null, h('p', { class: 'alt' }, 'Mevcut 5 katmanlı ayarlarınızı üst çubukta tek tıkla erişilen kişisel bir sekme olarak kaydedin (yalnız bu bilgisayarda saklanır).'),
      h('label', { style: 'display:block;font-weight:700;margin:8px 0 4px' }, 'Görünüm Adı:'), gir,
      h('div', { class: 'satir', style: 'justify-content:flex-end;margin-top:12px' }, h('button', { type: 'button', onclick: () => kapat() }, 'Vazgeç'), h('button', { type: 'button', class: 'ana', onclick: kaydet }, 'Kaydet'))));
    setTimeout(() => gir.focus(), 30);
  }

  // ---- Renk lejantı ----
  function lejant() {
    const nokta = (renk, ad, kenar) => h('span', { class: 'hz-ln' }, h('i', { style: 'background:' + renk + (kenar ? ';border:1px solid ' + kenar : '') }), ad);
    let sol;
    if (d.t.renk === 'DURUM') sol = [h('b', null, 'Renk Modu (Durum Bazlı):'), nokta('var(--iyi)', 'Müsait'), nokta('var(--vurgu)', 'Görevli'), nokta('var(--uyari)', 'İzinli'), nokta('var(--kotu)', 'Raporlu / İkame'), nokta('#fbcfe8', 'Hafta Sonu (CT/PZ)', '#f9a8d4')];
    else if (d.t.renk === 'PROJE') sol = [h('b', null, 'Renk Modu (Ana Proje Bazlı):'), ...[...renkHaritasi()].map(([a, r]) => nokta(r, a))];
    else sol = [h('b', null, 'Renk Modu (Yerleşke Bazlı):'), nokta('var(--vurgu)', 'Merkez Yerleşke (Gölbaşı)'), nokta('#7C3AED', 'Şehir Dışı Saha')];
    const sag = d.t.odak !== 'YOK'
      ? h('span', { class: 'hz-odak' }, h('span', { class: 'hz-odak-r' }, '🔦 Akıllı Odak Aktif: ' + ({ MUSAIT: 'Sadece Müsait Günler', CAKISMA: 'Sadece İkame / Çakışma' }[d.t.odak] || d.t.odak.replace('PROJ:', '').replace('LOC:', 'Yerleşke: '))), h('button', { type: 'button', class: 'hz-kb', onclick: () => { d.t.odak = 'YOK'; d.aktif = null; tercihYaz(); ciz(); } }, 'Odak Kaldır'))
      : h('span', { class: 'alt', style: 'font-weight:600' }, yonetici ? '💡 Müsait güne tıklayarak görev talebi açabilir, ⚠️ İkame kartına tıklayarak çözüme gidebilirsiniz.' : '🔒 Bu görünümde izin/rapor kayıtları salt-okunurdur.');
    lejantKap.replaceChildren(h('div', { class: 'hz-lg' }, ...sol), sag);
  }

  // ---- Hücre kartları ----
  const dimSinif = (s) => odakUyar(s) ? '' : ' hz-sonuk';
  function gorevKart(s, k, g, yarim, z) {
    const c = s.c, ya = d.t.yogunluk, renk = renkHaritasi();
    let st = '';
    if (d.t.renk === 'PROJE') { const r = renk.get(c.ana) || HZ_PROJE_RENK[0]; st = '--kr:' + r; }
    else if (d.t.renk === 'YERLESKE') st = '--kr:' + (hzMerkez(c.konum) ? 'var(--vurgu)' : '#7C3AED');
    const sinif = 'hz-kart gor' + (d.t.renk !== 'DURUM' ? ' ozel' : '') + (s.cakisma ? ' cak' : '') + dimSinif(s) + (yarim ? ' yarim' : '');
    const zE = yarim ? (z === 'OO' ? 'ÖÖ · ' : 'ÖS · ') : '';
    let ic;
    const altAd = c.alt && c.alt !== 'Genel' ? c.alt : '';   // Alt Proje doğrudan görünür (imleçle üzerine gelmek gerekmez)
    if (yarim || ya === 'KOMPAKT') ic = [h('div', { class: 'hz-bas' }, zE + c.ana + (altAd ? ' › ' + altAd : '') + (d.t.konum && c.konum ? ' • ' + c.konum : ''))];
    else ic = [h('div', { class: 'hz-bas' }, c.ana), altAd ? h('div', { class: 'hz-alt', style: 'font-weight:600' }, '↳ ' + altAd) : null, ya === 'DETAYLI' && c.faaliyet ? h('div', { class: 'hz-alt' }, c.faaliyet) : null, d.t.konum && c.konum ? h('div', { class: 'hz-alt' }, '📍 ' + c.konum) : null,
      d.t.kod && c.kod ? h('div', { class: 'hz-kod' }, c.kod) : null, d.t.sorumlu && c.sorumlu ? h('div', { class: 'hz-sor' }, '👤 ' + c.sorumlu + (d.t.gsm && c.sorumluGsm ? ' • ' + c.sorumluGsm : '')) : null];
    return h('button', { type: 'button', class: sinif, style: st, title: c.kod + ' · ' + c.ana + ' › ' + c.alt + ' › ' + c.faaliyet + ' · Sorumlu: ' + c.sorumlu, 'aria-label': k.ad + ', ' + takvimTarihYaz(g.iso) + ', ' + atamaTamAd(c.zaman) + ', ' + c.ana + ', ' + c.kod,
      onclick: () => hucreTikla(k, g, s) }, s.cakisma ? h('span', { class: 'hz-cakpil' }, '⚠️ İkame Gerekli') : null, ic);
  }
  function izinKart(s, k, g, yarim, z) {
    const c = s.c, rapor = c.tur === 'RAPOR', bekl = c.durum === 'BEKLIYOR';
    const ad = rapor ? 'Rapor' : bekl ? 'İzin (onay bekliyor)' : 'İzin';
    return h('button', { type: 'button', class: 'hz-kart ' + (rapor ? 'rap' : 'izn') + (bekl ? ' bekl' : '') + dimSinif(s) + (yarim ? ' yarim' : ''), title: c.kod + ' · ' + ad, 'aria-label': k.ad + ', ' + takvimTarihYaz(g.iso) + ', ' + ad + ', ' + c.kod, onclick: () => hucreTikla(k, g, s) },
      h('div', { class: 'hz-bas' }, (yarim ? (z === 'OO' ? 'ÖÖ · ' : 'ÖS · ') : '') + (rapor ? '🔴 ' : '🟠 ') + ad, yonetici ? null : h('span', { title: 'Salt-okunur' }, ' 🔒')));
  }
  function digerKart(s, k, g, yarim, z) {
    const zE = yarim ? (z === 'OO' ? 'ÖÖ · ' : 'ÖS · ') : '';
    if (s.tur === 'MUSAIT') return h('button', { type: 'button', class: 'hz-kart mus' + dimSinif(s) + (yarim ? ' yarim' : ''), 'aria-label': k.ad + ', ' + takvimTarihYaz(g.iso) + ', müsait', onclick: () => hucreTikla(k, g, s) }, h('span', { class: 'hz-bas' }, zE + (d.t.musait ? '● Müsait' : '●')));
    if (s.tur === 'TATIL') { const arife = s.t.zaman !== 'TAM'; return h('button', { type: 'button', class: 'hz-kart ' + (arife ? 'arife' : s.t.tur === 'IDARI' ? 'idari' : 'resmi') + dimSinif(s) + (yarim ? ' yarim' : ''), title: s.t.ad, onclick: () => hucreTikla(k, g, s) },
      h('div', { class: 'hz-bas' }, zE + (arife ? '0,5g ' : '') + s.t.ad), yarim ? null : h('div', { class: 'hz-alt' }, 'Takvim Tatili')); }
    return h('div', { class: 'hz-kart bos' }, '—');
  }
  const kartYap = (s, k, g, yarim, z) => s.tur === 'GOREV' ? gorevKart(s, k, g, yarim, z) : s.tur === 'IZIN' ? izinKart(s, k, g, yarim, z) : digerKart(s, k, g, yarim, z);
  function hucre(k, g) {
    const hsC = g.hs ? ' hs' + (g.i === 5 ? ' hs-bas' : '') + (d.t.haftaSonu === 'DAR' ? ' dar' : '') : '';
    const ayni = (a, b) => a.tur === b.tur && ((a.tur === 'BOS' || a.tur === 'MUSAIT') || (a.tur === 'TATIL' && a.t === b.t) || (a.tur === 'IZIN' && a.c === b.c) || (a.tur === 'GOREV' && a.c === b.c));
    const tek = ayni(g.OO, g.OS);
    return h('td', { class: 'hz-td' + hsC }, tek ? kartYap(g.OO, k, g, false) : [kartYap(g.OO, k, g, true, 'OO'), kartYap(g.OS, k, g, true, 'OS')]);
  }

  // ---- Hücre etkileşimi (modal) ----
  const satir = (em, ad, v) => h('div', { class: 'ozsatir' }, h('span', { class: 'oze' }, em + ' ' + ad + ':'), h('span', { class: 'ozd' }, v));
  // Haftalık Özet'ten görev yönetimi: talep yönet paneli (kişi çıkar/ikame, sorumlu devri, revize: metin/saat/süre, erken bitir, iptal, proje bağlamı) pencerede açılır.
  async function gorevYonet(talepId, kod, acik) {
    let kapat = () => {};
    try {
      const panel = await talepYonetPaneli(talepId, async () => { kapat(); await yukle(); if (S.sayacYukle) S.sayacYukle(); }, acik);
      kapat = pencereAc('⚙ ' + (kod || 'Görev') + ' · yönetim', panel);
    } catch (e) { hata(e); }
  }
  function hucreTikla(k, g, s) {
    const baslik = k.ad + ' · ' + takvimGun(g.iso) + ' ' + takvimTarihYaz(g.iso);
    let kapat = () => {}; const kapatBtn = () => h('button', { type: 'button', onclick: () => kapat() }, 'Kapat');
    const git2 = (sayfa, acilis) => () => { kapat(); S.sayfa = sayfa; S.acilis = acilis || null; kabukCiz(); };
    if (s.tur === 'TATIL') { toast(takvimTarihYaz(g.iso) + ' (' + s.t.ad + ') — takvim gereği tatil günüdür.'); return; }
    if (s.tur === 'GOREV') {
      const c = s.c;
      const cakis = s.cakisma ? h('div', { class: 'hz-uyari' }, h('b', null, 'Çakışma / İkame Nedeni: '), (s.cakisma.tur === 'RAPOR' ? 'Rapor' : 'İzin') + ' (' + s.cakisma.kod + ') bu gün/zaman dilimiyle çakışıyor; ' + c.kod + ' görevi için ikame personel gerekli.') : null;
      kapat = pencereAc((s.cakisma ? '⚠️ ' : '') + 'Görev / Durum Detayı', h('div', null, h('div', { class: 'alt', style: 'margin-bottom:6px' }, baslik + ' · ' + atamaTamAd(c.zaman) + (k.gsm ? ' · 📞 ' + k.gsm : '')), cakis,
        satir('🔖', 'Talep', c.kod), satir('📑', 'Ana Proje', c.ana + (c.alt && c.alt !== 'Genel' ? ' › ' + c.alt : '')), satir('📡', 'Faaliyet', c.faaliyet), satir('📍', 'Yerleşke', c.konum), satir('🕣', 'Saat', String(c.saat).replace(/:/g, '.')),
        satir('🧍‍♂️', 'Proje sorumlusu', c.sorumlu + (c.sorumluGsm ? '  📞 ' + c.sorumluGsm : '')),
        h('div', { class: 'satir', style: 'justify-content:flex-end;margin-top:12px' }, yonetici && c.talepId ? h('button', { type: 'button', class: 'ana', onclick: () => { kapat(); gorevYonet(c.talepId, c.kod); } }, '⚙ Görevi yönet') : null, yonetici && c.talepId ? h('button', { type: 'button', onclick: () => { kapat(); gorevYonet(c.talepId, c.kod, 'revize'); } }, '⏱ Süre uzat / Revize') : null, kapatBtn())));
      return;
    }
    if (s.tur === 'IZIN') {
      const c = s.c, rapor = c.tur === 'RAPOR';
      kapat = pencereAc('Görev / Durum Detayı', h('div', null, h('div', { class: 'alt', style: 'margin-bottom:6px' }, baslik), satir(rapor ? '🔴' : '🟠', 'Durum', (rapor ? 'Rapor' : 'İzin') + (c.durum === 'BEKLIYOR' ? ' (onay bekliyor)' : '')), satir('🔖', 'Kayıt', c.kod), satir('🕣', 'Zaman', atamaTamAd(c.zaman)),
        yonetici ? null : h('div', { class: 'hz-uyari', style: 'margin-top:8px' }, '🔒 İzin/rapor kayıtları bu rolde salt-okunurdur.'), h('div', { class: 'satir', style: 'justify-content:flex-end;margin-top:12px' }, kapatBtn())));
      return;
    }
    kapat = pencereAc(yonetici ? '⚡ Müsait Personel' : 'Müsait Personel', h('div', null, h('div', { class: 'alt', style: 'margin-bottom:6px' }, baslik), satir('🟢', 'Durum', 'Bu gün görev, izin veya tatil kaydı yok; atamaya açık.'),
      h('div', { class: 'satir', style: 'justify-content:flex-end;margin-top:12px' }, yonetici ? h('button', { type: 'button', class: 'ana', onclick: git2('talep', 'yeniTalep') }, '+ Görev talebi gir (vekâleten)') : null, kapatBtn())));
  }

  // ---- Matris ----
  function matrisCiz() {
    const gunIso = GUN.map((_, i) => matrisGunEkle(d.bas, i));
    const gorunen = d.t.haftaSonu === 'GIZLI' ? [0, 1, 2, 3, 4] : [0, 1, 2, 3, 4, 5, 6];
    const kolon = (i) => { const iso = gunIso[i], tum = tatiller(iso), hs = i >= 5;
      const rozet = tum.map((x) => h('div', null, h('span', { class: 'hz-hp ' + (x.zaman !== 'TAM' ? 'arife' : x.tur === 'IDARI' ? 'idari' : 'resmi') }, (x.zaman !== 'TAM' ? '0,5 Gün ' : '') + x.ad)));
      return h('th', { class: 'hz-gh' + (hs ? ' hs' + (i === 5 ? ' hs-bas' : '') + (d.t.haftaSonu === 'DAR' ? ' dar' : '') : '') }, h('div', { class: 'hz-gust' }, GUN[i]), h('div', { class: 'hz-gtar' }, takvimTarihYaz(iso).slice(0, 5)), rozet); };
    const gl = gruplar(), say = gorunen.length + 1;
    const gorSay = gunIso.map((iso) => d.veri.filter((k) => k.hucreler.some((c) => c.tarih === iso)).length);
    const govde = [];
    gl.forEach((gr) => {
      if (gr.b) govde.push(h('tr', { class: 'hz-grup' }, h('td', { colspan: String(say) }, h('span', null, gr.b), h('span', { class: 'hz-sayi' }, gr.l.length + ' Personel'))));
      gr.l.forEach((k) => {
        const sb = d.sabit.has(k.sicil);
        govde.push(h('tr', null, h('th', { class: 'hz-pers' }, h('div', { class: 'hz-pers-i' },
          h('button', { type: 'button', class: 'hz-pin' + (sb ? ' on' : ''), title: sb ? 'Sabitlemeyi kaldır' : 'En üste sabitle', 'aria-label': (sb ? 'Sabitlemeyi kaldır: ' : 'Sabitle: ') + k.ad, onclick: () => { if (sb) d.sabit.delete(k.sicil); else d.sabit.add(k.sicil); hzYaz('gorev_hafta_sabit', [...d.sabit]); ciz(true); } }, '📌'),
          h('div', null, h('div', { class: 'hz-ad' }, k.ad), d.t.gsm && k.gsm ? h('div', { class: 'hz-tel' }, k.gsm) : null))),
          gorunen.map((i) => hucre(k, gunCoz(k, gunIso[i], i)))));
      });
    });
    if (!govde.length) govde.push(h('tr', null, h('td', { colspan: String(say), style: 'text-align:center;padding:28px;color:var(--soluk)' }, d.q ? 'Arama kriterine uygun personel veya görev kaydı bulunamadı.' : d.t.odak && d.t.odak !== 'YOK' ? 'Bu hafta seçili odağa uyan personel yok (Odağı kaldırarak tümünü görebilirsiniz).' : d.musait ? 'Bu hafta hafta içi boş günü olan personel yok.' : d.sadece || d.ana ? 'Bu hafta, seçili filtrelerle görevlendirilmiş personel yok.' : 'Eşleşen personel yok.')));
    const tablo = h('table', { class: 'hz-tablo yog-' + d.t.yogunluk },
      h('thead', null, h('tr', null, h('th', { class: 'hz-pers' }, h('div', { style: 'font-weight:800' }, 'Saha Personeli'), h('div', { class: 'alt', style: 'font-size:11px;font-weight:600' }, 'Sabitleme (📌) • Ad Soyad')), gorunen.map(kolon))),
      h('tbody', null, govde),
      h('tfoot', null, h('tr', null, h('th', { class: 'hz-pers' }, 'Günlük görevli sayısı'), gorunen.map((i) => h('td', { style: 'text-align:center;font-weight:700;padding:8px' }, String(gorSay[i]))))));
    tabloKap.replaceChildren(h('div', { class: 'hz-tab' }, h('div', { class: 'kaydir' }, tablo)),
      h('div', { class: 'alt', style: 'font-size:12px;margin-top:6px' }, 'Üst yarı = öğleden önce (ÖÖ), alt yarı = öğleden sonra (ÖS), tek blok = tam gün. İzin kesikli çerçeve = onay bekliyor. Bölünmüş hücrelerde her yarı ayrı tıklanır.'));
  }
  function ciz(yalnizMatris) { if (!yalnizMatris) { kpi(); hazirCiz(); lejant(); } matrisCiz(); }

  // ---- Özelleştirme çekmecesi ----
  function cekmece() {
    const perde = h('div', { class: 'hz-perde' }), yan = h('aside', { class: 'hz-cekmece', 'aria-label': 'Görünüm Özelleştirme Paneli' });
    const kapat = () => { perde.remove(); yan.remove(); document.removeEventListener('keydown', esc); };
    const esc = (e) => { if (e.key === 'Escape') kapat(); };
    document.addEventListener('keydown', esc); perde.addEventListener('mousedown', kapat);
    const ayar = (a, v) => { d.t[a] = v; d.aktif = null; tercihYaz(); ciz(); doldur(); };
    const seg = (a, secenekler) => h('div', { class: 'hz-seg' }, secenekler.map(([v, ad]) => h('button', { type: 'button', class: d.t[a] === v ? 'on' : '', onclick: () => ayar(a, v) }, ad)));
    const kutu = (a, ad) => { const i = h('input', { type: 'checkbox', onchange: () => ayar(a, i.checked) }); i.checked = !!d.t[a]; return h('label', { class: 'hz-chk' }, i, h('span', null, ad)); };
    const katman = (b, ...ic) => h('div', { class: 'hz-kat' }, h('div', { class: 'hz-katb' }, b), ...ic);
    const not = (...x) => h('div', { class: 'hz-not' }, ...x);
    function doldur() {
      const odak = h('select', { class: 'metin', 'aria-label': 'Odak vurgusu', style: 'width:100%', onchange: (e) => ayar('odak', e.target.value) },
        h('option', { value: 'YOK' }, 'Odak Yok (Tümü)'), d.anaListe.map((a) => h('option', { value: 'PROJ:' + a }, 'Proje: ' + a)), d.konumListe.map((a) => h('option', { value: 'LOC:' + a }, 'Yerleşke: ' + a)),
        h('option', { value: 'MUSAIT' }, 'Sadece Müsait Günler'), h('option', { value: 'CAKISMA' }, 'Sadece İkame / Çakışma'));
      odak.value = d.t.odak;
      const sc = yan.querySelector('.hz-cg'); const y = sc ? sc.scrollTop : 0;
      yan.replaceChildren(
        h('div', { class: 'hz-cb' }, h('div', null, h('h2', { style: 'margin:0;font-size:16px' }, '⚙️ Görünümü Özelleştir'), h('div', { class: 'alt', style: 'font-size:12px' }, 'Bu bilgisayardaki matris ayarlarınız')), h('button', { type: 'button', 'aria-label': 'Kapat', onclick: kapat }, '✕')),
        h('div', { class: 'hz-cg' },
          katman('Katman 1 — Hücre Yoğunluğu', seg('yogunluk', [['KOMPAKT', 'Kompakt'], ['STANDART', 'Standart'], ['DETAYLI', 'Detaylı']]), not(h('b', null, 'Kompakt:'), ' Tek satır proje/konum • ', h('b', null, 'Standart:'), ' Sorumlu & tel • ', h('b', null, 'Detaylı:'), ' Faaliyet ve talep kodu dahil.')),
          katman('Katman 2 — Hücre Bilgi Alanları', kutu('konum', 'Yerleşke / Konum'), kutu('kod', 'Talep No (TLP-…)'), kutu('sorumlu', 'Proje Sorumlusu'), kutu('gsm', 'Telefonlar (sorumlu ve personel)'), kutu('musait', 'Boş Günlerde "Müsait" Etiketi')),
          katman('Katman 3 — Satır Gruplama & Sabitleme', h('div', { class: 'hz-radyo' }, [['YOK', 'Düz Alfabetik Liste'], ['DURUM', 'Duruma Göre Grupla'], ['PROJE', 'Ana Projeye Göre Grupla'], ['YERLESKE', 'Yerleşkeye Göre Grupla']].map(([v, ad]) => h('button', { type: 'button', class: d.t.grup === v ? 'on' : '', onclick: () => ayar('grup', v) }, ad))),
            not('📌 Sol sütundaki iğneyle sabitlediğiniz personel her zaman en üstte ', h('b', null, '"📌 Sabitlenen Personel"'), ' grubunda görünür.')),
          katman('Katman 4 — Renk Kodlama Modu', seg('renk', [['DURUM', 'Durum Bazlı'], ['PROJE', 'Ana Proje'], ['YERLESKE', 'Yerleşke']]), not(h('b', null, 'Ana Proje:'), ' her ana proje farklı sol renk şeridi alır • ', h('b', null, 'Yerleşke:'), ' Merkez (Gölbaşı) ve şehir dışı saha ayrışır.')),
          katman('Katman 5 — Akıllı Odak & Sütun Düzeni', h('label', { style: 'font-size:12px;font-weight:700;display:block;margin-bottom:4px' }, 'Odak Vurgusu (Spotlight):'), odak,
            h('label', { style: 'font-size:12px;font-weight:700;display:block;margin:10px 0 4px' }, 'Hafta Sonu Sütunları (CT / PZ):'), seg('haftaSonu', [['NORMAL', 'Normal Göster'], ['DAR', 'Dar Sütun'], ['GIZLI', 'Gizle (PT–C)']]), kutu('takvim', 'Akademik / Kurumsal Tatilleri Yansıt'))),
        h('div', { class: 'hz-cs' }, h('span', { class: 'hz-kay' }, '✓ Tercihler kaydedildi'), h('button', { type: 'button', class: 'ana', onclick: kapat }, 'Tamam')));
      const yg = yan.querySelector('.hz-cg'); if (yg) yg.scrollTop = y;
    }
    doldur(); document.body.append(perde, yan);
  }

  kap.append(
    h('section', { class: 'hz-bas-kart' }, h('span', { class: 'hz-ikon', 'aria-hidden': 'true' }, '🗓'),
      h('div', { style: 'min-width:0' }, h('h1', { style: 'margin:0;font-size:20px' }, 'Haftalık Özet — 7 Günlük Personel Durum Matrisi'), h('div', { class: 'alt', style: 'font-size:12px' }, 'Merkezi Personel Görevlendirme Aracı • ÖÖ / ÖS bölünmüş hücreler • izin, rapor ve takvim tatilleri birlikte')),
      h('span', { style: 'flex:1' }), yenileYazi, h('button', { type: 'button', onclick: () => excelKaydet() }, "Excel'e aktar"), h('button', { type: 'button', class: 'hz-ozel', onclick: cekmece }, '⚙️ Görünümü Özelleştir')),
    kpiKap,
    h('section', { class: 'hz-kontrol' },
      h('div', { class: 'hz-k1' }, h('div', { class: 'hz-hafta' }, h('button', { type: 'button', 'aria-label': 'Önceki hafta', onclick: git(-1) }, '◀ Önceki Hafta'), haftaSec, h('button', { type: 'button', 'aria-label': 'Sonraki hafta', onclick: git(1) }, 'Sonraki Hafta ▶'), h('button', { class: 'ana', type: 'button', onclick: () => haftayaGit(takvimIso(matrisPazartesi(new Date()))) }, 'Bu hafta'), basKutu), qKutu),
      h('div', { class: 'hz-k1' }, bolumSec, anaSec, konumSec, modSec), hazirKap),
    lejantKap, tabloKap);

  async function excelKaydet() {
    try {
      const o = await Kopru.cagir('matrisExcel', { bas: d.bas, bolum: d.bolum, ana: d.ana, konum: d.konum, q: '', sadeceGorevli: d.sadece, sadeceMusait: d.musait, sadeceSaha: d.saha });
      if (!o.iptal) toast('Excel kaydedildi (' + o.satir + ' personel): ' + o.yol, 'iyi');
    } catch (e) { hata(e); }
  }

  try { for (const b of await Kopru.cagir('matrisBolumler')) bolumSec.append(h('option', { value: b }, b)); } catch (e) { /* filtre listesi olmadan da çalışır */ }
  try {
    const hl = (await Kopru.cagir('havuzListe', {})).filter((y) => y.aktif && !y.birlestirildiId);
    d.anaListe = hl.filter((y) => y.seviye === 1).map((y) => y.ad).sort((a, b) => a.localeCompare(b, 'tr'));
    d.konumListe = [...new Set(hl.filter((y) => y.seviye === 4).map((y) => y.ad))].sort((a, b) => a.localeCompare(b, 'tr'));
    d.anaListe.forEach((a) => anaSec.append(h('option', { value: a }, a))); d.konumListe.forEach((a) => konumSec.append(h('option', { value: a }, a)));
  } catch (e) { /* ... */ }
  haftaSecYenile();
  await tatilYukle();
  await yukle();

  // 30 sn'de bir yalnız hafta sürümü sorulur; değişmişse matris yeniden çekilir. Sayfa kapanınca (DOM'dan kalkınca) durur.
  const sayac = setInterval(async () => {
    if (!kap.isConnected) { clearInterval(sayac); return; }
    try { const s = await Kopru.cagir('matrisSurum', { bas: d.bas }); if (s.surum !== d.surum) await yukle(true); else yenileYazi.textContent = 'Son denetim ' + new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' · otomatik (30 sn)'; } catch (e) { /* sessiz */ }
  }, 30000);
  return kap;
}
