// Guffhead: the back room's wallpaper (Carl, 10 Nov 2026: "a randomised choice from a range of classic 70s flock
// and colourful circles", instead of too much brown). Each is a small SVG tile drawn here, so nothing to download.
// A game always has the same wallpaper on every phone (picked from the game's id); the bar picks afresh each visit.
//
//   Wallpaper.pick(seed) -> { id, name, css }   css is a background value for <body>

const enc = (svg) => `url("data:image/svg+xml,${encodeURIComponent(svg.replace(/\s+/g, " "))}")`;

/* ---------- flock: a velvety damask, darker pile on a ground of the same colour ---------- */
function flock(ground, pile, shine) {
  const motif = `
    <path d="M60 18 C70 34 78 44 78 60 C78 74 68 84 60 92 C52 84 42 74 42 60 C42 44 50 34 60 18 Z"/>
    <path d="M60 40 C64 48 66 54 66 60 C66 66 63 70 60 74 C57 70 54 66 54 60 C54 54 56 48 60 40 Z" fill="${ground}"/>
    <path d="M60 92 C70 100 86 98 94 88 C100 80 98 68 90 66 C84 64 80 70 84 76 C88 80 82 88 74 86 C68 84 64 88 60 92 Z"/>
    <path d="M60 92 C50 100 34 98 26 88 C20 80 22 68 30 66 C36 64 40 70 36 76 C32 80 38 88 46 86 C52 84 56 88 60 92 Z"/>
    <path d="M60 96 C66 108 66 122 60 140 C54 122 54 108 60 96 Z"/>
    <path d="M60 4 L66 12 L60 20 L54 12 Z"/>
    <circle cx="96" cy="40" r="5"/><circle cx="24" cy="40" r="5"/>
    <path d="M60 140 C76 146 92 140 104 150 C92 158 76 156 60 160 C44 156 28 158 16 150 C28 140 44 146 60 140 Z"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="160" viewBox="0 0 120 160">
    <defs><filter id="v" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation=".7"/></filter></defs>
    <rect width="120" height="160" fill="${ground}"/>
    <g fill="${shine}" transform="translate(-.8 -.8)" opacity=".55" filter="url(#v)">${motif}</g>
    <g fill="${pile}" filter="url(#v)">${motif}</g>
    <g fill="${pile}" filter="url(#v)" transform="translate(-60 -80)">${motif}</g>
    <g fill="${pile}" filter="url(#v)" transform="translate(60 -80)">${motif}</g>
    <g fill="${pile}" filter="url(#v)" transform="translate(-60 80)">${motif}</g>
    <g fill="${pile}" filter="url(#v)" transform="translate(60 80)">${motif}</g>
  </svg>`;
  return `${enc(svg)} 0 0 / 120px 160px, ${ground}`;
}

/* ---------- circles: Panton-style concentric rings in a brick grid ---------- */
function circles(bg, rings, size = 120) {
  const h = size / 2;
  const disc = (cx, cy) => rings.map((c, i) => `<circle cx="${cx}" cy="${cy}" r="${h * (1 - i / rings.length)}" fill="${c}"/>`).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" fill="${bg}"/>${disc(h, h)}${disc(0, 0)}${disc(size, 0)}${disc(0, size)}${disc(size, size)}</svg>`;
  return `${enc(svg)} 0 0 / ${size}px ${size}px, ${bg}`;
}
/* ---------- bubbles: overlapping circles of different sizes, the other 70s classic ---------- */
function bubbles(bg, cols) {
  const spots = [[20, 22, 18], [70, 18, 12], [104, 46, 20], [46, 64, 24], [14, 96, 14], [84, 96, 18], [52, 116, 10], [112, 110, 8]];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" fill="${bg}"/>
    ${spots.map(([x, y, r], i) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${cols[i % cols.length]}" opacity=".9"/><circle cx="${x}" cy="${y}" r="${r * 0.55}" fill="${bg}" opacity=".35"/>`).join("")}</svg>`;
  return `${enc(svg)} 0 0 / 128px 128px, ${bg}`;
}

export const PAPERS = [
  { id: "claret-flock", name: "Claret flock", css: () => flock("#6E1423", "#4A0C17", "#9A2A3C") },
  { id: "bottle-flock", name: "Bottle-green flock", css: () => flock("#1F4A36", "#123325", "#3C7A5C") },
  { id: "navy-flock", name: "Midnight flock", css: () => flock("#1E2B57", "#121C3D", "#3F55A0") },
  { id: "gold-flock", name: "Mustard flock", css: () => flock("#B8861A", "#8C6210", "#E1B44C") },
  { id: "plum-flock", name: "Aubergine flock", css: () => flock("#4B2445", "#32172E", "#7A3E70") },
  { id: "panton-orange", name: "Orange rings", css: () => circles("#E8772E", ["#C2410C", "#F59E0B", "#FCD34D", "#FFF4D6"]) },
  { id: "panton-teal", name: "Teal and mustard rings", css: () => circles("#14707A", ["#0E4F57", "#D9A126", "#F2D27A", "#14707A"]) },
  { id: "panton-pink", name: "Pink and purple rings", css: () => circles("#7A2C82", ["#4A1A52", "#E8559A", "#F7A8CB", "#FFE3F0"]) },
  { id: "panton-avocado", name: "Avocado rings", css: () => circles("#6E7F3A", ["#4A5726", "#E8772E", "#F3C14B", "#F6ECD7"]) },
  { id: "panton-red", name: "Red and cream rings", css: () => circles("#B5263E", ["#7E1529", "#F6ECD7", "#E8772E", "#F6ECD7"], 100) },
  { id: "bubbles-sunset", name: "Sunset bubbles", css: () => bubbles("#2B1B4A", ["#E8772E", "#E8559A", "#F3C14B", "#5FA8D3"]) },
  { id: "bubbles-lime", name: "Lime bubbles", css: () => bubbles("#1F5F4A", ["#9BC53D", "#EBD86A", "#E8772E", "#9CC9C3"]) },
];

export function pick(seed) {
  const p = PAPERS[(seed >>> 0) % PAPERS.length];
  return { id: p.id, name: p.name, css: p.css() };
}
