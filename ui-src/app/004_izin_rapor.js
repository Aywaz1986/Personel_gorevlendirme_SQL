// Dilim 7 + 25: izin / sağlık raporu / kişisel görev ekranı. Saha: "Görevlerim"; Sorumlu ve Yönetici: "İzin ve rapor".
// Görünüm "Personel İzin ve Sağlık Raporu Yönetimi" prototipine göredir (CSS: ui-src/css/izv.css, kapsam .izv). Sunucu komutları değişmedi.
const IZIN_TURLERI = ['Yıllık izin', 'Mazeret izni', 'Ücretsiz izin', 'İdari izin', 'Diğer'];
const IZV_DURUM = { ONAY_BEKLIYOR: ['Onay bekliyor', 'st-ONAY_BEKLIYOR'], ONAYLANDI: ['Onaylandı', 'st-ONAYLANDI'], REDDEDILDI: ['Reddedildi', 'st-REDDEDILDI'],
  GERI_CEKILDI: ['Geri çekildi / iptal', 'st-GERI_CEKILDI'], RAPORLA_IPTAL: ['Rapor nedeniyle iptal', 'st-RAPOR_NEDENIYLE_IPTAL'] };
function izinDurumAd(d) { return (IZV_DURUM[d] || [d])[0]; }
function izinDurumTur(d) { return ({ ONAY_BEKLIYOR: 'uyari', ONAYLANDI: 'iyi', REDDEDILDI: 'kotu', GERI_CEKILDI: 'soluk', RAPORLA_IPTAL: 'soluk' })[d] || 'soluk'; }
function izinBayt(n) { return n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'; }
function izinTarihAralik(a, b) { return a === b ? takvimTarihYaz(a) : takvimTarihYaz(a) + ' – ' + takvimTarihYaz(b); }
function izvAg(z) { return z === 'TAM' ? 1 : 0.5; }
function izvSayi(n) { return Number(n).toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }); }
function izvKisa(iso) { return iso.slice(8, 10) + '.' + iso.slice(5, 7); }
function izvTurSinif(t) { return t === 'Yıllık izin' ? 'badge-type-yillik' : t === 'Mazeret izni' ? 'badge-type-mazeret' : t === 'İdari izin' ? 'badge-type-idari' : 'badge-type-ozel'; }
function izvKapali(x) { return ['REDDEDILDI', 'GERI_CEKILDI', 'RAPORLA_IPTAL'].includes(x.durum); }
function izvDurum(x) { return x.durum === 'ONAYLANDI' && (x.gunler || []).some((g) => g.durum === 'IPTAL') ? ['Kısaltıldı', 'st-KISALTILDI'] : (IZV_DURUM[x.durum] || [x.durum, 'st-GERI_CEKILDI']); }
function izvGunSinif(x, g) {
  if (g.durum !== 'IPTAL') return g.durum;
  return x.durum === 'RAPORLA_IPTAL' ? 'RAPOR_CAKISMA_IPTAL' : x.durum === 'REDDEDILDI' ? 'REDDEDILDI' : x.durum === 'GERI_CEKILDI' ? 'GERI_CEKILDI' : 'ERKEN_DONUS_IPTAL';
}
function izvGunAd(s) { return ({ BEKLIYOR: 'Onay bekliyor', ONAYLI: 'Onaylı', ERKEN_DONUS_IPTAL: 'Erken dönüş / kısaltma iptali', RAPOR_CAKISMA_IPTAL: 'Rapor çakışma iptali', REDDEDILDI: 'Reddedildi', GERI_CEKILDI: 'Geri çekildi' })[s] || s; }
function izvEtkinAg(x) { return izvKapali(x) ? 0 : (x.gunler || []).filter((g) => g.durum !== 'IPTAL').reduce((t, g) => t + izvAg(g.zaman), 0); }
function izvTakvimGun(a, b) { return Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000) + 1; }
function izvDilimAd(x) {
  const z = [...new Set((x.gunler || []).map((g) => g.zaman))];
  return z.length === 1 ? ({ TAM: 'Tam gün', OO: 'Öğleden önce', OS: 'Öğleden sonra' })[z[0]] : 'Karma';
}
function izvPill(opts, ilk, sec) {
  let v = ilk; const g = h('div', { class: 'pill-group' });
  const btn = opts.map(([k, a]) => h('button', { type: 'button', class: 'pill-btn' + (k === v ? ' active' : ''), onclick: () => { v = k; btn.forEach((b, i) => b.classList.toggle('active', opts[i][0] === v)); sec(k); } }, a));
  g.append(...btn); return g;
}
function izvModal(baslik, alt, ...icerik) {
  return pencereAc(baslik, h('div', { class: 'izv izv-modal' }, h('div', { class: 'modal-body' }, alt ? h('p', { class: 'form-card-sub', style: 'margin:0' }, alt) : null, ...icerik)));
}
function izvIndir(ad, satirlar) {
  const a = h('a', { href: URL.createObjectURL(new Blob(['﻿' + satirlar.join('\r\n')], { type: 'text/csv;charset=utf-8' })), download: ad });
  document.body.append(a); a.click(); a.remove();
}

async function izinTatiller() {
  const y = new Date().getFullYear(); let l = [];
  for (const yil of [y, y + 1]) { try { l = l.concat(await Kopru.cagir('takvimListe', { yil })); } catch (e) { /* takvim okunamazsa tatiller atlanmaz */ } }
  return l;
}

// İzin formu: kendi adına talep (saha/sorumlu) ya da yönetici vekaleten kaydı. o: {yon, sicil(), gorevler?(), bitti()}
function izvIzinFormu(d, o) {
  const f = { zaman: 'TAM' };
  const tur = h('select', { class: 'form-control', style: 'width:100%', 'aria-label': 'İzin türü' }, IZIN_TURLERI.map((t) => h('option', { value: t }, t)));
  const bas = h('input', { type: 'text', class: 'form-control', style: 'width:100%', placeholder: 'GG.AA.YYYY', 'aria-label': 'İzin başlangıç' });
  const bit = h('input', { type: 'text', class: 'form-control', style: 'width:100%', placeholder: 'GG.AA.YYYY', 'aria-label': 'İzin bitiş' });
  const atla = h('input', { type: 'checkbox', checked: true });
  const not = h('input', { type: 'text', class: 'form-control', style: 'width:100%', maxlength: '300', placeholder: 'İzin talebiyle ilgili kısa not (isteğe bağlı)', 'aria-label': 'Açıklama' });
  const calc = h('div', { class: 'calc-preview-box' }), cak = h('div');
  const kart = [['TAM', 'Tam gün', '1,0 adam-gün'], ['OO', 'Öğleden önce (ÖÖ)', '0,5 adam-gün'], ['OS', 'Öğleden sonra (ÖS)', '0,5 adam-gün']].map(([v, a, s]) => {
    const k = h('div', { class: 'slot-radio-card' + (v === 'TAM' ? ' selected' : ''), role: 'radio', tabindex: '0', onclick: () => { f.zaman = v; kart.forEach((x) => x.classList.toggle('selected', x.dataset.v === v)); hesap(); } },
      h('span', { style: 'font-weight:800;font-size:.76rem' }, a), h('span', { style: 'font-size:.69rem;color:var(--text-muted)' }, s));
    k.dataset.v = v; return k;
  });
  function hesap() {
    const b = talepTarihOku(bas.value), s = talepTarihOku(bit.value || bas.value);
    calc.replaceChildren();
    if (!b || !s || s < b) { calc.append(h('span', { style: 'color:var(--text-muted)' }, 'Tarihleri GG.AA.YYYY biçiminde girin; net izin süresi burada hesaplanır.')); return; }
    const u = talepGunleriUret(b, s, '', atla.checked ? d.tatiller : []);
    calc.append(h('div', { style: 'display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap' }, h('span', { style: 'font-weight:700;color:var(--text-secondary)' }, 'Hesaplanan net izin süresi:'),
      h('span', { style: 'font-family:var(--font-mono);font-weight:800;color:var(--brand-blue)' }, izvSayi(u.gunler.length * izvAg(f.zaman)) + ' adam-gün (' + u.gunler.length + ' iş günü)')));
    if (u.atlanan.length) calc.append(h('div', { style: 'font-size:.72rem;color:var(--brand-emerald);font-weight:600' }, 'ℹ️ Takvim kuralı uygulandı: ' + u.atlanan.join(', ')));
    const cg = (o.gorevler ? o.gorevler() : []).filter((g) => g.tarih >= b && g.tarih <= s);
    if (cg.length) calc.append(h('div', { class: 'conflict-alert-box', style: 'max-width:none' }, '⚠️ Görev çakışma uyarısı: seçili tarihlerde ' + cg.length + ' görev gününüz var (' + cg[0].ana + (cg[0].konum ? ', ' + cg[0].konum : '') + '); onayda yönetici karar verecek.'));
  }
  async function gonder(karar) {
    const b = talepTarihOku(bas.value), s = talepTarihOku(bit.value || bas.value);
    if (!b || !s) { toast('Tarihi GG.AA.YYYY biçiminde yazın.', 'kotu'); return; }
    if (s < b) { toast('Bitiş tarihi başlangıçtan önce olamaz.', 'kotu'); return; }
    const u = talepGunleriUret(b, s, '', atla.checked ? d.tatiller : []);
    const gunler = u.gunler.map((g) => ({ tarih: g.tarih, zaman: f.zaman }));
    if (!gunler.length) { toast('Seçilen aralıkta çalışılan gün yok.', 'kotu'); return; }
    try {
      const r = await Kopru.cagir('izinKaydet', { sicil: o.sicil(), tur: tur.value, aciklama: not.value, gunler, karar });
      cak.replaceChildren(); bas.value = ''; bit.value = ''; not.value = ''; hesap();
      toast(r && r.durum === 'ONAYLANDI' ? 'İzin kaydedildi ve onaylandı (' + r.kod + ').' : 'İzin talebi gönderildi (' + (r && r.kod) + '). Yönetici onayı bekleniyor.');
      await o.bitti();
    } catch (e) {
      if (e.kod === 'cakisma') cak.replaceChildren(h('div', { class: 'conflict-alert-box', style: 'max-width:none;display:flex;flex-direction:column;gap:8px' },
        h('b', null, 'Çakışma kararı'), h('div', null, e.message),
        h('div', { style: 'font-weight:600' }, 'Sistem kendi başına karar vermez. "Çakışan görevden çıkar" derseniz kişi o günlerde görevden çıkarılır, görev sorumlusuna bildirim gider ve işlem denetim kaydına yazılır.'),
        h('div', { style: 'display:flex;gap:6px;flex-wrap:wrap' }, h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onclick: () => cak.replaceChildren() }, 'Vazgeç'),
          h('button', { type: 'button', class: 'btn btn-danger btn-sm', onclick: () => gonder('CIKAR') }, 'Çakışan görevden çıkar ve izni uygula'))));
      else hata(e);
    }
  }
  [bas, bit].forEach((e) => { e.addEventListener('input', hesap); e.addEventListener('change', hesap); });
  atla.addEventListener('change', hesap);
  hesap();
  const el = h('div', { style: 'display:flex;flex-direction:column;gap:14px' },
    h('div', null, h('label', { class: 'field-label' }, 'İzin türü:'), tur),
    h('div', { class: 'grid-2' }, h('div', null, h('label', { class: 'field-label' }, 'Başlangıç tarihi:'), bas), h('div', null, h('label', { class: 'field-label' }, 'Bitiş tarihi:'), bit)),
    h('div', null, h('label', { class: 'field-label' }, 'Zaman dilimi:'), h('div', { class: 'radio-slot-grid', role: 'radiogroup' }, kart)),
    h('div', null, h('label', { class: 'field-label' }, 'Açıklama (isteğe bağlı):'), not),
    h('label', { style: 'display:flex;gap:6px;align-items:center;font-size:.76rem' }, atla, 'Hafta sonu ve resmi/idari tatil günlerini atla'),
    calc, cak,
    h('div', { style: 'display:flex;justify-content:flex-end' }, h('button', { type: 'button', class: 'btn btn-primary', onclick: () => gonder('REDDET') }, o.yon ? '✓ Kaydet ve onayla' : '📨 İzin talebini onaya gönder')));
  return { el, hesap };
}

// Rapor formu. o: {sicil(), bitti()}
function izvRaporFormu(d, o) {
  let ev = null, hataMsj = '';
  const bas = h('input', { type: 'text', class: 'form-control', style: 'width:100%', placeholder: 'GG.AA.YYYY', 'aria-label': 'Rapor ilk gün' });
  const bit = h('input', { type: 'text', class: 'form-control', style: 'width:100%', placeholder: 'GG.AA.YYYY', 'aria-label': 'Rapor son gün' });
  const not = h('input', { type: 'text', class: 'form-control', style: 'width:100%', maxlength: '300', placeholder: 'Kısa not (isteğe bağlı)', 'aria-label': 'Açıklama' });
  const drop = h('div', { class: 'file-dropzone', role: 'button', tabindex: '0', onclick: async () => {
    try { const r = await Kopru.cagir('raporEvrakSec', {}); if (!r.iptal) { ev = r; hataMsj = ''; boya(); } } catch (e) { ev = null; hataMsj = e.message || String(e); boya(); } } });
  const hataKutu = h('div'), ad = h('div', { style: 'font-family:var(--font-mono);font-size:.75rem;font-weight:800;color:var(--brand-blue)' });
  function boya() {
    drop.replaceChildren(ev ? h('div', { style: 'font-weight:800;color:var(--brand-emerald);font-size:.82rem' }, '✅ Seçilen belge: ' + ev.ad + ' (' + izinBayt(ev.boyut) + ')') : h('div', { style: 'font-weight:700;font-size:.80rem' }, '📄 Rapor dosyasını seçmek için tıklayın'),
      h('div', { style: 'font-size:.71rem;color:var(--text-muted);margin-top:3px' }, ev ? 'Farklı bir dosya seçmek için tıklayın' : 'Yalnızca .pdf, .jpg, .png ve en fazla 10 MB'));
    hataKutu.replaceChildren(...(hataMsj ? [h('div', { class: 'conflict-alert-box', style: 'max-width:none;margin-top:6px' }, '❌ Dosya doğrulama hatası: ' + hataMsj)] : []));
    const b = talepTarihOku(bas.value);
    ad.textContent = 'Ad_Soyad_' + (b ? b.replaceAll('-', '') : 'YYYYMMDD') + '_KOD.' + (ev ? String(ev.ad).split('.').pop().toLowerCase() : 'pdf');
  }
  [bas, bit].forEach((e) => { e.addEventListener('input', boya); e.addEventListener('change', boya); });
  boya();
  async function kaydet() {
    const b = talepTarihOku(bas.value), s = talepTarihOku(bit.value || bas.value);
    if (!b || !s) { toast('Tarihi GG.AA.YYYY biçiminde yazın.', 'kotu'); return; }
    if (s < b) { toast('Bitiş tarihi başlangıçtan önce olamaz.', 'kotu'); return; }
    if (!ev) { hataMsj = 'Rapor belgesi zorunludur. PDF, JPG veya PNG seçin.'; boya(); return; }
    try {
      const r = await Kopru.cagir('raporKaydet', { sicil: o.sicil(), ilkTarih: b, sonTarih: s, aciklama: not.value, evrakYol: ev.yol });
      ev = null; hataMsj = ''; bas.value = ''; bit.value = ''; not.value = ''; boya();
      toast('Rapor kaydedildi (' + (r && r.kod) + ').' + (r && r.cakisanAtama ? ' ' + r.cakisanAtama + ' görev ataması için Yönetici uyarıldı.' : ''));
      await o.bitti();
    } catch (e) { hata(e); }
  }
  return h('div', { style: 'display:flex;flex-direction:column;gap:14px' },
    h('div', { class: 'info-callout' }, h('b', null, 'ℹ️ Sistem kuralı: '), 'Rapor yönetici onayı beklemeden takvime işlenir; aynı günlerdeki izin iptal olur, o günlerdeki görevler durur ve Yöneticiye "ikame gerekli" bildirimi gider.'),
    h('div', { class: 'grid-2' }, h('div', null, h('label', { class: 'field-label' }, 'Rapor ilk günü:'), bas), h('div', null, h('label', { class: 'field-label' }, 'Rapor son günü:'), bit)),
    h('div', null, h('label', { class: 'field-label' }, 'Açıklama (isteğe bağlı):'), not),
    h('div', null, h('label', { class: 'field-label' }, 'Rapor belgesi (PDF, JPG, PNG • en fazla 10 MB):'), drop, hataKutu),
    h('div', { class: 'calc-preview-box' }, h('div', { style: 'font-size:.71rem;color:var(--text-muted);font-weight:700' }, 'Kayıtta evrak dosya adı otomatik standartlaştırılır:'), ad),
    h('div', { style: 'display:flex;justify-content:flex-end' }, h('button', { type: 'button', class: 'btn btn-success', onclick: kaydet }, '🏥 Raporu takvime işle')));
}

async function izinRaporSayfa() {
  const yon = S.gorunum === 'YONETICI', saha = S.gorunum === 'SAHA';
  const d = { gorev: [], izin: [], rapor: [], tatiller: [], bildirim: [], ikame: [], sekme: 'IZIN', izinAra: '', izinDurum: 'ALL', izinTur: 'ALL', arsAra: '', arsTur: 'ALL', ilet: {} };
  const kap = h('div', { class: 'izv izv-sayfa' }), kok = h('div', { class: 'main-stack' });
  kap.append(kok);

  async function yukle() {
    try {
      const isler = [Kopru.cagir('izinListe', {}), Kopru.cagir('raporListe', { iptalDahil: yon }), izinTatiller(), Kopru.cagir('bildirimListe', {})];
      isler.push(saha ? Kopru.cagir('gorevlerim', {}) : yon ? Kopru.cagir('ikameBekleyenler', {}) : Promise.resolve(null));
      const [i, r, t, b, x] = await Promise.all(isler);
      d.izin = i; d.rapor = r; d.tatiller = t; d.bildirim = b; d.gorev = saha ? (x || []) : []; d.ikame = yon ? (x || []) : [];
      ciz(); if (S.sayacYukle) S.sayacYukle();
    } catch (e) { hata(e); }
  }
  S.yenile = yukle;

  // ---- Kendi adına formlar (Sorumlu / Saha) ----
  const kendiIzin = yon ? null : izvIzinFormu(d, { yon: false, sicil: () => '', gorevler: () => d.gorev, bitti: yukle });
  const kendiRapor = yon ? null : izvRaporFormu(d, { sicil: () => '', bitti: yukle });

  // ---- Pencereler ----
  function cakismaPenceresi(mesaj, devam) {
    const kapat = izvModal('Çakışma kararı', null, h('div', { class: 'conflict-alert-box', style: 'max-width:none' }, mesaj),
      h('div', { class: 'info-callout' }, 'Sistem kendi başına karar vermez. "Çakışan görevden çıkar" derseniz kişi o günlerde görevden çıkarılır, görev sorumlusuna bildirim gider ve işlem denetim kaydına yazılır.'),
      h('div', { class: 'modal-footer' }, h('span'), h('div', { style: 'display:flex;gap:8px' }, h('button', { type: 'button', class: 'btn btn-ghost', onclick: () => kapat() }, 'Vazgeç'),
        h('button', { type: 'button', class: 'btn btn-danger', onclick: async () => { kapat(); await devam(); } }, 'Çakışan görevden çıkar ve izni uygula'))));
  }
  async function onayla(x, karar) {
    try { await Kopru.cagir('izinOnayla', { id: x.id, karar }); toast(x.kod + ' onaylandı.'); await yukle(); }
    catch (e) { if (e.kod === 'cakisma') cakismaPenceresi(x.kod + ' (' + x.ad + '): ' + e.message, () => onayla(x, 'CIKAR')); else hata(e); }
  }
  function retPenceresi(x) {
    const n = h('textarea', { rows: '3', class: 'form-control', style: 'width:100%', maxlength: '300', placeholder: 'Örn: İlgili tarihlerde saha kabul testleri planlandığından izin talebi uygun görülmemiştir.' });
    const kapat = izvModal('❌ İzin talebini reddet', x.ad + ' (' + x.kod + ') • ' + izinTarihAralik(x.ilkTarih, x.sonTarih),
      h('div', null, h('label', { class: 'field-label' }, 'Ret açıklaması (zorunlu — personele gösterilir):'), n),
      h('div', { class: 'modal-footer' }, h('span'), h('div', { style: 'display:flex;gap:8px' }, h('button', { type: 'button', class: 'btn btn-ghost', onclick: () => kapat() }, 'Vazgeç'),
        h('button', { type: 'button', class: 'btn btn-danger', onclick: async () => {
          if (n.value.trim().length < 3) { toast('Reddetmek için açıklama girmelisiniz.', 'kotu'); return; }
          try { await Kopru.cagir('izinReddet', { id: x.id, neden: n.value.trim() }); kapat(); toast('İzin reddedildi.'); await yukle(); } catch (e) { hata(e); } } }, 'Talebi reddet'))));
    setTimeout(() => n.focus(), 40);
  }
  function kisaltPenceresi(x) {
    const gunler = (x.gunler || []).slice().sort((a, b) => a.tarih.localeCompare(b.tarih));
    const kutu = gunler.map((g) => { const c = h('input', { type: 'checkbox', checked: g.durum !== 'IPTAL' }); c.disabled = g.durum === 'IPTAL'; return c; });
    kutu.forEach((c, i) => c.addEventListener('change', () => { // yalnızca sondaki günler kısaltılabilir: işareti kaldırılan günden sonrakiler de kalkar, işaret konan günden öncekiler de gelir
      kutu.forEach((o, j) => { if (!o.disabled) { if (c.checked && j < i) o.checked = true; if (!c.checked && j > i) o.checked = false; } }); }));
    const kapat = izvModal('✂️ Erken dönüş / izin süresi kısaltma', x.ad + ' • ' + x.tur + ' (' + x.kod + ')',
      h('div', { class: 'info-callout' }, 'Personel planlanandan erken döndüyse kullanılmayan son günlerin işaretini kaldırın. Yalnızca izin sonundaki günler kısaltılabilir; iptal edilen günler Müsait olur, kullanılan günler korunur.'),
      h('div', { style: 'display:flex;flex-direction:column;gap:8px' }, gunler.map((g, i) => h('label', { style: 'display:flex;align-items:center;justify-content:space-between;padding:9px 12px;border-radius:10px;background:var(--glass-sub-bg);border:1px solid var(--glass-border);cursor:pointer' },
        h('div', { style: 'display:flex;align-items:center;gap:10px' }, kutu[i], h('span', { style: 'font-family:var(--font-mono);font-weight:800' }, takvimTarihYaz(g.tarih)), h('span', { style: 'font-size:.74rem;color:var(--text-secondary)' }, '(' + izvSayi(izvAg(g.zaman)) + ' adam-gün)')),
        h('span', { class: 'day-chip day-chip-' + izvGunSinif(x, g), style: 'cursor:default' }, izvGunAd(izvGunSinif(x, g)))))),
      h('div', { class: 'modal-footer' }, h('span'), h('div', { style: 'display:flex;gap:8px' }, h('button', { type: 'button', class: 'btn btn-ghost', onclick: () => kapat() }, 'Vazgeç'),
        h('button', { type: 'button', class: 'btn btn-success', onclick: async () => {
          const son = gunler.filter((g, i) => kutu[i].checked).map((g) => g.tarih).pop();
          try {
            if (!son) { await Kopru.cagir('izinGeriCek', { id: x.id }); toast(x.kod + ' tümüyle iptal edildi.'); } else { await Kopru.cagir('izinKisalt', { id: x.id, yeniSon: son }); toast(x.kod + ' ' + takvimTarihYaz(son) + ' tarihinde bitecek şekilde kısaltıldı.'); }
            kapat(); await yukle();
          } catch (e) { hata(e); } } }, '✓ Değişiklikleri uygula'))));
  }
  function iptalPenceresi(x) {
    const kapat = izvModal('🚫 Onaylı izni iptal et', null,
      h('p', { style: 'color:var(--text-secondary)' }, h('b', null, x.ad), ' personeline ait ', h('b', null, x.kod), ' (' + izinTarihAralik(x.ilkTarih, x.sonTarih) + ') kaydını tamamen iptal etmek istediğinize emin misiniz?'),
      h('div', { class: 'modal-footer' }, h('span'), h('div', { style: 'display:flex;gap:8px' }, h('button', { type: 'button', class: 'btn btn-ghost', onclick: () => kapat() }, 'Vazgeç'),
        h('button', { type: 'button', class: 'btn btn-danger', onclick: async () => { try { await Kopru.cagir('izinGeriCek', { id: x.id }); kapat(); toast('İzin iptal edildi; personel ilgili günlerde Müsait.'); await yukle(); } catch (e) { hata(e); } } }, 'Evet, izni iptal et'))));
  }
  function gunPenceresi(x, g) {
    const sn = izvGunSinif(x, g);
    const kapat = izvModal('Gün bazlı izin detayı', null,
      h('div', { class: 'doc-preview-mock' }, h('div', null, h('b', null, 'Personel: '), x.ad + ' (Sicil: ' + x.sicil + ')'), h('div', null, h('b', null, 'İzin kaydı: '), x.kod + ' — ' + x.tur), h('div', null, h('b', null, 'Tarih: '), takvimTarihYaz(g.tarih)),
        h('div', null, h('b', null, 'Gün katsayısı: '), izvSayi(izvAg(g.zaman)) + ' adam-gün (' + ({ TAM: 'Tam gün', OO: 'Öğleden önce', OS: 'Öğleden sonra' })[g.zaman] + ')'),
        h('div', null, h('b', null, 'Gün durumu: '), h('span', { class: 'day-chip day-chip-' + sn, style: 'cursor:default' }, izvGunAd(sn)))),
      h('div', { class: 'modal-footer' }, h('span'), h('div', { style: 'display:flex;gap:8px' },
        yon && x.durum === 'ONAYLANDI' ? h('button', { type: 'button', class: 'btn btn-warning btn-sm', onclick: () => { kapat(); kisaltPenceresi(x); } }, '✂️ Gün kırılımını düzenle') : null,
        h('button', { type: 'button', class: 'btn btn-primary btn-sm', onclick: () => kapat() }, 'Kapat'))));
  }
  async function ikamePenceresi(i) {
    try {
      let kapat;
      const panel = await talepYonetPaneli(i.talepId, async () => { kapat(); await yukle(); });
      kapat = pencereAc('İkame / Yönet — ' + i.kod, panel);
    } catch (e) { hata(e); }
  }
  function raporPenceresi(r) {
    const aktif = r.durum === 'AKTIF';
    const b = h('input', { type: 'text', class: 'form-control', style: 'width:100%', placeholder: 'GG.AA.YYYY', value: takvimTarihYaz(r.ilkTarih), 'aria-label': 'Yeni ilk gün' });
    const s2 = h('input', { type: 'text', class: 'form-control', style: 'width:100%', placeholder: 'GG.AA.YYYY', value: takvimTarihYaz(r.sonTarih), 'aria-label': 'Yeni son gün' });
    const dn = h('input', { type: 'text', class: 'form-control', style: 'width:100%', maxlength: '250', placeholder: 'Düzeltme nedeni (isteğe bağlı)' });
    const ipt = h('input', { type: 'text', class: 'form-control', style: 'width:100%', maxlength: '300', placeholder: 'Örn: Mükerrer belge yüklemesi veya okunaksız evrak…' });
    const kapat = izvModal('📄 Sağlık raporu evrak detayı (' + r.kod + ')', (yon ? r.ad + ' (Sicil: ' + r.sicil + ')' : 'Kendi raporunuz'),
      h('div', { class: 'doc-preview-mock' },
        h('div', { style: 'display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap' }, h('span', { style: 'font-weight:800;font-size:.84rem;color:var(--brand-blue)' }, '🏥 İstirahat raporu'),
          r.evrakAdi ? h('span', { class: 'badge badge-type-idari' }, izinBayt(r.evrakBoyut)) : h('span', { class: 'badge badge-type-ozel' }, 'Eski kayıt (evrak yok)')),
        h('div', { style: 'font-size:.75rem;color:var(--text-secondary);line-height:1.5' },
          h('div', null, h('b', null, 'İstirahat süresi: '), izinTarihAralik(r.ilkTarih, r.sonTarih) + ' (' + izvTakvimGun(r.ilkTarih, r.sonTarih) + ' tam gün)'), r.evrakAdi ? h('div', null, h('b', null, 'Evrak: '), r.evrakAdi) : null,
          r.vekaleten ? h('div', null, h('b', null, 'Vekaleten giren: '), r.vekaleten) : null, r.aciklama ? h('div', null, h('b', null, 'Açıklama: '), r.aciklama) : null,
          !aktif && r.iptalNedeni ? h('div', { style: 'color:var(--brand-rose)' }, h('b', null, 'İptal nedeni: '), r.iptalNedeni) : null)),
      aktif && r.cakisanAtama > 0 ? h('div', { class: 'conflict-alert-box', style: 'max-width:none' }, '⚠️ Bu aralıkta ' + r.cakisanAtama + ' görev ataması duruyor; ikame için "Sağlık raporları ve ikame" sekmesindeki uyarıyı kullanın.') : null,
      aktif && yon ? h('div', null, h('div', { style: 'font-weight:800;font-size:.78rem;margin-bottom:8px' }, 'Rapor tarih aralığını düzelt:'),
        h('div', { class: 'grid-2' }, h('div', null, h('label', { class: 'field-label' }, 'İlk gün:'), b), h('div', null, h('label', { class: 'field-label' }, 'Son gün:'), s2)), h('div', { style: 'margin-top:8px' }, dn)) : null,
      aktif ? h('div', null, h('label', { class: 'field-label' }, 'Raporu iptal etme gerekçesi (iptal için zorunlu):'), ipt) : null,
      h('div', { class: 'modal-footer' },
        aktif ? h('button', { type: 'button', class: 'btn btn-danger btn-sm', onclick: async () => {
          if (ipt.value.trim().length < 3) { toast('Raporu iptal etmek için gerekçe girmelisiniz.', 'kotu'); return; }
          try { await Kopru.cagir('raporIptal', { id: r.id, neden: ipt.value.trim() }); kapat(); toast('Rapor iptal edildi.'); await yukle(); } catch (e) { hata(e); } } }, '🚫 Geçersiz raporu iptal et') : h('span'),
        h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' },
          !r.eskiKayit ? h('button', { type: 'button', class: 'btn btn-ghost', onclick: async () => { try { const x = await Kopru.cagir('raporEvrakKaydet', { id: r.id }); if (!x.iptal) toast('Evrak kaydedildi.'); } catch (e) { hata(e); } } }, '💾 Evrakı kaydet') : null,
          h('button', { type: 'button', class: 'btn btn-ghost', onclick: () => kapat() }, 'Kapat'),
          aktif && yon ? h('button', { type: 'button', class: 'btn btn-success', onclick: async () => {
            const i1 = talepTarihOku(b.value), i2 = talepTarihOku(s2.value);
            if (!i1 || !i2) { toast('Tarihi GG.AA.YYYY biçiminde yazın.', 'kotu'); return; }
            if (i2 < i1) { toast('Bitiş tarihi başlangıçtan önce olamaz.', 'kotu'); return; }
            try { const x = await Kopru.cagir('raporDuzelt', { id: r.id, ilkTarih: i1, sonTarih: i2, neden: dn.value }); kapat();
              toast('Rapor düzeltildi' + (x.izinIptal ? '; ' + x.izinIptal + ' izin günü iptal oldu' : '') + (x.cakisanAtama ? '; ' + x.cakisanAtama + ' görev ataması etkileniyor' : '') + '.'); await yukle(); } catch (e) { hata(e); } } }, '✓ Tarih düzeltmesini kaydet') : null)));
  }
  function vekaletPenceresi(ilk) {
    let kisi = null, kapat;
    const kisiKutu = h('div');
    const kisiCiz = () => kisiKutu.replaceChildren(kisi ? h('div', { style: 'display:flex;align-items:center;gap:8px;flex-wrap:wrap' }, h('span', { class: 'badge badge-type-yillik' }, kisi.ad + ' (' + kisi.sicil + ')'), h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onclick: () => { kisi = null; kisiCiz(); } }, 'Kendi adıma'))
      : talepPersonelAra('Kişi adı yazın (boşsa kendi adınıza)…', (p) => { kisi = { sicil: p.sicil, ad: p.ad }; kisiCiz(); }));
    kisiCiz();
    const bitti = async () => { kapat(); await yukle(); };
    const iz = izvIzinFormu(d, { yon: true, sicil: () => kisi ? kisi.sicil : '', bitti }), rp = izvRaporFormu(d, { sicil: () => kisi ? kisi.sicil : '', bitti });
    const kutuIz = h('div', null, iz.el), kutuRp = h('div', null, rp);
    const goster = (v) => { kutuIz.style.display = v === 'IZIN' ? '' : 'none'; kutuRp.style.display = v === 'RAPOR' ? '' : 'none'; };
    goster(ilk);
    const pill = izvPill([['IZIN', 'Vekaleten izin tanımla (anında onaylı)'], ['RAPOR', 'Vekaleten belgeli rapor gir']], ilk, goster);
    pill.style.width = '100%';
    kapat = izvModal('🛡️ Vekaleten izin / sağlık raporu girişi', 'Acil durumlarda Merkez Yönetici yetkisiyle personel adına doğrudan kayıt oluşturun.', pill,
      h('div', null, h('label', { class: 'field-label' }, 'Personel seçimi:'), kisiKutu), kutuIz, kutuRp);
  }

  // ---- Bölümler ----
  function bildirimBandi() {
    if (!d.bildirim.length) return null;
    return h('section', { class: 'info-callout' },
      h('div', { style: 'display:flex;align-items:center;gap:8px;flex-wrap:wrap' }, h('b', null, d.bildirim.length + ' yeni bildirim'), h('span', { style: 'flex:1' }),
        h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onclick: async () => { try { await Kopru.cagir('bildirimOkundu', {}); d.bildirim = []; ciz(); } catch (e) { hata(e); } } }, 'Tümünü okundu say')),
      h('ul', { style: 'margin:6px 0 0;padding-left:18px' }, d.bildirim.map((b) => h('li', null, b.mesaj + ' ', h('span', { style: 'opacity:.7' }, b.tarih)))));
  }
  function ustSerit() {
    return h('section', { class: 'glass-panel', style: 'padding:14px 20px;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px' },
      h('div', null, h('div', { class: 'brand-title' }, saha ? 'İzin ve rapor işlemlerim' : 'İzin ve rapor'),
        h('div', { class: 'brand-subtitle' }, yon ? 'İzin onayları, sağlık raporları ve ikame uyarıları' : 'İzin talebi, belgeli sağlık raporu beyanı ve kayıtlarınız')),
      yon ? h('div', { class: 'header-actions' }, h('button', { type: 'button', class: 'btn btn-primary', onclick: () => vekaletPenceresi('IZIN') }, '＋ Vekaleten izin tanımla'),
        h('button', { type: 'button', class: 'btn btn-ghost', onclick: () => vekaletPenceresi('RAPOR') }, '🏥 Vekaleten rapor gir')) : null);
  }
  function kpiler() {
    const bugun = takvimIso(new Date()), ay = bugun.slice(0, 7);
    const bek = d.izin.filter((x) => x.durum === 'ONAY_BEKLIYOR').length;
    const kisi = new Set();
    let izG = 0, rpG = 0;
    d.izin.filter((x) => x.durum === 'ONAYLANDI').forEach((x) => (x.gunler || []).forEach((g) => { if (g.durum !== 'ONAYLI') return; if (g.tarih === bugun) kisi.add(x.sicil); if (g.tarih.startsWith(ay)) izG += izvAg(g.zaman); }));
    d.rapor.filter((r) => r.durum === 'AKTIF').forEach((r) => {
      if (r.ilkTarih <= bugun && bugun <= r.sonTarih) kisi.add(r.sicil);
      for (let t = new Date(r.ilkTarih + 'T00:00:00'), son = new Date(r.sonTarih + 'T00:00:00'); t <= son; t.setDate(t.getDate() + 1)) if (takvimIso(t).startsWith(ay)) rpG += 1;
    });
    const kart = (renk, etiket, pil, pilStil, deger, birim) => h('div', { class: 'glass-card kpi-card' }, h('div', { class: 'kpi-accent-bar', style: 'background:' + renk }),
      h('div', { class: 'kpi-header' }, h('span', { class: 'kpi-label' }, etiket), h('span', { class: 'kpi-pill', style: pilStil }, pil)), h('div', { class: 'kpi-val-row' }, h('span', { class: 'kpi-val' }, deger), h('span', { class: 'kpi-unit' }, birim)));
    return h('section', { class: 'kpi-grid' },
      kart('linear-gradient(90deg,#f59e0b,#d97706)', 'Onay bekleyen izinler', 'Aksiyon gerekli', 'background:rgba(245,158,11,.16);color:#b45309', String(bek), 'Talep'),
      kart('linear-gradient(90deg,#e11d48,#be123c)', 'İkame bekleyen görevler (rapor / ayrılış)', d.ikame.length ? 'Kritik uyarı' : 'Temiz', 'background:rgba(225,29,72,.15);color:#e11d48', String(d.ikame.length), 'Görev'),
      kart('linear-gradient(90deg,#0070C0,#7c3aed)', 'Bugün aktif izinli / raporlu personel', takvimTarihYaz(bugun), 'background:rgba(0,112,192,.14);color:#0070C0', String(kisi.size), 'Personel'),
      kart('linear-gradient(90deg,#059669,#0f766e)', 'Bu ay izin ve rapor (adam-gün)', 'İzin ' + izvSayi(izG) + ' + Rapor ' + izvSayi(rpG), 'background:rgba(5,150,105,.14);color:#059669', izvSayi(izG + rpG), 'Adam-gün'));
  }
  function sekmeler() {
    const bek = d.izin.filter((x) => x.durum === 'ONAY_BEKLIYOR').length;
    const dugme = (k, ad, rozetSinif, n) => h('button', { type: 'button', class: 'nav-tab' + (d.sekme === k ? ' active' : ''), onclick: () => { d.sekme = k; ciz(); } }, h('span', null, ad), h('span', { class: 'tab-badge ' + rozetSinif }, String(n)));
    return h('section', { class: 'glass-panel nav-tabs-bar' }, h('div', { class: 'nav-tabs-list', role: 'tablist' },
      dugme('IZIN', '⏳ İzin onayları ve aktif izinler', 'tab-badge-amber', bek), dugme('RAPOR', '🏥 Sağlık raporları ve ikame uyarıları', 'tab-badge-rose', d.ikame.length), dugme('ARSIV', '📋 İzin ve rapor geçmişi (arşiv)', 'tab-badge-neutral', d.izin.length + d.rapor.length)),
      h('div', { style: 'font-size:.74rem;color:var(--text-muted);font-weight:600' }, '💡 Gün rozetlerine tıklayarak tekil gün durumlarını inceleyebilirsiniz.'));
  }
  function gunRozetleri(x, tikla) {
    return h('div', { class: 'day-pills-wrap' }, (x.gunler || []).map((g) => {
      const sn = izvGunSinif(x, g);
      return tikla ? h('button', { type: 'button', class: 'day-chip day-chip-' + sn, title: takvimTarihYaz(g.tarih) + ' • ' + izvGunAd(sn), onclick: () => gunPenceresi(x, g) }, izvKisa(g.tarih) + ' (' + izvSayi(izvAg(g.zaman)) + ')')
        : h('span', { class: 'day-chip day-chip-' + sn, style: 'cursor:default' }, izvKisa(g.tarih) + ' (' + izvSayi(izvAg(g.zaman)) + ')');
    }));
  }
  function kisiBlok(ad, sicil, bolum) { return h('div', null, h('div', { class: 'staff-block-name' }, ad), h('div', { class: 'staff-block-meta' }, 'Sicil: ' + sicil + (bolum ? ' • ' + bolum : ''))); }
  function durumHap(x) { const [a, c] = izvDurum(x); return h('div', null, h('span', { class: 'status-pill ' + c }, a), x.durum === 'REDDEDILDI' && x.retNedeni ? h('div', { style: 'font-size:.70rem;color:var(--brand-rose);margin-top:4px;max-width:210px' }, 'Gerekçe: ' + x.retNedeni) : null); }
  const bosSatir = (n, m) => h('tr', null, h('td', { colspan: String(n), style: 'text-align:center;padding:32px;color:var(--text-muted)' }, m));

  function izinSekmesi() {
    const tablo = h('div', { class: 'table-wrap' });
    function ciz2() {
      const q = d.izinAra.trim().toLowerCase();
      const liste = d.izin.filter((x) => {
        if (q && !((x.ad || '').toLowerCase().includes(q) || String(x.sicil).toLowerCase().includes(q) || String(x.kod).toLowerCase().includes(q))) return false;
        if (d.izinDurum === 'PENDING' && x.durum !== 'ONAY_BEKLIYOR') return false;
        if (d.izinDurum === 'APPROVED' && x.durum !== 'ONAYLANDI') return false;
        if (d.izinDurum === 'CLOSED' && !izvKapali(x)) return false;
        return d.izinTur === 'ALL' || x.tur === d.izinTur;
      });
      const satir = (x) => {
        const bek = x.durum === 'ONAY_BEKLIYOR', onayli = x.durum === 'ONAYLANDI';
        const cak = !izvKapali(x) && x.cakisanAtama > 0
          ? h('div', { class: 'conflict-alert-box' }, '⚠️ ' + x.cakisanAtama + ' görev ataması çakışıyor — ' + (bek ? 'onaylarken karar sorulacak.' : 'ikame için "Sağlık raporları ve ikame" sekmesine bakın.')) : h('span', { class: 'conflict-ok-text' }, '✅ Çakışma yok');
        const eylem = bek ? h('div', { style: 'display:inline-flex;flex-wrap:wrap;gap:6px;justify-content:flex-end' }, h('button', { type: 'button', class: 'btn btn-success btn-sm', onclick: () => onayla(x, 'REDDET') }, '✅ Onayla'), h('button', { type: 'button', class: 'btn btn-danger btn-sm', onclick: () => retPenceresi(x) }, '❌ Reddet'))
          : onayli ? ((x.gunler || []).some((g) => g.durum === 'ONAYLI') ? h('div', { style: 'display:inline-flex;flex-wrap:wrap;gap:6px;justify-content:flex-end' }, h('button', { type: 'button', class: 'btn btn-warning btn-sm', onclick: () => kisaltPenceresi(x) }, '✂️ Erken dönüş / kısalt'), h('button', { type: 'button', class: 'btn btn-danger btn-sm', onclick: () => iptalPenceresi(x) }, '🚫 İzni iptal et'))
            : h('span', { style: 'font-size:.72rem;color:var(--text-muted)' }, 'Aktif gün kalmadı')) : h('span', { style: 'font-size:.72rem;color:var(--text-muted)' }, 'Kapalı kayıt');
        return h('tr', null, h('td', null, kisiBlok(x.ad, x.sicil, x.bolum)),
          h('td', null, h('div', null, h('span', { class: 'badge ' + izvTurSinif(x.tur) }, x.tur)), x.vekaleten ? h('div', null, h('span', { class: 'badge badge-proxy' }, '🛡️ Yönetici girişi')) : null),
          h('td', null, h('div', { style: 'font-weight:800;font-size:.80rem' }, izinTarihAralik(x.ilkTarih, x.sonTarih)), gunRozetleri(x, true)),
          h('td', null, h('div', { style: 'font-weight:700;font-size:.76rem' }, izvDilimAd(x)), h('div', { style: 'font-family:var(--font-mono);font-size:.75rem;font-weight:800;color:var(--brand-blue);margin-top:2px' }, 'Toplam: ' + izvSayi(izvEtkinAg(x)) + ' adam-gün')),
          h('td', null, cak), h('td', null, durumHap(x)), h('td', { style: 'text-align:right;white-space:nowrap' }, eylem));
      };
      tablo.replaceChildren(h('table', { class: 'data-table' }, h('thead', null, h('tr', null, ['Personel', 'İzin türü ve kaynak', 'Tarih aralığı ve gün kırılımı', 'Zaman dilimi ve adam-gün', 'Görev çakışma durumu', 'Onay durumu'].map((x) => h('th', null, x)), h('th', { style: 'text-align:right' }, 'İşlemler'))),
        h('tbody', null, liste.length ? liste.map(satir) : bosSatir(7, 'Seçili filtrelere uygun izin kaydı bulunamadı.'))));
    }
    const ara = h('input', { type: 'text', class: 'form-control', style: 'min-width:225px', placeholder: 'Personel adı, sicil no veya kayıt no ara…', value: d.izinAra, 'aria-label': 'Ara' });
    ara.addEventListener('input', () => { d.izinAra = ara.value; ciz2(); });
    const tur = h('select', { class: 'form-control', 'aria-label': 'İzin türü süzgeci' }, h('option', { value: 'ALL' }, 'İzin türü: Tümü'), IZIN_TURLERI.map((t) => h('option', { value: t }, t)));
    tur.value = d.izinTur; tur.addEventListener('change', () => { d.izinTur = tur.value; ciz2(); });
    ciz2();
    return h('section', { class: 'glass-panel', style: 'overflow:hidden' }, h('div', { class: 'filter-toolbar' },
      h('div', { class: 'filter-controls' }, ara, izvPill([['ALL', 'Tümü'], ['PENDING', 'Onay bekleyenler'], ['APPROVED', 'Onaylananlar'], ['CLOSED', 'Reddedilen / iptal']], d.izinDurum, (k) => { d.izinDurum = k; ciz2(); })), h('div', { class: 'filter-controls' }, tur)), tablo);
  }

  function raporSekmesi() {
    const nedenAd = { RAPOR: 'Raporlu', AYRILDI: 'Ayrıldı / pasif', BIRIM: 'Birim değişikliği' };
    const banner = d.ikame.length ? h('section', { class: 'ikame-banner' },
      h('div', { style: 'display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px' }, h('div', { style: 'font-size:.92rem;font-weight:800;color:#be123c' }, '🚨 İkame personel bekleyen aktif görevler (' + d.ikame.length + ' görev)'),
        h('span', { style: 'font-size:.73rem;font-weight:700;color:var(--text-secondary)' }, 'Rapor / ayrılış nedeniyle boşalan görevlere müsait personel atayın')),
      d.ikame.map((i) => h('div', { class: 'ikame-item-row' }, h('div', null, h('div', { style: 'font-weight:800;font-size:.84rem' }, i.ad + ' (Sicil: ' + i.sicil + ') — ', h('span', { style: 'color:var(--brand-blue)' }, i.kod)),
        h('div', { style: 'font-size:.74rem;color:var(--text-secondary);margin-top:2px' }, 'Tarih: ', h('b', null, izinTarihAralik(i.ilk, i.son)), ' (' + i.gun + ' gün) • Neden: ' + (nedenAd[i.neden] || i.neden))),
        h('button', { type: 'button', class: 'btn btn-primary btn-sm', onclick: () => ikamePenceresi(i) }, '🔄 Hızlı ikame personel ata')))) : null;
    const satir = (r) => {
      const aktif = r.durum === 'AKTIF';
      return h('tr', null, h('td', null, h('div', { style: 'font-family:var(--font-mono);font-size:.72rem;font-weight:800;color:var(--brand-blue)' }, r.kod), kisiBlok(r.ad, r.sicil, r.bolum)),
        h('td', null, h('div', { style: 'font-weight:800' }, izinTarihAralik(r.ilkTarih, r.sonTarih)), h('div', { class: 'staff-block-meta' }, izvTakvimGun(r.ilkTarih, r.sonTarih) + ' gün (ÖÖ+ÖS tam gün kapalı)')),
        h('td', null, r.evrakAdi ? h('div', null, h('div', { style: 'font-weight:700;font-size:.77rem' }, '📎 ' + r.evrakAdi), h('div', { style: 'font-family:var(--font-mono);font-size:.69rem;color:var(--text-muted);margin-top:2px' }, izinBayt(r.evrakBoyut))) : h('span', { class: 'badge badge-type-ozel' }, 'Eski kayıt')),
        h('td', null, h('div', { style: 'font-size:.76rem;font-weight:700;color:var(--text-secondary);max-width:290px' }, !aktif ? 'Rapor iptal edildi; takvimden düşüldü.' : r.cakisanAtama > 0 ? '⚠️ ' + r.cakisanAtama + ' görev ataması duruyor; ikame gerekli.' : 'Takvime işlendi; çakışan atama yok.')),
        h('td', null, h('span', { class: 'status-pill ' + (aktif ? 'st-GECERLI' : 'st-IPTAL_EDILDI') }, aktif ? 'Geçerli (takvime işli)' : 'İptal edildi'), !aktif && r.iptalNedeni ? h('div', { style: 'font-size:.70rem;color:var(--brand-rose);margin-top:4px' }, 'İptal nedeni: ' + r.iptalNedeni) : null),
        h('td', { style: 'text-align:right;white-space:nowrap' }, h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onclick: () => raporPenceresi(r) }, '📄 Evrakı görüntüle / düzenle')));
    };
    return h('div', { style: 'display:flex;flex-direction:column;gap:16px' }, banner,
      h('section', { class: 'glass-panel', style: 'overflow:hidden' }, h('div', { class: 'filter-toolbar' },
        h('div', null, h('div', { style: 'font-weight:800;font-size:.92rem' }, 'Belgeli sağlık raporları kayıt listesi'), h('div', { style: 'font-size:.73rem;color:var(--text-muted)' }, 'Raporlar doğrudan takvime işlenir; çakışan izinler otomatik iptal edilir. Evrak veritabanında saklanır.')),
        h('button', { type: 'button', class: 'btn btn-primary btn-sm', onclick: () => vekaletPenceresi('RAPOR') }, '＋ Vekaleten belgeli rapor gir')),
        h('div', { class: 'table-wrap' }, h('table', { class: 'data-table' }, h('thead', null, h('tr', null, ['Rapor no ve personel', 'Tarih aralığı ve süre', 'Evrak dosyası', 'Çakışma ve otomatik işlem özeti', 'Rapor durumu'].map((x) => h('th', null, x)), h('th', { style: 'text-align:right' }, 'İşlemler'))),
          h('tbody', null, d.rapor.length ? d.rapor.map(satir) : bosSatir(6, 'Rapor kaydı yok.'))))));
  }

  function arsivSekmesi() {
    const hepsi = [
      ...d.izin.map((x) => ({ tur: 'IZIN', kod: x.kod, ad: x.ad, sicil: x.sicil, kategori: x.tur, bas: x.ilkTarih, bit: x.sonTarih, ag: izvEtkinAg(x), durum: izvDurum(x), not: x.durum === 'REDDEDILDI' && x.retNedeni ? 'Red gerekçesi: ' + x.retNedeni : (x.aciklama || '') })),
      ...d.rapor.map((r) => ({ tur: 'RAPOR', kod: r.kod, ad: r.ad, sicil: r.sicil, kategori: 'Sağlık raporu', bas: r.ilkTarih, bit: r.sonTarih, ag: r.durum === 'AKTIF' ? izvTakvimGun(r.ilkTarih, r.sonTarih) : 0,
        durum: r.durum === 'AKTIF' ? ['Geçerli (takvime işli)', 'st-GECERLI'] : ['İptal edildi', 'st-IPTAL_EDILDI'], not: [r.evrakAdi, r.durum === 'IPTAL' && r.iptalNedeni ? 'İptal: ' + r.iptalNedeni : r.aciklama].filter(Boolean).join(' • ') }))].sort((a, b) => b.bas.localeCompare(a.bas));
    const tablo = h('div', { class: 'table-wrap' });
    let son = [];
    function ciz2() {
      const q = d.arsAra.trim().toLowerCase();
      son = hepsi.filter((i) => (d.arsTur === 'ALL' || i.tur === d.arsTur) && (!q || (i.ad || '').toLowerCase().includes(q) || String(i.sicil).toLowerCase().includes(q) || String(i.kod).toLowerCase().includes(q) || i.kategori.toLowerCase().includes(q)));
      tablo.replaceChildren(h('table', { class: 'data-table' }, h('thead', null, h('tr', null, ['Kayıt no', 'Personel', 'Kayıt türü', 'Tarih aralığı', 'Geçerli adam-gün', 'Durum', 'Açıklama / sistem özeti'].map((x) => h('th', null, x)))),
        h('tbody', null, son.length ? son.map((i) => h('tr', null, h('td', { style: 'font-family:var(--font-mono);font-weight:800;color:var(--brand-blue)' }, i.kod), h('td', null, kisiBlok(i.ad, i.sicil)),
          h('td', null, h('span', { class: 'badge ' + (i.tur === 'RAPOR' ? 'badge-type-idari' : izvTurSinif(i.kategori)) }, i.kategori)), h('td', { style: 'font-weight:700' }, izinTarihAralik(i.bas, i.bit)),
          h('td', { style: 'font-family:var(--font-mono);font-weight:800' }, izvSayi(i.ag) + ' gün'), h('td', null, h('span', { class: 'status-pill ' + i.durum[1] }, i.durum[0])), h('td', { style: 'font-size:.75rem;color:var(--text-secondary);max-width:340px' }, i.not))) : bosSatir(7, 'Kayıt bulunamadı.'))));
    }
    const ara = h('input', { type: 'text', class: 'form-control', style: 'min-width:230px', placeholder: 'Arşivde personel, sicil veya kayıt no ara…', value: d.arsAra, 'aria-label': 'Arşivde ara' });
    ara.addEventListener('input', () => { d.arsAra = ara.value; ciz2(); });
    ciz2();
    const csv = () => {
      const t = (s) => '"' + String(s == null ? '' : s).replaceAll('"', '""') + '"';
      izvIndir('Izin_ve_Saglik_Raporu_Arsivi.csv', ['Kayit_No;Personel;Sicil_No;Tur;Baslangic;Bitis;Adam_Gun;Durum;Aciklama', ...son.map((i) => [i.kod, t(i.ad), i.sicil, t(i.kategori), takvimTarihYaz(i.bas), takvimTarihYaz(i.bit), izvSayi(i.ag), t(i.durum[0]), t(i.not)].join(';'))]);
      toast('Arşiv CSV olarak indirildi (' + son.length + ' kayıt).');
    };
    return h('section', { class: 'glass-panel', style: 'overflow:hidden' }, h('div', { class: 'filter-toolbar' },
      h('div', { class: 'filter-controls' }, ara, izvPill([['ALL', 'Tümü (' + hepsi.length + ')'], ['IZIN', 'İzin kayıtları'], ['RAPOR', 'Sağlık raporları']], d.arsTur, (k) => { d.arsTur = k; ciz2(); })),
      h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onclick: csv }, '📥 Arşivi CSV indir')), tablo);
  }

  function gorevBolumu() {
    if (!saha) return null;
    const hucre = { style: 'white-space:nowrap' };
    return h('section', { class: 'glass-panel', style: 'overflow:hidden' }, h('div', { class: 'filter-toolbar' }, h('div', null, h('h3', { style: 'font-size:.96rem;font-weight:800' }, 'Görevlerim'), h('p', { style: 'font-size:.73rem;color:var(--text-muted)' }, 'Son 14 gün ve önümüzdeki 90 gün.'))),
      h('div', { class: 'table-wrap' }, h('table', { class: 'data-table' }, h('thead', null, h('tr', null, ['Tarih', 'Dilim', 'Proje / faaliyet', 'Konum · saat', 'Sorumlu', 'Not · iletişim'].map((x) => h('th', null, x)))),
        h('tbody', null, d.gorev.length ? d.gorev.flatMap((g) => [h('tr', null, h('td', hucre, takvimTarihYaz(g.tarih)), h('td', null, atamaTamAd(g.zaman)),
          h('td', null, h('b', null, g.ana), ' › ' + g.alt + ' › ' + g.faaliyet, h('div', { class: 'staff-block-meta' }, g.kod)), h('td', null, (g.konum || '') + ' · ' + (g.saat || '')), h('td', null, g.sorumlu),
          h('td', null, h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onclick: async () => {
            try { if (d.ilet[g.talepId]) delete d.ilet[g.talepId]; else d.ilet[g.talepId] = await Kopru.cagir('talepIletisim', { talepId: g.talepId }); ciz(); } catch (e) { hata(e); } } }, d.ilet[g.talepId] ? 'Gizle' : 'Göster'))),
          d.ilet[g.talepId] ? h('tr', null, h('td', { colspan: '6' }, iletisimBlok(d.ilet[g.talepId]))) : null].filter(Boolean)) : bosSatir(6, 'Bu dönemde size atanmış görev yok.')))));
  }
  function iletisimBlok(i) {
    const tel = (g) => g ? h('a', { href: 'tel:' + String(g).replace(/\s+/g, ''), style: 'margin-left:6px' }, g) : h('span', { style: 'margin-left:6px;color:var(--text-muted)' }, 'telefon kayıtlı değil');
    return h('div', { style: 'font-size:.78rem' }, i.sahaNotu ? h('div', { style: 'white-space:pre-wrap;margin-bottom:4px' }, h('b', null, 'Saha / operasyon notu: '), i.sahaNotu) : h('div', { style: 'color:var(--text-muted)' }, 'Bu talep için saha notu girilmemiş.'),
      h('div', null, h('b', null, 'Proje sorumlusu: '), i.sorumluAd, tel(i.sorumluGsm)));
  }

  function kendiKartlar() {
    const kart = (baslik, alt, rozetEl, govde) => h('article', { class: 'glass-card form-card' }, h('div', { class: 'form-card-header' }, h('div', null, h('h2', { class: 'form-card-title' }, baslik), h('p', { class: 'form-card-sub' }, alt)), rozetEl), govde);
    return h('section', { class: 'self-service-grid' },
      kart('📝 Yeni izin talebi oluştur', 'Talebiniz Yönetici onayına düşer; hafta sonları ve resmi tatiller otomatik düşülür. Onaylanan günlere atama yapılamaz.', h('span', { class: 'status-pill st-ONAY_BEKLIYOR' }, 'Yönetici onaylı'), kendiIzin.el),
      kart('🏥 Belgeli sağlık raporu beyanı', 'Hekim istirahat raporunuzu belgeleyerek doğrudan takvime işleyin.', h('span', { class: 'status-pill st-GECERLI' }, 'Anında takvime işlenir'), kendiRapor));
  }
  function kendiKayitlar() {
    const geriCek = (x) => h('button', { type: 'button', class: 'btn btn-warning btn-sm', onclick: async () => { if (!confirm(x.kod + ' izni geri çekilsin mi?')) return; try { await Kopru.cagir('izinGeriCek', { id: x.id }); toast('İzin geri çekildi.'); await yukle(); } catch (e) { hata(e); } } }, '↩️ Talebi geri çek');
    const rap = d.rapor.map((r) => { const aktif = r.durum === 'AKTIF'; return h('tr', null,
      h('td', null, h('div', { style: 'font-family:var(--font-mono);font-weight:800;color:var(--brand-emerald)' }, r.kod), h('span', { class: 'badge badge-type-idari', style: 'margin-top:3px' }, '🏥 Sağlık raporu')),
      h('td', null, h('div', { style: 'font-weight:800' }, izinTarihAralik(r.ilkTarih, r.sonTarih)), r.evrakAdi ? h('div', { class: 'staff-block-meta' }, '📎 ' + r.evrakAdi + ' (' + izinBayt(r.evrakBoyut) + ')') : null),
      h('td', { style: 'font-family:var(--font-mono);font-weight:800' }, izvSayi(aktif ? izvTakvimGun(r.ilkTarih, r.sonTarih) : 0) + ' gün'),
      h('td', null, h('span', { class: 'status-pill ' + (aktif ? 'st-GECERLI' : 'st-IPTAL_EDILDI') }, aktif ? 'Geçerli (takvime işli)' : 'İptal edildi')),
      h('td', { style: 'font-size:.75rem;color:var(--text-secondary);max-width:340px' }, !aktif && r.iptalNedeni ? 'İptal nedeni: ' + r.iptalNedeni : (aktif && r.cakisanAtama > 0 ? r.cakisanAtama + ' görev ataması için yönetici uyarıldı.' : (r.aciklama || ''))),
      h('td', { style: 'text-align:right' }, h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onclick: () => raporPenceresi(r) }, '📄 Evrak / işlem'))); });
    const izn = d.izin.map((x) => h('tr', null,
      h('td', null, h('div', { style: 'font-family:var(--font-mono);font-weight:800;color:var(--brand-blue)' }, x.kod), h('span', { class: 'badge ' + izvTurSinif(x.tur), style: 'margin-top:3px' }, x.tur)),
      h('td', null, h('div', { style: 'font-weight:800' }, izinTarihAralik(x.ilkTarih, x.sonTarih)), gunRozetleri(x, false)),
      h('td', { style: 'font-family:var(--font-mono);font-weight:800' }, izvSayi(izvEtkinAg(x)) + ' adam-gün'), h('td', null, durumHap(x)),
      h('td', { style: 'font-size:.75rem;max-width:340px;color:var(--text-secondary)' }, x.durum === 'REDDEDILDI' && x.retNedeni ? h('div', { class: 'conflict-alert-box', style: 'max-width:none' }, '❌ Yönetici red gerekçesi: ' + x.retNedeni) : (x.vekaleten ? 'Vekaleten giren: ' + x.vekaleten + (x.aciklama ? ' • ' : '') : '') + (x.aciklama || '')),
      h('td', { style: 'text-align:right;white-space:nowrap' }, x.durum === 'ONAY_BEKLIYOR' ? geriCek(x) : h('span', { style: 'font-size:.72rem;color:var(--text-muted)' }, '—'))));
    return h('section', { class: 'glass-panel', style: 'overflow:hidden' }, h('div', { class: 'filter-toolbar' },
      h('div', null, h('h3', { style: 'font-size:.96rem;font-weight:800' }, 'Kişisel izin ve rapor kayıtlarım'), h('p', { style: 'font-size:.73rem;color:var(--text-muted)' }, 'Onay bekleyen izin taleplerinizi geri çekebilir, reddedilen taleplerin gerekçesini görebilirsiniz.')),
      h('span', { class: 'badge badge-type-yillik' }, d.izin.length + ' izin • ' + d.rapor.length + ' sağlık raporu')),
      h('div', { class: 'table-wrap' }, h('table', { class: 'data-table' }, h('thead', null, h('tr', null, ['Kayıt no ve tür', 'Tarih aralığı ve gün kırılımı', 'Süre / adam-gün', 'Durum', 'Yönetici açıklaması / sistem notu'].map((x) => h('th', null, x)), h('th', { style: 'text-align:right' }, 'İşlemler'))),
        h('tbody', null, rap.length + izn.length ? [...rap, ...izn] : bosSatir(6, 'Henüz kaydınız yok.')))));
  }

  function ciz() {
    const parcalar = [ustSerit(), bildirimBandi()];
    if (yon) parcalar.push(kpiler(), sekmeler(), d.sekme === 'IZIN' ? izinSekmesi() : d.sekme === 'RAPOR' ? raporSekmesi() : arsivSekmesi());
    else { parcalar.push(gorevBolumu(), kendiKartlar(), kendiKayitlar()); kendiIzin.hesap(); }
    kok.replaceChildren(...parcalar.filter(Boolean));
  }

  ciz();
  await yukle();
  return kap;
}
