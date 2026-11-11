// Guffhead: the page. The back room of a 1970s pub. Routes: #/  #/game/:id  #/replay/:id  #/league  #/logbook  #/record
import { needWords, rankOf, isMagic, describeRules, DEFAULTS, IDLE_CHOICES, MAX_PLAYERS, sortCards } from "./rules.js";
import { comment, describe, weight, room, say, cardName, pluralOf } from "./lines.js";
import { pick as pickPaper } from "./wallpaper.js";
import { svg as boardSvg, png as boardPng } from "./poster.js";
import { at as replayAt, steps as replaySteps, canReplay } from "./replay.js";

import { BUILD } from "./build.js";
export { BUILD };
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
  doing: {},          // what the others at the table are doing (looking, picking)
  tab: null,          // the open tab under your hand: chat | log | rules | table
};

/* ---------- small comforts: haptics, the app badge, the tab title ---------- */
const buzz = (p) => { try { if (navigator.vibrate) navigator.vibrate(p); } catch {} };   // Android only; iPhones ignore it
function badge(n) {
  document.title = n ? `(${n}) Your go · Guffhead` : "Guffhead";
  try { if (navigator.setAppBadge) { if (n) navigator.setAppBadge(n).catch(() => {}); else if (navigator.clearAppBadge) navigator.clearAppBadge().catch(() => {}); } } catch {}
  const t = document.querySelector('#bottomnav [data-tab="tables"]');
  if (t) { let c = t.querySelector(".count"); if (n) { if (!c) { c = document.createElement("span"); c.className = "count"; t.appendChild(c); } c.textContent = n; } else if (c) c.remove(); }
}
const waitingOnMe = (games) => (games || []).filter((g) => g.status === "playing" && g.myGo).length;

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
  if (b.build && b.build !== BUILD) offerUpdate(b.build, b.note);
  return b;
}

/** The server is on a newer version than this page: a bar to tap, never a forced reload mid-go. */
function offerUpdate(build, note) {
  if ($("update")) return;
  const bar = document.createElement("button");
  bar.id = "update";
  bar.className = "update";
  bar.innerHTML = `<span class="pint">🍺</span><span><b>Fresh round poured</b><small>${esc(note || "A new version of Guffhead is ready.")} Tap to update.</small></span>`;
  bar.onclick = () => { bar.classList.add("going"); location.reload(); };
  document.body.appendChild(bar);
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
/* The 70s back-room look (Carl, 10 Nov 2026): GuffBot in a tweed flat cap; Ms GuffBot in a knotted hanky with a
   cigarette on the go. In December the Santa hat takes over, as in every Guff game. Drawn over the 128px picture. */
const CAP = `<g class="cap"><defs><pattern id="tweed" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#7B6646"/><path d="M0 0 h6 M0 3 h6" stroke="#5E4C32" stroke-width="1.2"/></pattern></defs>
  <path d="M27 42 C26 22 50 12 72 12 C94 12 106 24 104 40 C92 44 40 46 27 42 Z" fill="url(#tweed)" stroke="#3E3121" stroke-width="2"/>
  <path d="M16 46 C24 36 66 34 86 40 C72 50 30 54 16 46 Z" fill="#5E4C32" stroke="#3E3121" stroke-width="2"/>
  <circle cx="66" cy="14" r="3" fill="#5E4C32"/></g>`;
const HANKY = `<g class="hanky"><path d="M24 42 C22 18 106 18 104 42 C88 46 40 46 24 42 Z" fill="#FFFFFF" stroke="#8F8775" stroke-width="2.4"/>
  <path d="M44 24 C52 32 76 32 84 24 M38 34 C56 40 72 40 90 34" stroke="#D8D1C2" stroke-width="2" fill="none"/>
  ${[[24, 42], [104, 42], [38, 22], [90, 22]].map(([x, y]) => `<g transform="translate(${x} ${y})"><circle r="5" fill="#F7F4EC" stroke="#B9B2A2" stroke-width="1.6"/><path d="M2 3 l6 7 M-2 3 l-4 8" stroke="#B9B2A2" stroke-width="2.4" stroke-linecap="round"/></g>`).join("")}</g>`;
const FAG = `<g class="fag"><g transform="rotate(16 86 95)"><rect x="84" y="92" width="30" height="5.5" rx="1.5" fill="#FBFAF6" stroke="#BDB6A6" stroke-width=".8"/><rect x="84" y="92" width="8" height="5.5" rx="1.5" fill="#D9A55A"/><rect x="111" y="92" width="4" height="5.5" rx="1" fill="#E5482B"/></g>
  <path class="smoke" d="M117 100 C111 92 121 86 115 78 C109 70 119 64 113 56" stroke="#D8D8D8" stroke-width="2.6" fill="none" stroke-linecap="round" opacity=".75"/></g>`;

const SANTA = `<g transform="translate(64 6)"><path d="M-40 14 C-30 -24 26 -34 44 -6 L52 16 Z" fill="#C8252C"/><circle cx="50" cy="16" r="9" fill="#fff"/><rect x="-46" y="8" width="96" height="14" rx="7" fill="#fff"/></g>`;
const lookOf = (pid) => window.Avatar.lookOf(pid, S.looks[pid]);
/** A head, with the 💩 sitting on it if they're the reigning Guffhead. drop: it lands now (the moment they lose). */
function headOf(pid, size = 36, poo = false, drop = false) {
  const h = bareHead(pid, size);
  if (!poo) return h;
  return `<span class="hw" style="--s:${size}px">${h}<i class="pooh${drop ? " drop" : ""}" title="The reigning Guffhead">💩</i></span>`;
}
function bareHead(pid, size) {
  if (isHouse(pid)) {
    const ms = pid === "msguffbot";
    const hat = XMAS ? SANTA : ms ? HANKY : CAP;
    return `<svg class="avatar house${ms ? " ms" : ""}" viewBox="-4 -8 136 136" width="${size}" height="${size}" role="img" aria-label="${nameOf(pid)}"><image href="guffbot.webp" x="0" y="0" width="128" height="128"/>${hat}${ms ? FAG : ""}</svg>`;
  }
  return window.Avatar.svg(lookOf(pid), size, { label: nameOf(pid), xmas: XMAS });
}
function figureOf(seedKey, pid, size = 130, poo = false, drop = false) {
  const f = bareFigure(seedKey, pid, size);
  return poo ? `<span class="hw fig" style="--s:${size}px">${f}<i class="pooh${drop ? " drop" : ""}">💩</i></span>` : f;
}
/* Down the pub (Carl, 10 Nov 2026): wide collars, paisley, kipper ties, diamond jumpers and car coats with a pint;
   maxi dresses, jumpsuits and go-go boots with a cocktail and an umbrella. pubwear.js draws them; the outfit is
   seeded by the game, so it's the same on every phone and different next game. */
const HEADBOX = "translate(56 -6) translate(64 112) scale(1.12) translate(-64 -112)";
const dressOf = (pid) => (pid === "guffbot" ? "lads" : pid === "msguffbot" ? "ladies" : (S.looks[pid] && S.looks[pid].dress) || "any");
function skinOf(look) { const k = window.Avatar.PARTS.skin.find((x) => x.id === look.skin); return k ? k.hex : undefined; }
function dressed(pid, seed, size, o = {}) {
  if (!window.Pub) return null;
  if (pid === "guffbot") return window.Pub.guffbot(seed, size, { hat: XMAS ? SANTA : CAP });
  if (pid === "msguffbot") return window.Pub.ms(seed, size, { hat: (XMAS ? SANTA : HANKY) + FAG });
  const look = lookOf(pid);
  return window.Pub.wear(seed, size, window.Avatar.head(look, { transform: HEADBOX, xmas: XMAS }), { pref: o.pref || dressOf(pid), skin: skinOf(look), label: nameOf(pid) });
}
function bareFigure(seedKey, pid, size) {
  const seed = seedOf(`${seedKey}:${pid}`);
  const pub = dressed(pid, seed, size);
  if (pub) return pub;
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

/* ---------- the wallpaper: 70s flock or circles, the same for everyone at a table, a fresh one at the bar ---------- */
const BAR_SEED = Math.floor(Math.random() * 1e9);
function paper(seed) {
  const p = pickPaper(seed);
  if (document.body.dataset.paper === p.id) return p;
  document.body.dataset.paper = p.id;
  document.body.style.background = `radial-gradient(ellipse 120% 90% at 50% 30%, rgba(10, 6, 4, .05), rgba(10, 6, 4, .55)), linear-gradient(rgba(10, 6, 4, .22), rgba(10, 6, 4, .22)), ${p.css}`;
  document.body.style.backgroundAttachment = "fixed";
  return p;
}

/* ---------- routing ---------- */
function route() {
  clearInterval(S.poll); S.poll = 0;
  document.body.classList.remove("fit"); S.sheet = false;
  const h = location.hash || "#/";
  const gm = h.match(/^#\/(game|replay)\/([a-z0-9]{6})/);
  paper(gm ? seedOf(gm[2]) : BAR_SEED);
  nav(h);
  stopIdle();
  const nt = $("nexttoast"); if (nt) nt.remove();
  let m;
  if ((m = h.match(/^#\/join\/([a-z0-9]{8})/))) return renderJoin(m[1]);
  if (!S.token) return renderLogin();
  if ((m = h.match(/^#\/game\/([a-z0-9]{6})/))) return openGame(m[1]);
  if ((m = h.match(/^#\/replay\/([a-z0-9]{6})/))) return renderReplay(m[1]);
  if (h === "#/record") return renderRecord();
  if (h === "#/league") return renderLeague();
  if (h === "#/logbook") return renderLogbook();
  S.G = null;
  renderLobby();
}
window.addEventListener("hashchange", route);

/** The bottom tabs (as CountGuff and Words and Guff): Tables, the 💩 league, the Logbook, your record. Not on a
 *  game page, where the cards need the room; there a small "Tables" link sits in the header instead. */
function nav(h) {
  const inGame = /^#\/(game|replay)\//.test(h);
  const bn = $("bottomnav"), back = $("backlink");
  if (bn) {
    bn.hidden = !S.token || inGame;
    document.body.classList.toggle("tabs", !bn.hidden);
    const which = h === "#/" || h === "" || h === "#" ? "tables" : h.replace("#/", "");
    bn.querySelectorAll("a").forEach((a) => { a.classList.toggle("on", a.dataset.tab === which); if (a.dataset.tab === "league" || a.dataset.tab === "logbook") a.hidden = !!(S.me && S.me.guest); });
  }
  if (back) back.hidden = !S.token || !inGame;
  badge(waitingOnMe(S.games));
}

/* ---------- the door ---------- */
function renderLogin() {
  $("app").innerHTML = `
    <section class="door">
      <div class="doorman">${dressed("guffbot", seedOf(tonight()), 170) || headOf("guffbot", 120)}</div>
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
  badge(waitingOnMe(r.games));
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
      ${S.me.guest ? `<p class="card-panel guestnote">You're ${esc(S.me.hostName || "a friend")}'s guest. Want your own login for all the Guff games? Ask ${esc(S.me.hostName || "them")}.</p>` : ""}
      ${newsLine(r.news)}
      ${S.me.guest ? "" : leagueSnippet(r.league)}
      <h2>Your tables</h2>
      <div class="tables">${playing.length ? playing.map(tableRow).join("") : `<p class="soft">No games on. Deal one below.</p>`}</div>
      ${done.length ? `<details class="done"><summary>Lately finished</summary>${done.map(tableRow).join("")}</details>` : ""}

      <h2>Deal a game</h2>
      <div class="card-panel seat">
        <p class="small">Pick one to three to play with. GuffBot and Ms GuffBot play the moment it's their go.</p>
        <div class="chips people">
          ${S.house.map((h) => `<button class="chip person${NEW.crew.includes(h.id) ? " on" : ""}" data-crew="${h.id}" title="${esc(h.blurb)}">${headOf(h.id, 28)}${esc(h.name)}</button>`).join("")}
          ${S.opponents.map((o) => `<button class="chip person${NEW.crew.includes(o.id) ? " on" : ""}" data-crew="${esc(o.id)}">${headOf(o.id, 28)}${esc(o.name)}${o.guest ? ` <small class="guesttag">guest</small>` : ""}</button>`).join("")}
        </div>
        <details class="rules"${store.get("gh:rulesOpen") ? " open" : ""}>
          <summary>House rules <span class="soft">${esc(rulesShort(R))}</span></summary>
          <h4 class="rulehead">The cards</h4>
          <div class="rulegrid">
            ${toggle("twoReset", "2 goes on anything and resets the pile", R.twoReset)}
            ${toggle("tenBurn", "10 burns the pile (you go again)", R.tenBurn)}
            ${toggle("fourBurn", "Four of a kind burns the pile", R.fourBurn)}
            ${choice("seven", "7", [["off", "Just a 7"], ["reverse", "Reverses play"], ["lower", "Next plays 7 or lower"]], R.seven)}
            ${choice("eight", "8", [["off", "Just an 8"], ["skip", "Skips the next player"]], R.eight)}
            ${choice("three", "3", [["off", "Just a 3"], ["invisible", "Invisible"]], R.three)}
            ${toggle("pickUpAnyTime", "You may pick up the pile even when you could play", R.pickUpAnyTime)}
          </div>
          <h4 class="rulehead">The pace</h4>
          <div class="rulegrid">
            ${choice("idleHours", "If someone leaves their go", IDLE_CHOICES.map((h) => [String(h), h ? `GuffBot plays it after ${h} hours` : "Wait for ever"]), String(R.idleHours))}
          </div>
          <button class="linkish" id="rulesReset">Back to the usual rules</button>
        </details>
        <button class="btn gold" id="deal" ${n >= 1 && n <= MAX_PLAYERS - 1 ? "" : "disabled"}>${n < 1 ? "Pick who you're playing" : n > MAX_PLAYERS - 1 ? "Three at most with you" : `Deal for ${n + 1}`}</button>
      </div>

      ${S.me.guest ? "" : `<h2>Invite anyone</h2>
      <div class="card-panel invite">
        <p class="small">Send a link to anyone, by WhatsApp or text. They type their name and they're straight into a game with you: no login, no PIN. ${NEW.crew.filter(isHouse).length ? `${esc(NEW.crew.filter(isHouse).map(nameOf).join(" and "))} will play too.` : "Pick GuffBot or Ms GuffBot above to seat them too."} Same house rules as above. Guest games don't count in the 💩 league.</p>
        <button class="btn gold" id="invite">📨 Make an invite link</button>
        <div id="inviteOut"></div>
      </div>`}
      ${wardrobeCard()}
      ${notifyCard()}
      <details class="howto"><summary>How to play</summary>${howTo(R)}</details>
      <p class="foot"><a href="https://hub.carlosfandango.net/">All the Guff games</a> · <button class="linkish" id="logout">Go home</button><br><small class="soft">Version ${esc(BUILD)}</small></p>
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
  if ($("invite")) $("invite").onclick = () => makeInvite();
  wireWardrobe();
  $("logout").onclick = async () => { try { await api("/logout", { method: "POST" }); } catch {} logout(); };
  app.querySelectorAll("[data-nudge]").forEach((b) => (b.onclick = async (e) => {
    e.preventDefault(); e.stopPropagation();
    try { await api(`/games/${b.dataset.nudge}/nudge`, { method: "POST" }); toast("Nudged. They'll get a tap on the shoulder."); buzz(20); renderLobby(); } catch (er) { toast(er.message); }
  }));
  const nx = $("newsX");
  if (nx) nx.onclick = () => { store.set("gh:newsOff", tonight()); nx.parentElement.remove(); };
  wireNotify();
  maybeWelcome();
  clearInterval(S.poll);
  S.poll = setInterval(() => { if ((location.hash || "#/") === "#/" && !document.hidden && !document.activeElement.matches("select") && !$("welcome")) renderLobby(); }, 20000);
}

/* ---------- the wardrobe ---------- */
const DRESS_CHOICES = [["lads", "👔 Lads' gear", "and a pint"], ["ladies", "👗 Ladies' gear", "and a cocktail"], ["any", "🎲 Surprise me", "either, every game"]];
function wardrobeCard() {
  return window.Pub ? `<h2>What you're wearing tonight</h2>${wardrobePanel()}` : "";
}
function wardrobePanel() {
  const mine = dressOf(S.me.id);
  const seed = seedOf(`${tonight()}:${S.me.id}:${S.tryOn || 0}`);
  return `<div class="card-panel wardrobe">
      <div class="tryon">${dressed(S.me.id, seed, 150)}</div>
      <div class="wardtext">
        <p class="small">${esc(window.Pub.caption("", seed, mine))}</p>
        <div class="chips dress">${DRESS_CHOICES.map(([id, label, sub]) => `<button class="chip${mine === id ? " on" : ""}" data-dress="${id}">${label}<small>${sub}</small></button>`).join("")}</div>
        <button class="linkish" id="tryOn">Try something else on</button>
        <p class="small soft">A different outfit every game, from the wardrobe you pick.</p>
      </div>
    </div>`;
}
function wireWardrobe() {
  const w = $("app").querySelector(".wardrobe");
  if (!w) return;
  const redraw = () => { const x = $("app").querySelector(".wardrobe"); if (x) { x.outerHTML = wardrobePanel(); wireWardrobe(); } };
  w.querySelectorAll("[data-dress]").forEach((b) => (b.onclick = async () => {
    const dress = b.dataset.dress;
    if (dress === dressOf(S.me.id)) return;
    try {
      await api("/dress", { method: "POST", body: { dress } });
      S.looks[S.me.id] = { ...(S.looks[S.me.id] || {}), dress };
      S.tryOn = 0; buzz(10); redraw();
    } catch (er) { toast(er.message); }
  }));
  $("tryOn").onclick = () => { S.tryOn = (S.tryOn || 0) + 1; redraw(); };
}

/** Always good news about you (Words and Guff's stat line): a different one each day, dismissible for the day. */
function newsLine(news) {
  if (!news || !news.length || store.get("gh:newsOff") === tonight()) return "";
  const line = news[seedOf(tonight() + S.me.id) % news.length];
  return `<p class="news card-panel">${esc(line)}<button class="x" id="newsX" aria-label="Hide for today">×</button></p>`;
}

/* ---------- welcome: notifications and the Home Screen (borrowed from CountGuff) ----------
   If notifications aren't on for this phone, a sheet after login: at most three times, never twice in 20 hours. */
const WELCOME_KEY = "gh:welcome", WELCOME_MAX = 3, WELCOME_GAP = 20 * 3600000;
async function maybeWelcome() {
  if (!S.push || $("welcome")) return;
  const st = await pushState();
  if (st === "on" || st === "denied" || st === "unsupported") return;
  const w = store.get(WELCOME_KEY) || { n: 0, last: 0 };
  if (w.n >= WELCOME_MAX || Date.now() - w.last < WELCOME_GAP) return;
  store.set(WELCOME_KEY, { n: w.n + 1, last: Date.now() });
  const ios = isIOS() && !standalone();
  const sheet = document.createElement("div");
  sheet.id = "welcome"; sheet.className = "sheet";
  sheet.innerHTML = `<div class="sheetcard">
    <button class="x" id="welcomeX" aria-label="Close">×</button>
    <div class="sheethead">${headOf("guffbot", 56)}<h3>Want a shout when it's your go?</h3></div>
    ${ios ? `<p>On an iPhone, notifications need Guffhead on your Home Screen:</p><ol class="steps"><li>Tap the Share button <b>⎋</b> at the bottom of Safari</li><li>Choose <b>Add to Home Screen</b></li><li>Open Guffhead from your Home Screen and come back here</li></ol>`
          : `<p>Pam will tell you when it's your go (once, until you've looked) and when a game ends. Nothing else.</p><button class="btn gold" id="welcomeOn">Turn on notifications</button>`}
    <button class="linkish" id="welcomeNo">Not now</button>
  </div>`;
  document.body.appendChild(sheet);
  const close = () => sheet.remove();
  $("welcomeX").onclick = close; $("welcomeNo").onclick = close;
  sheet.onclick = (e) => { if (e.target === sheet) close(); };
  if ($("welcomeOn")) $("welcomeOn").onclick = async () => { close(); await turnOnPush(); };
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

const NUDGE_MS = 2 * 3600000;
function tableRow(g) {
  const heads = g.opps.map((p) => headOf(p, 26, g.wearer === p)).join("");
  const thumb = `<span class="thumb">${boardSvg({ id: g.id, names: g.players.map((p) => (p === S.me.id ? S.me.name : g.names[p])), loser: g.status === "playing" ? null : g.names[g.loser] || null, size: 92 })}</span>`;
  const looking = (g.looking || []).filter((p) => !isHouse(p));
  const humansWaiting = g.required.filter((p) => p !== S.me.id && !isHouse(p));
  const canNudge = g.status === "playing" && !g.myGo && humansWaiting.length && Date.now() - g.waitingSince >= NUDGE_MS && !(g.nudgedAt && Date.now() - g.nudgedAt < NUDGE_MS);
  const extra = looking.length ? `<small class="looking">${esc(looking.map((p) => g.names[p]).join(" and "))} ${looking.length > 1 ? "are" : "is"} looking 👀</small>`
    : canNudge ? `<button class="chip nudge" data-nudge="${g.id}">👉 Nudge ${esc(humansWaiting.map((p) => g.names[p]).join(" and "))}</button>`
    : g.nudgedAt && g.status === "playing" && Date.now() - g.nudgedAt < NUDGE_MS ? `<small class="soft">Nudged ${ago(g.nudgedAt)}</small>` : "";
  const who = g.opps.map((p) => esc(g.names[p] || nameOf(p))).join(", ");
  let what;
  if (g.status !== "playing") what = g.loser === S.me.id ? "💩 You were the Guffhead" : g.loser ? `${esc(g.names[g.loser])} was the Guffhead` : "Over";
  else if (g.myGo) what = g.phase === "swap" ? "<b>Pick your face-up cards</b>" : "<b>Your go</b>";
  else what = g.phase === "swap" ? `Waiting for ${g.required.map((p) => esc(g.names[p])).join(", ")} to sort their cards` : `Waiting for ${g.required.map((p) => esc(g.names[p])).join(", ")}`;
  const mine = g.left[S.me.id];
  return `<a class="tablerow${g.myGo ? " go" : ""}" href="#/game/${g.id}">${thumb}<span class="who"><span class="heads">${heads}</span>${who}<small>${what}</small>${g.last && g.status === "playing" ? `<small class="lastline">${esc(g.last)}</small>` : ""}${extra}</span><span class="sc">${g.status === "playing" ? `${mine}<small>cards</small>` : g.loser === S.me.id ? "💩" : "😅"}</span></a>`;
}

function ago(t) { const m = Math.round((Date.now() - t) / 60000); return m < 60 ? `${m} min ago` : `${Math.round(m / 60)} h ago`; }

/** An invite link anyone can use, sent with the phone's Share sheet (or copied). */
async function makeInvite() {
  try {
    const r = await api("/invites", { method: "POST", body: { players: NEW.crew.filter(isHouse), settings: NEW.rules } });
    r.url = `${location.origin}/#/join/${r.code}`;
    const text = `Fancy a hand of Guffhead with me? It's the card game with the rude name. Tap to join, no login needed:`;
    $("inviteOut").innerHTML = `<p class="linkbox"><span>${esc(r.url)}</span></p><div class="row2"><button class="btn small gold" id="invShare">📣 Share it</button><button class="btn small ghost" id="invCopy">Copy link</button></div><p class="small soft">Works once, for one person, for a week. When they join, the game turns up in your tables.</p>`;
    $("invCopy").onclick = async () => { try { await navigator.clipboard.writeText(`${text} ${r.url}`); toast("Copied. Paste it into a message."); } catch { toast(r.url, 6000); } };
    $("invShare").onclick = async () => { try { if (navigator.share) await navigator.share({ text, url: r.url }); else { await navigator.clipboard.writeText(`${text} ${r.url}`); toast("Copied. Paste it into a message."); } } catch {} };
    if (navigator.share) { try { await navigator.share({ text, url: r.url }); } catch {} }
  } catch (e) { toast(e.message); }
}

/* ---------- the join page: someone's opened an invite link ---------- */
async function renderJoin(code) {
  $("app").innerHTML = `<p class="loading">Finding your seat…</p>`;
  let inv;
  try { inv = (await api(`/invites/${code}`)).invite; } catch (e) { $("app").innerHTML = `<section class="door"><p class="patter">${esc(e.message)}</p><p class="foot"><a href="#/">Guffhead</a></p></section>`; return; }
  const others = inv.bots.map((b) => (b === "guffbot" ? "GuffBot" : "Ms GuffBot"));
  const mine = S.token && S.me;
  const isHost = mine && S.me.id === inv.host;
  let action;
  if (inv.status === "expired") action = `<p class="patter">This invite has run out (they last a week). Ask ${esc(inv.hostName)} for a new one.</p>`;
  else if (inv.status === "used" && !mine) action = `<p class="patter">This invite's been used. Ask ${esc(inv.hostName)} for a new one.</p>`;
  else if (isHost && inv.status === "open") action = `<p class="patter">This is your own invite link. Send it to someone: whoever opens it first gets the seat.</p><p class="foot"><a href="#/">Back to your tables</a></p>`;
  else if (mine) action = `<button class="btn gold big" id="joinMe">${inv.status === "used" ? "To the game ▸" : `Pull up a stool as ${esc(S.me.name)}`}</button>`;
  else action = `<form id="joinForm" class="card-panel form"><label>What's your name? <input id="gname" maxlength="20" autocomplete="given-name" autocapitalize="words" required placeholder="First name"></label><button class="btn gold" type="submit">Pull up a stool</button><p class="err" id="joinErr" hidden></p></form>`;
  $("app").innerHTML = `
    <section class="door join">
      <div class="doorman">${dressed("guffbot", seedOf(code), 150) || headOf("guffbot", 110)}</div>
      <p class="patter"><b>${esc(inv.hostName)}</b> has saved you a seat in the back room for a hand of Guffhead${others.length ? `, with ${esc(others.join(" and "))}` : ""}.</p>
      ${action}
      <details class="howto"><summary>How to play</summary>
        <p>Everyone gets three cards face down, three face up and three in hand. Play a card at least as high as the top of the pile, or pick the whole pile up. Get rid of all your cards. The last one holding cards is the Guffhead, and wears the 💩 until someone else loses.</p>
        <ul class="rulelist">${inv.rules.map(([k, v]) => `<li><b>${esc(k)}</b> ${esc(v)}</li>`).join("")}</ul>
        <p>It's played at your own pace: take your go whenever you like, and come back to this link on this phone to carry on.</p>
      </details>
    </section>`;
  const go = async (name) => {
    const r = await api(`/invites/${code}/join`, { method: "POST", body: { name } });
    if (r.token) { S.token = r.token; S.me = r.me; store.set("gh:token", r.token); store.set("gh:me", r.me); }
    shuffleSound();
    location.hash = `#/game/${r.game}`;
  };
  if ($("joinMe")) $("joinMe").onclick = () => go().catch((e) => toast(e.message));
  if ($("joinForm")) $("joinForm").onsubmit = (e) => { e.preventDefault(); go($("gname").value).catch((er) => { const x = $("joinErr"); x.textContent = er.message; x.hidden = false; }); };
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
  if ($("pushOn")) $("pushOn").onclick = () => turnOnPush();
  if ($("pushOff")) $("pushOff").onclick = async () => {
    try { const reg = await navigator.serviceWorker.getRegistration(); const sub = reg ? await reg.pushManager.getSubscription() : null; if (sub) { await api("/push/unsubscribe", { method: "POST", body: { endpoint: sub.endpoint } }).catch(() => {}); await sub.unsubscribe(); } toast("Notifications off for this device."); wireNotify(); } catch (e) { toast(e.message); }
  };
  if ($("pushTest")) $("pushTest").onclick = async () => { try { const r = await api("/push/test", { method: "POST" }); toast(r.sent ? "Sent. It should arrive in a moment." : `Nothing sent. ${r.why || ""}`, 5000); } catch (e) { toast(e.message); } };
}

async function turnOnPush() {
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
  try { r = await api(`/games/${id}?since=0&here=1&doing=looking&chat=0`); } catch (e) { $("app").innerHTML = `<p class="err">${esc(e.message)}</p><p><a href="#/">Back to the bar</a></p>`; return; }
  S.lastHere = Date.now();
  S.evs = r.game.g.events.slice();
  S.here = r.here || [];
  S.doing = r.doing || {};
  S.tab = null;
  S.chat = r.chat || []; S.chatId = S.chat.length ? S.chat[S.chat.length - 1].id : 0;
  // catch up from whichever is later: what this phone last saw, or your own last move (so a new phone, or a
  // different one, doesn't replay the whole game); never more than the last 20 goes
  const mineAt = [...S.evs].reverse().find((e) => e.p === S.me.id && !e.auto && !e.autopilot && ["play", "pickup", "flip", "ready"].includes(e.k));
  const last = Math.max(Number(store.get(seenKey(id)) || 0), mineAt ? mineAt.seq : 0, r.game.g.seq - 20);
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
  const here = Date.now() - S.lastHere > 7000 || S.doingDirty;
  const what = S.sel.length ? "picking" : "looking";
  try {
    const r = await api(`/games/${G.id}?since=${maxSeq()}&chat=${S.chatId}${here ? `&here=1&doing=${what}` : ""}`);
    S.doingDirty = false;
    const prevDoing = JSON.stringify(S.doing);
    S.doing = r.doing || {};
    if (here) S.lastHere = Date.now();
    if (!S.G || S.G.id !== G.id) return;
    if (r.chat && r.chat.length) { S.chat = [...S.chat, ...r.chat].slice(-80); S.chatId = r.chat[r.chat.length - 1].id; renderChat(); refreshPeek(); }
    const wasLive = S.here.length > 0;
    S.here = r.here || [];
    if (r.game.g.seq !== G.g.seq || r.game.status !== G.status) { const last = maxSeq(); mergeEvents(r.game.g.events); show(r.game, last); }
    else if (wasLive !== S.here.length > 0 || prevDoing !== JSON.stringify(S.doing)) { if (!S.sel.length || !G.myGo) renderGame(); else renderPresence(); }
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
    S.sel = []; S.warn = null; S.warnOk = false;
    mergeEvents(r.game.g.events);
    if (body.act === "play" || body.act === "flip") { snap(body.cards ? body.cards.length : 1); buzz(12); }
    S.moment = rareMoment(S.evs.filter((e) => e.seq > before));
    S.busy = false;
    show(r.game, before, true);
    if (body.act !== "setup") offerNext(G.id);
  } catch (e) {
    S.busy = false;
    toast(e.message);
    if (e.status === 409) openGame(G.id, true); else if (S.G === G) renderGame();
  }
}

/** A new view of the game: catch up on what happened since `since`, then draw it. */
function show(G, since, mine = false) {
  // the pile as this phone last showed it, so the catch-up can replay it card by card
  const prevPile = S.G && S.G.id === G.id ? S.G.g.pile.slice() : null;
  S.G = G;
  if (location.hash !== `#/game/${G.id}`) return;
  // what to replay: everything after `since`, except the moves I made myself just now (I saw myself make them)
  const all = S.evs.filter((e) => e.seq > since);
  const fresh = all.filter((e) => !(mine && e.p === S.me.id && !e.auto && !e.autopilot && e.k !== "out" && e.k !== "over"));
  const toPlay = fresh.filter((e) => weight(e) !== "small");
  store.set(seenKey(G.id), G.g.seq);
  if (!toPlay.length || reduced()) { renderGame(); return; }
  catchUp(toPlay, since > 0 && !mine && toPlay.length > 2, prevPile ? { all, pile: prevPile } : null);
}

/* ---------- the catch-up: what happened while you were away (or just now, live) ----------
   It plays over the table, so nothing below moves while you're about to tap (the usability review). Tap it to
   jump to the next go; Skip ends it. A long queue goes faster. */
async function catchUp(evs, away, track = null) {
  S.playing = true; S.skip = false;
  renderGame(true);
  const stage = $("stage");
  if (!stage) { S.playing = false; return; }
  const names = namesFor(S.G);
  // slow enough to follow (Carl, 10 Nov 2026: against the house it went too fast); a long queue still speeds up
  const per = evs.length > 10 ? 650 : evs.length > 5 ? 1000 : 1300;
  // with the pile as it was, each play lands on the real pile, burns burn it and pick-ups clear it
  let pile = track ? track.pile.slice() : null;
  S.stagePile = !!track;
  stage.classList.toggle("strip", !!track);
  const showPile = (cls) => {
    if (!pile) return;
    const el = $("pile");
    if (el) el.innerHTML = `${pileHtml({ pile }, S.G.settings)}<small>${pile.length ? `${pile.length} on the pile` : "Empty"}</small>`;
    if (cls && el) { const f = el.querySelector(".fan"); if (f) f.classList.add(cls); }
    const nd = document.querySelector(".table .need");
    if (nd) { nd.textContent = needWords(pile, S.G.settings); nd.className = `need${needClass({ pile }, S.G.settings)}`; }
  };
  const apply = (e) => {
    if (!pile) return null;
    if (e.k === "play") { pile.push(...e.cards); if (e.burn) return "burn"; }
    else if (e.k === "flip" && !e.ok) pile.push(e.card);
    else if (e.k === "pickup") return "pickup";
    return null;
  };
  showPile();
  const shown = new Set(evs.map((e) => e.seq));
  const queue = track ? track.all : evs;
  stage.hidden = false;
  stage.innerHTML = `<div class="stagehead">${away ? "While you were away" : ""}<span class="stagecount" id="stagecount"></span><button class="linkish" id="skip">Skip ▸▸</button></div><div class="stagebody" id="stagebody"></div>`;
  $("skip").onclick = (e) => { e.stopPropagation(); S.skip = true; if (S.wake) S.wake(); };
  stage.onclick = () => { if (S.wake) S.wake(); };
  // bad news first, landed with a bit of humour (Words and Guff's "they bingo'd against me")
  if (away) {
    const ouch = evs.find((e) => (e.k === "pickup" && e.p === S.me.id && e.n >= 6) || (e.k === "play" && e.burn && e.p !== S.me.id && e.pile >= 8));
    if (ouch) {
      const body = $("stagebody");
      body.innerHTML = `<div class="ouch">${ouch.k === "pickup" ? ["🫠", "😵‍💫", "🙈", "🤦"][ouch.seq % 4] : ["🔥", "🧯", "🚒"][ouch.seq % 3]}<small>${ouch.k === "pickup" ? `You picked up ${ouch.n}` : `${esc(names[ouch.p])} burned ${ouch.pile} cards`}</small></div>`;
      buzz([60, 40, 60]);
      await wait(1300);
    }
  }
  let i = 0;
  for (const e of queue) {
    if (S.skip || !S.G) break;
    const after = apply(e);
    if (!shown.has(e.seq)) { if (after) { pile = []; } showPile(); continue; }   // my own move: already seen, just keep the pile right
    const body = $("stagebody");
    if (!body) break;
    i++;
    const c = $("stagecount"); if (c && evs.length > 1) c.textContent = `${i} of ${evs.length}`;
    const big = weight(e) === "big";
    body.innerHTML = stageCard(e, names);
    body.firstElementChild.classList.add(big ? "pop" : "slide");
    showPile();
    if (e.k === "play" && e.burn) { whoosh(); buzz([40, 30, 40]); body.querySelector(".stagecards") && body.querySelector(".stagecards").classList.add("burning"); }
    else if (e.k === "play" || e.k === "flip") snap(e.cards ? e.cards.length : 1);
    if (e.k === "over") buzz([80, 40, 120]);
    if (after === "burn") { showPile("burning"); await wait(per * 0.9); pile = []; showPile(); await wait(per * 0.8); continue; }
    if (after === "pickup") { showPile("scooped"); await wait(per * 0.7); pile = []; showPile(); await wait(per * 0.8); continue; }
    await wait(big ? per * 1.5 : per);
  }
  S.stagePile = false;
  S.playing = false; S.wake = null;
  if (S.G) renderGame();
}
/** A pause the player can cut short by tapping the stage. */
function wait(ms) { return new Promise((r) => { const t = setTimeout(done, ms); function done() { clearTimeout(t); S.wake = null; r(); } S.wake = done; }); }
/** GuffBot's pose for a big moment (CountGuff's poses): cheer, wince, clap, gloat or sulk, or nothing. */
function poseFor(e) {
  const me = S.me.id;
  if (e.k === "play" && e.burn) return e.p === me ? "cheer" : isHouse(e.p) ? "gloat" : "clap";
  if (e.k === "pickup" && e.n >= 6) return e.p === me ? "wince" : isHouse(e.p) ? "sulk" : "shrug";
  if (e.k === "out") return e.p === me ? "clap" : null;
  if (e.k === "over" && e.loser) return e.loser === me ? "gloat" : isHouse(e.loser) ? "sulk" : "cheer";
  return null;
}
function stageCard(e, names) {
  const who = e.p ? `<span class="stagewho">${headOf(e.p, 34)}</span>` : "";
  let cards = "";
  if (e.k === "play") cards = S.stagePile ? "" : e.cards.map((c) => card(c, { size: "md", s: S.G.settings })).join("");
  if (e.k === "flip") cards = card(e.card, { size: S.stagePile ? "sm" : "md", cls: e.ok ? "" : "nogo", s: S.G.settings });
  if (e.k === "pickup") cards = S.stagePile ? "" : `<span class="pickfan">${Array.from({ length: Math.min(e.n, 7) }, (_, i) => `<span style="--i:${i}">${back({ size: "sm" })}</span>`).join("")}</span>`;
  if (e.k === "over") cards = e.loser ? headOf(e.loser, 56, true, true) : "";
  const tag = e.autopilot ? `<small class="tag">GuffBot played this for ${esc(names[e.p] === "You" ? "you" : names[e.p])}</small>` : e.auto ? `<small class="tag">no choice, played for ${esc(names[e.p] === "You" ? "you" : names[e.p])}</small>` : "";
  const talk = S.talk ? comment(e, names, S.me.id) : null;
  const pose = S.talk && window.Jumper && window.Jumper.pose ? poseFor(e) : null;
  return `<div class="stagecard ${e.k}${e.burn ? " burn" : ""}">${who}<span class="stagecards">${cards}</span><span class="stagetext">${esc(describe(e, names, S.me.id) || "")}${tag}${talk ? `<i class="talk">${esc(talk)}</i>` : ""}</span>${pose ? `<span class="pose">${window.Jumper.pose(seedOf(`${S.G.id}:${e.seq}`), 64, pose)}</span>` : ""}</div>`;
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
  const nextId = g.phase === "play" && G.status === "playing" ? nextAfter(g, g.turn) : null;
  const humans = G.players.filter((p) => !isHouse(p));
  const chatty = !G.watching && humans.length > 1;
  if (!S.tab || (S.tab === "chat" && !chatty)) S.tab = chatty ? "chat" : "log";
  const keep = window.scrollY;
  // a live game fits on one screen (Carl, 11 Nov 2026: "I find myself accidentally scrolling the screen quite a lot"):
  // chat, log, rules and the table go in a sheet that pulls up from the bar at the bottom
  const fit = G.status === "playing" && g.phase === "play";
  document.body.classList.toggle("fit", fit);
  if (!fit) S.sheet = false;
  const extras = `<div class="toggles"><button class="chip${S.tips ? " on" : ""}" data-toggle="tips" aria-pressed="${S.tips}">🎓 Tips ${S.tips ? "on" : "off"}</button><button class="chip${S.talk ? " on" : ""}" data-toggle="talk" aria-pressed="${S.talk}">🎙️ GuffBot ${S.talk ? "on" : "off"}</button><button class="chip${sound.on ? " on" : ""}" data-toggle="sound" aria-pressed="${sound.on}">${sound.on ? "🔊" : "🔇"}</button></div>`;
  const tabs = `<nav class="tabs4" role="tablist">
        ${chatty ? tabBtn("chat", `💬 Chat${unread() ? ` <span class="count">${unread()}</span>` : ""}`) : ""}
        ${tabBtn("log", "📜 Log")}${tabBtn("rules", "📏 Rules")}${tabBtn("table", "🪑 Table")}
      </nav>`;
  app.innerHTML = `
    <section class="game${staging ? " staging" : ""}${fit ? " fit" : ""}">
      ${fit ? "" : `<div class="status">${statusLine(G)}</div>`}
      <div class="opps n${opps.length}">${opps.map((p) => oppPod(G, p, turnId, nextId)).join("")}</div>
      <div class="table" id="table">
        <div class="pack">${g.draw ? `<span class="stack">${back({ size: "sm" })}${g.draw > 1 ? back({ size: "sm", cls: "under" }) : ""}</span><small>Pack ${g.draw}</small>` : `<span class="stack empty"></span><small>Pack gone</small>`}</div>
        <div class="pile" id="pile">${pileHtml(g, s)}<small>${g.pile.length ? `${g.pile.length} on the pile` : "Empty"}</small></div>
        <div class="burnt">${g.burned ? `<span class="ash">🔥</span><small>${g.burned} burned</small>` : `<span class="ash dim">🔥</span><small>None burned</small>`}</div>
        ${g.phase === "play" ? `<div class="need${needClass(g, s)}">${esc(needWords(g.pile, s))}</div>` : ""}
        ${s.seven === "reverse" && g.phase === "play" && g.seats.filter((p) => !p.out).length > 2 ? `<div class="dir${S.lastDir && S.lastDir !== g.dir ? " flipped" : ""}" title="Direction of play">${g.dir === 1 ? "↻" : "↺"}</div>` : ""}
        <div class="stage" id="stage" hidden></div>
      </div>
      ${chatty && !fit ? chatPeek() : ""}
      ${fit ? turnBanner(G, turnId) : ""}
      ${meSeat ? myArea(G, meSeat, turnId) : `<p class="watching card-panel">👀 You're watching this one. <a href="#/replay/${G.id}">Watch the replay ▸</a></p>`}
      <div class="actions" id="actions">${actionsHtml(G)}</div>
      ${!fit && G.myGo && S.tips && G.hint && !staging ? `<p class="hint">🎓 ${esc(G.hint)}</p>` : ""}
      ${fit ? momentChip(G) : lastTalk(G)}
      ${G.status === "finished" && !staging ? finalCard(G) : ""}
      ${fit ? `<div class="sheetback"${S.sheet ? "" : " hidden"} id="sheetback"></div>
      <div class="gsheet${S.sheet ? " open" : ""}" id="sheet" role="dialog" aria-label="Chat, log, rules and the table">
        <button class="sheetgrip" id="sheetClose" aria-label="Close">▾ Back to the cards</button>
        ${tabs}
        <div class="tabpanel" id="tabpanel">${S.sheet ? tabPanel(G) : ""}</div>
        ${extras}
      </div>
      <nav class="gamebar" aria-label="More">${chatty ? `<button data-sheet="chat">💬 Chat${unread() ? ` <span class="count">${unread()}</span>` : ""}</button>` : ""}<button data-sheet="log">📜 Log</button><button data-sheet="rules">📏 Rules</button><button data-sheet="table">🪑 Table</button></nav>`
      : `${extras}${tabs}<div class="tabpanel" id="tabpanel">${tabPanel(G)}</div>`}
      <p class="foot"><a href="https://hub.carlosfandango.net/">All the Guff games</a><br><small class="soft">Tonight's wallpaper: ${esc(pickPaper(seedOf(G.id)).name.toLowerCase())}</small></p>
    </section>`;
  S.lastDir = g.dir;
  if (staging) window.scrollTo(0, keep);
  wireGame();
  renderChat();
  fitHand();
  if (!staging) { bringMyGoIntoView(G); startIdle(G); }
}
/** Who's wearing what tonight, in the pub's own words. */
function clobber(G) {
  if (!window.Pub) return "";
  return `<ul class="clobber">${G.players.filter((p) => !isHouse(p)).map((p) => `<li>${esc(window.Pub.caption(p === S.me.id ? "" : nameOf(p), seedOf(`${G.id}:${p}`), dressOf(p)))}</li>`).join("")}</ul>`;
}
const tabBtn = (k, label) => `<button class="tabbtn${S.tab === k ? " on" : ""}" data-tab4="${k}" role="tab" aria-selected="${S.tab === k}">${label}</button>`;
function tabPanel(G) {
  const s = G.settings;
  if (S.tab === "chat") return `<div id="chat" class="chat"></div>${quickEmojiRow()}<form id="chatForm" class="chatform"><input id="chatText" maxlength="280" placeholder="Say something to the table" autocomplete="off"><button class="btn small">Say</button></form>`;
  if (S.tab === "log") return logHtml(G);
  if (S.tab === "rules") return `<ul class="rulelist">${describeRules(s).map(([k, v]) => `<li><b>${esc(k)}</b> ${esc(v)}</li>`).join("")}<li><b>Idle timer</b> ${s.idleHours ? `GuffBot plays anyone's go after ${s.idleHours} hours.` : "Off: we wait."}</li></ul><details class="howto"><summary>How to play</summary>${howTo(s)}</details>`;
  return `<div class="cast">${G.players.map((p) => `<figure class="${p === S.me.id ? "me" : ""}${p === G.loser ? " loser" : ""}">${figureOf(G.id, p, 110, wears(G, p), S.drop && wears(G, p))}<figcaption>${esc(you(p))}${wears(G, p) ? " 💩" : ""}</figcaption></figure>`).join("")}</div>${clobber(G)}
    ${G.status === "playing" && G.players.includes(S.me.id) ? `<button class="btn ghost" id="resign">Leave the table (you'll be the Guffhead)</button>` : ""}`;
}
/** Who plays after seat i, in the direction of play, skipping anyone who's out. */
function nextAfter(g, i) {
  const n = g.seats.length;
  for (let k = 1; k <= n; k++) { const j = (((i + g.dir * k) % n) + n) % n; if (!g.seats[j].out) return g.seats[j].id; }
  return null;
}
/** Everyone's cards left as a bar, so you can see who's close to safe (CountGuff's progress bar, for a race). */
function raceStrip(G) {
  if (G.g.phase !== "play" && G.status !== "finished") return "";
  const left = (p) => (Array.isArray(p.hand) ? p.hand.length : p.hand) + p.up.length + p.down;
  const max = Math.max(9, ...G.g.seats.map(left));
  return `<div class="race" aria-label="Cards left">${G.g.seats.map((p) => { const n = left(p); return `<span class="lane${p.out ? " safe" : ""}${p.id === S.me.id ? " me" : ""}" title="${esc(you(p.id))}: ${n} cards"><i style="width:${Math.max(4, (100 * n) / max)}%"></i><b>${esc(p.id === S.me.id ? "You" : nameOf(p.id).replace(/^Ms /, "Ms "))}</b><em>${p.out ? "safe" : n}</em></span>`; }).join("")}</div>`;
}
/** A big hand overlaps like a fanned hand in real life, so it stays on one row (and never runs off the page). */
function fitHand() {
  const h = $("hand");
  if (!h) return;
  const cards = h.querySelectorAll(".card");
  h.classList.remove("two");
  if (cards.length < 2) return;
  const w = cards[0].getBoundingClientRect().width;
  const room = h.clientWidth - 4;
  const fit = (n) => (n * w + (n - 1) * 6 <= room ? 6 : (room - n * w) / (n - 1));
  let ov = fit(cards.length);
  // never cover more than half a card (it must stay readable and tappable): a really big hand goes onto two rows
  if (ov < -w * 0.5) { h.classList.add("two"); ov = Math.max(-w * 0.5, fit(Math.ceil(cards.length / 2))); }
  h.style.setProperty("--ov", `${ov}px`);
}
window.addEventListener("resize", () => fitHand());
/** When it becomes your go, scroll so your cards and the Play button are on screen (once per go, never mid-chat). */
function bringMyGoIntoView(G) {
  if (!G.myGo || G.status !== "playing") return;
  const key = `${G.id}:${G.g.seq}`;
  if (S.goSeen === key) return;
  S.goSeen = key;
  const a = document.activeElement;
  if (a && (a.id === "chatText" || a.tagName === "SELECT")) return;
  const target = $("actions") && $("actions").children.length ? $("actions") : document.querySelector(".mine");
  if (!target) return;
  const r = target.getBoundingClientRect();
  if (r.bottom <= window.innerHeight - 8 && r.top >= 0) return;
  target.scrollIntoView({ block: "end", behavior: reduced() ? "auto" : "smooth" });
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

function oppPod(G, p, turnId, nextId) {
  const g = G.g;
  const hand = typeof p.hand === "number" ? p.hand : p.hand.length;
  const here = S.here.includes(p.id);
  const busy = S.doing[p.id];
  const status = p.out ? "" : p.id === turnId ? `<small class="podstatus go">${here && busy === "picking" ? "Picking…" : "Their go"}</small>` : here ? `<small class="podstatus">looking 👀</small>` : p.id === nextId ? `<small class="podstatus next">Next</small>` : "";
  const turn = p.id === turnId;
  const known = (p.known || []).slice();
  const out = p.out ? `<span class="outbadge">${p.out === 1 ? "Out first" : "Out"}</span>` : "";
  return `<div class="pod${turn ? " turn" : ""}${p.out ? " isout" : ""}${G.loser === p.id ? " guffhead" : ""}">
    <div class="podhead">${headOf(p.id, 34, wears(G, p.id), S.drop && wears(G, p.id))}<span class="podname">${esc(nameOf(p.id))}${here ? `<i class="dot" title="At the table now"></i>` : ""}${status}</span>${out}<span class="handcount" title="${hand} in hand">${hand ? `${back({ size: "xs" })}<b>${hand}</b>` : `<b class="none">0</b>`}</span></div>
    <div class="podcards">
      <span class="tablecards">${tableStack(p, "op", G.settings)}</span>
    </div>
    ${known.length ? `<div class="known" title="Cards everyone saw them pick up"><span class="kl">Picked up</span>${sortCards(known, G.settings).slice(-5).reverse().map((c) => `<span class="kc${c[1] === "H" || c[1] === "D" ? " red" : ""}">${RANK[c[0]] || c[0]}${SUIT[c[1]]}</span>`).join("")}${known.length > 5 ? `<span class="kmore">+${known.length - 5}</span>` : ""}</div>` : ""}
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
  // while you wait you can pick the cards you mean to play (Words and Guff lets you play with the board off-turn)
  const prepick = G.status === "playing" && G.g.phase === "play" && !me.out && !G.myGo && zone === "hand";
  if (myGo) S.sel = S.sel.filter((c) => playable.has(c));
  const waiting = G.status === "playing" && G.g.phase === "play" && !me.out && !myGo;
  return `<div class="mine${myGo ? " turn" : ""}${waiting ? " waiting" : ""}${me.out ? " isout" : ""}">
    <div class="myhead">${headOf(me.id, 34, wears(G, me.id), S.drop && wears(G, me.id))}<b>You</b>${me.out ? `<span class="outbadge">${me.out === 1 ? "Out first" : "Out"}</span>` : ""}${wears(G, me.id) && G.status === "playing" ? `<small class="soft">💩 from last time</small>` : ""}</div>
    <div class="mytable">${tableStack(me, "sm", s, { tapUp: myGo && zone === "up", tapDown: myGo && zone === "down" })}</div>
    ${prepick && S.sel.length ? `<p class="prepicked">Picked for your go. It'll be played only if it still goes, and only when you tap Play.</p>` : ""}
    <div class="hand" id="hand">${hand.length ? hand.map((c) => card(c, { size: "md", tap: myGo || prepick, sel: S.sel.includes(c), dim: myGo && !playable.has(c), s })).join("") : me.out ? `<p class="soft">You're out. ${G.status === "playing" ? "Sit back and enjoy the show." : ""}</p>` : `<p class="soft small">${zone === "up" ? "Hand's empty: play from your face-up cards." : zone === "down" ? "Blind now: tap a face-down card." : ""}</p>`}</div>
  </div>`;
}

/** Whose go it is, big, in one place, right above your cards (Carl, 11 Nov 2026: "Sometimes I think it's my go but it
 *  isn't"). Gold and pulsing when it's yours; dark, with their face, when it isn't, and how many goes until yours. */
function turnBanner(G, turnId) {
  const g = G.g, me = g.seats.find((p) => p.id === S.me.id);
  if (S.playing) return `<div class="turnbar catching"><span class="tb-main">Catching up…</span><small>Tap the table to skip ahead</small></div>`;
  if (!turnId) return "";
  if (G.myGo) {
    const o = G.options;
    const tip = S.tips && G.hint ? `🎓 ${G.hint.split(/(?<=\.)\s/)[0]}` : "";
    const sub = !o ? "" : o.zone === "down" ? "Flip one of your face-down cards" : !o.plays.length ? "Nothing will go: pick up the pile" : tip || (S.sel.length ? "Tap Play when you're ready" : "Tap a card, then Play");
    const last = lastLine(G);
    return `<div class="turnbar yours" role="status">${headOf(S.me.id, 32, wears(G, S.me.id))}<span class="tb-main">Your go</span>${last ? `<small class="tb-last">${last.html}</small>` : ""}<small>${esc(sub)}</small>${last ? last.throws : ""}</div>`;
  }
  // how many goes until mine
  let wait = "";
  if (me && !me.out) {
    const between = [];
    let i = g.turn;
    for (let k = 0; k < g.seats.length; k++) {
      const id = nextAfter(g, i);
      if (!id || id === S.me.id) break;
      between.push(id);
      i = g.seats.findIndex((p) => p.id === id);
    }
    wait = between.length === 0 ? "You're next" : `Then ${between.map((id) => esc(nameOf(id))).join(", then ")}, then you`;
  } else if (me && me.out) wait = "You're out: sit back and enjoy it";
  const who = isHouse(turnId) ? `${esc(nameOf(turnId))}'s thinking…` : `${esc(nameOf(turnId))}'s go`;
  const here = S.here.includes(turnId) && !isHouse(turnId);
  const busy = here && S.doing && S.doing[turnId] === "picking";
  const last = lastLine(G);
  return `<div class="turnbar theirs${wait === "You're next" ? " soon" : ""}" role="status">${headOf(turnId, 32, wears(G, turnId))}<span class="tb-main">${who}${here ? ` <i class="dot" title="At the table now"></i>` : ""}</span><small class="tb-wait">${busy ? "Picking cards… · " : ""}${wait}</small>${last ? `<small class="tb-last">${last.html}</small>${last.throws}` : ""}</div>`;
}

function actionsHtml(G) {
  if (G.status !== "playing" || !G.myGo || G.g.phase !== "play" || S.playing) return "";
  const o = G.options;
  if (!o) return "";
  if (o.zone === "down") return `<p class="prompt">Tap one of your face-down cards to flip it.</p>`;
  const sel = S.sel;
  const label = S.warn ? S.warn : sel.length ? `Play ${sel.length === 1 ? `the ${cardName(sel[0])}` : `${["", "", "two", "three", "four"][sel.length] || sel.length} ${pluralOf(sel[0])}`}` : o.plays.length ? "Pick a card (double-tap to play)" : "Nothing will go";
  return `<button class="btn gold big${S.warn ? " armed" : ""}" id="playBtn"${sel.length ? "" : " disabled"}>${esc(label)}</button>${o.pickUp ? `<button class="btn ghost" id="pickBtn">Pick up ${G.g.pile.length}</button>` : ""}`;
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

function momentChip(G) {
  return S.moment && !G.watching && !S.playing ? `<div class="talkbox"><button class="chip share" id="shareMoment" data-what="${S.moment.what}">📣 ${esc(S.moment.text)} Share it</button></div>` : "";
}
/** What just happened, in one line, for the banner: the last move, then GuffBot's quip on it if he's on. */
function lastLine(G) {
  if (S.playing) return null;
  const names = namesFor(G);
  const recent = S.evs.slice(-12).reverse();
  const lastMove = recent.find((e) => ["play", "pickup", "flip", "skip", "out", "over"].includes(e.k));
  if (!lastMove) return null;
  // GuffBot talks about the move shown, and calls you by your name ("Carl picks up 7", not "You picks up 7")
  const real = Object.fromEntries(G.players.map((p) => [p, nameOf(p)]));
  const quip = S.talk ? comment(lastMove, real, S.me.id) : null;
  const chatty = !G.watching && G.players.filter((p) => !isHouse(p)).length > 1;
  const throwable = chatty && lastMove.p && lastMove.p !== S.me.id && !isHouse(lastMove.p);
  return {
    html: `<span class="tb-move">${esc(describe(lastMove, names, S.me.id))}${lastMove.autopilot ? " (GuffBot played it)" : ""}</span>${quip ? ` <span class="tb-quip">${esc(quip)}</span>` : ""}`,
    throws: throwable ? `<span class="throw tb-throw">${["😂", "😱", "👏"].map((e) => `<button data-throw="${e}" data-seq="${lastMove.seq}" aria-label="Throw ${e}">${e}</button>`).join("")}</span>` : "",
  };
}
function lastTalk(G) {
  if (S.playing) return "";
  const names = namesFor(G);
  const recent = S.evs.slice(-12).reverse();
  const roomLine = recent.map(room).find(Boolean);
  const real = Object.fromEntries(G.players.map((p) => [p, nameOf(p)]));
  const line = S.talk ? recent.slice(0, 6).map((e) => comment(e, real, S.me.id)).find(Boolean) : null;
  const lastMove = recent.find((e) => ["play", "pickup", "flip", "skip", "out", "over"].includes(e.k));
  const chatty = !G.watching && G.players.filter((p) => !isHouse(p)).length > 1;
  const throwable = chatty && lastMove && lastMove.p && lastMove.p !== S.me.id && !isHouse(lastMove.p);
  const moment = S.moment && !G.watching ? `<button class="chip share" id="shareMoment" data-what="${S.moment.what}">📣 ${esc(S.moment.text)} Share it</button>` : "";
  return `<div class="talkbox">${moment}${lastMove ? `<p class="lastmove">${headOf(lastMove.p || lastMove.loser, 22)} <span>${esc(describe(lastMove, names, S.me.id))}${lastMove.autopilot ? ` <small class="tag">(GuffBot played it)</small>` : ""}</span>${throwable ? `<span class="throw">${["😂", "😱", "👏"].map((e) => `<button data-throw="${e}" data-seq="${lastMove.seq}" aria-label="Throw ${e}">${e}</button>`).join("")}</span>` : ""}</p>` : ""}${line ? `<p class="guffbot">${headOf("guffbot", 22)} ${esc(line)}</p>` : ""}${roomLine && S.talk ? `<p class="room">${esc(roomLine)}</p>` : ""}</div>`;
}

function finalCard(G) {
  const names = namesFor(G);
  const order = G.g.finished;
  const lost = G.loser === S.me.id;
  const human = G.players.filter((p) => !isHouse(p));
  const fuss = (G.fuss || []).map((f) => `<p class="fussline ${f.kind}"><span class="trophy">${f.emoji}</span> <b>${esc(f.pid === S.me.id ? "You" : names[f.pid])}</b> ${esc(f.pid === S.me.id ? f.text.replace(/^burned/, "burned") : f.text)}</p>`).join("");
  const loserName = G.loser ? (G.loser === S.me.id ? S.me.name : G.names[G.loser]) : null;
  return `<div class="final${lost ? " lost" : ""}">
    <div class="board">${boardSvg({ id: G.id, names: G.players.map((p) => (p === S.me.id ? S.me.name : G.names[p])), loser: loserName, order: order.map((p) => (p === S.me.id ? S.me.name : G.names[p])), size: 280 })}</div>
    ${lost ? "" : `<div class="bigemoji">${["🍺", "🎉", "🥳", "🕺🏻", "😅", "🙌", "🍻", "😎", "🫡", "🎊"][seedOf(G.id) % 10]}</div>`}
    ${G.loser ? `<div class="crowning">${headOf(G.loser, 84, true, S.drop)}</div>` : ""}
    <h3>${lost ? "You're the Guffhead" : `${esc(names[G.loser] || "Someone")} is the Guffhead`}</h3>
    ${fuss ? `<div class="fusses">${fuss}</div>` : ""}
    <ol class="order" aria-label="Finishing order">${order.map((p) => `<li>${headOf(p, 24)} ${esc(names[p])}</li>`).join("")}${G.loser ? `<li class="last">${headOf(G.loser, 24)} ${esc(names[G.loser])} 💩</li>` : ""}</ol>
    <div class="endbtns">
      ${G.watching ? "" : G.next ? `<a class="btn gold" href="#/game/${G.next}">To the next game ▸</a>` : `<button class="btn gold" id="again">Deal again${G.loser && !isHouse(G.loser) && G.loser !== S.me.id ? ` (${esc(names[G.loser])} deals)` : ""}</button>`}
      <div class="row2"><a class="btn ghost" href="#/replay/${G.id}">📼 Watch the replay</a>${G.watching ? "" : `<button class="btn ghost" id="shareGame">📣 Share</button>`}</div>
    </div>
    <p class="small soft">${human.length > 1 ? (G.reigning && G.reigning !== G.loser ? `The 💩 passes from ${esc(names[G.reigning])} to ${esc(names[G.loser])}.` : G.reigning === G.loser ? `${esc(names[G.loser])} keeps the 💩. Again.` : `${esc(names[G.loser])} wears the 💩 until someone else loses.`) : "Practice against the house: it's in your record, not the league."}</p>
    ${S.me.guest ? `<p class="guestnote">Enjoyed that? ${esc(S.me.hostName || "Your host")} can deal you another, or ask them for your own login to all the Guff games.</p>` : ""}
    ${crackerHtml(G)}
  </div>`;
}

/* ---------- the cracker (Christmas, from CountGuff): pull it once on the end card in December ---------- */
const CRACKER_JOKES = [
  ["Why did the 10 go to the bonfire?", "It was asked to burn the pile. It took it personally."],
  ["What's Ms GuffBot's favourite carol?", "Deck the Halls. She counted every card in it."],
  ["Why did GuffBot bring a ladder to the card game?", "He heard the stakes were high. They were a pickled egg."],
  ["What do you call a four of a kind on Christmas Day?", "A miracle. Also, a bonfire."],
  ["Why was the 2 so popular at the party?", "It goes with anything."],
  ["What did the Guffhead get for Christmas?", "The 💩. Again. Wrapped this time."],
  ["Why did Biscuit sit under the card table?", "Someone said there'd be a pile."],
  ["What's Pam's favourite card game?", "Last orders. Everybody loses."],
  ["Why did the ace refuse the 7?", "It didn't do small talk."],
  ["How does GuffBot keep his flat cap on in the snow?", "He doesn't. That's why it's a Santa hat this month."],
];
const CRACKER_GIFTS = ["a tiny pack of cards, no 10s", "a plastic moustache", "a fortune-telling fish, already curling", "a single die", "a keyring with no keys", "a bottle opener shaped like a pint", "a beer mat with a hole in it", "a whistle, confiscated by Pam"];
function crackerHtml(G) {
  if (!XMAS) return "";
  const r = Math.imul(seedOf(`${G.id}:cracker`), 2654435761) >>> 0;
  const joke = CRACKER_JOKES[r % CRACKER_JOKES.length], gift = CRACKER_GIFTS[(r >>> 8) % CRACKER_GIFTS.length];
  if (store.get(`gh:cracker:${G.id}`)) return `<div class="cracker done"><p class="small"><b>Cracker joke:</b> ${esc(joke[0])} <i>${esc(joke[1])}</i></p></div>`;
  return `<button class="cracker" id="cracker" data-q="${esc(joke[0])}" data-a="${esc(joke[1])}" data-gift="${esc(gift)}"><span class="crackersvg">🎉</span><span class="small">🎄 Pull the cracker</span></button>`;
}
function wireCracker(G) {
  const el = $("cracker");
  if (!el) return;
  el.onclick = () => {
    if (el.classList.contains("pulled")) return;
    el.classList.add("pulled");
    store.set(`gh:cracker:${G.id}`, 1);
    buzz([30, 30, 60]);
    el.innerHTML = `<span class="bang">BANG!</span><p class="joke"><b>${esc(el.dataset.q)}</b></p><p class="punch">${esc(el.dataset.a)}</p><p class="small soft">Inside: a paper hat and ${esc(el.dataset.gift)}.</p>`;
  };
}

function logHtml(G) {
  const names = namesFor(G);
  const rows = S.evs.slice(-80).map((e) => { const t = describe(e, names, S.me.id); return t ? `<li class="${e.k}${e.burn ? " burn" : ""}">${esc(t)}${e.autopilot ? " <small>(GuffBot played it)</small>" : e.auto ? " <small>(no choice)</small>" : ""}</li>` : ""; }).filter(Boolean).reverse();
  return `<ol class="evlog">${rows.join("")}</ol>`;
}

function renderChat() {
  const el = $("chat");
  if (!el) return;
  el.innerHTML = S.chat.length ? S.chat.map(chatLine).join("") : `<p class="soft small">Nothing said yet. Say hello, or throw an emoji at someone's go.</p>`;
  el.scrollTop = el.scrollHeight;
}
/** One chat line. "[e:123] 😂" is an emoji thrown at a go: shown with what it was thrown at. */
function chatLine(m) {
  const mine = m.player_id === S.me.id;
  let text = m.text, at = "";
  const t = /^\[e:(\d+)\] (.+)$/.exec(text);
  if (t) {
    text = t[2];
    const e = S.evs.find((x) => x.seq === Number(t[1]));
    const d = e ? describe(e, namesFor(S.G), S.me.id) : null;
    at = d ? `<small class="at">at “${esc(d.replace(/\.$/, ""))}”</small>` : "";
  }
  const big = emojiOnly(text);
  return `<p class="${mine ? "me" : ""}${big ? " big" : ""}">${headOf(m.player_id, 22)}<b>${esc(you(m.player_id))}</b> <span class="msg">${esc(text)}</span>${at}</p>`;
}
/* Emoji in chat (CountGuff): your five most recent on a quick row; one to three emoji on their own are shown big. */
const START_EMOJI = ["😂", "💩", "🔥", "😱", "🍺"];
const EMOJI_RE = /\p{Regional_Indicator}{2}|[#*0-9]\uFE0F?\u20E3|\p{Extended_Pictographic}[\uFE0F\p{Emoji_Modifier}]*(?:\u200D\p{Extended_Pictographic}[\uFE0F\p{Emoji_Modifier}]*)*/gu;
const emojiIn = (t) => String(t || "").match(EMOJI_RE) || [];
const emojiOnly = (t) => { const x = String(t || "").trim(), m = emojiIn(x); return m.length > 0 && m.length <= 3 && !x.replace(EMOJI_RE, "").trim(); };
const quickEmoji = () => { const r = store.get("gh:emoji") || []; return [...r, ...START_EMOJI.filter((x) => !r.includes(x))].slice(0, 5); };
function noteEmoji(text) { let r = store.get("gh:emoji") || []; for (const e of emojiIn(text)) r = [e, ...r.filter((x) => x !== e)]; store.set("gh:emoji", r.slice(0, 24)); }
const quickEmojiRow = () => `<div class="emojirow">${quickEmoji().map((e) => `<button class="emo" data-emoji="${e}" aria-label="Send ${e}">${e}</button>`).join("")}</div>`;
async function sendChat(text) {
  try {
    await api(`/games/${S.G.id}/chat`, { method: "POST", body: { text } });
    noteEmoji(text.replace(/^\[e:\d+\] /, ""));
    await pollGame();
    return true;
  } catch (er) { toast(er.message); return false; }
}
/* the chat peek under the table, with a red count of what you haven't read (Words and Guff) */
const readKey = () => `gh:read:${S.G.id}`;
const unread = () => { const r = Number(store.get(readKey()) || 0); return S.chat.filter((m) => m.id > r && m.player_id !== S.me.id).length; };
function markRead() { if (S.chat.length) store.set(readKey(), S.chat[S.chat.length - 1].id); }
function chatPeek() {
  const last = S.chat[S.chat.length - 1];
  const n = unread();
  return `<button class="chatpeek${n ? " fresh" : ""}" id="chatpeek">${last ? `${headOf(last.player_id, 22)}<span class="peektext"><b>${esc(you(last.player_id))}</b> ${esc(last.text.replace(/^\[e:\d+\] /, ""))}</span>` : `<span class="peektext soft">💬 Say something to the table</span>`}${n ? `<span class="count">${n}</span><span class="arrow">▾</span>` : ""}</button>`;
}
function refreshPeek() {
  const p = $("chatpeek");
  if (p) { p.outerHTML = chatPeek(); const q = $("chatpeek"); if (q) q.onclick = () => { S.tab = "chat"; if (document.body.classList.contains("fit")) S.sheet = true; markRead(); renderGame(); }; }
  if (S.tab === "chat") markRead();
  for (const tb of document.querySelectorAll('[data-tab4="chat"], [data-sheet="chat"]')) tb.innerHTML = `💬 Chat${unread() ? ` <span class="count">${unread()}</span>` : ""}`;
}

/* ---------- after your go: is another game waiting for you? (CountGuff's next-game toast) ---------- */
async function offerNext(fromId) {
  let games;
  try { games = (await api("/games")).games; } catch { return; }
  S.games = games;
  badge(waitingOnMe(games));
  const next = games.filter((g) => g.status === "playing" && g.myGo && g.id !== fromId);
  if (!next.length || !S.G || S.G.id !== fromId) return;
  const g = next[0];
  const t = $("nexttoast") || Object.assign(document.createElement("div"), { id: "nexttoast", className: "nexttoast" });
  t.innerHTML = `<a href="#/game/${g.id}"><b>Your go v ${esc(g.opps.map((p) => g.names[p]).join(", "))}</b>${next.length > 1 ? ` <small>+${next.length - 1} more</small>` : ""} <span class="arrow">▸</span></a><button class="x" aria-label="Dismiss">×</button>`;
  document.body.appendChild(t);
  t.querySelector(".x").onclick = () => t.remove();
  t.querySelector("a").onclick = () => t.remove();
  clearTimeout(offerNext.t);
  offerNext.t = setTimeout(() => t.remove(), 15000);
}

/* ---------- rare moments worth sharing (Words and Guff's Share this move, rare so it never nags) ---------- */
function rareMoment(evs) {
  const me = S.me.id;
  const four = evs.find((e) => e.k === "play" && e.p === me && e.burn === "four");
  if (four) return { what: "four", text: `Four ${pluralOf(four.cards[0])}. Burned. 🔥` };
  const flip = evs.findIndex((e) => e.k === "flip" && e.p === me && e.ok);
  if (flip >= 0 && evs.slice(flip).some((e) => e.k === "out" && e.p === me)) return { what: "blind", text: "Went out on a blind flip. Didn't even look. 😎" };
  const big = evs.find((e) => e.k === "play" && e.p === me && e.burn === "ten" && e.pile >= 12);
  if (big) return { what: "bonfire", text: `Burned ${big.pile} cards with one 10. 🚒` };
  return null;
}
async function shareMoment(G, what) {
  const m = S.moment && S.moment.what === what ? S.moment : null;
  const others = G.players.filter((p) => p !== S.me.id).map((p) => G.names[p]).join(", ");
  await shareIt(G, `${m ? m.text : "Guffhead"} Guffhead v ${others}.`);
  S.moment = null;
}
async function shareBoard(G) {
  const names = namesFor(G);
  const text = G.loser === S.me.id ? `I'm the Guffhead. 💩 Wearing it until one of you loses.` : `${names[G.loser]} is the Guffhead. 💩 I got away with it.`;
  await shareIt(G, text, true);
}
/** Share a line, with the game's chalkboard as a picture where the phone allows it. */
async function shareIt(G, text, withBoard = false) {
  const url = `${location.origin}/`;
  try {
    let files;
    if (withBoard && navigator.canShare) {
      const blob = await boardPng({ id: G.id, names: G.players.map((p) => G.names[p]), loser: G.loser ? G.names[G.loser] : null, order: G.g.finished.map((p) => G.names[p]) });
      const f = new File([blob], "guffhead.png", { type: "image/png" });
      if (navigator.canShare({ files: [f] })) files = [f];
    }
    if (navigator.share) { await navigator.share(files ? { text: `${text} ${url}`, files } : { text, url }); return; }
  } catch (e) { if (e && e.name === "AbortError") return; }
  try { await navigator.clipboard.writeText(`${text} ${url}`); toast("Copied. Paste it into the WhatsApp group."); } catch { toast(text, 5000); }
}

/* ---------- Biscuit pays a visit if you stare at your go for a minute (Words and Guff's idle animation) ---------- */
function stopIdle() { clearTimeout(S.idleT); const d = $("biscuit"); if (d) d.remove(); }
function startIdle(G) {
  stopIdle();
  if (!G.myGo || G.status !== "playing" || G.g.phase !== "play" || reduced()) return;
  const key = `${G.id}:${G.g.seq}`;
  if (S.idleSeen === key) return;
  S.idleT = setTimeout(() => {
    if (!S.G || S.G.id !== G.id || S.G.g.seq !== G.g.seq) return;
    S.idleSeen = key;
    const d = document.createElement("div");
    d.id = "biscuit"; d.className = "biscuit";
    d.innerHTML = `<span class="dog">🐕</span><span class="bubble">${["Biscuit sits at your feet and whines.", "Biscuit has seen enough. Play something.", "Biscuit yawns. Loudly.", "Biscuit nudges your hand. The low ones, he reckons."][G.g.seq % 4]}</span>`;
    document.body.appendChild(d);
    setTimeout(() => d.classList.add("leave"), 6500);
    setTimeout(() => d.remove(), 8000);
  }, 60000);
}

function wireGame() {
  const G = S.G;
  const app = $("app");
  app.querySelectorAll("[data-card]").forEach((el) => {
    const go = () => { if (S.ignoreTap && Date.now() - S.ignoreTap < 300) return; tapCard(el.dataset.card); };
    el.onclick = go;
    el.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } };
  });
  app.querySelectorAll("[data-down]").forEach((el) => { el.onclick = () => { if (G.myGo && G.options && G.options.zone === "down") { el.classList.add("flipping"); doAct({ act: "flip", index: Number(el.dataset.down) }); } }; });
  if ($("playBtn")) $("playBtn").onclick = () => playSelected();
  wireDrag();
  app.querySelectorAll("[data-tab4]").forEach((b) => (b.onclick = () => { S.tab = b.dataset.tab4; if (S.tab === "chat") markRead(); renderGame(); }));
  const openSheet = (tab) => { S.tab = tab; S.sheet = true; if (tab === "chat") markRead(); renderGame(); if (tab === "chat") setTimeout(() => { const i = $("chatText"); if (i) i.focus(); }, 250); };
  app.querySelectorAll("[data-sheet]").forEach((b) => (b.onclick = () => openSheet(b.dataset.sheet)));
  const shut = () => { S.sheet = false; renderGame(); };
  if ($("sheetClose")) $("sheetClose").onclick = shut;
  if ($("sheetback")) $("sheetback").onclick = shut;
  const peek = $("chatpeek");
  if (peek && document.body.classList.contains("fit")) peek.onclick = () => openSheet("chat");
  else if (peek) peek.onclick = () => { S.tab = "chat"; markRead(); renderGame(); const t = $("tabpanel"); if (t) t.scrollIntoView({ block: "start", behavior: reduced() ? "auto" : "smooth" }); setTimeout(() => { const i = $("chatText"); if (i) i.focus(); }, 350); };
  app.querySelectorAll("[data-emoji]").forEach((b) => (b.onclick = () => sendChat(b.dataset.emoji)));
  app.querySelectorAll("[data-throw]").forEach((b) => (b.onclick = () => sendChat(`[e:${b.dataset.seq}] ${b.dataset.throw}`)));
  if ($("shareGame")) $("shareGame").onclick = () => shareBoard(G);
  if ($("shareMoment")) $("shareMoment").onclick = () => shareMoment(G, $("shareMoment").dataset.what);
  wireCracker(G);
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
    if (await sendChat(t)) $("chatText").value = "";
  };
  if (S.tab === "chat") markRead();
}

/** Drag a card from your hand onto the pile to play it (and the cards picked with it). Taps still work as taps. */
function wireDrag() {
  const G = S.G;
  if (!G.myGo || !G.options || S.playing) return;
  const pile = $("pile");
  document.querySelectorAll("#hand [data-card]").forEach((el) => {
    el.onpointerdown = (e) => {
      if (e.button) return;
      const c = el.dataset.card;
      const play = G.options.plays.find((p) => p.cards.includes(c));
      if (!play) return;
      const x0 = e.clientX, y0 = e.clientY;
      let ghost = null;
      const move = (m) => {
        const dx = m.clientX - x0, dy = m.clientY - y0;
        if (!ghost && Math.hypot(dx, dy) < 14) return;
        if (!ghost) { ghost = el.cloneNode(true); ghost.classList.add("ghost"); document.body.appendChild(ghost); el.classList.add("lifting"); }
        ghost.style.left = `${m.clientX - 28}px`; ghost.style.top = `${m.clientY - 40}px`;
        const r = pile.getBoundingClientRect();
        pile.classList.toggle("target", m.clientX > r.left - 20 && m.clientX < r.right + 20 && m.clientY > r.top - 20 && m.clientY < r.bottom + 20);
      };
      const up = () => {
        window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up);
        if (!ghost) return;
        ghost.remove(); el.classList.remove("lifting");
        const hit = pile.classList.contains("target");
        pile.classList.remove("target");
        S.ignoreTap = Date.now();
        if (hit) { S.sel = S.sel.length && rankOf(S.sel[0]) === rankOf(c) ? S.sel : play.cards.slice(); S.warnOk = true; playSelected(); }
      };
      window.addEventListener("pointermove", move); window.addEventListener("pointerup", up); window.addEventListener("pointercancel", up);
    };
  });
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
  const me = G.g.seats.find((p) => p.id === S.me.id);
  if (!me) return;
  const now = Date.now();
  const dbl = S.lastTap && S.lastTap.c === c && now - S.lastTap.t < 380;
  S.lastTap = { c, t: now };
  S.warn = null;
  if (!G.myGo || !G.options) {
    // picking ahead while you wait: any rank, all of it, nothing is sent until it's your go and you tap Play
    const same = me.hand.filter((x) => rankOf(x) === rankOf(c));
    if (S.sel.length && rankOf(S.sel[0]) !== rankOf(c)) S.sel = [];
    S.sel = S.sel.includes(c) && S.sel.length === same.length ? [] : S.sel.includes(c) ? S.sel.filter((x) => x !== c) : S.sel.length ? [...S.sel, c] : same;
    tellDoing();
    renderGame();
    return;
  }
  const play = G.options.plays.find((p) => p.cards.includes(c));
  if (!play) { toast(`That won't go: ${needWords(G.g.pile, G.settings).toLowerCase()}`); return; }
  if (dbl) { S.sel = play.cards.slice(); return playSelected(true); }   // double-tap: play it and its matching cards
  if (S.sel.length && rankOf(S.sel[0]) !== rankOf(c)) S.sel = [];
  if (S.sel.includes(c)) S.sel = S.sel.filter((x) => x !== c);
  else if (!S.sel.length) S.sel = play.cards.slice();       // all of the rank, the usual play
  else S.sel = [...S.sel, c];
  tellDoing();
  renderGame();
}

/**
 * Play what's picked. The first few times someone's about to spend a 10 or a 2 when an ordinary card would go,
 * the button asks once ("Sure? A 5 would go"); a second tap plays it.
 */
function playSelected(quick = false) {
  const G = S.G;
  if (!S.sel.length || !G.options) return;
  const s = G.settings;
  const r = rankOf(S.sel[0]);
  const plain = G.options.plays.filter((p) => !isMagic(p.rank, s));
  const warned = store.get("gh:magicWarned") || 0;
  if (isMagic(r, s) && plain.length && !S.warnOk && warned < 4 && !(r === 10 && G.g.pile.length >= 6)) {
    store.set("gh:magicWarned", warned + 1);
    S.warn = `Sure? ${({ 10: "That's your 10", 2: "That's your 2", 3: "That's your 3" })[r]}. ${cap(aCardName(plain[0].cards[0]))} would go.`;
    S.warnOk = true;
    renderGame();
    return;
  }
  S.warn = null; S.warnOk = false;
  doAct({ act: "play", cards: S.sel.slice() });
}
const cap = (x) => x.charAt(0).toUpperCase() + x.slice(1);
const aCardName = (c) => `${c[0] === "A" || c[0] === "8" ? "an" : "a"} ${cardName(c)}`;

/** Tell the table what you're up to: picking cards (shown to the others as "picking cards…"). */
function tellDoing() { S.doingDirty = true; }

/* ---------- the swap: pick your face-up three ---------- */
function renderSwap(G) {
  const s = G.settings;
  const six = G.six || [];
  const me = G.g.seats.find((p) => p.id === S.me.id);
  if (!S.six || S.six.key !== G.id) S.six = { key: G.id, up: (G.suggest && G.suggest.length === 3 ? G.suggest : me.up).slice(), suggested: !!G.suggest };
  const up = S.six.up;
  const names = namesFor(G);
  const waiting = G.required.filter((p) => p !== S.me.id);
  $("app").innerHTML = `
    <section class="game swap">
      <div class="status"><p class="patter loud">${esc(say("swap", seedOf(G.id)))}</p></div>
      <div id="presence">${presenceHtml()}</div>
      <p class="small">${S.six.suggested && sameSet(S.six.up, G.suggest || []) ? "GuffBot has picked your best three to go face up. Tap Ready, or tap cards to change them." : "Tap three cards to go face up, on top of your three face-down cards. The other three are your starting hand."}</p>
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

const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x));

/* ---------- the replay: step through a finished game, every hand face up (Words and Guff's Guff Replay) ---------- */
async function renderReplay(id) {
  $("app").innerHTML = `<p class="loading">Rewinding the tape…</p>`;
  let r;
  try { r = await api(`/games/${id}?since=0`); } catch (e) { $("app").innerHTML = `<p class="err">${esc(e.message)}</p><p><a href="#/">Back to the bar</a></p>`; return; }
  const G = r.game;
  S.G = G;
  if (G.status !== "finished") { location.hash = `#/game/${id}`; return; }
  const evs = G.g.events;
  if (!canReplay(evs)) { $("app").innerHTML = `<section class="replay"><h2>No replay for this one</h2><p class="soft">Games finished before 10 November weren't recorded go by go. Every game from now on is.</p><p><a href="#/game/${id}">Back to the game</a></p></section>`; return; }
  const all = replaySteps(evs);
  const R = { n: 0, playing: false, t: 0 };
  const names = namesFor(G);
  const draw = () => {
    const st = replayAt(evs, R.n, G.settings);
    const last = st.last;
    const lastId = last ? last.p : null;
    $("app").innerHTML = `
      <section class="replay">
        <div class="replaylogo"><span>GUFF</span><b>REPLAY</b></div>
        <div class="table small">
          <div class="pack">${st.draw ? `<span class="stack">${back({ size: "sm" })}</span><small>Pack ${st.draw}</small>` : `<span class="stack empty"></span><small>Pack gone</small>`}</div>
          <div class="pile">${pileHtml({ pile: st.pile }, G.settings)}<small>${st.pile.length ? `${st.pile.length} on the pile` : "Empty"}</small></div>
          <div class="burnt"><span class="ash${st.burned ? "" : " dim"}">🔥</span><small>${st.burned} burned</small></div>
        </div>
        <div class="vcr">
          <button class="btn small" data-vcr="start" aria-label="To the start">⏮</button>
          <button class="btn small" data-vcr="back" aria-label="Back one">◀</button>
          <button class="btn small gold" data-vcr="play" aria-label="${R.playing ? "Pause" : "Play"}">${R.playing ? "⏸" : "▶"}</button>
          <button class="btn small" data-vcr="fwd" aria-label="Forward one">▶▶</button>
          <button class="btn small" data-vcr="end" aria-label="To the end">⏭</button>
          <span class="vcrcount">${R.n} / ${all.length}</span>
        </div>
        <p class="vcrline">${last ? `${headOf(last.p, 22)} ${esc(describe(last, names, S.me.id))}` : "The deal. Everyone's cards, face up."}</p>
        <div class="replayhands">${st.seats.map((p) => `<div class="rhand${p.id === lastId ? " turn" : ""}${p.out ? " isout" : ""}">
          <div class="rname">${headOf(p.id, 26, G.loser === p.id && R.n === all.length)} <b>${esc(you(p.id))}</b>${p.out ? `<span class="outbadge">${p.out === 1 ? "Out first" : "Out"}</span>` : ""}</div>
          <div class="rcards">${p.hand.map((c) => card(c, { size: "sm", s: G.settings })).join("")}${p.up.length ? `<span class="sep">up</span>${p.up.map((c) => card(c, { size: "sm", s: G.settings })).join("")}` : ""}${p.down.length ? `<span class="sep">down</span>${p.down.map((c) => card(c, { size: "sm", s: G.settings, cls: "peek" })).join("")}` : ""}</div>
        </div>`).join("")}</div>
        <p class="foot"><a href="#/game/${id}">Back to the game</a> · <a href="#/logbook">Logbook</a></p>
      </section>`;
    $("app").querySelectorAll("[data-vcr]").forEach((b) => (b.onclick = () => {
      const k = b.dataset.vcr;
      if (k === "play") { R.playing = !R.playing; if (R.playing && R.n >= all.length) R.n = 0; tick(); }
      else { R.playing = false; R.n = k === "start" ? 0 : k === "end" ? all.length : Math.max(0, Math.min(all.length, R.n + (k === "fwd" ? 1 : -1))); }
      draw();
    }));
  };
  const tick = () => {
    clearTimeout(R.t);
    if (!R.playing || location.hash !== `#/replay/${id}`) return;
    R.t = setTimeout(() => { if (!R.playing) return; if (R.n >= all.length) { R.playing = false; draw(); return; } R.n++; snap(); draw(); tick(); }, 650);
  };
  draw();
}

/* ---------- the Logbook: finished games between you and your friends (CountGuff's Logbook) ---------- */
async function renderLogbook() {
  $("app").innerHTML = `<p class="loading">Pam is dusting off the logbook…</p>`;
  let r;
  try { r = await api("/logbook"); } catch (e) { $("app").innerHTML = `<p class="err">${esc(e.message)}</p>`; return; }
  const f = S.logFilter || "all";
  const nm = (p) => (p === S.me.id ? "You" : r.names[p] || p);
  const rows = r.games.filter((g) => (f === "all" ? true : f === "mine" ? g.players.includes(S.me.id) : g.players.includes(S.me.id) && g.players.includes(f)));
  const people = [...new Set(r.games.flatMap((g) => g.players))].filter((p) => p !== S.me.id && !isHouse(p));
  $("app").innerHTML = `
    <section class="logbook">
      <h2>The logbook</h2>
      <div class="chips wrap">
        <button class="chip${f === "all" ? " on" : ""}" data-lf="all">Everyone's</button>
        <button class="chip${f === "mine" ? " on" : ""}" data-lf="mine">Yours</button>
        ${people.map((p) => `<button class="chip person${f === p ? " on" : ""}" data-lf="${esc(p)}">${headOf(p, 22)}You v ${esc(nm(p))}</button>`).join("")}
      </div>
      <div class="tables">${rows.length ? rows.map((g) => `<a class="tablerow" href="#/replay/${g.id}">
        <span class="thumb">${boardSvg({ id: g.id, names: g.players.map((p) => (p === S.me.id ? S.me.name : r.names[p] || p)), loser: g.loser ? (g.loser === S.me.id ? S.me.name : r.names[g.loser]) : null, size: 92 })}</span>
        <span class="who"><span class="heads">${g.players.map((p) => headOf(p, 24, p === g.loser)).join("")}</span>${esc(g.players.map(nm).join(", "))}
          <small>${g.loser ? `💩 ${esc(nm(g.loser))}` : "Over"}${g.order.length ? ` · out first: ${esc(nm(g.order[0]))}` : ""}${g.practice ? " · practice" : ""}</small>
          <small class="soft">${new Date(g.finished).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}</small></span>
        <span class="sc">📼</span></a>`).join("") : `<p class="soft">Nothing in the logbook yet.</p>`}</div>
    </section>`;
  $("app").querySelectorAll("[data-lf]").forEach((b) => (b.onclick = () => { S.logFilter = b.dataset.lf; renderLogbook(); }));
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
if (XMAS) {
  document.body.classList.add("xmas");
  if (!reduced()) {
    const snow = document.createElement("div");
    snow.className = "snowfall"; snow.setAttribute("aria-hidden", "true");
    snow.innerHTML = Array.from({ length: 18 }, (_, i) => `<i style="left:${(i * 37) % 100}%;font-size:${8 + (i % 4) * 3}px;animation-duration:${9 + (i % 5) * 2}s;animation-delay:-${(i * 1.7) % 9}s">❄</i>`).join("");
    document.body.appendChild(snow);
  }
}
route();
