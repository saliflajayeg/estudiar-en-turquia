// Página "Beca Türkiye Bursları": menú, comprobación de requisitos y formulario → WhatsApp
const $ = (id) => document.getElementById(id);
const WHATSAPP = "905466175501";
const FEE = "7.500 FCFA";
const nav = $("nav");
$("burger").addEventListener("click", (e) => { const open = nav.classList.toggle("is-open"); e.currentTarget.setAttribute("aria-expanded", open); });
document.querySelectorAll("#menu a").forEach((a) => a.addEventListener("click", () => nav.classList.remove("is-open")));
$("year").textContent = new Date().getFullYear();

// Requisitos oficiales (edad en la fecha de la convocatoria y nota mínima en %)
const CALL = new Date(2027, 0, 1);
const RULES = { "Grado": { age: 21, min: 70 }, "Máster": { age: 30, min: 75 }, "Doctorado": { age: 35, min: 75 } };
const MED = /medicin|odontolog|farmac|dentist/i;

const form = $("becaForm");
const f = form.elements;
const ageAt = (d) => { const b = new Date(d); if (isNaN(b)) return null; let a = CALL.getFullYear() - b.getFullYear(); if (CALL < new Date(CALL.getFullYear(), b.getMonth(), b.getDate())) a--; return a; };

function check() {
  const r = RULES[f.nivel.value];
  $("estadoWrap").hidden = f.nivel.value !== "Grado";
  const out = [];
  let warn = false;
  const age = f.nac.value ? ageAt(f.nac.value) : null;
  if (age != null) {
    if (age < r.age) out.push(`Edad: ${age} años en enero de 2027, cumples (menos de ${r.age}).`);
    else { warn = true; out.push(`Edad: tendrás ${age} años en enero de 2027 y el límite para ${f.nivel.value.toLowerCase()} es menos de ${r.age}.`); }
  }
  const nota = parseFloat(String(f.nota.value).replace(",", "."));
  if (!isNaN(nota)) {
    const min = f.nivel.value === "Grado" && MED.test(f.carrera.value) ? 90 : r.min;
    const pct = Math.round(nota * 10);
    if (pct >= min) out.push(`Nota: ${pct} %, cumples (mínimo ${min} %).`);
    else { warn = true; out.push(`Nota: ${pct} % y el mínimo es ${min} %. Ven a la oficina y vemos otras opciones.`); }
  }
  const el = $("belig");
  el.hidden = !out.length;
  el.classList.toggle("is-warn", warn);
  el.textContent = out.join(" ");
  return { age, nota: isNaN(nota) ? null : nota, warn };
}
form.addEventListener("input", check);
form.addEventListener("change", check);
check();

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const err = $("formErr");
  if (!f.nombre.value.trim() || !f.tel.value.trim() || !f.nac.value) { err.hidden = false; return; }
  err.hidden = true;
  const c = check();
  const [y, m, d] = f.nac.value.split("-");
  const extra = window.visit?.lines?.() || [];
  const text = [
    `🎓 *INSCRIPCIÓN BECA TÜRKIYE BURSLARI 2027* · desde la página web`,
    `${window.visit?.FROM_WEB || "Hola,"} Quiero inscribirme para que me ayudéis a solicitar la beca del Gobierno de Turquía.`,
    "",
    `• Nombre: ${f.nombre.value.trim()}`,
    `• Teléfono: ${f.tel.value.trim()}`,
    `• Nivel: ${f.nivel.value}`,
    `• Fecha de nacimiento: ${d}/${m}/${y}${c.age != null ? ` (${c.age} años en enero de 2027)` : ""}`,
    c.nota != null ? `• Nota media: ${String(c.nota).replace(".", ",")} / 10` : null,
    f.nivel.value === "Grado" ? `• Bachillerato: ${f.estado.value}` : null,
    f.carrera.value.trim() ? `• Carrera que me gustaría: ${f.carrera.value.trim()}` : null,
    `• Ciudad: ${f.ciudad.value}`,
    "",
    `Sé que la inscripción (${FEE}) se paga en la oficina. ¿Qué día puedo ir con mis documentos?`,
    extra.length ? "" : null,
    extra.length ? "*Lo que he visto en la web:*" : null,
    ...extra,
  ].filter((x) => x !== null).join("\n");
  window.track?.("whatsapp", { q: `Beca Türkiye: ${f.nivel.value}` });
  window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
});
