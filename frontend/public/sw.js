self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  const payload = event.data?.json() || {};
  const title = payload.title || 'Meta Creators Awards';
  const options = {
    body: payload.body || 'Une mise à jour importante vient d’être publiée.',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    data: { url: payload.url || '/' },
    tag: payload.tag || 'meta-creators-awards',
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('url' in client && client.url.includes(targetUrl)) {
          return client.focus();
        }
      }
      return clients.openWindow(targetUrl);
    })
  );
});
