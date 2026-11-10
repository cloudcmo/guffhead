// Guffhead: the tables. Two to four players, any of them GuffBot or Ms GuffBot, at their own pace.
//
// The whole game lives in one JSON column (gh_games.state). Every action loads it, checks it against the rules
// (public/rules.js), changes it, then lets the game run on by itself as far as it can: the house takes its goes
// at once, and any move with no real choice in it is made for you (Carl, 10 Nov 2026). Then it's saved with a
// version check so two phones can't both move at once. The shuffle happens here, never on a phone.
//
// The five things that keep an async card game from feeling stilted (Carl's go-ahead, 10 Nov 2026):
//   1. forced moves are played for you (rules.forcedMove)
//   2. GuffBot and Ms GuffBot fill seats and play instantly (runHouse)
//   3. everything is an event, so a phone can replay what happened since you last looked
//   4. live play when two of you are at the table at once (gh_seen: who's looking, polled fast by the page)
//   5. the idle timer: leave your go too long and GuffBot plays it for you (autopilot, here and on the cron)

import * as R from "../public/rules.js";
import { BOTS, isBot, choose, chooseUp, hint } from "../public/bot.js";
import { describe } from "../public/lines.js";
import { notifyPlayers } from "./push.js";

export class Refusal extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
const no = (m, s) => { throw new Refusal(m, s); };
const now = () => Date.now();

/* crypto shuffle: no phone ever deals */
export function rnd() { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] / 4294967296; }
const newId = () => { const c = "abcdefghjkmnpqrstuvwxyz23456789"; const a = new Uint8Array(6); crypto.getRandomValues(a); return [...a].map((x) => c[x % c.length]).join(""); };

export const PRESENT_MS = 25000;     // seen at the table this recently = here (live play, no notification)

/* ---------- making a table ---------- */

export function newTable(players, names, settings, rand = rnd) {
  const g = R.newGame(players, settings, rand);
  const t = now();
  return { v: 1, players, names, bots: players.filter(isBot), settings: g.settings, g, status: "playing", created: t, updated: t, lastAct: t };
}

/** Everyone the table is waiting on. */
export function required(st) {
  if (st.status !== "playing") return [];
  const g = st.g;
  if (g.phase === "swap") return g.seats.filter((p) => !p.ready).map((p) => p.id);
  if (g.phase === "play") return [g.seats[g.turn].id];
  return [];
}

/**
 * Let the game run on: the house plays, and forced moves are made, until someone has a real decision.
 * present: who's at the table right now. Their forced moves are left for them to make themselves (Carl, 10 Nov
 * 2026: "if I am live in the game, do not auto-play for me even if I have only one option"); st.held marks one
 * waiting, so it can be played for them once they've gone (settleHeld, and the cron).
 */
export function runHouse(st, rand = rnd, present = new Set()) {
  const g = st.g;
  delete st.held;
  for (let guard = 0; guard < 3000 && st.status === "playing"; guard++) {
    if (g.phase === "swap") {
      const bots = g.seats.filter((p) => !p.ready && isBot(p.id));
      if (!bots.length) return;
      for (const p of bots) { R.setUp(g, p.id, chooseUp([...p.hand, ...p.up], g.settings)); R.ready(g, p.id); }
      continue;
    }
    if (g.phase === "play") {
      const id = g.seats[g.turn].id;
      if (isBot(id)) { R.perform(g, id, choose(g, id, rand)); continue; }
      const f = R.forcedMove(g);
      if (f && present.has(id)) { st.held = id; return; }
      if (f) { R.perform(g, id, f, { forced: true }); continue; }
      return;
    }
    if (g.phase === "over") { finish(st); return; }
    return;
  }
}

function finish(st) {
  if (st.status === "finished") return;
  st.status = "finished";
  st.loser = st.g.loser;
  st.finished = now();
}

/**
 * The idle timer: if the table has waited on someone longer than this game's limit, GuffBot (with Ms GuffBot's
 * brain, so nobody's punished for being busy) plays that one go for them. Returns who was played for.
 */
export function autopilot(st, t = now(), rand = rnd, present = new Set()) {
  const h = st.settings.idleHours;
  if (st.status !== "playing" || !h || t - st.lastAct < h * 3600000) return [];
  const g = st.g;
  const who = required(st).filter((p) => !isBot(p));
  if (!who.length) return [];
  if (g.phase === "swap") {
    for (const id of who) {
      const p = g.seats[R.seatOf(g, id)];
      R.setUp(g, id, chooseUp([...p.hand, ...p.up], g.settings));
      R.ready(g, id);
      const e = g.events.findLast((x) => x.k === "ready" && x.p === id);
      if (e) e.autopilot = 1;
    }
  } else if (g.phase === "play") {
    const id = who[0];
    R.perform(g, id, choose(g, "msguffbot", rand), { autopilot: true });
  }
  runHouse(st, rand, present);
  st.lastAct = t;
  return who;
}

/* ---------- doing something ---------- */

/** { act: setup | ready | play | pickup | flip | resign, up?, cards?, index?, seq? } */
export function perform(st, pid, body, rand = rnd, present = new Set([pid])) {
  if (st.status !== "playing") no("This one's finished");
  if (!st.players.includes(pid)) no("You're not at this table", 403);
  const g = st.g;
  const a = String((body && body.act) || "");
  try {
    if (a === "setup") R.setUp(g, pid, body.up);
    else if (a === "ready") { if (Array.isArray(body.up)) R.setUp(g, pid, body.up); R.ready(g, pid); }
    else if (a === "resign") R.resign(g, pid);
    else if (a === "play" || a === "pickup" || a === "flip") {
      if (body.seq != null && Number(body.seq) !== g.seq) no("Things have moved on. Have another look.", 409);
      R.perform(g, pid, { act: a, cards: body.cards, index: body.index });
    } else no("Play, pick up or flip");
  } catch (e) {
    if (e instanceof Refusal) throw e;
    no(e.message);
  }
  if (a !== "setup") st.lastAct = now();
  runHouse(st, rand, present);
  if (g.phase === "over") finish(st);
  return st;
}

/* ---------- what a player sees ---------- */

export function viewFor(st, pid, since = 0) {
  const g = R.viewFor(st.g, pid);
  g.events = g.events.filter((e) => e.seq > since);
  const req = required(st);
  const myGo = req.includes(pid);
  const out = {
    id: st.id, by: st.by, players: st.players, names: st.names, bots: st.bots, settings: st.settings, status: st.status,
    loser: st.loser || null, reigning: st.reigning || null, wearer: wearer(st), created: st.created, updated: st.updated, lastAct: st.lastAct, prev: st.prev || null, next: st.next || null,
    me: pid, required: req, myGo, g,
  };
  if (myGo && st.g.phase === "play") { out.options = R.options(st.g); out.hint = hint(st.g, pid); }
  if (st.g.phase === "swap") {
    const p = st.g.seats[R.seatOf(st.g, pid)];
    if (p) out.six = sortSix([...p.hand, ...p.up], st.settings);
  }
  return out;
}
const sortSix = (cs, s) => R.sortCards(cs, s);

/** One line for the lobby. */
export function summary(st, pid) {
  const g = st.g;
  const last = [...g.events].reverse().find((e) => ["play", "pickup", "flip", "out", "over"].includes(e.k));
  const names = { ...st.names, [pid]: "You" };
  return {
    id: st.id, status: st.status, players: st.players, names: st.names, opps: st.players.filter((p) => p !== pid),
    myGo: required(st).includes(pid), required: required(st), phase: g.phase, loser: st.loser || null, wearer: wearer(st),
    practice: st.bots.length > 0, bots: st.bots, updated: st.updated, finished: st.finished || null, seq: g.seq,
    left: Object.fromEntries(g.seats.map((p) => [p.id, R.cardsLeft(p)])),
    last: last ? describe(last, names, pid) : null,
  };
}

/* ---------- storage ---------- */

async function load(env, id) {
  const row = await env.DB.prepare(`SELECT state, ver FROM gh_games WHERE id = ?`).bind(id).first();
  if (!row) no("No such game", 404);
  const st = JSON.parse(row.state);
  st._ver = row.ver;
  return st;
}

export async function save(env, st, isNew = false) {
  st.updated = now();
  const ver = st._ver || 0;
  delete st._ver;
  const recordIt = st.status === "finished" && !st._recorded;
  if (recordIt) st._recorded = true;
  const json = JSON.stringify(st);
  const req = required(st).join(",");
  const stmts = [];
  if (isNew) {
    stmts.push(env.DB.prepare(`INSERT INTO gh_games (id, status, turn, state, ver, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?)`).bind(st.id, st.status, req, json, st.created, st.updated));
    st.players.forEach((p, i) => stmts.push(env.DB.prepare(`INSERT INTO gh_game_players (game_id, player_id, seat) VALUES (?, ?, ?)`).bind(st.id, p, i)));
  } else {
    stmts.push(env.DB.prepare(`UPDATE gh_games SET status = ?, turn = ?, state = ?, ver = ver + 1, updated_at = ? WHERE id = ? AND ver = ?`).bind(st.status, req, json, st.updated, st.id, ver));
  }
  if (recordIt) {
    stmts.push(env.DB.prepare(`INSERT OR IGNORE INTO gh_results (game_id, players, loser, practice, detail, finished_at) VALUES (?, ?, ?, ?, ?, ?)`).bind(
      st.id, st.players.join(","), st.loser || null, st.bots.length ? 1 : 0,
      JSON.stringify({ order: st.g.finished, turns: st.g.turns, burns: st.g.burns, settings: st.settings, resigned: st.g.events.some((e) => e.k === "over" && e.resigned) }),
      st.finished || now()));
  }
  const res = await env.DB.batch(stmts);
  if (!isNew && !(res[0].meta && res[0].meta.changes)) no("Someone else moved at the same moment. Have another look.", 409);
  st._ver = ver + 1;
  return st;
}

/* ---------- who's at the table, who's been told ---------- */

/** A player has looked at the game (and, with here, is sitting at it now). */
export async function seen(env, gameId, pid, seq) {
  await env.DB.prepare(
    `INSERT INTO gh_seen (game_id, player_id, seq, seen_at, pushed_seq) VALUES (?, ?, ?, ?, 0)
     ON CONFLICT(game_id, player_id) DO UPDATE SET seq = MAX(gh_seen.seq, excluded.seq), seen_at = excluded.seen_at`,
  ).bind(gameId, pid, seq, now()).run();
}
export async function presence(env, gameId) {
  const r = await env.DB.prepare(`SELECT player_id, seq, seen_at, pushed_seq FROM gh_seen WHERE game_id = ?`).bind(gameId).all();
  return Object.fromEntries(r.results.map((x) => [x.player_id, x]));
}
export const hereNow = (pres) => Object.values(pres).filter((x) => now() - x.seen_at < PRESENT_MS).map((x) => x.player_id);

/**
 * Notifications, kept for when they matter (Carl, 10 Nov 2026): your go, once, until you've looked (however many
 * goes pass meanwhile), with the most notable thing that happened in it; and the end of the game. Nobody sitting
 * at the table is notified, and the house never is.
 */
export async function notify(env, st, before) {
  const humans = st.players.filter((p) => !isBot(p));
  const pres = await presence(env, st.id);
  const here = new Set(hereNow(pres));
  const url = `/#/game/${st.id}`;
  const g = st.g;
  const tasks = [];
  if (st.status === "finished" && before.status === "playing") {
    for (const pid of humans) {
      if (here.has(pid)) continue;
      const names = { ...st.names, [pid]: "You" };
      const body = st.loser === pid ? "You're the Guffhead. 💩" : `${names[st.loser] || "Someone"} is the Guffhead. You got away with it.`;
      tasks.push(notifyPlayers(env, [pid], { title: "Guffhead: game over", body, url, tag: `gh-${st.id}` }));
    }
  } else {
    const waiting = required(st).filter((p) => !isBot(p) && !before.required.includes(p));
    for (const pid of waiting) {
      if (here.has(pid)) continue;
      const s = pres[pid];
      if (s && s.pushed_seq > s.seq) continue;      // already told, and hasn't looked since
      const names = { ...st.names, [pid]: "You" };
      const fresh = g.events.filter((e) => e.seq > (s ? s.seq : 0));
      const big = notable(fresh);
      const line = big ? describe(big, names, pid) : null;
      const body = g.phase === "swap" ? "New game. Pick your three face-up cards." : `${line ? line + " " : ""}Your go.`;
      tasks.push(notifyPlayers(env, [pid], { title: `Guffhead: ${st.players.filter((p) => p !== pid).map((p) => st.names[p]).join(", ")}`, body, url, tag: `gh-${st.id}` }));
      tasks.push(env.DB.prepare(
        `INSERT INTO gh_seen (game_id, player_id, seq, seen_at, pushed_seq) VALUES (?, ?, 0, 0, ?)
         ON CONFLICT(game_id, player_id) DO UPDATE SET pushed_seq = excluded.pushed_seq`).bind(st.id, pid, g.seq).run());
    }
  }
  await Promise.allSettled(tasks);
}
function notable(evs) {
  const rank = (e) => (e.k === "out" ? 5 : e.k === "play" && e.burn ? 4 : e.k === "pickup" && e.n >= 6 ? 3 : e.k === "flip" ? 2 : e.k === "play" || e.k === "pickup" ? 1 : 0);
  let best = null;
  for (const e of evs) if (rank(e) && (!best || rank(e) >= rank(best))) best = e;
  return best;
}

/* ---------- the 💩: who's wearing it ---------- */

/**
 * The reigning Guffhead for a set of players: whoever lost the last finished game between exactly these people.
 * They wear the 💩 into the next game, and it stays on their head until someone else loses (Carl, 10 Nov 2026).
 */
export async function reigningFor(env, players) {
  const key = players.slice().sort().join(",");
  const q = players.map(() => "?").join(",");
  const r = await env.DB.prepare(
    `SELECT r.players, r.loser FROM gh_results r JOIN gh_game_players p ON p.game_id = r.game_id
      WHERE p.player_id IN (${q}) AND r.loser IS NOT NULL GROUP BY r.game_id ORDER BY r.finished_at DESC LIMIT 200`,
  ).bind(...players).all();
  const hit = r.results.find((x) => x.players.split(",").sort().join(",") === key);
  return hit ? hit.loser : null;
}
/** Who has the 💩 on their head in this game: the loser once it's over, the reigning Guffhead until then. */
export const wearer = (st) => (st.status === "finished" ? st.loser || null : st.reigning || null);

/** The league: only losing scores. Everyone in my circle, how many times they've been the Guffhead in games
 * with at least two people in them (practice against the house doesn't count), all time and this month. */
export async function league(env, who, circle) {
  const ids = [who.id, ...circle.map((c) => c.id)];
  const names = Object.fromEntries([[who.id, who.name], ...circle.map((c) => [c.id, c.name])]);
  const r = await env.DB.prepare(`SELECT players, loser, finished_at FROM gh_results ORDER BY finished_at DESC LIMIT 5000`).all();
  const month = new Date(); month.setUTCDate(1); month.setUTCHours(0, 0, 0, 0);
  const rows = Object.fromEntries(ids.map((id) => [id, { id, name: names[id], poos: 0, month: 0, played: 0 }]));
  let current = null;
  for (const g of r.results) {
    const ps = g.players.split(",");
    if (ps.filter((p) => !isBot(p)).length < 2) continue;
    if (!ps.some((p) => rows[p])) continue;
    if (current === null && g.loser && rows[g.loser]) current = g.loser;
    for (const p of ps) if (rows[p]) rows[p].played++;
    if (g.loser && rows[g.loser]) { rows[g.loser].poos++; if (g.finished_at >= month.getTime()) rows[g.loser].month++; }
  }
  const table = Object.values(rows).filter((x) => x.played).sort((a, b) => b.poos - a.poos || a.played - b.played || a.name.localeCompare(b.name));
  return { table, current };
}

/* ---------- the actions, with the database ---------- */

export async function createGame(env, who, body, opponentsOf) {
  const mine = await opponentsOf(env, who.id);
  const nameFor = (id) => (isBot(id) ? BOTS[id].name : (mine.find((o) => o.id === id) || {}).name);
  const others = Array.isArray(body && body.players) ? [...new Set(body.players.map(String))].filter((p) => p !== who.id) : [];
  if (others.length < 1 || others.length > R.MAX_PLAYERS - 1) no("Pick one to three people to play with (GuffBot and Ms GuffBot count)");
  if (others.some((p) => !nameFor(p))) no("Everyone must be from your list, or the house");
  // the starter sits first, the rest in a random order (Carl, 14 Oct 2026, for every Guff game)
  for (let i = others.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [others[i], others[j]] = [others[j], others[i]]; }
  const players = [who.id, ...others];
  const names = Object.fromEntries(players.map((p) => [p, p === who.id ? who.name : nameFor(p)]));
  const st = newTable(players, names, body && body.settings);
  st.id = newId(); st.by = who.id;
  st.reigning = await reigningFor(env, players);
  runHouse(st);
  return save(env, st, true);
}

/** The same people and house rules again. The old table points to the new one, so everyone can follow. */
export async function again(env, who, id, opponentsOf) {
  const old = await load(env, id);
  if (!old.players.includes(who.id)) no("That's not one of your games", 403);
  if (old.status !== "finished") no("Finish this one first");
  if (old.next) return { id: old.next, existing: true };
  const mine = await opponentsOf(env, who.id);
  if (old.players.some((p) => p !== who.id && !isBot(p) && !mine.find((o) => o.id === p))) no("Not everyone from that table is on your list");
  // same seats, but the Guffhead deals: they sit first (it makes no odds to the rules, it's tradition)
  const seats = old.loser ? [old.loser, ...old.players.filter((p) => p !== old.loser)] : old.players.slice();
  const st = newTable(seats, { ...old.names, [who.id]: who.name }, old.settings);
  st.id = newId(); st.by = who.id; st.prev = old.id;
  st.reigning = old.loser || old.reigning || null;
  runHouse(st);
  await save(env, st, true);
  old.next = st.id;
  try { await save(env, old); } catch {}
  return { id: st.id, existing: false, st };
}

export async function getGame(env, who, id) {
  const st = await load(env, id);
  if (!st.players.includes(who.id)) no("That's not one of your games", 403);
  return st;
}

/** Load, act, save. Returns { st, before } so the caller can send notifications after replying. */
export async function act(env, who, id, body) {
  const st = await load(env, id);
  const before = { status: st.status, required: required(st) };
  perform(st, who.id, body, rnd, new Set([...hereNow(await presence(env, id)), who.id]));
  await save(env, st);
  return { st, before };
}

/**
 * On opening a game (any player's phone, every poll) and on the cron: a forced move held for someone who has since
 * left the table is played for them, and if the idle timer has run out on someone, GuffBot plays their go.
 */
export async function lazyAutopilot(env, st, viewer = null) {
  if (st.status !== "playing") return null;
  const before = { status: st.status, required: required(st) };
  const here = new Set(hereNow(await presence(env, st.id)));
  if (viewer) here.add(viewer);
  let changed = false;
  if (st.held && !here.has(st.held)) { runHouse(st, rnd, here); changed = true; }
  if (autopilot(st, now(), rnd, here).length) changed = true;
  if (!changed) return null;
  try { await save(env, st); } catch (e) { if (!(e instanceof Refusal)) throw e; return null; }
  return before;
}

/** The cron: every table that's been waiting longer than its idle timer gets GuffBot's help. */
export async function sweep(env) {
  const r = await env.DB.prepare(
    `SELECT id FROM gh_games WHERE status = 'playing' AND (updated_at < ? OR (json_extract(state, '$.held') IS NOT NULL AND updated_at < ?)) ORDER BY updated_at LIMIT 50`,
  ).bind(now() - Math.min(...R.IDLE_CHOICES.filter(Boolean)) * 3600000, now() - PRESENT_MS).all();
  let n = 0;
  for (const { id } of r.results) {
    try {
      const st = await load(env, id);
      const before = await lazyAutopilot(env, st);
      if (before) { n++; await notify(env, st, before); }
    } catch (e) { console.error("sweep", id, e); }
  }
  return n;
}

export async function listGames(env, who) {
  const r = await env.DB.prepare(
    `SELECT g.state FROM gh_games g JOIN gh_game_players p ON p.game_id = g.id WHERE p.player_id = ? AND (g.status = 'playing' OR g.updated_at > ?) ORDER BY g.updated_at DESC LIMIT 40`,
  ).bind(who.id, now() - 30 * 86400000).all();
  return r.results.map((x) => summary(JSON.parse(x.state), who.id));
}

/** Every finished game I was in: how often I've been the Guffhead, and against whom. */
export async function record(env, who) {
  const r = await env.DB.prepare(`SELECT r.game_id, r.players, r.loser, r.practice, r.finished_at, r.detail FROM gh_results r JOIN gh_game_players p ON p.game_id = r.game_id WHERE p.player_id = ? ORDER BY r.finished_at DESC LIMIT 300`).bind(who.id).all();
  return r.results.map((x) => ({ id: x.game_id, players: x.players.split(","), loser: x.loser, practice: !!x.practice, finished: x.finished_at, detail: JSON.parse(x.detail) }));
}
