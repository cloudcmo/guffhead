/**
 * Guffhead's own key pair for notifications. Run once, from ~/code/guffhead:
 *
 *   node tools/vapid.mjs
 *
 * Writes the public key into wrangler.toml (VAPID_PUBLIC_KEY) and the private key into .vapid-private (which git
 * ignores) for one command to hand to Cloudflare as a secret:
 *
 *   npx wrangler secret put VAPID_PRIVATE_KEY < .vapid-private && rm .vapid-private
 *
 * Does nothing if wrangler.toml already has a key, so running it twice can't break notifications.
 */
import { readFileSync, writeFileSync } from "node:fs";
const b64u = (buf) => Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const b64uDec = (s) => Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
const toml = readFileSync("wrangler.toml", "utf8");
const m = toml.match(/VAPID_PUBLIC_KEY = "([^"]*)"/);
if (!m) { console.error("wrangler.toml has no VAPID_PUBLIC_KEY line; run this from ~/code/guffhead"); process.exit(1); }
if (m[1]) { console.log("wrangler.toml already has a public key: leaving it alone."); process.exit(0); }
const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
const jwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
const pub = b64u(Buffer.concat([Buffer.from([4]), b64uDec(jwk.x), b64uDec(jwk.y)]));
writeFileSync("wrangler.toml", toml.replace(/VAPID_PUBLIC_KEY = "[^"]*"/, `VAPID_PUBLIC_KEY = "${pub}"`));
writeFileSync(".vapid-private", jwk.d);
console.log("Public key written into wrangler.toml; private key in .vapid-private for the next command.");
