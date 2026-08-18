self.addEventListener('push', (event) => {
  let data = { title: '📞 受電メモ', body: '' };
  try {
    data = event.data.json();
  } catch (e) {
    data.body = event.data ? event.data.text() : '';
  }

  event.waitUntil(
    self.registration.showNotification(data.title || '📞 受電メモ', {
      body: data.body || '',
      icon: '/favicon.svg',
      tag: data.memoId ? `call-memo-${data.memoId}` : undefined
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('/');
    })
  );
});
