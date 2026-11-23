// Dilim 8: atanmış talepte iptal, erken bitiş, çıkarma, ikame, revize ve sorumlu devri paneli ("Yönet…").
function revizeDurumAd(d) { return ({ BEKLIYOR: 'Onay bekliyor', ONAYLANDI: 'Uygulandı', REDDEDILDI: 'Reddedildi', GERI_CEKILDI: 'Geri çekildi' })[d] || d; }
function revizeDurumTur(d) { return ({ BEKLIYOR: 'uyari', ONAYLANDI: 'iyi', REDDEDILDI: 'kotu', GERI_CEKILDI: 'soluk' })[d] || 'soluk'; }

async function talepYonetPaneli(talepId, geri) {
  const yon = S.gorunum === 'YONETICI';
  const st = { t: null, revizeler: [], devir: [], acik: '', ikame: null, cakisma: null, yeniKisi: null, rv: null, musait: {}, fazla: null };
  const kap = h('div', { style: 'display:flex;flex-direction:column;gap:14px;min-width:0' });

  async function yukle() {
    st.t = await Kopru.cagir('talepGetir', { id: talepId });
    st.revizeler = await Kopru.cagir('revizeListe', { talepId });
    st.devir = await Kopru.cagir('sorumluDevirListe', { talepId });
    st.musait = {};
    for (const x of st.revizeler.filter((r) => r.durum === 'BEKLIYOR' && (r.gunler || []).length)) {
      try { st.musait[x.id] = await Kopru.cagir('revizeMusaitlik', { id: x.id }); } catch (e) { /* bilgi amaçlı; onayı engellemez */ }
    }
    ciz();
  }
  // Onay: kişi sayısı düşürülüyorsa önce çıkarılacak kişiler seçtirilir (Yönetici seçer).
  async function onayla(x) {
    try {
      const f = (x.gunler || []).length ? await Kopru.cagir('revizeFazlalik', { id: x.id }) : [];
      if (!f.length) { await Kopru.cagir('revizeOnayla', { id: x.id }); toast('Revize uygulandı.'); st.fazla = null; await yukle(); return; }
      st.fazla = { id: x.id, satirlar: f, secili: new Set() }; ciz();
    } catch (e) { hata(e); }
  }
  function fazlaKutusu(x) {
    if (!st.fazla || st.fazla.id !== x.id) return null;
    const grup = new Map();
    for (const r of st.fazla.satirlar) { const k = r.tarih + '|' + r.zaman; if (!grup.has(k)) grup.set(k, []); grup.get(k).push(r); }
    return h('div', { class: 'kart', style: 'margin-top:8px;border-color:var(--uyari,#c60)' },
      h('b', null, 'Kişi sayısı azalıyor: çıkarılacak kişileri seçin'),
      [...grup.values()].map((l) => h('div', { style: 'margin-top:6px' },
        h('div', { class: 'alt' }, takvimTarihYaz(l[0].tarih) + ' · ' + atamaTamAd(l[0].zaman) + ' — ' + l[0].atanmis + ' atanmış, ' + l[0].yeni + ' istenen: ' + l[0].fazla + ' kişi çıkarılmalı'),
        l.map((r) => h('label', { class: 'onay' }, h('input', { type: 'checkbox', checked: st.fazla.secili.has(r.atamaId), onchange: (e) => { if (e.target.checked) st.fazla.secili.add(r.atamaId); else st.fazla.secili.delete(r.atamaId); } }), ' ' + r.ad)))),
      h('div', { class: 'satir', style: 'margin-top:8px' }, h('button', { class: 'ana', type: 'button', onclick: async () => {
        try { await Kopru.cagir('revizeOnayla', { id: x.id, cikar: [...st.fazla.secili] }); toast('Seçilenler görevden çıkarıldı, revize uygulandı.'); st.fazla = null; await yukle(); } catch (e) { hata(e); }
      } }, 'Seçilenleri çıkar ve onayla'), h('button', { type: 'button', onclick: () => { st.fazla = null; ciz(); } }, 'Vazgeç')));
  }
  const MUSAIT_AD = { MUSAIT: 'müsait', GOREV: 'başka görevde', IZIN: 'izinli', RAPOR: 'raporlu' };
  function musaitSatiri(x) {
    const m = st.musait[x.id];
    if (!m || !m.length) return null;
    const sorun = m.filter((r) => r.durum !== 'MUSAIT');
    return h('div', { class: sorun.length ? 'mesaj kotu' : 'alt', style: 'margin-top:6px' },
      h('b', null, 'Eklenen günlerde atanmış kişilerin durumu: '),
      sorun.length ? sorun.map((r) => r.ad + ' ' + takvimTarihYaz(r.tarih) + ' ' + atamaTamAd(r.zaman) + ' ' + MUSAIT_AD[r.durum]).join(' · ') : 'hepsi müsait');
  }
  async function dene(is, mesaj, kapat) {
    try { await is(); if (mesaj) toast(mesaj); st.acik = ''; st.ikame = null; st.cakisma = null; st.yeniKisi = null; st.rv = null; if (kapat) geri(true); else await yukle(); } catch (e) { hata(e); }
  }
  const alan = (yer, uz) => h('input', { type: 'text', class: 'metin', placeholder: yer, 'aria-label': yer, maxlength: '300', style: 'flex:1;min-width:' + (uz || 240) + 'px' });

  function gunTablo() {
    const t = st.t;
    return h('div', { style: 'overflow:auto' }, h('table', { style: 'border-collapse:collapse;width:100%' },
      h('thead', null, h('tr', null, ['Tarih', 'Dilim', 'İstenen', 'Atananlar'].map((x) => h('th', { style: 'text-align:left;padding:6px 8px;border-bottom:1px solid var(--cizgi)' }, x)))),
      h('tbody', null, t.gunler.map((g) => h('tr', null,
        h('td', { style: 'padding:6px 8px;border-bottom:1px solid var(--cizgi);white-space:nowrap' }, takvimTarihYaz(g.tarih) + ' ' + takvimGun(g.tarih)),
        h('td', { style: 'padding:6px 8px;border-bottom:1px solid var(--cizgi)' }, atamaTamAd(g.zaman)),
        h('td', { style: 'padding:6px 8px;border-bottom:1px solid var(--cizgi)' }, String(g.kisi)),
        h('td', { style: 'padding:6px 8px;border-bottom:1px solid var(--cizgi)' }, (g.atananlar || []).length ? (g.atananlar || []).map((a) => h('span', { class: 'satir', style: 'display:inline-flex;gap:6px;align-items:center;margin-right:10px' }, a.ad,
          yon ? h('button', { type: 'button', title: 'Bu gün için görevden çıkar', onclick: () => { st.acik = 'cikar'; st.cikar = { sicil: a.sicil, ad: a.ad, tarih: g.tarih, zaman: g.zaman }; ciz(); } }, 'Çıkar') : null,
          yon ? h('button', { type: 'button', title: 'Bu kişinin yerine başkasını ata', onclick: () => { st.acik = 'ikame'; st.ikame = { sicil: a.sicil, ad: a.ad }; st.yeniKisi = null; ciz(); } }, 'İkame…') : null)) : h('span', { style: 'color:var(--soluk)' }, '—')))))));
  }

  function cakismaKutusu() {
    if (!st.cakisma) return null;
    return h('section', { class: 'mesaj uyari', style: 'border:2px solid var(--uyari)' }, h('h2', { style: 'margin:0 0 8px;font-size:16px' }, 'Çakışma kararı'), h('div', null, st.cakisma.mesaj),
      h('div', { class: 'alt', style: 'margin:8px 0;color:inherit' }, 'Sistem kendi başına karar vermez. İzin ve rapor çakışmasında bu seçenek yoktur (işlem reddedilir).'),
      h('div', { class: 'satir' }, h('button', { type: 'button', onclick: () => { st.cakisma = null; ciz(); } }, 'Vazgeç'),
        h('button', { class: 'ana', type: 'button', onclick: () => st.cakisma.devam() }, 'Çakışan görevden çıkar ve ikameyi uygula')));
  }

  function ikameFormu() {
    if (st.acik !== 'ikame' || !st.ikame) return null;
    const bas = h('input', { type: 'text', class: 'metin', placeholder: 'GG.AA.YYYY (boş = bugünden)', style: 'width:200px', 'aria-label': 'İkame başlangıç tarihi' });
    const neden = alan('Neden (isteğe bağlı)');
    async function uygula(karar) {
      if (!st.yeniKisi) { toast('Yeni kişiyi seçin.', 'kotu'); return; }
      let b = '';
      if (bas.value.trim()) { b = talepTarihOku(bas.value); if (!b) { toast('Tarihi GG.AA.YYYY biçiminde yazın.', 'kotu'); return; } }
      try {
        const r = await Kopru.cagir('atamaIkame', { talepId, eski: st.ikame.sicil, yeni: st.yeniKisi.sicil, bastan: b, karar, neden: neden.value });
        toast('İkame yapıldı (' + r.degisen + ' kişi-gün).' + (r.uyari ? ' ' + r.uyari : '')); st.acik = ''; st.ikame = null; st.cakisma = null; st.yeniKisi = null; await yukle();
      } catch (e) { if (e.kod === 'cakisma') { st.cakisma = { mesaj: e.message, devam: () => uygula('CIKAR') }; ciz(); } else hata(e); }
    }
    return h('section', { class: 'kart' }, h('h2', null, 'İkame: ' + st.ikame.ad + ' yerine'),
      h('div', { class: 'alt', style: 'margin-bottom:8px' }, 'Bu kişinin bu talepteki, seçilen tarihten itibaren tüm aktif günleri yeni kişiye geçer; eski kişi ve yeni kişi bilgilendirilir.'),
      st.yeniKisi ? h('div', { class: 'satir', style: 'align-items:center' }, rozet(st.yeniKisi.ad + ' (' + st.yeniKisi.sicil + ')', 'bilgi'), h('button', { type: 'button', onclick: () => { st.yeniKisi = null; ciz(); } }, 'Değiştir'))
        : talepPersonelAra('Yeni kişinin adını yazın…', (p) => { st.yeniKisi = { sicil: p.sicil, ad: p.ad }; ciz(); }),
      h('div', { class: 'satir', style: 'margin-top:8px' }, bas, neden),
      h('div', { class: 'satir', style: 'margin-top:8px' }, h('button', { class: 'ana', type: 'button', onclick: () => uygula('REDDET') }, 'İkameyi uygula'), h('button', { type: 'button', onclick: () => { st.acik = ''; st.ikame = null; ciz(); } }, 'Vazgeç')));
  }

  function cikarFormu() {
    if (st.acik !== 'cikar' || !st.cikar) return null;
    const c = st.cikar, neden = alan('Çıkarma nedeni (zorunlu)');
    return h('section', { class: 'kart' }, h('h2', null, 'Görevden çıkar: ' + c.ad), h('div', { class: 'alt', style: 'margin-bottom:8px' }, takvimTarihYaz(c.tarih) + ' ' + atamaTamAd(c.zaman) + ' atamasını kaldırır (kişiye ve sorumluya bildirim gider).'),
      h('div', { class: 'satir' }, neden, h('button', { class: 'ana', type: 'button', onclick: () => dene(() => Kopru.cagir('atamaCikar', { talepId, sicil: c.sicil, tarih: c.tarih, zaman: c.zaman, neden: neden.value }), 'Görevden çıkarıldı.') }, 'Çıkar'),
        h('button', { type: 'button', onclick: () => { st.acik = ''; ciz(); } }, 'Vazgeç')));
  }

  function erkenFormu() {
    const son = h('input', { type: 'text', class: 'metin', placeholder: 'Yeni son gün GG.AA.YYYY', style: 'width:200px', 'aria-label': 'Yeni son gün' }), neden = alan('Neden (zorunlu)');
    return h('section', { class: 'kart' }, h('h2', null, 'Erken bitiş'), h('div', { class: 'alt', style: 'margin-bottom:8px' }, 'Yeni son günden sonraki gün/dilimler ve atamalar kalkar; etkilenen kişilere bildirim gider.'),
      h('div', { class: 'satir' }, son, neden, h('button', { class: 'ana', type: 'button', onclick: () => { const t = talepTarihOku(son.value); if (!t) { toast('Tarihi GG.AA.YYYY biçiminde yazın.', 'kotu'); return; } dene(() => Kopru.cagir('talepErkenBitir', { id: talepId, yeniSon: t, neden: neden.value }), 'Erken bitiş uygulandı.'); } }, 'Uygula'),
        h('button', { type: 'button', onclick: () => { st.acik = ''; ciz(); } }, 'Vazgeç')));
  }

  function iptalFormu() {
    const neden = alan('İptal nedeni (zorunlu)');
    return h('section', { class: 'kart' }, h('h2', null, 'Görevi iptal et'), h('div', { class: 'alt', style: 'margin-bottom:8px' }, 'Tüm atamalar kaldırılır, atanan kişilere bildirim gider; talep "İptal" olur. Başlamış görevde "Erken bitiş" kullanın.'),
      h('div', { class: 'satir' }, neden, h('button', { class: 'ana', type: 'button', onclick: () => { if (!confirm(st.t.kod + ' görevi iptal edilsin mi?')) return; dene(() => Kopru.cagir('talepIptal', { id: talepId, neden: neden.value }), 'Görev iptal edildi.', true); } }, 'İptal et'),
        h('button', { type: 'button', onclick: () => { st.acik = ''; ciz(); } }, 'Vazgeç')));
  }

  function devirFormu() {
    const neden = alan('Neden (isteğe bağlı)');
    return h('section', { class: 'kart' }, h('h2', null, 'Sorumlu devri'), h('div', { class: 'alt', style: 'margin-bottom:8px' }, 'Şu anki sorumlu: ' + st.t.sorumluAdi + '. Yeni sorumlu ve eski sorumlu bilgilendirilir.'),
      st.yeniKisi ? h('div', { class: 'satir', style: 'align-items:center' }, rozet(st.yeniKisi.ad + ' (' + st.yeniKisi.sicil + ')', 'bilgi'), h('button', { type: 'button', onclick: () => { st.yeniKisi = null; ciz(); } }, 'Değiştir'))
        : talepPersonelAra('Yeni sorumlunun adını yazın…', (p) => { st.yeniKisi = { sicil: p.sicil, ad: p.ad }; ciz(); }),
      h('div', { class: 'satir', style: 'margin-top:8px' }, neden, h('button', { class: 'ana', type: 'button', onclick: () => { if (!st.yeniKisi) { toast('Yeni sorumluyu seçin.', 'kotu'); return; } dene(() => Kopru.cagir('sorumluDevret', { talepId, yeniSicil: st.yeniKisi.sicil, neden: neden.value }), 'Sorumlu devredildi.', true); } }, 'Devret'),
        h('button', { type: 'button', onclick: () => { st.acik = ''; st.yeniKisi = null; ciz(); } }, 'Vazgeç')));
  }

  function revizeFormu() {
    const t = st.t;
    if (!st.rv) st.rv = { metin: t.gorevMetni || '', nitelik: t.nitelik || '', sb: t.saatBaslangic, sbit: t.saatBitis, gunler: t.gunler.map((g) => ({ tarih: g.tarih, zaman: g.zaman, kisi: g.kisi, atanan: (g.atananlar || []).length })) };
    const r = st.rv;
    const metin = h('textarea', { class: 'metin', rows: '3', maxlength: '1000', style: 'width:100%;box-sizing:border-box' }, r.metin);
    const nitelik = h('input', { type: 'text', class: 'metin', maxlength: '1000', value: r.nitelik, style: 'width:100%;box-sizing:border-box', 'aria-label': 'Saha / Operasyon Notu' });
    const sb = h('input', { type: 'text', class: 'metin', value: r.sb, style: 'width:90px', 'aria-label': 'Başlangıç saati' }), sbit = h('input', { type: 'text', class: 'metin', value: r.sbit, style: 'width:90px', 'aria-label': 'Bitiş saati' });
    const neden = alan('Revize nedeni (isteğe bağlı)');
    const kisiler = r.gunler.map((g) => { const i = h('input', { type: 'number', class: 'metin', min: String(Math.max(1, g.atanan)), max: '500', value: String(g.kisi), style: 'width:80px', 'aria-label': takvimTarihYaz(g.tarih) + ' kişi sayısı' }); i.addEventListener('input', () => { g.kisi = Number(i.value) || g.kisi; }); return h('div', { class: 'satir', style: 'align-items:center' }, h('span', { style: 'min-width:190px' }, takvimTarihYaz(g.tarih) + ' ' + takvimGun(g.tarih) + ' · ' + atamaTamAd(g.zaman)), i, h('span', { class: 'alt' }, 'atanan ' + g.atanan)); });
    return h('section', { class: 'kart' }, h('h2', null, yon ? 'Revize (doğrudan uygulanır)' : 'Revize iste'),
      h('div', { class: 'alt', style: 'margin-bottom:8px' }, (yon ? 'Değişiklik hemen uygulanır.' : 'Değişiklik Yönetici onayından sonra uygulanır.') + ' Atanmış kişiden az kişi sayısı yazılamaz; önce kişiyi çıkarın.'),
      h('div', { style: 'display:flex;flex-direction:column;gap:10px' }, h('label', null, 'Görev metni'), metin, h('label', null, 'Saha / Operasyon Notu'), nitelik,
        h('div', { class: 'satir' }, h('label', null, 'Saat ', sb), h('label', null, '– ', sbit)), h('label', null, 'Gün başına kişi sayısı'), ...kisiler, neden,
        h('div', { class: 'satir' }, h('button', { class: 'ana', type: 'button', onclick: () => {
          const gonder = { talepId, neden: neden.value };
          if (metin.value.trim() !== (t.gorevMetni || '')) gonder.gorevMetni = metin.value;
          if (nitelik.value.trim() !== (t.nitelik || '')) gonder.nitelik = nitelik.value;
          if (sb.value.trim() !== t.saatBaslangic || sbit.value.trim() !== t.saatBitis) { gonder.saatBaslangic = sb.value.trim(); gonder.saatBitis = sbit.value.trim(); }
          if (r.gunler.some((g, i) => g.kisi !== t.gunler[i].kisi)) gonder.gunler = r.gunler.map((g) => ({ tarih: g.tarih, zaman: g.zaman, kisi: g.kisi }));
          if (Object.keys(gonder).length === 2) { toast('Değişen bir alan yok.', 'kotu'); return; }
          dene(() => Kopru.cagir('revizeIste', gonder), yon ? 'Revize uygulandı.' : 'Revize isteği gönderildi; Yönetici onayı bekleniyor.');
        } }, yon ? 'Revizeyi uygula' : 'Revize iste'), h('button', { type: 'button', onclick: () => { st.acik = ''; st.rv = null; ciz(); } }, 'Vazgeç'))));
  }

  function revizeListesi() {
    if (!st.revizeler.length) return null;
    const ozet = (x) => [x.gorevMetni ? 'metin' : null, x.nitelik ? 'saha notu' : null, x.saatBaslangic ? 'saat ' + x.saatBaslangic + '–' + x.saatBitis : null, (x.gunler || []).length ? 'gün/kişi sayısı' : null].filter(Boolean).join(', ');
    return h('section', { style: 'display:flex;flex-direction:column;gap:8px' }, h('h2', { style: 'margin:0' }, 'Revizeler'),
      st.revizeler.map((x) => {
        const ret = st.retId === x.id ? (() => { const n = alan('Ret nedeni (zorunlu)'); return h('div', { class: 'satir', style: 'margin-top:6px' }, n, h('button', { type: 'button', onclick: () => dene(() => Kopru.cagir('revizeReddet', { id: x.id, neden: n.value }), 'Revize reddedildi.') }, 'Reddi kaydet')); })() : null;
        return h('div', { class: 'kart', style: 'padding:10px 12px' }, h('div', { class: 'satir', style: 'align-items:center' }, h('b', null, x.kod), rozet(revizeDurumAd(x.durum), revizeDurumTur(x.durum)), h('span', { class: 'alt' }, x.isteyen + ' · ' + String(x.tarih).slice(0, 16).replace('T', ' ')), h('span', { style: 'flex:1' }),
          x.durum === 'BEKLIYOR' && yon ? h('button', { class: 'ana', type: 'button', onclick: () => onayla(x) }, 'Onayla') : null,
          x.durum === 'BEKLIYOR' && yon ? h('button', { type: 'button', onclick: () => { st.retId = st.retId === x.id ? null : x.id; ciz(); } }, 'Reddet…') : null,
          x.durum === 'BEKLIYOR' ? h('button', { type: 'button', onclick: () => dene(() => Kopru.cagir('revizeGeriCek', { id: x.id }), 'Revize geri çekildi.') }, 'Geri çek') : null),
          h('div', { class: 'alt', style: 'margin-top:4px' }, 'Değişen: ' + (ozet(x) || '—') + (x.neden ? ' · ' + x.neden : '')),
          x.retNedeni ? h('div', { class: 'alt', style: 'color:var(--kotu,#b00020)' }, 'Ret nedeni: ' + x.retNedeni) : null, x.durum === 'BEKLIYOR' ? musaitSatiri(x) : null, x.durum === 'BEKLIYOR' && yon ? fazlaKutusu(x) : null, ret);
      }));
  }

  function ciz() {
    const t = st.t, acik = t.durum === 'KISMEN_ATANDI' || t.durum === 'TAMAMEN_ATANDI';
    const dugme = (id, ad) => h('button', { type: 'button', class: st.acik === id ? 'ana' : '', onclick: () => { st.acik = st.acik === id ? '' : id; st.yeniKisi = null; st.rv = null; ciz(); } }, ad);
    const kapat = [h('h1', { style: 'margin:0;font-size:20px' }, t.kod + ' · yönet'), rozet(talepDurumAd(t.durum), talepDurumTur(t.durum)), h('span', { style: 'flex:1' }), h('button', { type: 'button', onclick: () => geri(false) }, 'Listeye dön')];
    kap.replaceChildren(...[h('div', { class: 'satir', style: 'align-items:center' }, ...kapat),
      h('section', { class: 'kart' }, h('div', { style: 'line-height:1.7' }, h('div', null, '📑 ' + t.ana + ' › ' + t.alt + ' › ' + t.faaliyet), h('div', null, '📍 ' + t.konum + ' · 🕣 ' + String(t.saatBaslangic).replace(':', '.') + ' - ' + String(t.saatBitis).replace(':', '.')),
        h('div', null, '🧍‍♂️ Proje sorumlusu: ' + t.sorumluAdi), t.gorevMetni ? h('div', { style: 'color:var(--soluk)' }, t.gorevMetni) : null), h('div', { style: 'margin-top:8px' }, gunTablo())),
      acik ? h('div', { class: 'satir' }, dugme('revize', yon ? 'Revize…' : 'Revize iste…'), dugme('erken', 'Erken bitir…'), dugme('iptal', 'Görevi iptal et…'), yon ? dugme('devir', 'Sorumlu devret…') : null) : h('div', { class: 'mesaj bilgi' }, 'Bu durumdaki talepte işlem yapılamaz.'),
      cakismaKutusu(), ikameFormu(), cikarFormu(), st.acik === 'revize' ? revizeFormu() : null, st.acik === 'erken' ? erkenFormu() : null, st.acik === 'iptal' ? iptalFormu() : null, st.acik === 'devir' ? devirFormu() : null,
      revizeListesi(),
      st.devir.length ? h('section', { class: 'kart' }, h('h2', null, 'Sorumlu devir geçmişi'), st.devir.map((d) => h('div', { class: 'alt' }, String(d.tarih).slice(0, 16).replace('T', ' ') + ' · ' + d.eski + ' → ' + d.yeni + (d.neden ? ' · ' + d.neden : '')))) : null].filter(Boolean));
  }

  await yukle();
  return kap;
}
