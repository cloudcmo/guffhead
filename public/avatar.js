// CountGuff: the players' avatars (Carl, 6 Nov 2026). A drawn head for each player, built from parts in the
// same hand as GuffBot's jumpers, so the two sit together: face, skin, hair and its colour, beard, glasses,
// eyes, mouth, cheeks, earrings, hat. Each player picks their own on the games page; the four regulars start
// from Carl's descriptions (STARTERS), everyone else from a look seeded from their id.
//
//   Avatar.head(look)                 -> the SVG fragment, in GuffBot's 128 x 128 head box (jumper.js drops it in)
//   Avatar.svg(look, size, o)         -> the head on its own, as an <svg>
//   Avatar.figure(look, seed, size)   -> the player full length, in the jumper and trousers that seed gives
//   Avatar.image(look, px)            -> a Promise of an <img> for a canvas (the replay)
//   Avatar.lookOf(id, saved)          -> the saved look, tidied, or the starter / seeded default for that id
//   Avatar.random(seed)               -> a look drawn from a seed
//   Avatar.PARTS                      -> the catalogue, for the editor
//
// Everything is drawn kindly: there is no unflattering combination, by design.

(function (root) {
  "use strict";

  function rng(seed) {
    let s = (seed >>> 0) || 1;
    return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const pick = (r, a) => a[Math.floor(r() * a.length)];
  const seedOf = (s) => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* ---------- the catalogue ---------- */
  // Every entry has an id (what's saved) and a name (what the editor shows). Colours carry a hex.
  const PARTS = {
    face: [
      { id: "round", n: "Round" }, { id: "oval", n: "Oval" }, { id: "long", n: "Long" }, { id: "thin", n: "Thin" },
      { id: "square", n: "Square" }, { id: "heart", n: "Heart" },
    ],
    skin: [
      { id: "porcelain", n: "Porcelain", hex: "#FFE6D3" }, { id: "fair", n: "Fair", hex: "#F8D5BA" }, { id: "light", n: "Light", hex: "#EFC49E" },
      { id: "olive", n: "Olive", hex: "#D9AE7E" }, { id: "warm", n: "Warm", hex: "#CF9A66" }, { id: "tan", n: "Tan", hex: "#BE8552" },
      { id: "bronze", n: "Bronze", hex: "#A66B3F" }, { id: "brown", n: "Brown", hex: "#8A5633" }, { id: "dark", n: "Dark", hex: "#6B4027" }, { id: "deep", n: "Deep", hex: "#4B2C1A" },
    ],
    hair: [
      { id: "bald", n: "Bald" }, { id: "shaved", n: "Shaved, stubbly" }, { id: "buzz", n: "Buzz cut" }, { id: "short", n: "Short" }, { id: "part", n: "Side parting" },
      { id: "quiff", n: "Quiff" }, { id: "spiky", n: "Spiky" }, { id: "curly", n: "Curly" }, { id: "bob", n: "Bob" }, { id: "curlybob", n: "Curly bob" },
      { id: "long", n: "Long" }, { id: "ponytail", n: "Ponytail" }, { id: "bun", n: "Bun" }, { id: "afro", n: "Afro" },
    ],
    hairColour: [
      { id: "black", n: "Black", hex: "#2A221D" }, { id: "darkbrown", n: "Dark brown", hex: "#4A3222" }, { id: "brown", n: "Brown", hex: "#6B4A2E" },
      { id: "chestnut", n: "Chestnut", hex: "#7E4A2A" }, { id: "lightbrown", n: "Light brown", hex: "#9A7048" }, { id: "blonde", n: "Blonde", hex: "#DCBA6E" },
      { id: "strawberry", n: "Strawberry blonde", hex: "#D59A5C" }, { id: "ginger", n: "Ginger", hex: "#C7652A" }, { id: "auburn", n: "Reddish brown", hex: "#8F3C22" },
      { id: "greyblack", n: "Grey and black", hex: "#3C3A38", fleck: "#9C9A96" }, { id: "saltpepper", n: "Salt and pepper", hex: "#7A7774", fleck: "#DCD9D4" },
      { id: "grey", n: "Grey", hex: "#9E9B96" }, { id: "silver", n: "Silver", hex: "#C9C7C2" }, { id: "white", n: "White", hex: "#EEEBE4" },
      { id: "pink", n: "Pink", hex: "#E0679A" }, { id: "blue", n: "Blue", hex: "#3D6FB5" }, { id: "purple", n: "Purple", hex: "#6E3F9E" },
    ],
    beard: [
      { id: "none", n: "Clean shaven" }, { id: "stubble", n: "Stubble" }, { id: "short", n: "Short beard" }, { id: "full", n: "Full beard" },
      { id: "goatee", n: "Goatee" }, { id: "tache", n: "Moustache" },
    ],
    glasses: [
      { id: "none", n: "None" }, { id: "round", n: "Round wire" }, { id: "square", n: "Square" }, { id: "thick", n: "Thick rims" },
      { id: "halfmoon", n: "Half-moon" }, { id: "cateye", n: "Cat-eye" }, { id: "sun", n: "Sunglasses" },
    ],
    eyes: [
      { id: "brown", n: "Brown", hex: "#5A3A1E" }, { id: "blue", n: "Blue", hex: "#4A7FB5" }, { id: "green", n: "Green", hex: "#5A8A4A" },
      { id: "grey", n: "Grey", hex: "#6F7A82" }, { id: "hazel", n: "Hazel", hex: "#8A6A2E" },
    ],
    mouth: [{ id: "smile", n: "Smile" }, { id: "grin", n: "Grin" }, { id: "wry", n: "Wry" }, { id: "calm", n: "Calm" }],
    cheeks: [{ id: "none", n: "Plain" }, { id: "blush", n: "Rosy" }, { id: "freckles", n: "Freckles" }, { id: "both", n: "Rosy and freckled" }],
    earrings: [{ id: "none", n: "None" }, { id: "studs", n: "Studs" }, { id: "hoops", n: "Hoops" }],
    hat: [{ id: "none", n: "No hat" }, { id: "flatcap", n: "Flat cap" }, { id: "bobble", n: "Bobble hat" }, { id: "beret", n: "Beret" }, { id: "sunhat", n: "Sun hat" }, { id: "beanie", n: "Beanie" }],
    hatColour: [
      { id: "tweed", n: "Tweed", hex: "#8A7A5A" }, { id: "navy", n: "Navy", hex: "#23355B" }, { id: "red", n: "Red", hex: "#B5263E" }, { id: "green", n: "Green", hex: "#1F5F4A" },
      { id: "mustard", n: "Mustard", hex: "#D9A126" }, { id: "cream", n: "Cream", hex: "#EFE3C8" }, { id: "plum", n: "Plum", hex: "#6E3B5C" }, { id: "black", n: "Black", hex: "#2A2A2A" },
    ],
    // the refreshments (Carl, 6 Nov 2026): everyone who edits their look chooses a drink and a snack. Traditional, with a twinkle.
    drink: [
      { id: "tea", n: "A cup of tea", e: "🍵" }, { id: "builders", n: "Builder's tea, two sugars", e: "☕" }, { id: "earlgrey", n: "Earl Grey", e: "🫖" }, { id: "ovaltine", n: "Ovaltine", e: "🥛" },
      { id: "horlicks", n: "Horlicks", e: "🥛" }, { id: "cocoa", n: "Cocoa", e: "🍫" }, { id: "bovril", n: "Bovril", e: "☕" }, { id: "campcoffee", n: "Camp Coffee", e: "☕" },
      { id: "sherry", n: "A small sherry", e: "🍷" }, { id: "port", n: "A glass of port", e: "🍷" }, { id: "babycham", n: "A Babycham", e: "🥂" }, { id: "snowball", n: "A snowball", e: "🍸" },
      { id: "gingerwine", n: "Ginger wine", e: "🍷" }, { id: "stout", n: "A milk stout", e: "🍺" }, { id: "dandelion", n: "Dandelion and burdock", e: "🥤" }, { id: "vimto", n: "Vimto", e: "🥤" },
      { id: "squash", n: "Orange squash", e: "🥤" }, { id: "lucozade", n: "Lucozade, for energy", e: "🧃" },
      // Christmas (Carl, 6 Nov 2026): in the season everyone's on these, whatever they chose (refreshments() swaps them in)
      { id: "advocaat", n: "A Warninks advocaat", e: "🍸", xmas: true }, { id: "mulledwine", n: "Mulled wine", e: "🍷", xmas: true }, { id: "goodport", n: "The good port", e: "🍷", xmas: true },
      { id: "baileys", n: "A Baileys, over ice", e: "🥃", xmas: true }, { id: "bucksfizz", n: "Bucks Fizz at breakfast", e: "🥂", xmas: true }, { id: "christmassherry", n: "The Christmas sherry", e: "🍷", xmas: true },
      { id: "ginandtonic", n: "A gin and tonic, large", e: "🍹", xmas: true }, { id: "eggnog", n: "Eggnog, against advice", e: "🥛", xmas: true },
    ],
    snack: [
      { id: "custardcream", n: "A custard cream", e: "🍪" }, { id: "bourbon", n: "A bourbon", e: "🍪" }, { id: "battenberg", n: "A slice of Battenberg", e: "🍰" }, { id: "werthers", n: "A Werther's Original", e: "🍬" },
      { id: "richtea", n: "A Rich Tea", e: "🍪" }, { id: "digestive", n: "A chocolate digestive", e: "🍪" }, { id: "figroll", n: "A fig roll", e: "🍪" }, { id: "garibaldi", n: "A Garibaldi", e: "🍪" },
      { id: "pinkwafer", n: "A pink wafer", e: "🧁" }, { id: "jammiedodger", n: "A Jammie Dodger", e: "🍪" }, { id: "jaffa", n: "A Jaffa Cake", e: "🍊" }, { id: "teacake", n: "A Tunnock's teacake", e: "🍫" },
      { id: "wagonwheel", n: "A Wagon Wheel", e: "🍫" }, { id: "eccles", n: "An Eccles cake", e: "🥧" }, { id: "sponge", n: "A slice of Victoria sponge", e: "🍰" }, { id: "maltloaf", n: "Malt loaf, buttered", e: "🍞" },
      { id: "mintimperial", n: "A Mint Imperial", e: "🍬" }, { id: "porkpie", n: "A pork pie", e: "🥧" }, { id: "scotchegg", n: "A scotch egg", e: "🥚" }, { id: "cheesepineapple", n: "Cheese and pineapple on a stick", e: "🧀" }, { id: "twiglets", n: "Twiglets", e: "🥨" },
      { id: "mincepie", n: "A mince pie", e: "🥧", xmas: true }, { id: "yulelog", n: "A slice of Yule log", e: "🪵", xmas: true }, { id: "coldturkey", n: "A cold turkey sandwich", e: "🥪", xmas: true },
      { id: "aftereight", n: "An After Eight", e: "🍫", xmas: true }, { id: "matchmakers", n: "Orange Matchmakers", e: "🍫", xmas: true }, { id: "pigblanket", n: "A pig in a blanket", e: "🌭", xmas: true },
      { id: "chocorange", n: "A segment of Chocolate Orange", e: "🍊", xmas: true }, { id: "qualitystreet", n: "The last purple Quality Street", e: "🍬", xmas: true }, { id: "satsuma", n: "A satsuma from the stocking", e: "🍊", xmas: true },
      { id: "christmascake", n: "Christmas cake, marzipan left on the side", e: "🍰", xmas: true }, { id: "brazilnut", n: "A Brazil nut, still in its shell", e: "🌰", xmas: true }, { id: "dates", n: "The dates nobody wanted", e: "🫘", xmas: true },
      { id: "breadsauce", n: "Bread sauce, cold, from the fridge", e: "🥣", xmas: true }, { id: "sprouts", n: "Sprouts. Just the one", e: "🥦", xmas: true },
    ],
    // the fight name, for Words and Guff's grudge-match cards (Carl, 6 Nov 2026): limp and ridiculous, never fearsome
    fightName: [
      { id: "mildbreeze", n: "the Mild Breeze" }, { id: "rebuker", n: "the Rebuker" }, { id: "passiveaggressive", n: "the Passive Aggressive" }, { id: "gentlereminder", n: "the Gentle Reminder" },
      { id: "slightinconvenience", n: "the Slight Inconvenience" }, { id: "stronglyworded", n: "the Strongly Worded Letter" }, { id: "raisedeyebrow", n: "the Raised Eyebrow" }, { id: "tut", n: "the Tut" },
      { id: "lightdrizzle", n: "the Light Drizzle" }, { id: "lukewarm", n: "the Lukewarm" }, { id: "politecough", n: "the Polite Cough" }, { id: "halfhearted", n: "the Half-Hearted" },
      { id: "dampsquib", n: "the Damp Squib" }, { id: "minorsetback", n: "the Minor Setback" }, { id: "sigh", n: "the Sigh" }, { id: "secondopinion", n: "the Second Opinion" },
      { id: "niggle", n: "the Bit of a Niggle" }, { id: "gentlenudge", n: "the Gentle Nudge" }, { id: "mildconcern", n: "the Mild Concern" }, { id: "faintpraise", n: "the Faint Praise" },
      { id: "beige", n: "the Beige" }, { id: "slowpuncture", n: "the Slow Puncture" }, { id: "draught", n: "the Draught" }, { id: "footnote", n: "the Footnote" },
      { id: "quietlydisappointed", n: "the Quietly Disappointed" }, { id: "coldflannel", n: "the Cold Flannel" }, { id: "tepid", n: "the Tepid" }, { id: "lightscolding", n: "the Light Scolding" },
      { id: "pending", n: "the Pending" }, { id: "nearly", n: "the Nearly" }, { id: "sortof", n: "the Sort Of" }, { id: "reasonableadjustment", n: "the Reasonable Adjustment" },
      { id: "sternlook", n: "the Stern Look" }, { id: "unreadmemo", n: "the Unread Memo" }, { id: "notangry", n: "the Not Angry, Just Disappointed" }, { id: "clipboard", n: "the Clipboard" },
      { id: "softfurnishing", n: "the Soft Furnishing" }, { id: "branflake", n: "the Bran Flake" }, { id: "lightlysteamed", n: "the Lightly Steamed" }, { id: "lowhum", n: "the Low Hum" },
      { id: "committee", n: "the Committee" }, { id: "raincheck", n: "the Rain Check" }, { id: "mindthestep", n: "the Mind the Step" }, { id: "awkwardsilence", n: "the Awkward Silence" },
    ],
  };
  PARTS.beardColour = PARTS.hairColour;   // the beard can be set apart from the hair (grey beard, brown hair)
  const KEYS = ["face", "skin", "hair", "hairColour", "beard", "beardColour", "glasses", "eyes", "mouth", "cheeks", "earrings", "hat", "hatColour", "drink", "snack", "fightName"];
  const find = (key, id) => PARTS[key].find((p) => p.id === id) || null;

  /* ---------- the four regulars (Carl, 6 Nov 2026), and a seeded default for everyone else ---------- */
  const STARTERS = {
    carl: { face: "round", skin: "fair", hair: "shaved", hairColour: "darkbrown", beard: "none", glasses: "none", eyes: "blue", mouth: "smile", cheeks: "none", earrings: "none", hat: "none", hatColour: "tweed", drink: "builders", snack: "custardcream", fightName: "passiveaggressive" },
    nick: { face: "oval", skin: "olive", hair: "spiky", hairColour: "greyblack", beard: "none", glasses: "none", eyes: "brown", mouth: "grin", cheeks: "none", earrings: "none", hat: "none", hatColour: "navy", drink: "ovaltine", snack: "battenberg", fightName: "gentlereminder" },
    kate: { face: "heart", skin: "fair", hair: "curlybob", hairColour: "auburn", beard: "none", glasses: "none", eyes: "green", mouth: "smile", cheeks: "blush", earrings: "studs", hat: "none", hatColour: "plum", drink: "sherry", snack: "pinkwafer", fightName: "rebuker" },
    steve: { face: "thin", skin: "light", hair: "short", hairColour: "saltpepper", beard: "short", glasses: "round", eyes: "grey", mouth: "wry", cheeks: "none", earrings: "none", hat: "none", hatColour: "tweed", drink: "horlicks", snack: "werthers", fightName: "mildbreeze" },
  };

  /** A look from a seed: sensible odds (most people have no beard, no glasses, no hat). */
  function random(seed) {
    const r = rng(typeof seed === "number" ? seed : seedOf(seed));
    const some = (key, pNone) => (r() < pNone ? PARTS[key][0].id : pick(r, PARTS[key].slice(1)).id);
    const hairColour = pick(r, PARTS.hairColour.filter((c) => !["pink", "blue", "purple"].includes(c.id))).id;
    const out = {
      face: pick(r, PARTS.face).id, skin: pick(r, PARTS.skin).id, hair: pick(r, PARTS.hair.slice(1)).id, hairColour,
      beard: some("beard", 0.6), glasses: some("glasses", 0.6), eyes: pick(r, PARTS.eyes).id, mouth: pick(r, PARTS.mouth).id,
      cheeks: some("cheeks", 0.55), earrings: some("earrings", 0.7), hat: some("hat", 0.8), hatColour: pick(r, PARTS.hatColour).id,
      drink: pick(r, PARTS.drink).id, snack: pick(r, PARTS.snack).id, fightName: pick(r, PARTS.fightName).id,
    };
    out.beardColour = out.hairColour;
    return out;
  }

  /** A saved look, tidied: every key present and known, unknown values replaced by the default for that id. */
  function lookOf(id, saved) {
    const base = STARTERS[id] || random(`look:${id}`);
    const out = { ...base };
    if (saved && typeof saved === "object") for (const k of KEYS) if (typeof saved[k] === "string" && find(k, saved[k])) out[k] = saved[k];
    if (!(saved && typeof saved.beardColour === "string" && find("hairColour", saved.beardColour))) out.beardColour = out.hairColour;
    return out;
  }
  const isStarter = (id) => !!STARTERS[id];

  /* ---------- drawing ---------- */
  const shade = (hex, k) => {   // darken (k < 1) or lighten (k > 1) a hex colour
    const n = parseInt(hex.slice(1), 16);
    const f = (v) => Math.max(0, Math.min(255, Math.round(k < 1 ? v * k : v + (255 - v) * (k - 1))));
    return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map(f).map((v) => v.toString(16).padStart(2, "0")).join("")}`;
  };
  const CX = 64, CY = 66, K = 0.5523;
  // each face: half-widths and half-heights of the top and bottom halves (the chin can be narrower)
  const FACES = {
    round: { rt: 40, ryt: 42, rb: 40, ryb: 42 },
    oval: { rt: 36, ryt: 44, rb: 33, ryb: 46 },
    long: { rt: 33, ryt: 46, rb: 29, ryb: 50 },
    thin: { rt: 35, ryt: 43, rb: 24, ryb: 47 },
    square: { rt: 39, ryt: 42, rb: 39, ryb: 42, square: true },
    heart: { rt: 42, ryt: 42, rb: 24, ryb: 44 },
  };
  function facePath(f) {
    if (f.square) { const x0 = CX - f.rt, x1 = CX + f.rt, y0 = CY - f.ryt, y1 = CY + f.ryb, r = 22; return `M${x0 + r} ${y0} H${x1 - r} Q${x1} ${y0} ${x1} ${y0 + r} V${y1 - r} Q${x1} ${y1} ${x1 - r} ${y1} H${x0 + r} Q${x0} ${y1} ${x0} ${y1 - r} V${y0 + r} Q${x0} ${y0} ${x0 + r} ${y0} Z`; }
    const { rt, ryt, rb, ryb } = f;
    return `M${CX - rt} ${CY} C${CX - rt} ${CY - K * ryt} ${CX - K * rt} ${CY - ryt} ${CX} ${CY - ryt} C${CX + K * rt} ${CY - ryt} ${CX + rt} ${CY - K * ryt} ${CX + rt} ${CY} C${CX + rt} ${CY + K * ryb} ${CX + K * rb} ${CY + ryb} ${CX} ${CY + ryb} C${CX - K * rb} ${CY + ryb} ${CX - rt} ${CY + K * ryb} ${CX - rt} ${CY} Z`;
  }
  /** The top of the head, a little bigger than the face, from one temple over the crown to the other, then back along a hairline. */
  function dome(f, pad, hairline) {
    const rt = f.rt + pad, ryt = f.ryt + pad;
    const top = `M${CX - rt} ${CY} C${CX - rt} ${CY - K * ryt} ${CX - K * rt} ${CY - ryt} ${CX} ${CY - ryt} C${CX + K * rt} ${CY - ryt} ${CX + rt} ${CY - K * ryt} ${CX + rt} ${CY}`;
    return `${top} ${hairline} Z`;
  }

  /** `o.mood`: "win" (grinning), "lose" (a frown and a cold flannel), "fight" (game face), for the cards. */
  function head(look, o = {}) {
    const L = lookOf(null, look);
    const mood = o.mood || "";
    const f = FACES[L.face] || FACES.round;
    const skin = find("skin", L.skin).hex, skinD = shade(skin, 0.82), skinL = shade(skin, 1.25);
    const hc = find("hairColour", L.hairColour), H = hc.hex, Hd = shade(H, 0.8);
    const bc = find("hairColour", L.beardColour) || hc, B = bc.hex;
    const eye = find("eyes", L.eyes).hex;
    const hat = L.hat !== "none" ? find("hat", L.hat) : null;
    const hatC = find("hatColour", L.hatColour).hex, hatD = shade(hatC, 0.75);
    const id = `a${Math.floor(Math.random() * 1e8).toString(36)}`;
    const face = facePath(f);
    const { rt, ryt, rb, ryb } = f;
    const top = CY - ryt, chin = CY + ryb;
    const defs = [];
    const paintHair = (shape, colour, fleck, cls = "") => {   // a shape in the hair colour, flecked for the greys
      let s = `<path d="${shape}" fill="${colour}"${cls}/>`;
      if (fleck) { defs.push(`<pattern id="${id}f${colour.slice(1)}" width="7" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(-20)"><path d="M3.5 1 V5" stroke="${fleck}" stroke-width="1.6" stroke-linecap="round"/></pattern>`); s += `<path d="${shape}" fill="url(#${id}f${colour.slice(1)})"/>`; }
      return s;
    };
    defs.push(`<clipPath id="${id}c"><path d="${face}"/></clipPath>`);
    defs.push(`<pattern id="${id}d" width="4" height="4" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".9" fill="${Hd}"/><circle cx="3" cy="3" r=".9" fill="${Hd}"/></pattern>`);
    defs.push(`<pattern id="${id}b" width="4" height="4" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".95" fill="${B}"/><circle cx="3" cy="3" r=".95" fill="${B}"/></pattern>`);

    /* hair: what hangs behind the face, then what sits on top */
    let back = "", front = "";
    const hl = L.hair;
    const straight = `L${CX + rt - 1} ${top + 27} Q${CX + rt * 0.6} ${top + 16} ${CX} ${top + 15} Q${CX - rt * 0.6} ${top + 16} ${CX - rt + 1} ${top + 27}`;   // a plain hairline, down to the temples
    const fringe = `L${CX + rt - 1} ${top + 26} Q${CX + rt * 0.5} ${top + 30} ${CX + rt * 0.3} ${top + 24} Q${CX} ${top + 32} ${CX - rt * 0.3} ${top + 24} Q${CX - rt * 0.5} ${top + 30} ${CX - rt + 1} ${top + 26}`;
    const swept = `L${CX + rt - 1} ${top + 14} Q${CX + 4} ${top + 10} ${CX - rt * 0.55} ${top + 28} Q${CX - rt * 0.8} ${top + 26} ${CX - rt + 1} ${top + 18}`;
    if (hl === "shaved" || hl === "buzz") {
      front = `<g clip-path="url(#${id}c)"><path d="${dome(f, 0, straight)}" fill="${H}" opacity="${hl === "buzz" ? 0.55 : 0.22}"/><path d="${dome(f, 0, straight)}" fill="url(#${id}d)" opacity="${hl === "buzz" ? 0.9 : 0.7}"/></g>`;
    } else if (hl === "short") {
      front = paintHair(dome(f, 3, straight), H, hc.fleck);
    } else if (hl === "part") {
      front = paintHair(dome(f, 3, swept), H, hc.fleck) + `<path d="M${CX + 2} ${top + 10} Q${CX - rt * 0.4} ${top + 16} ${CX - rt * 0.55} ${top + 28}" stroke="${Hd}" stroke-width="1.5" fill="none" opacity=".7"/>`;
    } else if (hl === "quiff") {
      const q = `L${CX + rt - 1} ${top + 16} Q${CX + 10} ${top + 4} ${CX + 4} ${top + 14} Q${CX - 4} ${top + 2} ${CX - rt * 0.7} ${top + 20} Q${CX - rt * 0.9} ${top + 20} ${CX - rt + 1} ${top + 18}`;
      front = paintHair(dome(f, 4, q), H, hc.fleck) + paintHair(`M${CX - 12} ${top + 6} Q${CX + 4} ${top - 16} ${CX + 26} ${top - 2} Q${CX + 24} ${top + 10} ${CX + 8} ${top + 8} Z`, H, hc.fleck);
    } else if (hl === "spiky") {
      const spikes = [];
      const n = 7;
      for (let i = 0; i <= n; i++) {
        const t = i / n, a = Math.PI * (1 - t);
        const bx = CX + Math.cos(a) * (rt + 1), by = CY - Math.sin(a) * (ryt + 1);
        const sx = CX + Math.cos(a) * (rt + 13), sy = CY - Math.sin(a) * (ryt + 15);
        const a2 = Math.PI * (1 - (t + 0.5 / n)), nx = CX + Math.cos(a2) * (rt + 1), ny = CY - Math.sin(a2) * (ryt + 1);
        spikes.push(`M${bx.toFixed(1)} ${by.toFixed(1)} L${sx.toFixed(1)} ${sy.toFixed(1)} L${nx.toFixed(1)} ${ny.toFixed(1)} Z`);
      }
      front = paintHair(spikes.join(" ") + " " + dome(f, 2, straight), H, hc.fleck);
    } else if (hl === "curly") {
      let curls = "";
      for (let i = 0; i <= 8; i++) { const a = Math.PI * (1 - i / 8); curls += `<circle cx="${(CX + Math.cos(a) * (rt + 2)).toFixed(1)}" cy="${(CY - Math.sin(a) * (ryt + 3)).toFixed(1)}" r="9"/>`; }
      front = `<g fill="${H}">${curls}</g>` + paintHair(dome(f, 3, fringe), H, hc.fleck) + `<g fill="none" stroke="${Hd}" stroke-width="1.4" opacity=".6">${[0, 1, 2, 3, 4].map((i) => `<path d="M${CX - 28 + i * 14} ${top + 12} q4 -6 8 0"/>`).join("")}</g>`;
    } else if (hl === "bob" || hl === "curlybob") {
      const sides = `M${CX - rt - 4} ${CY - 10} Q${CX - rt - 8} ${CY + 28} ${CX - rt + 4} ${CY + 30} L${CX + rt - 4} ${CY + 30} Q${CX + rt + 8} ${CY + 28} ${CX + rt + 4} ${CY - 10} Z`;
      back = paintHair(sides, Hd, hc.fleck);
      if (hl === "curlybob") {
        let curls = "";
        for (let i = 0; i < 5; i++) curls += `<circle cx="${CX - rt - 2}" cy="${CY - 4 + i * 9}" r="8"/><circle cx="${CX + rt + 2}" cy="${CY - 4 + i * 9}" r="8"/>`;
        for (let i = 0; i <= 8; i++) { const a = Math.PI * (1 - i / 8); curls += `<circle cx="${(CX + Math.cos(a) * (rt + 2)).toFixed(1)}" cy="${(CY - Math.sin(a) * (ryt + 3)).toFixed(1)}" r="9"/>`; }
        back += `<g fill="${Hd}">${curls}</g>`;
      }
      front = paintHair(dome(f, 4, fringe), H, hc.fleck);
    } else if (hl === "long") {
      const sides = `M${CX - rt - 5} ${CY - 12} Q${CX - rt - 12} ${CY + 40} ${CX - rt - 2} ${126} L${CX + rt + 2} ${126} Q${CX + rt + 12} ${CY + 40} ${CX + rt + 5} ${CY - 12} Z`;
      back = paintHair(sides, Hd, hc.fleck);
      front = paintHair(dome(f, 4, swept), H, hc.fleck);
    } else if (hl === "ponytail") {
      back = paintHair(`M${CX + rt - 6} ${CY - 6} Q${CX + rt + 22} ${CY + 10} ${CX + rt + 10} ${CY + 46} Q${CX + rt} ${CY + 34} ${CX + rt - 4} ${CY + 14} Z`, Hd, hc.fleck) + `<path d="M${CX + rt - 2} ${CY + 6} q6 2 10 0" stroke="#B5263E" stroke-width="3" stroke-linecap="round"/>`;
      front = paintHair(dome(f, 3, straight), H, hc.fleck);
    } else if (hl === "bun") {
      back = paintHair(`M${CX - 14} ${top - 2} a14 12 0 1 1 28 0 a14 12 0 1 1 -28 0 Z`, Hd, hc.fleck);
      front = paintHair(dome(f, 3, straight), H, hc.fleck);
    } else if (hl === "afro") {
      back = paintHair(`M${CX - rt - 18} ${CY + 4} a${rt + 18} ${ryt + 20} 0 1 1 ${2 * (rt + 18)} 0 a${rt + 18} ${ryt + 20} 0 1 1 ${-2 * (rt + 18)} 0 Z`, H, null) + `<path d="M${CX - rt - 18} ${CY + 4} a${rt + 18} ${ryt + 20} 0 1 1 ${2 * (rt + 18)} 0 a${rt + 18} ${ryt + 20} 0 1 1 ${-2 * (rt + 18)} 0 Z" fill="url(#${id}d)" opacity=".5"/>`;
      front = paintHair(dome(f, 2, straight), H, null);
    }

    /* beard */
    let beard = "";
    const bd = L.beard;
    const tache = `<path d="M${CX - 2} ${CY + 15} Q${CX - 10} ${CY + 10} ${CX - 18} ${CY + 17} Q${CX - 9} ${CY + 20} ${CX - 1} ${CY + 17} Q${CX + 9} ${CY + 20} ${CX + 18} ${CY + 17} Q${CX + 10} ${CY + 10} ${CX + 2} ${CY + 15} Z" fill="${B}"/>`;
    const jaw = `M${CX - rt} ${CY + 2} Q${CX - rt + 8} ${CY + 24} ${CX - 14} ${CY + 26} Q${CX} ${CY + 30} ${CX + 14} ${CY + 26} Q${CX + rt - 8} ${CY + 24} ${CX + rt} ${CY + 2} L${CX + rt} 140 L${CX - rt} 140 Z`;
    if (bd === "stubble") beard = `<g clip-path="url(#${id}c)"><path d="${jaw}" fill="${B}" opacity=".16"/><path d="${jaw}" fill="url(#${id}b)" opacity=".8"/></g>`;
    else if (bd === "short") beard = `<g clip-path="url(#${id}c)"><path d="${jaw}" fill="${B}" opacity=".92"/>${bc.fleck ? `<path d="${jaw}" fill="url(#${id}f${B.slice(1)})" opacity=".8"/>` : ""}</g>${tache}`;
    else if (bd === "full") beard = `<path d="M${CX - rt + 1} ${CY + 4} Q${CX - rt - 4} ${chin - 2} ${CX - 18} ${chin + 9} Q${CX} ${chin + 16} ${CX + 18} ${chin + 9} Q${CX + rt + 4} ${chin - 2} ${CX + rt - 1} ${CY + 4} Q${CX + rb - 2} ${CY + 24} ${CX + 12} ${CY + 25} Q${CX} ${CY + 28} ${CX - 12} ${CY + 25} Q${CX - rb + 2} ${CY + 24} ${CX - rt + 1} ${CY + 4} Z" fill="${B}"/>${bc.fleck ? `<path d="M${CX - rt + 1} ${CY + 4} Q${CX - rt - 4} ${chin - 2} ${CX - 18} ${chin + 9} Q${CX} ${chin + 16} ${CX + 18} ${chin + 9} Q${CX + rt + 4} ${chin - 2} ${CX + rt - 1} ${CY + 4} Q${CX + rb - 2} ${CY + 24} ${CX + 12} ${CY + 25} Q${CX} ${CY + 28} ${CX - 12} ${CY + 25} Q${CX - rb + 2} ${CY + 24} ${CX - rt + 1} ${CY + 4} Z" fill="url(#${id}f${B.slice(1)})" opacity=".8"/>` : ""}${tache}`;
    else if (bd === "goatee") beard = `<path d="M${CX - 11} ${CY + 28} Q${CX} ${CY + 24} ${CX + 11} ${CY + 28} Q${CX + 10} ${chin + 4} ${CX} ${chin + 6} Q${CX - 10} ${chin + 4} ${CX - 11} ${CY + 28} Z" fill="${B}"/>${tache}`;
    else if (bd === "tache") beard = tache;
    if (bc.fleck && (bd === "full" || bd === "goatee")) defs.push(`<pattern id="${id}f${B.slice(1)}" width="7" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(-20)"><path d="M3.5 1 V5" stroke="${bc.fleck}" stroke-width="1.6" stroke-linecap="round"/></pattern>`);

    /* features */
    const ex = [CX - 15, CX + 15], ey = CY - 3;
    const eyes = ex.map((x) => `<ellipse cx="${x}" cy="${ey}" rx="6.5" ry="5.4" fill="#FFFDF8"/><circle cx="${x}" cy="${ey + 0.5}" r="3.6" fill="${eye}"/><circle cx="${x}" cy="${ey + 0.5}" r="1.8" fill="#15191C"/><circle cx="${x + 1.4}" cy="${ey - 1.2}" r="1.1" fill="#fff"/>`).join("");
    const browC = L.hair === "bald" ? skinD : Hd;
    const brows = mood === "fight" ? ex.map((x, i) => `<path d="M${x - 8} ${ey - (i ? 9 : 14)} L${x + 8} ${ey - (i ? 14 : 9)}" stroke="${browC}" stroke-width="3" stroke-linecap="round" fill="none"/>`).join("")
      : mood === "lose" ? ex.map((x, i) => `<path d="M${x - 8} ${ey - (i ? 15 : 10)} Q${x} ${ey - 15} ${x + 8} ${ey - (i ? 10 : 15)}" stroke="${browC}" stroke-width="2.8" stroke-linecap="round" fill="none"/>`).join("")
      : mood === "win" ? ex.map((x) => `<path d="M${x - 8} ${ey - 14} Q${x} ${ey - 19} ${x + 8} ${ey - 14.5}" stroke="${browC}" stroke-width="2.8" stroke-linecap="round" fill="none"/>`).join("")
      : ex.map((x, i) => `<path d="M${x - 8} ${ey - 11} Q${x} ${ey - 15.5} ${x + 8} ${ey - 11.5}" stroke="${browC}" stroke-width="${L.mouth === "wry" && i === 1 ? 2.2 : 2.8}" stroke-linecap="round" fill="none"${L.mouth === "wry" && i === 1 ? ` transform="translate(0 -2)"` : ""}/>`).join("");
    const nose = `<path d="M${CX - 2} ${CY + 1} Q${CX - 5} ${CY + 10} ${CX - 1} ${CY + 12} Q${CX + 2} ${CY + 13} ${CX + 4} ${CY + 11}" stroke="${skinD}" stroke-width="2" stroke-linecap="round" fill="none"/>`;
    const my = CY + 22, lip = bd === "short" || bd === "full" ? "#F0A8A8" : shade(skin, 0.62);
    const mouths = {
      smile: `<path d="M${CX - 11} ${my} Q${CX} ${my + 9} ${CX + 11} ${my}" stroke="${lip}" stroke-width="2.6" stroke-linecap="round" fill="none"/>`,
      grin: `<path d="M${CX - 13} ${my - 1} Q${CX} ${my + 14} ${CX + 13} ${my - 1} Q${CX} ${my + 3} ${CX - 13} ${my - 1} Z" fill="#FFFDF8" stroke="${lip}" stroke-width="2"/>`,
      wry: `<path d="M${CX - 10} ${my + 2} Q${CX + 2} ${my + 8} ${CX + 12} ${my - 2}" stroke="${lip}" stroke-width="2.6" stroke-linecap="round" fill="none"/>`,
      calm: `<path d="M${CX - 9} ${my + 1} Q${CX} ${my + 4} ${CX + 9} ${my + 1}" stroke="${lip}" stroke-width="2.6" stroke-linecap="round" fill="none"/>`,
      down: `<path d="M${CX - 10} ${my + 5} Q${CX} ${my - 3} ${CX + 10} ${my + 5}" stroke="${lip}" stroke-width="2.6" stroke-linecap="round" fill="none"/>`,
      set: `<path d="M${CX - 10} ${my + 2} L${CX + 10} ${my + 2}" stroke="${lip}" stroke-width="2.8" stroke-linecap="round" fill="none"/>`,
    };
    const mouth = mouths[mood === "win" ? "grin" : mood === "lose" ? "down" : mood === "fight" ? "set" : L.mouth] || mouths.smile;
    const cheeks = (L.cheeks === "blush" || L.cheeks === "both" ? [CX - 24, CX + 24].map((x) => `<ellipse cx="${x}" cy="${CY + 9}" rx="7" ry="4.2" fill="#F27B86" opacity=".32"/>`).join("") : "")
      + (L.cheeks === "freckles" || L.cheeks === "both" ? `<g fill="${skinD}" opacity=".8">${[[-26, 6], [-21, 10], [-17, 5], [-23, 13], [26, 6], [21, 10], [17, 5], [23, 13], [-6, 14], [6, 14]].map(([dx, dy]) => `<circle cx="${CX + dx}" cy="${CY + dy}" r="1.1"/>`).join("")}</g>` : "");
    const ears = [CX - rt + 1, CX + rt - 1].map((x) => `<ellipse cx="${x}" cy="${CY + 3}" rx="5.5" ry="8.5" fill="${skin}" stroke="${skinD}" stroke-width="1.2"/>`).join("");
    const earrings = L.earrings === "studs" ? [CX - rt - 1, CX + rt + 1].map((x) => `<circle cx="${x}" cy="${CY + 9}" r="2" fill="#E9C46A" stroke="#B8861A" stroke-width=".8"/>`).join("")
      : L.earrings === "hoops" ? [CX - rt - 1, CX + rt + 1].map((x) => `<circle cx="${x}" cy="${CY + 14}" r="4.5" fill="none" stroke="#E9C46A" stroke-width="1.8"/>`).join("") : "";

    /* glasses */
    let glasses = "";
    const gl = L.glasses, wire = "#5A4A32", dark = "#2B2622";
    if (gl === "round") glasses = `<g fill="none" stroke="${wire}" stroke-width="1.8">${ex.map((x) => `<circle cx="${x}" cy="${ey + 1}" r="11.5"/>`).join("")}<path d="M${CX - 3.5} ${ey} q3.5 -3 7 0 M${CX - rt + 3} ${ey - 2} L${ex[0] - 11.5} ${ey + 1} M${CX + rt - 3} ${ey - 2} L${ex[1] + 11.5} ${ey + 1}"/></g>`;
    else if (gl === "square") glasses = `<g fill="none" stroke="${dark}" stroke-width="2.4">${ex.map((x) => `<rect x="${x - 12}" y="${ey - 8}" width="24" height="17" rx="4"/>`).join("")}<path d="M${CX - 3} ${ey - 2} h6 M${CX - rt + 3} ${ey - 3} L${ex[0] - 12} ${ey - 1} M${CX + rt - 3} ${ey - 3} L${ex[1] + 12} ${ey - 1}"/></g>`;
    else if (gl === "thick") glasses = `<g fill="none" stroke="${dark}" stroke-width="4">${ex.map((x) => `<rect x="${x - 12}" y="${ey - 9}" width="24" height="18" rx="5"/>`).join("")}<path d="M${CX - 3} ${ey - 2} h6 M${CX - rt + 3} ${ey - 4} L${ex[0] - 12} ${ey - 1} M${CX + rt - 3} ${ey - 4} L${ex[1] + 12} ${ey - 1}"/></g>`;
    else if (gl === "halfmoon") glasses = `<g fill="none" stroke="${wire}" stroke-width="1.8">${ex.map((x) => `<path d="M${x - 11} ${ey + 3} a11 9 0 0 0 22 0 Z"/>`).join("")}<path d="M${CX - 4} ${ey + 3} h8 M${CX - rt + 3} ${ey + 1} L${ex[0] - 11} ${ey + 3} M${CX + rt - 3} ${ey + 1} L${ex[1] + 11} ${ey + 3}"/></g>`;
    else if (gl === "cateye") glasses = `<g fill="none" stroke="${dark}" stroke-width="2.4">${[[ex[0], -1], [ex[1], 1]].map(([x, s]) => `<path d="M${x - 12 * s} ${ey + 2} Q${x - 10 * s} ${ey + 9} ${x} ${ey + 9} Q${x + 11 * s} ${ey + 9} ${x + 13 * s} ${ey - 2} L${x + 15 * s} ${ey - 10} Q${x + 2 * s} ${ey - 6} ${x - 12 * s} ${ey - 6} Z"/>`).join("")}<path d="M${CX - 2} ${ey - 2} h4 M${CX - rt + 3} ${ey - 4} L${ex[0] - 12} ${ey - 1} M${CX + rt - 3} ${ey - 4} L${ex[1] + 12} ${ey - 1}"/></g>`;
    else if (gl === "sun") glasses = `<g stroke="${dark}" stroke-width="2.4">${ex.map((x) => `<rect x="${x - 12}" y="${ey - 8}" width="24" height="17" rx="7" fill="#2A2F3A"/>`).join("")}<path d="M${CX - 3} ${ey - 2} h6 M${CX - rt + 3} ${ey - 3} L${ex[0] - 12} ${ey - 1} M${CX + rt - 3} ${ey - 3} L${ex[1] + 12} ${ey - 1}" fill="none"/></g><g fill="#fff" opacity=".25">${ex.map((x) => `<rect x="${x - 9}" y="${ey - 5}" width="7" height="3" rx="1.5"/>`).join("")}</g>`;

    /* hats, over everything */
    let hatSvg = "";
    if (hat) {
      const hw = rt + 6;
      if (hat.id === "flatcap") hatSvg = `<path d="M${CX - hw} ${top + 16} Q${CX - hw + 2} ${top - 10} ${CX} ${top - 10} Q${CX + hw - 2} ${top - 10} ${CX + hw} ${top + 16} Z" fill="${hatC}"/><path d="M${CX - hw} ${top + 16} Q${CX} ${top + 8} ${CX + hw} ${top + 16}" fill="none" stroke="${hatD}" stroke-width="2"/><path d="M${CX + 6} ${top + 15} Q${CX + hw + 14} ${top + 13} ${CX + hw + 12} ${top + 20} Q${CX + hw} ${top + 22} ${CX + 6} ${top + 19} Z" fill="${hatD}"/><path d="M${CX - 20} ${top + 2} q6 -4 12 -1 M${CX + 2} ${top - 2} q6 -2 10 2" stroke="${hatD}" stroke-width="1.2" fill="none" opacity=".6"/>`;
      else if (hat.id === "bobble") hatSvg = `<path d="M${CX - hw + 2} ${top + 14} Q${CX - hw + 4} ${top - 22} ${CX} ${top - 24} Q${CX + hw - 4} ${top - 22} ${CX + hw - 2} ${top + 14} Z" fill="${hatC}"/><path d="M${CX - 20} ${top - 10} v22 M${CX - 10} ${top - 18} v30 M${CX} ${top - 21} v33 M${CX + 10} ${top - 18} v30 M${CX + 20} ${top - 10} v22" stroke="${hatD}" stroke-width="2" opacity=".5"/><rect x="${CX - hw}" y="${top + 6}" width="${2 * hw}" height="14" rx="6" fill="${hatD}"/><circle cx="${CX}" cy="${top - 26}" r="7" fill="#F3E9D2" stroke="${hatD}" stroke-width="1.5"/>`;
      else if (hat.id === "beanie") hatSvg = `<path d="M${CX - hw + 2} ${top + 16} Q${CX - hw + 4} ${top - 12} ${CX} ${top - 14} Q${CX + hw - 4} ${top - 12} ${CX + hw - 2} ${top + 16} Z" fill="${hatC}"/><rect x="${CX - hw}" y="${top + 8}" width="${2 * hw}" height="12" rx="5" fill="${hatD}"/>`;
      else if (hat.id === "beret") hatSvg = `<g transform="rotate(-8 ${CX} ${top})"><path d="M${CX - hw - 4} ${top + 8} Q${CX - hw} ${top - 16} ${CX + 4} ${top - 16} Q${CX + hw + 4} ${top - 14} ${CX + hw} ${top + 6} Q${CX} ${top + 14} ${CX - hw - 4} ${top + 8} Z" fill="${hatC}"/><circle cx="${CX + 6}" cy="${top - 16}" r="2.5" fill="${hatD}"/></g>`;
      else if (hat.id === "sunhat") hatSvg = `<path d="M${CX - hw + 4} ${top + 12} Q${CX - hw + 6} ${top - 16} ${CX} ${top - 16} Q${CX + hw - 6} ${top - 16} ${CX + hw - 4} ${top + 12} Z" fill="${hatC}"/><ellipse cx="${CX}" cy="${top + 12}" rx="${hw + 14}" ry="8" fill="${hatC}" stroke="${hatD}" stroke-width="1.5"/><path d="M${CX - hw + 2} ${top + 4} Q${CX} ${top + 10} ${CX + hw - 2} ${top + 4}" stroke="#B5263E" stroke-width="4" fill="none"/>`;
    }

    // Christmas (Carl, 6 Nov 2026): a paper hat from a cracker, or a Santa hat, over whatever they're wearing
    let festive = "";
    if (o.xmas) {
      const rx = rng(seedOf(`${JSON.stringify(L)}:hat`));
      const hw = rt + 4;
      if (rx() < 0.3) {
        festive = `<g transform="rotate(${(rx() * 16 - 8).toFixed(1)} ${CX} ${top})"><path d="M${CX - hw} ${top + 12} Q${CX - hw + 6} ${top - 20} ${CX + 2} ${top - 24} Q${CX + 30} ${top - 30} ${CX + hw + 24} ${top - 40} Q${CX + hw + 6} ${top - 18} ${CX + hw} ${top + 12} Z" fill="#C8102E"/><path d="M${CX - hw - 4} ${top + 14} Q${CX} ${top + 2} ${CX + hw + 4} ${top + 14} Q${CX} ${top + 24} ${CX - hw - 4} ${top + 14} Z" fill="#FFF8E6" stroke="#E5DACA" stroke-width="1"/><circle cx="${CX + hw + 26}" cy="${top - 40}" r="7" fill="#FFF8E6" stroke="#E5DACA" stroke-width="1"/></g>`;
      } else {
        const col = pick(rx, ["#E63946", "#2E9E5B", "#F4C430", "#7B4FB5", "#F2762E", "#E85D9A", "#2A8FC5"]);
        const dark = shade(col, 0.8);
        let zig = `M${CX - hw} ${top + 20}`;
        for (let i = 0; i <= 6; i++) { const x = CX - hw + (i * 2 * hw) / 6; zig += ` L${x} ${i % 2 ? top + 20 : top - 8}`; }
        zig += ` L${CX + hw} ${top + 20} L${CX + hw} ${top + 34} Q${CX} ${top + 42} ${CX - hw} ${top + 34} Z`;
        festive = `<g transform="rotate(${(rx() * 14 - 7).toFixed(1)} ${CX} ${top + 20})"><path d="${zig}" fill="${col}" opacity=".93"/><path d="M${CX - hw + 6} ${top + 30} Q${CX} ${top + 38} ${CX + hw - 6} ${top + 30}" stroke="${dark}" stroke-width="1.2" fill="none" opacity=".7"/><path d="M${CX - hw + 8} ${top - 2} L${CX - hw + 14} ${top + 26}" stroke="${dark}" stroke-width="1" opacity=".5"/></g>`;
      }
    }
    // a loser's cold flannel, folded over the crown (6 Nov 2026), and a drip
    const flannel = mood === "lose" ? `<g transform="rotate(-6 ${CX} ${top})"><rect x="${CX - rt + 2}" y="${top - 8}" width="${2 * rt - 4}" height="22" rx="6" fill="#CFE6F2" stroke="#8FB8CC" stroke-width="1.5"/><path d="M${CX - rt + 8} ${top + 3} H${CX + rt - 8}" stroke="#8FB8CC" stroke-width="1.5" stroke-dasharray="4 3"/></g><path d="M${CX + rt - 2} ${top + 16} q3 5 0 9 q-3 -4 0 -9 Z" fill="#7FC4E8"/>` : "";
    return `<g class="avhead"${o.transform ? ` transform="${o.transform}"` : ""}><defs>${defs.join("")}</defs>
      <rect x="${CX - 14}" y="${chin - 12}" width="28" height="${124 - chin + 12}" rx="6" fill="${skinD}"/>
      ${back}${ears}
      <path d="${face}" fill="${skin}"/>
      <path d="${face}" fill="none" stroke="${skinL}" stroke-width="2" opacity=".35" clip-path="url(#${id}c)"/>
      ${cheeks}${beard}${brows}${eyes}${nose}${mouth}${glasses}${front}${hatSvg}${earrings}${festive}${flannel}
    </g>`;
  }

  /** The head on its own. `size` in px; o.cls adds classes; o.label describes it. */
  function svg(look, size, o = {}) {
    const s = size || 40;
    return `<svg class="avatar${o.cls ? ` ${o.cls}` : ""}" viewBox="${o.xmas ? "2 -22 124 146" : "2 -6 124 130"}" width="${s}" height="${s}" role="img" aria-label="${esc(o.label || "A player")}">${head(look, { mood: o.mood, xmas: o.xmas })}</svg>`;
  }
  /** "Steve 'the Mild Breeze' Jones" without the surname: `Steve "the Mild Breeze"`. */
  function fightName(look) { const f = find("fightName", lookOf(null, look).fightName); return f ? f.n : ""; }

  /** The player full length: the head in the jumper, trousers and shoes that `seed` gives (jumper.js). */
  function figure(look, seed, size, o = {}) {
    if (!root.Jumper || !root.Jumper.wear) return svg(look, size, o);
    // a touch bigger than the box, grown from the neck, so the head sits on the body as GuffBot's does
    return root.Jumper.wear(seed, size, head(look, { transform: "translate(56 -6) translate(64 112) scale(1.12) translate(-64 -112)", xmas: o.xmas }), { label: o.label, cls: o.cls });
  }

  /** The head as an <img> for a canvas, `px` square. Only drawn shapes, so the canvas stays clean. */
  function image(look, px, o = {}) {
    const s = svg(look, px, o).replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" ');
    return new Promise((ok, no) => {
      const im = new Image();
      im.onload = () => ok(im);
      im.onerror = () => no(new Error("avatar image"));
      im.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(s)}`;
    });
  }

  /** A line about what a player is wearing in this game, for the Ready screen and the lobby. */
  function wearing(name, seed) {
    if (!root.Jumper) return "";
    const d = root.Jumper.design(seed);
    const [A, B] = [d.a[0], d.b[0]];
    const P = { stripes: "stripes", zigzag: "zigzag", argyle: "argyle", fairisle: "Fair Isle", hearts: "hearts", snow: "snowflakes", tartan: "tartan", spots: "polka dots" }[d.pattern] || d.pattern;
    const T = d.trou.T;
    const r = rng(seed * 7 + 3);
    if (!name) {   // second person, for the editor's preview
      return pick(r, [
        `You're in ${A} and ${B} ${P}, with ${T}. Bold.`,
        `${A.charAt(0).toUpperCase() + A.slice(1)} and ${B} ${P} up top, ${T} below. Steady on.`,
        `A ${P} number in ${A} and ${B}, over ${T}. Somebody tell the parish.`,
        `${T.charAt(0).toUpperCase() + T.slice(1)}, and a jumper to match. Or not match. Either way, confidence.`,
      ]);
    }
    const lines = [
      `${name}: ${A} and ${B} ${P}, ${T}. Dressed for it.`,
      `${name} has come in ${A} and ${B}, with ${T}. Bold.`,
      `${name} in ${T} and a ${P} jumper. The ${T} were a choice.`,
      `${name}, in ${A} ${P} over ${T}. Somebody tell the parish.`,
      `For ${name}: ${A} and ${B} up top, ${T} below. Steady on.`,
      `${name} is wearing ${A} and ${B}, and ${T}. And confidence.`,
    ];
    const x = pick(r, lines);
    return x;
  }

  /** What they've brought: "Nick: Ovaltine and a slice of Battenberg." */
  /** o.xmas: Christmas rules. Whatever they chose, in the season it's a festive drink and snack, dealt from the look
      (so it's the same on every phone and every screen), unless their own choice was already festive. */
  function refreshments(look, o = {}) {
    const L = lookOf(null, look);
    let d = find("drink", L.drink), s = find("snack", L.snack);
    let festive = false;
    if (o.xmas) {
      const r = rng(seedOf(`${JSON.stringify(L)}:xmas`));
      if (!d.xmas) d = pick(r, PARTS.drink.filter((x) => x.xmas));
      if (!s.xmas) s = pick(r, PARTS.snack.filter((x) => x.xmas));
      festive = true;
    }
    const low = (x) => x.charAt(0).toLowerCase() + x.slice(1);
    return { drink: d.n, snack: s.n, e: `${d.e}${s.e}`, line: `${d.n} and ${low(s.n)}`, festive };
  }

  root.Avatar = { PARTS, KEYS, STARTERS, isStarter, lookOf, random, head, svg, figure, image, wearing, refreshments, fightName };
})(typeof window !== "undefined" ? window : globalThis);
