// Habynex Service Worker for Push Notifications
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const options = {
      body: data.body || '',
      icon: data.icon || '/favicon.png',
      badge: data.badge || '/favicon.png',
      data: data.data || { url: '/' },
      vibrate: [200, 100, 200],
      tag: data.data?.type || 'habynex-notification',
      renotify: true,
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Habynex', options)
        .then(() => {
          if (navigator.setAppBadge) {
            return navigator.setAppBadge(1);
          }
        })
    );
  } catch (e) {
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification('Habynex', { body: text, icon: '/favicon.png' })
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            client.navigate(url);
            return;
          }
        }
        return clients.openWindow(url);
      })
      .then(() => {
        if (navigator.setAppBadge) {
          return navigator.clearAppBadge();
        }
      })
  );
});
