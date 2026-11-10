// Guffhead: what everyone wears down The Guff's Head (Carl, 10 Nov 2026: "the men should wear wide collar shirts,
// paisley, kipper ties, diamond-pattern jumpers and car coats. And pints. The women similarly cheesy retro outfits and
// cocktails with umbrellas"). Drawn as SVG from a seed, in the same 240 x 300 box as CountGuff's jumpers and
// GuffGammon's evening wear, so the faces from avatar.js sit on the collar exactly as they do there. Same seed, same
// outfit, on every phone. Each player picks a wardrobe (or to be surprised); the outfit changes from game to game.
//
//   Pub.design(seed, pref)            -> the outfit (pref: lads | ladies | any)
//   Pub.wear(seed, size, head, o)     -> the full figure, drink in hand
//   Pub.guffbot(seed, size) / .ms(seed, size)   -> the house: flat cap and a pint; knotted hanky, a cigarette and a cocktail
//   Pub.caption(name, seed, pref)     -> "Nick has turned up in a mustard paisley shirt with a collar like a Concorde."

(function (root) {
  "use strict";
  function rng(seed) {
    let s = (seed >>> 0) || 1;
    return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const pick = (r, a) => a[Math.floor(r() * a.length)];
  const shade = (hex, k) => {
    const n = parseInt(hex.slice(1), 16);
    const f = (v) => Math.max(0, Math.min(255, Math.round(k < 1 ? v * k : v + (255 - v) * (k - 1))));
    return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map(f).map((v) => v.toString(16).padStart(2, "0")).join("")}`;
  };
  const uid = (p) => `${p}${Math.floor(Math.random() * 1e9).toString(36)}`;

  // a 1970s palette: nothing a modern person would choose
  const SEVENTIES = [
    ["mustard", "#D4A62A"], ["burnt orange", "#C9611F"], ["avocado", "#7E8A3A"], ["chocolate", "#5A3622"], ["burgundy", "#7A1F35"],
    ["teal", "#1F6F78"], ["harvest gold", "#E0A93B"], ["tan", "#B07A45"], ["aubergine", "#4B2445"], ["sky blue", "#8FB8D8"],
    ["bottle green", "#1F5F4A"], ["tangerine", "#E8772E"], ["lilac", "#B79ACB"], ["cream", "#EFE3C2"], ["rust", "#A9472A"],
  ];
  // no peach, pink or cream: next to a face they read as a bare chest
  const SHIRT = [["lemon", "#F3E7A0"], ["pale blue", "#BFD9EE"], ["mint", "#BFE6CF"], ["lilac", "#D3C2E8"], ["orange", "#F0A04B"], ["brown", "#8A5A3A"], ["sky blue", "#8FB8D8"]];
  const CORD = [["brown cord", "#6B4A2E"], ["bottle-green cord", "#2C4A36"], ["denim", "#3C5A84"], ["fawn", "#B89A6A"], ["burgundy", "#5E1A28"], ["tan check", "#9A6A3A"]];
  const LADS = ["collar", "paisley", "kipper", "diamond", "carcoat"];
  const LADIES = ["maxi", "halter", "mini", "crochet", "wrap"];
  const COCKTAIL = [["Blue Lagoon", "#3BA7E0"], ["Pina Colada", "#F6EFD2"], ["Snowball", "#F4E79A"], ["Tequila Sunrise", "#F08A3C"], ["Babycham", "#F3E3A6"], ["Cinzano and lemonade", "#E8C98A"]];

  function design(seed, pref = "any") {
    const r = rng((seed >>> 0) * 2246822519 + 3266489917);
    const family = pref === "lads" ? "lads" : pref === "ladies" ? "ladies" : r() < 0.5 ? "lads" : "ladies";
    const kind = family === "lads" ? pick(r, LADS) : pick(r, LADIES);
    let main = pick(r, SEVENTIES), second = pick(r, SEVENTIES);
    while (second[1] === main[1]) second = pick(r, SEVENTIES);
    return {
      family, kind, main, second, shirt: pick(r, SHIRT), cord: pick(r, CORD), cocktail: pick(r, COCKTAIL),
      medallion: r() < 0.5, tank: r() < 0.4, sideburns: r() < 0.5, boots: r() < 0.5, headband: r() < 0.3, hoops: r() < 0.6,
      line: Math.floor(r() * 1000), half: r() < 0.5,
    };
  }

  const an = (w) => `${/^[aeiou]/i.test(w) ? "an" : "a"} ${w}`;
  const LOOKS = {
    collar: (d) => `${an(d.main[0])} shirt with a collar like a Concorde${d.medallion ? ", open to the sternum, and a medallion" : ""}`,
    paisley: (d) => `${an(d.main[0])} paisley shirt that can be heard from the car park`,
    kipper: (d) => `${an(d.main[0])} kipper tie as wide as a dinner plate${d.tank ? ` and ${an(d.second[0])} tank top` : ""}`,
    diamond: (d) => `${an(d.main[0])} and ${d.second[0]} diamond-pattern jumper, collar out`,
    carcoat: (d) => `${an(d.main[0])} car coat with a sheepskin collar, keys to a Cortina in the pocket`,
    maxi: (d) => `${an(d.main[0])} flowered maxi dress that sweeps the carpet`,
    halter: (d) => `${an(d.main[0])} halterneck jumpsuit with flares you could hide a cat in`,
    mini: (d) => `${an(d.main[0])} mini dress and white go-go boots`,
    crochet: (d) => `${an(d.main[0])} crochet waistcoat over a ${d.shirt[0]} blouse with a collar to match`,
    wrap: (d) => `${an(d.main[0])} and ${d.second[0]} wrap dress in a pattern nobody can look at for long`,
  };
  const TAILS = {
    lads: [
      "Smells strongly of Brut.", "Pint of bitter, no head, ta.", "Has parked the Capri on the pavement.", "Pam says it's very Bobby Ball.",
      "Insists it's machine washable.", "Looks ready to present Top of the Pops.", "The barman has asked where he got it. Nobody tells.",
      "Somewhere, a sofa is missing its cover.",
    ],
    ladies: [
      "With a cocktail and a paper umbrella, naturally.", "The jukebox has gone quiet in admiration.", "Pam wants to know where it's from. Chelsea Girl, obviously.",
      "Very Abba. Slightly Abbey Road.", "Has brought a Babycham glass from home.", "Smells of Charlie. The whole back room does now.",
      "Biscuit is transfixed.", "Could go straight on Pan's People.",
    ],
  };
  function caption(name, seed, pref) {
    const d = design(seed, pref);
    const tail = TAILS[d.family][d.line % TAILS[d.family].length];
    const verbs = ["has turned up in", "is wearing", "has come in", "arrives in"];
    return `${name ? `${name} ${verbs[d.line % verbs.length]}` : "You're in"} ${LOOKS[d.kind](d)}. ${tail}`;
  }

  /* ---------- patterns ---------- */
  const paisley = (id, a, b) => `<pattern id="${id}" width="28" height="32" patternUnits="userSpaceOnUse"><rect width="28" height="32" fill="${a}"/><path d="M8 7 Q15 1 17 9 Q19 19 9 21 Q3 21 5 15 Q7 11 11 13" fill="${b}" stroke="${shade(b, 0.65)}" stroke-width="1"/><circle cx="22" cy="25" r="3" fill="${shade(b, 1.35)}"/><circle cx="3" cy="28" r="1.6" fill="${shade(a, 1.4)}"/></pattern>`;
  const diamonds = (id, a, b) => `<pattern id="${id}" width="24" height="30" patternUnits="userSpaceOnUse"><rect width="24" height="30" fill="${a}"/><path d="M12 0 L24 15 L12 30 L0 15 Z" fill="${b}"/><path d="M0 0 L24 30 M24 0 L0 30" stroke="${shade(a, 1.5)}" stroke-width="1" opacity=".7"/></pattern>`;
  const flowers = (id, a, b, c) => `<pattern id="${id}" width="30" height="30" patternUnits="userSpaceOnUse"><rect width="30" height="30" fill="${a}"/>${[[8, 8], [23, 22]].map(([x, y]) => `<g transform="translate(${x} ${y})">${[0, 72, 144, 216, 288].map((t) => `<ellipse rx="3.4" ry="5.5" cy="-5" fill="${b}" transform="rotate(${t})"/>`).join("")}<circle r="3" fill="${c}"/></g>`).join("")}</pattern>`;
  const zigzag = (id, a, b) => `<pattern id="${id}" width="20" height="16" patternUnits="userSpaceOnUse"><rect width="20" height="16" fill="${a}"/><path d="M0 12 L5 4 L10 12 L15 4 L20 12" stroke="${b}" stroke-width="4" fill="none"/></pattern>`;
  const stripes = (id, a, b) => `<pattern id="${id}" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="12" height="12" fill="${a}"/><rect width="5" height="12" fill="${b}"/></pattern>`;
  const crochet = (id, a, b) => `<pattern id="${id}" width="18" height="18" patternUnits="userSpaceOnUse"><rect width="18" height="18" fill="${a}"/><rect x="3" y="3" width="12" height="12" rx="3" fill="none" stroke="${b}" stroke-width="2.4"/><circle cx="9" cy="9" r="2.4" fill="${b}"/></pattern>`;
  const check = (id, a) => `<pattern id="${id}" width="14" height="14" patternUnits="userSpaceOnUse"><rect width="14" height="14" fill="${a}"/><path d="M0 7 H14 M7 0 V14" stroke="${shade(a, 0.65)}" stroke-width="2.4" opacity=".7"/></pattern>`;

  /* ---------- pieces (box: 240 wide, 300 tall, y from -14) ---------- */
  const TORSO = "M46 124 Q48 106 72 100 L98 94 Q120 104 142 94 L168 100 Q192 106 194 124 L196 214 L44 214 Z";
  function hands(skin, metal) {
    const f = metal ? "#C9CBCF" : skin, s = metal ? "#8E9196" : shade(skin, 0.75);
    return `<circle cx="40" cy="216" r="9" fill="${f}" stroke="${s}" stroke-width="2"/><circle cx="200" cy="216" r="9" fill="${f}" stroke="${s}" stroke-width="2"/>`;
  }
  function flares(fill, shoe = "#3A2416", platform = true) {
    let out = "";
    for (const [x0, x1] of [[66, 112], [128, 174]]) out += `<path d="M${x0} 212 H${x1} L${x1 + 12} 262 Q${x1 + 12} 266 ${x1 + 7} 266 H${x0 - 7} Q${x0 - 12} 266 ${x0 - 12} 262 Z" fill="${fill}"/>`;
    const h = platform ? 12 : 8;
    out += `<path d="M54 ${270 - h + 8} Q52 ${258} 66 ${258} H114 V272 H58 Q52 272 54 268 Z" fill="${shoe}"/><path d="M186 ${270 - h + 8} Q188 258 174 258 H126 V272 H182 Q188 272 186 268 Z" fill="${shoe}"/>`
      + (platform ? `<rect x="54" y="268" width="60" height="5" fill="${shade(shoe, 0.6)}"/><rect x="126" y="268" width="60" height="5" fill="${shade(shoe, 0.6)}"/>` : "");
    return out;
  }
  function sleeves(fill, cuff) {
    return `<path d="M48 124 Q24 142 20 190 Q19 204 32 206 L58 206 L66 150 Z" fill="${fill}"/><path d="M192 124 Q216 142 220 190 Q221 204 208 206 L182 206 L174 150 Z" fill="${fill}"/>
      ${cuff ? `<rect x="22" y="198" width="36" height="10" rx="3" fill="${cuff}"/><rect x="182" y="198" width="36" height="10" rx="3" fill="${cuff}"/>` : ""}`;
  }
  /** The collar: big, pointed, all the way out to the shoulders. */
  function bigCollar(fill, open = true) {
    return `<path d="M100 94 L70 132 L96 120 L112 ${open ? 112 : 104} Z M140 94 L170 132 L144 120 L128 ${open ? 112 : 104} Z" fill="${fill}" stroke="${shade(fill, 0.7)}" stroke-width="1.6" stroke-linejoin="round"/>`;
  }
  function kipper(fill) {
    return `<path d="M113 104 L127 104 L124 114 L138 196 L120 214 L102 196 L116 114 Z" fill="${fill}" stroke="${shade("#000000", 1)}" stroke-opacity=".25" stroke-width="1.2"/><path d="M113 104 L127 104 L124 114 L116 114 Z" fill="${shade("#ffffff", 1)}" opacity=".18"/>`;
  }
  function medallion(skin) {
    return `<path d="M104 100 Q120 136 136 100" stroke="#E8CF86" stroke-width="2" fill="none"/><circle cx="120" cy="134" r="9" fill="#E3B341" stroke="#9A7420" stroke-width="2"/><path d="M116 134 L120 128 L124 134 L120 140 Z" fill="#9A7420"/><path d="M106 118 q4 -3 6 1 M128 122 q4 -3 6 1 M114 128 q3 -2 5 1" stroke="${shade(skin, 0.6)}" stroke-width="1.2" fill="none"/>`;
  }

  /* ---------- the drinks ---------- */
  function pint(half) {
    const top = half ? 176 : 158;
    return `<g class="drink pint"><path d="M188 ${top} L212 ${top} L209 218 Q200 222 191 218 Z" fill="#C98A2A" opacity=".92" stroke="#F4EAD2" stroke-width="2"/>
      <path d="M188 ${top} L212 ${top} L211.4 ${top + 9} L188.6 ${top + 9} Z" fill="#FBF6E8"/><ellipse cx="200" cy="${top}" rx="12" ry="3.2" fill="#FFFDF5"/>
      <path d="M194 ${top + 14} L193 214" stroke="#fff" stroke-width="2" opacity=".35" stroke-linecap="round"/>
      ${[0, 1, 2].map((i) => `<circle cx="${196 + i * 4}" cy="${top + 22 + i * 9}" r="1.1" fill="#FFF4D0" opacity=".7"/>`).join("")}</g>`;
  }
  function cocktail(d) {
    const c = d.cocktail[1];
    return `<g class="drink cocktail"><path d="M184 168 L216 168 L200 190 Z" fill="${c}" stroke="#F4EAD2" stroke-width="1.8" stroke-linejoin="round"/>
      <path d="M200 190 V212" stroke="#F4EAD2" stroke-width="2.4"/><ellipse cx="200" cy="213" rx="9" ry="2.4" fill="#F4EAD2"/>
      <circle cx="210" cy="166" r="4" fill="#C8102E"/><path d="M210 162 q2 -6 6 -8" stroke="#2E6B3A" stroke-width="1.4" fill="none"/>
      <g transform="translate(192 168) rotate(-28)"><path d="M0 0 V-26" stroke="#8A5A2B" stroke-width="1.6"/><path d="M-13 -24 Q0 -36 13 -24 Z" fill="${d.second[1]}" stroke="${shade(d.second[1], 0.6)}" stroke-width="1"/>
      <path d="M-13 -24 L0 -32 M13 -24 L0 -32 M0 -24 V-33" stroke="${shade(d.second[1], 0.6)}" stroke-width=".8"/></g></g>`;
  }

  /* ---------- the lads ---------- */
  function lads(d, id, skin, metal) {
    const k = d.kind, M = d.main[1], S2 = d.second[1];
    const cordId = `${id}c`;
    let defs = d.cord[0] === "tan check" ? check(cordId, d.cord[1]) : `<linearGradient id="${cordId}" x1="0" x2="1"><stop offset="0" stop-color="${shade(d.cord[1], 0.85)}"/><stop offset=".5" stop-color="${shade(d.cord[1], 1.1)}"/><stop offset="1" stop-color="${shade(d.cord[1], 0.85)}"/></linearGradient>`;
    const legs = flares(`url(#${cordId})`, pick(rng(d.line + 3), ["#3A2416", "#1E1A1C", "#7A4A22", "#F2EBDC"]), true);
    const shirtC = d.shirt[1];
    let body = "", sl = "", neck = "";
    if (k === "collar") {
      const shirtC = M;
      body = `<path d="${TORSO}" fill="${shirtC}"/>${d.medallion && !metal ? `<path d="M100 96 L120 150 L140 96 Q130 104 120 104 Q110 104 100 96 Z" fill="${skin}"/>${medallion(skin)}` : `<path d="M120 112 V210" stroke="${shade(shirtC, 0.8)}" stroke-width="1.6"/>${[128, 150, 172, 194].map((y) => `<circle cx="120" cy="${y}" r="2" fill="${shade(shirtC, 0.6)}"/>`).join("")}`}
        <rect x="44" y="204" width="152" height="12" rx="3" fill="#3A2416"/><rect x="110" y="202" width="20" height="16" rx="3" fill="none" stroke="#E8CF86" stroke-width="3"/>`;
      sl = sleeves(shirtC, shade(shirtC, 0.9));
      neck = bigCollar(shirtC, !!d.medallion && !metal);
    } else if (k === "paisley") {
      defs += paisley(`${id}p`, M, S2);
      body = `<path d="${TORSO}" fill="url(#${id}p)"/><path d="M100 96 L120 128 L140 96 Q130 104 120 104 Q110 104 100 96 Z" fill="${skin}"/>
        <path d="M120 128 V210" stroke="${shade(M, 0.6)}" stroke-width="1.6"/><rect x="44" y="204" width="152" height="12" rx="3" fill="#3A2416"/><rect x="110" y="202" width="20" height="16" rx="3" fill="none" stroke="#E8CF86" stroke-width="3"/>`;
      sl = sleeves(`url(#${id}p)`, M);
      neck = bigCollar(M, true);
    } else if (k === "kipper") {
      defs += stripes(`${id}t`, M, S2);
      body = d.tank
        ? `<path d="${TORSO}" fill="${shirtC}"/><path d="M62 126 Q70 104 98 98 L120 140 L142 98 Q170 104 178 126 L182 214 H58 Z" fill="${S2}"/><path d="M98 98 L120 140 L142 98" fill="none" stroke="${shade(S2, 0.6)}" stroke-width="5"/>
           <path d="M58 200 H182" stroke="${shade(S2, 0.6)}" stroke-width="8"/>`
        : `<path d="${TORSO}" fill="${shirtC}"/><rect x="44" y="204" width="152" height="12" rx="3" fill="#3A2416"/>`;
      sl = sleeves(shirtC, shade(shirtC, 0.9));
      neck = `${bigCollar(shirtC, false)}<g>${kipper(`url(#${id}t)`)}</g>`;
    } else if (k === "diamond") {
      defs += diamonds(`${id}d`, M, S2);
      body = `<path d="${TORSO}" fill="url(#${id}d)"/><path d="M98 98 Q120 112 142 98" fill="none" stroke="${shade(M, 0.55)}" stroke-width="7"/>
        <path d="M44 200 H196" stroke="${shade(M, 0.6)}" stroke-width="10"/>`;
      sl = `${sleeves(`url(#${id}d)`, shade(M, 0.6))}`;
      neck = bigCollar(shirtC, false);
    } else {   // car coat
      const coat = M;
      body = `<path d="M44 124 Q46 106 70 100 L98 94 Q120 104 142 94 L170 100 Q194 106 196 124 L202 238 Q120 248 38 238 Z" fill="${coat}"/>
        <path d="M96 100 L120 160 L144 100" fill="${shirtC}"/><path d="M114 104 L126 104 L124 112 L132 158 L120 168 L108 158 L116 112 Z" fill="${S2}"/>
        <path d="M120 160 V238" stroke="${shade(coat, 0.6)}" stroke-width="2"/>${[176, 198, 220].map((y) => `<g><rect x="106" y="${y - 3}" width="10" height="6" rx="2" fill="#E8D6B0"/><path d="M116 ${y} H126" stroke="#3A2416" stroke-width="2"/></g>`).join("")}
        <rect x="58" y="188" width="34" height="5" rx="2" fill="${shade(coat, 0.7)}"/><rect x="148" y="188" width="34" height="5" rx="2" fill="${shade(coat, 0.7)}"/>`;
      sl = sleeves(coat, null);
      let fleece = "";
      for (let i = 0; i <= 12; i++) { const t = i / 12; const x = 74 + t * 92; const y = 106 + Math.sin(t * Math.PI) * -6 + (t < 0.5 ? t * 40 : (1 - t) * 40); fleece += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7" fill="#F1E6CC"/>`; }
      neck = `<path d="M98 94 L70 126 L92 150 L114 112 Z M142 94 L170 126 L148 150 L126 112 Z" fill="#F1E6CC" stroke="#D8C9A6" stroke-width="2"/>${fleece}`;
    }
    return { defs, legs, body, sleeves: sl, neck, hands: hands(skin, metal), drink: pint(d.half) };
  }

  /* ---------- the ladies ---------- */
  function ladies(d, id, skin, metal) {
    const k = d.kind, M = d.main[1], S2 = d.second[1];
    const arm = metal ? "#B9BCC2" : skin;
    const armsOut = (col) => `<path d="M60 128 Q42 160 40 204" stroke="${col}" stroke-width="13" stroke-linecap="round" fill="none"/><path d="M180 128 Q198 160 200 204" stroke="${col}" stroke-width="13" stroke-linecap="round" fill="none"/>`;
    const shoes = (c) => `<path d="M88 268 Q90 258 102 258 H114 V272 H92 Q88 272 88 268 Z" fill="${c}"/><path d="M152 268 Q150 258 138 258 H126 V272 H148 Q152 272 152 268 Z" fill="${c}"/><rect x="96" y="270" width="14" height="5" fill="${shade(c, 0.6)}"/><rect x="130" y="270" width="14" height="5" fill="${shade(c, 0.6)}"/>`;
    let defs = "", body = "", legs = "", sl = "", neck = "";
    if (k === "maxi") {
      defs = flowers(`${id}f`, M, S2, "#F4EAD2");
      legs = shoes("#C9A24A");
      body = `<path d="M80 104 Q100 96 120 104 Q140 96 160 104 Q170 120 164 160 L178 264 Q120 276 62 264 L76 160 Q70 120 80 104 Z" fill="url(#${id}f)"/>
        <path d="M76 160 Q120 172 164 160" stroke="${shade(M, 0.6)}" stroke-width="5" fill="none"/><path d="M62 258 Q120 272 178 258" stroke="${shade(M, 0.55)}" stroke-width="5" fill="none"/>`;
      sl = `<path d="M74 106 Q44 130 30 196 Q42 206 58 200 L78 140 Z" fill="url(#${id}f)"/><path d="M166 106 Q196 130 210 196 Q198 206 182 200 L162 140 Z" fill="url(#${id}f)"/>`;
      neck = `<path d="M100 98 L120 120 L140 98" fill="${skin}" stroke="${shade(M, 0.6)}" stroke-width="3"/>`;
    } else if (k === "halter") {
      defs = `<linearGradient id="${id}h" x1="0" x2="1"><stop offset="0" stop-color="${shade(M, 0.75)}"/><stop offset=".4" stop-color="${shade(M, 1.15)}"/><stop offset="1" stop-color="${shade(M, 0.75)}"/></linearGradient>`;
      legs = `<path d="M80 200 H118 L112 266 H54 Z" fill="url(#${id}h)"/><path d="M122 200 H160 L186 266 H128 Z" fill="url(#${id}h)"/>${shoes("#E8CF86")}`;
      body = `<path d="M84 112 Q100 104 110 96 L120 98 L130 96 Q140 104 156 112 Q162 140 158 170 L162 204 H78 L82 170 Q78 140 84 112 Z" fill="url(#${id}h)"/>
        <path d="M110 96 L120 136 L130 96" fill="${skin}"/><path d="M104 94 Q120 82 136 94" stroke="${shade(M, 0.55)}" stroke-width="5" fill="none"/>
        <rect x="78" y="172" width="84" height="10" fill="${S2}"/><circle cx="120" cy="177" r="7" fill="none" stroke="#E8CF86" stroke-width="3"/>`;
      sl = armsOut(arm);
    } else if (k === "mini") {
      defs = zigzag(`${id}z`, M, S2);
      legs = `<path d="M92 210 L90 264 H108 L110 210 Z M130 210 L132 264 H150 L148 210 Z" fill="${skin}"/>
        <path d="M86 226 H112 L110 268 Q100 272 86 268 Z M128 226 H154 L154 268 Q140 272 130 268 Z" fill="#F7F4EC" stroke="#CFC8B8" stroke-width="1.5"/>`;
      body = `<path d="M82 104 Q100 96 120 104 Q140 96 158 104 Q166 130 164 160 L176 216 Q120 228 64 216 L76 160 Q74 130 82 104 Z" fill="url(#${id}z)"/>`;
      sl = `<path d="M74 106 Q52 120 48 150 Q58 158 70 152 L80 130 Z" fill="url(#${id}z)"/><path d="M166 106 Q188 120 192 150 Q182 158 170 152 L160 130 Z" fill="url(#${id}z)"/>${armsOut(arm)}`;
      neck = bigCollar("#F7F4EC", false);
    } else if (k === "crochet") {
      defs = crochet(`${id}k`, M, S2);
      legs = flares(shade(S2, 0.8), "#7A4A22", true);
      body = `<path d="${TORSO}" fill="${d.shirt[1]}"/><path d="M62 124 Q66 104 96 98 L112 170 L100 236 Q80 238 62 230 Z M178 124 Q174 104 144 98 L128 170 L140 236 Q160 238 178 230 Z" fill="url(#${id}k)"/>
        ${[0, 1, 2, 3, 4, 5].map((i) => `<path d="M${66 + i * 6} 230 l-2 10 M${174 - i * 6} 230 l2 10" stroke="${S2}" stroke-width="2"/>`).join("")}`;
      sl = sleeves(d.shirt[1], shade(d.shirt[1], 0.85));
      neck = bigCollar(d.shirt[1], true);
    } else {   // wrap dress
      defs = stripes(`${id}w`, M, S2);
      legs = shoes("#5A3622");
      body = `<path d="M80 104 Q100 96 120 104 Q140 96 160 104 Q168 130 162 160 L172 248 Q120 260 68 248 L78 160 Q72 130 80 104 Z" fill="url(#${id}w)"/>
        <path d="M104 100 L148 190" stroke="${shade(M, 0.5)}" stroke-width="4"/><path d="M78 160 Q120 170 162 160" stroke="${shade(M, 0.5)}" stroke-width="6" fill="none"/>
        <path d="M150 166 q10 6 4 22 M150 166 q-2 12 -12 20" stroke="${shade(M, 0.5)}" stroke-width="3" fill="none"/>`;
      sl = sleeves(`url(#${id}w)`, null);
      neck = `<path d="M104 98 L120 140 L136 98" fill="${skin}"/>`;
    }
    if (d.hoops && !metal) neck += `<circle cx="74" cy="80" r="7" fill="none" stroke="#E3B341" stroke-width="2.4"/><circle cx="166" cy="80" r="7" fill="none" stroke="#E3B341" stroke-width="2.4"/>`;
    return { defs, legs, body, sleeves: sl, neck, hands: hands(skin, metal), drink: cocktail(d) };
  }

  /** The full figure. head: an SVG fragment (a player's face from avatar.js, or GuffBot's picture). */
  function wear(seed, size, head, o = {}) {
    const d = design(seed, o.pref || "any");
    const id = uid("p");
    const skin = o.skin || "#EFC49E";
    const parts = d.family === "lads" ? lads(d, id, skin, !!o.metal) : ladies(d, id, skin, !!o.metal);
    const s = size || 160;
    const w = Math.round((s * 240) / 300);
    const headband = d.family === "ladies" && d.headband && !o.metal ? `<path d="M74 28 Q120 4 166 28" stroke="${d.second[1]}" stroke-width="7" fill="none" stroke-linecap="round"/>` : "";
    return `<svg class="figure pub${o.cls ? ` ${o.cls}` : ""}" viewBox="0 -14 240 300" width="${w}" height="${s}" role="img" aria-label="${o.label || "A player"} in ${LOOKS[d.kind](d)}">
      <defs>${parts.defs}</defs>
      ${parts.legs}${parts.sleeves}${parts.body}${parts.hands}
      <g class="fhead">${head}${headband}</g>
      ${parts.neck}
      ${o.noDrink ? "" : parts.drink}
      ${o.extra || ""}
    </svg>`;
  }

  const BOTHEAD = `<image href="guffbot.webp" x="56" y="-6" width="128" height="128"/>`;
  const at = (frag) => `<g transform="translate(56 -6)">${frag}</g>`;
  /** GuffBot down the pub: always a lad, in his flat cap, with a pint (and a Santa hat in December, from the page). */
  function guffbot(seed, size, o = {}) {
    return wear(seed * 7 + 1, size, BOTHEAD + at(o.hat || ""), { pref: "lads", metal: true, label: "GuffBot", cls: `house gb ${o.cls || ""}` });
  }
  /** Ms GuffBot: knotted hanky, a cigarette on the go, and a cocktail with an umbrella. */
  function ms(seed, size, o = {}) {
    return wear(seed * 13 + 5, size, BOTHEAD + at(o.hat || ""), { pref: "ladies", metal: true, label: "Ms GuffBot", cls: `house ms ${o.cls || ""}` });
  }

  root.Pub = { design, wear, guffbot, ms, caption, LOOKS };
})(typeof window !== "undefined" ? window : globalThis);
