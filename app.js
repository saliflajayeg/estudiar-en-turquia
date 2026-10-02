// ===== Configuración =====
const WHATSAPP = "905466175501";
const D = window.PROGRAMAS;
const RATE = D.rate; // 1 USD ≈ 650 FCFA (se cambia en _raw/clean.py)
const PAGE = 10;

const DEG = { B: "Licenciatura", M: "Máster", D: "Doctorado", A: "Formación Profesional (FP)", O: "Otros" };
const POPULAR = ["Medicina", "Ingeniería informática", "Derecho", "Enfermería", "Administración de empresas", "Arquitectura", "Farmacia", "Psicología", "Relaciones internacionales", "Odontología", "Ingeniería civil", "Fisioterapia y rehabilitación"];

// ===== Utilidades =====
const $ = (id) => document.getElementById(id);
const norm = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/ı/g, "i");
const group = (n) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
let currency = "xaf";

const ROWS = D.R.map(([es, en, ui, deg, lang, price, orig, cur, note, campus, per], i) => {
  const [uni, city] = D.U[ui];
  const rate = cur === "EUR" ? D.eur : D.rate;
  return { i, es, en, uni, city, deg, lang, price, orig, cur, note, campus, per, xaf: price != null ? price * rate : null, origXaf: orig != null ? orig * rate : null, kEs: norm(es), kEn: norm(en), kUni: norm(uni) };
}).filter((r) => r.xaf != null);

const fmt = (r, which = "xaf") => {
  const x = which === "orig" ? r.origXaf : r.xaf;
  const n = which === "orig" ? r.orig : r.price;
  if (currency === "usd") return r.cur === "EUR" ? `${group(n)} €` : `${group(n)} USD`;
  return `${group(Math.round(x / 5000) * 5000)} FCFA`;
};
const fmtXaf = (xaf) => (currency === "usd" ? `≈ ${group(Math.round(xaf / RATE / 10) * 10)} USD` : `${group(Math.round(xaf / 5000) * 5000)} FCFA`);
const short = (xaf) => (currency === "usd" ? `${group(Math.round(xaf / RATE / 10) * 10)} USD` : xaf >= 1e6 ? `${(xaf / 1e6).toFixed(xaf >= 1e7 ? 0 : 1).replace(".", ",")} M FCFA` : `${group(xaf)} FCFA`);
const perLabel = (r) => (r.per === "P" ? "programa completo" : r.per === "S" ? "por semestre" : "por año");
const mono = (u) => u.replace(/University|Universitesi|of|the|Istanbul|İstanbul|Cyprus/gi, "").trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 3).toUpperCase();
const hue = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
const yearly = (rows) => rows.filter((r) => r.per === "Y");
const minXaf = (rows) => { const y = yearly(rows); const src = y.length ? y : rows; return src.length ? Math.min(...src.map((r) => r.xaf)) : null; };
const LORD = { "Inglés": 0, "Turco": 1 };
const langsOf = (rows) => [...new Set(rows.map((r) => r.lang))].sort((a, b) => (LORD[a] ?? 9) - (LORD[b] ?? 9));

// ===== Índice de carreras (para sugerencias) =====
const PROGS = (() => {
  const m = new Map();
  ROWS.forEach((r) => {
    if (!m.has(r.es)) m.set(r.es, { name: r.es, en: r.en, k: r.kEs, kEn: r.kEn, rows: [] });
    m.get(r.es).rows.push(r);
  });
  return [...m.values()].map((p) => ({ ...p, unis: new Set(p.rows.map((r) => r.uni)).size }));
})();
const UNIS = [...new Set(ROWS.map((r) => r.uni))].map((u) => ({ name: u, k: norm(u), rows: ROWS.filter((r) => r.uni === u) }));

// ===== Estado =====
const state = { q: "", exact: null, uni: null, deg: "B", lang: "", sort: "asc", shown: PAGE };
const hq = $("hq"), hdeg = $("hdeg"), hlang = $("hlang"), sugg = $("sugg");

// ===== Sugerencias =====
let sIdx = -1, sItems = [];
function suggestions(q) {
  const nq = norm(q).trim();
  if (nq.length < 2) return [];
  const toks = nq.split(/\s+/);
  const progs = PROGS.filter((p) => toks.every((t) => p.k.includes(t) || p.kEn.includes(t)))
    .map((p) => ({ type: "p", p, score: (p.k.startsWith(nq) ? 0 : p.k.includes(nq) ? 1 : 2) * 1000 - p.unis }))
    .sort((a, b) => a.score - b.score).slice(0, 7);
  const unis = UNIS.filter((u) => toks.every((t) => u.k.includes(t))).slice(0, 2).map((u) => ({ type: "u", u }));
  return [...progs, ...unis];
}
function renderSugg() {
  sItems = suggestions(hq.value);
  sIdx = -1;
  if (!sItems.length) { sugg.hidden = true; hq.setAttribute("aria-expanded", "false"); return; }
  sugg.innerHTML = sItems.map((s, i) => s.type === "p"
    ? `<li role="option" id="sg${i}" data-i="${i}"><span class="sugg__ico">◆</span><span class="sugg__t"><strong>${esc(s.p.name)}</strong><small>${s.p.unis} universidad${s.p.unis > 1 ? "es" : ""} · desde ${short(minXaf(s.p.rows))}</small></span></li>`
    : `<li role="option" id="sg${i}" data-i="${i}" class="sugg__uni"><span class="sugg__ico">⌂</span><span class="sugg__t"><strong>${esc(s.u.name)}</strong><small>Universidad · ${s.u.rows.length} programas</small></span></li>`).join("");
  sugg.hidden = false;
  hq.setAttribute("aria-expanded", "true");
}
function pick(i) {
  const s = sItems[i];
  if (!s) return;
  if (s.type === "p") { hq.value = s.p.name; run({ exact: s.p.name }); }
  else { hq.value = s.u.name; run({ uni: s.u.name }); }
}
hq.addEventListener("input", renderSugg);
hq.addEventListener("focus", renderSugg);
hq.addEventListener("keydown", (e) => {
  if (sugg.hidden) return;
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    sIdx = (sIdx + (e.key === "ArrowDown" ? 1 : -1) + sItems.length) % sItems.length;
    sugg.querySelectorAll("li").forEach((li, i) => li.classList.toggle("is-on", i === sIdx));
    hq.setAttribute("aria-activedescendant", "sg" + sIdx);
  } else if (e.key === "Enter" && sIdx >= 0) { e.preventDefault(); pick(sIdx); }
  else if (e.key === "Escape") sugg.hidden = true;
});
sugg.addEventListener("mousedown", (e) => { const li = e.target.closest("li"); if (li) { e.preventDefault(); pick(+li.dataset.i); } });
document.addEventListener("click", (e) => { if (!e.target.closest(".sbar__f--q")) sugg.hidden = true; });
$("sbar").addEventListener("submit", (e) => {
  e.preventDefault();
  const exact = PROGS.find((p) => norm(p.name) === norm(hq.value));
  run(exact ? { exact: exact.name } : { q: hq.value });
});
hdeg.onchange = () => { state.deg = hdeg.value; if (!$("resList").hidden) render(); };
hlang.onchange = () => { state.lang = hlang.value; if (!$("resList").hidden) render(); };

// ===== Búsqueda =====
function matched() {
  if (state.exact) return ROWS.filter((r) => r.es === state.exact);
  if (state.uni) return ROWS.filter((r) => r.uni === state.uni);
  const toks = norm(state.q).split(/\s+/).filter(Boolean);
  return ROWS.filter((r) => toks.every((t) => r.kEs.includes(t) || r.kEn.includes(t) || r.kUni.includes(t)));
}
function run({ q = "", exact = null, uni = null }, scroll = true) {
  Object.assign(state, { q: exact || uni || q, exact, uni, shown: PAGE });
  sugg.hidden = true;
  if (!state.q.trim()) return reset();
  // si el nivel elegido no tiene resultados, saltar al nivel con más
  const all = matched().filter((r) => !state.lang || r.lang.includes(state.lang));
  if (state.deg && all.length && !all.some((r) => r.deg === state.deg)) {
    const c = {}; all.forEach((r) => (c[r.deg] = (c[r.deg] || 0) + 1));
    state.deg = Object.entries(c).sort((a, b) => b[1] - a[1])[0][0];
    hdeg.value = state.deg;
  }
  const u = new URL(location); u.searchParams.set("q", state.q); history.replaceState(null, "", u.pathname + u.search + "#resultados");
  $("resHome").hidden = true; $("resList").hidden = false;
  render();
  if (scroll) $("resultados").scrollIntoView({ behavior: "smooth" });
}
function reset() {
  Object.assign(state, { q: "", exact: null, uni: null });
  hq.value = "";
  history.replaceState(null, "", location.pathname);
  $("resHome").hidden = false; $("resList").hidden = true;
}
$("rClear").onclick = () => { reset(); window.scrollTo({ top: 0, behavior: "smooth" }); setTimeout(() => hq.focus(), 400); };

function render() {
  const base = matched().filter((r) => !state.lang || r.lang.includes(state.lang));
  // pestañas de nivel
  const counts = {}; base.forEach((r) => (counts[r.deg] = (counts[r.deg] || 0) + 1));
  $("rTabs").innerHTML = [["", "Todos", base.length], ...["B", "M", "D", "A", "O"].filter((d) => counts[d]).map((d) => [d, DEG[d], counts[d]])]
    .map(([d, l, n]) => `<button type="button" role="tab" aria-selected="${state.deg === d}" class="rtab${state.deg === d ? " is-on" : ""}" data-d="${d}">${l} <span>${n}</span></button>`).join("");

  let rows = base.filter((r) => !state.deg || r.deg === state.deg);
  if (state.sort === "asc") rows.sort((a, b) => a.xaf - b.xaf);
  else if (state.sort === "desc") rows.sort((a, b) => b.xaf - a.xaf);
  else rows.sort((a, b) => a.uni.localeCompare(b.uni) || a.xaf - b.xaf);

  const title = state.uni ? state.uni : state.exact ? state.exact : `“${state.q}”`;
  $("rKicker").textContent = state.uni ? "Universidad" : state.exact ? "Carrera" : "Resultados para";
  $("rTitle").textContent = title;
  const nUni = new Set(rows.map((r) => r.uni)).size;
  $("kUnis").textContent = state.uni ? `${rows.length} programas` : nUni;
  const m = minXaf(rows);
  $("kFrom").innerHTML = m ? `${fmtXaf(m)}<small>${yearly(rows).length ? "/ año" : ""}</small>` : "—";
  $("kLangs").textContent = langsOf(rows).map((l) => l.replace(" (inglés y turco)", "")).join(" · ") || "—";

  $("rRows").innerHTML = rows.length
    ? rows.slice(0, state.shown).map(row).join("")
    : `<div class="empty"><h3>No encontramos esa carrera</h3><p>Prueba con otra palabra (por ejemplo “ingeniería” o “salud”) o cambia el nivel. También puedes <a href="https://wa.me/${WHATSAPP}" target="_blank" rel="noopener">preguntarnos por WhatsApp</a>: trabajamos con más universidades.</p></div>`;
  const more = $("rMore");
  more.hidden = rows.length <= state.shown;
  more.textContent = `Mostrar más (${rows.length - state.shown})`;
  $("rAll").href = `programas.html?q=${encodeURIComponent(state.q)}`;
  window.__rows = rows;
}
function row(r, i) {
  const o = r.orig && r.orig > r.price ? `<s>${fmt(r, "orig")}</s>` : "";
  return `<article class="rrow" style="animation-delay:${Math.min(i, 6) * 18}ms">
    <div class="rrow__uni">
      <span class="rrow__mono" style="--h:${hue(r.uni)}">${esc(mono(r.uni) || "U")}</span>
      <div><h3>${esc(state.exact ? r.uni : r.es)}</h3><p>${esc(state.exact ? r.city : `${r.uni} · ${r.city}`)}${r.campus ? ` · ${esc(r.campus)}` : ""}</p></div>
    </div>
    <div class="rrow__tags"><span class="t t--lang">${esc(r.lang)}</span>${state.deg ? "" : `<span class="t">${DEG[r.deg]}</span>`}${r.note ? `<span class="t t--note">${esc(r.note)}</span>` : ""}</div>
    <div class="rrow__price">${o}<strong>${fmt(r)}</strong><small>${perLabel(r)}</small></div>
    <button class="btn btn--navy btn--sm rrow__go" type="button" data-i="${r.i}">Elegir <span aria-hidden="true">→</span></button>
  </article>`;
}
$("rTabs").addEventListener("click", (e) => { const b = e.target.closest(".rtab"); if (!b) return; state.deg = b.dataset.d; hdeg.value = state.deg; state.shown = PAGE; render(); });
$("rSort").onchange = (e) => { state.sort = e.target.value; render(); };
$("rMore").onclick = () => { state.shown += PAGE; render(); };
$("rRows").addEventListener("click", (e) => { const b = e.target.closest(".rrow__go"); if (b) openDrawer(ROWS.find((r) => r.i === +b.dataset.i)); });

// ===== Carreras populares =====
function renderPopular() {
  const cards = POPULAR.map((name) => PROGS.find((p) => p.name === name)).filter(Boolean).map((p) => {
    const g = p.rows.filter((r) => r.deg === "B");
    const rows = g.length ? g : p.rows;
    return { p, unis: new Set(rows.map((r) => r.uni)).size, from: minXaf(rows), langs: langsOf(rows) };
  });
  $("popGrid").innerHTML = cards.map((c, i) => `<button type="button" class="pcard" data-n="${esc(c.p.name)}" style="animation-delay:${i * 40}ms">
      <span class="pcard__n">${String(i + 1).padStart(2, "0")}</span>
      <strong>${esc(c.p.name)}</strong>
      <span class="pcard__m">${c.unis} universidad${c.unis > 1 ? "es" : ""}</span>
      <span class="pcard__p"><small>Desde</small><b>${fmtXaf(c.from)}</b><small>/ año</small></span>
      <span class="pcard__l">${c.langs.slice(0, 2).map((l) => `<em>${esc(l)}</em>`).join("")}</span>
      <span class="pcard__go" aria-hidden="true">→</span>
    </button>`).join("");
  $("pop").insertAdjacentHTML("beforeend", POPULAR.slice(0, 6).map((n) => `<button type="button" data-n="${esc(n)}">${esc(n)}</button>`).join(""));
}
const goProg = (n) => { hq.value = n; hdeg.value = state.deg = "B"; run({ exact: n }); };
$("popGrid").addEventListener("click", (e) => { const b = e.target.closest(".pcard"); if (b) goProg(b.dataset.n); });
$("pop").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) goProg(b.dataset.n); });

// ===== Panel “Tu elección” =====
const drawer = $("drawer");
let lastFocus = null, chosen = null;
function openDrawer(r) {
  chosen = r;
  lastFocus = document.activeElement;
  $("dProg").textContent = r.es;
  $("dUni").textContent = `${r.uni} · ${r.city}${r.campus ? " · campus " + r.campus : ""}`;
  $("dTags").innerHTML = `<span class="t t--lang">${esc(r.lang)}</span><span class="t">${DEG[r.deg]}</span>${r.note ? `<span class="t t--note">${esc(r.note)}</span>` : ""}`;
  $("dPer").textContent = r.per === "P" ? "Precio del programa completo" : r.per === "S" ? "Matrícula por semestre" : "Matrícula por año";
  $("dXaf").textContent = `${group(Math.round(r.xaf / 5000) * 5000)} FCFA`;
  $("dUsd").textContent = r.cur === "EUR" ? `${group(r.price)} €` : `${group(r.price)} USD`;
  $("dOrig").textContent = r.orig && r.orig > r.price ? `Precio sin descuento: ${r.cur === "EUR" ? group(r.orig) + " €" : group(r.orig) + " USD"}. El descuento se aplica al inscribirte a través de una agencia.` : "";
  const msg = `Hola, quiero empezar la inscripción gratuita para:\n• Carrera: ${r.es} (${DEG[r.deg]}, en ${r.lang.toLowerCase()})\n• Universidad: ${r.uni}, ${r.city}\n• Precio visto en la web: ${r.cur === "EUR" ? group(r.price) + " €" : group(r.price) + " USD"} ${perLabel(r)}\n¿Qué documentos os envío?`;
  $("dWa").href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`;
  clearTimeout(hideTimer);
  stopSpring();
  panel.style.transform = ""; bg.style.opacity = "";
  drawer.hidden = false;
  panel.getBoundingClientRect(); // fija el estado inicial para que la entrada siempre se anime
  drawer.classList.add("is-open");
  document.body.style.overflow = "hidden";
  drawer.querySelector(".drawer__x").focus({ preventScroll: true });
}
let hideTimer;
function closeDrawer() {
  drawer.classList.remove("is-open");
  document.body.style.overflow = "";
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => { if (!drawer.classList.contains("is-open")) drawer.hidden = true; }, 520);
  lastFocus?.focus?.({ preventScroll: true });
}
drawer.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) closeDrawer(); });
document.addEventListener("keydown", (e) => {
  if (drawer.hidden) return;
  if (e.key === "Escape") closeDrawer();
  if (e.key === "Tab") { // el foco no se escapa del panel mientras está abierto
    const f = [...panel.querySelectorAll("a[href],button")].filter((x) => x.offsetParent);
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f.at(-1).focus(); }
    else if (!e.shiftKey && document.activeElement === f.at(-1)) { e.preventDefault(); f[0].focus(); }
  }
});

// ===== Hoja móvil: arrastrar para cerrar (seguimiento 1:1, impulso y muelle) =====
const panel = drawer.querySelector(".drawer__panel"), bg = drawer.querySelector(".drawer__bg");
const isSheet = () => matchMedia("(max-width:760px)").matches;
const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
let sheetY = 0, springRaf = 0;
const setY = (y) => { sheetY = y; panel.style.transform = `translateY(${y}px)`; bg.style.opacity = String(Math.max(0, 1 - y / panel.offsetHeight)); };
const stopSpring = () => cancelAnimationFrame(springRaf);
// Muelle críticamente amortiguado (amortiguación 1, respuesta ~0.35 s) que parte del valor y la velocidad actuales
function spring(to, velocity, done, response = 0.35, damping = 1) {
  stopSpring();
  const k = (2 * Math.PI / response) ** 2, c = (4 * Math.PI * damping) / response;
  let x = sheetY, v = velocity, last = performance.now();
  const tick = (now) => {
    let dt = Math.min((now - last) / 1000, 1 / 30); last = now;
    while (dt > 0) { const h = Math.min(dt, 1 / 240); v += (-k * (x - to) - c * v) * h; x += v * h; dt -= h; }
    if (Math.abs(v) < 8 && Math.abs(x - to) < 0.5) { setY(to); done(); return; }
    setY(x); springRaf = requestAnimationFrame(tick);
  };
  springRaf = requestAnimationFrame(tick);
}
const project = (v, d = 0.998) => ((v / 1000) * d) / (1 - d); // proyección de impulso de Apple
const rubber = (o, dim, c = 0.55) => (o * dim * c) / (dim + c * Math.abs(o));

let drag = null;
const head = $("dHead");
head.addEventListener("pointerdown", (e) => {
  if (!isSheet() || e.button > 0) return;
  stopSpring(); // se puede agarrar en pleno movimiento: parte de donde está ahora
  const t = getComputedStyle(panel).transform;
  const y0 = t && t !== "none" ? new DOMMatrixReadOnly(t).m42 : 0;
  drag = { id: e.pointerId, startY: e.clientY, y0, active: false, hist: [{ y: e.clientY, t: e.timeStamp }] };
});
head.addEventListener("pointermove", (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  const dy = e.clientY - drag.startY;
  if (!drag.active) {
    if (Math.abs(dy) < 8) return; // pequeño umbral antes de comprometer la dirección
    drag.active = true; try { head.setPointerCapture(e.pointerId); } catch {} drawer.classList.add("is-dragging");
  }
  const raw = drag.y0 + dy;
  setY(raw >= 0 ? raw : rubber(raw, panel.offsetHeight)); // hacia arriba: resistencia progresiva
  drag.hist.push({ y: e.clientY, t: e.timeStamp });
  if (drag.hist.length > 5) drag.hist.shift();
});
const endDrag = (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  const d = drag; drag = null;
  if (!d.active) return;
  drawer.classList.remove("is-dragging");
  const a = d.hist[0], b = d.hist.at(-1);
  const v = b.t > a.t ? ((b.y - a.y) / (b.t - a.t)) * 1000 : 0; // px/s al soltar
  const h = panel.offsetHeight;
  const willClose = sheetY + project(v) > h * 0.5 || v > 900;
  if (reduceMotion()) { panel.style.transform = bg.style.opacity = ""; if (willClose) closeDrawer(); return; }
  if (willClose) {
    spring(h, v, () => { drawer.classList.remove("is-open"); panel.style.transform = bg.style.opacity = ""; drawer.hidden = true; document.body.style.overflow = ""; lastFocus?.focus?.({ preventScroll: true }); });
  } else {
    spring(0, v, () => { panel.style.transform = bg.style.opacity = ""; });
  }
};
head.addEventListener("pointerup", endDrag);
head.addEventListener("pointercancel", endDrag);
$("dCita").addEventListener("click", () => {
  if (chosen) document.querySelector("#citaForm [name=msg]").value = `Me interesa ${chosen.es} (${DEG[chosen.deg]}, en ${chosen.lang.toLowerCase()}) en ${chosen.uni}, ${chosen.city}.`;
  closeDrawer();
});

// ===== Moneda =====
function renderMoney() { document.querySelectorAll(".money[data-xaf]").forEach((m) => (m.textContent = fmtXaf(+m.dataset.xaf))); }
document.querySelectorAll(".seg__b").forEach((b) => b.addEventListener("click", () => {
  currency = b.dataset.cur;
  document.querySelectorAll(".seg__b").forEach((x) => x.classList.toggle("is-on", x.dataset.cur === currency));
  if (!$("resList").hidden) render();
  renderMoney();
}));

// ===== Navegación =====
const nav = $("nav");
const onScroll = () => nav.classList.toggle("is-solid", window.scrollY > 40);
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();
$("burger").addEventListener("click", () => { const open = nav.classList.toggle("is-open"); $("burger").setAttribute("aria-expanded", open); });
document.querySelectorAll("#menu a").forEach((a) => a.addEventListener("click", () => nav.classList.remove("is-open")));

// ===== Animación al hacer scroll =====
const io = new IntersectionObserver((entries) => entries.forEach((e) => e.isIntersecting && (e.target.classList.add("is-in"), io.unobserve(e.target))), { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

// ===== Formulario de cita → WhatsApp =====
const form = $("citaForm");
form.elements.fecha.min = new Date().toISOString().slice(0, 10);
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const f = form.elements;
  const err = $("formErr");
  if (!f.nombre.value.trim() || !f.tel.value.trim() || !f.fecha.value) { err.hidden = false; return; }
  err.hidden = true;
  const dia = new Date(f.fecha.value + "T12:00").toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
  const text = ["Hola, quiero reservar una cita en la oficina (Estudiar en Turquía).", `• ${f.who.value}: ${f.nombre.value.trim()}`, `• Teléfono: ${f.tel.value.trim()}`, `• Día: ${dia} · ${f.hora.value}`, `• Interés: ${f.interes.value}`, f.msg.value.trim() ? `• Mensaje: ${f.msg.value.trim()}` : ""].filter(Boolean).join("\n");
  window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
});

// ===== Arranque =====
$("stP").textContent = group(ROWS.length);
$("stU").textContent = D.U.length;
$("year").textContent = new Date().getFullYear();
renderPopular();
renderMoney();
const urlQ = new URLSearchParams(location.search).get("q");
if (urlQ) {
  hq.value = urlQ;
  const p = PROGS.find((x) => x.name === urlQ), u = UNIS.find((x) => x.name === urlQ);
  run(p ? { exact: urlQ } : u ? { uni: urlQ } : { q: urlQ }, false);
}
