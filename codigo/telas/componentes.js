const inputCls = 'w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-brand';

const card = (inner, cls = '') =>
  `<section class="bg-surface rounded-2xl shadow-sm border border-line p-4 mb-4 ${cls}">${inner}</section>`;

const h2 = (ic, t, sub = '') =>
  `<div class="mb-3"><h2 class="flex items-center gap-2 font-bold text-lg"><i data-lucide="${ic}" class="w-5 h-5 text-brand"></i>${t}</h2>${sub ? `<p class="text-sm text-mute mt-0.5">${sub}</p>` : ''}</div>`;

const gradBtn = (attrs, icon, label, cls = '') =>
  `<button ${attrs} class="tap bg-gradient-to-r from-violet-600 to-pink-500 text-white font-bold rounded-xl py-3.5 flex items-center justify-center gap-2 disabled:opacity-50 ${cls}"><i data-lucide="${icon}" class="w-5 h-5"></i>${label}</button>`;

const outlineBtn = (attrs, icon, label, cls = '') =>
  `<button ${attrs} class="tap bg-surface border border-line text-ink font-semibold rounded-xl py-3 px-3 flex items-center justify-center gap-2 text-sm ${cls}"><i data-lucide="${icon}" class="w-4 h-4 text-brand"></i>${label}</button>`;

const marketOptions = selected =>
  state.markets.map(m => `<option value="${esc(m.name)}" ${m.name === selected ? 'selected' : ''}>${esc(m.name)}</option>`).join('');
