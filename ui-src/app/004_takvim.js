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

async function takvimSayfa() {
  const yilSimdi = new Date().getFullYear();
  const durum = { yil: yilSimdi, liste: [], ozet: null, duzenle: null, tarama: null };
  const kapUst = h('div'), kapAlt = h('div');

  async function yukle() {
    try {
      durum.liste = await Kopru.cagir('takvimListe', { yil: durum.yil });
      durum.ozet = await Kopru.cagir('takvimOzet', { yil: durum.yil });
      ciz();
    } catch (e) { hata(e); }
  }

  function ozet() {
    const o = durum.ozet; if (!o) return null;
    const kutu = (b, v, a) => h('div', { style: 'flex:1;min-width:150px;padding:10px 14px;border:1px solid var(--cizgi,#ccc);border-radius:8px' }, h('div', { class: 'alt' }, b), h('div', { style: 'font-size:22px;font-weight:600' }, v), a ? h('div', { class: 'alt' }, a) : null);
    return h('section', { class: 'kart' }, h('div', { class: 'satir', style: 'gap:10px' },
      kutu('Resmi tatil', takvimGunYaz(o.resmiGun)), kutu('İdari tatil', takvimGunYaz(o.idariGun)),
      kutu('Yıllık izinden kesilecek', takvimGunYaz(o.kesilenGun), 'Yalnız bilgi; iş günü olarak sayılır.')));
  }

  function yilTakvimi() {
    const olay = {};   // iso -> {tur, yarim}
    durum.liste.forEach((x) => {
      const b = new Date(x.baslangic + 'T00:00:00'), e = new Date((x.bitis || x.baslangic) + 'T00:00:00');
      for (let d = new Date(b); d <= e; d.setDate(d.getDate() + 1)) { const k = takvimIso(d); const y = x.zaman !== 'TAM'; if (!olay[k] || !y) olay[k] = { tur: x.tur, yarim: y, ad: x.ad }; }
    });
    const renk = { RESMI: '#2f6fd6', IDARI: '#e08a1e' };
    const aylar = [];
    for (let m = 0; m < 12; m++) {
      const ilk = new Date(durum.yil, m, 1), son = new Date(durum.yil, m + 1, 0).getDate();
      const basGun = (ilk.getDay() + 6) % 7;
      const hucreler = []; for (let i = 0; i < basGun; i++) hucreler.push(null);
      for (let g = 1; g <= son; g++) hucreler.push(g);
      while (hucreler.length % 7) hucreler.push(null);
      const satirlar = [];
      for (let i = 0; i < hucreler.length; i += 7) {
        const ilkG = hucreler.slice(i, i + 7).find((x) => x);
        satirlar.push(h('tr', null, h('td', { style: 'color:#888;font-size:11px;padding:1px 4px' }, takvimHafta(new Date(durum.yil, m, ilkG))),
          hucreler.slice(i, i + 7).map((g, k) => {
            if (!g) return h('td', null);
            const iso = takvimIso(new Date(durum.yil, m, g)); const o = olay[iso];
            let st = 'text-align:center;padding:2px 0;font-size:12px;';
            if (k >= 5) st += 'background:rgba(128,128,128,.15);';
            if (o && !o.yarim) st += 'background:' + renk[o.tur] + ';color:#fff;font-weight:600;';
            if (o && o.yarim) st += 'border:2px solid ' + renk[o.tur] + ';border-radius:50%;font-weight:600;';
            return h('td', { style: st, title: o ? o.ad : '' }, g);
          })));
      }
      aylar.push(h('div', { class: 'ay' }, h('div', { class: 'ayb', style: 'background:' + AY_RENK[m] }, takvimAyAd(m)),
        h('table', { style: 'width:100%;border-collapse:collapse' }, h('thead', null, h('tr', null, ['HFT', 'PT', 'S', 'Ç', 'P', 'C', 'CT', 'PZ'].map((x) => h('th', { style: 'font-size:11px;color:#888;font-weight:500' }, x)))), h('tbody', null, satirlar))));
    }
    const lej = (c, t, daire) => h('span', { style: 'margin-right:14px;white-space:nowrap' }, h('span', { style: 'display:inline-block;width:14px;height:14px;vertical-align:middle;margin-right:4px;' + (daire ? 'border:2px solid ' + c + ';border-radius:50%' : 'background:' + c) }), t);
    return h('section', { class: 'kart' }, h('div', { class: 'tk3' }, aylar),
      h('div', { class: 'alt', style: 'margin-top:8px' }, lej(renk.RESMI, 'Resmi tatil'), lej(renk.IDARI, 'Yıllık izin (idari)'), lej(renk.RESMI, 'Yarım gün', true), h('span', null, 'Gri: hafta sonu · HFT: ISO hafta no')));
  }

  function form() {
    const d = durum.duzenle;
    const kat0 = d ? takvimKategoriSatirdan(d) : 'RESMI';
    const bas = h('input', { type: 'text', class: 'metin', placeholder: 'GG.AA.YYYY', maxlength: '10', inputmode: 'numeric', value: d ? takvimTarihYaz(d.baslangic) : '', 'aria-label': 'Başlangıç' });
    const bit = h('input', { type: 'text', class: 'metin', placeholder: 'GG.AA.YYYY', maxlength: '10', inputmode: 'numeric', value: d && d.bitis !== d.baslangic ? takvimTarihYaz(d.bitis) : '', 'aria-label': 'Bitiş (boşsa tek gün)' });
    const kat = h('select', { 'aria-label': 'Tür', style: 'font-weight:600' }, [['YILLIK', 'Yıllık İzin'], ['RESMI', 'Resmi Tatil']].concat(d && kat0 === 'YARIM' ? [['YARIM', 'Yarım Gün']] : []).map(([k, a]) => h('option', { value: k, selected: k === kat0 }, a)));
    const dilim = h('select', { 'aria-label': 'Zaman dilimi' }, ['TAM', 'OO', 'OS'].map((z) => h('option', { value: z, selected: d ? d.zaman === z : z === 'TAM' }, takvimZamanAd(z))));
    const ad = h('input', { type: 'text', class: 'metin', maxlength: '200', placeholder: 'Ad (ör. Ramazan Bayramı)', value: d ? d.ad : '', 'aria-label': 'Ad', style: 'flex:1 1 180px' });
    const yil = h('input', { type: 'checkbox', checked: d ? !!d.yillik : true, id: 'tk-yillik' });
    const yilEt = h('label', { for: 'tk-yillik', class: 'onay' }, yil, ' Yıllık izinden kesilir');
    const gor = () => { yilEt.style.display = kat.value === 'YILLIK' ? '' : 'none'; };
    kat.addEventListener('change', gor); gor();
    return h('div', null, h('div', { class: 'alt', style: 'margin-bottom:6px' }, d ? '✏️ Kaydı düzenliyorsunuz: ' + takvimAralikYaz(d) : 'Yeni kayıt'),
      h('div', { class: 'satir', style: 'align-items:center;gap:8px' }, h('label', null, 'Başlangıç ', bas), h('label', null, 'Bitiş ', bit), kat, dilim, ad, yilEt,
        h('button', { class: 'ana', onclick: async () => {
          try {
            const a = takvimKategoriAlanlar(kat.value, dilim.value, d ? d.tur : 'RESMI', yil.checked);
            if (kat.value !== 'YARIM' && dilim.value !== 'TAM') a.zaman = dilim.value;   // seçilen dilim tek gün yarım gün kaydı üretir
            await Kopru.cagir('takvimKaydet', { id: d ? d.id : null, baslangic: talepTarihOku(bas.value) || '', bitis: talepTarihOku(bit.value) || '', zaman: a.zaman, tur: a.tur, ad: ad.value, yillik: a.yillik });
            toast('Kaydedildi.'); durum.duzenle = null; await yukle();
          } catch (e) { hata(e); }
        } }, d ? 'Kaydet' : 'Takvime ekle'),
        d ? h('button', { onclick: () => { durum.duzenle = null; ciz(); } }, 'Vazgeç') : null),
      h('p', { class: 'alt', style: 'margin:6px 0 0;font-size:12px' }, 'Bitiş boşsa tek gün. Yarım gün (ÖÖ/ÖS) yalnız tek günde olur. Bir kayıt tek yıl içinde ve 60 günden kısa olmalıdır.'));
  }

  // Excel/CSV/yapıştır: dosya taranır, bulunan her tarih satırı için tür SEÇTİRİLİR (Yıllık İzin / Resmi Tatil / Yarım Gün), sonra toplu eklenir.
  function toplu() {
    const alan = h('textarea', { class: 'metin', rows: '3', style: 'width:100%;font-family:Consolas,monospace', placeholder: 'ya da listeyi yapıştırın:\n08 NİSAN Pazartesi 1 gün Resmi', 'aria-label': 'Yapıştırılacak liste' });
    const dosya = h('input', { type: 'file', accept: '.csv,.txt,.xlsx', 'aria-label': 'Dosya seç' });
    const t = durum.tarama;
    const sec = async () => {
      try {
        let ok;
        if (dosya.files && dosya.files.length) {
          const o = await takvimDosyaOku(dosya.files[0]);
          ok = o.xlsx ? await Kopru.cagir('takvimXlsxOku', { base64: o.xlsx, yil: durum.yil }) : await Kopru.cagir('takvimMetinOku', { metin: o.metin, yil: durum.yil });
        } else ok = await Kopru.cagir('takvimMetinOku', { metin: alan.value, yil: durum.yil });
        if (!ok.satirlar.length) { toast('Okunacak satır bulunamadı.', 'uyari'); return; }
        if (ok.yil && ok.yil !== durum.yil) { durum.yil = ok.yil; toast('Dosyadaki yıl (' + ok.yil + ') seçildi.'); await yukle(); }
        durum.tarama = ok.satirlar.map((x) => ({ ...x, kat: takvimKategoriSatirdan(x), dilim: x.zaman === 'OS' ? 'OS' : 'OO', dahil: true, sonuc: null }));
        ciz();
      } catch (e) { hata(e); }
    };
    const donustur = () => durum.tarama.filter((x) => x.dahil).map((x) => { const a = takvimKategoriAlanlar(x.kat, x.dilim, x.tur, x.kat === 'YARIM' ? x.yillik : x.yillik !== false); return { sira: x.sira, baslangic: x.baslangic, bitis: x.kat === 'YARIM' ? x.baslangic : x.bitis, zaman: a.zaman, tur: a.tur, ad: x.ad, yillik: a.yillik }; });
    const govde = h('div', null,
      h('div', { class: 'satir', style: 'align-items:center' }, dosya, h('button', { class: 'ana', onclick: sec }, 'Dosyayı tara')), alan);
    if (t) {
      const toplu = h('select', { 'aria-label': 'Hepsine uygula', onchange: (e) => { if (!e.target.value) return; t.forEach((x) => { x.kat = e.target.value; x.sonuc = null; }); ciz(); } },
        h('option', { value: '' }, 'Hepsini şuna çevir…'), TAKVIM_KATEGORI.map(([k, a]) => h('option', { value: k }, a)));
      const hatali = t.some((x) => x.dahil && x.sonuc && x.sonuc.durum === 'HATA');
      const hazir = t.some((x) => x.dahil && x.sonuc);
      govde.append(h('div', { style: 'margin-top:10px' },
        h('div', { class: 'satir', style: 'align-items:center;margin-bottom:6px' }, h('strong', null, t.length + ' tarih bulundu — her biri için türü seçin'), toplu),
        h('div', { class: 'kaydir', style: 'max-height:300px;overflow:auto' }, h('table', { style: 'min-width:640px' },
          h('thead', null, h('tr', null, ['Ekle', 'Tarih', 'Ad', 'Tür', 'Sonuç'].map((x) => h('th', null, x)))),
          h('tbody', null, t.map((x) => h('tr', null,
            h('td', null, h('input', { type: 'checkbox', checked: x.dahil, 'aria-label': 'Ekle', onchange: (e) => { x.dahil = e.target.checked; x.sonuc = null; ciz(); } })),
            h('td', null, takvimAralikYaz(x)), h('td', null, x.ad),
            h('td', { style: 'white-space:nowrap' },
              h('select', { 'aria-label': 'Tür', onchange: (e) => { x.kat = e.target.value; x.sonuc = null; ciz(); } }, TAKVIM_KATEGORI.map(([k, a]) => h('option', { value: k, selected: x.kat === k }, a))),
              x.kat === 'YARIM' ? h('select', { 'aria-label': 'Yarım gün dilimi', onchange: (e) => { x.dilim = e.target.value; x.sonuc = null; } }, ['OO', 'OS'].map((z) => h('option', { value: z, selected: x.dilim === z }, z === 'OO' ? 'ÖÖ' : 'ÖS'))) : null),
            h('td', null, x.sonuc ? (x.sonuc.durum === 'HATA' ? h('span', { style: 'color:var(--kotu)' }, x.sonuc.hata) : rozet(x.sonuc.durum === 'YENI' ? 'Yeni' : x.sonuc.durum === 'GUNCELLE' ? 'Güncellenecek' : 'Aynı', x.sonuc.durum === 'YENI' ? 'iyi' : 'bilgi')) : '-')))))),
        h('div', { class: 'satir', style: 'margin-top:8px' },
          h('button', { onclick: async () => {
            try { const s = donustur(); const o = await Kopru.cagir('takvimOnizle', { satirlar: s }); let i = 0; t.forEach((x) => { x.sonuc = x.dahil ? o[i++] : null; }); ciz(); } catch (e) { hata(e); }
          } }, 'Doğrula'),
          h('button', { class: 'ana', disabled: !hazir || hatali, onclick: async () => {
            try { const r = await Kopru.cagir('takvimUygula', { satirlar: donustur() }); toast('Eklendi: ' + r.eklenen + ' yeni, ' + r.guncellenen + ' güncellendi.'); durum.tarama = null; await yukle(); } catch (e) { hata(e); }
          } }, 'Seçilenleri takvime ekle'),
          h('button', { onclick: () => { durum.tarama = null; ciz(); } }, 'Vazgeç'))));
    }
    return h('div', { style: 'margin-top:14px;border-top:1px solid var(--cizgi);padding-top:10px' },
      h('div', { class: 'alt', style: 'margin-bottom:6px' }, 'Excel (.xlsx) / CSV ile toplu ekleme: dosya taranır, bulunan tarihler listelenir; türü siz seçersiniz.'), govde);
  }

  function kayitlar() {
    return h('div', { style: 'margin-top:14px;border-top:1px solid var(--cizgi);padding-top:10px' },
      h('div', { style: 'margin-bottom:6px' }, h('strong', null, 'Kayıtlar (' + durum.yil + ')')),
      h('div', { class: 'kaydir', style: 'max-height:260px;overflow:auto' }, h('table', { style: 'min-width:560px' }, h('thead', null, h('tr', null, ['Tarih', 'Tür', 'Ad', 'Yıllık izinden', ''].map((x) => h('th', null, x)))),
        h('tbody', null, durum.liste.length ? durum.liste.map((x) => h('tr', null,
          h('td', null, takvimAralikYaz(x) + (x.zaman !== 'TAM' ? ' (' + (x.zaman === 'OO' ? 'ÖÖ' : 'ÖS') + ')' : '')),
          h('td', null, x.zaman !== 'TAM' ? 'Yarım gün' : x.tur === 'RESMI' ? 'Resmi tatil' : 'Yıllık izin'), h('td', null, x.ad),
          h('td', null, x.yillik ? 'Kesilir (' + takvimGunYaz(x.kesilen) + ')' : '-'),
          h('td', { style: 'white-space:nowrap' },
            h('button', { onclick: () => { durum.duzenle = x; ciz(); } }, 'Düzenle'),
            h('button', { style: 'color:var(--kotu)', onclick: async () => { try { await Kopru.cagir('takvimSil', { id: x.id }); toast('Silindi.'); await yukle(); } catch (e) { hata(e); } } }, 'Sil'))))
          : h('tr', null, h('td', { colspan: '5', class: 'alt' }, durum.yil + ' için kayıt yok.'))))));
  }

  // Yıl takviminin altında tatil/kapalı gün ayrıntıları (salt okunur; düzenleme yönetim penceresinde).
  function detay() {
    const nokta = (r) => h('span', { style: 'display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:6px;background:' + r });
    return h('section', { class: 'kart' }, h('h2', { style: 'margin:0 0 8px' }, 'Tatil ve Kapalı Gün Ayrıntıları (' + durum.yil + ')'),
      h('div', { class: 'kaydir' }, h('table', { style: 'min-width:560px' },
        h('thead', null, h('tr', null, ['Tarih', 'Tür', 'Ad', 'Yıllık izinden'].map((x) => h('th', null, x)))),
        h('tbody', null, durum.liste.length ? durum.liste.map((x) => h('tr', null,
          h('td', null, takvimAralikYaz(x) + (x.zaman !== 'TAM' ? ' (' + (x.zaman === 'OO' ? 'ÖÖ' : 'ÖS') + ')' : '')),
          h('td', null, nokta(x.tur === 'RESMI' ? '#2f6fd6' : '#e08a1e'), x.zaman !== 'TAM' ? 'Yarım gün' : x.tur === 'RESMI' ? 'Resmi tatil' : 'Yıllık izin'),
          h('td', null, x.ad), h('td', null, x.yillik ? 'Kesilir (' + takvimGunYaz(x.kesilen) + ')' : '-')))
          : h('tr', null, h('td', { colspan: '4', class: 'alt' }, durum.yil + ' için kayıt yok.'))))));
  }

  function ciz() {
    const yillar = []; for (let y = yilSimdi - 2; y <= yilSimdi + 3; y++) yillar.push(y);
    if (!yillar.includes(durum.yil)) yillar.push(durum.yil);
    yillar.sort();
    const sec = h('select', { 'aria-label': 'Yıl', onchange: (e) => { durum.yil = Number(e.target.value); durum.tarama = null; yukle(); } }, yillar.map((y) => h('option', { value: y, selected: y === durum.yil }, y)));
    kapUst.replaceChildren(form(), kayitlar(), toplu());
    const bar = h('div', { class: 'takbar' }, h('div', { class: 'araccubuk' }, h('label', null, 'Yıl', sec)),
      h('button', { type: 'button', class: 'yonet', onclick: () => pencereAc('Akademik Tatil ve Resmi Tatil Yönetimi', kapUst) }, 'AKADEMİK TATİL VE RESMİ TATİL YÖNETİMİ'));
    kapAlt.replaceChildren(bar, ozet(), yilTakvimi(), detay());
    if (durum.duzenle) {   // düzenleme formu pencerenin üstünde kalır: görünür kıl
      const fk = kapUst.firstChild;
      if (fk) { fk.style.cssText += ';border:2px solid var(--vurgu);border-radius:8px;padding:10px;background:var(--vurgu-bg)'; requestAnimationFrame(() => { try { fk.scrollIntoView({ block: 'start' }); } catch (e) { /* eski WebView */ } }); }
    }
  }

  await yukle();
  return { ust: kapUst, alt: kapAlt };
}
