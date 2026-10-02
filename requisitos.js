// ===== Precios (FCFA). Cambiar aquí si varían =====
const PRICE = {
  tr: 10000,              // traducción al inglés, por página
  jus: 2000,              // Ministerio de Justicia, por documento (se paga por el original y otra vez por la traducción)
  ext: 2000,              // Asuntos Exteriores, por documento (original y traducción)
  emb: [13000, 14000],    // Embajada de Turquía, por página, el día de la cita
  res: 2000,              // reserva de billete de ida
};
const WHATSAPP = "905466175501";

// Documentos que se traducen y legalizan (páginas típicas, ajustables)
const DOCS = [
  { id: "bach", name: "Certificado de bachillerato", pages: 1, on: true },
  { id: "hoja", name: "Hoja académica", pages: 2, on: true },
  { id: "legest", name: "Certificado de legalización de estudios", pages: 1, on: true },
  { id: "med", name: "Certificado médico", pages: 2, on: true },
  { id: "ant", name: "Antecedentes penales", pages: 1, on: true },
  { id: "sel", name: "Selectividad", pages: 1, on: false, optional: true },
];
// Lo que cuesta conseguir los documentos y el visado
const OTHERS = [
  { name: "Antecedentes penales (obtenerlo)", cost: 8000 },
  { name: "Certificado médico (obtenerlo)", cost: 22000 },
  { name: "Seguro de viaje de 1 año", cost: 40000, approx: true },
  { name: "Reserva de billete de ida", cost: PRICE.res },
  { name: "Visado (embajada de Turquía)", cost: 80000 },
];

const $ = (id) => document.getElementById(id);
const g = (n) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const f = (n) => `${g(n)} FCFA`;
const range = ([a, b]) => (a === b ? f(a) : `${g(a)} – ${g(b)} FCFA`);
const rangeN = ([a, b]) => (a === b ? g(a) : `${g(a)}–${g(b)}`); // sin "FCFA" (tabla)

// ===== Precios en el texto =====
document.querySelectorAll("[data-price]").forEach((el) => {
  const k = el.dataset.price;
  el.textContent = k === "emb" ? range(PRICE.emb) : k === "jus" || k === "ext" ? `${g(PRICE[k])} + ${g(PRICE[k])} FCFA` : f(PRICE[k]);
});
const docCost = (d) => {
  const tr = PRICE.tr * d.pages;
  const leg = 2 * PRICE.jus + 2 * PRICE.ext; // original + traducción en los dos ministerios
  const emb = PRICE.emb.map((p) => p * d.pages);
  return { tr, leg, emb, tot: [tr + leg + emb[0], tr + leg + emb[1]] };
};
$("exOne").textContent = range(docCost({ pages: 1 }).tot);

// ===== Calculadora =====
const saved = (() => { try { return JSON.parse(localStorage.getItem("req-calc") || "null"); } catch { return null; } })();
if (saved) DOCS.forEach((d) => { if (saved[d.id]) Object.assign(d, saved[d.id]); });
let incOther = saved?.incOther ?? true;
$("incOther").checked = incOther;

function renderRows() {
  $("crows").innerHTML = DOCS.map((d) => {
    const c = docCost(d);
    return `<div class="crow${d.on ? "" : " is-off"}" role="row" data-id="${d.id}">
      <span class="crow__doc" role="cell"><label class="mini-switch"><input type="checkbox" data-act="on" ${d.on ? "checked" : ""} aria-label="Incluir ${d.name}"><span></span></label><span>${d.name}${d.optional ? ' <em class="tag-opt">Opcional</em>' : ""}</span></span>
      <span role="cell" class="crow__pages"><button type="button" data-act="minus" aria-label="Menos páginas">−</button><b>${d.pages}</b><button type="button" data-act="plus" aria-label="Más páginas">+</button></span>
      <span role="cell" data-l="Traducción">${g(c.tr)}</span>
      <span role="cell" data-l="Legalizar">${g(c.leg)}</span>
      <span role="cell" data-l="Embajada">${rangeN(c.emb)}</span>
      <span role="cell" data-l="Total" class="crow__tot">${rangeN(c.tot)}</span>
    </div>`;
  }).join("");
}
function renderSum() {
  const on = DOCS.filter((d) => d.on);
  const s = on.reduce((a, d) => { const c = docCost(d); a.tr += c.tr; a.jus += 2 * PRICE.jus; a.ext += 2 * PRICE.ext; a.emb[0] += c.emb[0]; a.emb[1] += c.emb[1]; a.pages += d.pages; return a; }, { tr: 0, jus: 0, ext: 0, emb: [0, 0], pages: 0 });
  const oth = incOther ? OTHERS.reduce((a, o) => a + o.cost, 0) : 0;
  const lines = [
    [`Traducciones (${s.pages} pág.)`, f(s.tr)],
    [`Ministerio de Justicia (${on.length} doc.)`, f(s.jus)],
    [`Asuntos Exteriores (${on.length} doc.)`, f(s.ext)],
    [`Embajada de Turquía (${s.pages} pág.)`, range(s.emb)],
  ];
  if (incOther) lines.push(["Conseguir documentos y visado", f(oth)]);
  $("sumLines").innerHTML = lines.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("");
  const tot = [s.tr + s.jus + s.ext + s.emb[0] + oth, s.tr + s.jus + s.ext + s.emb[1] + oth];
  $("sumTotal").textContent = range(tot);
  $("others").innerHTML = OTHERS.map((o) => `<li><span>${o.name}</span><b>${o.approx ? "≈ " : ""}${f(o.cost)}</b></li>`).join("");
  $("others").classList.toggle("is-off", !incOther);
  const msg = `Hola, he visto los requisitos del visado en la web. Mi estimación es ${range(tot)} (${on.map((d) => `${d.name}: ${d.pages} pág.`).join(", ")}). ¿Me ayudáis con las traducciones y legalizaciones?`;
  $("sumWa").href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`;
  try { localStorage.setItem("req-calc", JSON.stringify({ ...Object.fromEntries(DOCS.map((d) => [d.id, { pages: d.pages, on: d.on }])), incOther })); } catch {}
}
$("crows").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-act]"); if (!b) return;
  const d = DOCS.find((x) => x.id === b.closest(".crow").dataset.id);
  d.pages = Math.max(1, Math.min(10, d.pages + (b.dataset.act === "plus" ? 1 : -1)));
  if (!d.on) d.on = true;
  renderRows(); renderSum();
});
$("crows").addEventListener("change", (e) => {
  if (e.target.dataset.act !== "on") return;
  DOCS.find((x) => x.id === e.target.closest(".crow").dataset.id).on = e.target.checked;
  renderRows(); renderSum();
});
$("incOther").addEventListener("change", (e) => { incOther = e.target.checked; renderSum(); });
renderRows(); renderSum();

// ===== Lista de documentos (se recuerda en este dispositivo) =====
const boxes = [...document.querySelectorAll(".dlist input[type=checkbox]")];
const checked = (() => { try { return new Set(JSON.parse(localStorage.getItem("req-docs") || "[]")); } catch { return new Set(); } })();
boxes.forEach((b) => (b.checked = checked.has(b.dataset.id)));
function progress() {
  const req = boxes.filter((b) => b.dataset.id !== "sel");
  const n = req.filter((b) => b.checked).length;
  $("progN").textContent = n; $("progT").textContent = req.length;
  $("progBar").style.width = `${(n / req.length) * 100}%`;
  try { localStorage.setItem("req-docs", JSON.stringify(boxes.filter((b) => b.checked).map((b) => b.dataset.id))); } catch {}
}
boxes.forEach((b) => b.addEventListener("change", progress));
progress();
$("printBtn").addEventListener("click", () => window.print());

// ===== Navegación =====
const nav = $("nav");
$("burger").addEventListener("click", (e) => { const open = nav.classList.toggle("is-open"); e.currentTarget.setAttribute("aria-expanded", open); });
$("year").textContent = new Date().getFullYear();
