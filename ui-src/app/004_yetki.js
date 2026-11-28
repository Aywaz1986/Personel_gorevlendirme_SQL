// Kullanıcı Yetki Yönetimi (Dilim 20): "Kullanıcı Yetki Yönetimi" prototipinin (Murat, 26.11.2026) uyarlaması.
// Bölüm 1: Yönetici tanımı ve kişi bazlı istisna roller (öncelikli). Bölüm 2: Özlük bölüm adı → varsayılan sistem rolü.
// Kurallar ve yetki sunucudadır (istisnaKaydet/istisnaSil/eslestirmeKaydet/kadroListe); "etkin yetki" ekranı aynı kuralın istemci yansımasıdır.
const YT_ROL_AD = { YONETICI: '🛡️ Merkez Yönetici', SORUMLU: '📋 Proje Sorumlusu', SAHA: '👷 Saha Personeli', DISI: '🚫 Kapsam Dışı (Erişimsiz)', BEKLIYOR: '⚠️ Eşleştirme Bekliyor' };
const YT_OZET = {
  SORUMLU: 'Açılış: Yeni Görev Talebi & Aktif Taleplerim • Kendi taleplerini açar, onay durumunu izler; Haftalık Özet ve Analizi görür.',
  SAHA: 'Açılış: Görevlerim, İzin Talebi & Rapor Beyanı • Atandığı görevleri görür, izin talebi ve belgeli rapor girebilir.',
  DISI: 'Sisteme giriş yok • Bu bölüm kapsam dışı bırakıldı; görevlendirme havuzunda ve ekranlarda yer almaz.',
  BEKLIYOR: 'Tanımsız bölüm • Henüz rol eşleştirilmediği için bu bölümdeki personel varsayılan erişim alamaz.',
};
const ytHesap = (x) => String(x || '').toLocaleLowerCase('tr-TR').split('\\').pop();

async function yetkiSayfa() {
  S.yenile = null;
  const D = { kadro: [], ist: [], esl: [], hazir: new Map(), ara: '', f1: 'TUMU', f2: 'TUMU', acik: null, uyari: '' };
  const kap = h('div', { class: 'yt' });
  const tr = (x) => String(x || '').toLocaleLowerCase('tr-TR');
  const blmRol = (b) => { if (D.hazir.has(b)) return D.hazir.get(b); const e = D.esl.find((x) => x.bolum === b); return e && e.rol ? e.rol : 'BEKLIYOR'; };
  const kayitliRol = (b) => { const e = D.esl.find((x) => x.bolum === b); return e && e.rol ? e.rol : 'BEKLIYOR'; };
  const istDe = (k) => D.ist.find((i) => i.aktif && ((i.sicilNo && k.sicilNo && String(i.sicilNo) === String(k.sicilNo)) || (i.hesap && k.kullaniciAdi && ytHesap(i.hesap) === ytHesap(k.kullaniciAdi))));
  const kisiDe = (i) => D.kadro.find((k) => (i.sicilNo && String(k.sicilNo) === String(i.sicilNo)) || (k.kullaniciAdi && ytHesap(k.kullaniciAdi) === ytHesap(i.hesap)));
  const istRoller = (i) => [i.yonetici ? 'YONETICI' : null, i.sorumlu ? 'SORUMLU' : null, i.saha ? 'SAHA' : null].filter(Boolean);
  const yoneticiSay = () => D.ist.filter((i) => i.aktif && i.yonetici).length;
  function etkin(k) {
    const i = istDe(k);
    if (i && istRoller(i).length) return { roller: istRoller(i), kaynak: 'Bölüm 1 — Kişi Bazlı Tanım / İstisna (Özlük bölüm kuralının üzerine yazıldı)' };
    const r = kayitliRol(k.bolum);
    if (r === 'SORUMLU' || r === 'SAHA') return { roller: [r], kaynak: 'Bölüm 2 — Özlük Bölüm Varsayılanı (' + (k.bolum || '-') + ')' };
    return { roller: [], kaynak: r === 'DISI' ? 'Bölüm 2 — Özlük Bölümü Kapsam Dışı (' + (k.bolum || '-') + ')' : 'Bölüm 2 — Eşleşme Bekleyen Özlük Bölümü (' + (k.bolum || '-') + ')' };
  }

  async function yukle() {
    try {
      const [k, i, e] = await Promise.all([Kopru.cagir('kadroListe'), Kopru.cagir('istisnaListe'), Kopru.cagir('eslestirmeListe')]);
      D.kadro = k; D.ist = i; D.esl = e; D.hazir = new Map([...D.hazir].filter(([b, r]) => kayitliRol(b) !== r));
      ciz();
    } catch (e) { hata(e); }
  }
  // Son aktif yönetici gibi sunucu engelleri bantta gösterilir.
  async function istCagir(cmd, args, mesaj, yoneticiMi) {
    try { await Kopru.cagir(cmd, args); D.uyari = ''; if (mesaj) toast(mesaj, 'iyi'); await yukle(); }
    catch (e) { if (yoneticiMi) { D.uyari = 'GÜVENLİK ENGELİ: ' + (e && e.message ? e.message : String(e)); ciz(); } else hata(e); }
  }

  // ---- KPI ----
  function kpi() {
    const am = yoneticiSay(), ist = D.ist.filter((i) => i.aktif && (i.sorumlu || i.saha)).length;
    const top = D.esl.length, es = D.esl.filter((x) => x.rol).length, oran = top ? Math.round(es / top * 100) : 0;
    const ak = D.kadro.filter((k) => k.aktif), kapsam = ak.filter((k) => etkin(k).roller.length).length;
    const kart = (ad, v, alt, rozet, renk) => h('div', { class: 'hz-kpi', style: '--k:' + renk }, h('div', { class: 'hz-kpi-ust' }, h('span', null, ad), h('span', { class: 'hz-kr' }, rozet)), h('div', { class: 'hz-kpi-sayi' }, v, h('small', null, ' ' + alt)));
    return h('section', { class: 'hz-kpis' }, kart('Aktif Merkez Yöneticisi', String(am), 'Aktif Yönetici (Min. 1 Zorunlu)', '🛡️ Son Aktif Yönetici Koruması', '#7c3aed'),
      kart('Kişi Bazlı İstisna / Çoklu Rol', String(ist), 'Aktif İstisna Kaydı', 'Bölüm Kuralına Öncelikli', 'var(--vurgu)'),
      kart('Eşleştirilmiş Özlük Bölümü Oranı', '%' + oran, '(' + es + ' / ' + top + ' Özlük Bölümü)', es < top ? (top - es) + ' Yeni Bölüm Bekliyor' : 'Tamamı Eşleşti', es < top ? 'var(--uyari)' : 'var(--iyi)'),
      kart('Kapsamdaki Aktif Özlük Personeli', String(kapsam), '/ ' + ak.length + ' Özlük Personeli', 'Canlı Yetki Kapsamı', 'var(--iyi)'));
  }

  // ---- Bölüm 1 ----
  const rolRozet = (r) => h('span', { class: 'yt-rb ' + ({ YONETICI: 'yon', SORUMLU: 'sor', SAHA: 'sah' }[r]) }, { YONETICI: '🛡️ Merkez Yönetici', SORUMLU: '📋 Proje Sorumlusu (İstisna)', SAHA: '👷 Saha Personeli (İstisna)' }[r]);
  function bolum1() {
    const q = tr(D.ara), ay = yoneticiSay();
    const l = D.ist.filter((i) => {
      const k = kisiDe(i);
      if (q && ![i.adiSoyadi, i.sicilNo, i.hesap, k && k.bolum].some((x) => tr(x).includes(q))) return false;
      if (D.f1 === 'YONETICI' && !i.yonetici) return false;
      if (D.f1 === 'ISTISNA' && !(i.sorumlu || i.saha)) return false;
      if (D.f1 === 'PASIF' && i.aktif) return false;
      return true;
    });
    const satirlar = l.length ? l.map((i) => {
      const k = kisiDe(i), r = istRoller(i), son = i.aktif && i.yonetici && ay === 1;
      return h('tr', null,
        h('td', null, h('div', { class: 'yt-ad' }, i.adiSoyadi || '-'), h('div', { class: 'yt-alt' }, h('span', null, 'Sicil: ', h('b', null, i.sicilNo || '-')), ' • ', h('span', { class: 'yt-win' }, i.hesap))),
        h('td', null, h('span', { class: 'yt-pill', title: 'Özlük kadrosundan salt okunur gelir' }, '🏢 ' + ((k && k.bolum) || '-'))),
        h('td', null, h('div', { class: 'yt-rozetler' }, r.map(rolRozet), i.saha && i.sahaListede === false ? h('span', { class: 'yt-rb', title: 'Saha ekranlarını kullanır; saha personeli listelerinde görünmez ve göreve atanamaz' }, '⊘ Listede değil') : null, r.length > 1 ? h('span', { class: 'yt-rb coklu', title: 'Birden fazla rolü olduğu için üst menüde görünüm geçişi açılır' }, '⇄ Üst Menü Görünüm Geçişi') : null)),
        h('td', { style: 'max-width:300px;font-size:12px;color:var(--soluk)' }, i.aciklama || h('i', null, 'Gerekçe girilmemiş')),
        h('td', null, h('div', { class: 'yt-durum' }, h('button', { type: 'button', class: 'yt-tog ' + (i.aktif ? 'ak' : 'pa'), title: 'Aktif / Pasif durumunu değiştir',
          onclick: () => istCagir('istisnaKaydet', { hesap: i.hesap, sicilNo: i.sicilNo, yonetici: i.yonetici, sorumlu: i.sorumlu, saha: i.saha, sahaListede: i.sahaListede !== false, aktif: !i.aktif, aciklama: i.aciklama }, i.aktif ? 'Yetki kaydı pasife alındı.' : 'Yetki kaydı aktifleştirildi.', i.yonetici) }, i.aktif ? '● Aktif' : '○ Pasif'),
          son ? h('span', { class: 'yt-kilit' }, '🔒 Son Yönetici') : null)),
        h('td', { style: 'text-align:right;white-space:nowrap' }, h('span', { class: 'yt-isl' }, h('button', { type: 'button', class: 'hv-b', onclick: () => modalAc(i) }, '✎ Düzenle'),
          h('button', { type: 'button', class: 'hv-b kotu', onclick: () => { if (!confirm((i.adiSoyadi || i.hesap) + ' için bireysel istisna kaldırılsın mı? Kişi artık Özlük bölüm kuralına tabi olur.')) return; istCagir('istisnaSil', { hesap: i.hesap }, 'Kişi bazlı yetki kaldırıldı.', i.aktif && i.yonetici); } }, '🗑️ Kaldır'))));
    }) : [h('tr', null, h('td', { colspan: '6', style: 'text-align:center;padding:26px;color:var(--soluk)' }, 'Seçili arama veya filtre kriterine uygun yetki/istisna kaydı bulunamadı.'))];
    const ara = h('input', { type: 'search', class: 'metin', placeholder: 'Ad Soyad, Sicil No, Windows kimliği veya bölüm ara…', value: D.ara, style: 'min-width:260px;flex:1;max-width:420px', 'aria-label': 'Ara' });
    ara.addEventListener('input', () => { D.ara = ara.value; ciz(); const y = kap.querySelector('.yt-ara1 input'); if (y) { y.focus(); y.setSelectionRange(y.value.length, y.value.length); } });
    const pil = (k, a) => h('button', { type: 'button', class: D.f1 === k ? 'on' : '', onclick: () => { D.f1 = k; ciz(); } }, a);
    return h('section', { class: 'yt-bol' },
      h('div', { class: 'yt-bb' }, h('div', { style: 'min-width:0' }, h('div', { class: 'yt-adim' }, 'Bölüm 1 • Öncelikli Bireysel Yetki Katmanı'), h('h2', { class: 'yt-bt' }, '1. Yönetici Tanımı ve Kişi Bazlı İstisna Roller'),
        h('p', { class: 'alt', style: 'margin:2px 0 0' }, 'Kişi bazlı tanımlanan Merkez Yönetici veya istisna roller, alttaki Özlük bölüm eşleştirmesinin üzerine yazılır (her zaman önceliklidir).')),
        h('div', { class: 'yt-isl' }, h('button', { type: 'button', onclick: () => simulator() }, '🔍 Etkin Yetki Test Et'), h('button', { type: 'button', class: 'ana', onclick: () => modalAc(null) }, '+ Yeni Yetki / İstisna Tanımla'))),
      D.uyari ? h('div', { class: 'yt-bant kotu', role: 'alert' }, h('div', null, '🚨 ' + D.uyari), h('button', { type: 'button', class: 'hv-b', onclick: () => { D.uyari = ''; ciz(); } }, 'Uyarıyı Kapat')) : null,
      h('div', { class: 'yt-fb yt-ara1' }, ara, h('div', { class: 'hv-seg' }, pil('TUMU', 'Tümü (' + D.ist.length + ')'), pil('YONETICI', 'Merkez Yöneticiler'), pil('ISTISNA', 'İstisna / Çoklu Roller'), pil('PASIF', 'Pasifler'))),
      h('div', { class: 'kaydir' }, h('table', { class: 'yt-tablo' }, h('thead', null, h('tr', null, ['Personel & Windows Kimliği', 'Özlük Bölümü', 'Tanımlı Sistem Rolleri & İstisnalar', 'Yetki Gerekçesi / Açıklama', 'Durum & Koruma', 'İşlemler'].map((x, i) => h('th', { style: i === 5 ? 'text-align:right' : '' }, x)))), h('tbody', null, satirlar))));
  }

  // ---- Bölüm 2 ----
  function bolum2() {
    const bekleyen = D.esl.filter((x) => blmRol(x.bolum) === 'BEKLIYOR');
    const l = D.esl.filter((x) => D.f2 === 'TUMU' || blmRol(x.bolum) === D.f2);
    const kisiler = (b) => D.kadro.filter((k) => k.aktif && k.bolum === b);
    const satirlar = l.length ? l.flatMap((x) => {
      const rol = blmRol(x.bolum), bek = rol === 'BEKLIYOR', kis = kisiler(x.bolum), acik = D.acik === x.bolum, taslak = D.hazir.has(x.bolum);
      const sat = h('tr', null,
        h('td', null, h('div', { style: 'font-weight:800' }, x.bolum), bek ? h('div', { class: 'yt-yeni' }, '⚠️ Yeni Bölüm • Eşleştirme Bekliyor') : h('div', { class: 'yt-tamam' }, '✓ Özlük Eşleştirmesi Tanımlı')),
        h('td', null, h('button', { type: 'button', class: 'yt-kisi', onclick: () => { D.acik = acik ? null : x.bolum; ciz(); } }, '👥 ' + x.kisi + ' Personel ' + (acik ? '▴' : '▾'))),
        h('td', null, h('div', { class: 'yt-seg', role: 'group', 'aria-label': x.bolum + ' rol seçimi' }, [['SORUMLU', '📋 Proje Sorumlusu', 'sor'], ['SAHA', '👷 Saha Personeli', 'sah'], ['DISI', '🚫 Kapsam Dışı (Erişimsiz)', 'dis']].map(([k, a, c]) =>
          h('button', { type: 'button', class: rol === k ? 'sec ' + c : '', onclick: () => { if (kayitliRol(x.bolum) === k) D.hazir.delete(x.bolum); else D.hazir.set(x.bolum, k); ciz(); } }, a)))),
        h('td', { style: 'max-width:330px;font-size:12px;color:var(--soluk)' }, YT_OZET[rol]),
        h('td', { style: 'white-space:nowrap' }, taslak ? h('div', { class: 'yt-win', style: 'color:var(--uyari)' }, 'Kaydedilmedi') : [h('div', { class: 'yt-win' }, x.sonKullanici || '—'), h('div', { class: 'yt-alt' }, x.sonZaman ? tarih(x.sonZaman) : (bek ? 'Özlükten yeni okundu' : '—'))]));
      if (!acik) return [sat];
      const ac = h('tr', { class: 'yt-acik' }, h('td', { colspan: '5' }, h('div', { class: 'satir', style: 'justify-content:space-between;align-items:center' }, h('b', null, '👥 ' + x.bolum + ' — Aktif Özlük Personel Listesi (' + kis.length + ' Kişi)'), h('button', { type: 'button', class: 'hv-b', onclick: () => { D.acik = null; ciz(); } }, 'Listeyi Daralt ▴')),
        h('div', { class: 'yt-mini' }, kis.slice(0, 80).map((k) => { const i = istDe(k); return h('div', { class: 'yt-mk' }, h('div', { class: 'satir', style: 'justify-content:space-between' }, h('b', null, k.adiSoyadi), h('span', { class: 'yt-alt' }, 'Sicil: ' + k.sicilNo)), h('div', { class: 'yt-win' }, k.kullaniciAdi || '—'),
          i ? h('span', { class: 'yt-rb coklu', style: 'font-size:11px' }, '⚡ Bölüm 1 İstisnası Aktif (' + istRoller(i).map((r) => YT_ROL_AD[r]).join(' + ') + ')') : h('span', { class: 'yt-alt' }, 'Bölüm varsayılan rolünü kullanır')); }),
          kis.length > 80 ? h('div', { class: 'yt-alt' }, '… ve ' + (kis.length - 80) + ' kişi daha (aramak için Kadro listesini kullanın)') : null)));
      return [sat, ac];
    }) : [h('tr', null, h('td', { colspan: '5', style: 'text-align:center;padding:26px;color:var(--soluk)' }, 'Seçili filtreye uygun Özlük bölümü bulunamadı.'))];
    const pil = (k, a) => h('button', { type: 'button', class: D.f2 === k ? 'on' : '', onclick: () => { D.f2 = k; ciz(); } }, a);
    const say = D.hazir.size;
    return h('section', { class: 'yt-bol' },
      h('div', { class: 'yt-bb' }, h('div', { style: 'min-width:0' }, h('div', { class: 'yt-adim' }, 'Bölüm 2 • Kurumsal Özlük Bölüm Varsayılanları'), h('h2', { class: 'yt-bt' }, '2. Özlük Bölüm Adı ve Sistem Rolü Eşleştirme Alanı'),
        h('p', { class: 'alt', style: 'margin:2px 0 0' }, 'Özlük kadrosundan okunan ', h('b', null, 'Bölüm Adı'), ' kayıtlarının varsayılan sistem rolü eşleştirmesi. Merkez Yönetici bölümden değil, yalnızca Bölüm 1\'den atanır.')),
        h('div', { class: 'yt-isl' }, h('button', { type: 'button', onclick: ozluktenGuncelle }, '🔄 Özlükten Güncelle'), h('button', { type: 'button', class: 'yt-kaydet', disabled: !say, onclick: kaydet2 }, '💾 Eşleştirmeleri Kaydet' + (say ? ' (' + say + ' Değişiklik)' : '')))),
      bekleyen.length ? h('div', { class: 'yt-bant uyari', role: 'status' }, h('div', null, '⚠️ ', h('b', null, 'Eşleşme bekleyen Özlük bölümü: '), bekleyen.map((b) => b.bolum + ' (' + b.kisi + ' personel)').join(', '), ' — bu bölümlerdeki kişiler (istisnası yoksa) hiçbir şey göremez. Lütfen rol ataması yapın.'),
        h('button', { type: 'button', class: 'hv-b', onclick: () => { D.f2 = 'BEKLIYOR'; ciz(); } }, 'Bekleyen Bölümü Göster')) : null,
      h('div', { class: 'yt-fb' }, h('div', { class: 'hv-seg' }, pil('TUMU', 'Tümü (' + D.esl.length + ')'), pil('BEKLIYOR', 'Eşleşme Bekleyenler (' + bekleyen.length + ')'), pil('SORUMLU', 'Proje Sorumlusu'), pil('SAHA', 'Saha Personeli'), pil('DISI', 'Kapsam Dışı')),
        h('span', { class: 'alt', style: 'font-size:12px;font-weight:600' }, '💡 Bölüm personelini görmek için "👥 Personel ▾" düğmesine basın.')),
      h('div', { class: 'kaydir' }, h('table', { class: 'yt-tablo' }, h('thead', null, h('tr', null, ['Özlük Bölüm Adı', 'Bölüm Personelleri', 'Varsayılan Sistem Rolü', 'Açılış Ekranı & Yetki Özeti', 'Son Güncelleme'].map((x) => h('th', null, x)))), h('tbody', null, satirlar))));
  }
  async function kaydet2() {
    const liste = [...D.hazir];
    try { for (const [b, r] of liste) await Kopru.cagir('eslestirmeKaydet', { bolum: b, rol: r }); D.hazir = new Map(); toast(liste.length + ' bölüm rol değişikliği kaydedildi ve işlem günlüğüne işlendi.', 'iyi'); await yukle(); }
    catch (e) { hata(e); await yukle(); }
  }
  async function ozluktenGuncelle() {
    if (!confirm("Kadro Özlük'ten eşitlensin mi? (Özlük'te tüm kurum kapsamı olan bir yönetici gerekir; hiçbir kayıt silinmez, ayrılanlar pasife alınır.)")) return;
    try { const r = await Kopru.cagir('kadroEsitle'); toast("Özlük'ten güncellendi: " + r.eklenen + ' eklenen, ' + r.guncellenen + ' güncellenen, ' + r.pasifeAlinan + ' pasife alınan.', 'iyi'); await yukle(); } catch (e) { hata(e); }
  }

  // ---- Yeni / düzenle penceresi ----
  function modalAc(i) {
    const duz = !!i, f = { yon: !!(i && i.yonetici), sor: i ? !!i.sorumlu : true, saha: !!(i && i.saha), sahaListe: i ? i.sahaListede !== false : true, akt: i ? !!i.aktif : true };
    const dl = h('datalist', { id: 'ytKadro' }, D.kadro.filter((k) => k.aktif).slice(0, 3000).map((k) => h('option', { value: k.adiSoyadi + ' (Sicil: ' + k.sicilNo + ')' })));
    const kisi = h('input', { class: 'metin', list: 'ytKadro', autocomplete: 'off', placeholder: 'Ad Soyad yazarak arayın…', style: 'width:100%', disabled: duz, 'aria-label': 'Özlük personeli' });
    const hesap = h('input', { class: 'metin', style: 'width:100%', placeholder: 'ALAN\\kullanici', 'aria-label': 'Windows hesabı' });
    const ack = h('textarea', { class: 'metin', rows: '2', style: 'width:100%', placeholder: 'Örn: Saha test koordinasyonu ve proje talep girişi için çoklu yetki tanımlandı.', 'aria-label': 'Gerekçe' });
    const bilgi = h('div', { class: 'yt-bilgi' }), uyar = h('div'), roller = h('div', { style: 'display:flex;flex-direction:column;gap:8px' });
    let sec = i ? kisiDe(i) : null; let sicil = i ? i.sicilNo : '';
    ack.value = i ? (i.aciklama || '') : ''; hesap.value = i ? i.hesap : ''; if (i) kisi.value = (i.adiSoyadi || '') + ' (Sicil: ' + (i.sicilNo || '-') + ')';
    function bilgiCiz() {
      const b = sec ? sec.bolum : null, r = b ? kayitliRol(b) : null;
      bilgi.replaceChildren(h('div', { class: 'satir', style: 'justify-content:space-between' }, h('span', null, h('b', null, 'Özlük Bölümü (Salt Okunur): '), b || '—'), h('span', null, h('b', null, 'Bölüm Varsayılan Rolü: '), r ? YT_ROL_AD[r] : 'Tanımsız')),
        h('div', { class: 'yt-alt' }, 'Sicil No: ' + (sicil || '—')));
    }
    function rolCiz() {
      const kart = (a, anahtar, ad, acik, renk) => h('div', { class: 'yt-rk' + (f[anahtar] ? ' on' : ''), onclick: () => { f[anahtar] = !f[anahtar]; rolCiz(); } }, h('input', { type: 'checkbox', checked: f[anahtar], style: 'pointer-events:none;margin-top:3px' }), h('div', null, h('div', { style: 'font-weight:800;color:' + renk }, ad), h('div', { class: 'yt-alt' }, acik)));
      roller.replaceChildren(kart(0, 'yon', '🛡️ Merkez Yönetici', 'Tüm projelere, haftalık özete, izin onaylarına ve yetki ekranlarına tam erişim sağlar.', '#7c3aed'),
        kart(0, 'sor', '📋 Proje Sorumlusu (İstisna)', 'Kişinin bölümü saha/kapsam dışı olsa dahi görev talebi açabilmesini sağlar.', 'var(--vurgu)'),
        kart(0, 'saha', '👷 Saha Personeli (İstisna)', 'Görevlendirme havuzuna dahil olur; saha görevlerini ve kişisel izin/rapor ekranını kullanır.', 'var(--iyi)'));
      if (f.saha) {
        const cb = h('input', { type: 'checkbox', checked: f.sahaListe, onchange: () => { f.sahaListe = cb.checked; rolCiz(); } });
        roller.append(h('label', { class: 'onay', style: 'margin:-2px 0 0 28px;display:flex;gap:8px;align-items:flex-start' }, cb, h('span', null, h('b', null, 'Saha personeli listesine ekle'),
          h('span', { class: 'yt-alt', style: 'display:block' }, f.sahaListe ? 'Kişi saha personeli olarak listelenir; haftalık özette görünür ve göreve atanabilir.' : 'İşaret kaldırıldı: kişi saha ekranlarını kullanır ama saha personeli listelerinde görünmez ve göreve atanamaz.'))));
      }
      const n = [f.yon, f.sor, f.saha].filter(Boolean).length;
      uyar.replaceChildren(...(n > 1 ? [h('div', { class: 'yt-bant uyari' }, '⇄ Çoklu Rol Tespit Edildi: Bu personel girişte üst menüde ', h('b', null, 'Görünüm Geçiş Anahtarı'), ' görecek.')] : []));
    }
    kisi.addEventListener('input', () => { const m = /\(Sicil:\s*([^)]+)\)\s*$/.exec(kisi.value); const k = m ? D.kadro.find((x) => String(x.sicilNo) === m[1].trim()) : null; if (k) { sec = k; sicil = k.sicilNo; if (!hesap.value || !duz) hesap.value = k.kullaniciAdi || hesap.value; const var_ = D.ist.find((x) => String(x.sicilNo) === String(k.sicilNo)); if (var_ && !duz) toast('Bu kişinin kaydı var; kaydetmek mevcut kaydı günceller.', 'uyari'); bilgiCiz(); } });
    let kapat = () => {};
    const kaydet = async () => {
      if (!sicil && !hesap.value.trim()) { toast('Lütfen Özlük listesinden bir personel seçin.', 'uyari'); return; }
      if (!hesap.value.trim()) { toast('Bu kişinin Windows hesabı kadroda yok; hesabı yazın.', 'uyari'); return; }
      if (!f.yon && !f.sor && !f.saha) { toast('Lütfen en az bir sistem rolü seçin.', 'uyari'); return; }
      if (!ack.value.trim()) { toast('Yetki gerekçesi zorunludur.', 'uyari'); return; }
      kapat();
      await istCagir('istisnaKaydet', { hesap: hesap.value.trim(), sicilNo: sicil, yonetici: f.yon, sorumlu: f.sor, saha: f.saha, sahaListede: f.saha ? f.sahaListe : true, aktif: f.akt, aciklama: ack.value.trim() }, 'Yetki tanımı kaydedildi.', !!(i && i.aktif && i.yonetici && !f.yon));
    };
    const akt = h('input', { type: 'checkbox', checked: f.akt, onchange: () => { f.akt = akt.checked; } });
    kapat = pencereAc(duz ? '✎ Yönetici / Kişi Bazlı İstisna Rolünü Düzenle' : '+ Yeni Yetki / İstisna Tanımla', h('div', { style: 'display:flex;flex-direction:column;gap:10px' }, dl,
      h('div', null, h('label', { class: 'yt-et' }, 'Özlük Personel Seçimi:'), kisi), bilgi, h('div', null, h('label', { class: 'yt-et' }, 'Windows Hesabı:'), hesap),
      h('div', null, h('label', { class: 'yt-et' }, 'Atanacak Sistem Rolleri & İstisnalar (birden fazla seçilebilir):'), roller), uyar,
      h('div', null, h('label', { class: 'yt-et' }, 'Yetki Gerekçesi / Açıklama (Zorunlu):'), ack), h('label', { class: 'onay' }, akt, ' Aktif'),
      h('div', { class: 'satir', style: 'justify-content:flex-end' }, h('button', { type: 'button', onclick: () => kapat() }, 'Vazgeç'), h('button', { type: 'button', class: 'ana', onclick: kaydet }, '✓ Yetki Tanımını Kaydet'))));
    bilgiCiz(); rolCiz();
  }

  // ---- Etkin yetki ön izleme ----
  function simulator() {
    const dl = h('datalist', { id: 'ytKadro2' }, D.kadro.filter((k) => k.aktif).slice(0, 3000).map((k) => h('option', { value: k.adiSoyadi + ' (Sicil: ' + k.sicilNo + ')' })));
    const kisi = h('input', { class: 'metin', list: 'ytKadro2', autocomplete: 'off', placeholder: 'Test edilecek personeli yazın…', style: 'width:100%', 'aria-label': 'Test edilecek personel' }), sonuc = h('div');
    const g = (b, ic) => h('div', null, h('div', { class: 'yt-alt', style: 'font-weight:700' }, b), ic);
    function goster(k) {
      const e = etkin(k), coklu = e.roller.length > 1;
      const gorunumler = e.roller.map((r) => ({ YONETICI: 'YONETICI', SORUMLU: 'SORUMLU', SAHA: 'SAHA' }[r]));
      const sekmeler = [...new Set(gorunumler.flatMap((v) => (SAYFALAR[v] || []).map((x) => x[1])))];
      const acilis = gorunumler.length ? (SAYFALAR[gorunumler[0]][0][1] + ' (' + ROL_DUGME[gorunumler[0]] + ')') : 'Erişim Engellendi (Kapsam Dışı / Tanımsız Bölüm / Kayıt Yok)';
      sonuc.replaceChildren(h('div', { class: 'yt-sim' },
        h('div', { class: 'satir', style: 'justify-content:space-between;align-items:center;border-bottom:1px solid var(--cizgi);padding-bottom:8px' }, h('div', null, h('b', null, k.adiSoyadi + ' (Sicil: ' + k.sicilNo + ')'), h('div', { class: 'yt-win' }, k.kullaniciAdi || '—')), h('span', { class: 'yt-pill' }, '🏢 ' + (k.bolum || '-'))),
        g('Yetki Kaynağı Önceliği:', h('div', { style: 'font-weight:800;color:var(--vurgu);margin-top:2px' }, e.kaynak)),
        g('Aktif Sistem Rolleri:', h('div', { class: 'yt-rozetler', style: 'margin-top:4px' }, e.roller.length ? e.roller.map(rolRozet) : h('span', { class: 'yt-rb', style: 'color:var(--kotu);background:var(--kotu-bg)' }, '🚫 Erişim Yetkisi Yok'))),
        g('Üst Menü Görünüm Geçişi:', h('div', { style: 'font-weight:800;margin-top:2px;color:' + (coklu ? 'var(--uyari)' : 'var(--soluk)') }, coklu ? '⇄ AKTİF — personel üst menüden rolleri arasında tek tıkla geçiş yapabilir.' : 'Tek Rol Görünümü — standart tekil çalışma ekranı açılır.')),
        g('Oturum Açılış Ekranı:', h('div', { style: 'font-weight:800;color:var(--iyi);margin-top:2px' }, '🖥️ ' + acilis)),
        sekmeler.length ? g('Erişebildiği Sekmeler:', h('div', { class: 'yt-rozetler', style: 'margin-top:4px' }, sekmeler.map((t) => h('span', { class: 'yt-pill' }, '✓ ' + t)))) : null,
        h('div', { class: 'yt-alt' }, 'Not: Bu ekran kaydedilmiş kurallardan hesaplanan bir ön izlemedir; asıl yetkiyi giriş anında sunucu verir.')));
    }
    kisi.addEventListener('input', () => { const m = /\(Sicil:\s*([^)]+)\)\s*$/.exec(kisi.value); const k = m ? D.kadro.find((x) => String(x.sicilNo) === m[1].trim()) : null; if (k) goster(k); });
    const kapat = pencereAc('🔍 Etkin Yetki Ön İzleme (Windows Giriş Simülatörü)', h('div', { style: 'display:flex;flex-direction:column;gap:10px' }, dl,
      h('p', { class: 'alt', style: 'margin:0' }, 'Bölüm 1 (kişi bazlı istisna) + Bölüm 2 (bölüm eşleştirmesi) birleşik sonucunu test edin.'), h('label', { class: 'yt-et' }, 'Test Edilecek Personeli Seçin:'), kisi, sonuc,
      h('div', { class: 'satir', style: 'justify-content:flex-end' }, h('button', { type: 'button', class: 'ana', onclick: () => kapat() }, 'Kapat'))));
    kisi.focus();
  }

  function ciz() {
    const y = window.scrollY;
    kap.replaceChildren(
      h('section', { class: 'hz-bas-kart' }, h('span', { class: 'hz-ikon', 'aria-hidden': 'true' }, '🛡️'), h('div', { style: 'min-width:0' }, h('h1', { style: 'margin:0;font-size:20px' }, 'Kullanıcı Yetki Yönetimi'),
        h('div', { class: 'alt', style: 'font-size:12px' }, 'Yetkilendirme & Özlük Rol Eşleştirme Merkezi • Kişi bazlı istisna her zaman bölüm kuralının önündedir')), h('span', { style: 'flex:1' }), h('button', { type: 'button', onclick: () => simulator() }, '🔍 Etkin Yetki Test Et')),
      kpi(), bolum1(), bolum2());
    window.scrollTo(0, y);
  }
  await yukle();
  return kap;
}
