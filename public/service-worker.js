// Habynex Service Worker v4.0
const CACHE_NAME = "Habynex-v4";
const APP_ICON = "/favicon.png";

// Install
self.addEventListener("install", (event) => {
  console.log("[SW] Installing v4.0");
  self.skipWaiting();
});

// Activate
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating v4.0");
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

// Push event - show rich personalized notification
self.addEventListener("push", (event) => {
  console.log("[SW] Push received");

  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "Habynex", body: event.data ? event.data.text() : "Nouvelle notification" };
  }

  const title = data.title || "Habynex";
  const body = data.body || "";
  const icon = data.icon || APP_ICON;
  const badge = data.badge || APP_ICON;
  const image = data.image || undefined;
  const notifData = data.data || {};

  const options = {
    body: body,
    icon: icon,
    badge: badge,
    vibrate: [200, 100, 200, 100, 200],
    tag: notifData.type || "default",
    renotify: true,
    requireInteraction: notifData.type === "new_message" || notifData.type === "new_inquiry",
    data: notifData,
    actions: getActionsForType(notifData.type),
  };

  if (image) {
    options.image = image;
  }

  event.waitUntil(
    self.registration.showNotification(title, options).then(function() {
      // Update PWA badge count
      return updateBadgeCount();
    })
  );
});

// Count unread notifications and update badge
function updateBadgeCount() {
  return self.registration.getNotifications().then(function(notifications) {
    var count = notifications.length;
    if (navigator.setAppBadge) {
      return navigator.setAppBadge(count > 0 ? count : undefined).catch(function() {});
    }
  }).catch(function() {});
}

// Notification click
self.addEventListener("notificationclick", (event) => {
  console.log("[SW] Notification clicked, action:", event.action);
  event.notification.close();

  const data = event.notification.data || {};
  let targetUrl = data.url || "/";

  if (event.action === "contact" || event.action === "reply") {
    targetUrl = data.contactUrl || "/messages";
  } else if (event.action === "view") {
    targetUrl = data.url || "/";
  }

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function(clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          client.navigate(targetUrl);
          return;
        }
      }
      return clients.openWindow(targetUrl);
    }).then(function() {
      if (navigator.clearAppBadge) {
        navigator.clearAppBadge().catch(function() {});
      }
    })
  );
});

// Notification close - update badge
self.addEventListener("notificationclose", (event) => {
  console.log("[SW] Notification closed");
  event.waitUntil(updateBadgeCount());
});

// Get contextual actions for notification type
function getActionsForType(type) {
  switch (type) {
    case "new_message":
      return [
        { action: "view", title: "💬 Lire" },
        { action: "reply", title: "📩 Répondre" },
      ];
    case "new_inquiry":
      return [
        { action: "view", title: "👁️ Voir la demande" },
        { action: "reply", title: "📩 Répondre" },
      ];
    case "new_property":
    case "price_drop":
      return [
        { action: "view", title: "🏠 Voir l'annonce" },
        { action: "contact", title: "📞 Contacter" },
      ];
    case "new_review":
      return [{ action: "view", title: "⭐ Voir l'avis" }];
    case "high_views":
      return [{ action: "view", title: "📊 Voir les stats" }];
    case "verification_update":
    case "account_verified":
      return [{ action: "view", title: "✅ Voir mon profil" }];
    case "reengagement":
      return [{ action: "view", title: "🏠 Voir les annonces" }];
    default:
      return [{ action: "view", title: "Ouvrir" }];
  }
}
