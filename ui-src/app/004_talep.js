// Görev talebi (Proje Sorumlusu; Yönetici vekâleten): Taleplerim listesi + talep formu. Kurallar ve yetki sunucudadır.
function talepDurumAd(d) {
  return { TASLAK: 'Taslak', ONAY_BEKLIYOR: 'Onay bekliyor', KISMEN_ATANDI: 'Kısmen atandı', TAMAMEN_ATANDI: 'Tamamen atandı', REDDEDILDI: 'Reddedildi', GERI_CEKILDI: 'Geri çekildi', IPTAL: 'İptal' }[d] || d;
}
function talepDurumTur(d) {
  return { TASLAK: 'bilgi', ONAY_BEKLIYOR: 'uyari', KISMEN_ATANDI: 'bilgi', TAMAMEN_ATANDI: 'iyi', REDDEDILDI: 'kotu', GERI_CEKILDI: 'bilgi', IPTAL: 'kotu' }[d] || 'bilgi';
}
function talepDegistirilebilir(d) { return d === 'TASLAK' || d === 'ONAY_BEKLIYOR'; }
function talepNorm(s) { return String(s || '').trim().toLocaleLowerCase('tr-TR'); }
function talepAralik(x) { return x.ilkTarih === x.sonTarih ? takvimTarihYaz(x.ilkTarih) : takvimTarihYaz(x.ilkTarih) + ' – ' + takvimTarihYaz(x.sonTarih); }
function talepTarihOzet(gunler) {
  const ay = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const t = [...new Set(gunler.map((g) => g.tarih))].sort();
  if (!t.length) return '—';
  const a = t[0].split('-').map(Number), b = t[t.length - 1].split('-').map(Number);
  const aralik = t.length === 1 || t[0] === t[t.length - 1] ? a[2] + ' ' + ay[a[1] - 1] + ' ' + a[0]
    : a[0] === b[0] && a[1] === b[1] ? a[2] + '-' + b[2] + ' ' + ay[a[1] - 1] + ' ' + a[0]
    : a[0] === b[0] ? a[2] + ' ' + ay[a[1] - 1] + ' – ' + b[2] + ' ' + ay[b[1] - 1] + ' ' + a[0]
    : a[2] + ' ' + ay[a[1] - 1] + ' ' + a[0] + ' – ' + b[2] + ' ' + ay[b[1] - 1] + ' ' + b[0];
  return aralik + ' - ' + t.length + ' gün';
}
function talepKisiGun(n) { return String(n).replace('.', ',') + ' kişi-gün'; }

// Personel arama kutusu (en az 2 harf); seçilince onSec({sicil, ad}) çağrılır.
function talepPersonelAra(yer, onSec) {
  const sonuc = h('div', { class: 'satir', style: 'margin-top:6px' });
  let zm = 0;
  const kutu = h('input', { type: 'search', class: 'metin', placeholder: yer, 'aria-label': yer, style: 'min-width:260px' });
  kutu.addEventListener('input', () => {
    clearTimeout(zm);
    zm = setTimeout(async () => {
      if (kutu.value.trim().length < 2) { sonuc.replaceChildren(); return; }
      try {
        const l = await Kopru.cagir('personelAra', { q: kutu.value });
        sonuc.replaceChildren(...(l.length ? l.map((p) => h('button', { type: 'button', title: p.bolum || '', onclick: () => { sonuc.replaceChildren(); kutu.value = ''; onSec(p); } }, p.ad + ' (' + p.sicil + ')'))
          : [h('span', { class: 'alt' }, 'Eşleşen personel yok.')]));
      } catch (e) { hata(e); }
    }, 250);
  });
  return h('div', null, kutu, sonuc);
}

function talepGunleriUret(bas, bit, kisi, tatiller) {
  const gunler = [], atlanan = [];
  const b = new Date(bas + 'T00:00:00'), e = new Date(bit + 'T00:00:00');
  for (let d = new Date(b); d <= e; d.setDate(d.getDate() + 1)) {
    const iso = takvimIso(d);
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    const t = tatiller.find((x) => x.zaman === 'TAM' && x.baslangic <= iso && (x.bitis || x.baslangic) >= iso);
    if (t) { atlanan.push(takvimTarihYaz(iso) + ' (' + t.ad + ')'); continue; }
    gunler.push({ tarih: iso, zaman: 'TAM', kisi });
  }
  return { gunler, atlanan };
}

function talepTarihOku(s) {
  const m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(String(s).trim());
  if (!m) return '';
  const g = +m[1], a = +m[2], y = +m[3], d = new Date(y, a - 1, g);
  if (d.getFullYear() !== y || d.getMonth() !== a - 1 || d.getDate() !== g) return '';
  return y + '-' + String(a).padStart(2, '0') + '-' + String(g).padStart(2, '0');
}

async function talepSayfa() {
  const yonetici = S.gorunum === 'YONETICI';
  const durum = { gorunum: 'liste', filtre: '', liste: [], havuz: [], tatiller: [], f: null, bildirim: [], atama: null, atananAcik: {} };
  const kap = h('div', { style: 'display:flex;flex-direction:column;gap:14px' });

  async function yukle() {
    try { durum.liste = await Kopru.cagir('talepListe', {}); durum.bildirim = await Kopru.cagir('bildirimListe', {}); ciz(); } catch (e) { hata(e); }
  }

  async function formAc(t, kopya) {
    try {
      if (!durum.havuz.length) durum.havuz = await Kopru.cagir('havuzListe', {});
      const yil = new Date().getFullYear();
      durum.tatiller = [];
      for (const y of [yil, yil + 1]) { try { durum.tatiller = durum.tatiller.concat(await Kopru.cagir('takvimListe', { yil: y })); } catch (e) { /* takvim yoksa devam */ } }
      const gunler = t ? t.gunler.map((g) => ({ tarih: g.tarih, zaman: g.zaman, kisi: g.kisi })) : [];
      const tar = gunler.map((g) => g.tarih).sort();
      durum.f = {
        id: t && !kopya ? t.id : null, kod: t && !kopya ? t.kod : null,
        sorumlu: t && !kopya && yonetici ? { sicil: t.sorumluSicil, ad: t.sorumluAdi } : null,
        ana: t ? t.ana : '', alt: t && t.alt !== 'Genel' ? t.alt : '', faaliyet: t ? t.faaliyet : '', konum: t ? t.konum : '',
        sb: t ? t.saatBaslangic : '07:30', sbt: t ? t.saatBitis : '16:35', metin: t ? t.gorevMetni : '', nitelik: t && t.nitelik ? t.nitelik : '',
        bas: t && !kopya && tar.length ? tar[0] : '', bit: t && !kopya && tar.length ? tar[tar.length - 1] : '', kisi: 1,
        gunler: kopya ? [] : gunler, oneri: t ? t.oneri.map((o) => ({ sicil: o.sicil, ad: o.ad })) : [],
        not: '',
      };
      durum.gorunum = 'form'; ciz();
    } catch (e) { hata(e); }
  }

  async function atamaAc(id) {
    try { durum.atama = await atamaPaneli(id, async (yenile) => { durum.atama = null; durum.gorunum = 'liste'; if (yenile) await yukle(); else ciz(); }); durum.gorunum = 'atama'; ciz(); } catch (e) { hata(e); }
  }
  async function yonetAc(id) {
    try { durum.atama = await talepYonetPaneli(id, async (yenile) => { durum.atama = null; durum.gorunum = 'liste'; if (yenile) await yukle(); else ciz(); }); durum.gorunum = 'atama'; ciz(); } catch (e) { hata(e); }
  }
  function atananBlok(t) {
    const satirlar = t.gunler.filter((g) => g.atananlar && g.atananlar.length).map((g) => h('div', { class: 'alt' }, takvimTarihYaz(g.tarih) + ' ' + takvimGun(g.tarih) + ' · ' + atamaTamAd(g.zaman) + ': ' + g.atananlar.map((a) => a.ad).join(', ')));
    return h('div', { style: 'margin-top:6px;padding:8px 10px;background:var(--vurgu-bg);border-radius:8px' }, h('b', { style: 'font-size:13px' }, 'Atananlar'), satirlar);
  }
  function bildirimBandi() {
    if (!durum.bildirim.length) return null;
    return h('section', { class: 'mesaj bilgi', style: 'margin:0' },
      h('div', { class: 'satir', style: 'align-items:center' }, h('b', null, durum.bildirim.length + ' yeni bildirim'), h('span', { style: 'flex:1' }),
        h('button', { type: 'button', onclick: async () => { try { await Kopru.cagir('bildirimOkundu', {}); durum.bildirim = []; ciz(); } catch (e) { hata(e); } } }, 'Tümünü okundu say')),
      h('ul', { style: 'margin:6px 0 0;padding-left:18px' }, durum.bildirim.map((b) => h('li', null, b.mesaj + ' ', h('span', { class: 'alt', style: 'color:inherit;opacity:.8' }, b.tarih)))));
  }

  function liste() {
    const f = durum.filtre;
    const goster = durum.liste.filter((x) => !f || (f === 'BEKLEYEN' ? ['TASLAK', 'ONAY_BEKLIYOR'].includes(x.durum) : f === 'ATANMIS' ? ['KISMEN_ATANDI', 'TAMAMEN_ATANDI'].includes(x.durum) : ['REDDEDILDI', 'GERI_CEKILDI', 'IPTAL'].includes(x.durum)));
    const sayi = (fn) => durum.liste.filter(fn).length;
    const chip = (kod, ad, n) => h('button', { class: durum.filtre === kod ? 'secili ana' : '', onclick: () => { durum.filtre = kod; ciz(); } }, ad + ' (' + n + ')');
    const kartlar = goster.map((x) => h('section', { class: 'kart' },
      h('div', { class: 'alt' }, x.kod + ' · ' + talepAralik(x) + ' · ' + x.saatBaslangic + '–' + x.saatBitis + (yonetici ? ' · ' + x.sorumluAdi : '')),
      h('div', { style: 'font-size:16px;font-weight:600;margin:3px 0' }, x.ana + (x.alt && x.alt !== 'Genel' ? ' › ' + x.alt : '') + ' › ' + x.faaliyet),
      h('div', { class: 'alt' }, 'Konum: ' + x.konum + ' · ' + x.gorevMetni),
      x.oneri ? h('div', { class: 'alt' }, 'Önerilen: ' + x.oneri) : null,
      x.retNedeni ? h('div', { class: 'mesaj kotu', style: 'margin-top:6px' }, 'Ret nedeni: ' + x.retNedeni) : null,
      durum.atananAcik[x.id] ? atananBlok(durum.atananAcik[x.id]) : null,
      h('div', { class: 'satir', style: 'margin-top:8px;align-items:center' },
        rozet(talepDurumAd(x.durum), talepDurumTur(x.durum)), h('span', { class: 'alt' }, x.gunSayisi + ' gün · ' + talepKisiGun(x.kisiGun) + (x.atanan > 0 ? ' · atanan ' + x.atanan + '/' + x.istenen : '')),
        h('span', { style: 'flex:1' }),
        yonetici && ['ONAY_BEKLIYOR', 'KISMEN_ATANDI'].includes(x.durum) ? h('button', { class: 'ana', onclick: () => atamaAc(x.id) }, 'Ata') : null,
        x.atanan > 0 ? h('button', { onclick: async () => { try { if (durum.atananAcik[x.id]) delete durum.atananAcik[x.id]; else durum.atananAcik[x.id] = await Kopru.cagir('talepGetir', { id: x.id }); ciz(); } catch (e) { hata(e); } } }, 'Atananlar') : null,
        ['KISMEN_ATANDI', 'TAMAMEN_ATANDI'].includes(x.durum) ? h('button', { onclick: () => yonetAc(x.id) }, 'Yönet…') : null,
        h('button', { onclick: async () => { try { await formAc(await Kopru.cagir('talepGetir', { id: x.id }), true); } catch (e) { hata(e); } } }, 'Kopyala'),
        talepDegistirilebilir(x.durum) ? h('button', { onclick: async () => { try { await formAc(await Kopru.cagir('talepGetir', { id: x.id }), false); } catch (e) { hata(e); } } }, 'Revize') : null,
        talepDegistirilebilir(x.durum) ? h('button', { onclick: async () => {
          if (!confirm(x.kod + ' talebi geri çekilsin mi?')) return;
          try { await Kopru.cagir('talepGeriCek', { id: x.id }); toast('Talep geri çekildi.'); await yukle(); } catch (e) { hata(e); }
        } }, 'Geri çek') : null)));
    return h('div', { style: 'display:flex;flex-direction:column;gap:12px' },
      bildirimBandi(),
      h('div', { class: 'satir', style: 'align-items:center' },
        chip('', 'Tümü', durum.liste.length), chip('BEKLEYEN', 'Bekleyen', sayi((x) => talepDegistirilebilir(x.durum))),
        chip('ATANMIS', 'Atanmış', sayi((x) => ['KISMEN_ATANDI', 'TAMAMEN_ATANDI'].includes(x.durum))), chip('KAPALI', 'Kapalı', sayi((x) => ['REDDEDILDI', 'GERI_CEKILDI', 'IPTAL'].includes(x.durum))),
        h('span', { style: 'flex:1' }), h('button', { class: 'ana', onclick: () => formAc(null, false) }, 'Yeni talep')),
      kartlar.length ? kartlar : h('div', { class: 'kart', style: 'text-align:center;border-style:dashed;color:var(--soluk)' }, 'Henüz talep yok. "Yeni talep" ile başlayın.'));
  }

  function form() {
    const f = durum.f; const r = {};
    const havuzAd = (ust, sev) => durum.havuz.filter((x) => x.seviye === sev && x.aktif && !x.birlestirildiId && (ust == null ? true : x.ustId === ust));
    const bul = (ust, sev, ad) => ad && havuzAd(ust, sev).find((x) => talepNorm(x.ad) === talepNorm(ad));
    function oku() {
      f.ana = r.ana.value; f.alt = r.alt.value; f.faaliyet = r.faaliyet.value; f.konum = r.konum.value; f.sb = r.sb.value; f.sbt = r.sbt.value;
      f.metin = r.metin.value; f.nitelik = r.nitelik.value;
    }
    const alan = (ad, el) => h('label', { style: 'display:flex;flex-direction:column;gap:4px;font-size:13px;flex:1 1 220px;min-width:0' }, ad, el);
    const tarihKutusu = (ad, deger, genislik) => {
      const e = h('input', { type: 'text', class: 'metin', inputmode: 'numeric', maxlength: '10', placeholder: 'GG.AA.YYYY', value: deger ? takvimTarihYaz(deger) : '', 'aria-label': ad, style: 'width:' + genislik + 'px' });
      e.addEventListener('input', () => { const d = e.value.replace(/\D/g, '').slice(0, 8); e.value = d.length > 4 ? d.slice(0, 2) + '.' + d.slice(2, 4) + '.' + d.slice(4) : d.length > 2 ? d.slice(0, 2) + '.' + d.slice(2) : d; });
      return e;
    };

    // Havuz ComboBox'ı: listeden seçilir; "Listede yok" seçilirse elle yazılır (yeni ad gönderilince havuza eklenir).
    function combo(sev, ustFn, ad, tohum, degisti) {
      let mod = 'sec', liste = [];
      const sel = h('select', { class: 'metin', 'aria-label': ad });
      const inp = h('input', { type: 'text', class: 'metin', maxlength: '300', placeholder: 'Yeni ad yazın', 'aria-label': ad + ' (yeni ad)', style: 'flex:1;min-width:0' });
      const geri = h('button', { type: 'button' }, 'Listeden seç');
      const yaz = h('div', { style: 'display:flex;gap:6px' }, inp, geri);
      const kap = h('div', { style: 'display:flex;flex-direction:column;gap:6px' }, sel, yaz);
      const deger = () => (mod === 'yaz' ? inp.value : (sel.value === '__yeni' ? '' : sel.value));
      function goster() { sel.style.display = mod === 'sec' ? '' : 'none'; yaz.style.display = mod === 'yaz' ? 'flex' : 'none'; geri.style.display = liste.length ? '' : 'none'; }
      kap.yenile = (ilk) => {
        const cur = ilk ? (tohum || '') : deger();
        const u = sev === 1 ? null : ustFn();
        liste = sev === 1 ? havuzAd(null, 1) : (u ? havuzAd(u.id, sev) : []);
        sel.replaceChildren(h('option', { value: '' }, '— seçin —'), ...liste.map((x) => h('option', { value: x.ad }, x.ad)), h('option', { value: '__yeni' }, '➕ Listede yok, yeni yaz…'));
        const es = liste.find((x) => talepNorm(x.ad) === talepNorm(cur));
        if (mod === 'yaz' && !inp.value.trim() && liste.length) mod = 'sec';
        if (mod === 'sec') {
          if (es) sel.value = es.ad;
          else if (cur && ilk) { mod = 'yaz'; inp.value = cur; }
          else sel.value = '';
        }
        if (!liste.length && mod === 'sec') mod = 'yaz';
        goster();
      };
      Object.defineProperty(kap, 'value', { get: deger });
      sel.addEventListener('change', () => { if (sel.value === '__yeni') { mod = 'yaz'; sel.value = ''; goster(); inp.focus(); } degisti(); });
      inp.addEventListener('input', () => degisti());
      geri.addEventListener('click', () => { mod = 'sec'; inp.value = ''; kap.yenile(); degisti(); });
      return kap;
    }
    const zincir = (bas) => { [r.alt, r.faaliyet, r.konum].slice(bas).forEach((c) => c.yenile()); yeniIpucu(); ozetGuncelle(); };
    const ustAna = () => bul(null, 1, r.ana.value);
    const ustAlt = () => { const a = ustAna(); return a ? bul(a.id, 2, r.alt.value || 'Genel') : null; };
    const ustFaal = () => { const b = ustAlt(); return b ? bul(b.id, 3, r.faaliyet.value) : null; };
    r.ana = combo(1, null, 'Ana Proje', f.ana, () => zincir(0));
    r.alt = combo(2, ustAna, 'Alt Proje', f.alt, () => zincir(1));
    r.faaliyet = combo(3, ustAlt, 'Faaliyet', f.faaliyet, () => zincir(2));
    r.konum = combo(4, ustFaal, 'Konum', f.konum, () => zincir(3));
    r.yeni = h('div', { class: 'mesaj bilgi', style: 'margin:0;display:none' });
    function yeniIpucu() {
      const a = ustAna(), b = ustAlt(), c = ustFaal(); const yeni = [];
      if (r.ana.value.trim() && !a) yeni.push('Ana Proje'); else if (a && r.alt.value.trim() && !bul(a.id, 2, r.alt.value)) yeni.push('Alt Proje');
      if (r.faaliyet.value.trim() && !(b && c)) yeni.push('Faaliyet');
      if (r.konum.value.trim() && !(c && bul(c.id, 4, r.konum.value))) yeni.push('Konum');
      r.yeni.textContent = yeni.length ? 'Listede olmayan ad(lar) yazıldı (' + yeni.join(', ') + '); talep gönderilince otomatik olarak listeye eklenir.' : '';
      r.yeni.style.display = yeni.length ? '' : 'none';
    }

    // Özet: etiket ve değer yan yana.
    const OZ = [['konum', '📍', 'Konum'], ['saat', '🕣', 'Saat'], ['tarih', '📅', 'Tarih'], ['proje', '📑', 'Proje'], ['faaliyet', '📡', 'Faaliyet'], ['oneri', '🙋‍♀️', 'Önerilen Personel'], ['sorumlu', '🧍‍♂️', 'Proje sorumlusu']];
    r.oz = {};
    function ozetGuncelle() {
      const v = (x) => String(x || '').trim() || '—';
      const alt = r.alt.value.trim();
      const sorumlu = yonetici ? (f.sorumlu ? f.sorumlu.ad : 'Seçilmedi') : S.kimlik.adiSoyadi;
      const d = {
        konum: v(r.konum.value), saat: r.sb.value && r.sbt.value ? r.sb.value.replace(':', '.') + ' - ' + r.sbt.value.replace(':', '.') : '—',
        tarih: talepTarihOzet(f.gunler), proje: v(r.ana.value) + (alt ? ' › ' + alt : ''), faaliyet: v(r.faaliyet.value),
        oneri: f.oneri.length ? f.oneri.map((p) => p.ad).join(', ') : '—', sorumlu,
      };
      for (const [k] of OZ) r.oz[k].textContent = d[k];
    }
    const ozetSatirlari = OZ.map(([k, em, ad]) => {
      r.oz[k] = h('span', { style: 'font-weight:600;flex:1;min-width:0;overflow-wrap:anywhere' });
      return h('div', { style: 'display:flex;gap:8px;align-items:baseline;padding:7px 0;border-bottom:1px solid var(--cizgi)' }, h('span', { style: 'white-space:nowrap;color:var(--soluk)' }, em + ' ' + ad + ':'), r.oz[k]);
    });

    r.sb = h('input', { type: 'time', class: 'metin', value: f.sb, 'aria-label': 'Mesai başlangıç saati' }); r.sbt = h('input', { type: 'time', class: 'metin', value: f.sbt, 'aria-label': 'Mesai bitiş saati' });
    r.sb.addEventListener('input', () => ozetGuncelle()); r.sbt.addEventListener('input', () => ozetGuncelle());
    r.metin = h('textarea', { class: 'metin', rows: '3', maxlength: '1000', style: 'width:100%;box-sizing:border-box' }, f.metin);
    r.nitelik = h('input', { type: 'text', class: 'metin', maxlength: '300', value: f.nitelik, placeholder: 'ör. kaynakçı, forklift ehliyetli' });

    // 1. Talep sahibi
    let sorumluBolum;
    if (!yonetici) {
      sorumluBolum = h('section', { class: 'kart' }, h('h2', null, '1. Talep sahibi (Proje Sorumlusu)'),
        h('div', { class: 'satir', style: 'align-items:center' }, rozet(S.kimlik.adiSoyadi, 'bilgi'), h('span', { class: 'alt' }, 'Windows oturumunuzdan otomatik gelir.')));
    } else {
      const dl = h('datalist', { id: 'dl-sorumlu' });
      let secenek = new Map(f.sorumlu ? [[f.sorumlu.ad + ' (' + f.sorumlu.sicil + ')', f.sorumlu]] : []); let zm = 0;
      const kutu = h('input', { type: 'text', class: 'metin', list: 'dl-sorumlu', placeholder: 'Ad yazın, listeden seçin…', 'aria-label': 'Talep sahibi', style: 'width:100%;box-sizing:border-box', value: f.sorumlu ? f.sorumlu.ad + ' (' + f.sorumlu.sicil + ')' : '' });
      kutu.addEventListener('input', () => {
        const v = kutu.value; const p = secenek.get(v);
        f.sorumlu = p ? { sicil: p.sicil, ad: p.ad } : null; ozetGuncelle();
        if (p) return;
        clearTimeout(zm);
        zm = setTimeout(async () => {
          if (v.trim().length < 2) return;
          try {
            const l = await Kopru.cagir('personelAra', { q: v });
            secenek = new Map(l.map((x) => [x.ad + ' (' + x.sicil + ')', x]));
            dl.replaceChildren(...l.map((x) => h('option', { value: x.ad + ' (' + x.sicil + ')' }, x.bolum || '')));
          } catch (e) { hata(e); }
        }, 250);
      });
      sorumluBolum = h('section', { class: 'kart' }, h('h2', null, '1. Talep sahibi (Proje Sorumlusu)'),
        alan('Vekâleten açıyorsanız talep sahibini seçin', kutu), dl);
    }

    // 3. Gün ve zaman dilimi
    r.bas = tarihKutusu('Başlangıç tarihi', f.bas, 140); r.bit = tarihKutusu('Bitiş tarihi', f.bit, 140);
    r.kisi = h('input', { type: 'number', class: 'metin', min: '1', max: '500', value: String(f.kisi), style: 'width:80px', 'aria-label': 'Günlük kişi sayısı' });
    r.ekle = tarihKutusu('Tek gün ekle', '', 140);
    const gunKap = h('div', { style: 'display:flex;flex-direction:column;gap:10px' });
    r.sayac = h('span', { class: 'alt' });
    function gunCiz() {
      const toplam = f.gunler.reduce((a, g) => a + g.kisi * (g.zaman === 'TAM' ? 1 : 0.5), 0);
      const hucre = 'padding:8px;border-bottom:1px solid var(--cizgi)';
      const tablo = h('table', { style: 'width:100%;min-width:640px;border-collapse:collapse' },
        h('thead', null, h('tr', null, ['Gün', 'Zaman dilimi', 'Kişi sayısı', ''].map((x) => h('th', { style: 'text-align:left;font-size:13px;padding:6px 8px;border-bottom:1px solid var(--cizgi)' }, x)))),
        h('tbody', null, f.gunler.map((g, i) => h('tr', null,
          h('td', { style: hucre + ';white-space:nowrap' }, takvimTarihYaz(g.tarih) + ' ' + takvimGun(g.tarih)),
          h('td', { style: hucre }, h('div', { style: 'display:flex;gap:6px;flex-wrap:wrap' }, [['TAM', 'Tam gün'], ['OO', 'Öğleden önce'], ['OS', 'Öğleden sonra']].map(([z, ad]) =>
            h('button', { type: 'button', style: 'white-space:nowrap', class: g.zaman === z ? 'ana' : '', 'aria-pressed': String(g.zaman === z), onclick: () => { g.zaman = z; gunCiz(); } }, ad)))),
          h('td', { style: hucre }, h('div', { style: 'display:flex;align-items:center;gap:8px' },
            h('button', { type: 'button', 'aria-label': 'Azalt', style: 'min-width:44px', onclick: () => { g.kisi = Math.max(1, g.kisi - 1); gunCiz(); } }, '−'),
            h('span', { style: 'min-width:24px;text-align:center;font-weight:600' }, String(g.kisi)),
            h('button', { type: 'button', 'aria-label': 'Artır', style: 'min-width:44px', onclick: () => { g.kisi = Math.min(500, g.kisi + 1); gunCiz(); } }, '+'))),
          h('td', { style: hucre }, h('button', { type: 'button', 'aria-label': 'Günü kaldır', title: 'Günü kaldır', style: 'min-width:44px', onclick: () => { f.gunler.splice(i, 1); gunCiz(); } }, '✕'))))));
      gunKap.replaceChildren(...[
        f.not ? h('div', { class: 'mesaj uyari', style: 'margin:0' }, f.not) : null,
        f.gunler.length ? h('div', { style: 'overflow-x:auto' }, tablo) : h('div', { class: 'alt' }, 'Henüz gün yok: başlangıç ve bitiş tarihini GG.AA.YYYY olarak yazın.'),
      ].filter(Boolean));
      r.sayac.textContent = f.gunler.length + ' gün · ' + talepKisiGun(String(toplam));
      ozetGuncelle();
    }
    function aralik() {
      const b = talepTarihOku(r.bas.value), e = talepTarihOku(r.bit.value);
      f.bas = b; f.bit = e;
      if (!b || !e) return;
      if (e < b) { f.not = 'Bitiş tarihi başlangıçtan önce olamaz.'; gunCiz(); return; }
      if ((new Date(e) - new Date(b)) / 864e5 > 366) { f.not = 'Tek talepte en fazla 366 günlük aralık seçilebilir.'; gunCiz(); return; }
      const eski = new Map(f.gunler.map((g) => [g.tarih, g]));
      const u = talepGunleriUret(b, e, f.kisi, durum.tatiller);
      f.gunler = u.gunler.map((g) => eski.get(g.tarih) || g);
      f.not = u.atlanan.length ? 'Tatil nedeniyle atlanan: ' + u.atlanan.join(', ') : '';
      gunCiz();
    }
    r.bas.addEventListener('input', aralik); r.bit.addEventListener('input', aralik);
    r.kisi.addEventListener('change', () => { f.kisi = Math.max(1, Math.min(500, parseInt(r.kisi.value, 10) || 1)); r.kisi.value = String(f.kisi); f.gunler.forEach((g) => { g.kisi = f.kisi; }); gunCiz(); });
    const tekGun = () => {
      const t = talepTarihOku(r.ekle.value);
      if (!t) { toast('Tarihi GG.AA.YYYY olarak yazın.', 'uyari'); return; }
      if (f.gunler.some((g) => g.tarih === t)) { toast('Bu gün listede var.', 'uyari'); return; }
      f.gunler.push({ tarih: t, zaman: 'TAM', kisi: f.kisi }); f.gunler.sort((a, b) => a.tarih.localeCompare(b.tarih)); r.ekle.value = ''; gunCiz();
    };

    const oneriChip = f.oneri.map((p, i) => h('span', { class: 'rozet bilgi', style: 'display:inline-flex;gap:6px;align-items:center' }, p.ad,
      h('button', { type: 'button', 'aria-label': p.ad + ' önerisini kaldır', style: 'min-height:0;padding:0 6px', onclick: () => { oku(); f.oneri.splice(i, 1); ciz(); } }, '×')));

    async function kaydet(gonder) {
      oku();
      if (!f.gunler.length) { toast('En az bir gün ekleyin.', 'uyari'); return; }
      try {
        const o = await Kopru.cagir('talepKaydet', {
          id: f.id, sorumluSicil: f.sorumlu ? f.sorumlu.sicil : null, ana: f.ana, alt: f.alt, faaliyet: f.faaliyet, konum: f.konum,
          saatBaslangic: f.sb, saatBitis: f.sbt, gorevMetni: f.metin, nitelik: f.nitelik, gunler: f.gunler, oneri: f.oneri.map((p) => p.sicil), gonder,
        });
        toast(o.kod + (gonder ? ' gönderildi (onay bekliyor).' : ' taslak olarak kaydedildi.') + (o.uyari ? ' ' + o.uyari : ''), o.uyari ? 'uyari' : 'iyi');
        durum.gorunum = 'liste'; durum.f = null; durum.havuz = []; await yukle();
      } catch (e) { hata(e); }
    }

    const el = h('div', { style: 'display:flex;flex-direction:column;gap:14px' },
      h('div', { class: 'satir', style: 'align-items:center' }, h('h2', { style: 'margin:0;font-size:18px' }, f.id ? f.kod + ' talebini revize et' : 'Yeni görev talebi'), h('span', { style: 'flex:1' }),
        h('button', { type: 'button', onclick: () => { durum.gorunum = 'liste'; durum.f = null; ciz(); } }, 'Vazgeç')),
      h('div', { style: 'display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start' },
        h('div', { style: 'flex:999 1 680px;min-width:0;display:flex;flex-direction:column;gap:14px' },
          sorumluBolum,
          h('section', { class: 'kart' }, h('h2', null, '2. Proje ve görev tanımı'),
            h('div', { style: 'display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px' },
              alan('Ana Proje', r.ana), alan('Alt Proje (boşsa "Genel")', r.alt), alan('Faaliyet', r.faaliyet), alan('Konum', r.konum)),
            h('div', { style: 'margin-top:10px' }, r.yeni),
            h('div', { style: 'margin-top:12px' }, h('label', { style: 'font-size:13px;display:flex;flex-direction:column;gap:4px' }, 'Görev metni', r.metin)),
            h('div', { style: 'margin-top:10px' }, alan('Aranan nitelik (isteğe bağlı)', r.nitelik))),
          h('section', { class: 'kart' }, h('h2', null, '3. Gün ve zaman dilimi'),
            h('div', { class: 'satir', style: 'align-items:flex-end' }, alan('Başlangıç', r.bas), alan('Bitiş', r.bit), alan('Günlük kişi', r.kisi), alan('Mesai başlangıç', r.sb), alan('Mesai bitiş', r.sbt)),
            h('div', { style: 'margin:10px 0' }, gunKap),
            h('div', { class: 'satir', style: 'align-items:center' }, r.ekle, h('button', { type: 'button', onclick: tekGun }, 'Tek gün ekle'), r.sayac),
            h('p', { class: 'alt', style: 'margin:8px 0 0' }, 'Hafta sonu ve tatil günleri listeye gelmez; gerekirse "Tek gün ekle" ile elle eklenir. Çakışma denetimi atama sırasında yapılır.')),
          h('section', { class: 'kart' }, h('h2', null, '4. Önerilen personel (isteğe bağlı, bağlayıcı değil)'),
            h('div', { class: 'satir', style: 'margin-bottom:6px' }, oneriChip.length ? oneriChip : [h('span', { class: 'alt' }, 'Öneri yok.')]),
            talepPersonelAra('Ad yazarak ara…', (p) => { oku(); if (!f.oneri.some((x) => x.sicil === p.sicil)) f.oneri.push({ sicil: p.sicil, ad: p.ad }); ciz(); }),
            h('p', { class: 'alt', style: 'margin:6px 0 0' }, 'Atamayı Merkez Yönetici yapar; öneri yalnız yol göstericidir.'))),
        h('aside', { style: 'flex:1 1 360px;max-width:520px;min-width:0;display:flex;flex-direction:column;gap:14px;position:sticky;top:12px' },
          h('section', { class: 'kart' }, h('h2', null, 'Özet'), h('div', null, ozetSatirlari),
            h('div', { style: 'margin:10px 0' }, rozet('Gönderilince: Onay bekliyor', 'bilgi')),
            h('div', { style: 'display:flex;flex-direction:column;gap:8px' },
              h('button', { class: 'ana', type: 'button', onclick: () => kaydet(true) }, 'Talebi gönder'), h('button', { type: 'button', onclick: () => kaydet(false) }, 'Taslak olarak kaydet'))),
          h('section', { class: 'kart', style: 'font-size:13px;line-height:1.5;color:var(--soluk);display:flex;flex-direction:column;gap:6px' }, h('h2', { style: 'color:var(--yazi)' }, 'Kurallar'),
            h('div', null, 'Talebi yalnız açan Sorumlu (ve Yönetici vekâleten) değiştirir veya geri çeker.'),
            h('div', null, 'Onaydan önce serbestçe revize edilir; onaydan sonra revize yeni onay gerektirir (sonraki dilim).'),
            h('div', null, 'Sorumlu personel atamaz; öneri bağlayıcı değildir, atamayı Merkez Yönetici yapar.')))));
    setTimeout(() => { r.ana.yenile(true); r.alt.yenile(true); r.faaliyet.yenile(true); r.konum.yenile(true); yeniIpucu(); gunCiz(); }, 0);
    return el;
  }

  function ciz() { kap.replaceChildren(h('h1', null, yonetici ? 'Talepler' : 'Görev Talep Arayüzü'), durum.gorunum === 'form' ? form() : durum.gorunum === 'atama' ? durum.atama : liste()); }

  await yukle();
  if (!kap.childNodes.length) ciz();
  return kap;
}
