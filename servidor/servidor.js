// Backend único e gratuito do CasalCompras (Cloudflare Worker):
//   GET  /search  - preços online (VTEX)
//   GET  /nfce    - itens e preços de uma NFC-e a partir do QR Code
//   GET/PUT /sync/<código> - sincronização entre os aparelhos do casal (KV)
// O acesso fica limitado às origens definidas em ALLOWED_ORIGINS.

import { isAllowedNfceUrl, parseNfceHtml } from './nota-fiscal.js';

const STORES = {
  muffato: { label: 'Super Muffato', base: 'https://www.supermuffato.com.br' }
  // Para incluir uma loja VTEX, cadastre-a aqui e em codigo/configuracoes.js.
};
const CATALOG_STORE = STORES.muffato; // usada para descobrir o nome completo pelo código de barras (EAN)

const MAX_QUERY = 80;
const CACHE_SECONDS = 3600;
const MAX_SYNC_BYTES = 1.5 * 1024 * 1024;
const MAX_NFCE_BYTES = 2 * 1024 * 1024;
const SYNC_CODE = /^[A-Za-z0-9_-]{20,64}$/;

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin'
  };
}

function json(body, status, cors) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...cors }
  });
}

function allowedOrigin(request, env) {
  const origin = request.headers.get('Origin');
  const list = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (list.includes('*')) return origin || '*';
  return origin && list.includes(origin) ? origin : null;
}

/* ---------- Preços pela internet ---------- */

function normalize(products) {
  const out = [];
  for (const p of products) {
    const item = (p.items || [])[0];
    const sellers = (item && item.sellers) || [];
    const seller = sellers.find(s => s.commertialOffer && s.commertialOffer.AvailableQuantity > 0 && s.commertialOffer.Price > 0);
    if (!seller) continue;
    const offer = seller.commertialOffer;
    out.push({
      name: String(p.productName || ''),
      brand: String(p.brand || ''),
      ean: String((item && item.ean) || ''),
      price: offer.Price,
      listPrice: offer.ListPrice || offer.Price,
      url: String(p.link || ''),
      image: String(((item && item.images) || [])[0] ? item.images[0].imageUrl : '')
    });
  }
  return out;
}

async function vtex(store, query) {
  const res = await fetch(`${store.base}/api/catalog_system/pub/products/search?${query}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (CasalCompras)', 'Accept': 'application/json' },
    signal: AbortSignal.timeout(8000)
  });
  // A VTEX usa 206 para indicar resultados parciais em buscas paginadas.
  if (!res.ok && res.status !== 206) throw new Error(`upstream ${res.status}`);
  return res.json();
}

const searchStore = async (store, q) => normalize(await vtex(store, `ft=${encodeURIComponent(q)}&_from=0&_to=11`));

async function handleSearch(url, ctx, cors) {
  const storeId = url.searchParams.get('store') || '';
  const q = (url.searchParams.get('q') || '').trim().slice(0, MAX_QUERY);
  const store = Object.prototype.hasOwnProperty.call(STORES, storeId) ? STORES[storeId] : null;
  if (!store) return json({ error: 'Loja inválida' }, 400, cors);
  if (q.length < 2) return json({ error: 'Busca muito curta' }, 400, cors);

  // O cache guarda só o conteúdo; o CORS é incluído em cada resposta.
  const cache = typeof caches !== 'undefined' ? caches.default : null;
  const cacheKey = new Request(`https://cache.local/${storeId}/${encodeURIComponent(q.toLowerCase())}`);
  const hit = cache ? await cache.match(cacheKey) : null;
  if (hit) return json(await hit.json(), 200, cors);

  try {
    const results = await searchStore(store, q);
    const body = { store: storeId, label: store.label, query: q, results };
    if (cache) {
      ctx.waitUntil(cache.put(cacheKey, new Response(JSON.stringify(body), {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': `max-age=${CACHE_SECONDS}` }
      })));
    }
    return json(body, 200, cors);
  } catch (e) {
    return json({ error: 'Falha ao consultar a loja' }, 502, cors);
  }
}

/* ---------- Nota fiscal de consumidor ---------- */

async function fetchNfceHtml(target) {
  let current = target;
  for (let hop = 0; hop < 4; hop++) {
    if (!isAllowedNfceUrl(current)) throw new Error('blocked');
    const res = await fetch(current, {
      redirect: 'manual',
      headers: { 'User-Agent': 'Mozilla/5.0 (CasalCompras)', 'Accept': 'text/html' },
      signal: AbortSignal.timeout(10000)
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get('Location')) {
      current = new URL(res.headers.get('Location'), current).href;
      continue;
    }
    if (!res.ok) throw new Error(`upstream ${res.status}`);
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_NFCE_BYTES) throw new Error('too large');
    const header = (res.headers.get('Content-Type') || '').match(/charset=([\w-]+)/i);
    const head = new TextDecoder('latin1').decode(buf.slice(0, 2048));
    const meta = head.match(/charset=["']?([\w-]+)/i);
    const charset = (header || meta || [0, 'utf-8'])[1];
    try { return new TextDecoder(charset).decode(buf); } catch (e) { return new TextDecoder('utf-8').decode(buf); }
  }
  throw new Error('too many redirects');
}

// Busca o nome completo do produto pelo código de barras no catálogo da loja.
async function enrich(items) {
  const targets = items.filter(i => /^(\d{8}|\d{12,14})$/.test(i.code)).slice(0, 30);
  let next = 0;
  const run = async () => {
    while (next < targets.length) {
      const it = targets[next++];
      try {
        const found = await vtex(CATALOG_STORE, `fq=alternateIds_Ean:${encodeURIComponent(it.code)}`);
        if (Array.isArray(found) && found[0] && found[0].productName) it.catalogName = String(found[0].productName).slice(0, 120);
      } catch (e) { /* segue com o nome da nota */ }
    }
  };
  await Promise.all(Array.from({ length: Math.min(6, targets.length) }, run));
}

async function handleNfce(url, cors) {
  const target = url.searchParams.get('url') || '';
  if (!isAllowedNfceUrl(target)) return json({ error: 'Endereço de nota inválido' }, 400, cors);
  let html;
  try { html = await fetchNfceHtml(target); } catch (e) { return json({ error: 'Não foi possível abrir a nota' }, 502, cors); }
  const nota = parseNfceHtml(html);
  if (!nota.items.length) return json({ error: 'Não consegui ler os itens desta nota' }, 422, cors);
  await enrich(nota.items);
  return json(nota, 200, cors);
}

/* ---------- Sincronização ---------- */

async function keyFor(code) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code));
  return 'sync:' + [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function handleSync(request, env, code, cors) {
  if (!env.SYNC) return json({ error: 'Sincronização não configurada no servidor' }, 501, cors);
  if (!SYNC_CODE.test(code)) return json({ error: 'Código inválido' }, 400, cors);
  const key = await keyFor(code);

  if (request.method === 'GET') {
    const stored = await env.SYNC.get(key);
    return json({ data: stored ? JSON.parse(stored) : null }, 200, cors);
  }

  const body = await request.text();
  if (body.length > MAX_SYNC_BYTES) return json({ error: 'Dados grandes demais' }, 413, cors);
  let data;
  try { data = JSON.parse(body); } catch (e) { return json({ error: 'JSON inválido' }, 400, cors); }
  if (!data || !Array.isArray(data.list) || !Array.isArray(data.receipts)) return json({ error: 'Formato inválido' }, 400, cors);
  await env.SYNC.put(key, JSON.stringify(data));
  return json({ ok: true }, 200, cors);
}

/* ---------- Recepção das requisições ---------- */

export default {
  async fetch(request, env, ctx) {
    const origin = allowedOrigin(request, env);
    if (!origin) return new Response('Origem não permitida', { status: 403 });
    const cors = corsHeaders(origin);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    const url = new URL(request.url);
    const sync = url.pathname.match(/^\/sync\/([^/]+)$/);
    try {
      if (sync && (request.method === 'GET' || request.method === 'PUT')) return await handleSync(request, env, sync[1], cors);
      if (request.method !== 'GET') return json({ error: 'Método não permitido' }, 405, cors);
      if (url.pathname === '/stores') return json(Object.entries(STORES).map(([id, s]) => ({ id, label: s.label })), 200, cors);
      if (url.pathname === '/search') return await handleSearch(url, ctx, cors);
      if (url.pathname === '/nfce') return await handleNfce(url, cors);
    } catch (e) {
      return json({ error: 'Erro interno' }, 500, cors);
    }
    return json({ error: 'Rota não encontrada' }, 404, cors);
  }
};
