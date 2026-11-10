/* Guffhead: service worker (copied from CountGuff). Push notifications only: no caching, so nothing
   here can ever serve a stale page. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data ? e.data.text() : "" }; }
  const show = self.registration.showNotification(d.title || "Guffhead", {
    body: d.body || "",
    icon: "/icon-192.png",
    badge: "/favicon-32.png",
    tag: d.tag || "gh",
    renotify: true,
    data: { url: d.url || "/" },
  });
  // the number on the Home Screen icon: games waiting on you, sent with the push (25 Oct 2026)
  const badge = typeof d.count === "number" && self.navigator && self.navigator.setAppBadge
    ? (d.count ? self.navigator.setAppBadge(d.count) : self.navigator.clearAppBadge()).catch(() => {})
    : Promise.resolve();
  e.waitUntil(Promise.all([show, badge]));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = new URL(e.notification.data && e.notification.data.url ? e.notification.data.url : "/", self.location.origin).href;
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const mine = wins.find((c) => c.url.startsWith(self.location.origin));
    if (mine) { mine.postMessage({ type: "open", url }); try { await mine.focus(); } catch {} return; }
    await self.clients.openWindow(url);
  })());
});
