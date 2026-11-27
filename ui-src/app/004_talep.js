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
// Günlük kişi sayısı: 5 gün × 1 kişi = "günlük 1 kişi" (5 ayrı kişi değil).
function talepGunlukKisi(x) { return Math.max(1, Math.round((Number(x.kisiGun) || 0) / Math.max(1, Number(x.gunSayisi) || 1))); }
function talepKisiYazi(x) { const g = talepGunlukKisi(x); return g === 1 ? 'günlük 1 kişi (tek personel olabilir)' : 'günlük ' + g + ' kişi'; }
function talepKisiGun(n) { return String(n).replace('.', ',') + ' kişi-gün'; }

// Personel arama kutusu (en az 2 harf); seçilince onSec({sicil, ad}) çağrılır.
// Rol eşleştirmesinden gelen kişi listesi (SAHA: önerilebilecek personel, SORUMLU: Proje Sorumlusu havuzu); oturumda bir kez yüklenir.
const talepRolOnbellek = {};
async function talepRolListe(rol) {
  if (!talepRolOnbellek[rol]) talepRolOnbellek[rol] = await Kopru.cagir('rolPersonel', { rol });
  return talepRolOnbellek[rol];
}
function talepPersonelAra(yer, onSec, rol) {
  const sonuc = h('div', { class: 'satir', style: 'margin-top:6px' });
  let zm = 0;
  const kutu = h('input', { type: 'search', class: 'metin', placeholder: yer, 'aria-label': yer, style: 'min-width:260px' });
  const rolGoster = async () => {
    try {
      const q = kutu.value.trim().toLocaleLowerCase('tr');
      const l = (await talepRolListe(rol)).filter((p) => !q || p.ad.toLocaleLowerCase('tr').includes(q)).slice(0, 40);
      sonuc.replaceChildren(...(l.length ? l.map((p) => h('button', { type: 'button', title: p.bolum || '', onclick: () => { sonuc.replaceChildren(); kutu.value = ''; onSec(p); } }, p.ad + (p.bolum ? ' · ' + p.bolum : '')))
        : [h('span', { class: 'alt' }, 'Bu rolde eşleşen personel yok (Ayarlar › Rol eşleştirme).')]));
    } catch (e) { hata(e); }
  };
  if (rol) { kutu.addEventListener('focus', rolGoster); kutu.addEventListener('input', rolGoster); return h('div', null, kutu, sonuc); }
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
  const durum = { gorunum: 'liste', filtre: '', liste: [], havuz: [], tatiller: [], f: null, bildirim: [], atama: null, atananAcik: {}, iletisimAcik: {}, ikame: [], tav: {}, adlar: {}, ara: '' };
  const araEl = h('input', { type: 'search', class: 'metin', placeholder: 'Ara: talep no, proje, faaliyet, konum, sorumlu, atanan personel…', style: 'min-width:300px;flex:1', 'aria-label': 'Talep ara' });
  araEl.addEventListener('input', () => { durum.ara = araEl.value; ciz(); araEl.focus(); try { araEl.setSelectionRange(araEl.value.length, araEl.value.length); } catch (e) { /* arama kutusu seçimi desteklenmiyorsa geç */ } });
  const kap = h('div', { style: 'display:flex;flex-direction:column;gap:14px' });

  async function yukle() {
    try { durum.liste = await Kopru.cagir('talepListe', {}); durum.bildirim = await Kopru.cagir('bildirimListe', {}); if (yonetici) { try { const [rv, ik] = await Promise.all([Kopru.cagir('revizeListe', { durum: 'BEKLIYOR' }), Kopru.cagir('ikameBekleyenler', {})]); durum.revizeSayi = (Array.isArray(rv) ? rv.length : 0) + (Array.isArray(ik) ? ik.length : 0); } catch (e) { durum.revizeSayi = 0; } } try { durum.adlar = {}; for (const r of await Kopru.cagir('talepAtananAdlar', {})) durum.adlar[r.talepId] = r.adlar; } catch (e) { /* başlıkta ad görünmez */ } await tavsiyeYukle(); ciz(); } catch (e) { hata(e); }
  }
  // Otomatik/elle yenileme: yalnız liste görünümündeyken (açık form kaybolmasın).
  const talepYenile = async () => { if (durum.gorunum === 'liste') await yukle(); };
  S.yenile = talepYenile;

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

  async function atamaAc(id, ret) {
    try { durum.atama = await atamaPaneli(id, ret, async (yenile) => { durum.atama = null; durum.gorunum = 'liste'; if (yenile) await yukle(); else ciz(); }); durum.gorunum = 'atama'; ciz(); } catch (e) { hata(e); }
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

  // Tavsiye kutusu (Yönetici): ana projedeki geçmiş deneyime göre aday kişiler; kart başına bir kez okunur, 5 dakikada bir tazelenir.
  async function tavsiyeYukle() {
    if (!yonetici) return;
    const bekleyen = durum.liste.filter((x) => ['ONAY_BEKLIYOR', 'KISMEN_ATANDI'].includes(x.durum)).slice(0, 25);
    const simdi = Date.now();
    await Promise.all(bekleyen.filter((x) => !durum.tav[x.id] || simdi - durum.tav[x.id].z > 300000).map(async (x) => {
      try { const l = await Kopru.cagir('atamaAdaylar', { talepId: x.id }); durum.tav[x.id] = { z: simdi, l: l.slice().sort((p, q) => (q.gecmis || 0) - (p.gecmis || 0) || (q.toplamGorev || 0) - (p.toplamGorev || 0)).slice(0, 15) }; } catch (e) { durum.tav[x.id] = { z: simdi, l: [] }; }
    }));
  }
  // "Ata": tek kişi istenen görevde adayı bütün günlere atar; birden fazla kişi istenmişse (ya da çakışma varsa) atama ekranını açar.
  async function hizliAta(x, a) {
    try {
      const t = await Kopru.cagir('talepGetir', { id: x.id });
      if (t.gunler.some((g) => g.kisi > 1)) { toast('Birden fazla personel istendiği için atama ekranı açıldı.', 'bilgi'); await atamaAc(x.id); return; }
      const atamalar = t.gunler.filter((g) => !(g.atananlar && g.atananlar.length)).map((g) => ({ sicil: a.sicil, tarih: g.tarih, zaman: g.zaman }));
      if (!atamalar.length) { await atamaAc(x.id); return; }
      const c = await Kopru.cagir('atamaCakismaKontrol', { talepId: x.id, atamalar });
      if (c.length) { toast('Çakışan gün var; karar için atama ekranı açıldı.', 'uyari'); await atamaAc(x.id); return; }
      await Kopru.cagir('atamaOnayla', { talepId: x.id, atamalar, karar: 'REDDET' });
      toast(a.ad + ' görevin tüm günlerine atandı.', 'iyi'); await yukle();
    } catch (e) { hata(e); }
  }
  function tavsiyeKutusu(x) {
    const t = durum.tav[x.id];
    return h('div', { class: 'sag' }, h('div', { class: 'bl' }, '⚡ Ana Proje Bazlı Geçmiş Görev Tavsiye Bloğu (' + x.ana + ')'),
      h('div', { class: 'alt', style: 'font-size:11px' }, 'Geçmiş görev kayıtları ve anlık zaman dilimi müsaitliği'),
      h('div', { class: 'tav' }, !t ? h('div', { class: 'alt' }, 'Yükleniyor…') : t.l.length ? t.l.map((a) => {
        const musait = Math.max(0, (a.talepGun || 0) - (a.cakisanGun || 0) - (a.izinRaporGun || 0));
        return h('div', { class: 'k' }, h('div', { class: 'b' }, h('b', null, a.ad), h('div', { class: 'alt' }, (a.toplamGorev || 0) + ' görev (' + analizSayi(a.adamGun || 0) + ' adam-gün)' + (a.yerlesker ? ' • ' + a.yerlesker : '')),
          h('div', { style: 'margin-top:2px' }, a.izinRaporGun > 0 ? h('span', { class: 'cipi ko' }, 'İzin/Rapor (' + a.izinRaporGun + ' gün)') : (a.cakisanGun > 0 ? h('span', { class: 'cipi uy' }, 'Çakışma / Görevli (' + a.cakisanGun + ' gün)') : h('span', { class: 'cipi iy' }, 'Müsait')),
            ' ', a.onerildi ? h('span', { class: 'cipi' }, 'Önerilen') : null, musait < (a.talepGun || 0) && !a.cakisanGun && !a.izinRaporGun ? null : null)),
          h('button', { type: 'button', class: 'ana', onclick: () => hizliAta(x, a) }, 'Ata'));
      }) : h('div', { class: 'alt' }, 'Bu ana projede geçmiş görev kaydı olan aday bulunamadı.')));
  }

  function liste() {
    const f = durum.filtre;
    if (f === 'REVIZE' && yonetici && durum.revizeKap) return h('div', { style: 'display:flex;flex-direction:column;gap:12px' }, bildirimBandi(), sekmeSatiri(), durum.revizeKap);
    const goster0 = durum.liste.filter((x) => !f || (f === 'BEKLEYEN' ? ['TASLAK', 'ONAY_BEKLIYOR'].includes(x.durum) : f === 'ATANMIS' ? ['KISMEN_ATANDI', 'TAMAMEN_ATANDI'].includes(x.durum) : ['REDDEDILDI', 'GERI_CEKILDI', 'IPTAL'].includes(x.durum)));
    const q = durum.ara.trim().toLocaleLowerCase('tr-TR');
    const bul = (x) => !q || [x.kod, x.ana, x.alt, x.faaliyet, x.konum, x.sorumluAdi, durum.adlar[x.id]].some((v) => v && String(v).toLocaleLowerCase('tr-TR').includes(q));
    const goster = goster0.filter(bul);
    const sayi = (fn) => durum.liste.filter(fn).length;
    const chip = (kod, ad, n) => h('button', { class: durum.filtre === kod ? 'secili ana' : '', onclick: async () => {
      try {
        durum.filtre = kod;
        if (kod === 'REVIZE') durum.revizeKap = await revizeIkameSayfa(); else S.yenile = talepYenile;
        ciz();
      } catch (e) { hata(e); }
    } }, ad + (n == null ? '' : ' (' + n + ')'));
    const sekmeSatiri = () => h('div', { class: 'satir', style: 'align-items:center' },
      chip('', 'Tümü', durum.liste.length), chip('BEKLEYEN', 'Bekleyen', sayi((x) => talepDegistirilebilir(x.durum))),
      chip('ATANMIS', 'Atanmış', sayi((x) => ['KISMEN_ATANDI', 'TAMAMEN_ATANDI'].includes(x.durum))),
      yonetici ? chip('REVIZE', 'Revize & İkame Uyarıları', durum.revizeSayi) : null,
      chip('KAPALI', 'Kapalı', sayi((x) => ['REDDEDILDI', 'GERI_CEKILDI', 'IPTAL'].includes(x.durum))),
      h('span', { style: 'flex:1' }), h('button', { class: 'ana', onclick: () => formAc(null, false) }, 'Yeni talep'));
    araEl.value = durum.ara;
    const durumRenk = { iyi: 'background:#d1fae5;color:#047857', uyari: 'background:#fef3c7;color:#b45309', kotu: 'background:#fee2e2;color:#b91c1c', bilgi: 'background:#e0e7ff;color:#4338ca', soluk: 'background:#e2e8f0;color:#475569' };
    const kartlar = goster.map((x) => {
      const bekleyen = ['ONAY_BEKLIYOR', 'KISMEN_ATANDI'].includes(x.durum);
      const atamaVar = yonetici && bekleyen;
      const tur = talepDurumTur(x.durum);
      return h('section', { class: 'tk' },
        h('div', { class: 'bas' }, h('span', { class: 'kod' }, x.kod), h('span', { class: 'proje' }, x.ana + (x.alt && x.alt !== 'Genel' ? ' › ' + x.alt : '')), h('span', { class: 'yol' }, '→ ' + x.faaliyet), durum.adlar[x.id] ? h('span', { class: 'atandi' }, '✔ ' + durum.adlar[x.id] + ' atandı') : null,
          h('span', { style: 'flex:1' }), h('span', { class: 'rz', style: durumRenk[tur] || durumRenk.soluk }, talepDurumAd(x.durum) + (x.istenen > 0 ? ' (' + x.atanan + '/' + x.istenen + (talepGunlukKisi(x) === 1 ? ' gün' : ' kişi-gün') + ')' : ''))),
        h('div', { class: 'govde3' + (atamaVar ? ' uc' : '') },
          h('div', { class: 'kol' }, h('div', { class: 'bl' }, '📋 Özet'),
            h('div', null, [
              ['📍', 'Konum', x.konum],
              ['🕣', 'Saat', x.saatBaslangic && x.saatBitis ? x.saatBaslangic.replace(':', '.') + ' - ' + x.saatBitis.replace(':', '.') : '—'],
              ['📅', 'Tarih', talepAralik(x) + ' - ' + x.gunSayisi + ' gün · ' + talepKisiYazi(x)],
              ['📑', 'Proje', x.ana + (x.alt && x.alt !== 'Genel' ? ' › ' + x.alt : '')],
              ['📡', 'Faaliyet', x.faaliyet],
              ['🙋‍♀️', 'Önerilen Personel', x.oneri || '—'],
              ['🧍‍♂️', 'Proje sorumlusu', x.sorumluAdi + (yonetici && durum.iletisimAcik[x.id] && durum.iletisimAcik[x.id].sorumluGsm ? '  📞 ' + durum.iletisimAcik[x.id].sorumluGsm : '')],
            ].map(([em, ad, v]) => h('div', { class: 'ozsatir' }, h('span', { class: 'oze' }, em + ' ' + ad + ':'), h('span', { class: 'ozd' }, v))))),
          h('div', { class: 'kol' }, h('div', { class: 'bl' }, '📝 Görev ve Saha Bilgisi'),
            x.nitelik ? h('div', { class: 'not' }, h('b', null, 'Saha / Operasyon Notu: '), x.nitelik) : null,
            x.gorevMetni ? h('div', { class: 'alt' }, x.gorevMetni) : null,
            x.retNedeni ? h('div', { class: 'mesaj kotu', style: 'margin:0' }, 'Ret nedeni: ' + x.retNedeni) : null,
            durum.atananAcik[x.id] ? atananBlok(durum.atananAcik[x.id]) : null,
            durum.iletisimAcik[x.id] ? iletisimBlok(durum.iletisimAcik[x.id]) : null),
          atamaVar ? tavsiyeKutusu(x) : null),
        atamaVar ? h('div', { class: 'ana2' }, h('button', { class: 'ana', onclick: () => atamaAc(x.id) }, '✔ Atama Yap / Gün Bazlı Böl'), h('button', { class: 'ret', onclick: () => atamaAc(x.id, true) }, '✖ Zorunlu Açıklamayla Reddet')) : null,
        h('div', { class: 'ikinci' },
          x.atanan > 0 ? h('button', { onclick: async () => { try { if (durum.atananAcik[x.id]) delete durum.atananAcik[x.id]; else durum.atananAcik[x.id] = await Kopru.cagir('talepGetir', { id: x.id }); ciz(); } catch (e) { hata(e); } } }, 'Atananlar') : null,
          h('button', { title: 'Saha notu, sorumlu ve atanan personel iletişimi', onclick: async () => { try { if (durum.iletisimAcik[x.id]) delete durum.iletisimAcik[x.id]; else durum.iletisimAcik[x.id] = await Kopru.cagir('talepIletisim', { talepId: x.id }); ciz(); } catch (e) { hata(e); } } }, 'İletişim'),
          ['KISMEN_ATANDI', 'TAMAMEN_ATANDI'].includes(x.durum) ? h('button', { onclick: () => yonetAc(x.id) }, 'Yönet…') : null,
          h('button', { onclick: async () => { try { await formAc(await Kopru.cagir('talepGetir', { id: x.id }), true); } catch (e) { hata(e); } } }, '📋 Kopyala'),
          talepDegistirilebilir(x.durum) ? h('button', { onclick: async () => { try { await formAc(await Kopru.cagir('talepGetir', { id: x.id }), false); } catch (e) { hata(e); } } }, 'Revize') : null,
          talepDegistirilebilir(x.durum) ? h('button', { onclick: async () => {
            if (!confirm(x.kod + ' talebi geri çekilsin mi?')) return;
            try { await Kopru.cagir('talepGeriCek', { id: x.id }); toast('Talep geri çekildi.'); await yukle(); } catch (e) { hata(e); }
          } }, 'Geri çek') : null));
    });
    return h('div', { style: 'display:flex;flex-direction:column;gap:12px' },
      bildirimBandi(),
      sekmeSatiri(),
      h('div', { class: 'satir', style: 'align-items:center' }, araEl, q ? h('span', { class: 'alt' }, goster.length + ' / ' + goster0.length + ' kayıt') : null),
      kartlar.length ? kartlar : h('div', { class: 'kart', style: 'text-align:center;border-style:dashed;color:var(--soluk)' }, q ? 'Aramaya uyan talep yok.' : 'Henüz talep yok. "Yeni talep" ile başlayın.'));
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
    r.nitelik = h('textarea', { class: 'metin', rows: '3', maxlength: '1000', style: 'width:100%;box-sizing:border-box', placeholder: 'ör. kamyonet ile gidilecek; KKD getirin; sahada konaklama yok; giriş için X kişisini arayın' }, f.nitelik);

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
      });
      // Talep sahibi listesi: yalnız Proje Sorumlusu rolündeki kişiler (istisna + bölüm eşleştirmesi).
      talepRolListe('SORUMLU').then((l) => {
        secenek = new Map(l.map((x) => [x.ad + ' (' + x.sicil + ')', x]));
        dl.replaceChildren(...l.map((x) => h('option', { value: x.ad + ' (' + x.sicil + ')' }, x.bolum || '')));
        if (!l.length) kutu.placeholder = 'Sorumlu rolünde kişi yok (Ayarlar › Rol eşleştirme)';
      }).catch(hata);
      sorumluBolum = h('section', { class: 'kart' }, h('h2', null, '1. Talep sahibi (Proje Sorumlusu)'),
        alan('Vekâleten açıyorsanız Proje Sorumlusu havuzundan seçin', kutu), dl);
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
      { const ks = f.gunler.map((g) => g.kisi), mx = ks.length ? Math.max(...ks) : 1; r.sayac.textContent = f.gunler.length + ' gün · günlük ' + (ks.every((k) => k === mx) ? '' : 'en çok ') + mx + ' kişi'; }
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
              alan('Ana Proje', r.ana), alan('Alt Proje (yoksa boş bırakın)', r.alt), alan('Faaliyet', r.faaliyet), alan('Konum', r.konum)),
            h('div', { style: 'margin-top:10px' }, r.yeni),
            h('div', { style: 'margin-top:12px' }, h('label', { style: 'font-size:13px;display:flex;flex-direction:column;gap:4px' }, 'Görev metni', r.metin)),
            h('div', { style: 'margin-top:10px' }, alan('Saha / Operasyon Notu (isteğe bağlı: araç, teçhizat, giriş, konaklama…)', r.nitelik))),
          h('section', { class: 'kart' }, h('h2', null, '3. Gün ve zaman dilimi'),
            h('div', { class: 'satir', style: 'align-items:flex-end' }, alan('Başlangıç', r.bas), alan('Bitiş', r.bit), alan('Günlük kişi', r.kisi), alan('Mesai başlangıç', r.sb), alan('Mesai bitiş', r.sbt)),
            h('div', { style: 'margin:10px 0' }, gunKap),
            h('div', { class: 'satir', style: 'align-items:center' }, r.ekle, h('button', { type: 'button', onclick: tekGun }, 'Tek gün ekle'), r.sayac),
            h('p', { class: 'alt', style: 'margin:8px 0 0' }, 'Hafta sonu ve tatil günleri listeye gelmez; gerekirse "Tek gün ekle" ile elle eklenir. Çakışma denetimi atama sırasında yapılır.')),
          h('section', { class: 'kart' }, h('h2', null, '4. Önerilen personel (isteğe bağlı, bağlayıcı değil)'),
            h('div', { class: 'satir', style: 'margin-bottom:6px' }, oneriChip.length ? oneriChip : [h('span', { class: 'alt' }, 'Öneri yok.')]),
            talepPersonelAra('Saha personeli seçin veya ad yazın…', (p) => { oku(); if (!f.oneri.some((x) => x.sicil === p.sicil)) f.oneri.push({ sicil: p.sicil, ad: p.ad }); ciz(); }, 'SAHA'),
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

  function iletisimBlok(i) {
    const tel = (g) => g ? h('a', { href: 'tel:' + String(g).replace(/\s+/g, ''), style: 'margin-left:6px' }, g) : h('span', { class: 'alt', style: 'margin-left:6px' }, 'telefon kayıtlı değil');
    return h('div', { class: 'kart', style: 'margin:6px 0;padding:10px 14px;background:var(--zemin,transparent)' },
      i.sahaNotu ? h('div', { style: 'white-space:pre-wrap;margin-bottom:6px' }, h('b', null, 'Saha / Operasyon Notu: '), i.sahaNotu) : null,
      h('div', null, h('b', null, 'Proje Sorumlusu: '), i.sorumluAd, tel(i.sorumluGsm)),
      i.atananlar && i.atananlar.length ? h('div', { style: 'margin-top:4px' }, h('b', null, 'Atananlar:'), i.atananlar.map((a) => h('div', null, a.ad + (a.bolum ? ' (' + a.bolum + ')' : ''), tel(a.gsm)))) : null);
  }

  function ciz() { kap.replaceChildren(durum.gorunum === 'form' ? form() : durum.gorunum === 'atama' ? durum.atama : liste()); }

  await yukle();
  if (!kap.childNodes.length) ciz();
  if (S.acilis === 'yeniTalep') { S.acilis = null; await formAc(null, false); }
  return kap;
}
