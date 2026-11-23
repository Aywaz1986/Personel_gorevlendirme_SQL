// Dilim 7: izin / rapor / kişisel görev ekranı. Saha: "Görevlerim"; Sorumlu ve Yönetici: "İzin ve rapor".
const IZIN_TURLERI = ['Yıllık izin', 'Mazeret izni', 'Ücretsiz izin', 'İdari izin', 'Diğer'];
function izinDurumAd(d) { return ({ ONAY_BEKLIYOR: 'Onay bekliyor', ONAYLANDI: 'Onaylandı', REDDEDILDI: 'Reddedildi', GERI_CEKILDI: 'Geri çekildi', RAPORLA_IPTAL: 'Rapor nedeniyle iptal' })[d] || d; }
function izinDurumTur(d) { return ({ ONAY_BEKLIYOR: 'uyari', ONAYLANDI: 'iyi', REDDEDILDI: 'kotu', GERI_CEKILDI: 'soluk', RAPORLA_IPTAL: 'soluk' })[d] || 'soluk'; }
function izinBayt(n) { return n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'; }
function izinTarihAralik(a, b) { return a === b ? takvimTarihYaz(a) : takvimTarihYaz(a) + ' – ' + takvimTarihYaz(b); }

async function izinTatiller() {
  const y = new Date().getFullYear(); let l = [];
  for (const yil of [y, y + 1]) { try { l = l.concat(await Kopru.cagir('takvimListe', { yil })); } catch (e) { /* takvim okunamazsa tatiller atlanmaz */ } }
  return l;
}

async function izinRaporSayfa() {
  const yon = S.gorunum === 'YONETICI', saha = S.gorunum === 'SAHA';
  const d = { gorev: [], izin: [], rapor: [], tatiller: [], bildirim: [], cakisma: null, vek: null, rapForm: { vek: null, evrak: null },
    iF: { tur: IZIN_TURLERI[0], bas: '', bit: '', zaman: 'TAM', atla: true, aciklama: '' }, rF: { bas: '', bit: '', aciklama: '' }, retId: null, rapIptalId: null, rapDuzeltId: null, kisaltId: null, ilet: {} };
  const kap = h('div', { style: 'display:flex;flex-direction:column;gap:14px;min-width:0' });

  async function yukle() {
    try {
      const isler = [Kopru.cagir('izinListe', {}), Kopru.cagir('raporListe', { iptalDahil: yon }), izinTatiller(), Kopru.cagir('bildirimListe', {})];
      if (saha) isler.push(Kopru.cagir('gorevlerim', {}));
      const [i, r, t, b, g] = await Promise.all(isler);
      d.izin = i; d.rapor = r; d.tatiller = t; d.bildirim = b; d.gorev = g || [];
      ciz();
    } catch (e) { hata(e); }
  }

  S.yenile = yukle;

  function personSec(anahtar) {
    const cs = anahtar === 'izin' ? d : d.rapForm;
    if (!yon) return null;
    return h('div', null, h('label', null, 'Vekaleten işlem (isteğe bağlı)'),
      cs.vek ? h('div', { class: 'satir', style: 'align-items:center' }, rozet(cs.vek.ad + ' (' + cs.vek.sicil + ')', 'bilgi'), h('button', { type: 'button', onclick: () => { cs.vek = null; ciz(); } }, 'Kendi adıma')) :
        talepPersonelAra('Kişi adı yazın (boşsa kendi adınıza)…', (p) => { cs.vek = { sicil: p.sicil, ad: p.ad }; ciz(); }));
  }

  function bildirimBandi() {
    if (!d.bildirim.length) return null;
    return h('section', { class: 'mesaj bilgi', style: 'margin:0' },
      h('div', { class: 'satir', style: 'align-items:center' }, h('b', null, d.bildirim.length + ' yeni bildirim'), h('span', { style: 'flex:1' }),
        h('button', { type: 'button', onclick: async () => { try { await Kopru.cagir('bildirimOkundu', {}); d.bildirim = []; ciz(); } catch (e) { hata(e); } } }, 'Tümünü okundu say')),
      h('ul', { style: 'margin:6px 0 0;padding-left:18px' }, d.bildirim.map((b) => h('li', null, b.mesaj + ' ', h('span', { class: 'alt', style: 'color:inherit;opacity:.8' }, b.tarih)))));
  }

  function iletisimBlok(i) {
    const tel = (g) => g ? h('a', { href: 'tel:' + String(g).replace(/\s+/g, ''), style: 'margin-left:6px' }, g) : h('span', { class: 'alt', style: 'margin-left:6px' }, 'telefon kayıtlı değil');
    return h('div', null, i.sahaNotu ? h('div', { style: 'white-space:pre-wrap;margin-bottom:4px' }, h('b', null, 'Saha / Operasyon Notu: '), i.sahaNotu) : h('div', { class: 'alt' }, 'Bu talep için saha notu girilmemiş.'),
      h('div', null, h('b', null, 'Proje Sorumlusu: '), i.sorumluAd, tel(i.sorumluGsm)));
  }

  function gorevBolumu() {
    if (!saha) return null;
    const satirlar = d.gorev;
    return h('section', { class: 'kart' }, h('h2', null, 'Görevlerim'), h('div', { class: 'alt', style: 'margin-bottom:8px' }, 'Son 14 gün ve önümüzdeki 90 gün.'),
      satirlar.length ? h('div', { style: 'overflow:auto' }, h('table', { style: 'border-collapse:collapse;width:100%' },
        h('thead', null, h('tr', null, ['Tarih', 'Dilim', 'Proje / faaliyet', 'Konum · saat', 'Sorumlu', 'Not · iletişim'].map((x) => h('th', { style: 'text-align:left;padding:6px 8px;border-bottom:1px solid var(--cizgi)' }, x)))),
        h('tbody', null, satirlar.flatMap((g) => [h('tr', null,
          h('td', { style: 'padding:6px 8px;border-bottom:1px solid var(--cizgi);white-space:nowrap' }, takvimTarihYaz(g.tarih)),
          h('td', { style: 'padding:6px 8px;border-bottom:1px solid var(--cizgi)' }, atamaTamAd(g.zaman)),
          h('td', { style: 'padding:6px 8px;border-bottom:1px solid var(--cizgi)' }, h('b', null, g.ana), ' › ' + g.alt + ' › ' + g.faaliyet, h('div', { class: 'alt' }, g.kod)),
          h('td', { style: 'padding:6px 8px;border-bottom:1px solid var(--cizgi)' }, (g.konum || '') + ' · ' + (g.saat || '')),
          h('td', { style: 'padding:6px 8px;border-bottom:1px solid var(--cizgi)' }, g.sorumlu),
          h('td', { style: 'padding:6px 8px;border-bottom:1px solid var(--cizgi)' }, h('button', { type: 'button', onclick: async () => {
            try { if (d.ilet[g.talepId]) delete d.ilet[g.talepId]; else d.ilet[g.talepId] = await Kopru.cagir('talepIletisim', { talepId: g.talepId }); ciz(); } catch (e) { hata(e); } } }, d.ilet[g.talepId] ? 'Gizle' : 'Göster'))),
          d.ilet[g.talepId] ? h('tr', null, h('td', { colspan: '6', style: 'padding:6px 8px;border-bottom:1px solid var(--cizgi)' }, iletisimBlok(d.ilet[g.talepId]))) : null].filter(Boolean))))) : h('div', { style: 'color:var(--soluk)' }, 'Bu dönemde size atanmış görev yok.'));
  }

  function cakismaKutusu() {
    if (!d.cakisma) return null;
    return h('section', { class: 'mesaj uyari', style: 'border:2px solid var(--uyari)' },
      h('h2', { style: 'margin:0 0 8px;font-size:16px' }, 'Çakışma kararı'), h('div', null, d.cakisma.mesaj),
      h('div', { class: 'alt', style: 'margin:8px 0;color:inherit' }, 'Sistem kendi başına karar vermez. "Çakışan görevden çıkar" derseniz kişi o günlerde görevden çıkarılır, görev sorumlusuna bildirim gider ve işlem denetim kaydına yazılır.'),
      h('div', { class: 'satir' }, h('button', { type: 'button', onclick: () => { d.cakisma = null; ciz(); } }, 'Vazgeç'),
        h('button', { class: 'ana', type: 'button', onclick: () => d.cakisma.devam() }, 'Çakışan görevden çıkar ve izni uygula')));
  }

  function izinFormu() {
    const f = d.iF;
    const bas = h('input', { type: 'text', class: 'metin', placeholder: 'GG.AA.YYYY', value: f.bas, style: 'width:130px', 'aria-label': 'İzin başlangıç' });
    const bit = h('input', { type: 'text', class: 'metin', placeholder: 'GG.AA.YYYY', value: f.bit, style: 'width:130px', 'aria-label': 'İzin bitiş' });
    const tur = h('select', { 'aria-label': 'İzin türü' }, IZIN_TURLERI.map((t) => h('option', { value: t, selected: t === f.tur }, t)));
    const zaman = h('select', { 'aria-label': 'Zaman dilimi' }, [['TAM', 'Tam gün'], ['OO', 'Yalnız öğleden önce'], ['OS', 'Yalnız öğleden sonra']].map(([v, a]) => h('option', { value: v, selected: v === f.zaman }, a)));
    const atla = h('input', { type: 'checkbox', checked: f.atla });
    const ac = h('textarea', { class: 'metin', rows: '2', maxlength: '300', style: 'width:100%;box-sizing:border-box', placeholder: 'Açıklama (isteğe bağlı)' }, f.aciklama);
    const oku = () => { f.tur = tur.value; f.bas = bas.value; f.bit = bit.value; f.zaman = zaman.value; f.atla = atla.checked; f.aciklama = ac.value; };
    async function gonder(karar) {
      oku();
      const b = talepTarihOku(f.bas), s = talepTarihOku(f.bit || f.bas);
      if (!b || !s) { toast('Tarihi GG.AA.YYYY biçiminde yazın.', 'kotu'); return; }
      if (s < b) { toast('Bitiş tarihi başlangıçtan önce olamaz.', 'kotu'); return; }
      const u = talepGunleriUret(b, s, '', f.atla ? d.tatiller : []);
      const gunler = u.gunler.map((g) => ({ tarih: g.tarih, zaman: f.zaman }));
      if (!gunler.length) { toast('Seçilen aralıkta çalışılan gün yok.', 'kotu'); return; }
      try {
        const r = await Kopru.cagir('izinKaydet', { sicil: d.vek ? d.vek.sicil : '', tur: f.tur, aciklama: f.aciklama, gunler, karar });
        d.cakisma = null; d.iF = { tur: IZIN_TURLERI[0], bas: '', bit: '', zaman: 'TAM', atla: true, aciklama: '' }; d.vek = null;
        toast(r && r.durum === 'ONAYLANDI' ? 'İzin kaydedildi ve onaylandı (' + r.kod + ').' : 'İzin talebi gönderildi (' + (r && r.kod) + '). Yönetici onayı bekleniyor.');
        await yukle();
      } catch (e) {
        if (e.kod === 'cakisma') { d.cakisma = { mesaj: e.message, devam: () => gonder('CIKAR') }; ciz(); } else hata(e);
      }
    }
    return h('section', { class: 'kart' }, h('h2', null, yon ? 'Yeni izin kaydı' : 'İzin talebi'),
      h('div', { class: 'alt', style: 'margin-bottom:8px' }, yon ? 'Yönetici kaydı hemen onaylanır; o günlerdeki görevler için karar sorulur.' : 'Talep Yönetici onayına gider. Onaylanan günlere atama yapılamaz.'),
      h('div', { style: 'display:flex;flex-direction:column;gap:10px' }, personSec('izin'),
        h('div', { class: 'satir' }, h('label', null, 'Tür ', tur), h('label', null, 'Başlangıç ', bas), h('label', null, 'Bitiş ', bit), h('label', null, 'Dilim ', zaman)),
        h('label', { style: 'display:flex;gap:6px;align-items:center' }, atla, 'Hafta sonu ve resmi/idari tatil günlerini atla'), ac,
        h('div', { class: 'satir' }, h('button', { class: 'ana', type: 'button', onclick: () => gonder('REDDET') }, yon ? 'Kaydet ve onayla' : 'Talebi gönder'))));
  }

  function izinSatiri(x) {
    const b = x.durum === 'ONAY_BEKLIYOR';
    const eylem = [];
    if (yon && b) {
      eylem.push(h('button', { class: 'ana', type: 'button', onclick: () => onayla(x, 'REDDET') }, 'Onayla'));
      eylem.push(h('button', { type: 'button', onclick: () => { d.retId = d.retId === x.id ? null : x.id; ciz(); } }, 'Reddet…'));
    }
    if (b || (yon && x.durum === 'ONAYLANDI')) eylem.push(h('button', { type: 'button', onclick: async () => { if (!confirm(x.kod + ' izni geri çekilsin mi?')) return; try { await Kopru.cagir('izinGeriCek', { id: x.id }); toast('İzin geri çekildi.'); await yukle(); } catch (e) { hata(e); } } }, 'Geri çek'));
    if (yon && x.durum === 'ONAYLANDI') eylem.push(h('button', { type: 'button', onclick: () => { d.kisaltId = d.kisaltId === x.id ? null : x.id; ciz(); } }, 'Kısalt…'));
    const ek = [];
    if (d.retId === x.id) {
      const n = h('input', { type: 'text', class: 'metin', maxlength: '300', placeholder: 'Ret nedeni (zorunlu)', style: 'flex:1;min-width:220px' });
      ek.push(h('div', { class: 'satir', style: 'margin-top:6px' }, n, h('button', { type: 'button', onclick: async () => { try { await Kopru.cagir('izinReddet', { id: x.id, neden: n.value }); toast('İzin reddedildi.'); d.retId = null; await yukle(); } catch (e) { hata(e); } } }, 'Reddi kaydet')));
    }
    if (d.kisaltId === x.id) {
      const n = h('input', { type: 'text', class: 'metin', placeholder: 'Yeni son gün GG.AA.YYYY', style: 'width:180px' });
      ek.push(h('div', { class: 'satir', style: 'margin-top:6px' }, n, h('button', { type: 'button', onclick: async () => {
        const t = talepTarihOku(n.value); if (!t) { toast('Tarihi GG.AA.YYYY biçiminde yazın.', 'kotu'); return; }
        try { await Kopru.cagir('izinKisalt', { id: x.id, yeniSon: t }); toast('İzin kısaltıldı.'); d.kisaltId = null; await yukle(); } catch (e) { hata(e); } } }, 'Kısaltmayı kaydet')));
    }
    const yariGun = (x.gunler || []).filter((g) => g.zaman !== 'TAM').length;
    return h('div', { class: 'kart', style: 'padding:10px 12px' },
      h('div', { class: 'satir', style: 'align-items:center' }, h('b', null, x.kod), rozet(izinDurumAd(x.durum), izinDurumTur(x.durum)), h('span', null, x.tur),
        yon ? h('span', null, '· ' + x.ad + (x.bolum ? ' (' + x.bolum + ')' : '')) : null, h('span', { style: 'flex:1' }), ...eylem),
      h('div', { class: 'alt', style: 'margin-top:4px' }, izinTarihAralik(x.ilkTarih, x.sonTarih) + ' · ' + x.gunSayisi + ' gün' + (yariGun ? ' (' + yariGun + ' yarım gün)' : '') + (x.vekaleten ? ' · vekaleten: ' + x.vekaleten : '') + (x.aciklama ? ' · ' + x.aciklama : '')),
      x.durum === 'REDDEDILDI' && x.retNedeni ? h('div', { class: 'alt', style: 'color:var(--kotu,#b00020)' }, 'Ret nedeni: ' + x.retNedeni) : null,
      yon && b && x.cakisanAtama > 0 ? h('div', { class: 'alt', style: 'color:var(--uyari)' }, '⚠ Bu günlerde ' + x.cakisanAtama + ' görev ataması var; onaylarken karar sorulacak.') : null, ...ek);
  }

  async function onayla(x, karar) {
    try { await Kopru.cagir('izinOnayla', { id: x.id, karar }); d.cakisma = null; toast(x.kod + ' onaylandı.'); await yukle(); }
    catch (e) { if (e.kod === 'cakisma') { d.cakisma = { mesaj: x.kod + ' (' + x.ad + '): ' + e.message, devam: () => onayla(x, 'CIKAR') }; ciz(); } else hata(e); }
  }

  function izinListesi() {
    const bekleyen = d.izin.filter((x) => x.durum === 'ONAY_BEKLIYOR');
    return h('section', { style: 'display:flex;flex-direction:column;gap:8px' },
      h('h2', { style: 'margin:0' }, yon ? 'İzin talepleri' + (bekleyen.length ? ' (' + bekleyen.length + ' bekleyen)' : '') : 'İzinlerim'),
      d.izin.length ? d.izin.map(izinSatiri) : h('div', { class: 'kart', style: 'color:var(--soluk)' }, 'Kayıt yok.'));
  }

  function raporFormu() {
    const f = d.rF;
    const bas = h('input', { type: 'text', class: 'metin', placeholder: 'GG.AA.YYYY', value: f.bas, style: 'width:130px', 'aria-label': 'Rapor ilk gün' });
    const bit = h('input', { type: 'text', class: 'metin', placeholder: 'GG.AA.YYYY', value: f.bit, style: 'width:130px', 'aria-label': 'Rapor son gün' });
    const ac = h('textarea', { class: 'metin', rows: '2', maxlength: '300', style: 'width:100%;box-sizing:border-box', placeholder: 'Açıklama (isteğe bağlı)' }, f.aciklama);
    const oku = () => { f.bas = bas.value; f.bit = bit.value; f.aciklama = ac.value; };
    const ev = d.rapForm.evrak;
    return h('section', { class: 'kart' }, h('h2', null, 'Rapor beyanı'),
      h('div', { class: 'alt', style: 'margin-bottom:8px' }, 'Evrak zorunludur (PDF, JPG veya PNG; en fazla 10 MB). Rapor izinden önceliklidir: aynı günlerdeki izin iptal olur, o günlerdeki görevler durur ve Yöneticiye "ikame gerekli" bildirimi gider.'),
      h('div', { style: 'display:flex;flex-direction:column;gap:10px' }, personSec('rapor'),
        h('div', { class: 'satir' }, h('label', null, 'İlk gün ', bas), h('label', null, 'Son gün ', bit)), ac,
        h('div', { class: 'satir', style: 'align-items:center' },
          h('button', { type: 'button', onclick: async () => { oku(); try { const r = await Kopru.cagir('raporEvrakSec', {}); if (!r.iptal) { d.rapForm.evrak = r; ciz(); } } catch (e) { hata(e); } } }, ev ? 'Evrakı değiştir…' : 'Evrak seç…'),
          ev ? h('span', null, ev.ad + ' (' + izinBayt(ev.boyut) + ')') : h('span', { style: 'color:var(--soluk)' }, 'Evrak seçilmedi')),
        h('div', { class: 'satir' }, h('button', { class: 'ana', type: 'button', onclick: async () => {
          oku();
          const b = talepTarihOku(f.bas), s = talepTarihOku(f.bit || f.bas);
          if (!b || !s) { toast('Tarihi GG.AA.YYYY biçiminde yazın.', 'kotu'); return; }
          if (!ev) { toast('Rapor evrakı seçin.', 'kotu'); return; }
          try {
            const r = await Kopru.cagir('raporKaydet', { sicil: d.rapForm.vek ? d.rapForm.vek.sicil : '', ilkTarih: b, sonTarih: s, aciklama: f.aciklama, evrakYol: ev.yol });
            d.rF = { bas: '', bit: '', aciklama: '' }; d.rapForm = { vek: null, evrak: null };
            toast('Rapor kaydedildi (' + (r && r.kod) + ').' + (r && r.cakisanAtama ? ' ' + r.cakisanAtama + ' görev atlaması için Yönetici uyarıldı.' : ''));
            await yukle();
          } catch (e) { hata(e); } } }, 'Raporu kaydet'))));
  }

  function raporSatiri(x) {
    const aktif = x.durum === 'AKTIF';
    const ek = [];
    if (d.rapIptalId === x.id) {
      const n = h('input', { type: 'text', class: 'metin', maxlength: '300', placeholder: 'İptal nedeni (zorunlu)', style: 'flex:1;min-width:220px' });
      ek.push(h('div', { class: 'satir', style: 'margin-top:6px' }, n, h('button', { type: 'button', onclick: async () => { try { await Kopru.cagir('raporIptal', { id: x.id, neden: n.value }); toast('Rapor iptal edildi.'); d.rapIptalId = null; await yukle(); } catch (e) { hata(e); } } }, 'İptali kaydet')));
    }
    if (d.rapDuzeltId === x.id && yon) {
      const b = h('input', { type: 'text', class: 'metin', value: takvimTarihYaz(x.ilkTarih), style: 'width:130px', 'aria-label': 'Yeni ilk gün', placeholder: 'GG.AA.YYYY' });
      const s2 = h('input', { type: 'text', class: 'metin', value: takvimTarihYaz(x.sonTarih), style: 'width:130px', 'aria-label': 'Yeni son gün', placeholder: 'GG.AA.YYYY' });
      const n = h('input', { type: 'text', class: 'metin', maxlength: '250', placeholder: 'Düzeltme nedeni (isteğe bağlı)', style: 'flex:1;min-width:200px' });
      ek.push(h('div', { class: 'satir', style: 'margin-top:6px;align-items:center' }, h('label', null, 'İlk gün ', b), h('label', null, 'Son gün ', s2), n, h('button', { class: 'ana', type: 'button', onclick: async () => {
        const i1 = talepTarihOku(b.value), i2 = talepTarihOku(s2.value);
        if (!i1 || !i2) { toast('Tarihi GG.AA.YYYY biçiminde yazın.', 'kotu'); return; }
        try { const r = await Kopru.cagir('raporDuzelt', { id: x.id, ilkTarih: i1, sonTarih: i2, neden: n.value }); toast('Rapor düzeltildi' + (r.izinIptal ? '; ' + r.izinIptal + ' izin günü iptal oldu' : '') + (r.cakisanAtama ? '; ' + r.cakisanAtama + ' görev ataması etkileniyor' : '') + '.'); d.rapDuzeltId = null; await yukle(); } catch (e) { hata(e); }
      } }, 'Düzeltmeyi kaydet')));
    }
    return h('div', { class: 'kart', style: 'padding:10px 12px' },
      h('div', { class: 'satir', style: 'align-items:center' }, h('b', null, x.kod), rozet(aktif ? 'Geçerli' : 'İptal', aktif ? 'iyi' : 'soluk'), yon ? h('span', null, x.ad + (x.bolum ? ' (' + x.bolum + ')' : '')) : null, h('span', { style: 'flex:1' }),
        x.eskiKayit ? rozet('Eski kayıt', 'soluk') : h('button', { type: 'button', onclick: async () => { try { const r = await Kopru.cagir('raporEvrakKaydet', { id: x.id }); if (!r.iptal) toast('Evrak kaydedildi.'); } catch (e) { hata(e); } } }, 'Evrakı kaydet'),
        aktif && yon ? h('button', { type: 'button', onclick: () => { d.rapDuzeltId = d.rapDuzeltId === x.id ? null : x.id; ciz(); } }, 'Tarihi düzelt…') : null,
        aktif ? h('button', { type: 'button', onclick: () => { d.rapIptalId = d.rapIptalId === x.id ? null : x.id; ciz(); } }, 'İptal et…') : null),
      h('div', { class: 'alt', style: 'margin-top:4px' }, izinTarihAralik(x.ilkTarih, x.sonTarih) + (x.evrakAdi ? ' · ' + x.evrakAdi + ' (' + izinBayt(x.evrakBoyut) + ')' : '') + (x.vekaleten ? ' · vekaleten: ' + x.vekaleten : '') + (x.aciklama ? ' · ' + x.aciklama : '')),
      aktif && x.cakisanAtama > 0 ? h('div', { class: 'alt', style: 'color:var(--uyari)' }, '⚠ Bu aralıkta ' + x.cakisanAtama + ' görev ataması duruyor; ikame için Atama ekranını kullanın.') : null,
      !aktif && x.iptalNedeni ? h('div', { class: 'alt' }, 'İptal nedeni: ' + x.iptalNedeni) : null, ...ek);
  }

  function raporListesi() {
    return h('section', { style: 'display:flex;flex-direction:column;gap:8px' }, h('h2', { style: 'margin:0' }, yon ? 'Raporlar' : 'Raporlarım'),
      d.rapor.length ? d.rapor.map(raporSatiri) : h('div', { class: 'kart', style: 'color:var(--soluk)' }, 'Kayıt yok.'));
  }

  function ciz() {
    kap.replaceChildren(...[h('h1', { style: 'margin:0' }, saha ? 'Görevlerim' : 'İzin ve rapor'), bildirimBandi(), cakismaKutusu(), gorevBolumu(),
      h('div', { style: 'display:flex;flex-wrap:wrap;gap:14px;align-items:flex-start' },
        h('div', { style: 'flex:1 1 420px;min-width:0;display:flex;flex-direction:column;gap:14px' }, izinFormu(), izinListesi()),
        h('div', { style: 'flex:1 1 420px;min-width:0;display:flex;flex-direction:column;gap:14px' }, raporFormu(), raporListesi()))].filter(Boolean));
  }

  ciz();
  await yukle();
  return kap;
}
