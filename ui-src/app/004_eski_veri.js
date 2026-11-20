/* Eski veri: kuru çalıştırma raporu (Dilim 3b). Hiçbir şey yazılmaz. */
async function eskiVeriSayfa() {
  const durum = { maskele: true, sonuc: null, bekle: false };
  const kap = h('div');

  async function calistir() {
    durum.bekle = true; ciz();
    try {
      const o = await Kopru.cagir('eskiVeriDenetle', { maskele: durum.maskele });
      if (!o.iptal) durum.sonuc = o;
    } catch (e) { hata(e); }
    durum.bekle = false; ciz();
  }

  function indir(metin, ad) {
    const a = h('a', { href: URL.createObjectURL(new Blob(['﻿' + metin], { type: 'text/plain;charset=utf-8' })), download: ad });
    document.body.appendChild(a); a.click(); a.remove();
  }

  function ciz() {
    const s = durum.sonuc;
    const sec = h('input', { type: 'checkbox', id: 'ev-maske', checked: durum.maskele, onchange: (e) => { durum.maskele = e.target.checked; } });
    const kutu = (b, v, k) => h('div', { style: 'flex:1;min-width:140px;padding:10px 14px;border:1px solid var(--cizgi,#ccc);border-radius:8px' }, h('div', { class: 'alt' }, b), h('div', { style: 'font-size:22px;font-weight:600' + (k ? ';color:var(--kotu)' : '') }, v));
    kap.replaceChildren(
      h('section', { class: 'kart' },
        h('p', { style: 'margin:0 0 8px' }, 'Eski aracın ', h('strong', null, 'gorevlendirme.db'), ' dosyasını seçin. Dosya yalnız okunur; sunucuya ve dosyaya hiçbir şey yazılmaz.'),
        h('div', { class: 'satir', style: 'align-items:center' },
          h('label', { for: 'ev-maske' }, sec, ' Ad soyad ve sicilleri maskele (paylaşmak için önerilir)'),
          h('button', { class: 'ana', disabled: durum.bekle, onclick: calistir }, durum.bekle ? 'Okunuyor…' : 'Dosya seç ve denetle'))),
      s ? h('div', null,
        h('section', { class: 'kart' }, h('div', { class: 'satir', style: 'gap:10px' },
          kutu('Personel', s.sayilar.personel), kutu('Eşleşmeyen personel', s.sayilar.personelYok, s.sayilar.personelYok > 0),
          kutu('Görevli atama', s.sayilar.atama_gorevli || 0), kutu('İzinli', s.sayilar.atama_izinli || 0), kutu('Raporlu', s.sayilar.atama_raporlu || 0),
          kutu('Çakışma', s.sayilar.cakisma || 0, s.sayilar.cakisma > 0), kutu('Dikkat', s.sayilar.dikkat, s.sayilar.dikkat > 0))),
        h('section', { class: 'kart' },
          h('div', { class: 'satir', style: 'margin-bottom:8px;align-items:center' }, h('strong', null, 'Rapor: ' + s.dosya),
            h('button', { onclick: async () => { try { await navigator.clipboard.writeText(s.metin); toast('Rapor panoya kopyalandı.'); } catch { toast('Kopyalanamadı; “Dosyaya kaydet”i kullanın.', 'uyari'); } } }, 'Panoya kopyala'),
            h('button', { onclick: () => indir(s.metin, 'eski-veri-raporu.txt') }, 'Dosyaya kaydet')),
          h('pre', { style: 'white-space:pre-wrap;max-height:520px;overflow:auto;font-size:12px;margin:0' }, s.metin))) : null);
  }

  ciz();
  return h('div', { class: 'icerik', style: 'padding:0' },
    h('div', null, h('h1', null, 'Eski veri (denetim)'),
      h('p', { class: 'alt' }, 'Eski görevlendirme aracındaki verinin yeni sisteme nasıl aktarılacağını önceden gösterir: personel eşleşmesi, proje ağacı, görevli/izinli/raporlu sayıları, çakışmalar. Gerçek aktarım bu rapor incelendikten sonra yapılır.')),
    kap);
}
