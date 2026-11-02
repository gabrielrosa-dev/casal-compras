// Aumente a versão sempre que publicar mudanças, para limpar o cache antigo.
const CACHE = 'casalcompras-2.3.0';

const APP_SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'css/styles.css',
  'icons/icon-192.png', 'icons/icon-512.png',
  'js/theme.js', 'js/tailwind-config.js', 'js/config.js', 'js/utils.js', 'js/data.js', 'js/state.js', 'js/recipes.js',
  'js/intelligence.js', 'js/services/prices.js', 'js/services/qr.js', 'js/services/nfce.js', 'js/services/sync.js', 'js/services/share.js', 'js/services/pwa.js',
  'js/views/shared.js', 'js/views/list.js', 'js/views/smart.js', 'js/views/recipes.js', 'js/views/compare.js', 'js/views/receipts.js',
  'js/views/market.js', 'js/views/onboarding.js', 'js/views/settings.js', 'js/app.js'
];

const CDN = [
  'https://cdn.tailwindcss.com/3.4.16',
  'https://unpkg.com/lucide@0.469.0/dist/umd/lucide.min.js'
];
const CDN_HOSTS = ['cdn.tailwindcss.com', 'unpkg.com', 'cdn.jsdelivr.net'];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // addAll falha por inteiro se um arquivo faltar; assim o app ainda instala e cacheia o que existir
    await Promise.allSettled(APP_SHELL.map(u => cache.add(u)));
    // CDNs são "opacos" (sem CORS); falha aqui não impede a instalação
    await Promise.allSettled(CDN.map(u => cache.add(new Request(u, { mode: 'no-cors' }))));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    // Rede primeiro: atualizações chegam assim que há internet; offline usa o cache
    event.respondWith((async () => {
      try {
        const res = await fetch(req);
        if (res.ok) (await caches.open(CACHE)).put(req, res.clone());
        return res;
      } catch (e) {
        return (await caches.match(req, { ignoreSearch: true })) || (await caches.match('index.html'));
      }
    })());
  } else if (CDN_HOSTS.includes(url.hostname)) {
    // Bibliotecas com versão fixa: cache primeiro
    event.respondWith((async () => {
      const hit = await caches.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      (await caches.open(CACHE)).put(req, res.clone());
      return res;
    })());
  }
  // Demais origens (ex.: proxy de preços) passam direto, sem cache
});
