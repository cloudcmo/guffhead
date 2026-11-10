// CountGuff: GuffBot's jumpers. A different one every round, as the best
// dictionary-corner guests always managed. Drawn as SVG from a seed, so both
// players see the same jumper on the same round, and no two games match.
//
//   Jumper.svg(seed, size)   -> GuffBot in that round's jumper, cords and shoes
//   Jumper.name(seed)        -> "the Hebridean Zigzag in mustard and plum"
//   Jumper.caption(seed)     -> "Today GuffBot is rocking mustard and plum mohair."
//
// The commentary is cosy and knowingly naff (Carl, 24 Oct 2026): fashion-page
// phrasing applied to bad knitwear, never a dig at anyone.

(function (root) {
  "use strict";

  function rng(seed) {
    let s = (seed >>> 0) || 1;
    return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const pick = (r, a) => a[Math.floor(r() * a.length)];

  const WOOL = [
    ["mustard", "#D9A126"], ["plum", "#6E3B5C"], ["bottle green", "#1F5F4A"], ["rust", "#B4512B"], ["teal", "#1F6F78"], ["cherry", "#B5263E"],
    ["oatmeal", "#E6D7B8"], ["navy", "#23355B"], ["heather", "#8E6E9E"], ["tangerine", "#E8772E"], ["moss", "#6E7F3A"], ["raspberry", "#C7407A"],
    ["duck egg", "#9CC9C3"], ["cocoa", "#5A3E2B"], ["lemon", "#EBD86A"], ["sky", "#5FA8D3"], ["lime", "#9BC53D"], ["burgundy", "#6B1F2E"],
  ];
  const TROUSERS = [["#8A6A4B", "cords"], ["#3C4A6B", "jeans"], ["#5A5A52", "slacks"], ["#7B4B3A", "cords"], ["#2E3A3A", "slacks"], ["#9A8C6A", "chinos"]];   // kept so design() draws its random numbers in the same order: the jumpers mustn't change

  /* The trousers (Carl, 4 Nov 2026: "mustard cords, fire-engine red twills, bottle green oxford bags. Anything
     traditional, eccentric or country rural oddball"). Drawn from their own seed stream, so the jumper, the
     fabric and the caption template stay exactly as they were. Each cut is drawn to match: wide bags, plus
     fours with socks, jodhpurs with boots, wales on the cords, patches on the gardening trousers. */
  const TROUSER_COLOURS = [
    ["mustard", "#C99A1E"], ["fire-engine red", "#C8211E"], ["bottle green", "#1F5F4A"], ["racing green", "#1E4D2B"], ["burnt orange", "#C25A1C"],
    ["salmon pink", "#E3876F"], ["tobacco", "#7A5230"], ["conker", "#8B3E1F"], ["plum", "#6E3B5C"], ["mulberry", "#6B2340"], ["ochre", "#B9852A"],
    ["sage", "#8FA27A"], ["lovat", "#6E7D5A"], ["navy", "#23355B"], ["cornflower", "#5B7CC2"], ["petrol blue", "#1F5A6B"], ["oatmeal", "#CDBD98"],
    ["damson", "#4D2A47"], ["tan", "#B07A45"], ["heather", "#8E6E9E"], ["buttercup", "#E3BC3A"], ["aubergine", "#4B2445"], ["claret", "#7A1F35"],
    ["mole grey", "#6F665C"], ["duck egg", "#9CC9C3"], ["rhubarb", "#C2506A"], ["moss", "#6E7F3A"], ["sky blue", "#6FB0DC"],
  ];
  // cut: straight | wide | plus | jodh. tex: wale (fine / thick), twill, tweed, patch, crease, or none.
  const CUTS = [
    { k: "cords", cut: "straight", tex: "wale" }, { k: "jumbo cords", cut: "straight", tex: "jumbo" }, { k: "needlecords", cut: "straight", tex: "needle" },
    { k: "twills", cut: "straight", tex: "twill" }, { k: "cavalry twills", cut: "straight", tex: "twill" }, { k: "moleskins", cut: "straight", tex: "" },
    { k: "flannels", cut: "straight", tex: "crease" }, { k: "oxford bags", cut: "wide", tex: "crease" }, { k: "plus fours", cut: "plus", tex: "tweed" },
    { k: "tweed breeks", cut: "plus", tex: "tweed" }, { k: "jodhpurs", cut: "jodh", tex: "" }, { k: "dungarees", cut: "straight", tex: "" },
    { k: "gardening trousers", cut: "straight", tex: "patch" }, { k: "corduroy flares", cut: "wide", tex: "wale" }, { k: "chinos", cut: "straight", tex: "crease" },
  ];
  // a line or two that only fits that cut
  const CUT_LINES = {
    "oxford bags": ["{T}. There's room in each leg for a small family of voles.", "{T}, flapping in the breeze like a pair of windsocks at a village airfield."],
    "plus fours": ["{T} and {S} socks. Dressed for a round of golf nobody has asked him to play.", "{T}. Somewhere, a grouse is nervous."],
    "tweed breeks": ["{T} and {S} socks. Ready for a brisk walk to somewhere he'll complain about.", "{T}. He's been told there's no shooting today. He's dressed for it anyway."],
    "jodhpurs": ["{T} and riding boots. He hasn't got a horse. He's got a bicycle called Horace.", "{T}. The pony club rang. They want them back."],
    "dungarees": ["{T}. Under the jumper there's a bib pocket, and in the bib pocket there's a pencil.", "{T}, in case a tractor needs him at short notice."],
    "gardening trousers": ["{T}, patched at the knee from forty years of weeding.", "{T}. Those knees have seen more onion beds than you've had hot dinners."],
    "corduroy flares": ["{T}. Last worn to a barn dance in 1976. He remembers it fondly; nobody else does.", "{T}. They swish. He knows they swish."],
    "jumbo cords": ["{T}. You could grow cress in those ridges.", "{T}: you can hear him coming from the next parish."],
    "needlecords": ["{T}, for when ordinary cords feel a bit showy.", "{T}. Fine wale, fine fellow."],
    "cavalry twills": ["{T}. Very much what a retired colonel wears to judge the marrows.", "{T}, with a crease you could slice a Victoria sponge with."],
    "moleskins": ["{T}. No moles were harmed. He checked.", "{T}, soft as a Labrador's ear."],
  };
  const TROUSER_LINES = [
    "Below the knitwear: {T}. Worn to the village show in 1987 and every day since.",
    "{T} today. He says they're for best. Today is apparently best.",
    "And on the bottom half: {T}, a good inch too short. He calls that ready for puddles.",
    "{T}. Last seen at a point-to-point, being admired by a horse.",
    "The {T} have been in the family longer than the dog.",
    "Note the {T}. Bought at an agricultural show from a man called Clive.",
    "Ask him about the {T}. Actually, don't. It's a forty-minute story.",
    "{T}, with bicycle clips. He hasn't got a bicycle.",
    "The {T} were his grandad's. So was the crease.",
    "{T}. Smart enough for church, rugged enough for a hedge.",
    "Teamed with {T} and odd socks. The odd socks are a statement. Nobody knows what about.",
    "{T}. The vicar complimented them. The vicar may have been being kind.",
    "Today's trousers: {T}. Today's mood: parish council.",
    "{T}. Bought at a cattle auction, on a nod he didn't mean to make.",
    "He's gone for {T}, as one does on a {D}.",
    "{T}, rolled at the ankle in case of a ford.",
    "The {T} have survived three fêtes, a tombola and a ferret.",
    "Is that {T}? It is. Steady on.",
    "{T}. Practical, if you're a land agent in 1953.",
    "{J} up top, {T} below. The WI have been informed.",
    "{T}, held up by baler twine and optimism.",
    "{T}. A bold choice for the bring-and-buy.",
    "Bottom half by the church jumble sale: {T}, 20p, haggled down from 30.",
    "{T} with a hanky in the back pocket for emergencies and conkers.",
    "Spot the {T}. Hard not to.",
    "{T}. Folded nightly over a chair, never once ironed.",
  ];
  const DAYS = ["Tuesday", "Wednesday", "bank holiday", "market day", "Sunday", "half-day closing"];

  function trousers(seed) {
    const r = rng(seed * 2654435761 + 131);
    const [cname, hex] = pick(r, TROUSER_COLOURS);
    const cut = pick(r, CUTS);
    return { cname, hex, k: cut.k, cut: cut.cut, tex: cut.tex, T: `${cname} ${cut.k}`, talk: r(), line: Math.floor(r() * 1000), day: pick(r, DAYS) };
  }
  const PATTERNS = ["stripes", "zigzag", "argyle", "fairisle", "hearts", "snow", "tartan", "spots"];
  const ADJ = ["Hebridean", "Shetland", "Dictionary Corner", "Teatime", "Tuesday", "Cosy", "Festive", "Alarming", "Grandad's", "Sunday", "Yorkshire", "Devon", "Bold", "Quiet", "Mustn't-grumble", "Fireside"];
  const PATTERN_NAMES = { stripes: "Stripe", zigzag: "Zigzag", argyle: "Argyle", fairisle: "Fair Isle", hearts: "Heart", snow: "Snowflake", tartan: "Tartan", spots: "Polka Dot", pudding: "Christmas Pudding", tree: "Christmas Tree", robin: "Robin" };
  const FABRIC = ["mohair", "lambswool", "chunky knit", "Shetland wool", "market-stall acrylic", "bouclé", "cable knit", "a wool that may once have been a sheep", "brushed cotton", "something his aunt sent"];

  // Christmas (Carl, 6 Nov 2026): in the season (window.CountGuffXmas, 20 to 31 December) every jumper comes off the
  // festive rail: snowflakes, Fair Isle, puddings, trees or robins, in red, green, cream and gold. Drawn from the same
  // seed stream after the usual picks, so nothing else about the jumper or the trousers moves.
  const XMAS_WOOL = [["cherry", "#B5263E"], ["bottle green", "#1F5F4A"], ["oatmeal", "#E6D7B8"], ["navy", "#23355B"], ["lemon", "#EBD86A"], ["burgundy", "#6B1F2E"], ["moss", "#6E7F3A"], ["mustard", "#D9A126"]];
  const XMAS_PATTERNS = ["snow", "fairisle", "pudding", "tree", "robin", "snow", "fairisle"];
  const XMAS_ADJ = ["Festive", "Mulled", "Yuletide", "Boxing Day", "Midwinter", "Office Party", "Novelty", "Stocking-Filler", "Brandy-Buttered", "Crackers"];
  function design(seed) {
    const r = rng(seed * 2654435761 + 97);
    let pattern = pick(r, PATTERNS);
    let a = pick(r, WOOL), b = pick(r, WOOL), c = pick(r, WOOL);
    while (b === a) b = pick(r, WOOL);
    while (c === a || c === b) c = pick(r, WOOL);
    const d = { pattern, a, b, c, adj: pick(r, ADJ), ribbed: r() < 0.5, trousers: pick(r, TROUSERS), fabric: pick(r, FABRIC), tpl: Math.floor(r() * 10) };
    const t = trousers(seed);
    d.trousers = [t.hex, t.k];   // [colour, cut], as before
    d.trou = t;
    if (root.CountGuffXmas) {
      const x = rng(seed * 2246822519 + 7);
      d.pattern = pick(x, XMAS_PATTERNS);
      d.a = pick(x, XMAS_WOOL); d.b = pick(x, XMAS_WOOL); d.c = pick(x, XMAS_WOOL);
      while (d.b === d.a) d.b = pick(x, XMAS_WOOL);
      while (d.c === d.a || d.c === d.b) d.c = pick(x, XMAS_WOOL);
      d.adj = pick(x, XMAS_ADJ);
      d.xmas = true;
    }
    return d;
  }

  function name(seed) {
    const d = design(seed);
    return `the ${d.adj} ${PATTERN_NAMES[d.pattern]} in ${d.a[0]} and ${d.b[0]}`;
  }

  /** One line of fashion commentary. Short, varied, fond. */
  const XMAS_LINES = [
    "The Christmas jumper: {A} and {B} {P}. Worn ironically. Nobody is convinced.",
    "{A} and {B} {P}, bought in a sale in January and saved all year. Worth it.",
    "{P} in {A} and {B}. It plays a tune if you press the pudding. Please don't press the pudding.",
    "This year's novelty knit: {A} {P}, {B} trim, {T} below. The office party is at four.",
    "{A} and {B} {P}. His aunt knitted it. His aunt has a lot to answer for.",
    "A {P} number in {A} and {B}. Smells faintly of mulled wine. So does he.",
    "{A} and {B}, {P}. He's been wearing it since the first of December. You can tell.",
    "{P}, {A} on {B}. Itchy, festive, non-negotiable.",
    "Festive knitwear: {A} and {B} {P}. The {T} are not festive. The {T} are never festive.",
    "{A} and {B} {P}. One of the snowflakes lights up. It's the wrong one.",
  ];
  function caption(seed) {
    const d = design(seed);
    const [A, B] = [d.a[0], d.b[0]];
    const P = PATTERN_NAMES[d.pattern].toLowerCase().replace("christmas", "Christmas");
    const T = d.trou.T;
    const cap = (x) => x.charAt(0).toUpperCase() + x.slice(1);
    if (d.xmas) return cap(XMAS_LINES[d.tpl % XMAS_LINES.length].replace(/\{A\}/g, A).replace(/\{B\}/g, B).replace(/\{P\}/g, P).replace(/\{T\}/g, T));
    if (d.trou.talk < 0.5) {   // the trousers get the line (4 Nov 2026)
      const own = CUT_LINES[d.trou.k] || [];
      const pool = [...own, ...own, ...TROUSER_LINES];   // their own lines come up a bit more often
      const line = pool[d.trou.line % pool.length];
      return cap(line.replace(/\{T\}/g, T).replace(/\{S\}/g, d.b[0]).replace(/\{J\}/g, `${cap(A)} and ${B}`).replace(/\{D\}/g, d.trou.day));
    }
    // "a wool that may once have been a sheep" and "something his aunt sent" need an "in" (25 Oct 2026)
    const F = /^(a |something)/.test(d.fabric) ? `, in ${d.fabric}` : ` ${d.fabric}`;
    const lines = [
      `Today GuffBot is rocking ${A} and ${B}${F}.`,
      `GuffBot in ${A} ${P}, ${B} accents, ${T} to match. Bold.`,
      `The knitwear: ${A} and ${B}${F}. The ${T}: a choice.`,
      `${cap(A)} ${P} over ${T}. He's calling it a look.`,
      `Fresh from the drawer: ${d.fabric} in ${A} and ${B}.`,
      `GuffBot wears ${A}, ${B} and confidence.`,
      `${/^[aeiou]/.test(P) ? "An" : "A"} ${P} number in ${A} and ${B}. The ${T} came free with it.`,
      `${d.fabric.charAt(0).toUpperCase() + d.fabric.slice(1)}, ${A} and ${B}, pre-loved. Loved a lot, by the look of it.`,
      `This season's ${P}, in ${A} and ${B}. Every season's ${T}.`,
      `${A.charAt(0).toUpperCase() + A.slice(1)} and ${B} today. He asked if it was too much. Nobody answered.`,
    ];
    return lines[d.tpl % lines.length];
  }

  const cap0 = (x) => x.charAt(0).toUpperCase() + x.slice(1);
  /** Half the length, for the top of the games page (Carl, 1 Nov 2026: people know the game now). */
  function short(seed) {
    const d = design(seed);
    const [A, B] = [d.a[0], d.b[0]];
    const P = PATTERN_NAMES[d.pattern].toLowerCase().replace("christmas", "Christmas");
    const T = d.trou.T;
    if (d.xmas) { const xl = [`Christmas jumper: ${A} and ${B} ${P}. Itchy.`, `${cap0(A)} and ${B} ${P}. Festive. Non-negotiable.`, `The ${P} jumper is out. It's that time.`, `${cap0(A)} ${P}, worn since the first. You can tell.`]; return xl[d.tpl % xl.length]; }
    if (d.trou.talk < 0.35) {
      const tl = [`${A} and ${B} up top, ${T} below.`, `Today: ${T}. Steady on.`, `In ${T}. Bold.`, `${T}, and confidence.`];
      const x = tl[d.trou.line % tl.length];
      return x.charAt(0).toUpperCase() + x.slice(1);
    }
    const lines = [`Today: ${A} and ${B} ${P}.`, `He's in ${A} and ${B}. Bold.`, `${A.charAt(0).toUpperCase() + A.slice(1)} ${P} today. A choice.`, `${A.charAt(0).toUpperCase() + A.slice(1)} and ${B}. He's calling it a look.`, `Wearing ${A} and ${B}, and confidence.`];
    return lines[d.tpl % lines.length];
  }

  // the pattern fills the torso, which is drawn in a 240-wide box
  function patternDef(id, d) {
    const [, A] = d.a, [, B] = d.b, [, C] = d.c;
    switch (d.pattern) {
      case "stripes": return `<pattern id="${id}" width="24" height="24" patternUnits="userSpaceOnUse"><rect width="24" height="24" fill="${A}"/><rect y="12" width="24" height="12" fill="${B}"/></pattern>`;
      case "zigzag": return `<pattern id="${id}" width="40" height="28" patternUnits="userSpaceOnUse"><rect width="40" height="28" fill="${A}"/><path d="M0 20 L10 6 L20 20 L30 6 L40 20" fill="none" stroke="${B}" stroke-width="6"/><path d="M0 28 L10 14 L20 28 L30 14 L40 28" fill="none" stroke="${C}" stroke-width="3"/></pattern>`;
      case "argyle": return `<pattern id="${id}" width="48" height="56" patternUnits="userSpaceOnUse"><rect width="48" height="56" fill="${A}"/><path d="M24 0 L48 28 L24 56 L0 28 Z" fill="${B}"/><path d="M0 0 L48 56 M48 0 L0 56" stroke="${C}" stroke-width="2" stroke-dasharray="3 4"/></pattern>`;
      case "fairisle": return `<pattern id="${id}" width="32" height="40" patternUnits="userSpaceOnUse"><rect width="32" height="40" fill="${A}"/><rect y="0" width="32" height="6" fill="${B}"/><rect y="34" width="32" height="6" fill="${B}"/><path d="M8 12 L16 20 L8 28 L0 20 Z M24 12 L32 20 L24 28 L16 20 Z" fill="${C}"/><circle cx="16" cy="3" r="2" fill="${C}"/><circle cx="0" cy="37" r="2" fill="${C}"/><circle cx="32" cy="37" r="2" fill="${C}"/></pattern>`;
      case "hearts": return `<pattern id="${id}" width="36" height="36" patternUnits="userSpaceOnUse"><rect width="36" height="36" fill="${A}"/><path d="M18 30 C6 21 4 14 9 10 C13 7 17 10 18 13 C19 10 23 7 27 10 C32 14 30 21 18 30 Z" fill="${B}"/></pattern>`;
      case "snow": return `<pattern id="${id}" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="40" height="40" fill="${A}"/><g stroke="${B}" stroke-width="2.5" stroke-linecap="round"><path d="M20 6 V34 M6 20 H34 M10 10 L30 30 M30 10 L10 30"/></g><circle cx="20" cy="20" r="3" fill="${C}"/></pattern>`;
      case "tartan": return `<pattern id="${id}" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="40" height="40" fill="${A}"/><rect x="8" width="12" height="40" fill="${B}" opacity=".8"/><rect y="8" width="40" height="12" fill="${B}" opacity=".8"/><rect x="26" width="4" height="40" fill="${C}"/><rect y="26" width="40" height="4" fill="${C}"/></pattern>`;
      // the festive rail (6 Nov 2026): a Christmas pudding with custard and a sprig, a tree with baubles, a robin
      case "pudding": return `<pattern id="${id}" width="44" height="44" patternUnits="userSpaceOnUse"><rect width="44" height="44" fill="${A}"/><circle cx="22" cy="26" r="13" fill="#4A2A18"/><path d="M9 24 Q14 14 22 16 Q30 14 35 24 Q30 20 26 23 Q22 18 18 23 Q14 20 9 24 Z" fill="#FFF4DC"/><circle cx="22" cy="12" r="2.2" fill="#B5263E"/><path d="M19 11 L16 8 M25 11 L28 8" stroke="#2E7D4F" stroke-width="2" stroke-linecap="round"/><circle cx="18" cy="30" r="1.3" fill="${C}"/><circle cx="26" cy="32" r="1.3" fill="${C}"/></pattern>`;
      case "tree": return `<pattern id="${id}" width="40" height="46" patternUnits="userSpaceOnUse"><rect width="40" height="46" fill="${A}"/><path d="M20 6 L30 18 H25 L33 28 H27 L35 38 H5 L13 28 H7 L15 18 H10 Z" fill="#2E7D4F"/><rect x="17" y="38" width="6" height="5" fill="#6B3F22"/><circle cx="16" cy="22" r="2" fill="${B}"/><circle cx="24" cy="30" r="2" fill="${C}"/><circle cx="14" cy="34" r="2" fill="${B}"/><path d="M20 2 L21.5 5.5 L25 6 L22.5 8.3 L23 12 L20 10 L17 12 L17.5 8.3 L15 6 L18.5 5.5 Z" fill="#EBD86A"/></pattern>`;
      case "robin": return `<pattern id="${id}" width="44" height="40" patternUnits="userSpaceOnUse"><rect width="44" height="40" fill="${A}"/><ellipse cx="22" cy="24" rx="11" ry="9" fill="#7A5230"/><circle cx="30" cy="17" r="6" fill="#7A5230"/><ellipse cx="24" cy="25" rx="7" ry="6" fill="#D9542B"/><circle cx="32" cy="16" r="1.2" fill="#15191C"/><path d="M36 17 L40 18 L36 19 Z" fill="#E8A33A"/><path d="M11 24 Q4 20 6 28" stroke="#7A5230" stroke-width="2.5" fill="none"/><path d="M18 33 V37 M24 33 V37" stroke="#E8A33A" stroke-width="1.5"/><circle cx="8" cy="8" r="1.5" fill="${B}"/><circle cx="38" cy="34" r="1.5" fill="${C}"/></pattern>`;
      default: return `<pattern id="${id}" width="28" height="28" patternUnits="userSpaceOnUse"><rect width="28" height="28" fill="${A}"/><circle cx="7" cy="7" r="5" fill="${B}"/><circle cx="21" cy="21" r="5" fill="${C}"/></pattern>`;
    }
  }

  /** The legs, per cut. Each leg is a shape; the cloth's texture is laid over the same shape. Box as build(). */
  function legs(d, id) {
    const t = d.trou, C = t.hex, dark = "rgba(0,0,0,.18)";
    const shapes = [];
    let extra = "";
    for (const [x0, x1] of [[66, 112], [128, 174]]) {
      const mid = (x0 + x1) / 2;
      if (t.cut === "wide") {   // oxford bags and flares: wider every inch down, the hem over the shoes
        shapes.push(`M${x0} 212 H${x1} L${x1 + 7} 262 Q${x1 + 7} 266 ${x1 + 3} 266 H${x0 - 3} Q${x0 - 7} 266 ${x0 - 7} 262 Z`);
      } else if (t.cut === "plus") {   // plus fours and breeks: blousy to below the knee, a band, then long socks in the jumper's second colour
        shapes.push(`M${x0 - 2} 212 H${x1 + 2} Q${x1 + 6} 230 ${x1 + 2} 244 H${x0 - 2} Q${x0 - 6} 230 ${x0 - 2} 212 Z`);
        extra += `<rect x="${x0 + 4}" y="242" width="${x1 - x0 - 8}" height="14" fill="${d.b[1]}"/>
          <path d="M${x0 + 4} 249 H${x1 - 4}" stroke="${d.c[1]}" stroke-width="3"/>
          <rect x="${x0}" y="239" width="${x1 - x0}" height="6" rx="3" fill="${C}" stroke="rgba(0,0,0,.25)" stroke-width="1"/>`;
      } else if (t.cut === "jodh") {   // jodhpurs: flared at the thigh, tight below, into riding boots
        shapes.push(`M${x0} 212 H${x1} Q${x1 + 9} 226 ${x1 - 4} 240 H${x0 + 4} Q${x0 - 9} 226 ${x0} 212 Z`);
        extra += `<path d="M${x0 + 4} 236 H${x1 - 4} V258 H${x0 + 4} Z" fill="#2A1D17"/><path d="M${x0 + 4} 238 H${x1 - 4}" stroke="#5A4034" stroke-width="2"/>`;
      } else {
        shapes.push(`M${x0 + 8} 212 H${x1 - 8} Q${x1} 212 ${x1} 220 V256 Q${x1} 264 ${x1 - 8} 264 H${x0 + 8} Q${x0} 264 ${x0} 256 V220 Q${x0} 212 ${x0 + 8} 212 Z`);
      }
      if (t.tex === "patch") extra += `<ellipse cx="${mid}" cy="234" rx="12" ry="9" fill="rgba(0,0,0,.22)" stroke="rgba(255,255,255,.35)" stroke-width="1.2" stroke-dasharray="2 2"/>`;
      if (t.tex === "crease") extra += `<path d="M${mid} 214 V${t.cut === "wide" ? 264 : 262}" stroke="${dark}" stroke-width="1.6"/>`;
    }
    const tex = {
      wale: `<pattern id="${id}t" width="6" height="8" patternUnits="userSpaceOnUse"><path d="M3 0 V8" stroke="${dark}" stroke-width="1.6"/></pattern>`,
      jumbo: `<pattern id="${id}t" width="10" height="8" patternUnits="userSpaceOnUse"><path d="M5 0 V8" stroke="${dark}" stroke-width="3.4"/></pattern>`,
      needle: `<pattern id="${id}t" width="3.5" height="8" patternUnits="userSpaceOnUse"><path d="M1.75 0 V8" stroke="rgba(0,0,0,.14)" stroke-width="1"/></pattern>`,
      twill: `<pattern id="${id}t" width="6" height="6" patternUnits="userSpaceOnUse"><path d="M0 6 L6 0" stroke="rgba(0,0,0,.12)" stroke-width="1.4"/></pattern>`,
      tweed: `<pattern id="${id}t" width="8" height="8" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="rgba(255,255,255,.3)"/><circle cx="6" cy="5" r="1" fill="rgba(0,0,0,.25)"/><path d="M0 7 L3 4" stroke="rgba(0,0,0,.15)" stroke-width="1"/></pattern>`,
    }[t.tex] || "";
    const fill = shapes.map((p) => `<path d="${p}" fill="${C}"/>`).join("");
    const over = tex ? shapes.map((p) => `<path d="${p}" fill="url(#${id}t)"/>`).join("") : "";
    const knee = t.cut === "straight" && !t.tex ? `<path d="M66 236 H112 M128 236 H174" stroke="rgba(0,0,0,.15)" stroke-width="2"/>` : "";
    return `${tex ? `<defs>${tex}</defs>` : ""}${fill}${over}${knee}${extra}`;
  }

  /**
   * GuffBot in this round's jumper, with cords and shoes so it reads as knitwear
   * on a person rather than a coat (Carl, 24 Oct 2026). `size` is the box height in px.
   * Box: 240 wide, 300 tall (y from -14).
   */
  /** A Santa hat at Christmas (20 to 31 December, public/touches.js sets the flag): on top of his head. */
  const hat = () => (root.CountGuffXmas ? `<g class="hat"><path d="M78 26 Q118 -34 166 6 L158 14 Q120 -14 86 32 Z" fill="#C8102E"/><path d="M72 30 Q120 -2 170 16 Q174 24 166 28 Q120 6 80 38 Q70 38 72 30 Z" fill="#FFF8E6"/><circle cx="168" cy="6" r="8" fill="#FFF8E6"/></g>` : "");
  function svg(seed, size) { return build(seed, size); }

  /** GuffBot in this round's jumper. `o` (for the poses, 31 Oct 2026) can swap the hanging sleeves for posed
      arms, tilt his head, change his eyes and add props; with no `o` he is exactly the standing GuffBot. */
  function build(seed, size, o = {}) {
    const d = design(seed);
    const id = `j${(seed >>> 0).toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
    const rib = d.ribbed ? d.b[1] : d.a[1];
    const s = size || 160;
    const w = Math.round((s * 240) / 300);
    // rib lines: short vertical strokes repeated
    const ribs = (x, y, wd, h, n) => { let out = ""; for (let i = 1; i < n; i++) out += `<line x1="${x + (wd * i) / n}" y1="${y + 2}" x2="${x + (wd * i) / n}" y2="${y + h - 2}" stroke="rgba(0,0,0,.18)" stroke-width="1.5"/>`; return out; };
    const hanging = `
      <!-- sleeves, hanging, with hands -->
      <path d="M48 124 Q24 142 20 190 Q19 204 32 206 L58 206 L66 150 Z" fill="url(#${id})" stroke="${rib}" stroke-width="2"/>
      <path d="M192 124 Q216 142 220 190 Q221 204 208 206 L182 206 L174 150 Z" fill="url(#${id})" stroke="${rib}" stroke-width="2"/>
      <rect x="20" y="194" width="40" height="14" rx="4" fill="${rib}"/>${ribs(20, 194, 40, 14, 8)}
      <rect x="180" y="194" width="40" height="14" rx="4" fill="${rib}"/>${ribs(180, 194, 40, 14, 8)}
      <circle cx="40" cy="216" r="9" fill="#C9CBCF" stroke="#8E9196" stroke-width="2"/>
      <circle cx="200" cy="216" r="9" fill="#C9CBCF" stroke="#8E9196" stroke-width="2"/>`;
    const arms = o.arms ? o.arms.map((a) => arm(a, id, rib)).join("") : "";
    return `<svg class="jumper${o.cls ? ` ${o.cls}` : ""}" viewBox="0 -14 240 300" width="${w}" height="${s}" role="img" aria-label="${o.who ? `${o.who} in` : "GuffBot in"} ${name(seed)} and ${d.trou.T}${o.label || ""}">
      <defs>${patternDef(id, d)}
        <pattern id="${id}k" width="6" height="6" patternUnits="userSpaceOnUse"><path d="M0 3 Q1.5 0 3 3 Q4.5 6 6 3" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="1"/></pattern>
        <clipPath id="${id}c"><path d="M46 124 Q48 106 72 100 L98 94 Q120 104 142 94 L168 100 Q192 106 194 124 L196 214 L44 214 Z"/></clipPath>
      </defs>
      <g class="pbody">
      <!-- legs first, behind the hem: cut and cloth to match the caption (4 Nov 2026) -->
      ${legs(d, id)}
      <path d="M60 266 Q58 254 70 254 H112 V270 H64 Q58 270 60 266 Z" fill="#3B2A22"/>
      <path d="M180 266 Q182 254 170 254 H128 V270 H176 Q182 270 180 266 Z" fill="#3B2A22"/>
      <path d="M66 258 H112 M128 258 H174" stroke="#2A1D17" stroke-width="2"/>
      <!-- torso -->
      <g clip-path="url(#${id}c)">
        <rect x="0" y="80" width="240" height="160" fill="url(#${id})"/>
        <rect x="0" y="80" width="240" height="160" fill="url(#${id}k)"/>
      </g>
      ${o.arms ? "" : hanging}
      <!-- hem and collar, ribbed -->
      <rect x="44" y="208" width="152" height="16" rx="4" fill="${rib}"/>${ribs(44, 208, 152, 16, 30)}
      <path d="M94 96 Q120 118 146 96 Q150 108 120 118 Q90 108 94 96 Z" fill="${rib}"/>
      ${o.armsOver ? "" : arms}
      <!-- GuffBot himself -->
      <g${o.tilt ? ` transform="rotate(${o.tilt} 120 118)"` : ""}><g class="phead">
        ${o.head || `<image href="guffbot.webp" x="56" y="-6" width="128" height="128"/>`}${o.face || ""}
        ${hat()}
      </g></g>
      ${o.armsOver ? arms : ""}
      ${o.extra || ""}
      </g>
    </svg>`;
  }

  /** A player in this game's jumper and trousers (the avatars, 6 Nov 2026): `head` is an SVG fragment drawn
      in GuffBot's head box (public/avatar.js). Same body, same seed stream, so the outfit matches the caption. */
  function wear(seed, size, head, o = {}) {
    return build(seed, size, { head, who: o.label || "A player", cls: `worn${o.cls ? ` ${o.cls}` : ""}` });
  }

  /* ---------- GuffBot's poses (Carl, 31 Oct 2026) ----------
     On a round's report, once it's revealed, GuffBot reacts to who won it, from the point of view of whoever is
     looking: cheering your win, wincing at theirs, applauding a shared round, shrugging at a blank. Against
     GuffBot himself it's personal: he gloats when he wins it and sulks when you do. Each pose is an arm shape
     (shoulder, elbow, wrist), a head tilt, a change of eyes, and a prop or two. styles.css animates them a few
     times on arrival, then he holds the pose. */
  function arm([sx, sy, ex, ey, wx, wy, side, hand = true], id, rib) {
    let ux = wx - ex, uy = wy - ey;
    const L = Math.hypot(ux, uy) || 1;
    ux /= L; uy /= L;
    const cx = +(wx - ux * 12).toFixed(1), cy = +(wy - uy * 12).toFixed(1);   // where the cuff starts
    const tube = `M${sx} ${sy} Q${ex} ${ey} ${cx} ${cy}`;
    return `<g class="arm ${side}">
        <path d="${tube}" stroke="rgba(0,0,0,.28)" stroke-width="38" stroke-linecap="round" fill="none"/>
        <path d="${tube}" stroke="${rib}" stroke-width="34" stroke-linecap="round" fill="none"/>
        <path d="${tube}" stroke="url(#${id})" stroke-width="29" stroke-linecap="round" fill="none"/>
        <path d="${tube}" stroke="url(#${id}k)" stroke-width="29" stroke-linecap="round" fill="none"/>
        <line x1="${cx}" y1="${cy}" x2="${wx}" y2="${wy}" stroke="rgba(0,0,0,.28)" stroke-width="35"/>
        <line x1="${cx}" y1="${cy}" x2="${wx}" y2="${wy}" stroke="${rib}" stroke-width="31"/>
        <line x1="${cx}" y1="${cy}" x2="${wx}" y2="${wy}" stroke="rgba(0,0,0,.18)" stroke-width="31" stroke-dasharray="1.5 4"/>
        ${hand ? `<circle cx="${+(wx + ux * 8).toFixed(1)}" cy="${+(wy + uy * 8).toFixed(1)}" r="9" fill="#C9CBCF" stroke="#8E9196" stroke-width="2"/>` : ""}
      </g>`;
  }
  // his eyes sit at (99.5, 63) and (139, 62.5) on the screen of his face
  const EYES = [[99.5, 63], [139, 62.5]];
  const blank = EYES.map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="16" ry="13.5" fill="#15191C" stroke="#23282B" stroke-width="1.5"/>`).join("");
  const W = "#F4EFE6", Y = "#E9B21C", K = "#15191C";
  const FACES = {
    happy: blank + EYES.map(([x, y]) => `<path d="M${x - 10} ${y + 5} Q${x} ${y - 11} ${x + 10} ${y + 5}" stroke="${W}" stroke-width="5" stroke-linecap="round" fill="none"/>`).join(""),
    smug: blank + EYES.map(([x, y]) => `<ellipse cx="${x}" cy="${y + 1}" rx="12" ry="9" fill="${W}"/><path d="M${x - 12.5} ${y + 1} A12.5 9.5 0 0 1 ${x + 12.5} ${y + 1} Z" fill="${Y}"/><path d="M${x - 13} ${y + 1} H${x + 13}" stroke="#B9860F" stroke-width="2"/><circle cx="${x - 4}" cy="${y + 5}" r="3.6" fill="${K}"/>`).join(""),
    squeeze: blank + `<path d="M${EYES[0][0] - 8} ${EYES[0][1] - 7} L${EYES[0][0] + 7} ${EYES[0][1]} L${EYES[0][0] - 8} ${EYES[0][1] + 7}" stroke="${W}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M${EYES[1][0] + 8} ${EYES[1][1] - 7} L${EYES[1][0] - 7} ${EYES[1][1]} L${EYES[1][0] + 8} ${EYES[1][1] + 7}" stroke="${W}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
    narrow: blank + EYES.map(([x, y], i) => `<ellipse cx="${x}" cy="${y + 3}" rx="12" ry="5" fill="${W}"/><circle cx="${x + 6}" cy="${y + 3}" r="3.4" fill="${K}"/><path d="M${i ? x - 11 : x + 11} ${y - 4} L${i ? x + 12 : x - 12} ${y - 10}" stroke="${Y}" stroke-width="4" stroke-linecap="round"/>`).join(""),
    brows: EYES.map(([x, y]) => `<path d="M${x - 10} ${y - 15} Q${x} ${y - 21} ${x + 10} ${y - 15}" stroke="${Y}" stroke-width="3.5" stroke-linecap="round" fill="none"/>`).join(""),
  };
  const star = (x, y, r, k) => `<path class="pspark" style="--k:${k}" d="M${x} ${y - r} Q${x + r * 0.18} ${y - r * 0.18} ${x + r} ${y} Q${x + r * 0.18} ${y + r * 0.18} ${x} ${y + r} Q${x - r * 0.18} ${y + r * 0.18} ${x - r} ${y} Q${x - r * 0.18} ${y - r * 0.18} ${x} ${y - r} Z" fill="#F2C94C" stroke="#C99A1C" stroke-width="1.2"/>`;
  const POSES = {
    // you won the round: both arms up, happy eyes, a little jump
    cheer: { arms: [[62, 122, 22, 104, 26, 44, "l"], [178, 122, 218, 104, 214, 44, "r"]], face: FACES.happy, label: ", cheering",
      extra: star(16, 6, 9, 0) + star(226, 2, 8, 1) + star(8, 70, 6, 2) + star(232, 76, 6, 3) },
    // he won it (a game against GuffBot): fist in the air, hand on hip, very pleased with himself
    gloat: { arms: [[62, 124, 18, 150, 50, 190, "l"], [178, 122, 222, 110, 208, 46, "r"]], face: FACES.smug, tilt: -6, label: ", looking pleased with himself",
      extra: star(226, 18, 9, 0) + star(196, 6, 6, 1) },
    // the other player won it: hand to his head, eyes screwed up, ooh
    wince: { arms: [[62, 124, 30, 150, 36, 196, "l"], [178, 122, 226, 118, 196, 70, "r"]], armsOver: true, face: FACES.squeeze, tilt: 6, label: ", wincing",
      extra: `<g class="ooh" stroke="#6E645C" stroke-width="3" stroke-linecap="round"><path d="M40 30 L28 22"/><path d="M36 48 L22 48"/><path d="M40 66 L28 74"/></g>` },
    // you won it against GuffBot: arms folded, looking away, a small cloud of indignation
    sulk: { arms: [[176, 128, 194, 174, 74, 156, "r", false], [64, 128, 46, 178, 168, 170, "l", false]], face: FACES.narrow, tilt: -7, label: ", sulking",
      extra: `<g class="hmph"><path d="M196 26 Q190 14 202 12 Q206 2 218 8 Q230 4 230 16 Q240 20 232 28 Z" fill="#B9B2A6"/><text x="213" y="23" text-anchor="middle" font-family="Georgia, serif" font-weight="700" font-size="9" fill="#5A524B">hmph</text></g>` },
    // everyone scored: applause
    clap: { arms: [[62, 126, 30, 176, 108, 160, "l"], [178, 126, 210, 176, 132, 160, "r"]], face: FACES.happy, label: ", applauding",
      extra: `<g class="clapline" stroke="#D9A126" stroke-width="3" stroke-linecap="round"><path d="M120 136 V124"/><path d="M106 140 L98 130"/><path d="M134 140 L142 130"/></g>` },
    // nobody scored: palms up, eyebrows up, a question mark
    shrug: { arms: [[62, 124, 40, 180, 12, 150, "l"], [178, 124, 200, 180, 228, 150, "r"]], face: FACES.brows, tilt: 7, label: ", shrugging",
      extra: `<text class="what" x="206" y="20" font-family="Georgia, serif" font-weight="700" font-size="34" fill="#1F6F78">?</text>` },
  };
  /** GuffBot in this round's jumper, in a pose: cheer, gloat, wince, sulk, clap or shrug. */
  function pose(seed, size, kind) {
    const p = POSES[kind];
    return p ? build(seed, size, { ...p, cls: `pose pose-${kind}` }) : svg(seed, size);
  }

  /**
   * Relaxed games (Carl, 24 Oct 2026): GuffBot reclining on a chaise longue with his pipe,
   * in the same jumper he'd be wearing standing up. Box 320 x 200; `width` in px.
   */
  function lounge(seed, width) {
    const d = design(seed);
    const id = `l${(seed >>> 0).toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
    const rib = d.ribbed ? d.b[1] : d.a[1];
    const trou = d.trou.hex;
    const w = width || 200, h = Math.round((w * 200) / 320);
    const ribs = (x, y, wd, hh, n) => { let out = ""; for (let i = 1; i < n; i++) out += `<line x1="${x + (wd * i) / n}" y1="${y + 2}" x2="${x + (wd * i) / n}" y2="${y + hh - 2}" stroke="rgba(0,0,0,.18)" stroke-width="1.4"/>`; return out; };
    const velvet = "#7A2E4E", velvet2 = "#5E2140", wood = "#7A4A26";
    const tufts = [70, 110, 150, 190, 230, 270].map((x) => `<circle cx="${x}" cy="152" r="2.2" fill="${velvet2}"/>`).join("");
    return `<svg class="jumper lounge" viewBox="0 0 320 200" width="${w}" height="${h}" role="img" aria-label="GuffBot lounging in ${name(seed)}">
      <defs>${patternDef(id, d)}
        <pattern id="${id}k" width="6" height="6" patternUnits="userSpaceOnUse"><path d="M0 3 Q1.5 0 3 3 Q4.5 6 6 3" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="1"/></pattern>
      </defs>
      <!-- the chaise longue -->
      <path d="M58 186 Q52 176 60 168 M290 186 Q298 176 290 168" stroke="${wood}" stroke-width="7" stroke-linecap="round" fill="none"/>
      <path d="M22 150 Q14 92 44 64 Q64 50 74 70 Q78 96 100 118 Q104 132 112 140 L300 140 Q312 140 312 152 L312 168 Q312 176 302 176 L34 176 Q22 176 22 164 Z" fill="${velvet}"/>
      <path d="M30 150 Q24 100 48 74" stroke="${velvet2}" stroke-width="3" fill="none" opacity=".6"/>
      <rect x="40" y="140" width="272" height="10" rx="5" fill="${velvet2}" opacity=".5"/>
      ${tufts}
      <!-- legs along the seat, shoes up -->
      <rect x="196" y="112" width="96" height="16" rx="8" fill="${trou}"/>
      <rect x="196" y="124" width="98" height="16" rx="8" fill="${trou}" opacity=".9"/>
      <path d="M288 104 Q300 102 304 112 L304 128 L290 128 Z" fill="#3B2A22"/>
      <path d="M290 120 Q302 118 306 128 L306 142 L292 142 Z" fill="#3B2A22"/>
      <!-- the jumper, lying down -->
      <path d="M104 96 Q120 84 150 86 L196 92 Q206 94 206 110 L206 134 Q206 140 198 140 L110 140 Q98 140 98 128 Z" fill="url(#${id})"/>
      <path d="M104 96 Q120 84 150 86 L196 92 Q206 94 206 110 L206 134 Q206 140 198 140 L110 140 Q98 140 98 128 Z" fill="url(#${id}k)"/>
      <rect x="196" y="94" width="14" height="46" rx="4" fill="${rib}"/>${ribs(196, 94, 14, 46, 1)}
      <!-- GuffBot himself, head back on the cushion -->
      <g transform="rotate(-14 84 60)"><image href="guffbot.webp" x="30" y="6" width="104" height="104"/></g>
      <!-- the pipe and its smoke -->
      <path d="M100 78 L126 70" stroke="#2B1D16" stroke-width="4" stroke-linecap="round"/>
      <path d="M122 58 L136 58 L134 72 Q129 76 124 72 Z" fill="#6B3F22" stroke="#3B2316" stroke-width="2"/>
      <g class="smoke" fill="none" stroke="#B9B2A6" stroke-width="3" stroke-linecap="round">
        <path class="puff p1" d="M129 54 Q122 46 129 38 Q136 30 129 22"/>
        <path class="puff p2" d="M131 50 Q140 42 133 32 Q126 24 134 14"/>
        <path class="puff p3" d="M128 52 Q120 40 127 30 Q134 20 126 10"/>
      </g>
    </svg>`;
  }

  /* ---------- Ms GuffBot (Carl, 25 Oct 2026) ----------
     The numbers round's own host, as on the television: GuffBot's head with a pink bow, in a polka-dot dress
     whose colours change every numbers round (from a seed, so both players see the same dress). */
  const DOTS = [["cream", "#FFF4DC"], ["white", "#FFFFFF"], ["lemon", "#EBD86A"], ["duck egg", "#9CC9C3"], ["navy", "#23355B"], ["cherry", "#B5263E"], ["mustard", "#D9A126"], ["raspberry", "#C7407A"]];
  const DRESS = WOOL.filter(([n]) => !["oatmeal", "cocoa"].includes(n));
  function dress(seed) {
    const r = rng((seed >>> 0) * 40503 + 7919);
    const body = pick(r, DRESS);
    // the spots must stand out from the dress (a lime dress with mustard spots was barely spotty)
    const lum = (hex) => { const n = parseInt(hex.slice(1), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };
    let dot = pick(r, DOTS);
    for (let k = 0; k < 40 && (dot[1] === body[1] || Math.abs(lum(dot[1]) - lum(body[1])) < 0.28); k++) dot = pick(r, DOTS);
    if (Math.abs(lum(dot[1]) - lum(body[1])) < 0.28) dot = lum(body[1]) > 0.55 ? DOTS[4] : DOTS[1];   // navy on light, white on dark
    return { body, dot, big: r() < 0.5, tpl: Math.floor(r() * 6), shoes: pick(r, ["#B5263E", "#23355B", "#3B2A22", "#C7407A"]) };
  }
  function msCaption(seed) {
    const d = dress(seed);
    const [B, D] = [d.body[0], d.dot[0]];
    const lines = [
      `Ms GuffBot in ${B} with ${D} spots. Effortless.`,
      `${B.charAt(0).toUpperCase() + B.slice(1)} polka dots for Ms GuffBot. ${D.charAt(0).toUpperCase() + D.slice(1)}, naturally.`,
      `Ms GuffBot wears ${B} and ${D}, and the numbers fear her.`,
      `A ${d.big ? "big" : "dainty"} ${D} spot on ${B}. She did the sums on the outfit too.`,
      `${B.charAt(0).toUpperCase() + B.slice(1)} with ${D} dots today. The bow stays pink.`,
      `Ms GuffBot: ${B}, ${D} spots, and a calculator she never needs.`,
    ];
    return lines[d.tpl % lines.length];
  }
  const bow = () => `<g class="bow" transform="translate(168 34) rotate(22)">
      <path d="M0 0 C-8 -18 -32 -18 -30 0 C-32 18 -8 18 0 0 Z" fill="#E8559A" stroke="#A82B63" stroke-width="2.5"/>
      <path d="M0 0 C8 -18 32 -18 30 0 C32 18 8 18 0 0 Z" fill="#E8559A" stroke="#A82B63" stroke-width="2.5"/>
      <path d="M-24 -6 Q-16 -2 -10 0 M24 -6 Q16 -2 10 0" stroke="#F7A8CC" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <circle r="7" fill="#F27BB4" stroke="#A82B63" stroke-width="2.5"/></g>`;
  /** Ms GuffBot in this round's dress. Same box as svg(): 240 wide, 300 tall (y from -14). */
  function ms(seed, size) {
    const d = dress(seed);
    const id = `m${(seed >>> 0).toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
    const s = size || 160;
    const w = Math.round((s * 240) / 300);
    const [, B] = d.body, [, D] = d.dot;
    const R = d.big ? 7 : 4.5, P = d.big ? 30 : 20;
    return `<svg class="jumper msbot" viewBox="0 -14 240 300" width="${w}" height="${s}" role="img" aria-label="Ms GuffBot in ${d.body[0]} with ${d.dot[0]} spots">
      <defs>
        <pattern id="${id}" width="${P}" height="${P}" patternUnits="userSpaceOnUse"><rect width="${P}" height="${P}" fill="${B}"/><circle cx="${P / 4}" cy="${P / 4}" r="${R}" fill="${D}"/><circle cx="${(3 * P) / 4}" cy="${(3 * P) / 4}" r="${R}" fill="${D}"/></pattern>
      </defs>
      <!-- legs and shoes (bar shoes), behind the hem -->
      <rect x="96" y="236" width="14" height="30" rx="5" fill="#B9BCC2" stroke="#8E9196" stroke-width="1.5"/>
      <rect x="130" y="236" width="14" height="30" rx="5" fill="#B9BCC2" stroke="#8E9196" stroke-width="1.5"/>
      <path d="M86 270 Q86 260 98 260 H112 V272 H90 Q86 272 86 270 Z" fill="${d.shoes}"/>
      <path d="M154 270 Q154 260 142 260 H128 V272 H150 Q154 272 154 270 Z" fill="${d.shoes}"/>
      <path d="M98 263 H112 M128 263 H142" stroke="rgba(0,0,0,.35)" stroke-width="2"/>
      <!-- arms, metal, with hands -->
      <path d="M58 132 Q40 160 38 200" stroke="#B9BCC2" stroke-width="12" stroke-linecap="round" fill="none"/>
      <path d="M182 132 Q200 160 202 200" stroke="#B9BCC2" stroke-width="12" stroke-linecap="round" fill="none"/>
      <circle cx="38" cy="206" r="9" fill="#C9CBCF" stroke="#8E9196" stroke-width="2"/>
      <circle cx="202" cy="206" r="9" fill="#C9CBCF" stroke="#8E9196" stroke-width="2"/>
      <!-- the dress: bodice, a flared skirt, puff sleeves -->
      <path d="M74 100 Q98 94 120 104 Q142 94 166 100 Q186 106 186 126 L182 160 L210 238 Q120 256 30 238 L58 160 L54 126 Q54 106 74 100 Z" fill="url(#${id})" stroke="rgba(0,0,0,.18)" stroke-width="2"/>
      <path d="M58 160 Q120 172 182 160" stroke="${D}" stroke-width="7" fill="none"/>
      <path d="M44 236 Q120 252 196 236" stroke="rgba(0,0,0,.15)" stroke-width="3" fill="none"/>
      <path d="M56 104 Q36 108 38 132 Q50 142 66 132 Z" fill="url(#${id})" stroke="rgba(0,0,0,.18)" stroke-width="2"/>
      <path d="M184 104 Q204 108 202 132 Q190 142 174 132 Z" fill="url(#${id})" stroke="rgba(0,0,0,.18)" stroke-width="2"/>
      <!-- a white collar -->
      <path d="M92 98 Q96 116 120 108 Q100 100 92 98 Z M148 98 Q144 116 120 108 Q140 100 148 98 Z" fill="#FFF8E6" stroke="rgba(0,0,0,.2)" stroke-width="1.5"/>
      <!-- Ms GuffBot herself -->
      <image href="guffbot.webp" x="56" y="-6" width="128" height="128"/>
      ${bow()}
      ${hat()}
    </svg>`;
  }

  /** Dictionary Corner (26 Oct 2026): GuffBot in this round's jumper with the dictionary under one arm and a cup
      of tea, steaming, in the other hand. The props are drawn over svg()'s picture, in the same 240 x 300 box. */
  function corner(seed, size) {
    const base = svg(seed, size).replace('class="jumper"', 'class="jumper dict"').replace(/aria-label="GuffBot in ([^"]*)"/, 'aria-label="GuffBot in $1, with a cup of tea and the dictionary"');
    const props = `
      <!-- the dictionary, held against him -->
      <g transform="translate(8 146) rotate(-9)">
        <rect x="0" y="0" width="66" height="84" rx="5" fill="#7A1F2B"/>
        <rect x="58" y="2" width="9" height="80" rx="2" fill="#F3E9D2"/>
        <path d="M60 10 H66 M60 20 H66 M60 30 H66 M60 40 H66 M60 50 H66 M60 60 H66 M60 70 H66" stroke="#D8CBB0" stroke-width="1"/>
        <rect x="5" y="5" width="50" height="74" rx="3" fill="none" stroke="#D9A126" stroke-width="2"/>
        <text x="30" y="36" text-anchor="middle" font-family="Georgia, serif" font-weight="700" font-size="9.5" fill="#E8C66A">DICTION</text>
        <text x="30" y="48" text-anchor="middle" font-family="Georgia, serif" font-weight="700" font-size="9.5" fill="#E8C66A">ARY</text>
        <path d="M18 58 H42" stroke="#D9A126" stroke-width="1.5"/>
      </g>
      <circle cx="44" cy="214" r="9" fill="#C9CBCF" stroke="#8E9196" stroke-width="2"/>
      <!-- the tea, on its saucer -->
      <g class="cuppa">
        <g class="steam" fill="none" stroke="#B9B2A6" stroke-width="3" stroke-linecap="round">
          <path class="puff p1" d="M194 168 Q188 160 194 152 Q200 144 194 136"/>
          <path class="puff p2" d="M204 166 Q212 158 205 148 Q198 140 206 130"/>
        </g>
        <path d="M184 176 H216 V184 Q216 200 200 200 Q184 200 184 184 Z" fill="#FFF8E6" stroke="#8E9196" stroke-width="2"/>
        <path d="M216 180 Q228 180 228 188 Q228 196 214 196" fill="none" stroke="#8E9196" stroke-width="3"/>
        <ellipse cx="200" cy="177" rx="15" ry="3.5" fill="#8B5A2B"/>
        <path d="M188 188 Q200 192 212 188" stroke="#C7407A" stroke-width="2" fill="none"/>
        <ellipse cx="200" cy="203" rx="26" ry="5.5" fill="#FFF8E6" stroke="#8E9196" stroke-width="2"/>
      </g>`;
    return base.replace(/<\/svg>\s*$/, `${props}\n    </svg>`);
  }

  /**
   * The Conundrum Crunch (Carl, 28 Oct 2026): GuffBot sweating, as anyone would with a game riding on nine
   * letters. The usual GuffBot in the round's jumper, with drops of sweat running off his casing and flying off
   * the top; styles.css (.sweat) sets them dripping, and holds them still with reduced motion.
   */
  function sweat(seed, size) {
    const drop = (x, y, r, k, cls) => `<g transform="translate(${x} ${y}) rotate(${r}) scale(1.6)"><g class="drop ${cls}" style="--k:${k}"><path d="M0 -10 Q8 2 0 9 Q-8 2 0 -10 Z" fill="#7FD0F5" stroke="#2C86B8" stroke-width="1.6"/><ellipse cx="-2.4" cy="1.5" rx="1.6" ry="3" fill="#fff" opacity=".8"/></g></g>`;
    const drops = `<g class="sweat">${drop(74, 46, 0, 0, "run")}${drop(167, 38, 0, 1, "run")}${drop(160, 74, 0, 2, "run")}${drop(50, 18, -35, 0, "fly left")}${drop(194, 12, 35, 1, "fly right")}${drop(122, 2, 0, 2, "fly up")}</g>`;
    return svg(seed, size).replace('<svg class="jumper"', '<svg class="jumper sweating"').replace(/<\/svg>\s*$/, `${drops}\n    </svg>`);
  }
  const SWEAT = [
    "GuffBot has come over all clammy.",
    "GuffBot is dabbing his casing with a tea towel.",
    "Even the jumper is perspiring.",
    "Mohair was the wrong call for this level of tension.",
    "GuffBot can't watch. He's watching anyway.",
    "GuffBot's light is flashing and he didn't switch it on.",
    "GuffBot has loosened his collar. It's a crew neck. It didn't help.",
  ];
  const sweatCaption = (seed) => SWEAT[(seed >>> 0) % SWEAT.length];

  const SUMS_DONE = ["Ms GuffBot needs a lie down.", "Steam-powered arithmetic. Nothing to it.", "Don't try that at home. The carpet won't take it.", "Ms GuffBot is fine. The cuckoo is fine. The rug is not.", "She makes it look easy. It isn't. She's smoking.", "A round of applause for Ms GuffBot, and a glass of water."];
  const sumsCaption = (seed) => SUMS_DONE[(seed >>> 0) % SUMS_DONE.length];

  root.Jumper = { svg, short, pose, wear, POSES: Object.keys(POSES), sweat, sweatCaption, sumsCaption, lounge, ms, corner, msCaption, dress, name, caption, design, WOOL, PATTERNS };
})(typeof window !== "undefined" ? window : globalThis);
