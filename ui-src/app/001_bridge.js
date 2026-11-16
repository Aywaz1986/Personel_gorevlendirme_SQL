// Köprü: C# tarafındaki adlandırılmış komutları çağırır. Ham SQL gönderilmez.
const Kopru = (() => {
  let sayac = 0;
  const bekleyen = new Map();
  const wv = window.chrome && window.chrome.webview;
  if (wv) {
    wv.addEventListener('message', (e) => {
      const r = e.data;
      const b = bekleyen.get(r.id);
      if (!b) return;
      bekleyen.delete(r.id);
      if (r.ok) b.cozum(r.data);
      else { const h = new Error(r.error || 'Hata'); h.kod = r.code; b.red(h); }
    });
  }
  function cagir(cmd, args) {
    return new Promise((cozum, red) => {
      if (!wv) { red(new Error('Bu sayfa yalnızca uygulama içinde çalışır.')); return; }
      const id = ++sayac;
      bekleyen.set(id, { cozum, red });
      wv.postMessage({ id, cmd, args: args || {} });
    });
  }
  return { cagir };
})();
