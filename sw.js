// ===== Want PWA用サービスワーカー =====

const CACHE_NAME = 'Want-v1.0.0';
const APP_SHELL = [
  './',
  './want.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js'
];

// --- インストール時（初回アクセス時）: 必要ファイルをキャッシュ ---
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// --- アクティベート時: 古いキャッシュを削除 ---
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('[ServiceWorker] Remove old cache:', key);
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

// --- フェッチ時: キャッシュ優先、無ければネットワークから取得 ---
self.addEventListener('fetch', (event) => {
  // API等を除外（基本は全てキャッシュ優先）
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) {
        // キャッシュにあれば即返す
        return response;
      }
      // 無ければ取得してキャッシュ
      return fetch(event.request)
        .then(networkResponse => {
          // キャッシュ可能なら追加
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        })
        .catch(() => {
          // オフライン時に want.html をフォールバック表示
          return caches.match('./want.html');
        });
    })
  );
});