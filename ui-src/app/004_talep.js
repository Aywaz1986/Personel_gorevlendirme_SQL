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

async function talepSayfa() {
  const yonetici = S.gorunum === 'YONETICI';
  const durum = { gorunum: 'liste', filtre: '', liste: [], havuz: [], tatiller: [], f: null };
  const kap = h('div', { style: 'display:flex;flex-direction:column;gap:14px' });

  async function yukle() {
    try { durum.liste = await Kopru.cagir('talepListe', {}); ciz(); } catch (e) { hata(e); }
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
      h('div', { class: 'satir', style: 'margin-top:8px;align-items:center' },
        rozet(talepDurumAd(x.durum), talepDurumTur(x.durum)), h('span', { class: 'alt' }, x.gunSayisi + ' gün · ' + talepKisiGun(x.kisiGun)),
        h('span', { style: 'flex:1' }),
        h('button', { onclick: async () => { try { await formAc(await Kopru.cagir('talepGetir', { id: x.id }), true); } catch (e) { hata(e); } } }, 'Kopyala'),
        talepDegistirilebilir(x.durum) ? h('button', { onclick: async () => { try { await formAc(await Kopru.cagir('talepGetir', { id: x.id }), false); } catch (e) { hata(e); } } }, 'Revize') : null,
        talepDegistirilebilir(x.durum) ? h('button', { onclick: async () => {
          if (!confirm(x.kod + ' talebi geri çekilsin mi?')) return;
          try { await Kopru.cagir('talepGeriCek', { id: x.id }); toast('Talep geri çekildi.'); await yukle(); } catch (e) { hata(e); }
        } }, 'Geri çek') : null)));
    return h('div', { style: 'display:flex;flex-direction:column;gap:12px' },
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
      f.metin = r.metin.value; f.nitelik = r.nitelik.value; f.bas = r.bas.value; f.bit = r.bit.value; f.kisi = Math.max(1, parseInt(r.kisi.value, 10) || 1);
      r.satirlar.forEach((s, i) => { f.gunler[i].zaman = s.z.value; f.gunler[i].kisi = Math.max(1, parseInt(s.k.value, 10) || 1); });
    }
    function havuzIpucu() {
      const a = bul(null, 1, r.ana.value);
      const b = a ? bul(a.id, 2, r.alt.value || 'Genel') : null;
      const c = b ? bul(b.id, 3, r.faaliyet.value) : null;
      const doldur = (dl, l) => dl.replaceChildren(...l.map((x) => h('option', { value: x.ad })));
      doldur(r.dlAna, havuzAd(null, 1)); doldur(r.dlAlt, a ? havuzAd(a.id, 2) : []); doldur(r.dlFaaliyet, b ? havuzAd(b.id, 3) : []); doldur(r.dlKonum, c ? havuzAd(c.id, 4) : []);
      const yeni = [];
      if (r.ana.value.trim() && !a) yeni.push('Ana Proje'); else if (a && r.alt.value.trim() && !bul(a.id, 2, r.alt.value)) yeni.push('Alt Proje');
      if (r.faaliyet.value.trim() && !c) yeni.push('Faaliyet');
      if (r.konum.value.trim() && !(c && bul(c.id, 4, r.konum.value))) yeni.push('Konum');
      r.yeni.textContent = yeni.length ? 'Havuzda olmayan ad(lar) yazıldı (' + yeni.join(', ') + '); talep gönderilince havuza yeni kayıt olarak eklenir.' : 'Adlar havuzdaki kayıtlarla eşleşiyor.';
    }
    const alan = (ad, el) => h('label', { style: 'display:flex;flex-direction:column;gap:4px;font-size:13px;flex:1 1 220px' }, ad, el);
    const metin = (anahtar, ph, dl, max) => { const e = h('input', { type: 'text', class: 'metin', maxlength: String(max || 300), list: dl, placeholder: ph || '', value: f[anahtar === 'ana' ? 'ana' : anahtar] || '' }); e.addEventListener('input', havuzIpucu); return e; };
    r.dlAna = h('datalist', { id: 'dl-ana' }); r.dlAlt = h('datalist', { id: 'dl-alt' }); r.dlFaaliyet = h('datalist', { id: 'dl-faaliyet' }); r.dlKonum = h('datalist', { id: 'dl-konum' });
    r.ana = metin('ana', '', 'dl-ana'); r.alt = metin('alt', 'Genel', 'dl-alt'); r.faaliyet = metin('faaliyet', '', 'dl-faaliyet'); r.konum = metin('konum', '', 'dl-konum');
    r.yeni = h('div', { class: 'alt', style: 'margin-top:6px' });
    r.sb = h('input', { type: 'time', class: 'metin', value: f.sb, 'aria-label': 'Başlangıç saati' }); r.sbt = h('input', { type: 'time', class: 'metin', value: f.sbt, 'aria-label': 'Bitiş saati' });
    r.metin = h('textarea', { class: 'metin', rows: '3', maxlength: '1000', style: 'width:100%' }, f.metin);
    r.nitelik = h('input', { type: 'text', class: 'metin', maxlength: '300', value: f.nitelik, placeholder: 'ör. kaynakçı, forklift ehliyetli' });
    r.bas = h('input', { type: 'date', class: 'metin', value: f.bas, 'aria-label': 'Başlangıç tarihi' }); r.bit = h('input', { type: 'date', class: 'metin', value: f.bit, 'aria-label': 'Bitiş tarihi' });
    r.kisi = h('input', { type: 'number', class: 'metin', min: '1', max: '500', value: String(f.kisi), style: 'width:80px', 'aria-label': 'Günlük kişi sayısı' });

    r.satirlar = f.gunler.map((g) => ({
      z: h('select', { 'aria-label': 'Zaman dilimi' }, ['TAM', 'OO', 'OS'].map((z) => h('option', { value: z, selected: g.zaman === z }, takvimZamanAd(z)))),
      k: h('input', { type: 'number', class: 'metin', min: '1', max: '500', value: String(g.kisi), style: 'width:80px', 'aria-label': 'Kişi sayısı' }),
    }));
    const gunTablo = f.gunler.length ? h('table', { style: 'width:100%;border-collapse:collapse' },
      h('thead', null, h('tr', null, ['Gün', 'Zaman dilimi', 'Kişi', ''].map((x) => h('th', { style: 'text-align:left;font-size:12px;padding:4px' }, x)))),
      h('tbody', null, f.gunler.map((g, i) => h('tr', null,
        h('td', { style: 'padding:4px' }, takvimTarihYaz(g.tarih) + ' ' + takvimGun(g.tarih)), h('td', { style: 'padding:4px' }, r.satirlar[i].z), h('td', { style: 'padding:4px' }, r.satirlar[i].k),
        h('td', { style: 'padding:4px' }, h('button', { type: 'button', 'aria-label': 'Günü kaldır', onclick: () => { oku(); f.gunler.splice(i, 1); ciz(); } }, 'Kaldır')))))) : h('div', { class: 'alt' }, 'Henüz gün yok: tarih aralığı seçip "Günleri oluştur" deyin.');

    const ekleGun = h('input', { type: 'date', class: 'metin', 'aria-label': 'Tek gün ekle' });
    const toplam = f.gunler.reduce((a, g) => a + g.kisi * (g.zaman === 'TAM' ? 1 : 0.5), 0);
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
      yonetici ? h('section', { class: 'kart' }, h('h2', null, 'Talep sahibi (Proje Sorumlusu)'),
        h('div', null, f.sorumlu ? rozet(f.sorumlu.ad + ' (' + f.sorumlu.sicil + ')', 'bilgi') : h('span', { class: 'alt' }, 'Seçilmedi: Yönetici vekâleten açıyorsa talep sahibini seçin.')),
        talepPersonelAra('Ad yazarak ara…', (p) => { oku(); f.sorumlu = { sicil: p.sicil, ad: p.ad }; ciz(); })) : null,
      h('section', { class: 'kart' }, h('h2', null, '1. Proje'),
        h('div', { class: 'satir' }, alan('Ana Proje', r.ana), alan('Alt Proje (boşsa "Genel")', r.alt), alan('Faaliyet', r.faaliyet), alan('Konum', r.konum)),
        r.dlAna, r.dlAlt, r.dlFaaliyet, r.dlKonum, r.yeni),
      h('section', { class: 'kart' }, h('h2', null, '2. Tarih, saat ve kişi sayısı'),
        h('div', { class: 'satir' }, alan('Başlangıç tarihi', r.bas), alan('Bitiş tarihi', r.bit), alan('Günlük kişi', r.kisi), alan('Mesai başlangıç', r.sb), alan('Mesai bitiş', r.sbt),
          h('button', { type: 'button', onclick: () => {
            oku();
            if (!f.bas || !f.bit || f.bit < f.bas) { toast('Geçerli bir tarih aralığı seçin.', 'uyari'); return; }
            const u = talepGunleriUret(f.bas, f.bit, f.kisi, durum.tatiller);
            f.gunler = u.gunler; f.not = u.atlanan.length ? 'Tatil nedeniyle atlanan: ' + u.atlanan.join(', ') : '';
            ciz();
          } }, 'Günleri oluştur')),
        f.not ? h('div', { class: 'mesaj uyari', style: 'margin-top:8px' }, f.not) : null,
        h('div', { style: 'margin-top:10px;overflow-x:auto' }, gunTablo),
        h('div', { class: 'satir', style: 'margin-top:8px;align-items:center' }, ekleGun,
          h('button', { type: 'button', onclick: () => {
            oku();
            if (!ekleGun.value) return;
            if (f.gunler.some((g) => g.tarih === ekleGun.value)) { toast('Bu gün listede var.', 'uyari'); return; }
            f.gunler.push({ tarih: ekleGun.value, zaman: 'TAM', kisi: f.kisi }); f.gunler.sort((a, b) => a.tarih.localeCompare(b.tarih)); ciz();
          } }, 'Tek gün ekle'), h('span', { class: 'alt' }, f.gunler.length + ' gün · ' + talepKisiGun(String(toplam))))),
      h('section', { class: 'kart' }, h('h2', null, '3. Görev tanımı'),
        h('label', { style: 'font-size:13px' }, 'Görev metni', r.metin), h('div', { style: 'height:8px' }), alan('Aranan nitelik (isteğe bağlı)', r.nitelik)),
      h('section', { class: 'kart' }, h('h2', null, '4. Önerilen personel (isteğe bağlı, bağlayıcı değil)'),
        h('div', { class: 'satir', style: 'margin-bottom:6px' }, oneriChip.length ? oneriChip : [h('span', { class: 'alt' }, 'Öneri yok.')]),
        talepPersonelAra('Ad yazarak ara…', (p) => { oku(); if (!f.oneri.some((x) => x.sicil === p.sicil)) f.oneri.push({ sicil: p.sicil, ad: p.ad }); ciz(); }),
        h('p', { class: 'alt', style: 'margin:6px 0 0' }, 'Atamayı Merkez Yönetici yapar; öneri yalnız yol göstericidir.')),
      h('div', { class: 'satir' }, h('button', { class: 'ana', type: 'button', onclick: () => kaydet(true) }, 'Talebi gönder'), h('button', { type: 'button', onclick: () => kaydet(false) }, 'Taslak olarak kaydet')));
    setTimeout(havuzIpucu, 0);
    return el;
  }

  function ciz() { kap.replaceChildren(h('h1', null, yonetici ? 'Talepler' : 'Görev Talep Arayüzü'), durum.gorunum === 'form' ? form() : liste()); }

  await yukle();
  if (!kap.childNodes.length) ciz();
  return kap;
}
