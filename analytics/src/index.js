// Estadísticas propias de turquia.mercadosemu.com (Cloudflare Worker + D1).
// POST /e      → guarda un evento (visita, búsqueda, elección, WhatsApp…). Sin IP ni datos personales.
// GET  /stats  → resumen para el panel de administración (requiere la contraseña ADMIN_PASSWORD).

const ALLOWED = ["https://turquia.mercadosemu.com", "http://localhost:3060"];
const TYPES = new Set(["view", "search", "elegir", "whatsapp", "cita", "calc"]);
const BOT = /bot|crawl|spider|slurp|headless|preview|facebookexternalhit|whatsapp\/|lighthouse|pingdom|curl|wget|python|node-fetch/i;

const cors = (origin) => ({
  "Access-Control-Allow-Origin": ALLOWED.includes(origin) ? origin : ALLOWED[0],
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Authorization,Content-Type",
  "Vary": "Origin",
});
const json = (data, origin, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", ...cors(origin) } });
const clip = (s, n) => (typeof s === "string" ? s.trim().slice(0, n) : null);

async function hash(text) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(d)].slice(0, 8).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function source(ref, utm) {
  if (utm) return clip(utm, 30).toLowerCase();
  if (!ref) return "directo";
  try {
    const h = new URL(ref).hostname.replace(/^www\.|^m\.|^l\./, "");
    if (h.includes("mercadosemu.com")) return null; // navegación interna
    if (h.includes("whatsapp")) return "whatsapp";
    if (h.includes("facebook") || h === "fb.com") return "facebook";
    if (h.includes("instagram")) return "instagram";
    if (h.includes("tiktok")) return "tiktok";
    if (h.includes("google")) return "google";
    return h.slice(0, 40);
  } catch { return "otro"; }
}

async function collect(req, env, origin) {
  const ua = req.headers.get("User-Agent") || "";
  if (BOT.test(ua)) return new Response(null, { status: 204, headers: cors(origin) });
  let b;
  try { b = JSON.parse(await req.text()); } catch { return new Response(null, { status: 400, headers: cors(origin) }); }
  if (!TYPES.has(b.t)) return new Response(null, { status: 400, headers: cors(origin) });
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const ip = req.headers.get("CF-Connecting-IP") || "";
  // visitante del día: huella irreversible (no se guarda la IP); cambia cada día
  const vid = await hash(`${ip}|${ua}|${day}|${env.SALT || "turquia"}`);
  const dev = /Mobi|Android|iPhone|iPad/i.test(ua) ? "movil" : "ordenador";
  const country = (req.cf && req.cf.country) || null;
  await env.DB.prepare(
    "INSERT INTO events (ts, day, type, path, q, extra, src, dev, country, vid) VALUES (?,?,?,?,?,?,?,?,?,?)"
  ).bind(now.getTime(), day, b.t, clip(b.p, 80), clip(b.q, 80), clip(b.x, 120), b.t === "view" ? source(b.r, b.u) : null, dev, country, vid).run();
  return new Response(null, { status: 204, headers: cors(origin) });
}

async function stats(req, env, origin) {
  const auth = req.headers.get("Authorization") || "";
  if (!env.ADMIN_PASSWORD || auth !== `Bearer ${env.ADMIN_PASSWORD}`) return json({ error: "Contraseña incorrecta" }, origin, 401);
  const days = Math.min(365, Math.max(1, parseInt(new URL(req.url).searchParams.get("days") || "30", 10)));
  const since = new Date(Date.now() - (days - 1) * 864e5).toISOString().slice(0, 10);
  const q = (sql, ...args) => env.DB.prepare(sql).bind(since, ...args).all().then((r) => r.results);
  const [totals, perDay, pages, searches, chosen, programs, sources, devices, countries, wa] = await Promise.all([
    q(`SELECT COUNT(DISTINCT day||vid) AS visitors, SUM(type='view') AS views, SUM(type='search') AS searches, SUM(type='elegir') AS chosen, SUM(type='whatsapp') AS whatsapp, SUM(type='cita') AS citas FROM events WHERE day >= ?`),
    q(`SELECT day, COUNT(DISTINCT vid) AS visitors, SUM(type='view') AS views FROM events WHERE day >= ? GROUP BY day ORDER BY day`),
    q(`SELECT path, COUNT(*) AS n FROM events WHERE day >= ? AND type='view' GROUP BY path ORDER BY n DESC LIMIT 10`),
    q(`SELECT q, COUNT(*) AS n FROM events WHERE day >= ? AND type='search' AND q IS NOT NULL AND q <> '' GROUP BY lower(q) ORDER BY n DESC LIMIT 20`),
    q(`SELECT q, extra, COUNT(*) AS n FROM events WHERE day >= ? AND type='elegir' GROUP BY q, extra ORDER BY n DESC LIMIT 15`),
    q(`SELECT q, COUNT(*) AS n FROM events WHERE day >= ? AND type='elegir' GROUP BY q ORDER BY n DESC LIMIT 10`),
    q(`SELECT src, COUNT(DISTINCT day||vid) AS n FROM events WHERE day >= ? AND type='view' AND src IS NOT NULL GROUP BY src ORDER BY n DESC LIMIT 8`),
    q(`SELECT dev, COUNT(DISTINCT day||vid) AS n FROM events WHERE day >= ? GROUP BY dev ORDER BY n DESC`),
    q(`SELECT country, COUNT(DISTINCT day||vid) AS n FROM events WHERE day >= ? AND country IS NOT NULL GROUP BY country ORDER BY n DESC LIMIT 6`),
    q(`SELECT q, COUNT(*) AS n FROM events WHERE day >= ? AND type='whatsapp' GROUP BY q ORDER BY n DESC LIMIT 8`),
  ]);
  return json({ days, since, totals: totals[0], perDay, pages, searches, chosen, programs, sources, devices, countries, whatsapp: wa }, origin);
}

export default {
  async fetch(req, env) {
    const origin = req.headers.get("Origin") || "";
    const { pathname } = new URL(req.url);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
    try {
      if (pathname === "/e" && req.method === "POST") return await collect(req, env, origin);
      if (pathname === "/stats" && req.method === "GET") return await stats(req, env, origin);
      return new Response("Estudiar en Turquía · estadísticas", { headers: cors(origin) });
    } catch (e) {
      return json({ error: "Error del servidor" }, origin, 500);
    }
  },
};
