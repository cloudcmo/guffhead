// Guffhead admin (Carl, 14 Nov 2026): who's playing and who isn't, what the nightly clear-out is about to let go,
// and the controls to rename, keep or delete. Carl only. Works on Guffhead's own gh_ tables only: the regulars'
// logins (players, memberships, cg_*) are shared with the other Guff games and are never changed from here.
import { GUEST_CAP } from "./game.js";

const ADMINS = ["carl"];
export const isAdmin = (who) => !!who && ADMINS.includes(who.id);
const DAY = 86400000;
const BOTS = ["guffbot", "msguffbot"];
const isGuest = (id) => /^gh-g-/.test(id);

/** Everything for the admin page in one go. Clear-out dates follow game.js clearOut(): guests 30 days after they were
 *  last seen (never while in a live game, never if kept), guest-only games 14 days after the last move if unfinished,
 *  90 days after the end if finished. */
export async function overview(env) {
  const t = Date.now();
  const [guests, games, gp, regs, invites] = await Promise.all([
    env.DB.prepare(`SELECT id, name, host, created_at, last_seen, COALESCE(keep, 0) AS keep FROM gh_guests ORDER BY COALESCE(last_seen, created_at) DESC`).all(),
    env.DB.prepare(`SELECT id, status, created_at, updated_at, json_extract(state, '$.names') AS names, json_extract(state, '$.loser') AS loser, json_extract(state, '$.players') AS players FROM gh_games ORDER BY updated_at DESC LIMIT 500`).all(),
    env.DB.prepare(`SELECT p.player_id AS pid, COUNT(*) AS games, SUM(g.status = 'playing') AS live, MAX(g.updated_at) AS last FROM gh_game_players p JOIN gh_games g ON g.id = p.game_id GROUP BY p.player_id`).all(),
    env.DB.prepare(`SELECT id, name FROM players WHERE id IN (SELECT DISTINCT player_id FROM gh_game_players WHERE player_id NOT LIKE 'gh-g-%' AND player_id NOT IN ('guffbot', 'msguffbot'))`).all().catch(() => ({ results: [] })),
    env.DB.prepare(`SELECT host, COUNT(*) AS n FROM gh_invites WHERE used_by IS NULL AND created_at > ? GROUP BY host`).bind(t - 7 * DAY).all(),
  ]);
  const play = Object.fromEntries(gp.results.map((r) => [r.pid, r]));
  const inv = Object.fromEntries(invites.results.map((r) => [r.host, r.n]));
  const names = Object.fromEntries([...regs.results.map((r) => [r.id, r.name]), ...guests.results.map((g) => [g.id, g.name]), ["guffbot", "GuffBot"], ["msguffbot", "Ms GuffBot"]]);
  const guestRows = guests.results.map((g) => {
    const p = play[g.id] || {};
    const seen = Math.max(g.last_seen || 0, g.created_at, p.last || 0);
    const due = g.keep || p.live ? null : (g.last_seen || g.created_at) + 30 * DAY;
    return { id: g.id, name: g.name, kind: g.host === "walkin" ? "walk-in" : "invited", by: g.host === "walkin" ? null : (names[g.host] || g.host),
      created: g.created_at, seen, games: p.games || 0, live: p.live || 0, invitesOut: inv[g.id] || 0, keep: !!g.keep, due };
  });
  const regularRows = regs.results.map((r) => { const p = play[r.id] || {}; return { id: r.id, name: r.name, games: p.games || 0, live: p.live || 0, seen: p.last || null }; })
    .sort((a, b) => (b.seen || 0) - (a.seen || 0));
  const gameRows = games.results.map((g) => {
    const players = JSON.parse(g.players || "[]"), nm = JSON.parse(g.names || "{}");
    const regular = players.some((p) => !isGuest(p) && !BOTS.includes(p));
    const due = regular ? null : g.status === "playing" ? g.updated_at + 14 * DAY : g.updated_at + 90 * DAY;
    return { id: g.id, status: g.status, created: g.created_at, updated: g.updated_at, players: players.map((p) => ({ id: p, name: nm[p] || names[p] || p, guest: isGuest(p), bot: BOTS.includes(p) })),
      loser: g.loser ? (nm[g.loser] || g.loser) : null, due };
  });
  return { now: t, cap: GUEST_CAP, seats: guestRows.length, guests: guestRows, regulars: regularRows, games: gameRows };
}

async function deleteGames(env, ids) {
  for (let i = 0; i < ids.length; i += 90) {
    const part = ids.slice(i, i + 90), q = part.map(() => "?").join(",");
    await env.DB.batch(["gh_chat", "gh_seen", "gh_doing", "gh_game_players", "gh_results"].map((tb) => env.DB.prepare(`DELETE FROM ${tb} WHERE game_id IN (${q})`).bind(...part))
      .concat([env.DB.prepare(`DELETE FROM gh_games WHERE id IN (${q})`).bind(...part)]));
  }
}

/** Rename, keep (the clear-out leaves them alone), let go again, or delete a guest. */
export async function guestAction(env, b) {
  const id = String(b.id || "");
  if (!isGuest(id)) throw new Error("Only guests can be changed here. The regulars' logins belong to all the Guff games.");
  const g = await env.DB.prepare(`SELECT id, name FROM gh_guests WHERE id = ?`).bind(id).first();
  if (!g) throw new Error("No such guest");
  if (b.action === "rename") {
    const name = String(b.name || "").replace(/\s+/g, " ").trim();
    if (!/^[\p{L}][\p{L} '\-]{0,18}[\p{L}]$/u.test(name)) throw new Error("A first name, 2 to 20 letters");
    await env.DB.batch([
      env.DB.prepare(`UPDATE gh_guests SET name = ? WHERE id = ?`).bind(name, id),
      // their name as their games show it, too
      env.DB.prepare(`UPDATE gh_games SET state = json_set(state, '$.names."${id}"', ?) WHERE id IN (SELECT game_id FROM gh_game_players WHERE player_id = ?)`).bind(name, id),
    ]);
    return { ok: true, name };
  }
  if (b.action === "keep" || b.action === "unkeep") {
    await env.DB.prepare(`UPDATE gh_guests SET keep = ? WHERE id = ?`).bind(b.action === "keep" ? 1 : 0, id).run();
    return { ok: true };
  }
  if (b.action === "delete") {
    // their games with nobody else real in them go too; games with other people stay (their name stays on them)
    const solo = await env.DB.prepare(`SELECT p.game_id AS id FROM gh_game_players p WHERE p.player_id = ?
        AND NOT EXISTS (SELECT 1 FROM gh_game_players o WHERE o.game_id = p.game_id AND o.player_id <> ? AND o.player_id NOT IN ('guffbot', 'msguffbot'))`).bind(id, id).all();
    await deleteGames(env, solo.results.map((r) => r.id));
    await env.DB.batch([
      env.DB.prepare(`DELETE FROM gh_sessions WHERE player_id = ?`).bind(id),
      env.DB.prepare(`DELETE FROM gh_push WHERE player_id = ?`).bind(id),
      env.DB.prepare(`DELETE FROM gh_prefs WHERE player_id = ?`).bind(id),
      env.DB.prepare(`DELETE FROM gh_invites WHERE host = ? AND used_by IS NULL`).bind(id),
      env.DB.prepare(`DELETE FROM gh_guests WHERE id = ?`).bind(id),
    ]);
    return { ok: true, games: solo.results.length };
  }
  throw new Error("Rename, keep, unkeep or delete");
}

/** Delete a game outright. */
export async function gameAction(env, b) {
  const id = String(b.id || "");
  if (!/^[a-z0-9]{6}$/.test(id)) throw new Error("No such game");
  if (b.action !== "delete") throw new Error("Delete is the only thing to do to a game here");
  await deleteGames(env, [id]);
  return { ok: true };
}
