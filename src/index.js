/**
 * Guffhead: the Worker. guffhead.carlosfandango.net
 *
 * The card game with the rude name, played in the back room of The Guff's Head. Logins are Words and Guff's
 * (one name and PIN across every Guff game), faces are CountGuff's, and the tables are Guffhead's own (gh_, in
 * the wwg database).
 *
 *   POST /api/login                { name, pin, league? } -> { token, me }
 *   POST /api/logout
 *   GET  /api/me                   { me, opponents, house, games, looks, push, build }
 *   GET  /api/games                my games
 *   POST /api/games                { players: [...], settings } -> a new table
 *   GET  /api/games/:id?since=&here=1   the game as I may see it, events after `since`, who's at the table
 *   POST /api/games/:id/act        { act: setup | ready | play | pickup | flip | resign, up?, cards?, index?, seq? }
 *   POST /api/games/:id/again      same people, same house rules
 *   POST /api/games/:id/chat       { text }
 *   GET  /api/record               every finished game I was in
 *   GET  /api/league               the Guffhead league: 💩 counts (only losing scores)
 *   GET  /api/logbook              finished games between people in my circle
 *   POST /api/games/:id/nudge      a tap on the shoulder for whoever's keeping us waiting (after 2 hours)
 *   POST /api/dress                { dress: lads | ladies | any }   what you wear down the pub
 *   GET  /api/push/key, POST /api/push/subscribe, /api/push/unsubscribe, /api/push/test
 *   POST /api/invites              { players: [bots], settings } -> { code, url }: a link anyone can use to play you
 *   GET  /api/invites/:code        (no login) who's asking, the house rules, open | used | expired
 *   POST /api/invites/:code/join   { name } (no login: a guest is made) or logged in -> { token?, me?, game }
 *   GET  /api/health
 *
 * The cron (wrangler.toml) runs the idle timer: GuffBot plays the go of anyone who's left it too long.
 */

import { createGame, getGame, act, again, listGames, viewFor, record, league, seen, presence, hereNow, notify, lazyAutopilot, sweep, nudge, doing, doingAt, logbook, goodNews, makeInvite, inviteInfo, joinInvite, newGuest, Refusal } from "./game.js";
import { BOTS } from "../public/bot.js";
import { DEFAULTS } from "../public/rules.js";
import { sha256, randomToken, findPlayer, opponentsOf, looksFor, setDress } from "./people.js";
import { pushConfigured, sendPush } from "./push.js";

import { BUILD, NOTE as BUILD_NOTE } from "../public/build.js";

const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
const err = (message, status = 400) => json({ error: message }, status);
async function body(request) { try { return await request.json(); } catch { return null; } }

async function me(request, env) {
  const auth = request.headers.get("Authorization") || "";
  const t = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (t.length < 32) return null;
  const s = await env.DB.prepare(`SELECT player_id FROM gh_sessions WHERE token = ?`).bind(t).first();
  if (!s) return null;
  const p = await findPlayer(env, s.player_id);
  return p ? { id: p.id, name: p.name, isAdmin: p.isAdmin, guest: !!p.guest, host: p.host || null, token: t } : null;
}
const hostNameOf = (env) => async (id) => { const p = await findPlayer(env, id); return p ? p.name : id; };

async function login(request, env) {
  const b = await body(request);
  if (!b) return err("Bad request");
  const name = String(b.name || "").trim().toLowerCase();
  const pin = String(b.pin || "").trim();
  const code = String(b.league || "").trim().toUpperCase();
  if (!/^[a-z]{2,20}$/.test(name) || !/^\d{4,8}$/.test(pin)) return err("Enter your name and PIN");
  if (code && !/^[A-Z0-9]{2,12}$/.test(code)) return err("That league code doesn't look right");
  const id = !code || code === "GUFF" ? name : `${code.toLowerCase()}-${name}`;   // as Words and Guff does it
  const p = await findPlayer(env, id);
  if (!p || !p.pin_hash || (await sha256(`${id}:${pin}`)) !== p.pin_hash) return err(code ? "League code, name or PIN not recognised" : "Name or PIN not recognised", 401);
  const t = randomToken();
  await env.DB.prepare(`INSERT INTO gh_sessions (token, player_id, created_at) VALUES (?, ?, ?)`).bind(t, p.id, Date.now()).run();
  return json({ token: t, me: { id: p.id, name: p.name, isAdmin: p.isAdmin } });
}

const HOUSE = Object.values(BOTS).map((b) => ({ id: b.id, name: b.name, blurb: b.blurb }));

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    if (!path.startsWith("/api/")) {
      const res = await env.ASSETS.fetch(request);
      if (!/\.(html|js|css|webmanifest)$/.test(path) && path !== "/") return res;
      const out = new Response(res.body, res);
      out.headers.set("Cache-Control", "no-cache");   // a deploy is picked up at once
      return out;
    }
    const t0 = Date.now();
    let res;
    try {
      res = await api(request, env, ctx, path, url);
    } catch (e) {
      if (e instanceof Refusal) res = err(e.message, e.status);
      else { console.error(e); res = err("Something went wrong on the server", 500); }
    }
    const ms = Date.now() - t0;
    if (res.status >= 500 || ms > 800) console.log(JSON.stringify({ method: request.method, path, status: res.status, ms, build: BUILD }));
    return res;
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(sweep(env).then((n) => { if (n) console.log(`idle timer: GuffBot played ${n} go(es)`); }));
  },
};

const later = (ctx, p) => { if (ctx && ctx.waitUntil) ctx.waitUntil(p.catch((e) => console.error("after", e))); else return p; };

async function api(request, env, ctx, path, url) {
  const m = request.method;
  if (path === "/api/health") return json({ ok: true, build: BUILD, note: BUILD_NOTE, push: pushConfigured(env) });
  if (path === "/api/login" && m === "POST") return login(request, env);

  // invites work without a login: whoever opens the link is asked their name
  let mi = path.match(/^\/api\/invites\/([a-z0-9]{8})$/);
  if (mi && m === "GET") { const { out } = await inviteInfo(env, mi[1], hostNameOf(env)); return json({ invite: out }); }
  mi = path.match(/^\/api\/invites\/([a-z0-9]{8})\/join$/);
  if (mi && m === "POST") {
    let joiner = await me(request, env);
    let token = null;
    if (!joiner) {
      const b = (await body(request)) || {};
      const name = String(b.name || "").replace(/\s+/g, " ").trim();
      if (!/^[\p{L}][\p{L} '\-]{0,18}[\p{L}]$/u.test(name)) return err("Just your first name, please (2 to 20 letters)");
      const { inv, status } = await inviteInfo(env, mi[1], hostNameOf(env));
      if (status !== "open") return err(status === "used" ? "That invite's been used. Ask for a new one." : "That invite has run out (they last a week). Ask for a new one.");
      joiner = await newGuest(env, name, inv.host);
      token = randomToken();
      await env.DB.prepare(`INSERT INTO gh_sessions (token, player_id, created_at) VALUES (?, ?, ?)`).bind(token, joiner.id, Date.now()).run();
    }
    const r = await joinInvite(env, mi[1], joiner, hostNameOf(env));
    if (r.st) later(ctx, notify(env, r.st, { status: "playing", required: [joiner.id] }));
    return json({ game: r.game, token, me: token ? { id: joiner.id, name: joiner.name, guest: true, host: joiner.host, hostName: await hostNameOf(env)(joiner.host) } : undefined });
  }

  const who = await me(request, env);
  if (!who) return err("Please log in", 401);

  if (path === "/api/logout" && m === "POST") {
    await env.DB.prepare(`DELETE FROM gh_sessions WHERE token = ?`).bind(who.token).run();
    return json({ ok: true });
  }
  if (path === "/api/me" && m === "GET") {
    const opponents = await opponentsOf(env, who.id);
    const games = await listGames(env, who);
    const ids = [who.id, ...opponents.map((o) => o.id), ...games.flatMap((g) => g.players)];
    const lg = await league(env, who, opponents);
    const news = await goodNews(env, who).catch(() => []);
    return json({ league: lg, news, me: { id: who.id, name: who.name, isAdmin: who.isAdmin, guest: who.guest, host: who.host, hostName: who.host ? await hostNameOf(env)(who.host) : null }, opponents, house: HOUSE, games, looks: await looksFor(env, ids), defaults: DEFAULTS, push: pushConfigured(env), build: BUILD, note: BUILD_NOTE });
  }
  if (path === "/api/games" && m === "GET") return json({ build: BUILD, games: await listGames(env, who) });
  if (path === "/api/games" && m === "POST") {
    const st = await createGame(env, who, await body(request), opponentsOf);
    later(ctx, notify(env, st, { status: "playing", required: [who.id] }));
    return json({ game: viewFor(st, who.id) });
  }
  if (path === "/api/dress" && m === "POST") {
    const b = (await body(request)) || {};
    if (!(await setDress(env, who.id, b.dress))) return json({ error: "Lads, ladies or surprise me." }, 400);
    return json({ ok: true, dress: b.dress });
  }
  if (path === "/api/record" && m === "GET") return json({ record: await record(env, who) });
  if (path === "/api/invites" && m === "POST") {
    const r = await makeInvite(env, who, await body(request));
    return json({ ...r, url: `${url.origin}/#/join/${r.code}` });
  }
  if (path === "/api/logbook" && m === "GET") {
    const circle = await opponentsOf(env, who.id);
    const games = await logbook(env, who, circle);
    const names = Object.fromEntries([[who.id, who.name], ...circle.map((c) => [c.id, c.name]), ...HOUSE.map((h) => [h.id, h.name])]);
    return json({ games, names, circle, looks: await looksFor(env, [who.id, ...circle.map((c) => c.id)]) });
  }
  if (path === "/api/league" && m === "GET") {
    const circle = await opponentsOf(env, who.id);
    const lg = await league(env, who, circle);
    return json({ ...lg, looks: await looksFor(env, lg.table.map((x) => x.id)) });
  }

  let mm = path.match(/^\/api\/games\/([a-z0-9]{6})$/);
  if (mm && m === "GET") {
    const st = await getGame(env, who, mm[1], opponentsOf);
    const player = st.players.includes(who.id);
    const here = player && url.searchParams.get("here");
    const what = url.searchParams.get("doing");
    if (player && (what === "looking" || what === "picking")) await doing(env, st.id, who.id, what);
    // the phone says it's at the table (every few seconds while it's open): that's presence and "seen" in one
    if (here) await seen(env, st.id, who.id, st.g.seq);
    const before = await lazyAutopilot(env, st, here ? who.id : null);
    if (before) later(ctx, notify(env, st, before));
    const since = Math.max(0, Number(url.searchParams.get("since") || 0));
    const chatSince = Math.max(0, Number(url.searchParams.get("chat") || 0));
    if (here && before) await seen(env, st.id, who.id, st.g.seq);
    const [pres, chat, busy] = await Promise.all([
      presence(env, st.id),
      player ? env.DB.prepare(`SELECT id, player_id, text, created_at FROM gh_chat WHERE game_id = ? AND id > ? ORDER BY id DESC LIMIT 80`).bind(st.id, chatSince).all() : { results: [] },
      doingAt(env, st.id),
    ]);
    delete busy[who.id];
    return json({ build: BUILD, note: BUILD_NOTE, game: viewFor(st, who.id, since), here: hereNow(pres).filter((p) => p !== who.id), doing: busy, chat: chat.results.reverse(), looks: since ? undefined : await looksFor(env, st.players) });
  }
  mm = path.match(/^\/api\/games\/([a-z0-9]{6})\/act$/);
  if (mm && m === "POST") {
    const b = await body(request);
    const { st, before } = await act(env, who, mm[1], b);
    await seen(env, st.id, who.id, st.g.seq);
    later(ctx, notify(env, st, before));
    return json({ game: viewFor(st, who.id, Math.max(0, Number((b && b.since) || 0))) });
  }
  mm = path.match(/^\/api\/games\/([a-z0-9]{6})\/nudge$/);
  if (mm && m === "POST") { const st = await nudge(env, who, mm[1]); return json({ ok: true, nudged: st.nudged }); }
  mm = path.match(/^\/api\/games\/([a-z0-9]{6})\/again$/);
  if (mm && m === "POST") {
    const r = await again(env, who, mm[1], opponentsOf);
    if (r.st) later(ctx, notify(env, r.st, { status: "playing", required: [] }));
    return json({ id: r.id, existing: r.existing });
  }
  mm = path.match(/^\/api\/games\/([a-z0-9]{6})\/chat$/);
  if (mm && m === "POST") {
    const st = await getGame(env, who, mm[1]);
    const text = String(((await body(request)) || {}).text || "").replace(/\s+/g, " ").trim().slice(0, 280);
    if (!text) return err("Say something");
    if (st.players.filter((p) => !st.bots.includes(p)).length < 2) return err("The house doesn't chat. It's concentrating.");
    await env.DB.prepare(`INSERT INTO gh_chat (game_id, player_id, text, created_at) VALUES (?, ?, ?, ?)`).bind(mm[1], who.id, text, Date.now()).run();
    return json({ ok: true });
  }

  /* ---------- notifications ---------- */
  if (path === "/api/push/key" && m === "GET") return json({ key: pushConfigured(env) ? env.VAPID_PUBLIC_KEY : null });
  if (path === "/api/push/subscribe" && m === "POST") {
    const b = await body(request);
    const s = b && b.subscription;
    if (!s || !s.endpoint || !s.keys || !s.keys.p256dh || !s.keys.auth || !/^https:\/\//.test(s.endpoint)) return err("That subscription doesn't look right");
    await env.DB.prepare(
      `INSERT INTO gh_push (player_id, endpoint, p256dh, auth, ua, created_at) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(endpoint) DO UPDATE SET player_id = excluded.player_id, p256dh = excluded.p256dh, auth = excluded.auth, ua = excluded.ua`,
    ).bind(who.id, s.endpoint, s.keys.p256dh, s.keys.auth, String(b.ua || "").slice(0, 200), Date.now()).run();
    return json({ ok: true });
  }
  if (path === "/api/push/unsubscribe" && m === "POST") {
    const b = await body(request);
    await env.DB.prepare(`DELETE FROM gh_push WHERE endpoint = ? AND player_id = ?`).bind(String((b && b.endpoint) || ""), who.id).run();
    return json({ ok: true });
  }
  if (path === "/api/push/test" && m === "POST") {
    if (!pushConfigured(env)) return json({ sent: 0, why: "The server has no notification keys set." });
    const rows = await env.DB.prepare(`SELECT endpoint, p256dh, auth FROM gh_push WHERE player_id = ?`).bind(who.id).all();
    let sent = 0;
    for (const r of rows.results) { const s = await sendPush(env, { endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } }, { title: "Guffhead", body: "Testing, testing. Pam says the notifications work.", url: "/", tag: "gh-test" }); if (s >= 200 && s < 300) sent++; }
    return json({ sent, why: sent ? null : rows.results.length ? `The push service said: ${sendPush.lastReason || "no"}` : "This device isn't signed up. Turn notifications off and on again." });
  }
  return err("Not found", 404);
}
