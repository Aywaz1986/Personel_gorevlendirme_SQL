// Kullanıcı Yetki (Dilim 17): alt alta tek sütun — Yönetici tanımı / kişi bazlı roller, sonra Özlük bölüm adı → sistem rolü eşleştirme. İşlem günlüğü Ayarlar'dadır.
async function yetkiSayfa() {
  S.yenile = null;
  const [ist, es] = await Promise.all([istisnaSayfa(), eslestirmeSayfa()]);
  return h('div', { style: 'display:flex;flex-direction:column;gap:16px;min-width:0;max-width:1100px' }, ist, es);
}
