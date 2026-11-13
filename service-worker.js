/* Imgs Converter — Service Worker
   استراتيجية: Cache-First مع إعادة التخزين الديناميكي
   يجعل التطبيق يعمل بدون إنترنت بعد أول زيارة.
*/
const CACHE_NAME = 'imgs-converter-v2';
const PRECACHE = ['./', './index.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(PRECACHE).catch((e) => console.warn('[SW] precache failed:', e))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  // تجاهل الطلبات غير http/https (chrome-extension مثلاً)
  if (!req.url.startsWith('http')) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((response) => {
        // خزّن الاستجابات الناجحة (بما فيها من نفس الأصل أو CDN)
        if (response && response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
        }
        return response;
      }).catch(() => {
        // Fallback عند فقد الاتصال
        if (req.mode === 'navigate') return caches.match('./index.html');
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      });
    })
  );
});

// استقبال إشعارات من الصفحة (اختياري)
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});