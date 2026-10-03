// ===== Precios (FCFA). Cambiar aquí si varían =====
const PRICE = {
  tr: 10000,              // traducción al inglés, por página
  jus: 2000,              // Ministerio de Justicia: por el original y otra vez por la traducción
  ext: 2000,              // Asuntos Exteriores: por el original y otra vez por la traducción
  emb: [13000, 14000],    // Embajada de Turquía: legalización por documento, el día de la cita
  visa: 80000,            // visado de estudiante (embajada de Turquía)
  res: 2000,              // reserva de billete de ida
};
const WHATSAPP = "905466175501";

// Documentos de la calculadora.
// req: lo que cuesta solicitarlo (null = depende del centro, a consultar)
// pages: páginas del documento (fijas; 0 = no se traduce ni se legaliza)
// has: valor inicial de “Lo tengo”; optional: se puede quitar (selectividad)
const DOCS = [
  { id: "bach", name: "Certificado de bachillerato", req: null, pages: 1, has: true },
  { id: "hoja", name: "Hoja académica", req: null, pages: 2, has: true },
  { id: "legest", name: "Certificado de legalización de estudios", req: null, pages: 1, has: false },
  { id: "med", name: "Certificado médico", req: 22000, pages: 2, has: false },
  { id: "ant", name: "Antecedentes penales", req: 8000, pages: 1, has: false },
  { id: "sel", name: "Selectividad", req: null, pages: 1, has: true, optional: true, on: false },
  { id: "seg", name: "Seguro de viaje de 1 año", req: 40000, approx: true, pages: 0, has: false },
  { id: "bil", name: "Reserva de billete de ida", req: PRICE.res, pages: 0, has: false },
];

const $ = (id) => document.getElementById(id);
const g = (n) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const f = (n) => `${g(n)} FCFA`;
const range = ([a, b]) => (a === b ? f(a) : `${g(a)} – ${g(b)} FCFA`);
const LEG = 2 * PRICE.jus + 2 * PRICE.ext; // original + traducción en Justicia y en Exteriores

// ===== Precios en el texto =====
document.querySelectorAll("[data-price]").forEach((el) => {
  const k = el.dataset.price;
  el.textContent = k === "emb" ? range(PRICE.emb) : k === "jus" || k === "ext" ? `${g(PRICE[k])} + ${g(PRICE[k])} FCFA` : f(PRICE[k]);
});
$("exOne").textContent = f(PRICE.tr + LEG);

// ===== Estado (se recuerda en este dispositivo) =====
const saved = (() => { try { return JSON.parse(localStorage.getItem("req-calc2") || "null"); } catch { return null; } })();
DOCS.forEach((d) => { if (d.on === undefined) d.on = true; if (saved?.[d.id]) { d.has = saved[d.id].has ?? d.has; d.on = saved[d.id].on ?? d.on; } });

const costOf = (d) => {
  const req = d.has ? 0 : d.req;               // null si no se sabe
  const tr = PRICE.tr * d.pages;
  const jus = d.pages ? 2 * PRICE.jus : 0;     // original + traducción
  const ext = d.pages ? 2 * PRICE.ext : 0;
  return { req, tr, jus, ext, leg: jus + ext, tot: (req || 0) + tr + jus + ext, pending: !d.has && d.req == null };
};
const pagesTxt = (n) => `${n} página${n > 1 ? "s" : ""}`;

function renderList() {
  $("clist").innerHTML = DOCS.map((d) => {
    const c = costOf(d);
    const off = d.optional && !d.on;
    const chips = [
      !d.has ? `<span class="cchip cchip--req"><small>Solicitarlo</small>${c.pending ? "a consultar" : (d.approx ? "≈ " : "") + f(c.req)}</span>` : "",
      d.pages ? `<span class="cchip"><small>Traducir (${pagesTxt(d.pages)})</small>${f(c.tr)}</span>` : "",
      d.pages ? `<span class="cchip cchip--leg"><small>Legalizar en Justicia</small>${f(c.jus)}</span>` : "",
      d.pages ? `<span class="cchip cchip--leg"><small>Legalizar en Exteriores</small>${f(c.ext)}</span>` : "",
    ].join("");
    return `<article class="cdoc${off ? " is-off" : ""}" data-id="${d.id}">
      <div class="cdoc__top">
        <div class="cdoc__name">
          ${d.optional ? `<label class="mini-switch"><input type="checkbox" data-act="on" ${d.on ? "checked" : ""} aria-label="Incluir ${d.name}"><span></span></label>` : ""}
          <h3>${d.name}${d.optional ? ' <em class="tag-opt">Opcional</em>' : ""}</h3>
          ${d.pages ? `<span class="cdoc__pages">${pagesTxt(d.pages)}</span>` : '<span class="cdoc__note">No se traduce</span>'}
        </div>
        <div class="have" role="group" aria-label="¿Tienes este documento?">
          <button type="button" data-act="has" data-v="1" class="${d.has ? "is-on" : ""}" ${off ? "disabled" : ""}>Lo tengo</button>
          <button type="button" data-act="has" data-v="0" class="${!d.has ? "is-on" : ""}" ${off ? "disabled" : ""}>No lo tengo</button>
        </div>
      </div>
      ${off ? '<p class="cdoc__skip">No se incluye en el cálculo.</p>' : `<div class="cdoc__bottom">
        <div class="cchips">${chips}</div>
        <strong class="cdoc__tot">${f(c.tot)}${c.pending ? '<small>+ solicitud</small>' : ""}</strong>
      </div>`}
    </article>`;
  }).join("");
}

function renderSum() {
  const act = DOCS.filter((d) => !(d.optional && !d.on));
  const s = act.reduce((a, d) => {
    const c = costOf(d);
    a.req += c.req || 0; a.tr += c.tr; a.jus += c.jus; a.ext += c.ext;
    if (c.pending) a.pend.push(d.name.toLowerCase());
    if (d.pages) a.legDocs++;
    if (!d.has) a.reqN++;
    a.pages += d.pages;
    return a;
  }, { req: 0, tr: 0, jus: 0, ext: 0, pend: [], legDocs: 0, reqN: 0, pages: 0 });

  $("sumLines").innerHTML = [
    [`Solicitar documentos (${s.reqN})`, f(s.req) + (s.pend.length ? "*" : "")],
    [`Traducción (${pagesTxt(s.pages)})`, f(s.tr)],
    [`Legalizar en el Ministerio de Justicia (${s.legDocs} doc.)`, f(s.jus)],
    [`Legalizar en el Ministerio de Exteriores (${s.legDocs} doc.)`, f(s.ext)],
  ].map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("");
  const total = s.req + s.tr + s.jus + s.ext;
  $("sumTotal").textContent = f(total);
  const pend = $("sumPending");
  pend.hidden = !s.pend.length;
  pend.textContent = s.pend.length ? `* Más lo que cueste solicitar: ${s.pend.join(", ")}. Te lo confirmamos en la oficina.` : "";

  // Embajada: aparte (visado + legalización por documento)
  const emb = PRICE.emb.map((p) => p * s.legDocs);
  $("embVisa").textContent = f(PRICE.visa);
  $("embDocsN").textContent = `${s.legDocs} documentos × ${range(PRICE.emb)}`;
  $("embDocs").textContent = range(emb);
  $("embTotal").textContent = range([PRICE.visa + emb[0], PRICE.visa + emb[1]]);

  const missing = act.filter((d) => !d.has).map((d) => d.name).join(", ");
  const msg = `Hola, he usado la calculadora de requisitos de la web. Documentos, traducción y legalización: ${f(total)}${s.pend.length ? " (más la solicitud de algunos documentos)" : ""}. ${missing ? `Me faltan: ${missing}.` : "Ya tengo todos los documentos."} ¿Me ayudáis con los trámites?`;
  $("sumWa").href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`;
  try { localStorage.setItem("req-calc2", JSON.stringify(Object.fromEntries(DOCS.map((d) => [d.id, { has: d.has, on: d.on }])))); } catch {}
}

$("clist").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-act]"); if (!b) return;
  if (!window._calcT) { window._calcT = 1; window.track?.("calc", { q: "Usó la calculadora" }); }
  const d = DOCS.find((x) => x.id === b.closest(".cdoc").dataset.id);
  if (b.dataset.act === "has") d.has = b.dataset.v === "1";
  renderList(); renderSum();
  const again = document.querySelector(`.cdoc[data-id="${d.id}"] button[data-act="${b.dataset.act}"]${b.dataset.v ? `[data-v="${b.dataset.v}"]` : ""}`);
  again?.focus({ preventScroll: true });
});
$("clist").addEventListener("change", (e) => {
  if (e.target.dataset.act !== "on") return;
  DOCS.find((x) => x.id === e.target.closest(".cdoc").dataset.id).on = e.target.checked;
  renderList(); renderSum();
});
renderList(); renderSum();

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
