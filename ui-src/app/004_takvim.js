// Akademik takvim: tatil / kapalı gün (yalnız Merkez Yönetici düzenler). Kurallar sunucudadır.
function takvimTarihYaz(iso) { const p = String(iso).split('-'); return p.length === 3 ? p[2] + '.' + p[1] + '.' + p[0] : String(iso); }
function takvimGun(iso) { const d = new Date(iso + 'T00:00:00'); return isNaN(d) ? '' : d.toLocaleDateString('tr-TR', { weekday: 'long' }); }
function takvimZamanAd(z) { return z === 'TAM' ? 'Tüm gün' : z === 'OO' ? 'Öğleden önce (ÖÖ)' : z === 'OS' ? 'Öğleden sonra (ÖS)' : z; }
function takvimTurAd(t) { return t === 'RESMI' ? 'Resmi tatil' : t === 'IDARI' ? 'İdari tatil' : t; }
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
  const durum = { yil: yilSimdi, liste: [], ozet: null, duzenle: null, onizleme: null, satirlar: null };
  const kap = h('div');

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
      aylar.push(h('div', { style: 'flex:1 1 220px;min-width:210px' }, h('div', { style: 'font-weight:600;text-align:center;margin-bottom:2px' }, takvimAyAd(m)),
        h('table', { style: 'width:100%;border-collapse:collapse' }, h('thead', null, h('tr', null, ['HFT', 'PT', 'S', 'Ç', 'P', 'C', 'CT', 'PZ'].map((x) => h('th', { style: 'font-size:11px;color:#888;font-weight:500' }, x)))), h('tbody', null, satirlar))));
    }
    const lej = (c, t, daire) => h('span', { style: 'margin-right:14px;white-space:nowrap' }, h('span', { style: 'display:inline-block;width:14px;height:14px;vertical-align:middle;margin-right:4px;' + (daire ? 'border:2px solid ' + c + ';border-radius:50%' : 'background:' + c) }), t);
    return h('section', { class: 'kart' }, h('div', { class: 'satir', style: 'gap:18px;align-items:flex-start' }, aylar),
      h('div', { class: 'alt', style: 'margin-top:8px' }, lej(renk.RESMI, 'Resmi tatil'), lej(renk.IDARI, 'İdari tatil'), lej(renk.RESMI, 'Yarım gün', true), h('span', null, 'Gri: hafta sonu · HFT: ISO hafta no')));
  }

  function form() {
    const d = durum.duzenle;
    const bas = h('input', { type: 'date', class: 'metin', value: d ? d.baslangic : '', 'aria-label': 'Başlangıç' });
    const bit = h('input', { type: 'date', class: 'metin', value: d && d.bitis !== d.baslangic ? d.bitis : '', 'aria-label': 'Bitiş (boşsa tek gün)' });
    const zaman = h('select', { 'aria-label': 'Zaman dilimi' }, ['TAM', 'OO', 'OS'].map((z) => h('option', { value: z, selected: d ? d.zaman === z : z === 'TAM' }, takvimZamanAd(z))));
    const tur = h('select', { 'aria-label': 'Tür' }, ['RESMI', 'IDARI'].map((t) => h('option', { value: t, selected: d ? d.tur === t : t === 'RESMI' }, takvimTurAd(t))));
    const ad = h('input', { type: 'text', class: 'metin', maxlength: '200', placeholder: 'Ad (ör. Ramazan Bayramı)', value: d ? d.ad : '', 'aria-label': 'Ad' });
    const yil = h('input', { type: 'checkbox', checked: d ? !!d.yillik : false, id: 'tk-yillik' });
    return h('section', { class: 'kart' }, h('h2', null, d ? 'Kaydı düzenle' : 'Yeni tatil / kapalı gün'),
      h('div', { class: 'satir', style: 'align-items:center' }, h('label', null, 'Başlangıç ', bas), h('label', null, 'Bitiş ', bit), zaman, tur, ad,
        h('label', { for: 'tk-yillik' }, yil, ' Yıllık izinden kesilir'),
        h('button', { class: 'ana', onclick: async () => {
          try { await Kopru.cagir('takvimKaydet', { id: d ? d.id : null, baslangic: bas.value, bitis: bit.value, zaman: zaman.value, tur: tur.value, ad: ad.value, yillik: yil.checked }); toast('Kaydedildi.'); durum.duzenle = null; await yukle(); } catch (e) { hata(e); }
        } }, 'Kaydet'),
        d ? h('button', { onclick: () => { durum.duzenle = null; ciz(); } }, 'Vazgeç') : null),
      h('p', { class: 'alt', style: 'margin:6px 0 0' }, 'Bitiş boşsa tek gün. Yarım gün (ÖÖ/ÖS) yalnız tek günde olur. Bir kayıt tek yıl içinde ve 60 günden kısa olmalıdır.'));
  }

  function toplu() {
    const alan = h('textarea', { class: 'metin', rows: '6', style: 'width:100%;font-family:Consolas,monospace', placeholder: 'Standart takvim dosyasını (.xlsx) seçin ya da listeyi yapıştırın:\n08 NİSAN Pazartesi / 1 Gün (YILLIK İZİNDEN KESİLECEK)\n10-11-12 NİSAN Çarşamba-Perşembe-Cuma / 3 Gün Ramazan Bayramı\n\nveya sütunlu: Başlangıç; Bitiş; Ad; Tür; Zaman dilimi; Yıllık', 'aria-label': 'Yapıştırılan satırlar' });
    const dosya = h('input', { type: 'file', accept: '.csv,.txt,.xlsx', 'aria-label': 'Dosya seç' });
    const onizle = h('button', { class: 'ana', onclick: async () => {
      try {
        let ok;
        if (dosya.files && dosya.files.length) {
          const o = await takvimDosyaOku(dosya.files[0]);
          ok = o.xlsx ? await Kopru.cagir('takvimXlsxOku', { base64: o.xlsx, yil: durum.yil }) : await Kopru.cagir('takvimMetinOku', { metin: o.metin, yil: durum.yil });
        } else ok = await Kopru.cagir('takvimMetinOku', { metin: alan.value, yil: durum.yil });
        if (!ok.satirlar.length) { toast('Okunacak satır bulunamadı.', 'uyari'); return; }
        if (ok.yil && ok.yil !== durum.yil) { durum.yil = ok.yil; toast('Dosyadaki yıl (' + ok.yil + ') seçildi.'); }
        durum.satirlar = ok.satirlar; durum.onizleme = await Kopru.cagir('takvimOnizle', { satirlar: ok.satirlar });
        await yukle();
      } catch (e) { hata(e); }
    } }, 'Önizle');
    const o = durum.onizleme;
    const sayi = (d) => o ? o.filter((x) => x.durum === d).length : 0;
    const hatali = sayi('HATA');
    return h('section', { class: 'kart' }, h('h2', null, 'Toplu yükleme (standart takvim .xlsx, CSV ya da yapıştır)'),
      h('p', { class: 'alt', style: 'margin:0 0 8px' }, 'Hiçbir şey yazılmadan önce önizleme gösterilir. Hatalı satır varsa hiçbiri uygulanmaz.'),
      alan, h('div', { class: 'satir', style: 'margin-top:8px;align-items:center' }, dosya, onizle),
      o ? h('div', { style: 'margin-top:12px' },
        h('div', { class: 'satir', style: 'margin-bottom:8px;align-items:center' }, rozet('Yeni ' + sayi('YENI'), 'iyi'), rozet('Güncellenecek ' + sayi('GUNCELLE'), 'bilgi'), rozet('Aynı ' + sayi('AYNI'), 'bilgi'), hatali ? rozet('Hatalı ' + hatali, 'kotu') : null,
          h('button', { class: 'ana', disabled: hatali > 0 || sayi('YENI') + sayi('GUNCELLE') === 0, onclick: async () => {
            try { const r = await Kopru.cagir('takvimUygula', { satirlar: durum.satirlar }); toast('Uygulandı: ' + r.eklenen + ' eklendi, ' + r.guncellenen + ' güncellendi.'); durum.onizleme = null; durum.satirlar = null; await yukle(); } catch (e) { hata(e); }
          } }, 'Uygula')),
        h('div', { class: 'kaydir' }, h('table', { style: 'min-width:720px' }, h('thead', null, h('tr', null, ['Satır', 'Başlangıç', 'Bitiş', 'Gün', 'Dilim', 'Tür', 'Ad', 'Yıllık', 'Durum'].map((x) => h('th', null, x)))),
          h('tbody', null, o.map((x) => h('tr', null, h('td', null, x.sira), h('td', null, x.baslangic ? takvimTarihYaz(x.baslangic) : '-'), h('td', null, x.bitis && x.bitis !== x.baslangic ? takvimTarihYaz(x.bitis) : ''), h('td', null, x.gun == null ? '' : takvimGunYaz(x.gun)), h('td', null, x.zaman || '-'), h('td', null, x.tur || '-'), h('td', null, x.ad || '-'), h('td', null, x.yillik ? 'Evet' : ''),
            h('td', null, x.durum === 'HATA' ? h('span', { style: 'color:var(--kotu)' }, x.hata) : rozet(x.durum === 'YENI' ? 'Yeni' : x.durum === 'GUNCELLE' ? 'Güncellenecek' : 'Aynı', x.durum === 'YENI' ? 'iyi' : 'bilgi'))))))) ) : null);
  }

  function ciz() {
    const yillar = []; for (let y = yilSimdi - 2; y <= yilSimdi + 3; y++) yillar.push(y);
    if (!yillar.includes(durum.yil)) yillar.push(durum.yil);
    yillar.sort();
    const sec = h('select', { 'aria-label': 'Yıl', onchange: (e) => { durum.yil = Number(e.target.value); durum.onizleme = null; yukle(); } }, yillar.map((y) => h('option', { value: y, selected: y === durum.yil }, y)));
    kap.replaceChildren(h('div', { class: 'satir', style: 'align-items:center;margin-bottom:8px' }, 'Yıl:', sec), ozet(), yilTakvimi(),
      h('section', { class: 'kart' }, h('div', { style: 'margin-bottom:10px' }, h('strong', null, 'Kayıtlar')),
        h('div', { class: 'kaydir' }, h('table', { style: 'min-width:720px' }, h('thead', null, h('tr', null, ['Tarih', 'Gün', 'Dilim', 'Tür', 'Ad', 'Yıllık izinden', ''].map((x) => h('th', null, x)))),
          h('tbody', null, durum.liste.length ? durum.liste.map((x) => h('tr', null, h('td', null, takvimAralikYaz(x)), h('td', null, takvimGunYaz(x.gun)), h('td', null, takvimZamanAd(x.zaman)), h('td', null, takvimTurAd(x.tur)), h('td', null, x.ad),
            h('td', null, x.yillik ? 'Kesilir (' + takvimGunYaz(x.kesilen) + ')' : '-'),
            h('td', { style: 'white-space:nowrap' },
              h('button', { onclick: () => { durum.duzenle = x; ciz(); window.scrollTo(0, 0); } }, 'Düzenle'),
              h('button', { style: 'color:var(--kotu)', onclick: async () => { try { await Kopru.cagir('takvimSil', { id: x.id }); toast('Silindi.'); await yukle(); } catch (e) { hata(e); } } }, 'Sil'))))
            : h('tr', null, h('td', { colspan: '7', class: 'alt' }, durum.yil + ' için kayıt yok.')))))),
      form(), toplu());
  }

  await yukle();
  return h('div', { class: 'icerik', style: 'padding:0' },
    h('div', null, h('h1', null, 'Akademik takvim'),
      h('p', { class: 'alt' }, 'Resmi ve idari tatil günleri (tek gün ya da aralık, yarım gün dahil). Tatil gününe atama engellenmez; yönetici atama yaparken uyarı görür (Dilim 5). "Yıllık izinden kesilir" işareti yalnız bilgi amaçlıdır.')),
    kap);
}
