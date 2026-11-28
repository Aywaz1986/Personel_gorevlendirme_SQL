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

  function indir(metin, ad) { dosyaKaydet(ad, metin); }

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

  /* Gerçek aktarım (Dilim 10): yalnız TEST ortamında, geri alınabilir. */
  const akt = h('section', { class: 'kart' });
  async function aktCiz() {
    let d = null;
    try { d = await Kopru.cagir('eskiAktarDurum'); } catch (e) { akt.replaceChildren(h('h2', null, 'Aktarım'), mesajKutu('kotu', e.message)); return; }
    const var_ = (d.talep + d.atama + d.izin + d.rapor + d.gecmis) > 0;
    const onay = h('input', { class: 'metin', placeholder: var_ ? 'GERIAL yazın' : 'AKTAR yazın', style: 'max-width:160px' });
    const sonuc = h('div');
    const calistir = async () => {
      if (onay.value.trim() !== 'AKTAR') { toast('Onay için AKTAR yazın.', 'uyari'); return; }
      try {
        const o = await Kopru.cagir('eskiAktar', {});
        if (o.iptal) return;
        toast('Aktarıldı: ' + o.ozet); await aktCiz();
      } catch (e) { hata(e); }
    };
    const geriAl = async () => {
      if (onay.value.trim() !== 'GERIAL') { toast('Onay için GERIAL yazın.', 'uyari'); return; }
      try { await Kopru.cagir('eskiAktarGeriAl', { onay: 'GERIAL' }); toast('Aktarım geri alındı.'); await aktCiz(); } catch (e) { hata(e); }
    };
    akt.replaceChildren(h('h2', null, 'Aktarım (gerçek yazma)'),
      h('p', { class: 'alt', style: 'margin:0 0 8px' }, 'Seçilen eski veri tek işlemde aktarılır: görevli → talep + atama, izinli → onaylı izin, raporlu → evraksız rapor, haftasız görevli → tarihsiz geçmiş. Her kayıt "eski araç" olarak işaretlenir; "Aktarımı geri al" yalnız onları siler. Yalnız TEST ortamında ve Merkez Yönetici tarafından yapılır.'),
      h('div', { class: 'satir', style: 'gap:10px;margin-bottom:8px' },
        ...[['Talep', d.talep], ['Atama (kişi-gün)', d.atama], ['İzin', d.izin], ['Rapor', d.rapor], ['Tarihsiz geçmiş', d.gecmis], ['Havuz (yeni)', d.havuz]].map(([b, v]) =>
          h('div', { style: 'flex:1;min-width:110px;padding:8px 12px;border:1px solid var(--cizgi,#ccc);border-radius:8px' }, h('div', { class: 'alt' }, b), h('div', { style: 'font-size:20px;font-weight:600' }, String(v))))),
      d.ortam === 'CANLI' ? mesajKutu('uyari', 'Sistem CANLI: aktarım ve geri alma kapalıdır.')
        : h('div', { class: 'satir', style: 'align-items:center' }, onay,
            h('button', { class: 'ana', disabled: var_, title: var_ ? 'Önce mevcut aktarımı geri alın' : '', onclick: calistir }, 'Dosya seç ve aktar'),
            h('button', { disabled: !var_, onclick: geriAl }, 'Aktarımı geri al')),
      sonuc);
  }
  aktCiz();

  ciz();
  return h('div', { class: 'icerik', style: 'padding:0' },
    h('div', null, h('h1', null, 'Eski veri (denetim)'),
      h('p', { class: 'alt' }, 'Eski görevlendirme aracındaki verinin yeni sisteme nasıl aktarılacağını önceden gösterir: personel eşleşmesi, proje ağacı, görevli/izinli/raporlu sayıları, çakışmalar. Gerçek aktarım bu rapor incelendikten sonra yapılır.')),
    kap, akt);
}
