// 오프라인 지원용 서비스워커 (네트워크 우선 → 실패 시 캐시). 파일 수정 시 즉시 반영됩니다.
const CACHE = 'luckyslot-v8';
self.addEventListener('install', (e) => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then((r) => { const c = r.clone(); caches.open(CACHE).then((ca) => ca.put(e.request, c)); return r; })
    .catch(() => caches.match(e.request)));
});
