const TABS = [
  ['list', 'shopping-cart', 'Lista'],
  ['smart', 'bot', 'Histórico'],
  ['recipes', 'chef-hat', 'Receitas'],
  ['compare', 'bar-chart-3', 'Preços'],
  ['receipts', 'receipt', 'Nota'],
  ['market', 'zap', 'Mercado']
];

const ROUTES = {
  list: vList, smart: vSmart, recipes: vRecipes, compare: vCompare, receipts: vReceipts, market: vMarket, settings: vSettings
};

/* ============ Renderização ============ */

function renderChrome() {
  $('#themeBtn').innerHTML = `<i data-lucide="${isDark() ? 'sun' : 'moon'}" class="w-5 h-5 text-brand"></i><span class="font-semibold text-sm">${isDark() ? 'Modo claro' : 'Modo escuro'}</span>`;
  $('#settingsBtn').classList.toggle('bg-brand-soft', tab === 'settings');
  $('#profileSwitch').innerHTML = APP.people.map(p =>
    `<button data-profile="${p}" class="tap px-3 py-1 rounded-full ${state.profile === p ? 'bg-white text-violet-700' : 'text-white/90'}">${p}</button>`).join('');
  $('#tabs').innerHTML = TABS.map(([id, ic, label]) => {
    const on = tab === id;
    return `<button data-tab="${id}" aria-current="${on ? 'page' : 'false'}" class="tap w-full min-h-11 rounded-xl px-3 flex items-center gap-3 text-left ${on ? 'bg-brand-soft text-brand-ink font-bold' : 'text-ink hover:bg-soft'}">
      <i data-lucide="${ic}" class="w-5 h-5 ${on ? 'text-brand' : 'text-mute'}"></i><span class="text-sm">${label}</span></button>`;
  }).join('');
}

function render() {
  const onboarding = !state.onboarded;
  $('#menuBtn').classList.toggle('hidden', onboarding);
  if (onboarding) closeMenu();
  renderChrome();
  $('#names').innerHTML = knownNames().map(n => `<option value="${esc(n)}">`).join('');
  $('#view').innerHTML = `<div class="view">${onboarding ? '' : (tab === 'list' || tab === 'settings' ? installBanner() : '')}${(onboarding ? vOnboarding : ROUTES[tab])()}</div>`;
  lucide.createIcons();
}

function openMenu() {
  $('#menuFundo').classList.remove('hidden');
  $('#menuLateral').classList.remove('hidden');
  $('#menuBtn').setAttribute('aria-expanded', 'true');
}

function closeMenu() {
  $('#menuFundo').classList.add('hidden');
  $('#menuLateral').classList.add('hidden');
  $('#menuBtn').setAttribute('aria-expanded', 'false');
}

/* ============ Ações (botões com data-act) ============ */
// Cada ação recebe (item da lista, botão). Retornar false cancela o save/render automático.

function ensureMarkets(names) {
  names.forEach(n => { if (!state.markets.some(m => norm(m.name) === norm(n))) state.markets.push({ name: n, cnpj: '' }); });
}

function loadDemoData() {
  const d = demoData();
  ensureMarkets(Object.keys(DEMO_FACTORS));
  state.receipts = d.receipts;
  state.list = d.list;
  state.online = {};
  state.demo = true;
  state.onboarded = true;
  ui.draft = null;
  log('Carregou dados de exemplo');
}

function resetData() {
  state.receipts = [];
  state.list = [];
  state.online = {};
  state.log = [];
  state.demo = false;
  state.onboarded = true;
  ui.draft = null;
}

const hasContent = d => d.items.some(r => r.name.trim() || r.price.trim());

async function applyQr(text) {
  if (!text) { toast('Nenhum QR Code encontrado na imagem'); return; }
  const n = parseNfce(text);
  if (!n.ok) { toast('Esse QR Code não parece ser de uma nota fiscal'); return; }
  if (n.chave && state.receipts.some(r => r.chave === n.chave)) { toast('Essa nota já foi registrada'); return; }

  const d = ui.draft || (ui.draft = newDraft());
  Object.assign(d, { url: n.url, chave: n.chave, cnpj: n.cnpj, nfce: { status: n.url && apiBase() ? 'loading' : 'idle', error: '', count: 0 } });
  const byCnpj = n.cnpj && state.markets.find(x => x.cnpj === n.cnpj);
  if (byCnpj) d.market = byCnpj.name;
  tab = 'receipts';
  render();
  if (d.nfce.status !== 'loading') { toast('QR Code lido'); return; }

  try {
    const nota = await fetchNfce(n.url);
    if (ui.draft !== d) return; // o rascunho foi descartado enquanto carregava
    if (hasContent(d) && !confirm('Substituir os itens digitados pelos itens da nota?')) { d.nfce = { status: 'idle', error: '', count: 0 }; render(); return; }
    d.items = nfceToRows(nota);
    const m = matchMarketByNota(nota);
    if (m) d.market = m.name;
    if (!d.cnpj) d.cnpj = nota.market.cnpj;
    if (nota.date && isoToTs(nota.date) <= Date.now() + dayMs) d.date = nota.date;
    d.emitter = nota.market.name;
    d.nfce = { status: 'ok', error: '', count: d.items.length };
    toast(`${d.items.length} itens importados da nota`);
  } catch (e) {
    if (ui.draft !== d) return;
    d.nfce = { status: 'error', error: e.message || 'Falha ao importar', count: 0 };
    toast('Não consegui importar os itens. Preencha manualmente.');
  }
  render();
}

const actions = {
  toggle: it => { if (it) { it.done = !it.done; log(`${it.done ? 'Pegou' : 'Devolveu'} "${it.name}"`); } },
  inc: it => { if (it) it.qty = Math.min(999, it.qty + 1); },
  dec: it => { if (it) it.qty = Math.max(1, it.qty - 1); },
  del: it => { if (it) { state.list = state.list.filter(i => i !== it); log(`Removeu "${it.name}"`); } },
  clearDone: () => {
    if (!state.list.some(i => i.done)) { toast('Nenhum item marcado'); return false; }
    state.list = state.list.filter(i => !i.done);
    log('Limpou itens marcados');
  },
  quick: (it, b) => { if (addItem(b.dataset.name, +b.dataset.qty || 1)) toast(`+ ${b.dataset.name}`); },
  generate: () => {
    const sug = suggestions().filter(s => !inList(s.name));
    if (!sug.length) { toast('Nada novo para sugerir'); return false; }
    sug.forEach(s => addItem(s.name, s.avgQty, true));
    log(`Gerou lista inteligente (${sug.length} itens)`);
    toast(`${sug.length} itens adicionados`);
    tab = 'list';
  },
  addRecipeMissing: (it, b) => {
    const recipe = recipeSuggestions(state.receipts).find(r => r.id === b.dataset.recipe);
    if (!recipe) { toast('Essa receita não está mais disponível'); return false; }
    const missing = recipe.missing.filter(i => !inList(i.name));
    if (!missing.length) { toast('Os itens que faltam já estão na lista'); return false; }
    missing.forEach(i => addItem(i.name, 1, true));
    tab = 'list';
    toast(`${missing.length} ${missing.length === 1 ? 'item adicionado' : 'itens adicionados'} à lista`);
  },
  editPrice: it => {
    if (!it) return false;
    const cur = priceInfo(it, priceTable());
    const v = prompt(`Preço unitário de "${it.name}" em ${state.market} (R$).\nDeixe vazio para voltar ao automático.`, cur.price ? cur.price.toFixed(2).replace('.', ',') : '');
    if (v === null) return false;
    if (v.trim() === '') { it.price = null; return; }
    const n = parseMoney(v);
    if (!(n > 0)) { toast('Valor inválido'); return false; }
    it.price = n;
  },
  fetchOnline: () => { runOnlineSearch(); return false; },
  share: () => { shareList(); return false; },
  finishShopping: () => finishShopping(),

  startEmpty: () => { state.onboarded = true; },
  startDemo: () => loadDemoData(),
  clearDemo: () => {
    if (!confirm('Apagar os dados de exemplo e começar do zero?')) return false;
    resetData();
    toast('Pronto! Comece registrando uma compra.');
  },

  scanQR: () => { openQrScanner(applyQr); return false; },
  draftAddRow: () => {
    ui.draft.items.push({ name: '', qty: '1', price: '' });
    render();
    const rows = document.querySelectorAll('[data-draft-item="name"]');
    if (rows.length) rows[rows.length - 1].focus();
    return false;
  },
  draftDelRow: (it, b) => {
    ui.draft.items.splice(+b.dataset.idx, 1);
    if (!ui.draft.items.length) ui.draft.items.push({ name: '', qty: '1', price: '' });
    render();
    return false;
  },
  draftFromList: () => {
    const src = state.list.some(i => i.done) ? state.list.filter(i => i.done) : state.list;
    if (!src.length) { toast('A lista está vazia'); return false; }
    const rows = src.map(i => ({ name: i.name, qty: String(i.qty), price: '' }));
    const d = ui.draft;
    const onlyBlank = d.items.length === 1 && !d.items[0].name && !d.items[0].price;
    d.items = onlyBlank ? rows : [...d.items, ...rows.filter(r => !d.items.some(x => norm(x.name) === norm(r.name)))];
    render();
    toast('Agora preencha o preço de cada item');
    return false;
  },
  discardDraft: () => { ui.draft = newDraft(); render(); return false; },
  saveDraft: () => {
    const err = saveDraft();
    if (err) { toast(err); return false; }
    toast('Compra registrada!');
  },
  delReceipt: (it, b) => {
    if (!confirm('Excluir esta compra do histórico?')) return false;
    state.receipts = state.receipts.filter(r => r.id !== b.dataset.id);
  },

  delMarket: (it, b) => {
    const name = b.dataset.name;
    if (state.receipts.some(r => r.market === name)) { toast('Há compras registradas nesse mercado'); return false; }
    if (state.markets.length <= 1) { toast('Mantenha ao menos um mercado'); return false; }
    state.markets = state.markets.filter(m => m.name !== name);
    if (state.market === name) state.market = state.markets[0].name;
    if (ui.draft && ui.draft.market === name) ui.draft.market = state.market;
  },
  exportData: () => { exportBackup(); toast('Backup gerado'); return false; },
  importData: () => { $('#importFile').click(); return false; },
  loadDemo: () => {
    if (!confirm('Substituir lista e compras atuais pelos dados de exemplo?')) return false;
    loadDemoData();
    toast('Dados de exemplo carregados');
  },
  wipeAll: () => {
    if (!confirm('Apagar TODA a lista e o histórico de compras deste aparelho? Exporte um backup antes se precisar.')) return false;
    if (state.sync.code && !confirm('A sincronização está ativa: isso também apagará os dados do outro aparelho. Continuar?')) return false;
    resetData();
    toast('Dados apagados');
  },
  installApp: () => { installApp(); return false; },
  dismissInstall: () => {
    try { localStorage.setItem(INSTALL_DISMISS_KEY, '1'); } catch (e) { /* ignora */ }
    render();
    return false;
  },

  createSync: () => {
    if (!apiBase()) { toast('Informe a URL do servidor primeiro'); return false; }
    joinSync(newSyncCode(), true);
    toast('Sincronização ativada. Envie o convite para o outro celular.');
    return false;
  },
  joinSync: () => {
    const raw = ($('#syncCode').value || '').trim();
    const code = (raw.match(/pair=([^&]+)/) || [0, raw])[1];
    const api = (raw.match(/api=([^&]+)/) || [])[1];
    if (api) { try { state.apiUrl = (safeHttp(decodeURIComponent(api)) || state.apiUrl).replace(/\/+$/, ''); } catch (e) { /* mantém */ } }
    if (!apiBase()) { toast('Informe a URL do servidor primeiro'); return false; }
    if (!joinSync(decodeURIComponent(code))) { toast('Código inválido'); return false; }
    toast('Conectado! Sincronizando...');
    return false;
  },
  syncNow: () => { syncNow(); toast('Sincronizando...'); return false; },
  shareInvite: () => { sendText('Entre na nossa lista de compras do CasalCompras: ' + inviteLink(), 'Convite CasalCompras'); return false; },
  leaveSync: () => {
    if (!confirm('Parar de sincronizar este aparelho? Os dados continuam salvos aqui.')) return false;
    leaveSync();
    render();
    return false;
  }
};

/* ============ Eventos ============ */

document.addEventListener('click', e => {
  if (e.target.closest('#menuBtn')) { openMenu(); return; }
  if (e.target.closest('[data-menu-close]')) { closeMenu(); return; }
  if (e.target.closest('[data-theme-toggle]')) { toggleTheme(); return render(); }

  const pb = e.target.closest('[data-profile]');
  if (pb) { state.profile = pb.dataset.profile; save(); toast(`Perfil: ${state.profile}`); return render(); }

  const tb = e.target.closest('[data-tab]');
  if (tb) { tab = tb.dataset.tab; closeMenu(); render(); return window.scrollTo(0, 0); }

  const b = e.target.closest('[data-act]');
  if (!b || b.disabled || !actions[b.dataset.act]) return;
  const it = state.list.find(i => i.id === b.dataset.id);
  if (actions[b.dataset.act](it, b) === false) return;
  save();
  render();
});

document.addEventListener('submit', e => {
  const id = e.target.id;
  if (id === 'addForm') {
    e.preventDefault();
    const inp = $('#addName');
    if (addItem(inp.value)) { save(); render(); $('#addName').focus(); } else inp.value = '';
  }
  if (id === 'marketForm') {
    e.preventDefault();
    const name = $('#marketName').value.trim().slice(0, 40);
    if (!name) return;
    if (state.markets.some(m => norm(m.name) === norm(name))) { toast('Esse mercado já existe'); return; }
    state.markets.push({ name, cnpj: '' });
    save();
    render();
  }
});

// Campos do rascunho de compra: atualizam o objeto sem re-renderizar (mantém o foco)
document.addEventListener('input', e => {
  const t = e.target;
  if (!ui.draft) return;
  if (t.dataset.draftItem) {
    const row = ui.draft.items[+t.dataset.idx];
    if (row) row[t.dataset.draftItem] = t.value;
    const total = $('#draftTotal');
    if (total) total.textContent = brl(draftTotal(ui.draft));
  } else if (t.dataset.draft) {
    ui.draft[t.dataset.draft] = t.value;
  }
});

document.addEventListener('change', async e => {
  const t = e.target;
  if (t.id === 'qrFile' && t.files.length) {
    const file = t.files[0];
    t.value = '';
    try { applyQr(await decodeQrFile(file)); } catch (err) { toast('Não foi possível ler a imagem'); }
  }
  if (t.id === 'importFile' && t.files.length) {
    const file = t.files[0];
    t.value = '';
    if (file.size > 5e6) { toast('Arquivo grande demais'); return; }
    if (!confirm('Importar este backup? Os dados atuais deste aparelho serão substituídos.')) return;
    if (importBackup(await file.text())) { save(); render(); toast('Backup importado'); } else toast('Arquivo de backup inválido');
  }
  if (t.id === 'marketSel') { state.market = t.value; save(); render(); }
  if (t.id === 'budget') { const n = parseFloat(t.value); state.budget = n > 0 ? n : 0; save(); render(); }
  if (t.id === 'apiUrl') {
    const v = t.value.trim();
    if (v && !safeHttp(v)) { toast('A URL deve começar com https://'); return; }
    state.apiUrl = v.replace(/\/+$/, '');
    save();
    toast(v ? 'URL do proxy salva' : 'Busca online desativada');
    if (v) { scheduleSync(0); render(); }
  }
});

load();
consumeInvite();
render();
startSync();
