const CACHE_NAME = "cartaya-menu-v3";
const APP_SHELL = ["/offline", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (request.mode === "navigate" && url.origin === self.location.origin && url.pathname.startsWith("/r/")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
          return response;
        })
        .catch(async () => (await caches.match(request)) || (await caches.match("/offline"))),
    );
    return;
  }

  if (request.destination === "image" || url.pathname.startsWith("/_next/static/") || url.pathname.endsWith(".webmanifest")) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        if (response.ok || response.type === "opaque") {
          caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
        }
        return response;
      })),
    );
  }
});

self.addEventListener("push", (event) => {
  let payload = { title: "CartaYa", body: "Tienes una actualización nueva.", url: "/dashboard" };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {}

  const declared = payload.notification || {};
  const title = declared.title || payload.title || "CartaYa";
  const body = declared.body || payload.body || "Tienes una actualización nueva.";
  const targetUrl = declared.navigate || payload.url || "/dashboard";

  const show = self.registration.showNotification(title, {
      body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: declared.tag || payload.tag || "cartaya-update",
      renotify: true,
      silent: false,
      vibrate: [200, 100, 200],
      timestamp: Date.now(),
      data: { url: targetUrl },
    });
  const badge = typeof self.navigator?.setAppBadge === "function" ? self.navigator.setAppBadge(1) : Promise.resolve();
  event.waitUntil(Promise.all([show, badge]));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (typeof self.navigator?.clearAppBadge === "function") void self.navigator.clearAppBadge();
  const targetUrl = new URL(event.notification.data?.url || "/dashboard", self.location.origin).href;
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      const existing = windowClients.find((client) => "focus" in client);
      if (existing) {
        existing.navigate(targetUrl);
        return existing.focus();
      }
      return clients.openWindow(targetUrl);
    }),
  );
});
