// Guffhead: the back-room chalkboard (CountGuff's posters, pub style). Every game gets one, picked from its id so
// every phone draws the same: the lobby thumbnail, the top of the end card with the result chalked on, and the
// picture that goes out with Share.
//
//   Board.svg({ id, names, loser, order, size })  -> SVG string
//   Board.png(opts)                                 -> Promise<Blob> (for the Share sheet)

const HEAD = ["TONIGHT IN THE BACK ROOM", "CARD SCHOOL", "BACK ROOM FIXTURE", "GRUDGE MATCH", "THE BIG GAME", "LOCK-IN SPECIAL", "TOURNAMENT OF THE CENTURY", "AS SEEN ON TV (NOT)"];
const SMALL = ["Loser buys the scampi fries", "No card counting (Ms GuffBot)", "Dogs welcome. Biscuit insists", "Strictly no cheating. Mostly", "Entry: one pint of mild", "Quiz cancelled due to cards", "Bring your own luck", "Last orders: never"];
const CHALK = ["#F4F1E8", "#F7D774", "#F5A9B8", "#9FD8E8", "#B9E6A0"];
const SLATE = [["#1F2A24", "#2B3A31"], ["#1B1E22", "#2A2F35"], ["#22301F", "#30442B"], ["#2A2222", "#3A2E2E"]];

function rng(seed) { let s = (seed >>> 0) || 1; return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const seedOf = (s) => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
const pick = (r, a) => a[Math.floor(r() * a.length)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const FONT = `'Chalkboard SE', 'Chalkboard', 'Comic Neue', 'Comic Sans MS', 'Marker Felt', cursive`;

export function svg({ id, names, loser = null, order = [], size = 320 }) {
  if (size < 140) return mini({ id, names, loser, size });
  const r = rng(seedOf(`${id}:board`));
  const [slate, slate2] = pick(r, SLATE);
  const c1 = pick(r, CHALK), c2 = pick(r, CHALK.filter((c) => c !== c1));
  const head = pick(r, HEAD), small = pick(r, SMALL);
  const vs = names.join(" v ");
  const fs = vs.length > 34 ? 19 : vs.length > 24 ? 23 : 28;
  const tilt = (r() * 4 - 2).toFixed(1);
  const doodle = [
    `<g transform="translate(262 196)" stroke="${c2}" stroke-width="2.4" fill="none" stroke-linecap="round"><path d="M0 0 h22 v34 q0 6 -6 6 h-10 q-6 0 -6 -6 z"/><path d="M22 8 q10 0 10 9 t-10 9"/><path d="M2 6 q9 -6 18 0" stroke-dasharray="3 3"/></g>`,
    `<g transform="translate(270 200)" stroke="${c2}" stroke-width="2.4" fill="none" stroke-linecap="round"><path d="M14 0 l4 10 l11 1 l-8 7 l3 11 l-10 -6 l-10 6 l3 -11 l-8 -7 l11 -1 z"/></g>`,
    `<g transform="translate(262 204)" stroke="${c2}" stroke-width="2.4" fill="none" stroke-linecap="round"><rect x="0" y="0" width="20" height="28" rx="3"/><rect x="12" y="-4" width="20" height="28" rx="3" transform="rotate(12 22 10)"/></g>`,
  ][Math.floor(r() * 3)];
  const result = loser
    ? `<g transform="rotate(-6 160 200)"><rect x="40" y="176" width="240" height="44" rx="6" fill="none" stroke="${c2}" stroke-width="3" stroke-dasharray="7 5"/>
         <text x="160" y="205" text-anchor="middle" font-family="${FONT}" font-size="22" font-weight="700" fill="${c2}">GUFFHEAD: ${esc(loser.toUpperCase())} 💩</text></g>`
    : `<text x="160" y="214" text-anchor="middle" font-family="${FONT}" font-size="17" font-weight="700" fill="${c1}">${esc(small)}</text>`;
  const firstOut = loser && order.length ? `<text x="160" y="246" text-anchor="middle" font-family="${FONT}" font-size="16" font-weight="700" fill="${c1}">Out first: ${esc(order[0])}</text>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 260" width="${size}" height="${Math.round(size * 260 / 320)}" role="img" aria-label="${esc(head)}: ${esc(vs)}">
    <defs><filter id="ch${seedOf(id) % 997}"><feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="1" result="n"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 .09"/></feComponentTransfer><feComposite in2="SourceGraphic" operator="in"/></filter></defs>
    <rect x="0" y="0" width="320" height="260" rx="10" fill="#7A5230"/>
    <rect x="9" y="9" width="302" height="242" rx="4" fill="${slate}"/>
    <rect x="9" y="9" width="302" height="242" rx="4" fill="${slate2}" opacity=".35"/>
    <rect x="9" y="9" width="302" height="242" rx="4" filter="url(#ch${seedOf(id) % 997})" fill="#fff"/>
    <g transform="rotate(${tilt} 160 110)">
      <text x="160" y="50" text-anchor="middle" font-family="${FONT}" font-size="19" font-weight="700" letter-spacing="1.2" fill="${c2}">${esc(head)}</text>
      <path d="M70 60 q90 8 180 0" stroke="${c2}" stroke-width="2" fill="none" opacity=".8"/>
      <text x="160" y="108" text-anchor="middle" font-family="${FONT}" font-size="${fs}" font-weight="700" fill="${c1}">${esc(vs)}</text>
      <text x="160" y="140" text-anchor="middle" font-family="${FONT}" font-size="18" font-weight="700" fill="${c1}">in the back room</text>
    </g>
    ${result}${firstOut}${loser ? "" : doodle}
  </svg>`;
}

/** The lobby's little board: no small print, just big chalk. Initials while it's on; the 💩 and a name once it's over. */
function mini({ id, names, loser, size }) {
  const r = rng(seedOf(`${id}:board`));
  const [slate] = pick(r, SLATE);
  const c1 = pick(r, CHALK);
  const ini = (n) => (n === "Ms GuffBot" ? "MsG" : n === "GuffBot" ? "GB" : n.slice(0, 1).toUpperCase());
  const body = loser
    ? `<text x="60" y="44" text-anchor="middle" font-size="34">💩</text><text x="60" y="76" text-anchor="middle" font-family="${FONT}" font-size="${loser.length > 7 ? 15 : 19}" font-weight="700" fill="${c1}"${loser.length > 8 ? ` textLength="98" lengthAdjust="spacingAndGlyphs"` : ""}>${esc(loser)}</text>`
    : (() => { const t = names.map(ini).join(" v "); const fit = t.length > 6 ? ` textLength="${Math.min(98, t.length * 12)}" lengthAdjust="spacingAndGlyphs"` : ""; return `<text x="60" y="56" text-anchor="middle" font-family="${FONT}" font-size="${t.length > 9 ? 20 : 24}" font-weight="700" fill="${c1}"${fit}>${esc(t)}</text>`; })();
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 92" width="${size}" height="${Math.round(size * 92 / 120)}" aria-hidden="true">
    <rect width="120" height="92" rx="7" fill="#7A5230"/><rect x="6" y="6" width="108" height="80" rx="3" fill="${slate}"/>${body}</svg>`;
}

/** The board as a PNG, for sharing (iPhones share a picture, not an SVG). */
export function png(opts) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const src = svg({ ...opts, size: 960 });
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = 960; c.height = 780;
      c.getContext("2d").drawImage(img, 0, 0, 960, 780);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error("No picture"))), "image/png");
    };
    img.onerror = reject;
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(src)}`;
  });
}
