// Kullanıcı Yetki & İşlem Günlüğü sekmesi (Dilim 14): bölüm–rol eşleştirme, yönetici/istisna tanımı (+ yeni yetkili ekle), işlem günlüğü.
async function yetkiSayfa() {
  S.yenile = null;
  const kap = h('div', { style: 'display:flex;flex-direction:column;gap:16px;min-width:0' });
  const ust = h('div', { style: 'display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:16px;align-items:start' });
  const [es, ist, gun] = await Promise.all([eslestirmeSayfa(), istisnaSayfa(), ayarGunluk()]);
  ust.append(es, ist);
  kap.append(ust, gun);
  return kap;
}
