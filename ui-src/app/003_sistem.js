// Bağlantı formu ve Sistem sayfası (sürüm kapısı, şema kurulumu, sunucu denetimi).
function baglantiFormu(hataMetni) {
  const sunucu = h('input', { class: 'metin', id: 'sunucu', placeholder: 'SUNUCU,PORT', autocomplete: 'off' });
  const db = h('input', { class: 'metin', id: 'veritabani', placeholder: 'veritabanı adı', autocomplete: 'off' });
  const sif = h('input', { type: 'checkbox', checked: true });
  const guv = h('input', { type: 'checkbox' });
  const kutu = h('div', { class: 'mesaj kotu', hidden: !hataMetni }, hataMetni || '');
  const bagla = h('button', { class: 'ana', onclick: async () => {
    kutu.hidden = true;
    try {
      await Kopru.cagir('baglan', { server: sunucu.value, database: db.value, encrypt: sif.checked, trust: guv.checked, kaydet: true });
      await baslaSonrasi();
    } catch (e) { kutu.textContent = e.message; kutu.hidden = false; }
  } }, 'Bağlan');
  goster(h('div', { class: 'tam' }, h('div', { class: 'kutu', style: 'text-align:left;justify-items:stretch' },
    h('h1', { style: 'font-size:20px;margin:0' }, 'Personel Görevlendirme'),
    h('p', { class: 'alt', style: 'margin:0;color:var(--soluk)' }, 'SQL Server bağlantısı (Windows kimliğiyle)'),
    h('label', null, 'Sunucu', sunucu), h('label', null, 'Veritabanı', db),
    h('label', { class: 'onay' }, sif, ' Şifreli bağlantı'), h('label', { class: 'onay' }, guv, ' Sertifikaya güven'),
    bagla, kutu)));
}

async function sistemIcerik() {
  const kart = h('section', { class: 'kart' }, h('h2', null, 'Durum'));
  const liste = h('dl'); const msj = h('div'); const islem = h('div', { hidden: true });
  const denetim = h('section', { class: 'kart', hidden: true }, h('h2', null, 'Sunucu denetimi'));
  const govde = h('tbody');
  denetim.append(h('div', { class: 'kaydir' }, h('table', null, h('thead', null, h('tr', null, h('th', null, 'Denetim'), h('th', null, 'Durum'), h('th', null, 'Ayrıntı'))), govde)));
  const kur = h('button', { class: 'ana', hidden: true, onclick: async () => {
    kur.disabled = true;
    try {
      const r = await Kopru.cagir('semaUygula', {});
      islem.className = 'mesaj iyi'; islem.textContent = r.uygulananlar.length ? 'Uygulandı: ' + r.uygulananlar.join(', ') : 'Uygulanacak betik yok.'; islem.hidden = false;
    } catch (e) { islem.className = 'mesaj kotu'; islem.textContent = e.message; islem.hidden = false; }
    kur.disabled = false; await yenile();
  } }, 'Şemayı kur / yükselt');
  async function yenile() {
    liste.replaceChildren();
    const ekle = (a, d) => liste.append(h('dt', null, a), h('dd', null, d));
    try {
      const s = await Kopru.cagir('surumDurum'); S.surum = s;
      ekle('Uygulama sürümü', s.uygulama);
      ekle('Şema sürümü', (s.sema ?? 'kurulu değil') + ' (bu exe: ' + s.hedefSema + ')');
      ekle('Asgari uygulama sürümü', s.asgari ?? '-');
      ekle('Ortam', s.ortam ? rozet(s.ortam, s.ortam === 'CANLI' ? 'kotu' : 'iyi') : '-');
      ekle('Hesap', s.hesap || '-');
      msj.replaceChildren(mesajKutu(s.durum === 'tamam' ? 'iyi' : (s.engelle ? 'kotu' : 'uyari'), s.mesaj));
      const d = await Kopru.cagir('semaDurum').catch(() => null);
      kur.hidden = !(d && d.bekleyen.length > 0 && d.sahipUygun);
      if (d && !d.sahipUygun) msj.replaceChildren(mesajKutu('kotu', "'gorev' şemasının sahibi beklenen değil (" + d.semaSahibi + '). Kurulum durduruldu.'));
    } catch (e) { msj.replaceChildren(mesajKutu('kotu', e.message)); }
  }
  const dnt = h('button', { onclick: async () => {
    govde.replaceChildren();
    try {
      const r = await Kopru.cagir('sunucuDenetimi');
      for (const x of r.sonuc) govde.append(h('tr', null, h('td', null, x.ad), h('td', null, rozet(x.durum, { tamam: 'iyi', hata: 'kotu' }[x.durum] || 'uyari')), h('td', null, x.ayrinti)));
      denetim.hidden = false;
    } catch (e) { hata(e); }
  } }, 'Sunucu denetimi');
  kart.append(liste, msj, h('div', { class: 'satir', style: 'margin-top:12px' }, kur, dnt,
    h('button', { onclick: yenile }, 'Yenile'),
    h('button', { onclick: async () => { await Kopru.cagir('baglantiKapat'); S.kimlik = null; baglantiFormu(); } }, 'Bağlantıyı kapat')), islem);
  await yenile();
  return h('div', { class: 'icerik', style: 'padding:0' }, h('h1', null, 'Sistem'), kart, await canliKart(yenile), denetim);
}

/* Canlıya geçiş kontrolü (Dilim 10): zorunlu maddeler tamamsa tek yönlü TEST → CANLI. */
async function canliKart(sonra) {
  const kart = h('section', { class: 'kart' }, h('h2', null, 'Canlıya geçiş'));
  const govde = h('tbody'); const msj = h('div');
  const onay = h('input', { class: 'metin', placeholder: 'onay için CANLI yazın', style: 'max-width:200px' });
  const minS = h('input', { class: 'metin', placeholder: 'asgari sürüm (örn. 1.0.0)', style: 'max-width:200px' });
  const gec = h('button', { class: 'ana', disabled: true, onclick: async () => {
    try {
      await Kopru.cagir('canliyaGec', { onay: onay.value.trim(), minSurum: minS.value.trim() });
      toast('Sistem CANLI ortama alındı.'); await sonra();
      msj.replaceChildren(mesajKutu('iyi', 'Canlıya geçildi. Sıfırlama ve eski veri geri alma artık kapalıdır.'));
    } catch (e) { hata(e); }
  } }, 'Canlıya geç');
  let kontrol = [];
  async function yukle() {
    govde.replaceChildren();
    try {
      kontrol = await Kopru.cagir('canliKontrol');
      for (const k of kontrol) govde.append(h('tr', null, h('td', null, k.kontrol), h('td', null, rozet(k.tamam ? 'Tamam' : (k.zorunlu ? 'Eksik' : 'Uyarı'), k.tamam ? 'iyi' : (k.zorunlu ? 'kotu' : 'uyari'))), h('td', null, k.ayrinti)));
      const eksik = kontrol.some((k) => k.zorunlu && !k.tamam);
      gec.disabled = eksik;
      msj.replaceChildren(mesajKutu(eksik ? 'uyari' : 'iyi', eksik ? 'Zorunlu maddeler tamamlanmadan canlıya geçilemez.' : 'Zorunlu maddeler tamam. Geçiş tek yönlüdür; geri dönüş yalnız veritabanı yöneticisinin betiğiyle yapılır.'));
    } catch (e) { msj.replaceChildren(mesajKutu('kotu', e.message)); }
  }
  kart.append(h('p', { class: 'alt', style: 'margin:0 0 8px' }, 'Pilot bittiğinde sistemi CANLI ortama alır. Geçişten sonra sıfırlama ve kaldırma betikleri çalışmaz.'),
    h('div', { class: 'kaydir' }, h('table', null, h('thead', null, h('tr', null, h('th', null, 'Kontrol'), h('th', null, 'Durum'), h('th', null, 'Ayrıntı'))), govde)), msj,
    h('div', { class: 'satir', style: 'margin-top:10px;align-items:center' }, minS, onay, gec, h('button', { onclick: yukle }, 'Kontrolü yenile')));
  await yukle();
  return kart;
}
