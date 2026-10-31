const assert = require('assert');
let passed = 0;
const test = async (name, fn) => {
  await fn();
  passed++;
  console.log(`  ok  ${name}`);
};
const fresh = () => { state = emptyState(); state.onboarded = true; ui.draft = null; tab = 'list'; };

await test('parseMoney entende formatos brasileiros', () => {
  assert.strictEqual(parseMoney('12,5'), 12.5);
  assert.strictEqual(parseMoney('R$ 1.234,56'), 1234.56);
  assert.strictEqual(parseMoney('3'), 3);
  assert.strictEqual(parseMoney(''), null);
  assert.strictEqual(parseMoney('abc'), null);
  assert.strictEqual(parseMoney('-4'), null);
});

await test('parseNfce extrai chave, CNPJ e URL', () => {
  const chave = '41241177151333000104650010000123451000012345';
  const r = parseNfce(`http://www.fazenda.pr.gov.br/nfce/qrcode?p=${chave}|2|1|1|ABC`);
  assert.ok(r.ok);
  assert.strictEqual(r.chave, chave);
  assert.strictEqual(r.cnpj, '77151333000104');
  assert.ok(r.url.startsWith('http://www.fazenda.pr.gov.br'));
  assert.strictEqual(parseNfce('olá mundo').ok, false);
  assert.strictEqual(parseNfce('javascript:alert(1)').ok, false);
});

await test('sanitizeState descarta lixo e limita valores', () => {
  assert.strictEqual(sanitizeState(null), null);
  assert.strictEqual(sanitizeState([]), null);
  const s = sanitizeState({
    profile: 'Hacker', budget: -5, apiUrl: 'javascript:x',
    list: [{ name: '  Leite ', qty: 99999, price: 'x' }, { name: '' }, null],
    receipts: [{ market: 'Condor', date: 'ontem', items: [{ name: 'Arroz', qty: 2, price: 10 }, { name: '' }] }, { market: '', items: [] }],
    markets: [{ name: 'A' }, { name: 'a' }, { name: '' }]
  });
  assert.strictEqual(s.profile, APP.people[0]);
  assert.strictEqual(s.apiUrl, '');
  assert.strictEqual(s.list.length, 1);
  assert.strictEqual(s.list[0].qty, 999);
  assert.strictEqual(s.list[0].price, null);
  assert.strictEqual(s.receipts.length, 1);
  assert.strictEqual(s.receipts[0].items.length, 1);
  assert.strictEqual(s.markets.length, 1);
});

await test('save/load fazem ida e volta e guardam dado corrompido', () => {
  fresh();
  addItem('Leite Integral 1L', 3);
  save();
  load();
  assert.strictEqual(state.list[0].name, 'Leite Integral 1L');
  __store[APP.storageKey] = '{quebrado';
  load();
  assert.strictEqual(state.list.length, 0);
  assert.strictEqual(__store[`${APP.storageKey}.corrupt`], '{quebrado');
});

await test('addItem evita duplicados ignorando acento e caixa', () => {
  fresh();
  assert.ok(addItem('Café 500g'));
  assert.strictEqual(addItem('cafe 500G'), false);
  assert.strictEqual(state.list.length, 1);
});

await test('saveDraft valida e registra compra', () => {
  fresh();
  ui.draft = newDraft();
  assert.ok(saveDraft(), 'sem itens deve falhar');
  ui.draft.items = [{ name: 'Arroz 5kg', qty: '2', price: '' }];
  assert.ok(/preço/i.test(saveDraft()), 'sem preço deve falhar');
  ui.draft.items = [{ name: 'Arroz 5kg', qty: '2', price: '24,90' }, { name: '', qty: '1', price: '' }];
  ui.draft.date = '2999-01-01';
  assert.ok(/data/i.test(saveDraft()), 'data futura deve falhar');
  ui.draft.date = todayISO();
  ui.draft.cnpj = '77151333000104';
  assert.strictEqual(saveDraft(), null);
  assert.strictEqual(state.receipts.length, 1);
  assert.strictEqual(state.receipts[0].items[0].price, 24.9);
  assert.strictEqual(state.markets[0].cnpj, '77151333000104');
  assert.strictEqual(receiptTotal(state.receipts[0]), 49.8);
});

await test('preços nulos ou zero nunca entram na tabela de preços', () => {
  fresh();
  state.receipts.push({ id: 'a', market: 'Condor', date: Date.now(), by: 'Gabriel', source: 'cart', url: '', items: [{ name: 'Leite', qty: 1, price: null }, { name: 'Arroz', qty: 1, price: 20 }] });
  const pt = priceTable();
  assert.strictEqual(pt[norm('Leite')], undefined);
  assert.strictEqual(bestPrice('Arroz', pt).price, 20);
});

await test('comparação escolhe o mercado mais barato', () => {
  fresh();
  const mk = (market, price) => ({ id: uid(), market, date: Date.now(), by: 'Gabriel', source: 'manual', url: '', items: [{ name: 'Arroz 5kg', qty: 1, price }] });
  state.receipts.push(mk('Condor', 27), mk('Atacadão', 24));
  assert.deepStrictEqual({ ...bestPrice('arroz 5kg') }, { market: 'Atacadão', price: 24 });
});

await test('finishShopping só grava preços confirmados e limpa o carrinho', () => {
  fresh();
  state.market = 'Condor';
  state.receipts.push({ id: 'r', market: 'Condor', date: Date.now() - dayMs, by: 'Gabriel', source: 'manual', url: '', items: [{ name: 'Arroz 5kg', qty: 1, price: 25 }] });
  state.receipts.push({ id: 'r2', market: 'Atacadão', date: Date.now() - dayMs, by: 'Gabriel', source: 'manual', url: '', items: [{ name: 'Feijão 1kg', qty: 1, price: 7 }] });
  addItem('Arroz 5kg'); addItem('Feijão 1kg'); addItem('Sal 1kg'); addItem('Café 500g');
  state.list.forEach(i => { i.done = true; });
  state.list.find(i => i.name === 'Café 500g').price = 18;
  const before = state.receipts.length;
  finishShopping();
  assert.strictEqual(state.receipts.length, before + 1);
  const r = state.receipts[state.receipts.length - 1];
  const p = n => r.items.find(i => i.name === n).price;
  assert.strictEqual(p('Arroz 5kg'), 25);
  assert.strictEqual(p('Café 500g'), 18);
  assert.strictEqual(p('Feijão 1kg'), null, 'estimativa de outro mercado não é preço confirmado');
  assert.strictEqual(p('Sal 1kg'), null);
  assert.strictEqual(state.list.length, 0);
});

await test('sugestões usam o histórico', () => {
  fresh();
  const d = demoData();
  state.receipts = d.receipts;
  const s = suggestions();
  assert.ok(s.length > 5);
  assert.ok(s.every(x => x.reason));
  assert.ok(knownNames().length >= CATALOG.length);
});

await test('backup: exporta/importa e rejeita JSON qualquer', () => {
  fresh();
  state.receipts = demoData().receipts;
  const text = JSON.stringify({ data: state });
  state = emptyState();
  assert.ok(importBackup(text));
  assert.strictEqual(state.receipts.length, 8);
  assert.strictEqual(state.onboarded, true);
  assert.strictEqual(importBackup('{"foo":1}'), false);
  assert.strictEqual(importBackup('nao é json'), false);
});

await test('pickMatch exige o mesmo tamanho e prefere o mais barato', () => {
  const results = [
    { name: 'Leite UHT Integral 1L Marca A', price: 5.5 },
    { name: 'Leite Integral 1L Marca B', price: 4.6 },
    { name: 'Leite em Pó Integral 400g', price: 12 },
    { name: 'Leite Integral 200ml', price: 1.5 }
  ];
  assert.strictEqual(pickMatch('Leite Integral 1L', results).price, 4.6);
  assert.strictEqual(pickMatch('Ovos 12un', results), null);
  assert.strictEqual(pickMatch('Água Mineral 1,5L', [{ name: 'Água Mineral Sem Gás 1,5 L', price: 3 }]).price, 3);
});

await test('busca online grava preços como mercado "(online)"', async () => {
  fresh();
  addItem('Leite Integral 1L');
  state.apiUrl = 'https://proxy.test';
  globalThis.fetch = async url => ({ ok: true, json: async () => ({ results: [{ name: 'Leite Integral 1L Marca B', price: 4.6, url: 'https://loja/x' }] }) });
  await runOnlineSearch();
  const pt = priceTable();
  assert.strictEqual(bestPrice('Leite Integral 1L', pt).market, 'Super Muffato (online)');
});

await test('prettyName deixa a descrição da nota legível', () => {
  assert.strictEqual(prettyName('LEITE UHT INT 1L PIRACANJUBA'), 'Leite Uht Int 1L Piracanjuba');
  assert.strictEqual(prettyName('ARROZ TIO JOAO 5KG'), 'Arroz Tio Joao 5kg');
  assert.strictEqual(prettyName('CAFE  PILAO  500G'), 'Cafe Pilao 500g');
  assert.strictEqual(prettyName('PAO DE FORMA'), 'Pao de Forma');
});

await test('sanitizeNfce rejeita lixo e nfceToRows converte itens pesados', () => {
  assert.strictEqual(sanitizeNfce(null), null);
  assert.strictEqual(sanitizeNfce({ items: 'x' }), null);
  assert.strictEqual(sanitizeNfce({ items: [{ name: '', qty: 1, unitPrice: 2 }, { name: 'X', qty: 0, unitPrice: 2 }] }), null);
  fresh();
  addItem('Leite Integral 1L');
  const nota = sanitizeNfce({
    market: { name: 'SUPERMERCADOS JACOMAR LTDA', cnpj: '77.151.333/0001-04' }, date: '2026-10-31',
    items: [
      { name: 'LEITE INTEGRAL 1L', qty: 2, unitPrice: 4.99, total: 9.98 },
      { name: 'BANANA PRATA KG', qty: 0.523, unitPrice: 6.98, total: 3.65 },
      { name: 'ARROZ 5KG X', catalogName: 'Arroz Tio João Tipo 1 5kg', qty: 1, unitPrice: 27.9, total: 27.9 }
    ]
  });
  assert.strictEqual(nota.market.cnpj, '77151333000104');
  const rows = nfceToRows(nota);
  assert.deepStrictEqual(rows[0], { name: 'Leite Integral 1L', qty: '2', price: '4,99' });
  assert.deepStrictEqual(rows[1], { name: 'Banana Prata kg', qty: '1', price: '3,65' }); // nome já conhecido do catálogo
  assert.strictEqual(rows[2].name, 'Arroz Tio João Tipo 1 5kg');
  assert.strictEqual(matchMarketByNota(nota).name, 'Jacomar');
});

await test('ler QR importa itens da nota, reconhece o mercado e evita nota repetida', async () => {
  fresh();
  state.apiUrl = 'https://proxy.test';
  const chave = '41241177151333000104650010000123451000012345';
  globalThis.fetch = async url => {
    assert.ok(String(url).startsWith('https://proxy.test/nfce?url='));
    return { ok: true, json: async () => ({
      market: { name: 'SUPERMERCADOS JACOMAR LTDA', cnpj: '77151333000104' }, date: '2026-10-31',
      items: [{ name: 'LEITE UHT INT 1L', qty: 2, unitPrice: 4.99, total: 9.98 }]
    }) };
  };
  await applyQr(`http://www.fazenda.pr.gov.br/nfce/qrcode?p=${chave}|2|1|1|AB`);
  assert.strictEqual(ui.draft.nfce.status, 'ok');
  assert.strictEqual(ui.draft.market, 'Jacomar');
  assert.strictEqual(ui.draft.items.length, 1);
  assert.ok(__els['#view'].innerHTML.includes('1 itens importados'));
  assert.strictEqual(saveDraft(), null);
  assert.strictEqual(state.receipts[0].chave, chave);
  assert.strictEqual(state.markets.find(m => m.name === 'Jacomar').cnpj, '77151333000104');

  await applyQr(`http://www.fazenda.pr.gov.br/nfce/qrcode?p=${chave}|2|1|1|AB`);
  assert.strictEqual(state.receipts.length, 1, 'não duplica');

  // falha do servidor: mantém o fluxo manual
  fresh();
  state.apiUrl = 'https://proxy.test';
  globalThis.fetch = async () => ({ ok: false, status: 422, json: async () => ({ error: 'Não consegui ler os itens desta nota' }) });
  await applyQr('http://www.fazenda.pr.gov.br/nfce/qrcode?p=' + chave + '|2');
  assert.strictEqual(ui.draft.nfce.status, 'error');
  assert.ok(__els['#view'].innerHTML.includes('Preencha manualmente'));
});

await test('todas as telas renderizam sem erro, NaN ou undefined', () => {
  for (const mode of ['vazio', 'demo']) {
    fresh();
    if (mode === 'demo') loadDemoData();
    for (const t of [...Object.keys(ROUTES), 'onboarding']) {
      tab = t === 'onboarding' ? 'list' : t;
      state.onboarded = t !== 'onboarding';
      render();
      const out = __els['#view'].innerHTML;
      assert.ok(out.length > 100, `${mode}/${t} vazio`);
      assert.ok(!/undefined|NaN|\[object/.test(out), `${mode}/${t} contém valor inválido`);
    }
  }
});

await test('nomes com HTML são escapados nas telas', () => {
  fresh();
  const evil = '<img src=x onerror=alert(1)>';
  addItem(evil);
  state.receipts.push({ id: 'z', market: 'Condor', date: Date.now(), by: 'Gabriel', source: 'manual', url: '', items: [{ name: evil, qty: 1, price: 5 }] });
  for (const t of Object.keys(ROUTES)) {
    tab = t;
    render();
    assert.ok(!__els['#view'].innerHTML.includes(evil), `${t} não escapou o HTML`);
  }
});

console.log(`\n${passed} testes executados.`);
