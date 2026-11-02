function vList() {
  const pt = priceTable();
  const pending = state.list.filter(i => !i.done);
  const done = state.list.filter(i => i.done);
  const est = state.list.reduce((s, i) => { const b = bestPrice(i.name, pt); return s + (b ? b.price * i.qty : 0); }, 0);

  const row = i => {
    const b = bestPrice(i.name, pt);
    return `<li class="flex items-center gap-3 py-3 border-b border-line last:border-0">
      <button data-act="toggle" data-id="${i.id}" aria-label="Marcar ${esc(i.name)}" class="tap w-7 h-7 rounded-full border-2 ${i.done ? 'bg-brand border-brand text-white' : 'border-brand-line'} flex items-center justify-center shrink-0">${i.done ? '<i data-lucide="check" class="w-4 h-4"></i>' : ''}</button>
      <div class="min-w-0 flex-1">
        <p class="font-semibold truncate ${i.done ? 'line-through text-faint' : ''}">${esc(i.name)}</p>
        <p class="text-xs text-mute">${b ? `${brl(b.price)} em ${esc(b.market)} · ` : ''}por ${esc(i.by)}</p>
      </div>
      <div class="flex items-center bg-soft rounded-full">
        <button data-act="dec" data-id="${i.id}" aria-label="Diminuir" class="tap w-8 h-8 flex items-center justify-center"><i data-lucide="minus" class="w-4 h-4"></i></button>
        <span class="w-6 text-center text-sm font-bold">${i.qty}</span>
        <button data-act="inc" data-id="${i.id}" aria-label="Aumentar" class="tap w-8 h-8 flex items-center justify-center"><i data-lucide="plus" class="w-4 h-4"></i></button>
      </div>
      <button data-act="del" data-id="${i.id}" aria-label="Remover" class="tap text-faint hover:text-red-500 p-1"><i data-lucide="trash-2" class="w-5 h-5"></i></button>
    </li>`;
  };

  const activity = state.log.slice(0, 5).map(l =>
    `<li class="text-mute"><b class="${l.who === APP.people[0] ? 'text-brand-ink' : 'text-accent'}">${esc(l.who)}</b> ${esc(l.msg)} <span class="text-faint text-xs">· ${new Date(l.t).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span></li>`).join('');

  const empty = state.receipts.length
    ? `<p class="text-center text-mute pt-4 pb-3">Lista vazia.</p>${gradBtn('data-act="generate"', 'sparkles', 'Gerar Lista Inteligente', 'w-full')}`
    : `<p class="text-center text-mute py-4">Lista vazia. Adicione itens acima.<br><span class="text-xs">Depois da primeira compra registrada na aba <b>Nota</b>, o app passa a sugerir a lista sozinho.</span></p>`;

  return `
  ${state.demo ? `<div class="mb-4 rounded-2xl border border-brand-line bg-brand-soft p-3 flex items-center gap-3">
      <i data-lucide="flask-conical" class="w-5 h-5 text-brand shrink-0"></i>
      <p class="text-sm flex-1"><b>Dados de exemplo.</b> Limpe antes de começar a usar de verdade.</p>
      <button data-act="clearDemo" class="tap bg-brand text-white text-xs font-bold rounded-full px-3 py-2">Começar do zero</button></div>` : ''}
  ${card(`<div class="flex items-end justify-between">
      <div><p class="text-sm text-mute">Lista da casa</p><p class="text-3xl font-extrabold bg-gradient-to-r from-violet-600 to-pink-500 bg-clip-text text-transparent">${state.list.length} <span class="text-base font-semibold text-mute">itens</span></p></div>
      <div class="text-right"><p class="text-xs text-mute">Estimativa (menores preços)</p><p class="text-xl font-bold">${brl(est)}</p></div></div>`)}
  <form id="addForm" class="flex gap-2 mb-4">
    <input id="addName" list="names" maxlength="80" autocomplete="off" placeholder="Adicionar item…" class="flex-1 min-w-0 rounded-xl border border-line bg-surface px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand">
    <button aria-label="Adicionar" class="tap bg-gradient-to-br from-violet-600 to-pink-500 text-white rounded-xl px-4 flex items-center shadow"><i data-lucide="plus" class="w-6 h-6"></i></button>
  </form>
  ${state.list.length
    ? card(`<ul>${pending.map(row).join('')}${done.length ? `<li class="pt-3 text-xs font-bold uppercase text-faint">No carrinho</li>${done.map(row).join('')}` : ''}</ul>`)
    : card(empty)}
  ${state.list.length ? `<div class="grid grid-cols-2 gap-2 mb-4">
    ${outlineBtn('data-act="share"', 'share-2', 'Compartilhar lista')}
    ${outlineBtn('data-act="clearDone"', 'eraser', 'Limpar marcados')}</div>` : ''}
  ${state.log.length ? card(`<h3 class="font-bold mb-2 flex items-center gap-2"><i data-lucide="history" class="w-4 h-4 text-brand"></i>Atividade recente</h3>
    <ul class="space-y-1.5 text-sm">${activity}</ul>`) : ''}`;
}
