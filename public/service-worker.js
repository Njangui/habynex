// Habynex Service Worker v4.1 - Production Ready
const CACHE_NAME = "habynex-v4.1";
const STATIC_CACHE = "habynex-static-v4.1";
const API_CACHE = "habynex-api-v4.1";

const APP_ICON = "/icon-192x192.png";
const BADGE_ICON = "/badge-72x72.png";

// Assets critiques à mettre en cache
const CRITICAL_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  APP_ICON,
  BADGE_ICON,
  "/static/js/main.js",
  "/static/css/main.css",
];

// =================================================
// INSTALL
// =================================================

self.addEventListener("install", (event) => {
  console.log("[SW] Installing v4.1");

  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(CRITICAL_ASSETS).catch((err) => {
        console.warn("[SW] Cache addAll failed:", err);
        // Continuer même si certains assets échouent
        return Promise.all(
          CRITICAL_ASSETS.map((url) =>
            cache.add(url).catch((e) => console.warn("[SW] Failed to cache:", url, e))
          )
        );
      });
    }).then(() => self.skipWaiting())
  );
});

// =================================================
// ACTIVATE
// =================================================

self.addEventListener("activate", (event) => {
  console.log("[SW] Activating v4.1");

  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((n) => !n.startsWith("habynex-") || n !== CACHE_NAME)
          .map((n) => {
            console.log("[SW] Deleting old cache:", n);
            return caches.delete(n);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// =================================================
// FETCH - Stratégie de cache
// =================================================

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer les requêtes non-GET
  if (request.method !== "GET") return;

  // Stratégie: Cache First pour les assets statiques
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Stratégie: Network First pour l'API avec fallback cache
  if (isAPIRequest(url)) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // Stratégie par défaut: Network avec cache fallback
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

function isStaticAsset(url) {
  return url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/);
}

function isAPIRequest(url) {
  return url.pathname.startsWith("/api/") || 
         url.pathname.includes("/rest/v1/") ||
         url.hostname.includes("supabase");
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  if (cached) return cached;
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.error("[SW] Cache first failed:", error);
    return new Response("Offline", { status: 503 });
  }
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log("[SW] Network failed, trying cache:", request.url);
    const cached = await cache.match(request);
    if (cached) return cached;
    
    return new Response(
      JSON.stringify({ error: "Offline", cached: false }),
      { 
        status: 503, 
        headers: { "Content-Type": "application/json" } 
      }
    );
  }
}

// =================================================
// PUSH - Notifications enrichies
// =================================================

self.addEventListener("push", (event) => {
  console.log("[SW] Push received:", event.data?.text());

  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    console.warn("[SW] Push data parse error:", e);
    data = { 
      title: "Habynex", 
      body: "Nouvelle notification",
      data: { type: "default" }
    };
  }

  const notificationId = data.data?.notificationId || `notif-${Date.now()}`;
  const title = data.title || "Habynex";
  const body = data.body || "";
  const icon = data.icon || APP_ICON;
  const badge = data.badge || BADGE_ICON;
  const image = data.image;
  const notifData = {
    ...data.data,
    notificationId,
    timestamp: Date.now(),
  };

  // Tag unique pour éviter les doublons mais permettre plusieurs notifications
  const tag = `${notifData.type || "default"}-${notificationId}`;

  const options = {
    body,
    icon,
    badge,
    tag, // Tag unique par notification
    renotify: false, // Ne pas remplacer, créer une nouvelle
    requireInteraction: ["new_message", "new_inquiry"].includes(notifData.type),
    silent: false,
    vibrate: [200, 100, 200],
    data: notifData,
    actions: getActionsForType(notifData.type, notifData),
    timestamp: Date.now(),
  };

  if (image && isValidImageUrl(image)) {
    options.image = image;
  }

  // Auto-close après 30s si requireInteraction=false
  if (!options.requireInteraction) {
    setTimeout(() => {
      self.registration.getNotifications().then((notifications) => {
        notifications
          .filter((n) => n.tag === tag && Date.now() - (n.data?.timestamp || 0) > 25000)
          .forEach((n) => n.close());
      });
    }, 30000);
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
      .then(() => updateBadgeCount())
      .catch((err) => {
        console.error("[SW] Show notification failed:", err);
        // Fallback simple si riche échoue
        return self.registration.showNotification(title, {
          body: body.substring(0, 100),
          icon: APP_ICON,
        });
      })
  );
});

function isValidImageUrl(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

// =================================================
// BADGE MANAGEMENT
// =================================================

async function updateBadgeCount() {
  try {
    if (!navigator.setAppBadge) return;
    
    const notifications = await self.registration.getNotifications();
    const count = notifications.length;
    
    await navigator.setAppBadge(count > 0 ? count : 0);
    console.log("[SW] Badge updated:", count);
  } catch (error) {
    console.warn("[SW] Badge update failed:", error);
  }
}

async function clearBadge() {
  try {
    if (navigator.clearAppBadge) {
      await navigator.clearAppBadge();
    }
    if (navigator.setAppBadge) {
      await navigator.setAppBadge(0);
    }
  } catch (error) {
    console.warn("[SW] Clear badge failed:", error);
  }
}

// =================================================
// NOTIFICATION CLICK
// =================================================

self.addEventListener("notificationclick", (event) => {
  console.log("[SW] Notification clicked:", event.action, event.notification.tag);
  
  event.notification.close();

  const data = event.notification.data || {};
  let targetUrl = data.url || "/";

  // Gestion des actions personnalisées
  switch (event.action) {
    case "reply":
    case "contact":
      targetUrl = data.contactUrl || "/messages";
      break;
    case "view":
      targetUrl = data.url || "/";
      break;
    case "dismiss":
      // Juste fermer, ne pas naviguer
      event.waitUntil(updateBadgeCount());
      return;
    default:
      // Click sur la notification elle-même
      targetUrl = data.url || "/";
  }

  event.waitUntil(
    focusOrOpenWindow(targetUrl)
      .then(() => clearBadge())
      .then(() => {
        // Notifier l'app que la notification a été cliquée
        return notifyClients("notification-clicked", data);
      })
      .catch((err) => {
        console.error("[SW] Navigation failed:", err);
        // Fallback: ouvrir dans nouvel onglet
        return clients.openWindow(targetUrl);
      })
  );
});

async function focusOrOpenWindow(url) {
  if (!self.clients) {
    console.warn("[SW] Clients API not available");
    return clients.openWindow(url);
  }

  const clientList = await clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });

  // Chercher un client existant
  for (const client of clientList) {
    if (client.url.includes(self.location.origin) && "focus" in client) {
      await client.focus();
      // Naviguer si URL différente
      if (!client.url.includes(url)) {
        await client.navigate(url);
      }
      return client;
    }
  }

  // Ouvrir nouveau si aucun existant
  return clients.openWindow(url);
}

// =================================================
// NOTIFICATION CLOSE
// =================================================

self.addEventListener("notificationclose", (event) => {
  console.log("[SW] Notification closed:", event.notification.tag);
  event.waitUntil(updateBadgeCount());
});

// =================================================
// MESSAGE FROM CLIENT
// =================================================

self.addEventListener("message", (event) => {
  console.log("[SW] Message from client:", event.data?.type);

  switch (event.data?.type) {
    case "UPDATE_BADGE":
      event.waitUntil(updateBadgeCount());
      break;
      
    case "CLEAR_BADGE":
      event.waitUntil(clearBadge());
      break;
      
    case "SKIP_WAITING":
      self.skipWaiting();
      break;
      
    case "GET_VERSION":
      event.ports[0]?.postMessage({ version: "4.1" });
      break;
      
    case "PING":
      event.ports[0]?.postMessage({ pong: true, timestamp: Date.now() });
      break;
      
    default:
      console.log("[SW] Unknown message type:", event.data?.type);
  }
});

// =================================================
// SYNC (Background Sync pour messages offline)
// =================================================

self.addEventListener("sync", (event) => {
  if (event.tag === "sync-messages") {
    event.waitUntil(syncPendingMessages());
  }
});

async function syncPendingMessages() {
  try {
    const cache = await caches.open("habynex-pending");
    const requests = await cache.keys();
    
    for (const request of requests) {
      try {
        const response = await fetch(request);
        if (response.ok) {
          await cache.delete(request);
        }
      } catch (e) {
        console.warn("[SW] Sync failed for:", request.url);
      }
    }
  } catch (error) {
    console.error("[SW] Background sync failed:", error);
  }
}

// =================================================
// UTILITAIRES
// =================================================

function getActionsForType(type, data) {
  const baseActions = {
    new_message: [
      { action: "view", title: "💬 Lire" },
      { action: "reply", title: "📩 Répondre" },
      { action: "dismiss", title: "✓ Lu" },
    ],
    new_inquiry: [
      { action: "view", title: "👁️ Voir" },
      { action: "reply", title: "📩 Répondre" },
      { action: "dismiss", title: "✓ Lu" },
    ],
    new_property: [
      { action: "view", title: "🏠 Voir" },
      { action: "contact", title: "📞 Contacter" },
    ],
    price_drop: [
      { action: "view", title: "💰 Voir" },
      { action: "contact", title: "📞 Contacter" },
    ],
    new_review: [
      { action: "view", title: "⭐ Voir l'avis" },
      { action: "dismiss", title: "✓ Lu" },
    ],
    high_views: [
      { action: "view", title: "📊 Stats" },
      { action: "dismiss", title: "✓ Lu" },
    ],
    verification_update: [
      { action: "view", title: "✅ Profil" },
    ],
    account_verified: [
      { action: "view", title: "✅ Profil" },
    ],
    reengagement: [
      { action: "view", title: "🏠 Annonces" },
      { action: "dismiss", title: "✓ Lu" },
    ],
    default: [
      { action: "view", title: "Ouvrir" },
      { action: "dismiss", title: "Fermer" },
    ],
  };

  return baseActions[type] || baseActions.default;
}

async function notifyClients(type, data) {
  if (!self.clients) return;
  
  const allClients = await clients.matchAll({ includeUncontrolled: true });
  for (const client of allClients) {
    client.postMessage({ type, data, timestamp: Date.now() });
  }
}

// =================================================
// PERIODIC SYNC (pour réengagement)
// =================================================

self.addEventListener("periodicsync", (event) => {
  if (event.tag === "check-reengagement") {
    event.waitUntil(checkReengagement());
  }
});

async function checkReengagement() {
  // Déclencher depuis l'app via message
  await notifyClients("check-reengagement", {});
}