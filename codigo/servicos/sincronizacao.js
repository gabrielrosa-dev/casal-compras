/* Sincronização automática entre os aparelhos do casal.
 *
 * Cada aparelho guarda tudo localmente (funciona offline) e, quando há internet, troca dados com o
 * proxy (Cloudflare Worker + KV) usando um código secreto compartilhado. O servidor só guarda o
 * último estado; a mesclagem é feita aqui, registro por registro:
 *   - cada item/compra tem `at` (última alteração) e vence a versão mais recente;
 *   - exclusões viram "lápides" (state.sync.deleted) para não ressuscitarem no outro aparelho.
 * A mesclagem é determinística e idempotente, então os aparelhos convergem para o mesmo estado.
 */

const SYNC_POLL_MS = 20000;
const SYNC_DEBOUNCE_MS = 1500;
const TOMBSTONE_TTL = 30 * dayMs;
const sync = { running: false, again: false, error: '', timer: null };

const hash = s => {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h.toString(36);
};
const itemSig = i => hash(JSON.stringify([i.name, i.qty, i.done, i.by, i.price]));
const receiptSig = r => hash(JSON.stringify([r.market, r.date, r.by, r.source, r.url, r.chave, r.items]));
const metaSig = () => hash(JSON.stringify([state.markets, state.budget]));

const syncEnabled = () => !!(state.sync.code && apiBase());

// Marca `at` nos registros alterados e cria lápides para os removidos
function trackChanges() {
  const s = state.sync;
  const now = Date.now();
  const stamp = (rec, sig) => { if (rec.sg !== sig) { rec.sg = sig; rec.at = now; } };
  state.list.forEach(i => stamp(i, itemSig(i)));
  state.receipts.forEach(r => stamp(r, receiptSig(r)));

  const ids = [...state.list, ...state.receipts].map(x => x.id);
  const present = new Set(ids);
  s.ids.forEach(id => { if (!present.has(id)) s.deleted[id] = now; });
  s.ids = ids;
  Object.keys(s.deleted).forEach(id => { if (now - s.deleted[id] > TOMBSTONE_TTL) delete s.deleted[id]; });

  const ms = metaSig();
  if (s.metaSig !== ms) { s.metaSig = ms; s.metaAt = now; }
}

// Formato canônico enviado ao servidor (sem campos locais como `sg`)
function toPayload(src) {
  const byId = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  return {
    list: src.list.map(i => ({ id: i.id, name: i.name, qty: i.qty, done: i.done, by: i.by, price: i.price, at: i.at })).sort(byId),
    receipts: src.receipts.map(r => ({ id: r.id, market: r.market, date: r.date, by: r.by, source: r.source, url: r.url, chave: r.chave || '', items: r.items, at: r.at })).sort(byId),
    meta: { markets: src.markets, budget: src.budget, at: src.metaAt },
    deleted: Object.fromEntries(Object.entries(src.deleted).sort())
  };
}

const localPayload = () => toPayload({ list: state.list, receipts: state.receipts, markets: state.markets, budget: state.budget, metaAt: state.sync.metaAt, deleted: state.sync.deleted });

// Valida o que veio do servidor com as mesmas regras do localStorage
function remotePayload(data) {
  const meta = data && data.meta && typeof data.meta === 'object' ? data.meta : {};
  const clean = sanitizeState({ onboarded: true, list: data.list, receipts: data.receipts, markets: meta.markets, budget: meta.budget });
  if (!clean) return null;
  return toPayload({ list: clean.list, receipts: clean.receipts, markets: clean.markets, budget: clean.budget, metaAt: num(meta.at, 0, 4e12) || 0, deleted: sanitizeSync({ deleted: data.deleted }).deleted });
}

// Desempate determinístico para que dois aparelhos escolham sempre o mesmo vencedor
const newer = (a, b) => (a.at !== b.at ? a.at > b.at : JSON.stringify(a) >= JSON.stringify(b));

function mergePayloads(a, b) {
  const deleted = { ...a.deleted };
  Object.entries(b.deleted).forEach(([id, t]) => { deleted[id] = Math.max(deleted[id] || 0, t); });

  const pick = (x, y) => {
    const m = new Map();
    [...x, ...y].forEach(r => { const c = m.get(r.id); if (!c || (r !== c && newer(r, c))) m.set(r.id, r); });
    return [...m.values()].filter(r => !(deleted[r.id] >= r.at));
  };

  // Mesmo produto adicionado nos dois aparelhos: fica o mais recente e o outro vira lápide
  const byName = new Map();
  pick(a.list, b.list).forEach(i => {
    const k = norm(i.name);
    const cur = byName.get(k);
    if (!cur) return byName.set(k, i);
    const [win, lose] = newer(i, cur) ? [i, cur] : [cur, i];
    byName.set(k, win);
    deleted[lose.id] = Math.max(deleted[lose.id] || 0, win.at);
  });

  const meta = newer(a.meta, b.meta) ? a.meta : b.meta;
  return toPayload({ list: [...byName.values()], receipts: pick(a.receipts, b.receipts), markets: meta.markets, budget: meta.budget, metaAt: meta.at, deleted });
}

function applyPayload(p) {
  state.list = p.list.map(i => ({ ...i, sg: itemSig(i) }));
  state.receipts = p.receipts.map(r => ({ ...r, sg: receiptSig(r) }));
  state.markets = p.meta.markets;
  state.budget = p.meta.budget;
  if (!state.markets.some(m => m.name === state.market)) state.market = state.markets[0].name;
  const s = state.sync;
  s.deleted = p.deleted;
  s.ids = [...state.list, ...state.receipts].map(x => x.id);
  s.metaSig = metaSig();
  s.metaAt = p.meta.at;
}

const syncUrl = () => `${apiBase()}/sync/${encodeURIComponent(state.sync.code)}`;

// Não redesenha a tela enquanto a pessoa digita, para não perder o que foi escrito
function renderIfIdle() {
  const el = document.activeElement;
  const typing = el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);
  if (!typing) render();
}

async function syncNow() {
  if (!syncEnabled()) return;
  if (sync.running) { sync.again = true; return; }
  sync.running = true;
  try {
    const res = await fetch(syncUrl());
    if (!res.ok) throw new Error(res.status === 501 ? 'O servidor ainda não tem o KV configurado' : `Servidor respondeu ${res.status}`);
    const { data } = await res.json();

    trackChanges();
    const local = localPayload();
    const remote = data ? remotePayload(data) : null;
    const merged = remote ? mergePayloads(local, remote) : local;
    const mergedKey = JSON.stringify(merged);

    const changed = mergedKey !== JSON.stringify(local);
    if (changed) applyPayload(merged);
    if (!remote || mergedKey !== JSON.stringify(remote)) {
      const put = await fetch(syncUrl(), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: mergedKey });
      if (!put.ok) throw new Error(`Falha ao enviar (${put.status})`);
    }
    state.sync.lastOk = Date.now();
    sync.error = '';
    persist();
    if (changed || tab === 'settings') renderIfIdle();
  } catch (e) {
    sync.error = e && e.message && !/fetch|network/i.test(e.message) ? e.message : 'Sem conexão com o servidor';
    if (tab === 'settings') renderIfIdle();
  } finally {
    sync.running = false;
    if (sync.again) { sync.again = false; scheduleSync(); }
  }
}

function scheduleSync(delay = SYNC_DEBOUNCE_MS) {
  if (!syncEnabled()) return;
  clearTimeout(sync.timer);
  sync.timer = setTimeout(syncNow, delay);
}

function newSyncCode() {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function joinSync(code, creator = false) {
  if (!SYNC_CODE.test(code)) return false;
  // Quem entra num grupo existente aceita as configurações dele (metaAt 0); quem cria define as suas
  state.sync = { ...sanitizeSync(), code, metaSig: metaSig(), metaAt: creator ? Date.now() : 0 };
  save();
  syncNow();
  return true;
}

function leaveSync() {
  state.sync = sanitizeSync();
  clearTimeout(sync.timer);
  sync.error = '';
  persist();
}

// Link que já configura o outro celular (código + endereço do servidor)
function inviteLink() {
  const base = location.href.split('#')[0];
  return `${base}#pair=${encodeURIComponent(state.sync.code)}&api=${encodeURIComponent(apiBase())}`;
}

// Abre o app a partir do convite: aplica o pareamento e limpa o endereço
function consumeInvite() {
  const m = String(location.hash || '').match(/^#pair=([^&]+)&api=(.+)$/);
  if (!m) return false;
  let code = '', api = '';
  try { code = decodeURIComponent(m[1]); api = safeHttp(decodeURIComponent(m[2])); } catch (e) { /* convite inválido */ }
  try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* ignora */ }
  if (!SYNC_CODE.test(code) || !api) { toast('Convite inválido'); return false; }
  if (!confirm('Conectar este aparelho à lista do casal? A lista e as compras de vocês serão unidas.')) return false;
  state.apiUrl = api.replace(/\/+$/, '');
  state.onboarded = true;
  return joinSync(code);
}

function startSync() {
  setInterval(() => { if (!document.hidden) syncNow(); }, SYNC_POLL_MS);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) syncNow(); });
  window.addEventListener('online', () => syncNow());
  syncNow();
}
