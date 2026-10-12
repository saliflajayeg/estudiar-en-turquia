// ===== “Ahora mismo en Estambul”: hora, tiempo y próximo inicio de curso =====
(() => {
  const $ = (id) => document.getElementById(id);
  if (!$("ltIst")) return;

  const hhmm = (tz) => new Intl.DateTimeFormat("es-ES", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
  const tick = () => {
    $("ltIst").textContent = hhmm("Europe/Istanbul");
    $("ltSsg").textContent = hhmm("Africa/Malabo");
  };
  tick();
  setInterval(tick, 15000);

  // Cursos: septiembre y febrero
  const now = new Date(), y = now.getFullYear(), m = now.getMonth();
  $("ltIntake").textContent = m < 1 ? `Febrero ${y}` : m < 8 ? `Septiembre ${y}` : `Febrero ${y + 1}`;

  // Tiempo actual (Open-Meteo, sin clave). Si falla, la tarjeta sigue funcionando sin él.
  const WX = [[0, "despejado"], [3, "parcialmente nublado"], [48, "con niebla"], [67, "lluvia"], [77, "nieve"], [82, "chubascos"], [86, "nieve"], [99, "tormenta"]];
  fetch("https://api.open-meteo.com/v1/forecast?latitude=41.01&longitude=28.98&current=temperature_2m,weather_code&timezone=Europe%2FIstanbul")
    .then((r) => (r.ok ? r.json() : Promise.reject()))
    .then(({ current: c }) => {
      const label = (WX.find(([max]) => c.weather_code <= max) || [, ""])[1];
      $("ltWx").textContent = `${Math.round(c.temperature_2m)}° · ${label}`;
    })
    .catch(() => {});
})();
