// Página "Colabora con nosotros": menú y formulario → WhatsApp
const $ = (id) => document.getElementById(id);
const WHATSAPP = "905466175501";
const nav = $("nav");
$("burger").addEventListener("click", (e) => { const open = nav.classList.toggle("is-open"); e.currentTarget.setAttribute("aria-expanded", open); });
document.querySelectorAll("#menu a").forEach((a) => a.addEventListener("click", () => nav.classList.remove("is-open")));
$("year").textContent = new Date().getFullYear();

const form = $("colabForm");
const f = form.elements;
const syncDir = () => { $("dirWrap").hidden = f.oficina.value !== "Sí"; };
form.addEventListener("change", syncDir);
syncDir();

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const err = $("formErr");
  if (!f.nombre.value.trim() || !f.tel.value.trim()) { err.hidden = false; return; }
  err.hidden = true;
  const ofi = f.oficina.value === "Sí" ? `Sí${f.dir.value.trim() ? ` (${f.dir.value.trim()})` : ""}` : "No";
  const text = [
    "Hola, quiero colaborar con Asesoría de Viajes y traer estudiantes para estudiar en Turquía.",
    `• Nombre: ${f.nombre.value.trim()}`,
    `• Teléfono: ${f.tel.value.trim()}`,
    `• Soy: ${f.tipo.value}`,
    `• Oficina: ${ofi}`,
    `• Ciudad: ${f.ciudad.value}`,
    `• Estudiantes al año: ${f.cuantos.value}`,
    f.msg.value.trim() ? `• Cómo consigo clientes: ${f.msg.value.trim()}` : "",
  ].filter(Boolean).join("\n");
  window.track?.("whatsapp", { q: `Colaborador: ${f.tipo.value}` });
  window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
});
