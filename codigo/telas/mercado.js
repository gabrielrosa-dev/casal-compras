const PRICE_KIND_HINT = {
  market: '',
  manual: ' · confirmado',
  estimate: ' · estimado',
  none: ''
};

function vMarket() {
  const pt = priceTable();
  const infos = new Map(state.list.map(i => [i.id, priceInfo(i, pt)]));
  const doneItems = state.list.filter(i => i.done);
  const total = doneItems.reduce((s, i) => s + infos.get(i.id).price * i.qty, 0);
  const all = state.list.reduce((s, i) => s + infos.get(i.id).price * i.qty, 0);
  const pct = state.budget > 0 ? total / state.budget * 100 : 0;
  const over = total > state.budget;
  const sorted = [...state.list].sort((a, b) => a.done - b.done);

  const rows = sorted.map(i => {
    const p = infos.get(i.id);
    const est = p.kind === 'estimate';
    return `<li class="flex items-stretch gap-2">
      <button data-act="toggle" data-id="${i.id}" class="tap flex-1 min-w-0 flex items-center gap-3 rounded-2xl p-4 text-left shadow-sm border ${i.done ? 'bg-brand-soft border-brand-line' : 'bg-surface border-line'}">
        <span class="w-9 h-9 rounded-full border-2 shrink-0 flex items-center justify-center ${i.done ? 'bg-brand border-brand text-white' : 'border-brand-line'}">${i.done ? '<i data-lucide="check" class="w-5 h-5"></i>' : ''}</span>
        <span class="min-w-0 flex-1"><span class="block text-lg font-bold leading-tight ${i.done ? 'line-through text-faint' : ''}">${esc(i.name)}</span>
        <span class="block text-sm text-mute">${i.qty} × ${p.price ? `${est ? '≈ ' : ''}${brl(p.price)}` : 'sem preço'}${PRICE_KIND_HINT[p.kind]}</span></span>
        <span class="font-extrabold ${i.done ? 'text-brand' : ''}">${est ? '≈ ' : ''}${brl(p.price * i.qty)}</span>
      </button>
      <button data-act="editPrice" data-id="${i.id}" aria-label="Informar preço de ${esc(i.name)}" class="tap w-14 rounded-2xl bg-surface border ${est || p.kind === 'none' ? 'border-brand-line text-brand' : 'border-line text-faint'} shadow-sm flex items-center justify-center"><i data-lucide="pencil" class="w-5 h-5"></i></button>
    </li>`;
  }).join('');

  return `
  <div class="sticky top-[68px] z-20 -mx-4 px-4 pt-1 pb-3 bg-page/90 backdrop-blur">
    <div class="rounded-2xl p-4 text-white shadow-lg ${over ? 'bg-red-600' : 'bg-gradient-to-br from-violet-600 to-pink-500'}">
      <div class="flex justify-between items-end">
        <div><p class="text-xs opacity-80">No carrinho (${doneItems.length}/${state.list.length})</p><p class="text-4xl font-extrabold tracking-tight">${brl(total)}</p></div>
        <div class="text-right"><p class="text-xs opacity-80">Orçamento</p>
          <input id="budget" aria-label="Orçamento" type="number" min="0" inputmode="decimal" value="${state.budget}" class="w-24 text-right bg-white/20 rounded-lg px-2 py-1 font-bold text-white focus:outline-none"></div>
      </div>
      <div class="h-3 bg-black/20 rounded-full mt-3 overflow-hidden"><div class="h-full bg-white" style="width:${Math.min(100, pct)}%"></div></div>
      <p class="text-xs mt-1.5 opacity-90">${over ? `Estourou em ${brl(total - state.budget)}!` : `Restam ${brl(state.budget - total)}`} · lista completa ≈ ${brl(all)}</p>
    </div>
    <div class="flex items-center gap-2 mt-2"><i data-lucide="store" class="w-4 h-4 text-mute"></i>
      <select id="marketSel" aria-label="Mercado atual" class="flex-1 rounded-xl border border-line bg-surface px-3 py-2 text-sm">${marketOptions(state.market)}</select></div>
  </div>
  ${state.list.length ? `<ul class="space-y-2.5">${rows}</ul>` : card('<p class="text-center text-mute py-6">Sua lista está vazia.</p>')}
  ${doneItems.length ? `<div class="mt-4">${gradBtn('data-act="finishShopping"', 'flag', `Finalizar compra · ${brl(total)}`, 'w-full text-lg py-4 shadow-lg shadow-purple-500/30')}
    <p class="text-xs text-mute text-center mt-2">Salva os itens marcados no histórico com os preços confirmados.</p></div>` : ''}`;
}
