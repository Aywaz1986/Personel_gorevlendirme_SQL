// Merkez Yönetici sayfası: Kadro. (Bölüm–rol eşleştirme ve kişi istisnaları: 004_yetki.js, Dilim 20.)
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
