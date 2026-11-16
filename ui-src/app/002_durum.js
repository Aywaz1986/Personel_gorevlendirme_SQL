// Dilim 1 kabuk ekranı: bağlantı, sürüm kapısı, şema kurulumu, sunucu denetimi.
const $ = (id) => document.getElementById(id);
const ROZET = { tamam: 'iyi', uyari: 'uyari', hata: 'kotu', atlandi: 'uyari' };

function metin(el, t) { el.textContent = t; }
function goster(el, ac) { el.hidden = !ac; }
function mesaj(el, tur, t) { el.className = 'mesaj ' + tur; metin(el, t); goster(el, true); }
function rozet(t, tur) { const s = document.createElement('span'); s.className = 'rozet ' + tur; s.textContent = t; return s; }

async function baglanSonrasi(sonuc) {
  goster($('baglantiForm'), false);
  goster($('baglantiHata'), false);
  metin($('baglantiOzet'), 'Bağlı: ' + sonuc.sunucu + ' / ' + sonuc.veritabani + ' (' + sonuc.info.login + ')');
  goster($('baglantiOzet'), true);
  await durumYenile();
}

async function durumYenile() {
  goster($('durumKart'), true);
  const liste = $('durumListe');
  liste.replaceChildren();
  const ekle = (ad, deger) => {
    const dt = document.createElement('dt'); dt.textContent = ad;
    const dd = document.createElement('dd');
    if (deger instanceof Node) dd.appendChild(deger); else dd.textContent = deger;
    liste.append(dt, dd);
  };
  try {
    const s = await Kopru.cagir('surumDurum');
    metin($('surumEtiket'), 'Uygulama ' + s.uygulama);
    ekle('Uygulama sürümü', s.uygulama);
    ekle('Şema sürümü', (s.sema ?? 'kurulu değil') + ' (bu exe: ' + s.hedefSema + ')');
    ekle('Asgari uygulama sürümü', s.asgari ?? '-');
    ekle('Ortam', s.ortam ? rozet(s.ortam, s.ortam === 'CANLI' ? 'kotu' : 'iyi') : '-');
    ekle('Hesap', s.hesap || '-');
    const tur = s.durum === 'tamam' ? 'iyi' : (s.engelle ? 'kotu' : 'uyari');
    mesaj($('surumMesaj'), tur, s.mesaj);
    const d = await Kopru.cagir('semaDurum').catch(() => null);
    goster($('kurDugme'), !!d && d.bekleyen.length > 0 && d.sahipUygun);
    if (d && !d.sahipUygun) mesaj($('surumMesaj'), 'kotu', "'gorev' şemasının sahibi beklenen değil (" + d.semaSahibi + "). Kurulum durduruldu.");
  } catch (e) {
    mesaj($('surumMesaj'), 'kotu', e.message);
  }
}

async function baglantiDene() {
  try {
    const r = await Kopru.cagir('baglantiDene');
    if (!r.kayit) { goster($('baglantiForm'), true); return; }
    await baglanSonrasi(r);
  } catch (e) {
    goster($('baglantiForm'), true);
    mesaj($('baglantiHata'), 'kotu', e.message);
  }
}

$('baglanDugme').addEventListener('click', async () => {
  goster($('baglantiHata'), false);
  try {
    const r = await Kopru.cagir('baglan', {
      server: $('sunucu').value, database: $('veritabani').value,
      encrypt: $('sifrele').checked, trust: $('guven').checked, kaydet: true,
    });
    await baglanSonrasi(r);
  } catch (e) { mesaj($('baglantiHata'), 'kotu', e.message); }
});

$('yenileDugme').addEventListener('click', durumYenile);

$('kapatDugme').addEventListener('click', async () => {
  await Kopru.cagir('baglantiKapat');
  goster($('durumKart'), false); goster($('denetimKart'), false); goster($('baglantiOzet'), false);
  goster($('baglantiForm'), true);
});

$('kurDugme').addEventListener('click', async () => {
  const dugme = $('kurDugme');
  dugme.disabled = true;
  try {
    const r = await Kopru.cagir('semaUygula', {});
    mesaj($('islemMesaj'), 'iyi', r.uygulananlar.length ? 'Uygulandı: ' + r.uygulananlar.join(', ') : 'Uygulanacak betik yok.');
  } catch (e) { mesaj($('islemMesaj'), 'kotu', e.message); }
  dugme.disabled = false;
  await durumYenile();
});

$('denetimDugme').addEventListener('click', async () => {
  const govde = $('denetimGovde');
  govde.replaceChildren();
  try {
    const r = await Kopru.cagir('sunucuDenetimi');
    for (const x of r.sonuc) {
      const tr = document.createElement('tr');
      const a = document.createElement('td'); a.textContent = x.ad;
      const d = document.createElement('td'); d.appendChild(rozet(x.durum, ROZET[x.durum] || 'uyari'));
      const y = document.createElement('td'); y.textContent = x.ayrinti;
      tr.append(a, d, y); govde.appendChild(tr);
    }
    goster($('denetimKart'), true);
  } catch (e) { mesaj($('islemMesaj'), 'kotu', e.message); }
});

baglantiDene();
