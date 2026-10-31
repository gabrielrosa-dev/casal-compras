function syncStatus() {
  if (sync.running) return '<span class="text-mute">Sincronizando...</span>';
  if (sync.error) return `<span class="text-accent font-semibold">${esc(sync.error)}</span>`;
  const t = state.sync.lastOk;
  return t ? `<span class="text-brand-ink font-semibold">Sincronizado ${fmtDate(t)} às ${new Date(t).toTimeString().slice(0, 5)}</span>` : '<span class="text-mute">Aguardando primeira sincronização</span>';
}

function syncCard() {
  const head = h2('refresh-cw', 'Sincronização entre aparelhos', 'Lista e compras iguais no celular dos dois, automaticamente');
  if (!apiBase()) {
    return card(`${head}<p class="text-sm text-mute">Informe a URL do servidor acima para ativar.</p>`);
  }
  if (state.sync.code) {
    return card(`${head}
      <p class="text-sm mb-3 flex items-center gap-2"><i data-lucide="${sync.error ? 'cloud-off' : 'cloud-check'}" class="w-4 h-4"></i>${syncStatus()}</p>
      <div class="grid grid-cols-2 gap-2">
        ${outlineBtn('data-act="syncNow"', 'refresh-cw', 'Sincronizar agora')}
        ${outlineBtn('data-act="shareInvite"', 'user-plus', 'Convidar')}
      </div>
      <p class="text-xs text-mute mt-2">Envie o convite pelo WhatsApp e abra o link no outro celular: ele se conecta sozinho. Quem tiver o link acessa a lista de vocês.</p>
      <button data-act="leaveSync" class="tap text-xs font-semibold text-accent mt-3">Parar de sincronizar neste aparelho</button>`);
  }
  return card(`${head}
    ${gradBtn('data-act="createSync"', 'sparkles', 'Criar grupo do casal', 'w-full')}
    <p class="text-xs text-mute mt-3">Já recebeu um convite? Abra o link, ou cole o código aqui:</p>
    <div class="flex gap-2 mt-1">
      <input id="syncCode" autocomplete="off" placeholder="Link ou código do convite" class="${inputCls} flex-1 min-w-0">
      <button data-act="joinSync" class="tap bg-surface border border-line font-semibold rounded-xl px-4">Entrar</button>
    </div>`);
}

function vSettings() {
  const marketRows = state.markets.map(m => `<li class="flex items-center gap-2 py-2 border-b border-line last:border-0">
      <div class="min-w-0 flex-1"><p class="font-semibold truncate">${esc(m.name)}</p>${m.cnpj ? `<p class="text-xs text-faint">CNPJ ${esc(fmtCnpj(m.cnpj))}</p>` : ''}</div>
      <button data-act="delMarket" data-name="${esc(m.name)}" aria-label="Remover ${esc(m.name)}" class="tap text-faint hover:text-red-500 p-1"><i data-lucide="trash-2" class="w-5 h-5"></i></button></li>`).join('');

  return `
  ${card(`${h2('store', 'Mercados', 'Os mercados que vocês frequentam')}
    <ul class="mb-3">${marketRows}</ul>
    <form id="marketForm" class="flex gap-2">
      <input id="marketName" maxlength="40" placeholder="Novo mercado (ex.: Mercadorama)" autocomplete="off" class="${inputCls} flex-1 min-w-0">
      <button aria-label="Adicionar mercado" class="tap bg-gradient-to-br from-violet-600 to-pink-500 text-white rounded-xl px-4"><i data-lucide="plus" class="w-5 h-5"></i></button>
    </form>`)}
  ${card(`${h2('globe', 'Servidor do casal', 'Gratuito · habilita sincronização, leitura de notas e preços online')}
    <label class="text-xs text-mute" for="apiUrl">URL do servidor (Cloudflare Worker)</label>
    <input id="apiUrl" type="url" inputmode="url" autocomplete="off" placeholder="https://casalcompras-precos.suaconta.workers.dev" value="${esc(state.apiUrl)}" class="${inputCls} mt-1">
    <p class="text-xs text-faint mt-1">Passo a passo em worker/README.md.</p>`)}
  ${syncCard()}
  ${card(`${h2('database', 'Dados e backup', 'Tudo fica salvo neste aparelho')}
    <div class="grid grid-cols-2 gap-2">
      ${outlineBtn('data-act="exportData"', 'download', 'Exportar backup')}
      ${outlineBtn('data-act="importData"', 'upload', 'Importar backup')}
    </div>
    <input id="importFile" type="file" accept="application/json,.json" class="hidden">
    <p class="text-xs text-mute mt-2">Para usar nos dois celulares: exporte aqui, envie o arquivo pelo WhatsApp e importe no outro aparelho. A importação substitui os dados do aparelho.</p>
    <div class="grid grid-cols-2 gap-2 mt-3">
      ${outlineBtn('data-act="loadDemo"', 'flask-conical', 'Dados de exemplo')}
      <button data-act="wipeAll" class="tap bg-surface border border-line text-accent font-semibold rounded-xl py-3 px-3 flex items-center justify-center gap-2 text-sm"><i data-lucide="trash" class="w-4 h-4"></i>Apagar tudo</button>
    </div>`)}
  ${card(`${h2('smartphone', 'Aplicativo')}
    ${deferredInstall
      ? gradBtn('data-act="installApp"', 'download', 'Instalar na tela inicial', 'w-full')
      : '<p class="text-sm text-mute">Para instalar: no Chrome use <b>⋮ → Adicionar à tela inicial</b>; no iPhone (Safari) use <b>Compartilhar → Adicionar à Tela de Início</b>. Depois de instalado, funciona offline.</p>'}
    <p class="text-xs text-faint mt-3">CasalCompras v${esc(APP.version)}</p>`)}`;
}
