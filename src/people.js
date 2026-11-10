// Guffhead: who can log in and who can play whom. Everything here is READ from tables that belong to Words and
// Guff (players, memberships) and CountGuff (cg_players, cg_links, cg_avatars), so a player has one name, one PIN
// and one face across every Guff game (Carl, 6 Oct and 6 Nov 2026). Carl, Nick, Steve and Kate log in to Guffhead
// with the names and PINs they already use. Guffhead never writes to any of these tables; its own are prefixed gh_.

export async function sha256(s) {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
export function randomToken(n = 24) {
  const a = new Uint8Array(n); crypto.getRandomValues(a);
  return [...a].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** A player by id, from Words and Guff's players or CountGuff's invitees: { id, name, pin_hash, isAdmin } or null. */
export async function findPlayer(env, id) {
  const w = await env.DB.prepare(`SELECT id, name, pin_hash, is_admin FROM players WHERE id = ?`).bind(id).first();
  if (w) return { id: w.id, name: w.name, pin_hash: w.pin_hash, isAdmin: !!w.is_admin || w.id === "carl" };
  try {
    const c = await env.DB.prepare(`SELECT id, name, pin_hash FROM cg_players WHERE id = ?`).bind(id).first();
    if (c) return { id: c.id, name: c.name, pin_hash: c.pin_hash, isAdmin: false };
  } catch { /* no CountGuff tables (a fresh local database) */ }
  return null;
}

async function namesFor(env, ids) {
  const uniq = [...new Set(ids)].filter(Boolean);
  const out = Object.fromEntries(uniq.map((id) => [id, id]));
  if (!uniq.length) return out;
  const q = uniq.map(() => "?").join(",");
  for (const table of ["players", "cg_players"]) {
    try {
      const r = await env.DB.prepare(`SELECT id, name FROM ${table} WHERE id IN (${q})`).bind(...uniq).all();
      for (const p of r.results) out[p.id] = p.name;
    } catch {}
  }
  return out;
}

/** Everyone a player may start a game with, as in CountGuff: league-mates in Words and Guff, plus CountGuff's links. */
export async function opponentsOf(env, pid) {
  const ids = new Set();
  const league = await env.DB.prepare(
    `SELECT DISTINCT p.id FROM memberships m1
       JOIN memberships m2 ON m2.league_id = m1.league_id AND m2.player_id <> m1.player_id
       JOIN players p ON p.id = m2.player_id
      WHERE m1.player_id = ? AND p.pin_hash IS NOT NULL AND p.id NOT LIKE 'guest-%' AND p.id <> 'guffbot'`,
  ).bind(pid).all();
  for (const r of league.results) ids.add(r.id);
  try {
    const links = await env.DB.prepare(`SELECT a, b FROM cg_links WHERE a = ? OR b = ?`).bind(pid, pid).all();
    for (const r of links.results) ids.add(r.a === pid ? r.b : r.a);
  } catch {}
  ids.delete(pid);
  const names = await namesFor(env, [...ids]);
  return [...ids].map((id) => ({ id, name: names[id] })).sort((x, y) => x.name.localeCompare(y.name));
}

/** The faces everyone chose in CountGuff (cg_avatars): { id: look }. Anyone without one gets their starter or a seeded face. */
export async function looksFor(env, ids) {
  const uniq = [...new Set(ids)].filter(Boolean);
  const out = {};
  if (!uniq.length) return out;
  const q = uniq.map(() => "?").join(",");
  try {
    const r = await env.DB.prepare(`SELECT player_id, look FROM cg_avatars WHERE player_id IN (${q})`).bind(...uniq).all();
    for (const p of r.results) { try { out[p.player_id] = JSON.parse(p.look); } catch {} }
  } catch {}
  return out;
}
