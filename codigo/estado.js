let state;
let tab = 'list';
const ui = {
  online: { running: false, done: 0, total: 0, found: 0, failed: 0 },
  draft: null
};

const str = (v, n = 120) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
const num = (v, min = 0, max = 1e7) => (Number.isFinite(v) && v >= min && v <= max ? v : null);
const RECEIPT_SOURCES = ['manual', 'qr', 'cart', 'demo'];

function emptyState() {
  return {
    version: 2,
    profile: APP.people[0],
    onboarded: false,
    demo: false,
    list: [],
    receipts: [],
    markets: APP.defaultMarkets.map(name => ({ name, cnpj: '' })),
    market: APP.defaultMarkets[0],
    budget: 400,
    apiUrl: '',
    online: {},
    log: [],
    // Controle da sincronização (não vai para o servidor): código do casal, ids já vistos e itens apagados
    sync: { code: '', ids: [], deleted: {}, metaSig: '', metaAt: 0, lastOk: 0 }
  };
}

const SYNC_CODE = /^[A-Za-z0-9_-]{20,64}$/;

function sanitizeSync(raw) {
  const o = raw && typeof raw === 'object' ? raw : {};
  const deleted = {};
  Object.keys(o.deleted && typeof o.deleted === 'object' ? o.deleted : {}).slice(0, 5000).forEach(id => {
    const t = num(o.deleted[id], 0, 4e12);
    if (t) deleted[str(id, 30)] = t;
  });
  return {
    code: SYNC_CODE.test(o.code) ? o.code : '',
    ids: (Array.isArray(o.ids) ? o.ids : []).slice(0, 10000).map(i => str(i, 30)).filter(Boolean),
    deleted,
    metaSig: str(o.metaSig, 16),
    metaAt: num(o.metaAt, 0, 4e12) || 0,
    lastOk: num(o.lastOk, 0, 4e12) || 0
  };
}

// Valida qualquer dado vindo do localStorage ou de um backup importado
function sanitizeState(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const s = emptyState();
  const arr = v => (Array.isArray(v) ? v : []);
  const who = v => (APP.people.includes(v) ? v : s.profile);

  s.profile = who(raw.profile);
  s.onboarded = raw.onboarded === true;
  s.demo = raw.demo === true;
  s.budget = num(raw.budget) ?? s.budget;
  s.apiUrl = safeHttp(str(raw.apiUrl, 300));

  const seen = new Set();
  const markets = arr(raw.markets)
    .map(m => ({ name: str(m && m.name, 40), cnpj: str(m && m.cnpj, 30).replace(/\D/g, '').slice(0, 14) }))
    .filter(m => m.name && !seen.has(norm(m.name)) && seen.add(norm(m.name)));
  if (markets.length) s.markets = markets;
  s.market = s.markets.some(m => m.name === raw.market) ? raw.market : s.markets[0].name;

  s.list = arr(raw.list).map(i => ({
    id: str(i && i.id, 30) || uid(),
    name: str(i && i.name, 80),
    qty: Math.max(1, Math.min(999, Math.round(num(i && i.qty) || 1))),
    done: !!i && i.done === true,
    by: who(i && i.by),
    price: num(i && i.price),
    at: num(i && i.at, 0, 4e12) || 0,
    sg: str(i && i.sg, 16)
  })).filter(i => i.name);

  s.receipts = arr(raw.receipts).map(r => ({
    id: str(r && r.id, 30) || uid(),
    market: str(r && r.market, 40),
    date: num(r && r.date, 0, 4e12) || Date.now(),
    by: who(r && r.by),
    source: RECEIPT_SOURCES.includes(r && r.source) ? r.source : 'manual',
    url: safeHttp(r && r.url),
    chave: /^\d{44}$/.test(r && r.chave) ? r.chave : '',
    at: num(r && r.at, 0, 4e12) || 0,
    sg: str(r && r.sg, 16),
    items: arr(r && r.items).map(i => ({
      name: str(i && i.name, 80),
      qty: Math.max(1, Math.min(999, Math.round(num(i && i.qty) || 1))),
      price: num(i && i.price)
    })).filter(i => i.name)
  })).filter(r => r.market && r.items.length);

  s.log = arr(raw.log).map(l => ({ t: num(l && l.t, 0, 4e12) || Date.now(), who: who(l && l.who), msg: str(l && l.msg, 200) }))
    .filter(l => l.msg).slice(0, APP.maxLog);

  const online = raw.online && typeof raw.online === 'object' ? raw.online : {};
  Object.keys(online).slice(0, 300).forEach(k => {
    const slots = online[k] && typeof online[k] === 'object' ? online[k] : {};
    s.online[k] = {};
    Object.keys(slots).slice(0, 20).forEach(id => {
      const o = slots[id];
      const price = num(o && o.price);
      if (price > 0) s.online[k][id] = { market: str(o.market, 60), price, product: str(o.product, 120), url: safeHttp(o.url), at: num(o.at, 0, 4e12) || 0 };
    });
  });
  s.sync = sanitizeSync(raw.sync);
  return s;
}

function load() {
  let raw = null;
  try { raw = localStorage.getItem(APP.storageKey); } catch (e) { /* storage bloqueado */ }
  if (raw) {
    try { state = sanitizeState(JSON.parse(raw)); } catch (e) { state = null; }
    if (!state) {
      // Guarda o conteúdo ilegível antes de ele ser sobrescrito
      try { localStorage.setItem(`${APP.storageKey}.corrupt`, raw); } catch (e) { /* ignora */ }
    }
  }
  if (!state) state = emptyState();
}

function persist() {
  try {
    localStorage.setItem(APP.storageKey, JSON.stringify(state));
  } catch (e) {
    toast('Não foi possível salvar. Verifique o espaço/permissões do navegador.');
  }
}

// Toda alteração local passa por aqui: grava no aparelho e agenda o envio ao parceiro
function save() {
  if (state.sync.code) trackChanges();
  persist();
  scheduleSync();
}

function log(msg) {
  state.log.unshift({ t: Date.now(), who: state.profile, msg });
  state.log = state.log.slice(0, APP.maxLog);
}

function exportBackup() {
  const { sync, ...data } = state;
  const file = { app: 'casalcompras', version: 2, exportedAt: new Date().toISOString(), data };
  download(`casalcompras-backup-${todayISO()}.json`, JSON.stringify(file, null, 2));
}

function importBackup(text) {
  let parsed;
  try { parsed = JSON.parse(text); } catch (e) { return false; }
  const src = parsed && parsed.data ? parsed.data : parsed;
  // Evita apagar tudo ao importar um JSON qualquer que não seja um backup
  if (!src || (!Array.isArray(src.list) && !Array.isArray(src.receipts))) return false;
  const next = sanitizeState(src);
  if (!next) return false;
  next.onboarded = true;
  next.apiUrl = state.apiUrl;
  next.sync = state.sync; // o backup não troca o pareamento deste aparelho
  state = next;
  ui.draft = null;
  return true;
}
