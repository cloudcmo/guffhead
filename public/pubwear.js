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

  function design(seed, pref = "any", era = "pub") {
    if (ERA_KEYS.includes(era)) return designEra(seed, pref, era);
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

  const ERA_KEYS = ["britpop", "clean"];   // (the 1970s pub is the default below)
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
  function caption(name, seed, pref, era = "pub") {
    const d = design(seed, pref, era);
    const set = d.era ? TAILS_ERA[d.era] : TAILS;
    const tail = set[d.family][d.line % set[d.family].length];
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

  /* ====================== the other eras (Carl, 11 Nov 2026: "a 1990s britpop era and a modern clean 2030 look") ======================
     Same box, same hands, same head. The 90s: parkas, track tops, polos, Harringtons with a pint of lager; Union Jack
     dresses, slip dresses over T-shirts, combats and baby-doll dresses with something luminous in a bottle. 2030:
     hoodies, overshirts, quarter-zips and gilets with a craft can; knitted co-ords, big blazers, satin midis and
     cropped puffers with a spritz or an espresso martini. */
  const NINETIES = [["royal blue", "#2450A8"], ["red", "#D7263D"], ["navy", "#1B2A4A"], ["bottle green", "#1F5F3A"], ["burgundy", "#6E1B2C"], ["sky blue", "#7FB7E6"],
    ["mustard", "#D9A62B"], ["purple", "#5B2A86"], ["orange", "#F07A28"], ["black", "#1E1E22"], ["lime", "#9CCB3B"], ["teal", "#178E8A"]];
  const PARKA = [["khaki", "#6E6B3E"], ["olive", "#555F38"], ["navy", "#1F2A44"], ["sage", "#7C8862"]];
  const HARRINGTON = [["stone", "#C9B48A"], ["navy", "#1F2A44"], ["black", "#1E1E22"], ["burgundy", "#6E1B2C"], ["bottle green", "#1F4A36"]];
  const CLEANCOL = [["sage", "#9DB8A0"], ["oat", "#DCCFBD"], ["charcoal", "#3A3D44"], ["navy", "#22304A"], ["stone", "#BDB5A8"], ["terracotta", "#C8694A"],
    ["cobalt", "#3557D6"], ["butter", "#EED77F"], ["black", "#1A1B1F"], ["lilac", "#B4A5DE"], ["forest", "#2F5D46"], ["rust", "#B5512F"], ["ecru", "#ECE4D3"], ["sky", "#9CC3E6"]];
  const ALCOPOP = [["something blue", "#2F7BFF"], ["an orange Breezer", "#FF8A2A"], ["a Hooch", "#F2D53C"], ["something pink", "#FF5FA2"]];
  const ERA = {
    britpop: { lads: ["parka", "tracktop", "polo", "harrington"], ladies: ["unionjack", "slip", "combat", "babydoll"], cols: NINETIES },
    clean: { lads: ["hoodie", "overshirt", "quarterzip", "gilet"], ladies: ["coord", "blazer", "midi", "puffer"], cols: CLEANCOL },
  };
  function designEra(seed, pref, era) {
    const E = ERA[era];
    const r = rng((seed >>> 0) * 2654435761 + (era === "clean" ? 97 : 31));
    const family = pref === "lads" ? "lads" : pref === "ladies" ? "ladies" : r() < 0.5 ? "lads" : "ladies";
    const kind = pick(r, E[family]);
    let main = pick(r, E.cols), second = pick(r, E.cols);
    while (second[1] === main[1]) second = pick(r, E.cols);
    if (kind === "parka") main = pick(r, PARKA);
    if (kind === "harrington") main = pick(r, HARRINGTON);
    return { era, family, kind, main, second, pop: pick(r, ALCOPOP), dms: r() < 0.4, trackies: r() < 0.35, half: r() < 0.3, espresso: r() < 0.45, hoops: r() < 0.5, line: Math.floor(r() * 1000) };
  }
  Object.assign(LOOKS, {
    parka: (d) => `${an(d.main[0])} fishtail parka with the fur-trimmed hood round the ears`,
    tracktop: (d) => `${an(d.main[0])} track top with three white stripes down each arm`,
    polo: (d) => `${an(d.main[0])} polo shirt with a twin-tipped collar, buttoned right up`,
    harrington: (d) => `${an(d.main[0])} Harrington jacket with the tartan lining showing`,
    unionjack: () => "a Union Jack mini dress and platform trainers",
    slip: (d) => `${an(d.main[0])} satin slip dress over a white T-shirt, with Doc Martens`,
    combat: (d) => `${an(d.main[0])} crop top and combat trousers with more pockets than sense`,
    babydoll: (d) => `${an(d.main[0])} gingham baby-doll dress and knee socks`,
    hoodie: (d) => `${an(d.main[0])} heavyweight hoodie and box-fresh white trainers`,
    overshirt: (d) => `${an(d.main[0])} overshirt over ${an(d.second[0])} T-shirt`,
    quarterzip: (d) => `${an(d.main[0])} quarter-zip knit`,
    gilet: (d) => `${an(d.main[0])} puffer gilet over ${an(d.second[0])} long-sleeve top`,
    coord: (d) => `${an(d.main[0])} knitted co-ord with wide-leg trousers`,
    blazer: (d) => `an oversized ${d.main[0]} blazer over a white T-shirt`,
    midi: (d) => `${an(d.main[0])} satin midi skirt and ${an(d.second[0])} knit`,
    puffer: (d) => `a cropped ${d.main[0]} puffer and straight-leg jeans`,
  });
  const TAILS_ERA = {
    britpop: {
      lads: ["Smells strongly of CK One.", "Pint of lager, cheers.", "Has been practising the Liam walk.", "Pam says it's very Damon.", "Still has his Euro 96 ticket stub.",
        "Keeps saying \"mad fer it\".", "Has a Nokia with Snake on it.", "Biscuit is unimpressed."],
      ladies: ["With a bottle of something luminous.", "Pam says it's very Spice Girls.", "Smells of Impulse body spray.", "Has a Tamagotchi to keep alive.",
        "Could walk straight on to TFI Friday.", "Butterfly clips at the ready.", "Girl power, apparently.", "Knows every word of Wonderwall."],
    },
    clean: {
      lads: ["Paid with a watch.", "Asked if the beer is low-carb.", "Has 9,000 steps to protect.", "Ordered on the app from the next table.", "Won't say what the hoodie cost.",
        "Already posted about it.", "Biscuit sniffs the trainers. Approved.", "On the alcohol-free tonight. Mostly."],
      ladies: ["Spritz in hand, naturally.", "Has a podcast. Will mention it.", "Pam says it's very Scandi.", "Has rated the pub four stars already.",
        "Booked the table on an app.", "Everything is oatmeal and that's the point.", "Wants to know if the oat milk is barista.", "Already posted about it."],
    },
  };

  /* ---------- era pieces ---------- */
  const COAT = "M44 124 Q46 106 70 100 L98 94 Q120 104 142 94 L170 100 Q194 106 196 124 L202 238 Q120 248 38 238 Z";
  const CROP = "M58 124 Q62 106 90 98 L100 96 Q120 106 140 96 L150 98 Q178 106 182 124 L180 178 H60 Z";
  const ribs = (id, a) => `<pattern id="${id}" width="6" height="10" patternUnits="userSpaceOnUse"><rect width="6" height="10" fill="${a}"/><path d="M3 0 V10" stroke="${shade(a, 0.86)}" stroke-width="1.6"/></pattern>`;
  const quilt = (id, a) => `<pattern id="${id}" width="10" height="16" patternUnits="userSpaceOnUse"><rect width="10" height="16" fill="${a}"/><rect width="10" height="8" fill="${shade(a, 1.12)}"/><path d="M0 15.5 H10" stroke="${shade(a, 0.7)}" stroke-width="1.8"/></pattern>`;
  const tartan = (id) => `<pattern id="${id}" width="14" height="14" patternUnits="userSpaceOnUse"><rect width="14" height="14" fill="#B5262E"/><path d="M0 4 H14 M4 0 V14" stroke="#1F4A36" stroke-width="3.4" opacity=".85"/><path d="M0 10 H14 M10 0 V14" stroke="#1B2A4A" stroke-width="1.4" opacity=".8"/><path d="M0 7 H14 M7 0 V14" stroke="#E8C34A" stroke-width=".8"/></pattern>`;
  const gingham = (id, a) => `<pattern id="${id}" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="#FBFBF8"/><rect width="5" height="10" fill="${a}" opacity=".5"/><rect width="10" height="5" fill="${a}" opacity=".5"/></pattern>`;
  const flagFill = (id) => `<pattern id="${id}" patternUnits="userSpaceOnUse" x="60" y="100" width="120" height="130"><rect width="120" height="130" fill="#1F3C8F"/>
    <path d="M0 0 L120 130 M120 0 L0 130" stroke="#fff" stroke-width="20"/><path d="M0 0 L120 130 M120 0 L0 130" stroke="#C8102E" stroke-width="6"/>
    <path d="M60 0 V130 M0 65 H120" stroke="#fff" stroke-width="28"/><path d="M60 0 V130 M0 65 H120" stroke="#C8102E" stroke-width="16"/></pattern>`;
  const satin = (id, a) => `<linearGradient id="${id}" x1="0" x2="1"><stop offset="0" stop-color="${shade(a, 0.78)}"/><stop offset=".35" stop-color="${shade(a, 1.25)}"/><stop offset=".6" stop-color="${a}"/><stop offset="1" stop-color="${shade(a, 0.78)}"/></linearGradient>`;
  function bareArms(skin, w = 14) {
    return `<path d="M44 148 Q30 178 40 206" stroke="${skin}" stroke-width="${w}" stroke-linecap="round" fill="none"/><path d="M196 148 Q210 178 200 206" stroke="${skin}" stroke-width="${w}" stroke-linecap="round" fill="none"/>`;
  }
  function shortSleeves(fill, tip) {
    return `<path d="M48 124 Q30 134 26 158 L56 166 L66 140 Z" fill="${fill}"/><path d="M192 124 Q210 134 214 158 L184 166 L174 140 Z" fill="${fill}"/>
      ${tip ? `<path d="M27 154 L56 162 M213 154 L184 162" stroke="${tip}" stroke-width="3"/>` : ""}`;
  }
  /** Straight, baggy, wide or tapered legs, with stripes or cargo pockets. */
  function legs(fill, o = {}) {
    const f = o.wide ? 16 : o.baggy ? 7 : o.taper ? -6 : 0;
    let out = "";
    for (const [x0, x1] of [[68, 114], [126, 172]]) out += `<path d="M${x0} 206 H${x1} L${x1 + (x1 > 120 ? f : 0) + (x1 < 120 ? (o.taper ? -4 : 0) : 0)} 262 H${x0 - (x0 < 120 ? f : 0) + (x0 > 120 ? (o.taper ? 4 : 0) : 0)} Z" fill="${fill}"/>`;
    if (o.stripe) out += `<path d="M71 210 L${71 - f} 260 M169 210 L${169 + f} 260" stroke="${o.stripe}" stroke-width="4"/>`;
    if (o.pockets) out += `<rect x="${66 - f / 2}" y="226" width="20" height="18" rx="2" fill="${shade(fill, 0.85)}" stroke="${shade(fill, 0.65)}" stroke-width="1.5"/><rect x="${154 + f / 2}" y="226" width="20" height="18" rx="2" fill="${shade(fill, 0.85)}" stroke="${shade(fill, 0.65)}" stroke-width="1.5"/>`;
    if (o.taper) out += `<rect x="70" y="254" width="40" height="8" fill="${shade(fill, 0.85)}"/><rect x="130" y="254" width="40" height="8" fill="${shade(fill, 0.85)}"/>`;
    return out;
  }
  /** Feet: trainers (with stripes), platforms, Doc Martens, clean white sneakers, ankle boots, Mary Janes. */
  function feet(kind, col = "#F4F4F0") {
    const L = "M54 270 Q52 257 66 255 H114 V270 Z", R = "M186 270 Q188 257 174 255 H126 V270 Z";
    if (kind === "dms") return `<path d="M54 272 Q52 250 70 249 H114 V272 Z" fill="#17171A"/><path d="M186 272 Q188 250 170 249 H126 V272 Z" fill="#17171A"/><path d="M56 269 H114 M184 269 H126" stroke="#E8C34A" stroke-width="1.6" stroke-dasharray="3 2"/><rect x="54" y="271" width="60" height="5" fill="#2A2A2E"/><rect x="126" y="271" width="60" height="5" fill="#2A2A2E"/>`;
    if (kind === "ankle" || kind === "mary") {
      const c = col;
      return `<path d="M86 270 Q88 ${kind === "ankle" ? 246 : 256} 102 ${kind === "ankle" ? 246 : 256} H114 V272 H90 Q86 272 86 270 Z" fill="${c}"/><path d="M154 270 Q152 ${kind === "ankle" ? 246 : 256} 138 ${kind === "ankle" ? 246 : 256} H126 V272 H150 Q154 272 154 270 Z" fill="${c}"/>
        <rect x="104" y="270" width="8" height="6" fill="${shade(c, 0.6)}"/><rect x="128" y="270" width="8" height="6" fill="${shade(c, 0.6)}"/>${kind === "mary" ? `<path d="M96 258 H114 M126 258 H144" stroke="${shade(c, 0.6)}" stroke-width="2"/>` : ""}`;
    }
    const sole = kind === "platform" ? 9 : 4;
    let out = `<path d="${L}" fill="${col}" stroke="#CFCFCB" stroke-width="1.2"/><path d="${R}" fill="${col}" stroke="#CFCFCB" stroke-width="1.2"/>
      <rect x="52" y="269" width="62" height="${sole}" rx="2" fill="${kind === "platform" ? "#F4F4F0" : "#DADAD5"}" stroke="#BDBDB8" stroke-width="1"/><rect x="126" y="269" width="62" height="${sole}" rx="2" fill="${kind === "platform" ? "#F4F4F0" : "#DADAD5"}" stroke="#BDBDB8" stroke-width="1"/>`;
    if (kind === "stripes") out += [0, 1, 2].map((i) => `<path d="M${80 + i * 7} 256 l6 13 M${160 - i * 7} 256 l-6 13" stroke="#F4F4F0" stroke-width="3"/>`).join("");
    return out;
  }
  function zip(y0, y1, col = "#E8E8E4") { return `<path d="M120 ${y0} V${y1}" stroke="${col}" stroke-width="2.4"/><rect x="117" y="${y0}" width="6" height="9" rx="1.5" fill="${col}"/>`; }
  /* the drinks */
  function lager(half) { return pint(half).replace('fill="#C98A2A"', 'fill="#E8B73A"').replace("pint", "pint lager"); }
  function bottle(col) {
    return `<g class="drink bottle"><path d="M195 166 h10 v12 q8 6 8 16 v22 q0 4 -4 4 h-18 q-4 0 -4 -4 v-22 q0 -10 8 -16 Z" fill="${col}" opacity=".92" stroke="#F4F4F0" stroke-width="1.6"/>
      <rect x="194" y="162" width="12" height="5" rx="1.5" fill="#C9CBCF"/><rect x="189" y="198" width="22" height="12" rx="2" fill="#F4F4F0" opacity=".92"/><path d="M196 202 h8" stroke="${col}" stroke-width="2"/>
      <path d="M203 146 L201 196" stroke="#FF5FA2" stroke-width="2.6" stroke-linecap="round"/></g>`;
  }
  function can(col) {
    return `<g class="drink can"><rect x="189" y="170" width="22" height="48" rx="4" fill="${col}" stroke="#E6E8EC" stroke-width="1.6"/><rect x="190" y="170" width="20" height="5" rx="2" fill="#C9CDD4"/>
      <rect x="189" y="186" width="22" height="18" fill="#F7F7F5" opacity=".92"/><path d="M194 195 q6 -8 12 0" stroke="${col}" stroke-width="2.4" fill="none"/></g>`;
  }
  function spritz() {
    return `<g class="drink spritz"><path d="M187 162 Q186 190 200 192 Q214 190 213 162 Z" fill="#F26B1D" opacity=".9" stroke="#F4F4F0" stroke-width="1.6"/>
      <rect x="193" y="170" width="7" height="7" rx="1.5" fill="#fff" opacity=".45"/><rect x="201" y="176" width="7" height="7" rx="1.5" fill="#fff" opacity=".4"/>
      <circle cx="209" cy="164" r="6" fill="#FF9A3C" stroke="#FFD9A8" stroke-width="1.4"/><path d="M209 158 V170 M203 164 H215" stroke="#FFD9A8" stroke-width="1"/>
      <path d="M200 192 V212" stroke="#F4F4F0" stroke-width="2.2"/><ellipse cx="200" cy="213" rx="9" ry="2.4" fill="#F4F4F0"/></g>`;
  }
  function espresso() {
    return `<g class="drink espresso"><path d="M184 170 Q186 188 200 190 Q214 188 216 170 Z" fill="#3B2418" stroke="#F4F4F0" stroke-width="1.6"/><ellipse cx="200" cy="171" rx="15.5" ry="3" fill="#C8A27A"/>
      ${[[195, 170], [200, 169], [205, 170]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="2" ry="1.3" fill="#2A160C"/>`).join("")}
      <path d="M200 190 V212" stroke="#F4F4F0" stroke-width="2.2"/><ellipse cx="200" cy="213" rx="9" ry="2.4" fill="#F4F4F0"/></g>`;
  }

  function eraLads(d, id, skin, metal) {
    const k = d.kind, M = d.main[1], S2 = d.second[1];
    const arm = metal ? "#B9BCC2" : skin;
    let defs = "", body = "", sl = "", neck = "", lg = "";
    if (d.era === "britpop") {
      const jeans = d.trackies ? "#1E1E22" : "#3C5A84";
      lg = legs(jeans, { baggy: true, stripe: d.trackies ? "#F4F4F0" : null }) + feet(d.dms ? "dms" : "stripes", d.dms ? "" : pick(rng(d.line), ["#2450A8", "#D7263D", "#1F5F3A", "#1E1E22"]));
      if (k === "parka") {
        body = `<path d="${COAT}" fill="${M}"/><path d="M98 98 L120 130 L142 98" fill="${S2}"/>${zip(130, 238, shade(M, 0.6))}
          <path d="M60 176 H94 V184 H60 Z M146 176 H180 V184 H146 Z" fill="${shade(M, 0.8)}"/><circle cx="66" cy="232" r="3" fill="#8A7F6E"/><circle cx="174" cy="232" r="3" fill="#8A7F6E"/>`;
        sl = sleeves(M, shade(M, 0.75));
        let fur = "";
        for (let i = 0; i <= 14; i++) { const t = i / 14; const x = 70 + t * 100; const y = 104 + Math.sin(t * Math.PI) * -4 + (t < 0.5 ? t * 30 : (1 - t) * 30); fur += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7.5" fill="${i % 2 ? "#9A8E78" : "#B1A58E"}"/>`; }
        neck = fur;
      } else if (k === "tracktop") {
        body = `<path d="${TORSO}" fill="${M}"/>${zip(104, 214)}<rect x="44" y="204" width="152" height="10" fill="${shade(M, 0.75)}"/>`;
        const stripe = (dx) => `<path d="M${50 + dx} 128 Q${28 + dx} 146 ${24 + dx} 194" stroke="#F4F4F0" stroke-width="3" fill="none"/><path d="M${190 - dx} 128 Q${212 - dx} 146 ${216 - dx} 194" stroke="#F4F4F0" stroke-width="3" fill="none"/>`;
        sl = sleeves(M, shade(M, 0.75)) + stripe(0) + stripe(6) + stripe(12);
        neck = `<path d="M98 96 Q120 108 142 96 L140 106 Q120 116 100 106 Z" fill="${shade(M, 0.8)}"/><path d="M99 101 Q120 112 141 101" stroke="#F4F4F0" stroke-width="2" fill="none"/>`;
      } else if (k === "polo") {
        body = `<path d="${TORSO}" fill="${M}"/><path d="M114 104 V138 M126 104 V138" stroke="${shade(M, 0.75)}" stroke-width="1.6"/><circle cx="120" cy="120" r="2.2" fill="${shade(M, 0.6)}"/><circle cx="120" cy="132" r="2.2" fill="${shade(M, 0.6)}"/>
          <path d="M146 126 q4 -6 8 0 q-4 6 -8 0" fill="${S2}"/>`;
        sl = bareArms(arm) + shortSleeves(M, S2);
        neck = `<path d="M100 94 L94 114 L114 108 L118 100 Z M140 94 L146 114 L126 108 L122 100 Z" fill="${M}" stroke="${shade(M, 0.65)}" stroke-width="1.4"/><path d="M96 111 L113 106 M144 111 L127 106" stroke="${S2}" stroke-width="2"/><path d="M95 108 L112 103 M145 108 L128 103" stroke="#F4F4F0" stroke-width="1.4"/>`;
      } else {   // Harrington
        defs = tartan(`${id}t`);
        body = `<path d="M44 124 Q46 106 70 100 L98 94 Q120 104 142 94 L170 100 Q194 106 196 124 L196 214 H44 Z" fill="${M}"/>
          <path d="M104 100 L106 214 H134 L136 100 Q120 108 104 100 Z" fill="${S2}"/><path d="M100 100 L104 214 M140 100 L136 214" stroke="url(#${id}t)" stroke-width="6"/>
          <rect x="44" y="202" width="152" height="12" fill="${shade(M, 0.8)}"/><path d="M60 150 L92 146 M180 150 L148 146" stroke="${shade(M, 0.7)}" stroke-width="3"/>`;
        sl = sleeves(M, shade(M, 0.8));
        neck = `<path d="M96 96 Q120 110 144 96 L144 104 Q120 118 96 104 Z" fill="${shade(M, 0.9)}" stroke="${shade(M, 0.65)}" stroke-width="1.4"/>`;
      }
      return { defs, legs: lg, body, sleeves: sl, neck, hands: hands(skin, metal), drink: lager(d.half) };
    }
    // 2030
    const trouser = pick(rng(d.line + 1), ["#22304A", "#BDB5A8", "#3A3D44", "#2F3A2F", "#E9E4DA"]);
    lg = (k === "hoodie" ? legs(shade(M, 0.8), { taper: true }) : legs(k === "gilet" ? "#46607E" : trouser)) + feet("clean", "#FAFAF8");
    if (k === "hoodie") {
      body = `<path d="M82 102 Q120 78 158 102 Q140 112 120 112 Q100 112 82 102 Z" fill="${shade(M, 0.82)}"/><path d="${TORSO}" fill="${M}"/>
        <path d="M112 112 L110 146 M128 112 L130 146" stroke="#F4F4F0" stroke-width="2.4" stroke-linecap="round"/><rect x="107" y="144" width="5" height="7" rx="1" fill="#D8D8D4"/><rect x="128" y="144" width="5" height="7" rx="1" fill="#D8D8D4"/>
        <path d="M84 170 H156 L150 204 H90 Z" fill="${shade(M, 0.9)}" stroke="${shade(M, 0.75)}" stroke-width="1.4"/><rect x="44" y="204" width="152" height="10" fill="${shade(M, 0.85)}"/>`;
      sl = sleeves(M, shade(M, 0.85));
      neck = `<path d="M100 100 Q120 116 140 100" stroke="${shade(M, 0.75)}" stroke-width="5" fill="none"/>`;
    } else if (k === "overshirt") {
      body = `<path d="${TORSO}" fill="${M}"/><path d="M104 98 Q120 106 136 98 L134 214 H106 Z" fill="${S2}"/><path d="M104 100 L106 214 M136 100 L134 214" stroke="${shade(M, 0.7)}" stroke-width="1.6"/>
        <rect x="62" y="128" width="28" height="26" rx="2" fill="${shade(M, 0.92)}" stroke="${shade(M, 0.7)}" stroke-width="1.2"/><rect x="150" y="128" width="28" height="26" rx="2" fill="${shade(M, 0.92)}" stroke="${shade(M, 0.7)}" stroke-width="1.2"/>
        <path d="M62 128 H90 V136 H62 Z M150 128 H178 V136 H150 Z" fill="${shade(M, 0.82)}"/>${[150, 175, 200].map((y) => `<circle cx="101" cy="${y}" r="2" fill="${shade(M, 0.55)}"/>`).join("")}`;
      sl = sleeves(M, shade(M, 0.85));
      neck = `<path d="M100 94 L94 112 L110 106 Z M140 94 L146 112 L130 106 Z" fill="${M}" stroke="${shade(M, 0.7)}" stroke-width="1.4"/>`;
    } else if (k === "quarterzip") {
      defs = ribs(`${id}r`, M);
      body = `<path d="${TORSO}" fill="url(#${id}r)"/>${zip(98, 146, "#C9CBCF")}<rect x="44" y="202" width="152" height="12" fill="${shade(M, 0.85)}"/>`;
      sl = sleeves(`url(#${id}r)`, shade(M, 0.85));
      neck = `<path d="M98 92 Q120 100 142 92 L142 106 Q120 114 98 106 Z" fill="${shade(M, 0.92)}" stroke="${shade(M, 0.7)}" stroke-width="1.4"/>${zip(96, 112, "#C9CBCF")}`;
    } else {   // gilet
      defs = quilt(`${id}q`, M);
      body = `<path d="${TORSO}" fill="${S2}"/><path d="M60 118 Q66 102 96 96 Q120 104 144 96 Q174 102 180 118 L184 216 H56 Z" fill="url(#${id}q)"/>${zip(98, 216, shade(M, 0.55))}`;
      sl = sleeves(S2, shade(S2, 0.85));
      neck = `<path d="M96 92 Q120 100 144 92 L144 106 Q120 114 96 106 Z" fill="${shade(M, 0.95)}" stroke="${shade(M, 0.7)}" stroke-width="1.4"/>`;
    }
    return { defs, legs: lg, body, sleeves: sl, neck, hands: hands(skin, metal), drink: can(pick(rng(d.line + 2), ["#2B2D42", "#E07A5F", "#3D8B7A", "#F2CC8F", "#5B5BD6"])) };
  }

  function eraLadies(d, id, skin, metal) {
    const k = d.kind, M = d.main[1], S2 = d.second[1];
    const arm = metal ? "#B9BCC2" : skin;
    const armsOut = `<path d="M62 128 Q44 160 40 204" stroke="${arm}" stroke-width="13" stroke-linecap="round" fill="none"/><path d="M178 128 Q196 160 200 204" stroke="${arm}" stroke-width="13" stroke-linecap="round" fill="none"/>`;
    const bareLegs = `<path d="M92 200 L90 262 H110 L112 200 Z M128 200 L130 262 H150 L148 200 Z" fill="${arm}"/>`;
    let defs = "", body = "", sl = "", neck = "", lg = "";
    if (d.era === "britpop") {
      if (k === "unionjack") {
        defs = flagFill(`${id}u`);
        lg = bareLegs + feet("platform");
        body = `<path d="M82 104 Q100 96 120 104 Q140 96 158 104 Q166 130 164 160 L174 220 Q120 232 66 220 L76 160 Q74 130 82 104 Z" fill="url(#${id}u)" stroke="#14204A" stroke-width="1.5"/>`;
        sl = armsOut;
      } else if (k === "slip") {
        defs = satin(`${id}s`, M);
        lg = bareLegs + feet("dms");
        body = `<path d="${TORSO}" fill="#F7F7F2"/><path d="M84 116 Q120 128 156 116 L162 160 L172 250 Q120 260 68 250 L78 160 Z" fill="url(#${id}s)"/>
          <path d="M90 116 L96 100 M150 116 L144 100" stroke="${shade(M, 0.7)}" stroke-width="2"/>`;
        sl = bareArms(arm, 12) + shortSleeves("#F7F7F2");
        neck = `<path d="M100 96 Q120 108 140 96" stroke="#DADAD5" stroke-width="4" fill="none"/>`;
      } else if (k === "combat") {
        const camo = pick(rng(d.line), ["#5A5E3A", "#1E1E22", "#7C7458"]);
        lg = `<path d="M70 190 H170 L172 214 H68 Z" fill="${camo}"/>` + legs(camo, { baggy: true, pockets: true }) + feet("platform");
        body = `<path d="M70 176 H170 L170 196 H70 Z" fill="${arm}"/><path d="${CROP}" fill="${M}"/>`;
        sl = armsOut;
        neck = `<path d="M100 98 Q120 112 140 98" stroke="${shade(M, 0.7)}" stroke-width="3" fill="none"/>`;
      } else {   // baby-doll
        defs = gingham(`${id}g`, M);
        lg = `<path d="M92 210 L90 262 H110 L112 210 Z M128 210 L130 262 H150 L148 210 Z" fill="${arm}"/><path d="M90 232 H110 L110 258 H90 Z M130 232 H150 L150 258 H130 Z" fill="#FBFBF8" stroke="#DADAD5" stroke-width="1"/>` + feet("mary", "#17171A");
        body = `<path d="M84 104 Q100 98 120 104 Q140 98 156 104 Q162 124 158 148 L184 224 Q120 238 56 224 L82 148 Q78 124 84 104 Z" fill="url(#${id}g)" stroke="${shade(M, 0.7)}" stroke-width="1.4"/>
          <path d="M82 148 Q120 156 158 148" stroke="${shade(M, 0.7)}" stroke-width="3" fill="none"/>`;
        sl = armsOut + `<path d="M76 106 Q56 112 54 134 Q66 142 78 134 Z M164 106 Q184 112 186 134 Q174 142 162 134 Z" fill="url(#${id}g)" stroke="${shade(M, 0.7)}" stroke-width="1.2"/>`;
        neck = `<path d="M98 98 Q104 112 120 110 Q136 112 142 98 Q130 104 120 104 Q110 104 98 98 Z" fill="#FBFBF8" stroke="#DADAD5" stroke-width="1.4"/>`;
      }
      if (d.hoops && !metal) neck += `<circle cx="74" cy="80" r="7" fill="none" stroke="#E3B341" stroke-width="2.4"/><circle cx="166" cy="80" r="7" fill="none" stroke="#E3B341" stroke-width="2.4"/>`;
      return { defs, legs: lg, body, sleeves: sl, neck, hands: hands(skin, metal), drink: bottle(d.pop[1]) };
    }
    // 2030
    if (k === "coord") {
      defs = ribs(`${id}r`, M);
      lg = legs(`url(#${id}r)`, { wide: true }) + feet("ankle", "#2A2A2E");
      body = `<path d="M70 200 H170 L172 214 H68 Z" fill="url(#${id}r)"/><path d="M60 122 Q64 104 92 98 Q120 106 148 98 Q176 104 180 122 L178 204 H62 Z" fill="url(#${id}r)"/>`;
      sl = sleeves(`url(#${id}r)`, shade(M, 0.88));
      neck = `<path d="M100 98 Q120 108 140 98" stroke="${shade(M, 0.8)}" stroke-width="4" fill="none"/>`;
    } else if (k === "blazer") {
      lg = legs(S2, { wide: true }) + feet("ankle", "#3A2A20");
      body = `<path d="${COAT}" fill="${M}"/><path d="M100 98 Q120 108 140 98 L136 238 H104 Z" fill="#F7F7F2"/>
        <path d="M98 96 L84 150 L102 176 L108 120 Z M142 96 L156 150 L138 176 L132 120 Z" fill="${shade(M, 0.9)}" stroke="${shade(M, 0.7)}" stroke-width="1.4"/>
        <path d="M60 196 H90 M150 196 H180" stroke="${shade(M, 0.7)}" stroke-width="3"/><circle cx="104" cy="196" r="2.6" fill="${shade(M, 0.55)}"/>`;
      sl = sleeves(M, null);
    } else if (k === "midi") {
      defs = satin(`${id}s`, M);
      lg = `<path d="M94 250 L92 262 H110 L112 250 Z M128 250 L130 262 H148 L146 250 Z" fill="${arm}"/>` + feet("ankle", "#2A2A2E");
      body = `<path d="${TORSO}" fill="${S2}"/><path d="M68 196 H172 L182 256 Q120 266 58 256 Z" fill="url(#${id}s)"/>`;
      sl = sleeves(S2, shade(S2, 0.85));
      neck = `<path d="M100 98 Q120 108 140 98" stroke="${shade(S2, 0.8)}" stroke-width="4" fill="none"/>`;
    } else {   // cropped puffer
      defs = quilt(`${id}q`, M);
      lg = `<path d="M70 196 H170 L172 214 H68 Z" fill="#46607E"/>` + legs("#46607E") + feet("clean", "#FAFAF8");
      body = `<path d="M40 126 Q44 102 74 96 Q120 106 166 96 Q196 102 200 126 L198 204 Q120 214 42 204 Z" fill="url(#${id}q)"/>${zip(104, 208, shade(M, 0.55))}`;
      sl = `<path d="M46 124 Q18 140 16 192 Q16 208 34 208 L60 206 L66 150 Z" fill="url(#${id}q)"/><path d="M194 124 Q222 140 224 192 Q224 208 206 208 L180 206 L174 150 Z" fill="url(#${id}q)"/>`;
      neck = `<path d="M92 92 Q120 102 148 92 L150 110 Q120 120 90 110 Z" fill="${shade(M, 1.05)}" stroke="${shade(M, 0.7)}" stroke-width="1.4"/>`;
    }
    if (d.hoops && !metal) neck += `<circle cx="74" cy="82" r="3.4" fill="#D9C27A"/><circle cx="166" cy="82" r="3.4" fill="#D9C27A"/>`;
    return { defs, legs: lg, body, sleeves: sl, neck, hands: hands(skin, metal), drink: d.espresso ? espresso() : spritz() };
  }

  /** The full figure. head: an SVG fragment (a player's face from avatar.js, or GuffBot's picture). */
  function wear(seed, size, head, o = {}) {
    const d = design(seed, o.pref || "any", o.era || "pub");
    const id = uid("p");
    const skin = o.skin || "#EFC49E";
    const parts = d.era ? (d.family === "lads" ? eraLads : eraLadies)(d, id, skin, !!o.metal) : d.family === "lads" ? lads(d, id, skin, !!o.metal) : ladies(d, id, skin, !!o.metal);
    const s = size || 160;
    const w = Math.round((s * 240) / 300);
    const headband = !d.era && d.family === "ladies" && d.headband && !o.metal ? `<path d="M74 28 Q120 4 166 28" stroke="${d.second[1]}" stroke-width="7" fill="none" stroke-linecap="round"/>` : "";
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
    return wear(seed * 7 + 1, size, BOTHEAD + at(o.hat || ""), { pref: "lads", era: o.era, metal: true, label: "GuffBot", cls: `house gb ${o.cls || ""}` });
  }
  /** Ms GuffBot: knotted hanky, a cigarette on the go, and a cocktail with an umbrella. */
  function ms(seed, size, o = {}) {
    return wear(seed * 13 + 5, size, BOTHEAD + at(o.hat || ""), { pref: "ladies", era: o.era, metal: true, label: "Ms GuffBot", cls: `house ms ${o.cls || ""}` });
  }

  root.Pub = { design, wear, guffbot, ms, caption, LOOKS };
})(typeof window !== "undefined" ? window : globalThis);
