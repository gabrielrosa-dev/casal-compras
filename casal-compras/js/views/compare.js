function onlineCard() {
  const o = ui.online;
  const stores = PRICE_API.stores.map(s => esc(s.label)).join(', ');
  const pct = o.total ? Math.round(o.done / o.total * 100) : 0;
  const status = o.running
    ? `<div class="h-2 bg-line rounded-full overflow-hidden mt-3"><div class="h-full bg-gradient-to-r from-violet-500 to-pink-500" style="width:${pct}%"></div></div>
       <p class="text-xs text-mute mt-1">Buscando… ${o.done}/${o.total}</p>`
    : o.at
      ? `<p class="text-xs text-mute mt-3">Última busca: ${new Date(o.at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} · ${o.found} preços encontrados${o.failed ? ` · ${o.failed} falhas` : ''}</p>`
      : '';
  const action = apiBase()
    ? gradBtn(`data-act="fetchOnline" ${o.running ? 'disabled' : ''}`, 'search', o.running ? 'Buscando…' : 'Buscar preços online da lista', 'w-full')
    : outlineBtn('data-tab="settings"', 'settings', 'Configurar busca online em Ajustes', 'w-full');
  return card(`${h2('globe', 'Busca online na região', `Lojas com preço online: ${stores}`)}
    ${action}${status}
    <p class="text-xs text-faint mt-2">Preços do catálogo online (válidos por ${APP.onlineTtlDays} dias); podem diferir da loja física.</p>`);
}

function vCompare() {
  const pt = priceTable();
  const items = state.list;

  const names = new Set();
  items.forEach(i => { const e = pt[norm(i.name)]; if (e) Object.keys(e.markets).forEach(m => names.add(m)); });
  const totals = [...names].map(m => {
    let total = 0, found = 0;
    items.forEach(i => {
      const e = pt[norm(i.name)];
      if (e && e.markets[m]) { total += e.markets[m].price * i.qty; found++; }
    });
    return { m, total, found, missing: items.length - found };
  });
  const cheapest = totals.length ? [...totals].sort((a, b) => (a.missing - b.missing) || (a.total - b.total))[0] : null;
  const mixed = items.reduce((s, i) => { const b = bestPrice(i.name, pt); return s + (b ? b.price * i.qty : 0); }, 0);
  const maxT = Math.max(1, ...totals.map(t => t.total));

  const marketCards = totals.map(t => {
    const best = cheapest && cheapest.m === t.m;
    return `<div class="rounded-xl border ${best ? 'border-brand bg-brand-soft' : 'border-line'} p-3">
        <div class="flex items-center justify-between gap-2"><p class="font-bold flex items-center gap-1.5 min-w-0"><i data-lucide="store" class="w-4 h-4 shrink-0"></i><span class="truncate">${esc(t.m)}</span> ${best ? '<span class="text-[10px] bg-accent text-white rounded-full px-2 py-0.5 shrink-0">MAIS BARATO</span>' : ''}</p>
          <p class="font-extrabold text-lg">${brl(t.total)}</p></div>
        <div class="h-2 bg-line rounded-full mt-2 overflow-hidden"><div class="h-full bg-gradient-to-r from-violet-500 to-pink-500" style="width:${t.total / maxT * 100}%"></div></div>
        <p class="text-xs text-mute mt-1">${t.found}/${items.length} itens com preço${t.missing ? ` · ${t.missing} sem preço neste mercado` : ''}</p>
      </div>`;
  }).join('');

  const itemRows = items.map(i => {
    const e = pt[norm(i.name)];
    const best = bestPrice(i.name, pt);
    return `<li class="py-2.5 border-b border-line last:border-0">
        <div class="flex justify-between gap-2"><p class="font-semibold truncate">${esc(i.name)} <span class="text-faint text-xs">×${i.qty}</span></p>
        ${best ? `<p class="text-sm font-bold text-brand whitespace-nowrap">${brl(best.price)} · ${esc(best.market)}</p>` : '<p class="text-xs text-faint">sem preço</p>'}</div>
        ${e ? `<div class="flex flex-wrap gap-1.5 mt-1">${Object.entries(e.markets).map(([m, v]) => {
          const cls = `text-[11px] rounded-full px-2 py-0.5 ${best && best.market === m ? 'bg-brand-soft text-brand-ink font-bold' : 'bg-soft text-mute'}`;
          const label = `${esc(m)} ${brl(v.price)}`;
          return v.url ? `<a href="${esc(v.url)}" target="_blank" rel="noopener noreferrer" class="${cls} underline">${label}</a>` : `<span class="${cls}">${label}</span>`;
        }).join('')}</div>` : ''}</li>`;
  }).join('');

  let summary;
  if (!items.length) summary = '<p class="text-sm text-mute">Adicione itens à lista para comparar.</p>';
  else if (!totals.length) summary = `<p class="text-sm text-mute">Ainda não há preços para os itens da lista. Registre uma compra na aba <b>Nota</b> ou busque online.</p>`;
  else summary = `<div class="space-y-3">${marketCards}</div>
    <div class="mt-3 rounded-xl bg-gradient-to-r from-violet-600 to-pink-500 text-white p-3 flex items-center justify-between gap-2">
      <span class="text-sm font-semibold flex items-center gap-2"><i data-lucide="piggy-bank" class="w-5 h-5 shrink-0"></i>Comprando cada item no mais barato</span><span class="font-extrabold">${brl(mixed)}</span></div>
    <p class="text-xs text-mute mt-2">Economia de ${brl(Math.max(0, cheapest.total - mixed))} dividindo a compra entre mercados vs. só ${esc(cheapest.m)} (considera apenas itens com preço).</p>`;

  return `
  ${onlineCard()}
  ${card(`${h2('bar-chart-3', 'Comparador de Preços', 'Cruza sua lista com os preços das suas notas')}${summary}`)}
  ${items.length && totals.length ? card(`${h2('list-checks', 'Melhor preço por item')}<ul>${itemRows}</ul>`) : ''}`;
}
