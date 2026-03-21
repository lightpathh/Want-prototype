// ===== Want PWA用サービスワーカー =====

const CACHE_NAME = 'Want-v1.0.4';

const PRECACHE_URLS = [
  './',
  './want.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',
];

const OFFLINE_FALLBACK = new Response('オフライン中です', {
  status: 503,
  headers: { 'Content-Type': 'text/plain; charset=utf-8' },
});

// --- インストール時: 全リソースをキャッシュ ---
self.addEventListener('install', (event) => {
  console.log('[SW] Install');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) =>
        Promise.all(
          PRECACHE_URLS.map((url) =>
            fetch(new Request(url, { cache: 'no-store' })) // ← HTTPキャッシュを無視して取得
              .then((res) => cache.put(url, res))
              .catch(() => console.warn('[SW] キャッシュ失敗（無視）:', url))
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

// --- アクティベート時: 古いキャッシュを削除 ---
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate');
  event.waitUntil(
    caches.keys()
      .then((keys) => {
        const oldKeys = keys.filter((key) => key !== CACHE_NAME);
        return Promise.all(
          oldKeys.map((key) => {
            console.log('[SW] 古いキャッシュを削除:', key);
            return caches.delete(key);
          })
        ).then(() => oldKeys.length > 0);
      })
      .then((wasUpdated) => self.clients.claim().then(() => wasUpdated))
      .then((wasUpdated) => {
        if (!wasUpdated) return;
        self.clients.matchAll({ type: 'window' }).then((clients) => {
          clients.forEach((client) => client.postMessage({ type: 'SW_UPDATED' }));
        });
      })
  );
});

// --- フェッチ時: キャッシュ優先、なければネットワーク取得 ---
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          // 自オリジンのリソースのみランタイムキャッシュに追加
          if (event.request.url.startsWith(self.location.origin)) {
            caches.open(CACHE_NAME).then((cache) =>
              cache.put(event.request, response.clone())
            );
          }
          return response;
        })
        .catch(() =>
          caches.match('./want.html').then((r) => r ?? OFFLINE_FALLBACK.clone())
        );
    })
  );
});