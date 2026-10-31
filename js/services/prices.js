const apiBase = () => (state.apiUrl || PRICE_API.url || '').trim().replace(/\/+$/, '');
const onlineMarket = label => `${label} (online)`;

// "Leite 1,5 L" -> ["leite", "1.5l"]; unifica unidades para comparar com o nome do site
function normTokens(s) {
  return norm(s)
    .replace(/(\d),(\d)/g, '$1.$2')
    .replace(/(\d+(?:\.\d+)?)\s*(unidades?|unid|und|un)\b/g, '$1un')
    .replace(/(\d+(?:\.\d+)?)\s*(litros?|lts?|l)\b/g, '$1l')
    .replace(/(\d+(?:\.\d+)?)\s*(quilos?|kgs?|kg)\b/g, '$1kg')
    .replace(/(\d+(?:\.\d+)?)\s*(gramas?|gr|g)\b/g, '$1g')
    .replace(/(\d+(?:\.\d+)?)\s*(mls?)\b/g, '$1ml')
    .split(/[^a-z0-9.]+/).filter(Boolean);
}

// Escolhe o produto mais barato entre os que realmente correspondem ao item
function pickMatch(itemName, results) {
  const q = normTokens(itemName);
  if (!q.length) return null;
  const nums = q.filter(t => /\d/.test(t));
  const cands = [];
  for (const r of results) {
    if (!(r.price > 0)) continue;
    const toks = new Set(normTokens(r.name));
    if (!nums.every(t => toks.has(t))) continue;
    const hit = q.filter(t => toks.has(t)).length;
    if (hit / q.length < 0.75) continue;
    cands.push({ r, extra: toks.size - hit });
  }
  if (!cands.length) return null;
  const minExtra = Math.min(...cands.map(c => c.extra));
  return cands.filter(c => c.extra <= minExtra + 2).map(c => c.r).sort((a, b) => a.price - b.price)[0];
}

async function searchOne(base, store, itemName) {
  const res = await fetch(`${base}/search?store=${encodeURIComponent(store.id)}&q=${encodeURIComponent(itemName)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return Array.isArray(data.results) ? data.results : [];
}

async function runOnlineSearch() {
  if (ui.online.running) return;
  const base = apiBase();
  if (!base) { toast('Configure a URL do proxy em Ajustes'); return; }
  if (!state.list.length) { toast('A lista está vazia'); return; }

  const jobs = [];
  state.list.forEach(item => PRICE_API.stores.forEach(store => jobs.push({ item, store })));
  ui.online = { running: true, done: 0, total: jobs.length, found: 0, failed: 0 };

  // Descarta resultados de itens que já saíram da lista
  const keep = new Set(state.list.map(i => norm(i.name)));
  Object.keys(state.online).forEach(k => { if (!keep.has(k)) delete state.online[k]; });
  render();

  let next = 0;
  const worker = async () => {
    while (next < jobs.length) {
      const { item, store } = jobs[next++];
      try {
        const match = pickMatch(item.name, await searchOne(base, store, item.name));
        const key = norm(item.name);
        const slot = state.online[key] = state.online[key] || {};
        if (match) {
          slot[store.id] = { market: onlineMarket(store.label), price: match.price, product: String(match.name).slice(0, 120), url: safeHttp(match.url), at: Date.now() };
          ui.online.found++;
        } else {
          delete slot[store.id];
        }
      } catch (e) {
        ui.online.failed++;
      }
      ui.online.done++;
      if (tab === 'compare' && ui.online.done % 3 === 0) render();
    }
  };
  await Promise.all(Array.from({ length: Math.min(PRICE_API.concurrency, jobs.length) }, worker));

  ui.online.running = false;
  ui.online.at = Date.now();
  save();
  if (ui.online.failed === jobs.length) toast('Não foi possível acessar o proxy');
  else toast(`${ui.online.found} preços encontrados online`);
  render();
}
