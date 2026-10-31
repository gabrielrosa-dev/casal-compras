function vSmart() {
  if (!state.receipts.length) {
    return card(`${h2('bot', 'Lista Inteligente')}
      <p class="text-sm text-mute mb-4">O app aprende com as suas compras: depois de registrar notas na aba <b>Nota</b> (ou finalizar uma compra no <b>Mercado</b>), ele sugere o que está acabando e destaca os itens mais comprados.</p>
      ${gradBtn('data-tab="receipts"', 'receipt', 'Registrar a primeira compra', 'w-full')}`);
  }

  const sug = suggestions();
  const top = Object.values(history()).sort((a, b) => b.count - a.count || b.freq - a.freq).slice(0, 12);
  const pending = sug.filter(s => !inList(s.name));

  const sugRows = sug.slice(0, 15).map(s => `<li class="flex items-center gap-3 py-2.5 border-b border-line last:border-0">
      <div class="min-w-0 flex-1"><p class="font-semibold truncate">${esc(s.name)}</p><p class="text-xs text-mute">${esc(s.reason)} · últ. compra há ${Math.round(s.daysSince)}d</p></div>
      ${inList(s.name)
        ? '<span class="text-xs font-bold text-brand-ink bg-brand-soft rounded-full px-3 py-1">Na lista</span>'
        : `<button data-act="quick" data-name="${esc(s.name)}" data-qty="${s.avgQty}" class="tap bg-brand text-white text-sm font-bold rounded-full px-3 py-1.5">+ ${s.avgQty}</button>`}</li>`).join('');

  const quick = top.map(e => {
    const on = inList(e.name);
    return `<button ${on ? 'disabled' : ''} data-act="quick" data-name="${esc(e.name)}" data-qty="${e.avgQty}" class="tap text-left rounded-xl p-3 border ${on ? 'bg-brand-soft border-brand-line opacity-70' : 'bg-surface border-line active:bg-brand-soft'}">
        <p class="font-semibold text-sm leading-tight">${esc(e.name)}</p>
        <p class="text-xs text-mute mt-1 flex items-center justify-between">${e.count}× comprado <i data-lucide="${on ? 'check' : 'plus-circle'}" class="w-5 h-5 ${on ? 'text-brand' : 'text-accent'}"></i></p></button>`;
  }).join('');

  const n = state.receipts.length;
  return `
  ${card(`${h2('bot', 'Lista Inteligente', `Analisa ${n} ${n === 1 ? 'compra anterior' : 'compras anteriores'} e sugere o que provavelmente está acabando.`)}
    ${gradBtn('data-act="generate"', 'sparkles', 'Gerar Lista Inteligente', 'w-full text-lg py-4 shadow-lg shadow-purple-500/30')}
    <p class="text-xs text-mute text-center mt-2">${pending.length ? `${pending.length} itens recomendados ainda fora da lista` : 'Todos os itens recomendados já estão na lista'}</p>
    ${n < 2 ? '<p class="text-xs text-mute text-center mt-1">Com 2 ou mais compras o app passa a prever quando cada item acaba.</p>' : ''}`)}
  ${card(`${h2('lightbulb', 'Recomendados', 'Pela frequência e ciclo de consumo')}
    ${sug.length ? `<ul>${sugRows}</ul>` : '<p class="text-sm text-mute">Nada precisa ser reposto por enquanto.</p>'}`)}
  ${card(`${h2('zap', 'Reposição Rápida', 'Os mais comprados — 1 toque para adicionar')}
    <div class="grid grid-cols-2 gap-2">${quick}</div>`)}`;
}
