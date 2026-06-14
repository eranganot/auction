/* Service worker for Bidspirit web push notifications. */
'use strict';

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_e) {
    data = { title: 'מכרזי רכב', body: event.data ? event.data.text() : '' };
  }
  const title = data.title || '🔔 שינויים יומיים ברכבים';
  const options = {
    body: data.body || '',
    dir: 'rtl',
    lang: 'he',
    tag: 'bidspirit-daily-changes',
    renotify: true,
    data: { url: data.url || '/' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) return c.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
