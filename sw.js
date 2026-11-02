// Aumente a versão sempre que publicar mudanças, para limpar o cache antigo.
const CACHE = 'casalcompras-2.4.0';

const APP_SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'estilos/estilos.css',
  'icones/icon-192.png', 'icones/icon-512.png',
  'codigo/tema.js', 'codigo/configuracao-tailwind.js', 'codigo/configuracoes.js', 'codigo/utilitarios.js', 'codigo/dados.js', 'codigo/estado.js', 'codigo/receitas.js',
  'codigo/inteligencia.js', 'codigo/servicos/precos.js', 'codigo/servicos/codigo-qr.js', 'codigo/servicos/nota-fiscal.js', 'codigo/servicos/sincronizacao.js', 'codigo/servicos/compartilhamento.js', 'codigo/servicos/pwa.js',
  'codigo/telas/componentes.js', 'codigo/telas/lista.js', 'codigo/telas/historico-inteligente.js', 'codigo/telas/receitas.js', 'codigo/telas/comparar.js', 'codigo/telas/compras.js',
  'codigo/telas/mercado.js', 'codigo/telas/primeiros-passos.js', 'codigo/telas/ajustes.js', 'codigo/aplicativo.js'
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
