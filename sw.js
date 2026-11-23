// 학원지원센터 서비스 워커: 휴대폰 · PC 알림(웹 푸시)만 받아요. 화면 파일은 따로 저장해 두지 않아요(늘 새 화면).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { title: '학원지원센터', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || '학원지원센터', {
    body: d.body || '',
    icon: '/assets/icons/icon-192.png?v=2',
    badge: '/assets/icons/badge-96.png',
    tag: d.tag || undefined,
    renotify: !!d.tag,
    data: { url: d.url || '/app' }
  }));
});

// 알림을 누르면: 열려 있는 창이 있으면 그 창을 그 화면으로, 없으면 새로 열어요
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || '/app', self.location.origin).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    const win = list.find(c => new URL(c.url).pathname.startsWith('/app') || new URL(c.url).pathname.startsWith('/demo'));
    if (win) return win.focus().then(w => (w || win).navigate ? (w || win).navigate(url) : null).catch(() => self.clients.openWindow(url));
    return self.clients.openWindow(url);
  }));
});
