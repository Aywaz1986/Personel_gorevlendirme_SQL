// Açılış akışı: bağlantı → sürüm kapısı → kimlik → rol görünümü.
async function baslaSonrasi() {
  const s = await Kopru.cagir('surumDurum'); S.surum = s;
  if (s.durum !== 'tamam') {                       // şema yok/eski ya da sürüm engeli: yalnızca Sistem sayfası
    goster(h('div', { class: 'kabuk' }, h('div', { class: 'ust' }, h('strong', null, 'Personel Görevlendirme')), h('div', { class: 'icerik' }, await sistemIcerik())));
    return;
  }
  const k = await Kopru.cagir('ben', { tercih: tercihOku() }); S.kimlik = k;
  if (!k.kayitli) { yetkisizSayfa(k); return; }
  S.gorunum = k.varsayilan; S.sayfa = null;
  await kabukCiz();
}
(async () => {
  try {
    const r = await Kopru.cagir('baglantiDene');
    if (!r.kayit) { baglantiFormu(); return; }
    await baslaSonrasi();
  } catch (e) { baglantiFormu(e.message); }
})();
