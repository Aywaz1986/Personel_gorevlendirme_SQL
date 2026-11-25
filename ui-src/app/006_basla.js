// Açılış akışı: bağlantı → sürüm kapısı → kimlik → rol görünümü.
async function baslaSonrasi() {
  const s = await Kopru.cagir('surumDurum'); S.surum = s;
  if (s.durum !== 'tamam') {                       // şema yok/eski ya da sürüm engeli: yalnızca Sistem sayfası
    baglantiPenceresi();
    goster(h('div', { class: 'kabuk' }, h('div', { class: 'ust' }, h('strong', null, 'Personel Görevlendirme')), h('div', { class: 'icerik' }, await sistemIcerik())));
    return;
  }
  const k = await Kopru.cagir('ben', { tercih: tercihOku() }); S.kimlik = k;
  if (!k.kayitli) { yetkisizSayfa(k); return; }
  S.gorunum = k.varsayilan; S.sayfa = null;
  await kabukCiz();
}
// Sessiz bağlantı: önce exe klasöründeki ortak dosya (ya da kullanıcıya özel kayıt); form yalnızca yönetici bağlantısıyla açılır.
async function otoBaglan() {
  try {
    const r = await Kopru.cagir('baglantiDene');
    if (!r.kayit) { bilgiEkrani('yok'); return; }
    S.baglanti = { sunucu: r.sunucu, veritabani: r.veritabani, kaynak: r.kaynak };
    await baslaSonrasi();
  } catch (e) { bilgiEkrani('baglanamadi', e.message); }
}
(async () => {
  try { gorunumUygula(); } catch (e) { /* görünüm tercihi okunamazsa varsayılan */ }
  try { logoUygula(); } catch (e) { /* logo okunamazsa yok say */ }
  try { const b = await Kopru.cagir('baglantiBilgi'); S.pencere = b.pencere; } catch (e) { /* konum okunamazsa pencere kendi yerinde açılır */ }
  await otoBaglan();
})();
