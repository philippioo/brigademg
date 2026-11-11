/* Brigade Mönchengladbach – Offline-Unterstützung.
   Seite und daten.json: erst Netz, ohne Netz die gespeicherte Fassung.
   Vorschaubilder und angesehene Fotos: aus dem Speicher (ändern sich nie). */
var CORE = "bmg-core-v1", THUMB = "bmg-klein-v1", FULL = "bmg-fotos-v1";
var PRE = ["./", "daten.json", "quiz.json", "logo.png", "app-192.png", "fonts/BigShoulders-Bold.woff", "fonts/WorkSans-Regular.woff", "fonts/WorkSans-Bold.woff", "fonts/WorkSans-Italic.woff"];
self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CORE).then(function (c) { return c.addAll(PRE); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return [CORE, THUMB, FULL].indexOf(k) < 0; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
function trim(c, max) { return c.keys().then(function (ks) { if (ks.length > max) return c.delete(ks[0]).then(function () { return trim(c, max); }); }); }
function netFirst(req, key) {
  return fetch(req).then(function (r) {
    if (r.ok) { var cp = r.clone(); caches.open(CORE).then(function (c) { c.put(key, cp); }); }
    return r;
  }).catch(function () { return caches.match(key).then(function (r) { return r || Response.error(); }); });
}
function cacheFirst(req, name, max) {
  return caches.match(req).then(function (hit) {
    return hit || fetch(req).then(function (r) {
      if (r.ok) { var cp = r.clone(); caches.open(name).then(function (c) { c.put(req, cp).then(function () { if (max) trim(c, max); }); }); }
      return r;
    });
  });
}
function stale(req) {
  return caches.match(req).then(function (hit) {
    var net = fetch(req).then(function (r) { if (r.ok) { var cp = r.clone(); caches.open(CORE).then(function (c) { c.put(req, cp); }); } return r; });
    if (hit) { net.catch(function () {}); return hit; }
    return net;
  });
}
self.addEventListener("fetch", function (e) {
  var req = e.request; if (req.method !== "GET") return;
  var u = new URL(req.url); if (u.origin !== location.origin) return;
  var p = u.pathname;
  if (req.mode === "navigate") { e.respondWith(netFirst(req, "./")); return; }
  if (/^\/(daten|quiz)\.json$/.test(p)) { e.respondWith(netFirst(req, p)); return; }
  if (/^\/fotos\/klein\//.test(p)) { e.respondWith(cacheFirst(req, THUMB, 500)); return; }
  if (/^\/fotos\//.test(p)) { e.respondWith(cacheFirst(req, FULL, 80)); return; }
  if (p === "/sw.js") return;
  e.respondWith(stale(req));
});
