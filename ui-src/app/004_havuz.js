// Proje / Görev Havuzu yönetimi (yalnız Merkez Yönetici): "Katlanabilir Ağaç-Tablo" prototipinin (Murat, 25.11.2026) birebir uyarlaması.
// Ana Proje > Alt Proje > Faaliyet > Yerleşke. Kurallar sunucudadır; arayüz yalnız adlandırılmış komut çağırır.
// Pasif = tamamlandı (analizde kalır, yeni talepte görünmez); Arşiv = geçersiz tanım (nedenli); birleştirme veri kaybettirmez.
function havuzSeviyeAd(n) { return ['', 'Ana Proje', 'Alt Proje', 'Faaliyet', 'Yerleşke'][n] || ''; }
const HV_ROZET = ['', '[ANA]', '[ALT]', '[FAALİYET]', ''];

async function havuzSayfa() {
  const D = { liste: [], acik: new Set(), ara: '', filtre: 'AKTIF', gorunum: 'AGAC', duzenle: null, ekle: null, arsiv: null, efor: {}, eforVar: false, sonKomut: null, gunluk: [], gunlukAcik: true, ilk: true };
  const kap = h('div', { class: 'hv' });
  const ad2 = (n) => ({ 1: 'Alt Proje', 2: 'Faaliyet', 3: 'Yerleşke' }[n]);
  // "Genel" = alt projesi olmayan ana projenin görünmeyen aracı Alt Proje kaydı: ağaçta gösterilmez, faaliyetler doğrudan ana projenin altında görünür.
  const genelMi = (x) => x.seviye === 2 && norm(x.ad) === 'genel';
  const genelAlt = (anaId) => cocuk(anaId).find(genelMi) || null;
  const gorunenCocuk = (x) => (x.seviye === 1 ? cocuk(x.id).flatMap((c) => (genelMi(c) ? cocuk(c.id) : [c])) : cocuk(x.id));
  const bul = (id) => D.liste.find((x) => x.id === id);
  const cocuk = (id) => D.liste.filter((x) => x.ustId === id && x.birlestirildiId == null);
  const trk = (t) => String(t).toLocaleLowerCase('tr-TR');
  const norm = (t) => trk(t).replace(/[^a-z0-9ığüşöç]+/g, '');
  const yol = (x) => { const p = []; let c = x; while (c) { p.unshift(c.ad); c = c.ustId == null ? null : bul(c.ustId); } return p; };
  const yolYaz = (x) => yol(x).join(' → ');
  const efor = (id) => (D.efor[id] || 0);
  const adamGun = (n) => Number(n || 0).toFixed(1).replace('.', ',') + ' Adam-Gün';
  const yaprakAktif = (y) => y.aktif && !y.arsiv;
  function yapraklar(x) { if (x.seviye === 4) return [x]; const r = []; cocuk(x.id).forEach((c) => r.push(...yapraklar(c))); return r; }
  const aramaUyar = (y) => { const q = trk(D.ara.trim()); if (!q) return true; const k = q.startsWith('#') ? q.slice(1) : q; return trk(yolYaz(y)).includes(q) || (k && String(y.id) === k); };
  const durumUyar = (okAktif) => D.filtre === 'TUMU' || (D.filtre === 'AKTIF' ? okAktif : !okAktif);
  const gorunurYaprak = (y) => durumUyar(yaprakAktif(y)) && aramaUyar(y);
  function dalYapraklari(x) { return yapraklar(x).filter(gorunurYaprak); }
  function dalGorunur(x) {
    if (x.seviye === 4) return gorunurYaprak(x);
    if (yapraklar(x).length === 0) return durumUyar(x.aktif && !x.arsiv) && aramaUyar(x);   // henüz alt kaydı olmayan düğüm
    return dalYapraklari(x).length > 0;
  }
  function istat(x) {
    const hepsi = yapraklar(x), ak = hepsi.filter(yaprakAktif).length;
    if (!hepsi.length) return { durum: x.arsiv ? 'ARSIV' : x.aktif ? 'ACTIVE' : 'PASSIVE', ak: x.aktif ? 1 : 0, top: 1 };
    return { durum: ak === hepsi.length ? 'ACTIVE' : ak > 0 ? 'PARTIAL' : 'PASSIVE', ak, top: hepsi.length };
  }
  function mukerrer(x) { const n = norm(x.ad); if (!n) return null; return cocuk(x.ustId).filter((k) => k.id < x.id && norm(k.ad) === n)[0] || null; }
  function sayilar(x) {
    const ys = dalYapraklari(x), alt = new Set(), fa = new Set();
    ys.forEach((y) => { let c = y; while (c && c.id !== x.id) { if (c.seviye === 2 && !genelMi(c)) alt.add(c.id); if (c.seviye === 3) fa.add(c.id); c = c.ustId == null ? null : bul(c.ustId); } });
    return { alt: alt.size, fa: fa.size, ye: ys.length };
  }
  function hl(t) {
    const q = D.ara.trim(); if (!q || q.startsWith('#')) return t;
    const i = trk(t).indexOf(trk(q)); if (i < 0) return t;
    return [t.slice(0, i), h('mark', { class: 'hv-hl' }, t.slice(i, i + q.length)), t.slice(i + q.length)];
  }

  async function yukle() {
    try {
      D.liste = await Kopru.cagir('havuzListe');
      try { D.efor = {}; (await Kopru.cagir('havuzEfor')).forEach((r) => { D.efor[r.id] = Number(r.adamGun) || 0; }); D.eforVar = true; } catch (e) { D.eforVar = false; }
      try { D.gunluk = await Kopru.cagir('logListe', { bas: '', bit: '', islem: '', q: 'proje_havuzu', ust: 8 }); } catch (e) { D.gunluk = []; }
      if (D.ilk) { D.ilk = false; derinlik(D.liste.length > 80 ? 2 : 4, true); }
      D.duzenle = null; D.ekle = null; D.arsiv = null;
      ciz();
    } catch (e) { hata(e); }
  }
  async function yap(cmd, args, mesaj) {
    D.sonKomut = cmd + ' ' + JSON.stringify(args);
    try { await Kopru.cagir(cmd, args); if (mesaj) toast(mesaj); await yukle(); } catch (e) { hata(e); }
  }
  function derinlik(d, sessiz) { D.acik = new Set(D.liste.filter((x) => x.seviye < d).map((x) => x.id)); if (!sessiz) ciz(); }

  // Üst düğüm ve alt kayıtları sırayla (önce üst) etkinleştirir; pasife almada sunucu altındakileri de kapatır.
  async function zincirDurum(x, etkin) {
    D.sonKomut = 'havuzDurum ' + JSON.stringify({ id: x.id, aktif: etkin });
    try {
      if (!etkin) { await Kopru.cagir('havuzDurum', { id: x.id, aktif: false }); toast('Tamamlandı: ' + x.ad + ' (altındakilerle) pasife alındı.'); }
      else {
        let n = 0;
        const sira = [x]; const gez = (d) => cocuk(d.id).forEach((c) => { sira.push(c); gez(c); });
        gez(x);
        for (const k of sira) if (!k.aktif && !k.arsiv) { await Kopru.cagir('havuzDurum', { id: k.id, aktif: true }); n++; }
        toast(n + ' kayıt etkinleştirildi.');
      }
      await yukle();
    } catch (e) { hata(e); await yukle(); }
  }

  // ---- Hızlı ekleme (zincirli) ----
  const ALANLAR = { 1: ['Yeni Ana Proje *', 'İlk Alt Proje (yoksa boş bırakın)', 'İlk Faaliyet *', 'İlk Yerleşke *'], 2: ['Yeni Alt Proje *', 'İlk Faaliyet *', 'İlk Yerleşke *'], 3: ['Yeni Faaliyet *', 'İlk Yerleşke *'], 4: ['Yeni Yerleşke / Konum adını yazıp Enter\'a basın *'] };
  function hizliEkleSatiri(hedef, ustId, derin, dogrudan) {
    const al = ALANLAR[hedef], girisler = al.map((ph) => h('input', { type: 'text', class: 'metin hv-gir', maxlength: '300', placeholder: ph, 'aria-label': ph }));
    const gonder = async () => {
      const adlar = girisler.map((g) => g.value.trim());
      if (hedef === 1 && !adlar[1]) adlar[1] = 'Genel';
      if (adlar.some((a) => !a)) { toast('Tüm alanları doldurun.', 'uyari'); return; }
      try {
        let ust = ustId;
        if (dogrudan) { const g = genelAlt(ustId); if (g) ust = g.id; else { const r0 = await Kopru.cagir('havuzEkle', { ustId, ad: 'Genel' }); ust = r0.id; } }
        for (let i = 0; i < adlar.length; i++) { D.sonKomut = 'havuzEkle ' + JSON.stringify({ ustId: ust, ad: adlar[i] }); const r = await Kopru.cagir('havuzEkle', { ustId: ust, ad: adlar[i] }); ust = r.id; }
        if (ustId != null) D.acik.add(ustId);
        toast('Eklendi.'); await yukle();
      } catch (e) { hata(e); await yukle(); }
    };
    girisler.forEach((g) => g.addEventListener('keydown', (e) => { if (e.key === 'Enter') gonder(); if (e.key === 'Escape') { D.ekle = null; ciz(); } }));
    setTimeout(() => girisler[0].focus(), 0);
    const etiket = { 1: ['ANA PROJE', 'sky'], 2: ['ALT PROJE', 'vio'], 3: ['FAALİYET', 'amb'], 4: ['YERLEŞKE', 'grn'] }[hedef];
    return h('tr', { class: 'hv-ekle' }, h('td', { colspan: '5' }, h('div', { class: 'hv-ekle-i', style: 'padding-left:' + (derin * 26 + 10) + 'px' },
      h('span', { class: 'hv-et ' + etiket[1] }, '+ YENİ ' + etiket[0]), ...girisler,
      h('button', { type: 'button', class: 'hv-b grn dolu', onclick: gonder }, '✓ Ekle'), h('button', { type: 'button', class: 'hv-b', onclick: () => { D.ekle = null; ciz(); } }, 'Vazgeç'))));
  }
  function arsivSatiri(x, derin) {
    const gir = h('input', { type: 'text', class: 'metin hv-gir', maxlength: '300', placeholder: 'Arşivleme nedeni *', 'aria-label': 'Neden' });
    setTimeout(() => gir.focus(), 0);
    const gonder = () => { if (!gir.value.trim()) { toast('Neden yazın.', 'uyari'); return; } yap('havuzArsiv', { id: x.id, arsiv: true, neden: gir.value }, 'Arşive alındı.'); };
    gir.addEventListener('keydown', (e) => { if (e.key === 'Enter') gonder(); if (e.key === 'Escape') { D.arsiv = null; ciz(); } });
    return h('tr', { class: 'hv-ekle' }, h('td', { colspan: '5' }, h('div', { class: 'hv-ekle-i', style: 'padding-left:' + (derin * 26 + 10) + 'px' },
      h('span', { class: 'hv-et amb' }, '🗄 ARŞİVLE: ' + x.ad), gir, h('button', { type: 'button', class: 'hv-b amb dolu', onclick: gonder }, 'Arşive al'), h('button', { type: 'button', class: 'hv-b', onclick: () => { D.arsiv = null; ciz(); } }, 'Vazgeç'))));
  }

  // ---- Birleştirme penceresi ----
  function birlestirAc(x) {
    const adaylar = D.liste.filter((k) => k.seviye === x.seviye && k.id !== x.id && k.birlestirildiId == null && !k.arsiv);
    if (!adaylar.length) { toast('Birleştirilecek başka kayıt yok.', 'uyari'); return; }
    const n = norm(x.ad);
    const tercih = adaylar.find((k) => k.ustId === x.ustId && norm(k.ad) === n) || adaylar.find((k) => norm(k.ad) === n) || adaylar.find((k) => k.ustId === x.ustId) || adaylar[0];
    const sec = h('select', { class: 'metin', 'aria-label': 'Hedef kayıt', style: 'width:100%;min-height:40px' },
      adaylar.map((k) => h('option', { value: k.id, selected: k.id === tercih.id }, '#' + k.id + ' • ' + yolYaz(k) + (D.eforVar ? ' (' + adamGun(efor(k.id)) + ')' : ''))));
    let kapat = () => {};
    const govde = h('div', { class: 'hv-mod' },
      h('div', { class: 'hv-mod-kart' }, h('div', { class: 'alt' }, 'Birleştirilip kapatılacak kaynak kayıt:'),
        h('div', { class: 'hv-mod-kaynak' }, '#' + x.id + ' • ' + yolYaz(x)),
        D.eforVar ? h('div', { class: 'hv-mono grn' }, 'Aktarılacak geçmiş efor: ' + adamGun(efor(x.id))) : null),
      h('label', { style: 'display:block;font-weight:700;margin:10px 0 4px' }, 'Birleştirilecek doğru hedef kaydı seçin:'), sec,
      h('div', { class: 'hv-mod-garanti' }, h('b', null, 'Sistem garantisi: '), 'kaynak kayda bağlı geçmiş görev talepleri' + (D.eforVar ? ' ve ' + adamGun(efor(x.id)) + ' efor' : '') + ' hedef kayda devredilir; altındaki kayıtlar hedefe taşınır (aynı adlılar kendi içinde birleşir). Kaynak kayıt silinmez, pasif kalır ve kayıt altına alınır. Geri alınamaz.'),
      h('div', { class: 'satir', style: 'justify-content:flex-end;margin-top:12px' }, h('button', { type: 'button', onclick: () => kapat() }, 'Vazgeç'),
        h('button', { type: 'button', class: 'ana', onclick: () => { kapat(); yap('havuzBirlestir', { kaynakId: x.id, hedefId: Number(sec.value) }, 'Birleştirildi; efor hedefe aktarıldı.'); } }, '⇄ Kayıtları Birleştir ve Eforu Aktar')));
    kapat = pencereAc('⇄ Mükerrer Birleştirme — Kayıt Birleştirme ve Efor Aktarımı', govde);
  }

  // ---- Satır parçaları ----
  const dBtn = (ad, sinif, fn, baslik) => h('button', { type: 'button', class: 'hv-b ' + (sinif || ''), title: baslik || '', onclick: fn }, ad);
  function durumPill(s) {
    if (s.durum === 'ACTIVE') return h('span', { class: 'hv-pill ok' }, h('i'), 'Aktif');
    if (s.durum === 'PARTIAL') return h('span', { class: 'hv-pill kis', title: 'Alt dalların bir kısmı pasif' }, h('i'), 'Kısmi (' + s.ak + '/' + s.top + ')');
    if (s.durum === 'ARSIV') return h('span', { class: 'hv-pill ars' }, h('i'), 'Arşiv');
    return h('span', { class: 'hv-pill pas' }, h('i'), 'Pasif');
  }
  function adHucresi(x, sinif) {
    if (D.duzenle !== x.id) return h('span', { class: 'hv-ad ' + sinif + (x.aktif && !x.arsiv ? '' : ' pasif'), onclick: x.seviye < 4 ? () => toggle(x.id) : null }, hl(x.ad));
    const gir = h('input', { type: 'text', class: 'metin hv-gir', maxlength: '300', value: x.ad, 'aria-label': 'Yeni ad' });
    const kaydet = () => yap('havuzAdlandir', { id: x.id, ad: gir.value }, 'Kaydedildi.');
    gir.addEventListener('keydown', (e) => { if (e.key === 'Enter') kaydet(); if (e.key === 'Escape') { D.duzenle = null; ciz(); } });
    setTimeout(() => { gir.focus(); gir.select(); }, 0);
    return h('span', { class: 'hv-inl' }, gir, h('button', { type: 'button', class: 'hv-b grn dolu', onclick: kaydet }, '✓ Kaydet'), h('button', { type: 'button', class: 'hv-b', onclick: () => { D.duzenle = null; ciz(); } }, 'İptal'));
  }
  const toggle = (id) => { if (D.acik.has(id)) D.acik.delete(id); else D.acik.add(id); ciz(); };
  const kilavuz = (n, yaprakSonMu) => { const r = []; for (let i = 0; i < n; i++) r.push(h('span', { class: 'hv-g' })); return r; };

  function satirlar(x, derin, cik, sonMu) {
    const ara = !!D.ara.trim(), acik = ara || D.acik.has(x.id);
    const alt = gorunenCocuk(x).filter(dalGorunur), s = istat(x), sy = sayilar(x);
    const merged = D.liste.filter((k) => k.birlestirildiId === x.id).map((k) => '#' + k.id);
    const muk = mukerrer(x);
    const yaprak = x.seviye === 4;
    const sinif = ['', 'l1', 'l2', 'l3', 'l4'][x.seviye];
    const ac = (!yaprak && (alt.length || gorunenCocuk(x).length)) ? h('button', { type: 'button', class: 'hv-ok ' + sinif, 'aria-label': acik ? 'Daralt' : 'Aç', onclick: () => toggle(x.id) }, acik ? '▾' : '▸') : (yaprak ? null : h('span', { class: 'hv-ok-bos' }));
    const hiyer = h('div', { class: 'hv-hi' }, ...kilavuz(derin), yaprak ? h('span', { class: 'hv-dal' }, sonMu ? '└─' : '├─') : null, yaprak ? h('span', { class: 'hv-pin' }, '📍') : ac,
      yaprak ? null : h('span', { class: 'hv-sv ' + sinif }, HV_ROZET[x.seviye]),
      adHucresi(x, sinif),
      yaprak ? h('span', { class: 'hv-id' }, hl('#' + x.id)) : null,
      muk ? h('span', { class: 'hv-chip amb', title: 'Aynı üst kayıtta benzer ad' }, '⚠ Olası Mükerrer (#' + muk.id + ' ile Birleştirilebilir)') : null,
      merged.length ? h('span', { class: 'hv-chip sky' }, '⇄ Birleştirildi: ' + merged.join(', ')) : null,
      x.arsiv ? h('span', { class: 'hv-chip amb', title: x.arsivNeden || '' }, '🗄 Arşiv' + (x.arsivNeden ? ': ' + x.arsivNeden : '')) : null);
    const kaps = yaprak ? h('span', { class: 'hv-mono soluk' }, 'Kayıt #' + x.id) : h('span', { class: 'hv-kap' }, x.seviye === 1 ? sy.alt + ' Alt Proje • ' + sy.fa + ' Faaliyet • ' + sy.ye + ' Yerleşke' : x.seviye === 2 ? sy.fa + ' Faaliyet • ' + sy.ye + ' Yerleşke' : sy.ye + ' Yerleşke');
    let isl = [];
    if (x.arsiv) isl = [dBtn('Arşivden çıkar', '', () => yap('havuzArsiv', { id: x.id, arsiv: false }, 'Arşivden çıkarıldı (pasif).'))];
    else {
      if (x.seviye === 1) isl.push(dBtn('+ Faaliyet', 'vio', () => { D.ekle = { hedef: 3, ust: x.id, dogrudan: true }; D.duzenle = null; D.acik.add(x.id); ciz(); }, 'Alt proje olmadan doğrudan ana projeye faaliyet ekle'));
      if (!yaprak) isl.push(dBtn('+ ' + ad2(x.seviye), { 1: 'sky', 2: 'vio', 3: 'grn' }[x.seviye], () => { D.ekle = { hedef: x.seviye + 1, ust: x.id }; D.duzenle = null; D.acik.add(x.id); ciz(); }));
      isl.push(dBtn('✎ Düzenle', '', () => { D.duzenle = x.id; D.ekle = null; ciz(); }, 'Adı düzenle (Enter kaydet, Esc iptal)'));
      if (yaprak || muk) isl.push(dBtn('⇄ Birleştir', muk ? 'amb dolu' : 'sky-h', () => birlestirAc(x), 'Mükerrer kaydı doğru kayda birleştir'));
      isl.push(dBtn('⏻ ' + (s.durum === 'ACTIVE' ? 'Pasife Al' : 'Aktifleştir'), 'amb-h', () => yaprak ? yap('havuzDurum', { id: x.id, aktif: !x.aktif }, x.aktif ? 'Pasife alındı.' : 'Aktifleştirildi.') : zincirDurum(x, s.durum !== 'ACTIVE'), yaprak ? '' : 'Tüm alt dalları toplu aktif/pasif yap'));
      if (s.durum === 'PASSIVE') isl.push(dBtn('🗄 Arşivle', 'amb-h', () => { D.arsiv = x.id; D.ekle = null; D.duzenle = null; ciz(); }, 'Geçersiz tanım olarak arşive al'));
    }
    cik.push(h('tr', { class: 'hv-r ' + sinif + (x.aktif && !x.arsiv ? '' : ' pasif') },
      h('td', null, hiyer), h('td', null, kaps),
      h('td', { class: 'hv-efor ' + sinif }, D.eforVar ? adamGun(efor(x.id)) : '—'),
      h('td', { style: 'text-align:center' }, durumPill(s)),
      h('td', { style: 'text-align:right;white-space:nowrap' }, h('span', { class: 'hv-isl' }, isl))));
    if (D.ekle && D.ekle.ust === x.id) cik.push(hizliEkleSatiri(D.ekle.hedef, x.id, derin + 1, D.ekle.dogrudan));
    if (D.arsiv === x.id) cik.push(arsivSatiri(x, derin + 1));
    if (acik) alt.forEach((c, i) => satirlar(c, derin + 1, cik, i === alt.length - 1));
  }

  // ---- Parçalar ----
  function kpiKart(sinif, ad, sayi, rozet, ek) {
    return h('div', { class: 'hv-kpi ' + sinif }, h('div', { class: 'hv-kpi-ust' }, h('span', null, ad), h('span', { class: 'hv-kr' }, rozet)), h('div', { class: 'hv-kpi-sayi' }, sayi, ek || null));
  }
  function ustSerit() {
    const lv = (n) => D.liste.filter((x) => x.seviye === n && x.birlestirildiId == null);
    const ak = (l) => l.filter((x) => x.aktif && !x.arsiv).length;
    const top = D.liste.filter((x) => x.seviye === 1 && x.birlestirildiId == null).reduce((t, x) => t + efor(x.id), 0);
    return h('div', { class: 'hv-kpis' },
      kpiKart('sky', 'Ana Proje', lv(1).length, ak(lv(1)) + ' Aktif • ' + (lv(1).length - ak(lv(1))) + ' Pasif'),
      kpiKart('vio', 'Alt Proje Dalı', lv(2).length, 'Hiyerarşi 2. Kırılım'),
      kpiKart('amb', 'Faaliyet Başlığı', lv(3).length, 'Operasyonel 3. Kırılım'),
      kpiKart('grn', 'Yerleşke / Konum', lv(4).length, ak(lv(4)) + ' Aktif • ' + (lv(4).length - ak(lv(4))) + ' Pasif'),
      kpiKart('top', 'Konsolide Toplam Efor', D.eforVar ? top.toFixed(1).replace('.', ',') : '—', 'Tam=1,0 • ÖÖ/ÖS=0,5', h('small', null, ' Adam-Gün')));
  }
  function aracCubugu() {
    const ara = h('input', { type: 'search', class: 'metin hv-ara', placeholder: 'Ana Proje, Alt Proje, Faaliyet, Yerleşke veya ID ara… (Örn: Konya, FAT, #105)', value: D.ara, 'aria-label': 'Ara' });
    ara.addEventListener('input', () => { D.ara = ara.value; ciz(); const y = kap.querySelector('.hv-ara'); if (y) { y.focus(); y.setSelectionRange(y.value.length, y.value.length); } });
    const seg = (k, a) => h('button', { type: 'button', class: D.filtre === k ? 'on' : '', onclick: () => { D.filtre = k; ciz(); } }, a);
    const muk = D.liste.filter((x) => x.birlestirildiId == null && mukerrer(x))[0];
    return h('section', { class: 'hv-arac' },
      h('div', { class: 'hv-arac1' }, h('div', { class: 'hv-aramak' }, h('span', { 'aria-hidden': 'true' }, '🔍'), ara),
        h('div', { class: 'hv-seg' }, seg('TUMU', 'Tümü'), seg('AKTIF', '● Sadece Aktifler'), seg('PASIF', '○ Pasifler')),
        h('button', { type: 'button', class: 'hv-yeni', onclick: () => { D.ekle = { hedef: 1, ust: null }; D.duzenle = null; ciz(); } }, '+ Yeni Ana Proje')),
      h('div', { class: 'hv-arac2' }, h('span', { class: 'soluk' }, 'Derinlik Görünümü:'),
        h('button', { type: 'button', class: 'hv-b', onclick: () => derinlik(1) }, 'Sadece Ana Projeler'), h('button', { type: 'button', class: 'hv-b', onclick: () => derinlik(2) }, 'Alt Projelere Kadar'), h('button', { type: 'button', class: 'hv-b sky', onclick: () => derinlik(5) }, '▾ Tümünü Aç'),
        h('span', { style: 'flex:1' }),
        h('span', { class: 'hv-ipucu' }, '💡 Satır içi düzenleme için ', h('b', null, '✎ Düzenle'), ' (', h('kbd', null, 'Enter'), ' kaydet, ', h('kbd', null, 'Esc'), ' iptal)', muk ? '  •  Örnek birleştirme: #' + muk.id + ' ' + muk.ad + ' → #' + mukerrer(muk).id : '')));
  }
  function agacTablosu() {
    const cik = [];
    if (D.ekle && D.ekle.ust == null) cik.push(hizliEkleSatiri(1, null, 0));
    const kok = cocuk(null).filter(dalGorunur);
    kok.forEach((x, i) => satirlar(x, 0, cik, i === kok.length - 1));
    return h('section', { class: 'hv-tab' }, h('div', { class: 'kaydir' }, h('table', null,
      h('thead', null, h('tr', null, ['HİYERARŞİ (ANA PROJE → ALT PROJE → FAALİYET → YERLEŞKE)', 'KAPSAM ÖZETİ', 'TOPLAM EFOR', 'DURUM', 'HIZLI İŞLEMLER'].map((x, i) => h('th', { style: i === 2 ? 'text-align:right' : i === 3 ? 'text-align:center' : i === 4 ? 'text-align:right' : '' }, x)))),
      h('tbody', null, cik.length ? cik : h('tr', null, h('td', { colspan: '5', class: 'alt', style: 'padding:18px' }, D.liste.length ? 'Eşleşen kayıt yok. Aramayı ya da filtreyi değiştirin.' : 'Havuz boş. "+ Yeni Ana Proje" ile ekleyin ya da eski veri aktarımıyla doldurun.'))))));
  }
  function duzTablo() {
    const ys = D.liste.filter((x) => x.seviye === 4 && x.birlestirildiId == null && gorunurYaprak(x)).sort((a, b) => a.id - b.id);
    return h('section', { class: 'hv-tab' },
      h('div', { class: 'hv-duzban' }, h('span', null, h('b', null, 'Karşılaştırma modu (eski düz liste): '), 'Aynı Ana Proje, Alt Proje ve Faaliyet adları her satırda tekrar eder; kayıt sayısı artar, mükerrer ve yazım hatası görmek zorlaşır.'),
        h('button', { type: 'button', class: 'hv-b sky dolu', onclick: () => { D.gorunum = 'AGAC'; ciz(); } }, 'Ağaç-Tablo görünümüne dön →')),
      h('div', { class: 'kaydir' }, h('table', null,
        h('thead', null, h('tr', null, ['ProjeHavuzuID', 'AnaProjeAdı (tekrarlı)', 'AltProjeAdı (tekrarlı)', 'FaaliyetAdı (tekrarlı)', 'KonumYerleşke', 'Adam-Gün', 'AktifMi'].map((x, i) => h('th', { style: i === 5 ? 'text-align:right' : i === 6 ? 'text-align:center' : '' }, x)))),
        h('tbody', null, ys.map((y) => { const p = yol(y); return h('tr', { class: 'hv-r l4' + (yaprakAktif(y) ? '' : ' pasif') }, h('td', { class: 'hv-mono soluk' }, '#' + y.id), h('td', null, h('b', null, p[0])), h('td', null, p[1]), h('td', null, p[2]), h('td', { class: 'hv-efor l4', style: 'text-align:left' }, '📍 ' + p[3]), h('td', { class: 'hv-efor l4' }, D.eforVar ? adamGun(efor(y.id)) : '—'), h('td', { style: 'text-align:center' }, yaprakAktif(y) ? '1 (Aktif)' : '0 (Pasif)')); })))));
  }
  function gunlukPaneli() {
    const sag = h('div', { class: 'hv-gl-sag' }, h('div', { class: 'hv-gl-b' }, 'GOREV.ISLEM_GUNLUGU — HAVUZ KAYITLARI (SON 8)', h('span', { class: 'soluk' }, ' 🔒 yalnız ekleme')),
      h('table', null, h('thead', null, h('tr', null, ['Zaman', 'Kullanıcı', 'İşlem', 'Ayrıntı'].map((x) => h('th', null, x)))),
        h('tbody', null, D.gunluk.length ? D.gunluk.map((r) => h('tr', null, h('td', { class: 'hv-mono soluk' }, String(r.zaman).replace('T', ' ').slice(0, 19)), h('td', null, r.adSoyad || r.kullanici), h('td', { class: 'hv-mono' }, r.islem), h('td', null, (r.nesne || '') + (r.nesneId ? ' #' + r.nesneId : '') + (r.ayrinti ? ' — ' + r.ayrinti : '')))) : h('tr', null, h('td', { colspan: '4', class: 'alt' }, 'Henüz havuz işlemi yok.')))));
    const sol = h('div', { class: 'hv-gl-sol' }, h('div', { class: 'hv-gl-b' }, 'SON İŞLEM İÇİN GÖNDERİLEN KOMUT'),
      h('pre', { class: 'hv-kod' }, D.sonKomut ? D.sonKomut : '// Henüz bir düzenleme yapılmadı.\n// Ağaç-Tablo üzerindeki herhangi bir satırı düzenleyin,\n// alt kayıt ekleyin, aktif/pasif yapın ya da mükerrer kaydı birleştirin;\n// çağrılan komut burada görünür.'),
      h('div', { class: 'alt', style: 'font-size:12px' }, 'Arayüz ham SQL göndermez: yalnız adlandırılmış komutlar çalışır; kurallar ve kayıt tutma sunucudadır.'));
    return h('section', { class: 'hv-gl' }, h('button', { type: 'button', class: 'hv-gl-bas', onclick: () => { D.gunlukAcik = !D.gunlukAcik; ciz(); } }, h('span', { class: 'hv-nokta' }), h('b', null, 'İşlem Günlüğü (Audit Log) Doğrulama Paneli'), h('span', { class: 'hv-mono soluk' }, 'Şema değişikliği gerektirmez • Atomik toplu güncelleme'), h('span', { style: 'flex:1' }), h('span', null, D.gunlukAcik ? 'Daralt ▾' : 'Aç ▸')),
      D.gunlukAcik ? h('div', { class: 'hv-gl-g' }, sol, sag) : null);
  }
  function baslik() {
    const sek = (k, a, on) => h('button', { type: 'button', class: D.gorunum === k ? 'on' : '', onclick: () => { D.gorunum = k; ciz(); } }, a);
    return h('div', { class: 'hv-bas' }, h('span', { class: 'hv-ikon', 'aria-hidden': 'true' }, '🗂'),
      h('div', { style: 'min-width:0' }, h('div', { class: 'hv-t' }, 'Proje / Görev Havuzu Yönetimi ', h('span', { class: 'hv-mono hv-tag' }, 'gorev.proje_havuzu')),
        h('div', { class: 'soluk', style: 'font-size:12px' }, 'Ana Proje → Alt Proje → Faaliyet → Yerleşke hiyerarşik Ağaç-Tablo yapısı • Mevcut veritabanı şemasıyla %100 uyumlu')),
      h('span', { style: 'flex:1' }), h('div', { class: 'hv-seg' }, sek('AGAC', '☰ Ağaç-Tablo Görünümü (Önerilen)'), sek('DUZ', '≡ Eski Düz Liste (Karşılaştırma)')));
  }
  function ciz() {
    const y = window.scrollY;
    kap.replaceChildren(baslik(), ustSerit(), aracCubugu(), D.gorunum === 'DUZ' ? duzTablo() : agacTablosu(), gunlukPaneli());
    window.scrollTo(0, y);
  }

  await yukle();
  return kap;
}
