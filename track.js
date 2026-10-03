// Estadísticas propias (sin cookies ni datos personales). Envía: visitas, búsquedas, elecciones y clics de WhatsApp.
(() => {
  const ENDPOINT = "https://estudiar-turquia-stats.egmusicapp.workers.dev/e";
  let off = false;
  try { off = localStorage.getItem("no-track") === "1"; } catch {}           // el administrador no se cuenta a sí mismo
  const on = !off && (location.hostname === "turquia.mercadosemu.com" || /[?&]track=1/.test(location.search));
  const page = location.pathname.replace(/\/index\.html$/, "/") || "/";
  const send = (t, d = {}) => {
    if (!on) return;
    const body = JSON.stringify({ t, p: page, ...d });
    try {
      if (navigator.sendBeacon && navigator.sendBeacon(ENDPOINT, body)) return;
      fetch(ENDPOINT, { method: "POST", body, keepalive: true, mode: "no-cors" });
    } catch {}
  };
  window.track = send;
  send("view", { r: document.referrer || "", u: new URLSearchParams(location.search).get("utm_source") || undefined });
  // cualquier clic a WhatsApp (data-track dice desde dónde)
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href*="wa.me"]');
    if (a) send("whatsapp", { q: a.dataset.track || "Enlace de WhatsApp" });
  }, true);
})();
