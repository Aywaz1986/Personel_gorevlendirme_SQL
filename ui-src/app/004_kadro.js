// Merkez Yönetici sayfaları: Kadro, Bölüm–rol eşleştirme, Kişi istisnaları.
async function kadroSayfa() {
  const sayilar = h('div', { class: 'sayilar' });
  const son = h('div', { style: 'color:var(--soluk);font-size:13px' });
  const tablo = h('tbody'); const arama = h('input', { type: 'search', placeholder: 'Ara (ad, sicil, bölüm, hesap)', 'aria-label': 'Ara' });
  const sayac = h('span', { style: 'color:var(--soluk);font-size:13px' });
  let veri = [];
  const sayiKutu = (d, a) => h('div', { class: 'sayi' }, h('b', null, d ?? '-'), h('span', null, a));
  function ciz() {
    const q = arama.value.trim().toLocaleLowerCase('tr-TR');
    const f = veri.filter((r) => !q || [r.adiSoyadi, r.sicilNo, r.bolum, r.kullaniciAdi].some((x) => String(x || '').toLocaleLowerCase('tr-TR').includes(q)));
    tablo.replaceChildren(...f.slice(0, 500).map((r) => h('tr', null, h('td', null, r.sicilNo), h('td', null, r.adiSoyadi), h('td', null, r.bolum || '-'),
      h('td', null, r.rol ? (ROLAD[r.rol] || r.rol) : h('span', { style: 'color:var(--uyari)' }, 'Rol yok')),
      h('td', null, r.aktif ? rozet('Aktif', 'iyi') : rozet('Pasif (ayrıldı)', 'uyari')))));
    sayac.textContent = f.length > 500 ? '500 / ' + f.length + ' kişi gösteriliyor (aramayı daraltın)' : f.length + ' kişi';
  }
  async function yukle() {
    try {
      const [o, l] = await Promise.all([Kopru.cagir('kadroOzet'), Kopru.cagir('kadroListe')]);
      veri = l; ciz();
      let r = null; try { r = o.sonAyrinti ? JSON.parse(o.sonAyrinti) : null; } catch (e) { r = null; }
      son.textContent = o.sonZaman ? 'Son eşitleme: ' + tarih(o.sonZaman) + ' · ' + o.sonKullanici : 'Henüz eşitlenmedi.';
      sayilar.replaceChildren(sayiKutu(o.toplam, 'Kadro kopyasında'), sayiKutu(o.aktif, 'Aktif'),
        r ? sayiKutu(r.eklenen, 'Son eşitlemede eklenen') : null, r ? sayiKutu(r.guncellenen, 'Güncellenen') : null,
        r ? sayiKutu(r.pasife_alinan, 'Pasife alınan') : null, r ? sayiKutu(r.degismeyen, 'Değişmeyen') : null);
    } catch (e) { hata(e); }
  }
  arama.addEventListener('input', ciz);
  const esitle = h('button', { class: 'ana', onclick: async () => {
    esitle.disabled = true;
    try { const r = await Kopru.cagir('kadroEsitle'); toast('Eşitlendi: ' + r.eklenen + ' eklenen, ' + r.guncellenen + ' güncellenen, ' + r.pasifeAlinan + ' pasife alınan.'); await yukle(); }
    catch (e) { hata(e); }
    esitle.disabled = false;
  } }, "Kadroyu Özlük'ten eşitle");
  await yukle();
  return h('div', { class: 'icerik', style: 'padding:0' },
    h('div', null, h('h1', null, 'Kadro'), h('p', { class: 'alt' }, "Kadro Özlük'ten okunur; burada yalnızca beş alanlık bir kopyası tutulur (sicil, ad soyad, bölüm, telefon, kullanıcı adı, ayrılış). Bu işlem Özlük'e hiçbir şey yazmaz.")),
    h('section', { class: 'kart' }, h('div', { class: 'satir', style: 'justify-content:space-between;align-items:center' }, h('div', null, h('strong', null, "Kadroyu Özlük'ten eşitle"), son), esitle), sayilar,
      mesajKutu('uyari', "Güvenlik kapısı: Özlük'ten okunan satır sayısı mevcut aktif kadronun %80'inin altındaysa eşitleme iptal edilir. Hiçbir kayıt silinmez; ayrılanlar yalnızca pasife alınır."),
      mesajKutu('bilgi', "Eşitleme, Özlük'te tüm kurum kapsamı olan bir yönetici tarafından çalıştırılmalıdır; dar kapsamlı hesapta işlem iptal edilir.")),
    h('section', { class: 'kart' }, h('div', { class: 'satir', style: 'justify-content:space-between;align-items:center;margin-bottom:10px' }, h('strong', null, 'Kadro kopyası'), arama, sayac),
      h('div', { class: 'kaydir' }, h('table', { style: 'min-width:640px' }, h('thead', null, h('tr', null, ['Sicil', 'Ad soyad', 'Özlük bölümü', 'Çözülen rol', 'Durum'].map((x) => h('th', null, x)))), tablo))));
}

async function eslestirmeSayfa() {
  const tablo = h('tbody');
  async function yukle() {
    try {
      const l = await Kopru.cagir('eslestirmeListe');
      tablo.replaceChildren(...l.map((r) => {
        const sec = h('select', { 'aria-label': r.bolum + ' rolü', onchange: async () => {
          try { await Kopru.cagir('eslestirmeKaydet', { bolum: r.bolum, rol: sec.value }); toast('Kaydedildi.'); await yukle(); } catch (e) { hata(e); await yukle(); }
        } }, h('option', { value: '' }, '— Rol yok —'), h('option', { value: 'SORUMLU', selected: r.rol === 'SORUMLU' }, 'Proje Sorumlusu'), h('option', { value: 'SAHA', selected: r.rol === 'SAHA' }, 'Saha Personeli'));
        return h('tr', null, h('td', null, r.bolum), h('td', null, sec), h('td', null, r.kisi),
          h('td', null, r.rol ? null : h('span', { style: 'font-size:12px;color:var(--uyari)' }, r.kisi ? 'Bu kişiler hiçbir şey göremez' : '')));
      }));
    } catch (e) { hata(e); }
  }
  await yukle();
  return h('section', { class: 'kart', style: 'min-width:0' },
    h('h2', { style: 'font-size:16px;color:var(--nav)' }, 'Özlük Bölüm Adı → Sistem Rolü Eşleştirme'), h('p', { class: 'alt', style: 'margin:0 0 8px' }, 'Rol, kişinin Özlük bölümünden gelir. Merkez Yönetici bölümden değil, yalnızca "Kişi istisnaları" ile atanır. Bölüm listesi kadro eşitlemesinden gelir.'),
    h('div', { class: 'kaydir' }, h('table', { style: 'min-width:480px' }, h('thead', null, h('tr', null, ['Özlük bölümü', 'Rol', 'Aktif kişi', ''].map((x) => h('th', null, x)))), tablo)));
}

async function istisnaSayfa() {
  const tablo = h('tbody'); const dl = h('datalist', { id: 'kadroListesi' });
  const hesap = h('input', { class: 'metin', list: 'kadroListesi', placeholder: 'ALAN\\kullanici', autocomplete: 'off' });
  const sicil = h('input', { class: 'metin', placeholder: 'boş bırakılabilir' });
  const ack = h('input', { class: 'metin', placeholder: 'isteğe bağlı' });
  const yon = h('input', { type: 'checkbox' }), sor = h('input', { type: 'checkbox' }), sah = h('input', { type: 'checkbox' }), akt = h('input', { type: 'checkbox', checked: true });
  let kadro = [];
  hesap.addEventListener('change', () => { const k = kadro.find((x) => x.kullaniciAdi && x.kullaniciAdi.toLocaleLowerCase('tr-TR') === hesap.value.trim().toLocaleLowerCase('tr-TR')); if (k) sicil.value = k.sicilNo; });
  let doldur = function (r) { hesap.value = r.hesap; sicil.value = r.sicilNo || ''; ack.value = r.aciklama || ''; yon.checked = !!r.yonetici; sor.checked = !!r.sorumlu; sah.checked = !!r.saha; akt.checked = !!r.aktif; hesap.focus(); };
  const evet = (b) => (b ? 'Evet' : '–');
  async function yukle() {
    try {
      const [l, k] = await Promise.all([Kopru.cagir('istisnaListe'), Kopru.cagir('kadroListe')]);
      kadro = k; dl.replaceChildren(...k.filter((x) => x.kullaniciAdi).slice(0, 2000).map((x) => h('option', { value: x.kullaniciAdi }, x.adiSoyadi)));
      tablo.replaceChildren(...l.map((r) => h('tr', null, h('td', null, r.adiSoyadi || '-'), h('td', null, r.hesap), h('td', null, evet(r.yonetici)), h('td', null, evet(r.sorumlu)), h('td', null, evet(r.saha)),
        h('td', null, r.aktif ? rozet('Aktif', 'iyi') : rozet('Pasif', 'uyari')),
        h('td', null, h('button', { onclick: () => doldur(r) }, 'Düzenle'), ' ',
          h('button', { onclick: async () => { if (!confirm(r.hesap + ' istisnası silinsin mi?')) return; try { await Kopru.cagir('istisnaSil', { hesap: r.hesap }); toast('Silindi.'); await yukle(); } catch (e) { hata(e); } } }, 'Sil')))));
    } catch (e) { hata(e); }
  }
  const kaydet = h('button', { class: 'ana', onclick: async () => {
    try {
      await Kopru.cagir('istisnaKaydet', { hesap: hesap.value, sicilNo: sicil.value, yonetici: yon.checked, sorumlu: sor.checked, saha: sah.checked, aktif: akt.checked, aciklama: ack.value });
      toast('Kaydedildi.'); hesap.value = ''; sicil.value = ''; ack.value = ''; yon.checked = sor.checked = sah.checked = false; akt.checked = true; await yukle();
    } catch (e) { hata(e); }
  } }, 'Kaydet');
  await yukle();
  const kt = (t, c) => h('label', { class: 'onay' }, c, ' ' + t);
  // "Yeni yetkili ekle": kullanıcılar alanının sağ üst köşesindeki düğme formu açar; Düzenle de aynı formu açar.
  const formKart = h('section', { class: 'kart', hidden: true, style: 'background:var(--vurgu-bg)' }, h('h2', null, 'Yetkili ekle / düzenle'), dl,
    h('div', { class: 'form' }, h('label', null, 'Windows hesabı', hesap), h('label', null, 'Sicil (kadrodan)', sicil), h('label', null, 'Açıklama', ack),
      h('div', { class: 'tamsatir satir' }, kt('Merkez Yönetici', yon), kt('Proje Sorumlusu', sor), kt('Saha Personeli', sah), kt('Aktif', akt), kaydet, h('button', { type: 'button', onclick: () => { formKart.hidden = true; } }, 'Kapat'))));
  const doldurOrj = doldur;
  doldur = (r) => { formKart.hidden = false; doldurOrj(r); };
  return h('section', { class: 'kart', style: 'min-width:0' },
    h('div', { style: 'display:flex;gap:10px;align-items:flex-start;justify-content:space-between;flex-wrap:wrap' },
      h('div', null, h('h2', { style: 'font-size:16px;color:var(--baslik);margin:0' }, 'Yönetici Tanımı ve Kişi Bazlı İstisna Roller'), h('p', { class: 'alt', style: 'margin:2px 0 8px' }, 'Kişi bazlı istisna bölüm kuralının üzerine yazar: kişinin rolleri yalnızca burada işaretlenenlerdir. Merkez Yönetici de buradan atanır.')),
      h('button', { class: 'ana', type: 'button', onclick: () => { formKart.hidden = false; hesap.value = ''; sicil.value = ''; ack.value = ''; yon.checked = sor.checked = sah.checked = false; akt.checked = true; hesap.focus(); } }, '+ Yeni yetkili ekle')),
    formKart,
    h('div', { class: 'kaydir' }, h('table', { style: 'min-width:640px' }, h('thead', null, h('tr', null, ['Kişi', 'Windows hesabı', 'Yönetici', 'Sorumlu', 'Saha', 'Durum', ''].map((x) => h('th', null, x)))), tablo)),
    h('div', { class: 'mesaj uyari', style: 'font-size:12px' }, 'Son aktif yöneticinin yöneticiliği kaldırılamaz: işlem sunucuda reddedilir.'));
}
