const SOURCE_LABEL = { manual: 'Manual', qr: 'QR Code', cart: 'Carrinho', demo: 'Exemplo' };

function draftRow(it, idx) {
  return `<li class="rounded-xl border border-line p-2.5 space-y-2">
    <div class="flex gap-2">
      <input data-draft-item="name" data-idx="${idx}" list="names" maxlength="80" value="${esc(it.name)}" placeholder="Produto" aria-label="Produto" class="${inputCls} flex-1 min-w-0">
      <button type="button" data-act="draftDelRow" data-idx="${idx}" aria-label="Remover linha" class="tap text-faint hover:text-red-500 px-1"><i data-lucide="x" class="w-5 h-5"></i></button>
    </div>
    <div class="grid grid-cols-2 gap-2">
      <label class="text-xs text-mute">Quantidade
        <input data-draft-item="qty" data-idx="${idx}" type="number" min="1" max="999" inputmode="numeric" value="${esc(it.qty)}" class="${inputCls} mt-0.5"></label>
      <label class="text-xs text-mute">Preço unitário (R$)
        <input data-draft-item="price" data-idx="${idx}" inputmode="decimal" value="${esc(it.price)}" placeholder="0,00" class="${inputCls} mt-0.5"></label>
    </div>
  </li>`;
}

function draftTotal(d) {
  return d.items.reduce((s, r) => s + (parseMoney(r.price) || 0) * Math.max(1, parseInt(r.qty, 10) || 1), 0);
}

function nfceBox(d, host) {
  const st = (d.nfce && d.nfce.status) || 'idle';
  const msg = {
    loading: '<p class="text-xs text-mute mt-1 flex items-center gap-2"><i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i>Buscando itens e preços da nota...</p>',
    ok: `<p class="text-xs text-mute mt-1">${d.nfce && d.nfce.count} itens importados${d.emitter ? ` de ${esc(d.emitter)}` : ''}. Confira os nomes e preços antes de salvar.</p>`,
    error: `<p class="text-xs text-accent mt-1">Não foi possível importar os itens (${esc(d.nfce && d.nfce.error)}). Preencha manualmente${d.url ? ' vendo a nota pelo link abaixo' : ''}.</p>`,
    idle: apiBase()
      ? '<p class="text-xs text-mute mt-1">Veja os itens no site da nota e preencha os campos abaixo.</p>'
      : '<p class="text-xs text-mute mt-1">Configure o servidor em Ajustes para importar os itens automaticamente.</p>'
  }[st];
  return `<div class="rounded-xl bg-brand-soft border border-brand-line p-3 mb-3 text-sm">
      <p class="font-bold flex items-center gap-2"><i data-lucide="check-circle-2" class="w-4 h-4 text-brand"></i>QR Code da nota lido</p>
      ${d.cnpj ? `<p class="text-mute text-xs mt-1">CNPJ do emitente: ${esc(fmtCnpj(d.cnpj))}</p>` : ''}
      ${msg}
      ${d.url ? `<a href="${esc(d.url)}" target="_blank" rel="noopener noreferrer" class="inline-block mt-2 text-brand-ink font-semibold underline">Abrir nota em ${esc(host)}</a>` : ''}
    </div>`;
}

function vReceipts() {
  const d = ui.draft || (ui.draft = newDraft());
  const nfce = d.chave || d.url;
  const host = (() => { try { return new URL(d.url).hostname; } catch (e) { return ''; } })();

  const form = card(`${h2('receipt', 'Registrar compra', 'Preencha com o cupom fiscal. É isso que ensina o app sobre preços e consumo.')}
    <div class="grid grid-cols-2 gap-2 mb-3">
      ${outlineBtn('data-act="scanQR"', 'scan-line', 'Ler QR Code')}
      <label class="tap bg-surface border border-line text-ink font-semibold rounded-xl py-3 px-3 flex items-center justify-center gap-2 text-sm cursor-pointer"><i data-lucide="image-up" class="w-4 h-4 text-brand"></i>Enviar foto
        <input id="qrFile" type="file" accept="image/*" class="hidden"></label>
    </div>
    ${nfce ? nfceBox(d, host) : ''}
    <div class="grid grid-cols-2 gap-2 mb-3">
      <label class="text-xs text-mute">Mercado
        <select data-draft="market" class="${inputCls} mt-0.5">${marketOptions(d.market)}</select></label>
      <label class="text-xs text-mute">Data
        <input data-draft="date" type="date" max="${todayISO()}" value="${esc(d.date)}" class="${inputCls} mt-0.5"></label>
    </div>
    <ul id="draftRows" class="space-y-2">${d.items.map(draftRow).join('')}</ul>
    <div class="grid grid-cols-2 gap-2 mt-3">
      ${outlineBtn('data-act="draftAddRow"', 'plus', 'Adicionar item')}
      ${outlineBtn('data-act="draftFromList"', 'list-plus', 'Usar itens da lista')}
    </div>
    <div class="flex justify-between items-center font-extrabold text-lg mt-4 pt-3 border-t border-line"><span>Total</span><span id="draftTotal">${brl(draftTotal(d))}</span></div>
    <div class="grid grid-cols-3 gap-2 mt-3">
      ${outlineBtn('data-act="discardDraft"', 'rotate-ccw', 'Limpar')}
      ${gradBtn('data-act="saveDraft"', 'save', 'Salvar compra', 'col-span-2')}
    </div>`);

  const recs = [...state.receipts].sort((a, b) => b.date - a.date).slice(0, 40);
  const history = card(`<h3 class="font-bold mb-2 flex items-center gap-2"><i data-lucide="history" class="w-4 h-4 text-brand"></i>Compras registradas (${state.receipts.length})</h3>
    ${recs.length ? `<ul class="divide-y divide-line">${recs.map(r => `<li class="py-1">
      <details>
        <summary class="cursor-pointer py-2 flex items-center justify-between gap-2 list-none">
          <span class="min-w-0"><span class="font-semibold">${esc(r.market)}</span> <span class="text-mute text-sm">· ${fmtDate(r.date)}</span>
            <span class="block text-xs text-faint">${r.items.length} itens · ${esc(SOURCE_LABEL[r.source] || 'Manual')} · ${esc(r.by)}</span></span>
          <span class="font-bold whitespace-nowrap">${brl(receiptTotal(r))}</span>
        </summary>
        <ul class="text-sm text-mute pb-2 space-y-0.5">${r.items.map(i => `<li class="flex justify-between gap-2"><span class="truncate">${i.qty}× ${esc(i.name)}</span><span class="whitespace-nowrap">${i.price ? brl(i.price) : 'sem preço'}</span></li>`).join('')}</ul>
        <div class="flex gap-3 pb-2">
          ${r.url ? `<a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer" class="text-xs font-semibold text-brand-ink underline">Abrir nota</a>` : ''}
          <button data-act="delReceipt" data-id="${r.id}" class="text-xs font-semibold text-accent">Excluir compra</button>
        </div>
      </details></li>`).join('')}</ul>` : '<p class="text-sm text-mute">Nenhuma compra registrada ainda.</p>'}`);

  return form + history;
}
