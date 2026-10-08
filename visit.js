// Recuerda (solo en este navegador, 30 días) lo que el visitante ha mirado en la web,
// para que sus mensajes de WhatsApp lleguen con contexto y no haya que explicar todo desde cero.
(() => {
  const KEY = "et-visit", DAYS = 30;
  const SITE = "turquia.mercadosemu.com";
  const load = () => {
    try {
      const v = JSON.parse(localStorage.getItem(KEY)) || {};
      return v.ts && Date.now() - v.ts < DAYS * 864e5 ? v : {};
    } catch { return {}; }
  };
  const save = (v) => { try { v.ts = Date.now(); localStorage.setItem(KEY, JSON.stringify(v)); } catch {} };
  const push = (list, item, max) => [item, ...(list || []).filter((x) => x !== item)].slice(0, max);
  const add = (field, item, max) => { const v = load(); v[field] = push(v[field], item, max); save(v); };

  const PAGES = { "requisitos.html": "Requisitos y costes del visado", "programas.html": "Buscador de carreras" };
  const page = location.pathname.split("/").pop();
  if (PAGES[page]) add("seen", PAGES[page], 6);

  window.visit = {
    FROM_WEB: `Hola, vengo de la página web (${SITE}).`,
    seen: (label) => add("seen", label, 6),
    search: (q) => { q = String(q || "").trim(); if (q.length >= 3) add("q", q, 3); },
    choose: (text) => add("chosen", text, 2),
    calc: (text) => { const v = load(); v.calc = text; save(v); },
    // Líneas para el mensaje de WhatsApp (vacío si no ha mirado nada)
    lines() {
      const v = load(), out = [];
      if (v.chosen?.length) out.push(`• Carreras que he mirado: ${v.chosen.join(" | ")}`);
      if (v.q?.length) out.push(`• He buscado: ${v.q.join(", ")}`);
      if (v.calc) out.push(`• Calculadora de requisitos: ${v.calc}`);
      if (v.seen?.length) out.push(`• He leído: ${v.seen.join(", ")}`);
      return out;
    },
  };

  // Cualquier enlace a WhatsApp sin mensaje sale al menos diciendo que viene de la web
  document.addEventListener("click", (e) => {
    const a = e.target.closest?.('a[href*="wa.me/"]');
    if (a?.dataset.ch) window.visit.choose(a.dataset.ch);
    if (a && !/[?&]text=/.test(a.href)) a.href = `${a.href.split("?")[0]}?text=${encodeURIComponent(`${window.visit.FROM_WEB} Quiero información para estudiar en Turquía.`)}`;
  }, true);
})();
