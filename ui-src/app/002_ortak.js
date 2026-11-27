// Ortak yardımcılar: güvenli DOM kurucu (textContent; HTML enjekte edilmez), toast, durum.
function h(tag, a, ...ch) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(a || {})) {
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v === true) e.setAttribute(k, '');
    else if (v !== false && v != null) e.setAttribute(k, v);
  }
  for (const c of ch.flat()) { if (c == null || c === false) continue; e.append(c.nodeType ? c : document.createTextNode(String(c))); }
  return e;
}
const S = { surum: null, kimlik: null, gorunum: null, sayfa: null, baglanti: null };
const kok = () => document.getElementById('uygulama');
function goster(el) { kok().replaceChildren(el); }
function rozet(t, tur) { return h('span', { class: 'rozet ' + tur }, t); }
function mesajKutu(tur, t) { return h('div', { class: 'mesaj ' + tur }, t); }
let toastZaman = 0;
function toast(t, tur) {
  document.querySelectorAll('.toast').forEach((x) => x.remove());
  const e = h('div', { class: 'toast mesaj ' + (tur || 'iyi'), role: 'status' }, t);
  document.body.append(e);
  clearTimeout(toastZaman); toastZaman = setTimeout(() => e.remove(), 5000);
}
const hata = (e) => toast(e && e.message ? e.message : String(e), 'kotu');
const tarih = (s) => { if (!s) return '-'; const d = new Date(s); return isNaN(d) ? String(s) : d.toLocaleString('tr-TR'); };
const ROLAD = { YONETICI: 'Merkez Yönetici', SORUMLU: 'Proje Sorumlusu', SAHA: 'Saha Personeli', ISTISNA: 'İstisna' };
function tercihOku() { try { return localStorage.getItem('gorunum') || ''; } catch (e) { return ''; } }
function tercihYaz(v) { try { localStorage.setItem('gorunum', v); } catch (e) { /* depolama yoksa sorun değil */ } }

// Metin dosyası kaydı (CSV/TXT): WebView2'de <a download> çalışmadığından C# kayıt penceresi (dosyaKaydet) kullanılır. Tarayıcıda (önizleme) bağlantıya düşer.
async function dosyaKaydet(ad, metin) {
  try {
    const r = await Kopru.cagir('dosyaKaydet', { ad, metin });
    if (r && r.iptal) return false;
    toast('Dosya kaydedildi.', 'iyi'); return true;
  } catch (e) {
    if (window.chrome && window.chrome.webview) { hata(e); return false; }
    const a = h('a', { href: URL.createObjectURL(new Blob(['\ufeff' + metin], { type: 'text/plain;charset=utf-8' })), download: ad });
    document.body.append(a); a.click(); a.remove(); return true;
  }
}
