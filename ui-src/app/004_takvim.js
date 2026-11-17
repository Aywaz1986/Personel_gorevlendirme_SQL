// Akademik takvim: tatil / kapalı gün (yalnız Merkez Yönetici düzenler). Kurallar sunucudadır.
function takvimTarihYaz(iso) { const p = String(iso).split('-'); return p.length === 3 ? p[2] + '.' + p[1] + '.' + p[0] : String(iso); }
function takvimGun(iso) { const d = new Date(iso + 'T00:00:00'); return isNaN(d) ? '' : d.toLocaleDateString('tr-TR', { weekday: 'long' }); }
function takvimZamanAd(z) { return z === 'TAM' ? 'Tüm gün' : z === 'OO' ? 'Öğleden önce (ÖÖ)' : z === 'OS' ? 'Öğleden sonra (ÖS)' : z; }
function takvimTurAd(t) { return t === 'RESMI' ? 'Resmi tatil' : t === 'AKADEMIK' ? 'Akademik' : t === 'IDARI' ? 'İdari' : t; }

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
  const durum = { yil: yilSimdi, liste: [], duzenle: null, onizleme: null, satirlar: null };
  const kap = h('div');

  async function yukle() { try { durum.liste = await Kopru.cagir('takvimListe', { yil: durum.yil }); ciz(); } catch (e) { hata(e); } }

  function form() {
    const d = durum.duzenle;
    const tarihGir = h('input', { type: 'date', class: 'metin', value: d ? d.tarih : '', 'aria-label': 'Tarih' });
    const zaman = h('select', { 'aria-label': 'Zaman dilimi' }, ['TAM', 'OO', 'OS'].map((z) => h('option', { value: z, selected: d ? d.zaman === z : z === 'TAM' }, takvimZamanAd(z))));
    const tur = h('select', { 'aria-label': 'Tür' }, ['RESMI', 'AKADEMIK', 'IDARI'].map((t) => h('option', { value: t, selected: d ? d.tur === t : t === 'RESMI' }, takvimTurAd(t))));
    const ad = h('input', { type: 'text', class: 'metin', maxlength: '200', placeholder: 'Ad (ör. Cumhuriyet Bayramı)', value: d ? d.ad : '', 'aria-label': 'Ad' });
    return h('section', { class: 'kart' }, h('h2', null, d ? 'Kaydı düzenle' : 'Yeni tatil / kapalı gün'),
      h('div', { class: 'satir' }, tarihGir, zaman, tur, ad,
        h('button', { class: 'ana', onclick: async () => {
          try { await Kopru.cagir('takvimKaydet', { id: d ? d.id : null, tarih: tarihGir.value, zaman: zaman.value, tur: tur.value, ad: ad.value }); toast('Kaydedildi.'); durum.duzenle = null; await yukle(); } catch (e) { hata(e); }
        } }, 'Kaydet'),
        d ? h('button', { onclick: () => { durum.duzenle = null; ciz(); } }, 'Vazgeç') : null));
  }

  function toplu() {
    const alan = h('textarea', { class: 'metin', rows: '6', style: 'width:100%;font-family:Consolas,monospace', placeholder: 'Excel\'den kopyalayıp yapıştırın ya da dosya seçin.\nTarih; Ad; Zaman dilimi; Tür   (son ikisi isteğe bağlı: boşsa Tüm gün, Resmi tatil)\n29.10.2026; Cumhuriyet Bayramı\n28.10.2026; Arife; ÖS; Resmi', 'aria-label': 'Yapıştırılan satırlar' });
    const dosya = h('input', { type: 'file', accept: '.csv,.txt,.xlsx', 'aria-label': 'Dosya seç' });
    const onizle = h('button', { class: 'ana', onclick: async () => {
      try {
        let satirlar;
        if (dosya.files && dosya.files.length) {
          const o = await takvimDosyaOku(dosya.files[0]);
          satirlar = o.xlsx ? await Kopru.cagir('takvimXlsxOku', { base64: o.xlsx }) : await Kopru.cagir('takvimMetinOku', { metin: o.metin });
        } else satirlar = await Kopru.cagir('takvimMetinOku', { metin: alan.value });
        if (!satirlar.length) { toast('Okunacak satır bulunamadı.', 'uyari'); return; }
        durum.satirlar = satirlar; durum.onizleme = await Kopru.cagir('takvimOnizle', { satirlar }); ciz();
      } catch (e) { hata(e); }
    } }, 'Önizle');
    const o = durum.onizleme;
    const sayi = (d) => o ? o.filter((x) => x.durum === d).length : 0;
    const hatali = sayi('HATA');
    return h('section', { class: 'kart' }, h('h2', null, 'Toplu yükleme (CSV, .xlsx ya da yapıştır)'),
      h('p', { class: 'alt', style: 'margin:0 0 8px' }, 'Hiçbir şey yazılmadan önce önizleme gösterilir. Hatalı satır varsa hiçbiri uygulanmaz.'),
      alan, h('div', { class: 'satir', style: 'margin-top:8px;align-items:center' }, dosya, onizle),
      o ? h('div', { style: 'margin-top:12px' },
        h('div', { class: 'satir', style: 'margin-bottom:8px;align-items:center' }, rozet('Yeni ' + sayi('YENI'), 'iyi'), rozet('Güncellenecek ' + sayi('GUNCELLE'), 'bilgi'), rozet('Aynı ' + sayi('AYNI'), 'bilgi'), hatali ? rozet('Hatalı ' + hatali, 'kotu') : null,
          h('button', { class: 'ana', disabled: hatali > 0 || sayi('YENI') + sayi('GUNCELLE') === 0, onclick: async () => {
            try { const r = await Kopru.cagir('takvimUygula', { satirlar: durum.satirlar }); toast('Uygulandı: ' + r.eklenen + ' eklendi, ' + r.guncellenen + ' güncellendi.'); durum.onizleme = null; durum.satirlar = null; await yukle(); } catch (e) { hata(e); }
          } }, 'Uygula')),
        h('div', { class: 'kaydir' }, h('table', { style: 'min-width:640px' }, h('thead', null, h('tr', null, ['Satır', 'Tarih', 'Zaman', 'Tür', 'Ad', 'Durum'].map((x) => h('th', null, x)))),
          h('tbody', null, o.map((x) => h('tr', null, h('td', null, x.sira), h('td', null, x.tarih ? takvimTarihYaz(x.tarih) : '-'), h('td', null, x.zaman || '-'), h('td', null, x.tur || '-'), h('td', null, x.ad || '-'),
            h('td', null, x.durum === 'HATA' ? h('span', { style: 'color:var(--kotu)' }, x.hata) : rozet(x.durum === 'YENI' ? 'Yeni' : x.durum === 'GUNCELLE' ? 'Güncellenecek' : 'Aynı', x.durum === 'YENI' ? 'iyi' : 'bilgi'))))))) ) : null);
  }

  function ciz() {
    const yillar = []; for (let y = yilSimdi - 2; y <= yilSimdi + 3; y++) yillar.push(y);
    const sec = h('select', { 'aria-label': 'Yıl', onchange: (e) => { durum.yil = Number(e.target.value); yukle(); } }, yillar.map((y) => h('option', { value: y, selected: y === durum.yil }, y)));
    kap.replaceChildren(form(), toplu(),
      h('section', { class: 'kart' },
        h('div', { class: 'satir', style: 'justify-content:space-between;align-items:center;margin-bottom:10px' }, h('strong', null, 'Kayıtlar'), h('div', { class: 'satir', style: 'align-items:center' }, 'Yıl:', sec)),
        h('div', { class: 'kaydir' }, h('table', { style: 'min-width:640px' }, h('thead', null, h('tr', null, ['Tarih', 'Gün', 'Zaman', 'Tür', 'Ad', ''].map((x) => h('th', null, x)))),
          h('tbody', null, durum.liste.length ? durum.liste.map((x) => h('tr', null, h('td', null, takvimTarihYaz(x.tarih)), h('td', null, takvimGun(x.tarih)), h('td', null, takvimZamanAd(x.zaman)), h('td', null, takvimTurAd(x.tur)), h('td', null, x.ad),
            h('td', { style: 'white-space:nowrap' },
              h('button', { onclick: () => { durum.duzenle = x; ciz(); window.scrollTo(0, 0); } }, 'Düzenle'),
              h('button', { style: 'color:var(--kotu)', onclick: async () => { try { await Kopru.cagir('takvimSil', { id: x.id }); toast('Silindi.'); await yukle(); } catch (e) { hata(e); } } }, 'Sil'))))
            : h('tr', null, h('td', { colspan: '6', class: 'alt' }, durum.yil + ' için kayıt yok.')))))));
  }

  await yukle();
  return h('div', { class: 'icerik', style: 'padding:0' },
    h('div', null, h('h1', null, 'Akademik takvim'),
      h('p', { class: 'alt' }, 'Resmi tatil, akademik kapalı gün ve idari izin günleri. Tatil gününe atama engellenmez; yönetici atama yaparken uyarı görür (Dilim 5). Aynı tarihte "Tüm gün" ile yarım gün birlikte olamaz.')),
    kap);
}
