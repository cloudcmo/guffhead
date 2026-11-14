// The admin page's API (14 Nov 2026): Carl only; rename, keep and delete guests; delete games; regulars untouchable.
// Run under `npx wrangler dev --port 8799` after `npm run db:local`.
import assert from "node:assert/strict";
const BASE = process.env.BASE || "http://127.0.0.1:8799";
async function call(path, { token, method = "GET", body } = {}) {
  const r = await fetch(BASE + path, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, ...(await r.json().catch(() => ({}))) };
}
const login = async (name, pin) => (await call("/api/login", { method: "POST", body: { name, pin } })).token;
const carl = await login("carl", "1234"), nick = await login("nick", "2345");
assert.equal((await call("/api/admin/overview", { token: nick })).status, 403, "Nick can't see the admin page");
assert.equal((await call("/api/me", { token: carl })).me.admin, true);
const jo = await call("/api/walkin", { method: "POST", body: { name: "Jo" } });
assert.ok(jo.token, jo.error);
const g = await call("/api/games", { token: jo.token, method: "POST", body: { players: ["guffbot"] } });
let o = await call("/api/admin/overview", { token: carl });
const row = o.guests.find((x) => x.id === jo.me.id);
assert.ok(row && row.kind === "walk-in" && row.games === 1 && row.due === null, "Jo is listed, safe while her game is live");
assert.ok(o.games.find((x) => x.id === g.game.id).due > o.now, "her game shows when it'll be cleared");
assert.equal((await call("/api/admin/guest", { token: carl, method: "POST", body: { id: jo.me.id, action: "rename", name: "Joanne" } })).name, "Joanne");
const view = await call(`/api/games/${g.game.id}`, { token: jo.token });
assert.equal(view.game.names[jo.me.id], "Joanne", "renamed in her game too");
await call("/api/admin/guest", { token: carl, method: "POST", body: { id: jo.me.id, action: "keep" } });
o = await call("/api/admin/overview", { token: carl });
assert.equal(o.guests.find((x) => x.id === jo.me.id).keep, true);
assert.equal((await call("/api/admin/guest", { token: carl, method: "POST", body: { id: "carl", action: "rename", name: "Bob" } })).status, 400, "regulars can't be changed");
const del = await call("/api/admin/guest", { token: carl, method: "POST", body: { id: jo.me.id, action: "delete" } });
assert.equal(del.games, 1, "her game against GuffBot went with her");
assert.equal((await call("/api/me", { token: jo.token })).status, 401, "her login is gone");
const cg = await call("/api/games", { token: carl, method: "POST", body: { players: ["guffbot"] } });
assert.ok((await call("/api/admin/game", { token: carl, method: "POST", body: { id: cg.game.id, action: "delete" } })).ok);
assert.equal((await call(`/api/games/${cg.game.id}`, { token: carl })).status, 404, "game deleted");
console.log("admin: all checks ok");
// tap a player to deal them in (14 Nov 2026): Carl deals Sam, a walk-in nobody invited; Sam is in and can deal Carl back
const sam = await call("/api/walkin", { method: "POST", body: { name: "Sam" } });
const dealt = await call("/api/admin/deal", { token: carl, method: "POST", body: { id: sam.me.id, bots: [] } });
assert.ok(dealt.game && dealt.game.players.includes(sam.me.id), `Carl deals Sam in: ${dealt.error}`);
assert.ok((await call("/api/games", { token: sam.token })).games.find((x) => x.id === dealt.game.id), "it's in Sam's tables");
assert.ok((await call("/api/me", { token: sam.token })).opponents.find((x) => x.id === "carl"), "Sam can deal Carl back");
assert.equal((await call("/api/admin/deal", { token: nick, method: "POST", body: { id: sam.me.id } })).status, 403, "only Carl");
console.log("admin deal: ok");
