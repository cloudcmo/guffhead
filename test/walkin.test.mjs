// Guffhead open to anyone (14 Nov 2026): walk-ins, invites between guests, the per-connection limit, no links in
// guest chat, the 200 cap, and the nightly clear-out. Run under
//   npx wrangler dev --port 8799 --test-scheduled --var CLEAROUT_ANYTIME:1   (after `npm run db:local`)
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
const BASE = process.env.BASE || "http://127.0.0.1:8799";
async function call(path, { token, method = "GET", body } = {}) {
  const r = await fetch(BASE + path, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, ...j };
}
const sql = (q) => JSON.parse(execSync(`npx wrangler d1 execute wwg --local --json --command ${JSON.stringify(q)}`, { stdio: ["ignore", "pipe", "ignore"] }).toString())[0].results;
sql("DELETE FROM gh_guests"); sql("DELETE FROM gh_sessions WHERE player_id LIKE 'gh-g-%'");

assert.equal((await call("/api/door")).open, true, "the door is open");
assert.equal((await call("/api/walkin", { method: "POST", body: { name: "Shitface" } })).status, 400, "rude names refused");
assert.equal((await call("/api/walkin", { method: "POST", body: { name: "x" } })).status, 400, "one letter refused");
const jo = await call("/api/walkin", { method: "POST", body: { name: "Jo" } });
assert.ok(jo.token, `Jo walks in: ${jo.error}`);
const meJo = await call("/api/me", { token: jo.token });
assert.equal(meJo.me.walkin, true); assert.deepEqual(meJo.opponents, []);
const g1 = await call("/api/games", { token: jo.token, method: "POST", body: { players: ["guffbot"] } });
assert.ok(g1.game, `Jo deals against GuffBot: ${g1.error}`);
assert.equal((await call("/api/games", { token: jo.token, method: "POST", body: { players: ["carl"] } })).status, 400, "a walk-in can't pick the regulars");
const inv = await call("/api/invites", { token: jo.token, method: "POST", body: { players: [] } });
assert.ok(inv.code, `Jo makes an invite: ${inv.error}`);
const sam = await call(`/api/invites/${inv.code}/join`, { method: "POST", body: { name: "Sam" } });
assert.ok(sam.token && sam.game, `Sam joins Jo's invite: ${sam.error}`);
assert.ok((await call("/api/me", { token: sam.token })).opponents.find((o) => o.id === jo.me.id), "Sam can play Jo");
assert.ok((await call("/api/me", { token: jo.token })).opponents.find((o) => o.id === sam.me.id), "Jo can play Sam");
const chat = await call(`/api/games/${sam.game}/chat`, { token: sam.token, method: "POST", body: { text: "cheap pills at www.spam.com" } });
assert.equal(chat.status, 400, "no links from guests");
assert.equal((await call(`/api/games/${sam.game}/chat`, { token: sam.token, method: "POST", body: { text: "Your go, Jo 😂" } })).ok, true, "plain chat is fine");
const third = await call("/api/walkin", { method: "POST", body: { name: "Pat" } });
assert.ok(third.token, "a third seat from one connection is fine");
assert.equal((await call("/api/walkin", { method: "POST", body: { name: "Lou" } })).status, 429, "a fourth in a day isn't");
// the cap
sql("UPDATE gh_guests SET ip_hash = 'old'");
const values = Array.from({ length: 197 }, (_, i) => `('gh-g-fill${i}', 'Fill', 'walkin', ${Date.now()}, ${Date.now()}, 'x${i}')`).join(",");
sql(`INSERT INTO gh_guests (id, name, host, created_at, last_seen, ip_hash) VALUES ${values}`);
assert.equal((await call("/api/door")).open, false, "full at 200");
assert.equal((await call("/api/walkin", { method: "POST", body: { name: "Lou" } })).status, 403, "no seat when full");
// the clear-out: the fillers and Pat haven't been seen for 31 days; Jo has a live game but it's gone quiet for 15
const old = Date.now() - 31 * 86400000;
sql(`UPDATE gh_guests SET last_seen = ${old}, created_at = ${old} WHERE id LIKE 'gh-g-fill%' OR id = '${third.me.id}'`);
sql(`UPDATE gh_games SET updated_at = ${Date.now() - 15 * 86400000} WHERE id = '${g1.game.id}'`);
const carlGames = sql("SELECT COUNT(*) AS n FROM gh_games g JOIN gh_game_players p ON p.game_id = g.id WHERE p.player_id = 'carl'")[0].n;
await fetch(`${BASE}/__scheduled?cron=*/15+*+*+*+*`);
await new Promise((r) => setTimeout(r, 1500));
assert.equal(sql("SELECT COUNT(*) AS n FROM gh_guests")[0].n, 2, "only Jo and Sam are left");
assert.equal(sql(`SELECT COUNT(*) AS n FROM gh_games WHERE id = '${g1.game.id}'`)[0].n, 0, "Jo's abandoned game against GuffBot is gone");
assert.equal(sql(`SELECT COUNT(*) AS n FROM gh_games WHERE id = '${sam.game}'`)[0].n, 1, "Jo and Sam's live game stays");
assert.equal(sql("SELECT COUNT(*) AS n FROM gh_games g JOIN gh_game_players p ON p.game_id = g.id WHERE p.player_id = 'carl'")[0].n, carlGames, "the regulars' games are untouched");
assert.equal((await call("/api/me", { token: third.token })).status, 401, "Pat's old login is gone");
assert.equal((await call("/api/door")).open, true, "seats free again");
console.log("walk-ins: all checks ok");
