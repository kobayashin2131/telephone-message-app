self.addEventListener('push', (event) => {
  let data = { title: 'Connect Suite', body: '', type: 'message', url: '/' };
  try {
    data = event.data.json();
  } catch (e) {
    data.body = event.data ? event.data.text() : '';
  }

  let tag = undefined;
  if (data.type === 'call_memo' || data.memoId) {
    tag = `call-memo-${data.memoId || 'latest'}`;
  } else if (data.data?.targetType && data.data?.targetId) {
    tag = `chat-${data.data.targetType}-${data.data.targetId}`;
  }

  const targetUrl = data.url || (data.type === 'call_memo' ? '/?app=callsync' : '/?app=chat');

  event.waitUntil(
    self.registration.showNotification(data.title || 'Connect Suite', {
      body: data.body || '',
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag,
      data: {
        url: targetUrl,
        type: data.type,
        ...(data.data || {})
      }
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const notifData = event.notification.data || {};
  const targetUrl = notifData.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          client.postMessage({
            type: 'NAVIGATE_TARGET',
            url: targetUrl,
            data: notifData
          });
          return;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
