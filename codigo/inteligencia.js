const receiptTotal = r => r.items.reduce((s, i) => s + (i.price || 0) * i.qty, 0);
const inList = name => state.list.some(i => norm(i.name) === norm(name));
const marketNames = () => state.markets.map(m => m.name);

// Último preço conhecido de cada produto em cada mercado (nota mais recente vence).
// Preços online entram como mais um "mercado" e expiram após onlineTtlDays.
function priceTable() {
  const t = {};
  [...state.receipts].sort((a, b) => a.date - b.date).forEach(r => r.items.forEach(i => {
    if (!(i.price > 0)) return;
    const k = norm(i.name);
    (t[k] = t[k] || { name: i.name, markets: {} }).markets[r.market] = { price: i.price, date: r.date };
  }));
  const listed = new Set(state.list.map(i => norm(i.name)));
  const minAt = Date.now() - APP.onlineTtlDays * dayMs;
  Object.entries(state.online).forEach(([k, stores]) => {
    if (!listed.has(k) && !t[k]) return;
    Object.values(stores).forEach(o => {
      if (o.at < minAt) return;
      (t[k] = t[k] || { name: o.product, markets: {} }).markets[o.market] = { price: o.price, date: o.at, url: o.url };
    });
  });
  return t;
}

function bestPrice(name, pt = priceTable()) {
  const e = pt[norm(name)];
  if (!e) return null;
  let best = null;
  for (const [m, v] of Object.entries(e.markets)) {
    if (!best || v.price < best.price) best = { market: m, price: v.price };
  }
  return best;
}

// Estatísticas de consumo por produto a partir das compras registradas
function history() {
  const rs = [...state.receipts].sort((a, b) => a.date - b.date);
  const h = {};
  rs.forEach(r => r.items.forEach(i => {
    const k = norm(i.name);
    const e = h[k] = h[k] || { name: i.name, count: 0, totalQty: 0, dates: [] };
    e.count++; e.totalQty += i.qty; e.dates.push(r.date);
  }));
  Object.values(h).forEach(e => {
    e.avgQty = Math.max(1, Math.round(e.totalQty / e.count));
    e.last = e.dates[e.dates.length - 1];
    e.interval = e.dates.length > 1 ? (e.last - e.dates[0]) / (e.dates.length - 1) / dayMs : null;
    e.daysSince = (Date.now() - e.last) / dayMs;
    e.freq = e.count / Math.max(1, rs.length);
    e.score = e.interval ? e.daysSince / e.interval : 0;
  });
  return h;
}

function suggestions() {
  const few = state.receipts.length < 2;
  return Object.values(history()).map(e => {
    let reason = null;
    if (few) reason = 'Da sua última compra';
    else if (e.interval && e.score >= .75) {
      reason = e.score >= 1
        ? `Acabando · compra a cada ~${Math.round(e.interval)} dias`
        : `Compra a cada ~${Math.round(e.interval)} dias`;
    } else if (e.freq >= .7) {
      reason = `Presente em ${Math.round(e.freq * 100)}% das compras`;
    }
    return reason ? { ...e, reason } : null;
  }).filter(Boolean).sort((a, b) => (b.score + b.freq) - (a.score + a.freq));
}

// Nomes conhecidos para autocompletar: histórico primeiro, depois o catálogo base
function knownNames() {
  const seen = new Set();
  const out = [];
  const push = n => { const k = norm(n); if (!seen.has(k)) { seen.add(k); out.push(n); } };
  Object.values(history()).sort((a, b) => b.count - a.count).forEach(e => push(e.name));
  CATALOG.forEach(c => push(c[0]));
  return out;
}

function addItem(name, qty = 1, silent) {
  name = name.trim().slice(0, 80);
  if (!name) return false;
  if (inList(name)) {
    if (!silent) toast('Já está na lista');
    return false;
  }
  state.list.push({ id: uid(), name, qty, done: false, by: state.profile, price: null });
  log(`Adicionou "${name}"`);
  return true;
}

// Preço mostrado no Modo Supermercado:
// manual > último preço neste mercado > menor preço conhecido (estimativa)
function priceInfo(i, pt) {
  if (i.price != null) return { price: i.price, kind: 'manual' };
  const own = (pt[norm(i.name)] || { markets: {} }).markets[state.market];
  if (own) return { price: own.price, kind: 'market' };
  const b = bestPrice(i.name, pt);
  return b ? { price: b.price, kind: 'estimate' } : { price: 0, kind: 'none' };
}
const marketPrice = (i, pt) => priceInfo(i, pt).price;

function newDraft() {
  return { market: state.market, date: todayISO(), items: [{ name: '', qty: '1', price: '' }], url: '', cnpj: '', chave: '' };
}

// Valida o rascunho e grava a compra. Devolve mensagem de erro ou null
function saveDraft() {
  const d = ui.draft;
  if (!d) return 'Nada para salvar';
  if (!state.markets.some(m => m.name === d.market)) return 'Escolha o mercado';
  const ts = isoToTs(d.date);
  if (d.chave && state.receipts.some(r => r.chave === d.chave)) return 'Essa nota já foi registrada';
  if (!Number.isFinite(ts) || ts > Date.now() + dayMs) return 'Data inválida';

  const items = [];
  for (const row of d.items) {
    const name = row.name.trim();
    if (!name && !row.price.trim()) continue;
    if (!name) return 'Há um preço sem nome de produto';
    const price = parseMoney(row.price);
    if (!(price > 0)) return `Informe o preço de "${name}"`;
    items.push({ name: name.slice(0, 80), qty: Math.max(1, Math.min(999, parseInt(row.qty, 10) || 1)), price });
  }
  if (!items.length) return 'Adicione ao menos um item com preço';

  state.receipts.push({ id: uid(), market: d.market, date: ts, items, by: state.profile, source: d.url ? 'qr' : 'manual', url: safeHttp(d.url), chave: d.chave || '' });
  const m = state.markets.find(x => x.name === d.market);
  if (m && !m.cnpj && d.cnpj) m.cnpj = d.cnpj;
  log(`Registrou compra no ${d.market} (${items.length} itens)`);
  ui.draft = null;
  return null;
}

// Transforma o carrinho (itens marcados) em compra no histórico.
// Só grava preços confirmados: estimativas de outros mercados ficam sem preço.
function finishShopping() {
  const done = state.list.filter(i => i.done);
  if (!done.length) { toast('Marque os itens do carrinho primeiro'); return false; }
  const pt = priceTable();
  const items = done.map(i => {
    const p = priceInfo(i, pt);
    return { name: i.name, qty: i.qty, price: p.kind === 'manual' || p.kind === 'market' ? p.price : null };
  });
  const total = done.reduce((s, i) => s + marketPrice(i, pt) * i.qty, 0);
  const unconfirmed = items.filter(i => i.price == null).length;
  const msg = `Finalizar compra no ${state.market}?\n${done.length} itens · ${brl(total)}` +
    (unconfirmed ? `\n\n${unconfirmed} item(ns) sem preço confirmado serão salvos sem preço (toque no lápis para informar).` : '');
  if (!confirm(msg)) return false;

  state.receipts.push({ id: uid(), market: state.market, date: Date.now(), items, by: state.profile, source: 'cart', url: '' });
  state.list = state.list.filter(i => !i.done);
  log(`Finalizou compra no ${state.market} (${done.length} itens, ${brl(total)})`);
  toast('Compra salva no histórico');
}

function shareText() {
  const pending = state.list.filter(i => !i.done);
  const done = state.list.filter(i => i.done);
  const line = (i, mark) => `${mark} ${i.qty}× ${i.name}`;
  return ['🛒 Lista de compras — CasalCompras', ...pending.map(i => line(i, '▫️')), ...done.map(i => line(i, '✅'))].join('\n');
}
