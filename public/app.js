// Guffhead: the page. The back room of The Guff's Head. Routes: #/  #/game/:id  #/record
import { needWords, rankOf, isMagic, describeRules, DEFAULTS, IDLE_CHOICES, MAX_PLAYERS, sortCards } from "./rules.js";
import { comment, describe, weight, room, say, cardName, pluralOf } from "./lines.js";

export const BUILD = "2026-11-10.1";
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};
const reduced = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const seedOf = (s) => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
const HOUSE = ["guffbot", "msguffbot"];
const isHouse = (p) => HOUSE.includes(p);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const XMAS = new Date().getMonth() === 11;      // every Guff game dresses up for the whole of December

const S = {
  token: store.get("gh:token"),
  me: store.get("gh:me"),
  looks: {}, opponents: [], house: [], games: [], push: false,
  G: null,            // the game on screen (the latest view from the server)
  evs: [],            // every event of that game we know about
  here: [],           // who else is at the table right now
  sel: [],            // cards picked to play
  six: null,          // the swap: the three picked to go face up
  poll: 0, lastHere: 0, chatId: 0, chat: [],
  tips: store.get("gh:tips") !== false,
  talk: store.get("gh:talk") !== false,
  playing: false,     // the catch-up is running
  skip: false,
  busy: false,
};

/* ---------- api ---------- */
async function api(path, opts = {}) {
  let r;
  try {
    r = await fetch(`/api${path}`, { method: opts.method || "GET", headers: { "Content-Type": "application/json", ...(S.token ? { Authorization: `Bearer ${S.token}` } : {}) }, body: opts.body ? JSON.stringify(opts.body) : undefined });
  } catch { throw new Error("Couldn't reach the pub. Check your signal and try again."); }
  const b = await r.json().catch(() => ({}));
  if (r.status === 401 && S.token) { logout(); throw new Error("Please log in again"); }
  if (!r.ok) { const e = new Error(b.error || `Error ${r.status}`); e.status = r.status; throw e; }
  if (b.looks) Object.assign(S.looks, b.looks);
  return b;
}
function toast(msg, ms = 2800) {
  const t = $("toast");
  t.textContent = msg; t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, ms);
}
function logout() {
  S.token = null; S.me = null; store.del("gh:token"); store.del("gh:me");
  route();
}

/* ---------- faces ---------- */
const BOW = `<g transform="translate(108 18) rotate(22) scale(.55)"><path d="M0 0 C-8 -18 -32 -18 -30 0 C-32 18 -8 18 0 0 Z" fill="#E8559A" stroke="#A82B63" stroke-width="3"/><path d="M0 0 C8 -18 32 -18 30 0 C32 18 8 18 0 0 Z" fill="#E8559A" stroke="#A82B63" stroke-width="3"/><circle r="7" fill="#F27BB4"/></g>`;
const SANTA = `<g transform="translate(64 6)"><path d="M-40 14 C-30 -24 26 -34 44 -6 L52 16 Z" fill="#C8252C"/><circle cx="50" cy="16" r="9" fill="#fff"/><rect x="-46" y="8" width="96" height="14" rx="7" fill="#fff"/></g>`;
const lookOf = (pid) => window.Avatar.lookOf(pid, S.looks[pid]);
/** A head, with the 💩 sitting on it if they're the reigning Guffhead. drop: it lands now (the moment they lose). */
function headOf(pid, size = 36, poo = false, drop = false) {
  const h = bareHead(pid, size);
  if (!poo) return h;
  return `<span class="hw" style="--s:${size}px">${h}<i class="pooh${drop ? " drop" : ""}" title="The reigning Guffhead">💩</i></span>`;
}
function bareHead(pid, size) {
  if (isHouse(pid)) return `<svg class="avatar house" viewBox="0 0 128 128" width="${size}" height="${size}" role="img" aria-label="${nameOf(pid)}"><image href="guffbot.webp" x="0" y="0" width="128" height="128"/>${pid === "msguffbot" ? BOW : ""}${XMAS ? SANTA : ""}</svg>`;
  return window.Avatar.svg(lookOf(pid), size, { label: nameOf(pid), xmas: XMAS });
}
function figureOf(seedKey, pid, size = 130, poo = false, drop = false) {
  const f = bareFigure(seedKey, pid, size);
  return poo ? `<span class="hw fig" style="--s:${size}px">${f}<i class="pooh${drop ? " drop" : ""}">💩</i></span>` : f;
}
function bareFigure(seedKey, pid, size) {
  const seed = seedOf(`${seedKey}:${pid}`);
  if (pid === "guffbot" && window.Jumper) return window.Jumper.svg(seed, size);
  if (pid === "msguffbot" && window.Jumper && window.Jumper.ms) return window.Jumper.ms(seed, size);
  return window.Avatar.figure(lookOf(pid), seed, size, { label: nameOf(pid), xmas: XMAS });
}
function nameOf(pid) {
  if (pid === "guffbot") return "GuffBot";
  if (pid === "msguffbot") return "Ms GuffBot";
  if (S.G && S.G.names && S.G.names[pid]) return S.G.names[pid];
  if (S.me && pid === S.me.id) return S.me.name;
  const o = S.opponents.find((x) => x.id === pid);
  return o ? o.name : pid;
}
const you = (pid) => (S.me && pid === S.me.id ? "You" : nameOf(pid));
const namesFor = (G) => ({ ...G.names, [S.me.id]: "You" });
const tonight = () => new Date().toISOString().slice(0, 10);

/* ---------- cards ---------- */
const SUIT = { S: "♠", H: "♥", D: "♦", C: "♣" };
const RANK = { T: "10" };
const MAGIC_MARK = (c, s) => {
  const r = rankOf(c);
  if (!s || !isMagic(r, s)) return "";
  const m = r === 10 ? ["🔥", "Burns the pile"] : r === 2 ? ["↺", "Resets the pile"] : ["👻", "Invisible"];
  return `<u class="mark" title="${m[1]}">${m[0]}</u>`;
};
/** One card. o: { size: 'lg'|'md'|'sm'|'xs', sel, tap, dim, cls, s (house rules, for the magic marks) } */
function card(c, o = {}) {
  if (!c) return back(o);
  const r = RANK[c[0]] || c[0];
  const red = c[1] === "H" || c[1] === "D";
  const face = "JQK".includes(c[0]);
  const mid = face ? `<em class="face">${r}</em>` : c[0] === "A" ? `<em class="ace">${SUIT[c[1]]}</em>` : `<em>${SUIT[c[1]]}</em>`;
  return `<span class="card ${o.size || "md"}${red ? " red" : ""}${o.sel ? " sel" : ""}${o.dim ? " dim" : ""}${o.cls ? " " + o.cls : ""}"${o.tap ? ` data-card="${c}" role="button" tabindex="0"` : ""} aria-label="${r} of ${({ S: "spades", H: "hearts", D: "diamonds", C: "clubs" })[c[1]]}"><b>${r}<i>${SUIT[c[1]]}</i></b>${mid}${MAGIC_MARK(c, o.s)}</span>`;
}
function back(o = {}) {
  return `<span class="card back ${o.size || "md"}${o.cls ? " " + o.cls : ""}"${o.tap != null ? ` data-down="${o.tap}" role="button" tabindex="0"` : ""} aria-label="A face-down card"><img src="guffbot.webp" alt=""></span>`;
}

/* ---------- sound: cards on the table, and the burn ---------- */
let actx = null;
function noise(len, freq, q, gain, when = 0) {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const t = actx.currentTime + when;
    const buf = actx.createBuffer(1, Math.floor(actx.sampleRate * len), actx.sampleRate);
    const d = buf.getChannelData(0);
    for (let k = 0; k < d.length; k++) d[k] = (Math.random() * 2 - 1) * Math.pow(1 - k / d.length, 3);
    const src = actx.createBufferSource(); src.buffer = buf;
    const f = actx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = freq; f.Q.value = q;
    const g = actx.createGain(); g.gain.value = gain;
    src.connect(f); f.connect(g); g.connect(actx.destination); src.start(t);
  } catch {}
}
const sound = { on: store.get("gh:sound") === true };   // off unless switched on (Carl, 10 Nov 2026)
const snap = (n = 1) => { if (sound.on) for (let i = 0; i < n; i++) noise(0.05, 2600 + Math.random() * 800, 1.2, 0.5, i * 0.07); };
const whoosh = () => { if (sound.on) { noise(0.6, 500, 0.6, 0.9); noise(0.4, 1400, 0.8, 0.4, 0.1); } };
const shuffleSound = () => { if (sound.on) for (let i = 0; i < 10; i++) noise(0.03, 3000, 1, 0.3, i * 0.035); };

/* ---------- routing ---------- */
function route() {
  clearInterval(S.poll); S.poll = 0;
  const h = location.hash || "#/";
  $("topnav").hidden = !S.token;
  if (!S.token) return renderLogin();
  let m;
  if ((m = h.match(/^#\/game\/([a-z0-9]{6})/))) return openGame(m[1]);
  if (h === "#/record") return renderRecord();
  if (h === "#/league") return renderLeague();
  S.G = null;
  renderLobby();
}
window.addEventListener("hashchange", route);

/* ---------- the door ---------- */
function renderLogin() {
  $("app").innerHTML = `
    <section class="door">
      <div class="doorman">${window.Jumper ? window.Jumper.svg(seedOf(tonight()), 170) : headOf("guffbot", 120)}</div>
      <p class="patter">"Evening. Card game's in the back room. Same name and PIN as Words and Guff."</p>
      <form id="loginForm" class="card-panel form" autocomplete="on">
        <label>Name <input id="name" name="username" autocomplete="username" autocapitalize="none" required></label>
        <label>PIN <input id="pin" name="password" type="password" inputmode="numeric" autocomplete="current-password" required></label>
        <details><summary>In a private league?</summary><label>League code <input id="league" autocapitalize="characters"></label></details>
        <button class="btn gold" type="submit">Pull up a stool</button>
        <p class="err" id="loginErr" hidden></p>
      </form>
      <p class="small soft">The card game with the rude name, for two to four, at your own pace.</p>
    </section>`;
  $("loginForm").onsubmit = async (e) => {
    e.preventDefault();
    try {
      const r = await api("/login", { method: "POST", body: { name: $("name").value, pin: $("pin").value, league: ($("league") || {}).value || "" } });
      S.token = r.token; S.me = r.me; store.set("gh:token", r.token); store.set("gh:me", r.me);
      route();
    } catch (er) { const x = $("loginErr"); x.textContent = er.message; x.hidden = false; }
  };
}

/* ---------- the lobby ---------- */
const NEW = { crew: [], rules: { ...DEFAULTS, ...(store.get("gh:rules") || {}) } };
async function renderLobby() {
  if (!S.lobbyLoaded) $("app").innerHTML = `<p class="loading">Pam is wiping down a table…</p>`;
  let r;
  try { r = await api("/me"); } catch (e) { $("app").innerHTML = `<p class="err">${esc(e.message)}</p>`; return; }
  S.lobbyLoaded = true;
  S.me = r.me; S.opponents = r.opponents; S.house = r.house; S.games = r.games; S.push = r.push;
  if ((location.hash || "#/") !== "#/" && location.hash !== "#" && location.hash !== "") return;
  const playing = r.games.filter((g) => g.status === "playing").sort((a, b) => (b.myGo - a.myGo) || (b.updated - a.updated));
  const done = r.games.filter((g) => g.status !== "playing").slice(0, 6);
  const n = NEW.crew.length;
  const R = NEW.rules;
  $("app").innerHTML = `
    <section class="lobby">
      <div class="welcome">
        <div class="landlord">${headOf("guffbot", 74)}</div>
        <p class="patter">"${esc(say("hello", seedOf(tonight() + S.me.id), { name: S.me.name }))}"</p>
      </div>
      ${leagueSnippet(r.league)}
      <h2>Your tables</h2>
      <div class="tables">${playing.length ? playing.map(tableRow).join("") : `<p class="soft">No games on. Deal one below.</p>`}</div>
      ${done.length ? `<details class="done"><summary>Lately finished</summary>${done.map(tableRow).join("")}</details>` : ""}

      <h2>Deal a game</h2>
      <div class="card-panel seat">
        <p class="small">Pick one to three to play with. GuffBot and Ms GuffBot play the moment it's their go.</p>
        <div class="chips people">
          ${S.house.map((h) => `<button class="chip person${NEW.crew.includes(h.id) ? " on" : ""}" data-crew="${h.id}" title="${esc(h.blurb)}">${headOf(h.id, 28)}${esc(h.name)}</button>`).join("")}
          ${S.opponents.map((o) => `<button class="chip person${NEW.crew.includes(o.id) ? " on" : ""}" data-crew="${esc(o.id)}">${headOf(o.id, 28)}${esc(o.name)}</button>`).join("")}
        </div>
        <details class="rules"${store.get("gh:rulesOpen") ? " open" : ""}>
          <summary>House rules <span class="soft">${esc(rulesShort(R))}</span></summary>
          <div class="rulegrid">
            ${toggle("twoReset", "2 goes on anything and resets the pile", R.twoReset)}
            ${toggle("tenBurn", "10 burns the pile (you go again)", R.tenBurn)}
            ${toggle("fourBurn", "Four of a kind burns the pile", R.fourBurn)}
            ${choice("seven", "7", [["off", "Just a 7"], ["reverse", "Reverses play"], ["lower", "Next plays 7 or lower"]], R.seven)}
            ${choice("eight", "8", [["off", "Just an 8"], ["skip", "Skips the next player"]], R.eight)}
            ${choice("three", "3", [["off", "Just a 3"], ["invisible", "Invisible"]], R.three)}
            ${toggle("pickUpAnyTime", "You may pick up the pile even when you could play", R.pickUpAnyTime)}
            ${choice("idleHours", "If someone leaves their go", IDLE_CHOICES.map((h) => [String(h), h ? `GuffBot plays it after ${h} hours` : "Wait for ever"]), String(R.idleHours))}
          </div>
          <button class="linkish" id="rulesReset">Back to the usual rules</button>
        </details>
        <button class="btn gold" id="deal" ${n >= 1 && n <= MAX_PLAYERS - 1 ? "" : "disabled"}>${n < 1 ? "Pick who you're playing" : n > MAX_PLAYERS - 1 ? "Three at most with you" : `Deal for ${n + 1}`}</button>
      </div>

      ${notifyCard()}
      <details class="howto"><summary>How to play</summary>${howTo(R)}</details>
      <p class="foot"><a href="#/league">The 💩 league</a> · <a href="#/record">Your record</a> · <a href="https://hub.carlosfandango.net/">All the Guff games</a> · <button class="linkish" id="logout">Go home</button></p>
    </section>`;
  const app = $("app");
  app.querySelectorAll("[data-crew]").forEach((b) => (b.onclick = () => { const id = b.dataset.crew; NEW.crew = NEW.crew.includes(id) ? NEW.crew.filter((x) => x !== id) : [...NEW.crew, id]; renderLobby(); }));
  app.querySelectorAll("[data-rule]").forEach((el) => (el.onchange = () => {
    const k = el.dataset.rule;
    NEW.rules[k] = el.type === "checkbox" ? el.checked : k === "idleHours" ? Number(el.value) : el.value;
    store.set("gh:rules", NEW.rules);
    renderLobby();
  }));
  const rd = app.querySelector("details.rules");
  if (rd) rd.ontoggle = () => store.set("gh:rulesOpen", rd.open);
  $("rulesReset").onclick = () => { NEW.rules = { ...DEFAULTS }; store.set("gh:rules", NEW.rules); renderLobby(); };
  $("deal").onclick = () => start({ players: NEW.crew, settings: NEW.rules });
  $("logout").onclick = async () => { try { await api("/logout", { method: "POST" }); } catch {} logout(); };
  wireNotify();
  clearInterval(S.poll);
  S.poll = setInterval(() => { if ((location.hash || "#/") === "#/" && !document.hidden && !document.activeElement.matches("select")) renderLobby(); }, 20000);
}
const toggle = (k, label, on) => `<label class="tog"><input type="checkbox" data-rule="${k}"${on ? " checked" : ""}><span>${esc(label)}</span></label>`;
const choice = (k, label, opts, v) => `<label class="pickrow"><span>${esc(label)}</span><select data-rule="${k}">${opts.map(([val, t]) => `<option value="${val}"${val === v ? " selected" : ""}>${esc(t)}</option>`).join("")}</select></label>`;
function rulesShort(R) {
  const d = [];
  if (!R.twoReset) d.push("2 plain");
  if (!R.tenBurn) d.push("10 plain");
  if (!R.fourBurn) d.push("no four-burn");
  if (R.seven === "reverse") d.push("7 reverses");
  if (R.seven === "lower") d.push("7 lower");
  if (R.eight === "skip") d.push("8 skips");
  if (R.three === "invisible") d.push("3 invisible");
  if (R.pickUpAnyTime) d.push("pick up any time");
  return d.length ? d.join(", ") : "the usual";
}

function tableRow(g) {
  const heads = g.opps.map((p) => headOf(p, 32, g.wearer === p)).join("");
  const who = g.opps.map((p) => esc(g.names[p] || nameOf(p))).join(", ");
  let what;
  if (g.status !== "playing") what = g.loser === S.me.id ? "💩 You were the Guffhead" : g.loser ? `${esc(g.names[g.loser])} was the Guffhead` : "Over";
  else if (g.myGo) what = g.phase === "swap" ? "<b>Pick your face-up cards</b>" : "<b>Your go</b>";
  else what = g.phase === "swap" ? `Waiting for ${g.required.map((p) => esc(g.names[p])).join(", ")} to sort their cards` : `Waiting for ${g.required.map((p) => esc(g.names[p])).join(", ")}`;
  const mine = g.left[S.me.id];
  return `<a class="tablerow${g.myGo ? " go" : ""}" href="#/game/${g.id}"><span class="heads">${heads}</span><span class="who">${who}<small>${what}</small>${g.last && g.status === "playing" ? `<small class="lastline">${esc(g.last)}</small>` : ""}</span><span class="sc">${g.status === "playing" ? `${mine}<small>cards</small>` : g.loser === S.me.id ? "💩" : "😅"}</span></a>`;
}

async function start(body) {
  try {
    const r = await api("/games", { method: "POST", body });
    NEW.crew = [];
    shuffleSound();
    location.hash = `#/game/${r.game.id}`;
  } catch (e) { toast(e.message); }
}

function howTo(R) {
  return `
  <p>Everyone gets three cards face down, three face up on top of them, and three in hand. Before play starts, you can swap cards between your hand and your face-up three: put your strongest face up, because you'll need them later.</p>
  <p>On your go, play a card at least as high as the top of the pile (aces are high). Play several of the same rank at once if you like. If you can't play, you pick up the whole pile. While the pack lasts, you draw back up to three.</p>
  <p>When your hand runs out, play your face-up cards. When those are gone, flip your face-down cards blind: if one won't go, you pick up the pile with it. Get rid of everything and you're out. The last player holding cards is the Guffhead.</p>
  <p><b>This table's rules.</b></p>
  <ul class="rulelist">${describeRules(R).map(([k, v]) => `<li><b>${esc(k)}</b> ${esc(v)}</li>`).join("")}</ul>
  <p><b>At your own pace.</b> When there's only one thing you can do (pick up, or play the only card that goes, or flip blind), it's done for you so nobody waits. If two of you have the game open at once, it plays live. Leave your go too long and GuffBot plays it for you, as well as he can.</p>`;
}

/* ---------- notifications ---------- */
const pushSupported = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const standalone = () => window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const b64uToBytes = (s) => { const t = s.replace(/-/g, "+").replace(/_/g, "/"); return Uint8Array.from(atob(t + "=".repeat((4 - (t.length % 4)) % 4)), (c) => c.charCodeAt(0)); };
function notifyCard() {
  if (!S.push) return "";
  return `<details class="card-panel notify" id="notify"><summary>🔔 Notifications <span class="soft" id="notifyState"></span></summary><div id="notifyBody"></div></details>`;
}
async function pushState() {
  if (!pushSupported()) return isIOS() && !standalone() ? "install" : "unsupported";
  if (Notification.permission === "denied") return "denied";
  try { const reg = await navigator.serviceWorker.getRegistration(); const sub = reg ? await reg.pushManager.getSubscription() : null; return sub ? "on" : "off"; } catch { return "off"; }
}
async function wireNotify() {
  const box = $("notifyBody");
  if (!box) return;
  const st = await pushState();
  $("notifyState").textContent = { on: "on", off: "off", denied: "blocked", install: "", unsupported: "" }[st];
  const html = {
    on: `<p class="small">On for this device. You'll hear when it's your go (once, until you've looked) and when a game ends.</p><button class="btn small" id="pushTest">Send a test</button> <button class="btn small ghost" id="pushOff">Turn off</button>`,
    off: `<p class="small">Find out when it's your go, without checking.</p><button class="btn small gold" id="pushOn">Turn on</button>`,
    denied: `<p class="small">Notifications are blocked for Guffhead in this browser's settings. Allow them there and come back.</p>`,
    install: `<p class="small">On an iPhone, notifications need the game on your Home Screen: tap Share, then Add to Home Screen, then open it from there.</p>`,
    unsupported: `<p class="small">This browser can't do notifications.</p>`,
  }[st];
  box.innerHTML = html;
  if ($("pushOn")) $("pushOn").onclick = async () => {
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { toast("Notifications weren't allowed"); return; }
      const { key } = await api("/push/key");
      if (!key) { toast("Notifications aren't set up on the server yet"); return; }
      const reg = await navigator.serviceWorker.register("sw.js");
      await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64uToBytes(key) });
      await api("/push/subscribe", { method: "POST", body: { subscription: sub.toJSON(), ua: navigator.userAgent.slice(0, 200) } });
      toast("Notifications on. Pam will shout when it's your go.");
      wireNotify();
    } catch (e) { toast(e.message || "Couldn't turn them on"); }
  };
  if ($("pushOff")) $("pushOff").onclick = async () => {
    try { const reg = await navigator.serviceWorker.getRegistration(); const sub = reg ? await reg.pushManager.getSubscription() : null; if (sub) { await api("/push/unsubscribe", { method: "POST", body: { endpoint: sub.endpoint } }).catch(() => {}); await sub.unsubscribe(); } toast("Notifications off for this device."); wireNotify(); } catch (e) { toast(e.message); }
  };
  if ($("pushTest")) $("pushTest").onclick = async () => { try { const r = await api("/push/test", { method: "POST" }); toast(r.sent ? "Sent. It should arrive in a moment." : `Nothing sent. ${r.why || ""}`, 5000); } catch (e) { toast(e.message); } };
}

/* ---------- a game ---------- */
const seenKey = (id) => `gh:seen:${id}`;
const maxSeq = () => (S.evs.length ? S.evs[S.evs.length - 1].seq : 0);
function mergeEvents(evs) {
  if (!evs || !evs.length) return;
  const have = maxSeq();
  for (const e of evs) if (e.seq > have) S.evs.push(e);
  if (S.evs.length > 400) S.evs.splice(0, S.evs.length - 400);
}

async function openGame(id, quiet) {
  if (!quiet) { $("app").innerHTML = `<p class="loading">Shuffling…</p>`; S.evs = []; S.sel = []; S.six = null; S.chat = []; S.chatId = 0; }
  let r;
  try { r = await api(`/games/${id}?since=0&here=1&chat=0`); } catch (e) { $("app").innerHTML = `<p class="err">${esc(e.message)}</p><p><a href="#/">Back to the bar</a></p>`; return; }
  S.lastHere = Date.now();
  S.evs = r.game.g.events.slice();
  S.here = r.here || [];
  S.chat = r.chat || []; S.chatId = S.chat.length ? S.chat[S.chat.length - 1].id : 0;
  const last = Number(store.get(seenKey(id)) || 0);
  show(r.game, last);
  schedulePoll();
}
function schedulePoll() {
  clearInterval(S.poll);
  const live = S.here.length > 0 && S.G && S.G.status === "playing";
  S.poll = setInterval(pollGame, live ? 1500 : 4000);
  S.pollLive = live;
}
async function pollGame() {
  if (!S.G || document.hidden || S.playing || S.busy) return;
  const G = S.G;
  const here = Date.now() - S.lastHere > 7000;
  try {
    const r = await api(`/games/${G.id}?since=${maxSeq()}&chat=${S.chatId}${here ? "&here=1" : ""}`);
    if (here) S.lastHere = Date.now();
    if (!S.G || S.G.id !== G.id) return;
    if (r.chat && r.chat.length) { S.chat = [...S.chat, ...r.chat].slice(-80); S.chatId = r.chat[r.chat.length - 1].id; renderChat(); }
    const wasLive = S.here.length > 0;
    S.here = r.here || [];
    if (r.game.g.seq !== G.g.seq || r.game.status !== G.status) { const last = maxSeq(); mergeEvents(r.game.g.events); show(r.game, last); }
    else if (wasLive !== S.here.length > 0) renderPresence();
    if ((S.here.length > 0) !== !!S.pollLive) schedulePoll();
  } catch {}
}

async function doAct(body) {
  const G = S.G;
  if (S.busy) return;
  S.busy = true;
  try {
    const before = maxSeq();
    const r = await api(`/games/${G.id}/act`, { method: "POST", body: { ...body, seq: G.g.seq, since: before } });
    S.sel = [];
    mergeEvents(r.game.g.events);
    if (body.act === "play" || body.act === "flip") snap(body.cards ? body.cards.length : 1);
    S.busy = false;
    show(r.game, before, true);
  } catch (e) {
    S.busy = false;
    toast(e.message);
    if (e.status === 409) openGame(G.id, true); else if (S.G === G) renderGame();
  }
}

/** A new view of the game: catch up on what happened since `since`, then draw it. */
function show(G, since, mine = false) {
  S.G = G;
  if (location.hash !== `#/game/${G.id}`) return;
  // what to replay: everything after `since`, except the moves I made myself just now (I saw myself make them)
  const fresh = S.evs.filter((e) => e.seq > since && !(mine && e.p === S.me.id && !e.auto && !e.autopilot && e.k !== "out" && e.k !== "over"));
  const toPlay = fresh.filter((e) => weight(e) !== "small");
  store.set(seenKey(G.id), G.g.seq);
  if (!toPlay.length || reduced()) { renderGame(); return; }
  catchUp(toPlay, since > 0 && !mine && toPlay.length > 2);
}

/* ---------- the catch-up: what happened while you were away (or just now, live) ---------- */
async function catchUp(evs, away) {
  S.playing = true; S.skip = false;
  renderGame(true);
  const stage = $("stage");
  if (!stage) { S.playing = false; return; }
  const names = namesFor(S.G);
  const per = evs.length > 12 ? 520 : evs.length > 5 ? 750 : 950;
  stage.hidden = false;
  stage.innerHTML = `${away ? `<div class="stagehead">While you were away <button class="linkish" id="skip">Skip ▸▸</button></div>` : ""}<div class="stagebody" id="stagebody"></div>`;
  if ($("skip")) $("skip").onclick = () => { S.skip = true; };
  for (const e of evs) {
    if (S.skip || !S.G) break;
    const body = $("stagebody");
    if (!body) break;
    const big = weight(e) === "big";
    body.innerHTML = stageCard(e, names);
    body.firstElementChild.classList.add(big ? "pop" : "slide");
    if (e.k === "play" && e.burn) { whoosh(); body.querySelector(".stagecards") && body.querySelector(".stagecards").classList.add("burning"); }
    else if (e.k === "play" || e.k === "flip") snap(e.cards ? e.cards.length : 1);
    await sleep(big ? per * 1.6 : per);
  }
  S.playing = false;
  if (S.G) renderGame();
}
function stageCard(e, names) {
  const who = e.p ? `<span class="stagewho">${headOf(e.p, 34)}</span>` : "";
  let cards = "";
  if (e.k === "play") cards = e.cards.map((c) => card(c, { size: "md", s: S.G.settings })).join("");
  if (e.k === "flip") cards = card(e.card, { size: "md", cls: e.ok ? "" : "nogo", s: S.G.settings });
  if (e.k === "pickup") cards = `<span class="pickfan">${Array.from({ length: Math.min(e.n, 7) }, (_, i) => `<span style="--i:${i}">${back({ size: "sm" })}</span>`).join("")}</span>`;
  if (e.k === "over") cards = e.loser ? headOf(e.loser, 56, true, true) : "";
  const tag = e.autopilot ? `<small class="tag">GuffBot played this for ${esc(names[e.p] === "You" ? "you" : names[e.p])}</small>` : e.auto ? `<small class="tag">no choice, played for ${esc(names[e.p] === "You" ? "you" : names[e.p])}</small>` : "";
  const talk = S.talk ? comment(e, names, S.me.id) : null;
  return `<div class="stagecard ${e.k}${e.burn ? " burn" : ""}">${who}<span class="stagecards">${cards}</span><span class="stagetext">${esc(describe(e, names, S.me.id) || "")}${tag}${talk ? `<i class="talk">${esc(talk)}</i>` : ""}</span></div>`;
}

/** Who wears the 💩 here, and whether it should land now (the first time this phone sees the game finished). */
const wears = (G, pid) => G.wearer === pid;
function dropNow(G) {
  if (G.status !== "finished" || !G.loser || S.playing) return false;
  const k = `gh:drop:${G.id}`;
  if (store.get(k)) return false;
  store.set(k, 1);
  return true;
}

/* ---------- drawing the table ---------- */
function renderGame(staging = false) {
  const G = S.G, g = G.g, s = G.settings;
  const app = $("app");
  const meSeat = g.seats.find((p) => p.id === S.me.id);
  const opps = rotate(g.seats, S.me.id).filter((p) => p.id !== S.me.id);
  const turnId = g.phase === "play" ? g.seats[g.turn].id : null;
  if (G.status === "playing" && g.phase === "swap" && G.myGo) return renderSwap(G);
  S.drop = dropNow(G);
  app.innerHTML = `
    <section class="game${staging ? " staging" : ""}">
      <div class="status">${statusLine(G)}</div>
      <div id="presence">${presenceHtml()}</div>
      <div class="opps n${opps.length}">${opps.map((p) => oppPod(G, p, turnId)).join("")}</div>
      <div class="table">
        <div class="pack">${g.draw ? `<span class="stack">${back({ size: "sm" })}${g.draw > 1 ? back({ size: "sm", cls: "under" }) : ""}</span><small>Pack ${g.draw}</small>` : `<span class="stack empty"></span><small>Pack gone</small>`}</div>
        <div class="pile" id="pile">${pileHtml(g, s)}<small>${g.pile.length ? `${g.pile.length} on the pile` : "Empty"}</small></div>
        <div class="burnt">${g.burned ? `<span class="ash">🔥</span><small>${g.burned} burned</small>` : `<span class="ash dim">🔥</span><small>None burned</small>`}</div>
        ${g.phase === "play" ? `<div class="need${needClass(g, s)}">${esc(needWords(g.pile, s))}</div>` : ""}
        ${s.seven === "reverse" && g.phase === "play" && g.seats.filter((p) => !p.out).length > 2 ? `<div class="dir" title="Direction of play">${g.dir === 1 ? "↻" : "↺"}</div>` : ""}
      </div>
      <div class="stage" id="stage" hidden></div>
      ${meSeat ? myArea(G, meSeat, turnId) : ""}
      <div class="actions" id="actions">${actionsHtml(G)}</div>
      ${G.myGo && S.tips && G.hint && !staging ? `<p class="hint">🎓 ${esc(G.hint)}</p>` : ""}
      ${lastTalk(G)}
      <div class="toggles"><button class="chip${S.tips ? " on" : ""}" data-toggle="tips" aria-pressed="${S.tips}">🎓 Tips ${S.tips ? "on" : "off"}</button><button class="chip${S.talk ? " on" : ""}" data-toggle="talk" aria-pressed="${S.talk}">🎙️ GuffBot ${S.talk ? "on" : "off"}</button><button class="chip${sound.on ? " on" : ""}" data-toggle="sound" aria-pressed="${sound.on}">${sound.on ? "🔊" : "🔇"}</button></div>
      ${G.status === "finished" && !staging ? finalCard(G) : ""}
      <h2>At the table</h2>
      <div class="cast">${G.players.map((p) => `<figure class="${p === S.me.id ? "me" : ""}${p === G.loser ? " loser" : ""}">${figureOf(G.id, p, 118, wears(G, p), S.drop && wears(G, p))}<figcaption>${esc(you(p))}${wears(G, p) ? " 💩" : ""}</figcaption></figure>`).join("")}</div>
      ${G.players.filter((p) => !isHouse(p)).length > 1 ? `<h2>Table talk</h2><div id="chat" class="chat"></div><form id="chatForm" class="chatform"><input id="chatText" maxlength="280" placeholder="Say something to the table"><button class="btn small">Say</button></form>` : ""}
      <details class="log"><summary>The game so far</summary>${logHtml(G)}</details>
      <details class="log"><summary>This table's house rules</summary><ul class="rulelist">${describeRules(s).map(([k, v]) => `<li><b>${esc(k)}</b> ${esc(v)}</li>`).join("")}<li><b>Idle timer</b> ${s.idleHours ? `GuffBot plays anyone's go after ${s.idleHours} hours.` : "Off: we wait."}</li></ul></details>
      <details class="howto"><summary>How to play</summary>${howTo(s)}</details>
      ${G.status === "playing" && G.players.includes(S.me.id) ? `<details class="menu"><summary>More</summary><button class="btn ghost" id="resign">Leave the table (you'll be the Guffhead)</button></details>` : ""}
      <p class="foot"><a href="#/">Back to the bar</a> · <a href="https://hub.carlosfandango.net/">All the Guff games</a></p>
    </section>`;
  wireGame();
  renderChat();
}
/** Seats from my point of view: the player after me first, so the table reads in the direction of play. */
function rotate(seats, me) {
  const i = seats.findIndex((p) => p.id === me);
  if (i < 0) return seats;
  return [...seats.slice(i), ...seats.slice(0, i)];
}
function needClass(g, s) { const w = needWords(g.pile, s); return /anything/i.test(w) ? " easy" : /aces|king|queen|or lower/i.test(w) ? " tough" : ""; }

function pileHtml(g, s) {
  if (!g.pile.length) return `<span class="mat"></span><span class="fan"></span>`;
  const top = g.pile.slice(-4);
  return `<span class="mat"></span><span class="fan">${top.map((c, i) => `<span class="pc" style="--i:${i};--r:${((seedOf(c + g.pile.length - top.length + i) % 21) - 10)}deg">${card(c, { size: "md", s })}</span>`).join("")}</span>`;
}

function oppPod(G, p, turnId) {
  const g = G.g;
  const hand = typeof p.hand === "number" ? p.hand : p.hand.length;
  const here = S.here.includes(p.id);
  const turn = p.id === turnId;
  const known = (p.known || []).slice();
  const out = p.out ? `<span class="outbadge">${p.out === 1 ? "Out first" : "Out"}</span>` : "";
  return `<div class="pod${turn ? " turn" : ""}${p.out ? " isout" : ""}${G.loser === p.id ? " guffhead" : ""}">
    <div class="podhead">${headOf(p.id, 34, wears(G, p.id), S.drop && wears(G, p.id))}<span class="podname">${esc(nameOf(p.id))}${here ? `<i class="dot" title="At the table now"></i>` : ""}</span>${out}</div>
    <div class="podcards">
      <span class="handcount" title="Cards in hand">${hand ? `<span class="minifan">${Array.from({ length: Math.min(hand, 5) }, (_, i) => `<span style="--i:${i}">${back({ size: "xs" })}</span>`).join("")}</span><b>${hand}</b>` : `<b class="none">0</b>`}</span>
      <span class="tablecards">${tableStack(p, "xs", G.settings)}</span>
    </div>
    ${known.length ? `<div class="known" title="Cards everyone saw them pick up">Picked up: ${sortCards(known, G.settings).slice(0, 8).map((c) => `<span class="kc${c[1] === "H" || c[1] === "D" ? " red" : ""}">${RANK[c[0]] || c[0]}${SUIT[c[1]]}</span>`).join("")}${known.length > 8 ? ` +${known.length - 8}` : ""}</div>` : ""}
  </div>`;
}
/** Face-down cards with the face-up ones sitting on them. */
function tableStack(p, size, s, o = {}) {
  const downs = typeof p.down === "number" ? p.down : 0;
  const n = Math.max(downs, p.up.length, 0);
  const slots = [];
  for (let i = 0; i < Math.max(n, 3); i++) {
    const hasDown = i < downs;
    const up = p.up[i];
    if (!hasDown && !up) { slots.push(`<span class="slot empty ${size}"></span>`); continue; }
    slots.push(`<span class="slot ${size}">${hasDown ? back({ size, tap: o.tapDown && !p.up.length ? i : null }) : ""}${up ? card(up, { size, cls: "onup", s, tap: o.tapUp, sel: S.sel.includes(up), dim: o.dimUp }) : ""}</span>`);
  }
  return slots.join("");
}

function myArea(G, me, turnId) {
  const s = G.settings;
  const zone = me.hand.length ? "hand" : me.up.length ? "up" : me.down ? "down" : null;
  const myGo = G.myGo && G.g.phase === "play" && !S.playing;
  const playable = new Set(myGo && G.options ? G.options.plays.flatMap((p) => p.cards) : []);
  const hand = Array.isArray(me.hand) ? me.hand : [];
  return `<div class="mine${me.id === turnId ? " turn" : ""}${me.out ? " isout" : ""}">
    <div class="myhead">${headOf(me.id, 34, wears(G, me.id), S.drop && wears(G, me.id))}<b>You</b>${me.out ? `<span class="outbadge">${me.out === 1 ? "Out first" : "Out"}</span>` : ""}${wears(G, me.id) && G.status === "playing" ? `<small class="soft">You're wearing it from last time. Lose this one and it stays.</small>` : ""}</div>
    <div class="mytable">${tableStack(me, "sm", s, { tapUp: myGo && zone === "up", tapDown: myGo && zone === "down" })}</div>
    <div class="hand${hand.length > 8 ? " tight" : ""}${hand.length > 14 ? " tighter" : ""}">${hand.length ? hand.map((c) => card(c, { size: "md", tap: myGo, sel: S.sel.includes(c), dim: myGo && !playable.has(c), s })).join("") : me.out ? `<p class="soft">You're out. ${G.status === "playing" ? "Sit back and enjoy the show." : ""}</p>` : `<p class="soft small">${zone === "up" ? "Hand's empty: play from your face-up cards." : zone === "down" ? "Blind now: tap a face-down card." : ""}</p>`}</div>
  </div>`;
}

function actionsHtml(G) {
  if (G.status !== "playing" || !G.myGo || G.g.phase !== "play" || S.playing) return "";
  const o = G.options;
  if (!o) return "";
  if (o.zone === "down") return `<p class="prompt">Tap one of your face-down cards to flip it.</p>`;
  const sel = S.sel;
  const label = sel.length ? `Play ${sel.length === 1 ? `the ${cardName(sel[0])}` : `${["", "", "two", "three", "four"][sel.length] || sel.length} ${pluralOf(sel[0])}`}` : o.plays.length ? "Pick a card to play" : "Nothing will go";
  return `<button class="btn gold big" id="playBtn"${sel.length ? "" : " disabled"}>${esc(label)}</button>${o.pickUp ? `<button class="btn ghost" id="pickBtn">Pick up ${G.g.pile.length}</button>` : ""}`;
}

function statusLine(G) {
  const g = G.g;
  const seed = seedOf(`${G.id}:${g.seq}`);
  const names = namesFor(G);
  if (G.status === "finished" && S.playing) return `<p class="patter">The last few goes…</p>`;
  if (G.status === "finished") return `<p class="patter">${G.loser === S.me.id ? "💩 You're the Guffhead." : `${esc(names[G.loser] || "Someone")} is the Guffhead.`}</p>`;
  if (g.phase === "swap") return `<p class="patter">Waiting for ${esc(G.required.map((p) => names[p]).join(" and "))} to pick their face-up cards.</p>`;
  if (G.myGo) return `<p class="patter loud">${esc(say("yourGo", seed, { name: S.me.name }))}</p>`;
  return `<p class="patter">${esc(say("waiting", seed, { name: G.required.map((p) => nameOf(p)).join(" and ") }))}</p>`;
}
function presenceHtml() {
  if (!S.G || S.G.status !== "playing") return "";
  const others = S.here.filter((p) => !isHouse(p));
  if (!others.length) return "";
  return `<p class="live">🍺 <b>Live</b>: ${esc(others.map(nameOf).join(" and "))} ${others.length > 1 ? "are" : "is"} at the table</p>`;
}
function renderPresence() { const el = $("presence"); if (el) el.innerHTML = presenceHtml(); }

function lastTalk(G) {
  if (S.playing) return "";
  const names = namesFor(G);
  const recent = S.evs.slice(-12).reverse();
  const roomLine = recent.map(room).find(Boolean);
  const line = S.talk ? recent.slice(0, 6).map((e) => comment(e, names, S.me.id)).find(Boolean) : null;
  const lastMove = recent.find((e) => ["play", "pickup", "flip", "skip", "out", "over"].includes(e.k));
  return `<div class="talkbox">${lastMove ? `<p class="lastmove">${headOf(lastMove.p || lastMove.loser, 22)} ${esc(describe(lastMove, names, S.me.id))}${lastMove.autopilot ? ` <small class="tag">(GuffBot played it)</small>` : ""}</p>` : ""}${line ? `<p class="guffbot">${headOf("guffbot", 22)} ${esc(line)}</p>` : ""}${roomLine && S.talk ? `<p class="room">${esc(roomLine)}</p>` : ""}</div>`;
}

function finalCard(G) {
  const names = namesFor(G);
  const order = G.g.finished;
  const lost = G.loser === S.me.id;
  const human = G.players.filter((p) => !isHouse(p));
  return `<div class="final${lost ? " lost" : ""}">
    ${lost ? "" : `<div class="bigemoji">${["🍺", "🎉", "🥳", "🕺🏻", "😅"][seedOf(G.id) % 5]}</div>`}
    ${G.loser ? `<div class="crowning">${headOf(G.loser, 84, true, S.drop)}</div>` : ""}
    <h3>${lost ? "You're the Guffhead" : `${esc(names[G.loser] || "Someone")} is the Guffhead`}</h3>
    <ol class="order" aria-label="Finishing order">${order.map((p) => `<li>${headOf(p, 24)} ${esc(names[p])}</li>`).join("")}${G.loser ? `<li class="last">${headOf(G.loser, 24)} ${esc(names[G.loser])} 💩</li>` : ""}</ol>
    ${G.next ? `<a class="btn gold" href="#/game/${G.next}">To the next game ▸</a>` : `<button class="btn gold" id="again">Deal again${G.loser && !isHouse(G.loser) && G.loser !== S.me.id ? ` (${esc(names[G.loser])} deals)` : ""}</button>`}
    <p class="small soft">${human.length > 1 ? (G.reigning && G.reigning !== G.loser ? `The 💩 passes from ${esc(names[G.reigning])} to ${esc(names[G.loser])}.` : G.reigning === G.loser ? `${esc(names[G.loser])} keeps the 💩. Again.` : `${esc(names[G.loser])} wears the 💩 until someone else loses.`) : "Practice against the house: it's in your record, not the league."}</p>
  </div>`;
}

function logHtml(G) {
  const names = namesFor(G);
  const rows = S.evs.slice(-80).map((e) => { const t = describe(e, names, S.me.id); return t ? `<li class="${e.k}${e.burn ? " burn" : ""}">${esc(t)}${e.autopilot ? " <small>(GuffBot played it)</small>" : e.auto ? " <small>(no choice)</small>" : ""}</li>` : ""; }).filter(Boolean).reverse();
  return `<ol class="evlog">${rows.join("")}</ol>`;
}

function renderChat() {
  const el = $("chat");
  if (!el) return;
  el.innerHTML = S.chat.length ? S.chat.map((m) => `<p class="${m.player_id === S.me.id ? "me" : ""}">${headOf(m.player_id, 22)}<b>${esc(you(m.player_id))}</b> ${esc(m.text)}</p>`).join("") : `<p class="soft small">Nothing said yet.</p>`;
  el.scrollTop = el.scrollHeight;
}

function wireGame() {
  const G = S.G;
  const app = $("app");
  app.querySelectorAll("[data-card]").forEach((el) => {
    const go = () => tapCard(el.dataset.card);
    el.onclick = go;
    el.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } };
  });
  app.querySelectorAll("[data-down]").forEach((el) => { el.onclick = () => { if (G.myGo && G.options && G.options.zone === "down") { el.classList.add("flipping"); doAct({ act: "flip", index: Number(el.dataset.down) }); } }; });
  if ($("playBtn")) $("playBtn").onclick = () => { if (S.sel.length) doAct({ act: "play", cards: S.sel.slice() }); };
  if ($("pickBtn")) $("pickBtn").onclick = () => doAct({ act: "pickup" });
  if ($("again")) $("again").onclick = async () => { try { const r = await api(`/games/${G.id}/again`, { method: "POST" }); shuffleSound(); location.hash = `#/game/${r.id}`; } catch (e) { toast(e.message); } };
  if ($("resign")) $("resign").onclick = () => { if (confirmTwice("resign")) doAct({ act: "resign" }); };
  app.querySelectorAll("[data-toggle]").forEach((b) => (b.onclick = () => {
    const k = b.dataset.toggle;
    if (k === "sound") { sound.on = !sound.on; store.set("gh:sound", sound.on); }
    else { S[k] = !S[k]; store.set(`gh:${k}`, S[k]); }
    renderGame();
  }));
  const f = $("chatForm");
  if (f) f.onsubmit = async (e) => {
    e.preventDefault();
    const t = $("chatText").value.trim();
    if (!t) return;
    try { await api(`/games/${G.id}/chat`, { method: "POST", body: { text: t } }); $("chatText").value = ""; pollGame(); } catch (er) { toast(er.message); }
  };
}
/** Leaving the table is a two-tap job, so nobody does it by accident. */
function confirmTwice(k) {
  const b = $(k);
  if (b.dataset.armed) return true;
  b.dataset.armed = "1"; b.textContent = "Tap again to leave. You'll be the Guffhead."; b.classList.add("armed");
  setTimeout(() => { if (b) { delete b.dataset.armed; b.classList.remove("armed"); b.textContent = "Leave the table (you'll be the Guffhead)"; } }, 4000);
  return false;
}

/** Tapping cards: pick one, and the rest of that rank come with it; tap again to put one back. */
function tapCard(c) {
  const G = S.G;
  if (!G.myGo || !G.options) return;
  const play = G.options.plays.find((p) => p.cards.includes(c));
  if (!play) { toast(`That won't go: ${needWords(G.g.pile, G.settings).toLowerCase()}`); return; }
  if (S.sel.length && rankOf(S.sel[0]) !== rankOf(c)) S.sel = [];
  if (S.sel.includes(c)) S.sel = S.sel.filter((x) => x !== c);
  else if (!S.sel.length) S.sel = play.cards.slice();       // all of the rank, the usual play
  else S.sel = [...S.sel, c];
  renderGame();
}

/* ---------- the swap: pick your face-up three ---------- */
function renderSwap(G) {
  const s = G.settings;
  const six = G.six || [];
  const me = G.g.seats.find((p) => p.id === S.me.id);
  if (!S.six || S.six.key !== G.id) S.six = { key: G.id, up: me.up.slice() };
  const up = S.six.up;
  const names = namesFor(G);
  const waiting = G.required.filter((p) => p !== S.me.id);
  $("app").innerHTML = `
    <section class="game swap">
      <div class="status"><p class="patter loud">${esc(say("swap", seedOf(G.id)))}</p></div>
      <div id="presence">${presenceHtml()}</div>
      <p class="small">Tap three cards to go face up, on top of your three face-down cards. The other three are your starting hand.</p>
      <div class="sixcards">${six.map((c) => card(c, { size: "lg", tap: true, sel: up.includes(c), s })).join("")}</div>
      <div class="swapview">
        <div><h3>Face up</h3><div class="row">${up.length ? sortCards(up, s).map((c) => card(c, { size: "sm", s })).join("") : `<span class="soft small">None yet</span>`}</div></div>
        <div><h3>In hand</h3><div class="row">${sortCards(six.filter((c) => !up.includes(c)), s).map((c) => card(c, { size: "sm", s })).join("")}</div></div>
      </div>
      ${S.tips ? `<p class="hint">🎓 Most people put their highest cards and their ${s.tenBurn ? "10s" : ""}${s.tenBurn && s.twoReset ? " and " : ""}${s.twoReset ? "2s" : ""} face up, and keep low cards in hand to get rid of early.</p>` : ""}
      <div class="actions"><button class="btn gold big" id="readyBtn"${up.length === 3 ? "" : " disabled"}>${up.length === 3 ? "Ready" : `Pick ${3 - up.length} more`}</button></div>
      <p class="small soft">${waiting.length ? `Also sorting: ${esc(waiting.map((p) => names[p]).join(", "))}.` : "Everyone else is ready."}</p>
      <details class="log"><summary>This table's house rules</summary><ul class="rulelist">${describeRules(s).map(([k, v]) => `<li><b>${esc(k)}</b> ${esc(v)}</li>`).join("")}</ul></details>
      <p class="foot"><a href="#/">Back to the bar</a></p>
    </section>`;
  $("app").querySelectorAll("[data-card]").forEach((el) => (el.onclick = () => {
    const c = el.dataset.card;
    const u = S.six.up;
    if (u.includes(c)) S.six.up = u.filter((x) => x !== c);
    else if (u.length < 3) S.six.up = [...u, c];
    else { S.six.up = [...u.slice(1), c]; }
    renderSwap(G);
  }));
  $("readyBtn").onclick = () => { if (S.six.up.length === 3) doAct({ act: "ready", up: S.six.up.slice() }); };
}

/* ---------- the league: only losing scores, and the score is 💩 ---------- */
const poos = (n) => (n ? (n <= 12 ? "💩".repeat(n) : `💩 × ${n}`) : `<span class="soft">clean</span>`);
function leagueSnippet(lg) {
  if (!lg || !lg.table || !lg.table.length) return "";
  const top = lg.table.slice(0, 4);
  return `<a class="leaguesnip card-panel" href="#/league">
    ${lg.current ? `<span class="wearing">${headOf(lg.current, 46, true)}<span><b>${esc(lg.current === S.me.id ? "You're" : `${nameOf(lg.current)} is`)} wearing the 💩</b><small>Lost the last game with friends</small></span></span>` : ""}
    <span class="mini">${top.map((x) => `<span>${esc(x.id === S.me.id ? "You" : x.name)} <b>${x.poos}</b></span>`).join("")}<em>Full league ▸</em></span>
  </a>`;
}
async function renderLeague() {
  $("app").innerHTML = `<p class="loading">Pam is counting the 💩…</p>`;
  let r;
  try { r = await api("/league"); } catch (e) { $("app").innerHTML = `<p class="err">${esc(e.message)}</p>`; return; }
  $("app").innerHTML = `
    <section class="league">
      <h2>The 💩 league</h2>
      <p class="small">Only losing scores. Every time you're the Guffhead in a game with friends, you get a 💩. Going out first, second or whatever is fine. Games against just the house don't count.</p>
      ${r.current ? `<div class="card-panel wearing big">${headOf(r.current, 70, true)}<span><b>${esc(r.current === S.me.id ? "You're" : `${nameOf(r.current)} is`)} wearing it</b><small>until someone else loses</small></span></div>` : ""}
      <div class="card-panel">${r.table.length ? `<table class="lgtable"><tr><th></th><th>All time</th><th>This month</th><th>Games</th></tr>${r.table.map((x) => `<tr class="${x.id === S.me.id ? "me" : ""}"><td>${headOf(x.id, 28, x.id === r.current)} ${esc(x.id === S.me.id ? "You" : x.name)}</td><td class="pp">${poos(x.poos)}</td><td>${x.month || ""}</td><td>${x.played}</td></tr>`).join("")}</table>` : `<p class="soft">No games with friends finished yet. Somebody has to be first.</p>`}</div>
      <p class="foot"><a href="#/">Back to the bar</a></p>
    </section>`;
}

/* ---------- the record ---------- */
async function renderRecord() {
  $("app").innerHTML = `<p class="loading">Pam is finding the slate…</p>`;
  let r;
  try { r = await api("/record"); } catch (e) { $("app").innerHTML = `<p class="err">${esc(e.message)}</p>`; return; }
  const me = S.me.id;
  const games = r.record;
  const lost = games.filter((g) => g.loser === me).length;
  const vs = {};
  for (const g of games) for (const p of g.players) {
    if (p === me) continue;
    vs[p] = vs[p] || { played: 0, me: 0, them: 0 };
    vs[p].played++;
    if (g.loser === me) vs[p].me++;
    if (g.loser === p) vs[p].them++;
  }
  const names = Object.fromEntries(games.flatMap((g) => g.players.map((p) => [p, p])));
  $("app").innerHTML = `
    <section class="record">
      <h2>Your record</h2>
      <div class="card-panel bigstats">
        <div><b>${games.length}</b><small>games</small></div>
        <div><b>${lost}</b><small>times the Guffhead</small></div>
        <div><b>${games.length ? Math.round((100 * (games.length - lost)) / games.length) : 0}%</b><small>got away with it</small></div>
      </div>
      <h2>Head to head</h2>
      <div class="card-panel">${Object.keys(vs).length ? `<table class="h2h"><tr><th></th><th>Games</th><th>You 💩</th><th>Them 💩</th></tr>${Object.entries(vs).sort((a, b) => b[1].played - a[1].played).map(([p, v]) => `<tr><td>${headOf(p, 24)} ${esc(nameOf(p) === p ? names[p] : nameOf(p))}</td><td>${v.played}</td><td>${v.me}</td><td>${v.them}</td></tr>`).join("")}</table>` : `<p class="soft">No finished games yet.</p>`}</div>
      <p class="foot"><a href="#/">Back to the bar</a></p>
    </section>`;
}

/* ---------- go ---------- */
if ("serviceWorker" in navigator) navigator.serviceWorker.addEventListener("message", (e) => { if (e.data && e.data.type === "open" && e.data.url) location.href = e.data.url; });
document.addEventListener("visibilitychange", () => { if (!document.hidden && S.G && location.hash.startsWith("#/game/")) pollGame(); });
if (XMAS) document.body.classList.add("xmas");
route();
