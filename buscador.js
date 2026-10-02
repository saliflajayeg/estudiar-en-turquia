// Buscador de programas — datos en data/programas.js (window.PROGRAMAS)
const D = window.PROGRAMAS;
const WHATSAPP = "905466175501";
const PAGE = 24;

const DEG = { B: "Licenciatura", M: "Máster", D: "Doctorado", A: "Formación Profesional (FP)", O: "Otros" };
const DEG_SHORT = { B: "Licenciatura", M: "Máster", D: "Doctorado", A: "FP", O: "Otro" };

const norm = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/ı/g, "i");
const group = (n) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

// Pre-procesado: cada programa como objeto con texto de búsqueda y precio en FCFA
const ROWS = D.R.map(([es, en, ui, deg, lang, price, orig, cur, note, campus, per], i) => {
  const [uni, city, country, slug] = D.U[ui];
  const rate = cur === "EUR" ? D.eur : D.rate;
  return {
    i, es, en, uni, city, country, slug, deg, lang, cur, note, campus, per,
    price, orig,
    xaf: price != null ? price * rate : null,
    xafOrig: orig != null ? orig * rate : null,
    hay: norm(`${es} ${en} ${uni} ${city}`),
    key: norm(`${es} ${en}`),
  };
});

const state = { q: "", deg: new Set(), lang: new Set(), city: "", uni: "", max: null, priced: true, sort: "rel", cur: "xaf", shown: PAGE };

// ===== Precio =====
const priceMax = Math.max(...ROWS.filter((r) => r.xaf).map((r) => r.xaf));
const STEPS = [500000, 750000, 1000000, 1500000, 2000000, 2500000, 3000000, 4000000, 5000000, 6500000, 8000000, 10000000, 13000000, 16000000, 20000000];
function money(xaf, native, cur) {
  if (xaf == null) return null;
  if (state.cur === "usd") return cur === "EUR" ? `${group(native)} €` : `${group(native)} USD`;
  return `${group(Math.round(xaf / 5000) * 5000)} FCFA`;
}

// ===== Construir filtros =====
const count = (key) => ROWS.reduce((m, r) => ((m[r[key]] = (m[r[key]] || 0) + 1), m), {});
function chips(el, map, labels, set, order) {
  el.innerHTML = Object.entries(map)
    .sort((a, b) => (order ? order.indexOf(a[0]) - order.indexOf(b[0]) : b[1] - a[1]))
    .map(([k]) => `<button type="button" class="fchip" data-k="${k}">${labels ? labels[k] || k : k}</button>`)
    .join("");
  el.addEventListener("click", (e) => {
    const b = e.target.closest(".fchip");
    if (!b) return;
    set.has(b.dataset.k) ? set.delete(b.dataset.k) : set.add(b.dataset.k);
    b.classList.toggle("is-on");
    update();
  });
}
chips(document.getElementById("fDeg"), count("deg"), DEG, state.deg, ["B", "M", "D", "A", "O"]);
chips(document.getElementById("fLang"), count("lang"), null, state.lang);

const fCity = document.getElementById("fCity");
Object.entries(count("city"))
  .sort((a, b) => b[1] - a[1])
  .forEach(([c, n]) => fCity.add(new Option(`${c} (${n})`, c)));
fCity.onchange = () => { state.city = fCity.value; fillUnis(); update(); };

const fUni = document.getElementById("fUni");
function fillUnis() {
  const keep = state.uni;
  fUni.length = 1;
  const m = {};
  ROWS.forEach((r) => { if (!state.city || r.city === state.city) m[r.uni] = (m[r.uni] || 0) + 1; });
  Object.keys(m).sort().forEach((u) => fUni.add(new Option(`${u} (${m[u]})`, u)));
  fUni.value = m[keep] ? keep : "";
  state.uni = fUni.value;
}
fillUnis();
fUni.onchange = () => { state.uni = fUni.value; update(); };

const fMax = document.getElementById("fMax");
const fMaxVal = document.getElementById("fMaxVal");
fMax.max = STEPS.length;
fMax.value = STEPS.length;
fMax.oninput = () => {
  const v = +fMax.value;
  state.max = v >= STEPS.length ? null : STEPS[v];
  fMaxVal.textContent = state.max == null ? "Sin límite" : state.cur === "usd" ? `Hasta ${group(state.max / D.rate)} USD` : `Hasta ${group(state.max)} FCFA`;
  update();
};

document.getElementById("fPrice").onchange = (e) => { state.priced = e.target.checked; update(); };
document.getElementById("sort").onchange = (e) => { state.sort = e.target.value; update(); };

document.querySelectorAll(".seg__b").forEach((b) =>
  b.addEventListener("click", () => {
    state.cur = b.dataset.cur;
    document.querySelectorAll(".seg__b").forEach((x) => x.classList.toggle("is-on", x === b));
    fMax.oninput();
  })
);

let qTimer;
const qEl = document.getElementById("q");
qEl.addEventListener("input", () => {
  clearTimeout(qTimer);
  qTimer = setTimeout(() => { state.q = qEl.value; update(); }, 120);
});

// Búsquedas rápidas
const QUICK = ["Medicina", "Ingeniería informática", "Derecho", "Enfermería", "Administración de empresas", "Arquitectura", "Farmacia", "Psicología"];
document.getElementById("quick").innerHTML = QUICK.map((q) => `<button type="button">${q}</button>`).join("");
document.getElementById("quick").addEventListener("click", (e) => {
  if (e.target.tagName !== "BUTTON") return;
  qEl.value = e.target.textContent;
  state.q = qEl.value;
  update();
  document.querySelector(".sgrid").scrollIntoView({ behavior: "smooth" });
});

document.getElementById("reset").onclick = () => {
  Object.assign(state, { q: "", city: "", uni: "", max: null, priced: true, sort: "rel" });
  state.deg.clear(); state.lang.clear();
  qEl.value = ""; fCity.value = ""; fillUnis(); fMax.value = STEPS.length; fMaxVal.textContent = "Sin límite";
  document.getElementById("fPrice").checked = true; document.getElementById("sort").value = "rel";
  document.querySelectorAll(".fchip.is-on").forEach((c) => c.classList.remove("is-on"));
  update();
};

// ===== Filtrar + ordenar =====
function filtered() {
  const toks = norm(state.q).split(/\s+/).filter(Boolean);
  const nq = norm(state.q).trim();
  let out = ROWS.filter((r) => {
    if (state.priced && r.xaf == null) return false;
    if (state.deg.size && !state.deg.has(r.deg)) return false;
    if (state.lang.size && !state.lang.has(r.lang)) return false;
    if (state.city && r.city !== state.city) return false;
    if (state.uni && r.uni !== state.uni) return false;
    if (state.max != null && (r.xaf == null || r.xaf > state.max)) return false;
    return toks.every((t) => r.hay.includes(t));
  });
  const byPrice = (a, b) => (a.xaf ?? 1e12) - (b.xaf ?? 1e12);
  if (state.sort === "asc") out.sort(byPrice);
  else if (state.sort === "desc") out.sort((a, b) => (b.xaf ?? -1) - (a.xaf ?? -1));
  else if (state.sort === "az") out.sort((a, b) => a.es.localeCompare(b.es, "es"));
  else if (nq) {
    const score = (r) => (r.key.startsWith(nq) ? 0 : r.key.includes(nq) ? 1 : 2);
    out.sort((a, b) => score(a) - score(b) || byPrice(a, b));
  } else {
    // Sin búsqueda: primero grados, luego por precio
    const o = { B: 0, A: 1, M: 2, D: 3, O: 4 };
    out.sort((a, b) => o[a.deg] - o[b.deg] || byPrice(a, b));
  }
  return out;
}

// ===== Pintar =====
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const mono = (u) => u.replace(/University|Universitesi|Üniversitesi|of|the|Istanbul|İstanbul/gi, "").trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 3).toUpperCase() || u.slice(0, 2).toUpperCase();
const hue = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);

function card(r) {
  const p = money(r.xaf, r.price, r.cur);
  const o = r.orig != null && r.orig > r.price ? money(r.xafOrig, r.orig, r.cur) : null;
  const msg = `Hola, me interesa el programa "${r.es}" (${DEG_SHORT[r.deg]}, en ${r.lang.toLowerCase()}) en ${r.uni}, ${r.city}. ¿Me podéis informar?`;
  return `<article class="prog">
    <div class="prog__mono" style="--h:${hue(r.uni)}"><span>${esc(mono(r.uni))}</span>${r.slug ? `<img src="img/unis/${r.slug}.webp" alt="" loading="lazy" decoding="async" onerror="this.remove()">` : ""}</div>
    <div class="prog__main">
      <h3>${esc(r.es)}</h3>
      ${r.en && norm(r.en) !== norm(r.es) ? `<p class="prog__en">${esc(r.en)}</p>` : ""}
      <p class="prog__uni"><strong>${esc(r.uni)}</strong> · ${esc(r.city)}${r.campus ? ` · campus ${esc(r.campus)}` : ""}</p>
      <div class="prog__tags"><span class="t t--deg">${DEG_SHORT[r.deg]}</span><span class="t">${esc(r.lang)}</span>${r.note ? `<span class="t t--note">${esc(r.note)}</span>` : ""}</div>
    </div>
    <div class="prog__side">
      ${p ? `<p class="prog__price">${o ? `<s>${o}</s>` : ""}<strong>${p}</strong><small>${r.per === "P" ? "programa completo" : r.per === "S" ? "por semestre" : "por año"}</small></p>` : `<p class="prog__price prog__price--ask"><strong>Consultar precio</strong></p>`}
      <a class="btn btn--red btn--sm" target="_blank" rel="noopener" href="https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}">Me interesa</a>
    </div>
  </article>`;
}

let current = [];
function update(keepShown) {
  if (!keepShown) state.shown = PAGE;
  current = filtered();
  const list = document.getElementById("list");
  list.innerHTML = current.length
    ? current.slice(0, state.shown).map(card).join("")
    : `<div class="empty"><h3>No hay programas con estos filtros</h3><p>Prueba con otra palabra (por ejemplo “ingeniería” en vez de “ingeniero”) o quita algún filtro. ¿No lo encuentras? <a href="https://wa.me/${WHATSAPP}" target="_blank" rel="noopener">Pregúntanos por WhatsApp</a>: trabajamos con más universidades.</p></div>`;
  document.getElementById("count").innerHTML = `<strong>${group(current.length)}</strong> programa${current.length === 1 ? "" : "s"}`;
  const more = document.getElementById("more");
  more.hidden = current.length <= state.shown;
  more.textContent = `Ver más programas (${group(current.length - state.shown)} restantes)`;
  const nf = state.deg.size + state.lang.size + (state.city ? 1 : 0) + (state.uni ? 1 : 0) + (state.max != null ? 1 : 0);
  document.getElementById("fCount").textContent = nf ? `(${nf})` : "";
}
document.getElementById("more").onclick = () => { state.shown += PAGE; update(true); };

// Panel de filtros en móvil
const filters = document.getElementById("filters");
document.getElementById("openFilters").onclick = () => { filters.classList.add("is-open"); document.body.style.overflow = "hidden"; };
document.getElementById("closeFilters").onclick = () => { filters.classList.remove("is-open"); document.body.style.overflow = ""; };

// Nav móvil
const nav = document.getElementById("nav");
document.getElementById("burger").addEventListener("click", (e) => {
  const open = nav.classList.toggle("is-open");
  e.currentTarget.setAttribute("aria-expanded", open);
});

// Estadísticas + búsqueda desde la URL (?q=medicina)
document.getElementById("statProgs").textContent = group(ROWS.filter((r) => r.xaf != null).length);
document.getElementById("statUnis").textContent = D.U.length;
document.getElementById("rateLabel").textContent = D.rate;
document.getElementById("year").textContent = new Date().getFullYear();
const urlQ = new URLSearchParams(location.search).get("q");
if (urlQ) { qEl.value = urlQ; state.q = urlQ; }
update();
