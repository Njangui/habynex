// Habynex Service Worker - Stable / Scalable

const APP_NAME = "Habynex";
const DEFAULT_ICON = "/icons/icon-192.png";
const DEFAULT_BADGE = "/icons/badge-72.png";

// ================= INSTALL =================

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

// ================= ACTIVATE =================

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// ================= PUSH =================

self.addEventListener("push", (event) => {

  if (!event.data) return;

  let payload = {};

  try {
    payload = event.data.json();
  } catch {
    payload = { body: event.data.text() };
  }

  const title = payload.title || APP_NAME;

  const options = {
    body: payload.body || "",
    icon: payload.icon || DEFAULT_ICON,
    badge: payload.badge || DEFAULT_BADGE,
    image: payload.image || undefined,

    // meilleure UX mobile
    vibrate: payload.vibrate || [200, 100, 200],

    // évite les notifications multiples
    tag: payload.tag || payload.data?.type || "habynex-general",

    renotify: true,

    // important pour iOS / Android
    requireInteraction: payload.requireInteraction || false,

    data: {
      url: payload.data?.url || "/",
      type: payload.data?.type || "general",
      id: payload.data?.id || null
    },

    actions: payload.actions || [
      { action: "open", title: "Voir" },
      { action: "dismiss", title: "Ignorer" }
    ]
  };

  event.waitUntil(handlePush(title, options));

});

async function handlePush(title, options) {

  try {

    await self.registration.showNotification(title, options);

    // badge PWA (Chrome / Android)
    if ("setAppBadge" in self.registration) {
      try {
        await self.registration.setAppBadge(1);
      } catch {}
    }

  } catch (error) {
    console.error("Push display error:", error);
  }

}

// ================= CLICK =================

self.addEventListener("notificationclick", (event) => {

  event.notification.close();

  const action = event.action;
  const url = event.notification.data?.url || "/";

  if (action === "dismiss") return;

  event.waitUntil(openApp(url));

});

async function openApp(url) {

  const clientsList = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true
  });

  for (const client of clientsList) {

    const clientUrl = new URL(client.url);

    if (clientUrl.origin === self.location.origin) {

      await client.focus();

      if ("navigate" in client) {
        await client.navigate(url);
      }

      return;

    }

  }

  if (self.clients.openWindow) {
    return self.clients.openWindow(url);
  }

}

// ================= CLOSE =================

self.addEventListener("notificationclose", (event) => {

  const data = event.notification.data || {};

  // prêt pour analytics futur
  console.log("Notification dismissed", data);

});

// ================= MESSAGE =================

// communication avec React
self.addEventListener("message", (event) => {

  if (!event.data) return;

  if (event.data.type === "CLEAR_BADGE") {

    if ("clearAppBadge" in self.registration) {
      self.registration.clearAppBadge().catch(() => {});
    }

  }

});