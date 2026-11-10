/**
 * Guffhead: Web Push from the Worker (copied from CountGuff, which copied it from Words and Guff), no dependencies.
 *
 * Implements RFC 8291 (payload encryption, aes128gcm) and RFC 8292 (VAPID) on WebCrypto.
 *
 * Config (wrangler.toml [vars] + one secret):
 *   VAPID_PUBLIC_KEY   base64url of the 65-byte uncompressed P-256 public key
 *   VAPID_PRIVATE_KEY  (secret) base64url of the 32-byte private scalar
 *   VAPID_SUBJECT      mailto:you@example.com
 * Guffhead has its own pair (node tools/vapid.mjs), so players turn notifications on in Guffhead itself.
 *
 * Table: gh_push (schema.sql). A subscription the push service reports gone (404/410) is deleted on the spot.
 */

const utf8 = (s) => new TextEncoder().encode(s);
export const b64u = {
  enc(buf) {
    const a = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    let s = "";
    for (const b of a) s += String.fromCharCode(b);
    return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  },
  dec(s) {
    const t = String(s || "").replace(/-/g, "+").replace(/_/g, "/");
    return Uint8Array.from(atob(t + "=".repeat((4 - (t.length % 4)) % 4)), (c) => c.charCodeAt(0));
  },
};
function concat(...parts) {
  const n = parts.reduce((a, p) => a + p.length, 0);
  const out = new Uint8Array(n);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

async function hkdf(salt, ikm, info, len) {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, key, len * 8));
}

/** RFC 8291: encrypt a payload for one subscription. Returns the aes128gcm body. */
export async function encryptPayload(subscription, plaintext) {
  const uaPub = b64u.dec(subscription.keys.p256dh);          // 65 bytes, uncompressed point
  const auth = b64u.dec(subscription.keys.auth);             // 16 bytes
  if (uaPub.length !== 65 || auth.length !== 16) throw new Error("Bad subscription keys");
  const local = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const asPub = new Uint8Array(await crypto.subtle.exportKey("raw", local.publicKey));
  const uaKey = await crypto.subtle.importKey("raw", uaPub, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, local.privateKey, 256));
  const ikm = await hkdf(auth, shared, concat(utf8("WebPush: info\0"), uaPub, asPub), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, utf8("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, utf8("Content-Encoding: nonce\0"), 12);
  const aes = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const padded = concat(utf8(plaintext), new Uint8Array([2]));    // 0x02 = last record delimiter
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aes, padded));
  const rs = 4096;
  if (padded.length + 16 > rs) throw new Error("Payload too long");
  const header = concat(salt, new Uint8Array([(rs >>> 24) & 255, (rs >>> 16) & 255, (rs >>> 8) & 255, rs & 255, asPub.length]), asPub);
  return concat(header, ct);
}

/** RFC 8292: the Authorization header for a push endpoint. */
export async function vapidAuthorization(endpoint, env) {
  const aud = new URL(endpoint).origin;
  const header = b64u.enc(utf8(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = b64u.enc(utf8(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: env.VAPID_SUBJECT || "mailto:carl@mesnerlyons.com" })));
  const pub = b64u.dec(env.VAPID_PUBLIC_KEY);
  if (pub.length !== 65) throw new Error("VAPID_PUBLIC_KEY is not a 65-byte key");
  const jwk = { kty: "EC", crv: "P-256", x: b64u.enc(pub.slice(1, 33)), y: b64u.enc(pub.slice(33, 65)), d: env.VAPID_PRIVATE_KEY };
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, utf8(`${header}.${claims}`)));
  return `vapid t=${header}.${claims}.${b64u.enc(sig)}, k=${env.VAPID_PUBLIC_KEY}`;
}

export const pushConfigured = (env) => !!(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);

/** Send one notification to one subscription. Returns the HTTP status, or 0 on a network error. */
export async function sendPush(env, subscription, payload, { ttl = 86400, urgency = "high" } = {}) {
  const body = await encryptPayload(subscription, JSON.stringify(payload));
  const res = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      Authorization: await vapidAuthorization(subscription.endpoint, env),
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      "Content-Length": String(body.length),
      TTL: String(ttl),
      Urgency: urgency,
    },
    body,
  }).catch(() => null);
  if (res && !(res.status >= 200 && res.status < 300)) { try { sendPush.lastReason = `${res.status} ${(await res.text()).slice(0, 160)}`.trim(); } catch { sendPush.lastReason = String(res.status); } }
  return res ? res.status : 0;
}

/** Do the two VAPID keys belong together? Sign with the private one, check with the public one. */
export async function keysMatch(env) {
  try {
    const pub = b64u.dec(env.VAPID_PUBLIC_KEY);
    const x = b64u.enc(pub.slice(1, 33)), y = b64u.enc(pub.slice(33, 65));
    const priv = await crypto.subtle.importKey("jwk", { kty: "EC", crv: "P-256", x, y, d: env.VAPID_PRIVATE_KEY }, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
    const pubKey = await crypto.subtle.importKey("raw", pub, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
    const msg = utf8("guffhead");
    const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, priv, msg);
    return await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, pubKey, sig, msg);
  } catch { return false; }
}

/**
 * Notify a set of players on every device they have subscribed in Guffhead.
 * payload: { title, body, url, tag }. Dead subscriptions are removed.
 */
export async function notifyPlayers(env, playerIds, payload, opts) {
  if (!pushConfigured(env) || !playerIds.length) return { sent: 0 };
  const q = playerIds.map(() => "?").join(",");
  const rows = await env.DB.prepare(`SELECT id, player_id, endpoint, p256dh, auth FROM gh_push WHERE player_id IN (${q})`).bind(...playerIds).all();
  // the number on the Home Screen icon: games waiting on each player
  const counts = {};
  for (const pid of playerIds) {
    try { counts[pid] = (await env.DB.prepare(`SELECT COUNT(*) AS n FROM gh_games WHERE status = 'playing' AND (turn = ? OR turn LIKE ? OR turn LIKE ? OR turn LIKE ?)`).bind(pid, `${pid},%`, `%,${pid}`, `%,${pid},%`).first()).n; } catch { counts[pid] = undefined; }
  }
  let sent = 0;
  for (const r of rows.results) {
    const sub = { endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } };
    let status = 0;
    const body = counts[r.player_id] === undefined ? payload : { ...payload, count: counts[r.player_id] };
    try { status = await sendPush(env, sub, body, opts); } catch (e) { status = -1; }
    if (status === 404 || status === 410) await env.DB.prepare(`DELETE FROM gh_push WHERE id = ?`).bind(r.id).run();
    else if (status >= 200 && status < 300) { sent++; await env.DB.prepare(`UPDATE gh_push SET last_ok = ? WHERE id = ?`).bind(Date.now(), r.id).run(); }
  }
  return { sent, tried: rows.results.length };
}
