const assert = require('assert');
const { makeContext } = require('./harness');

const sleep = ms => new Promise(r => setTimeout(r, ms));
const CODE = 'abcdefghijklmnopqrstuvwx';

// Servidor falso: guarda o último estado enviado por código, como o KV do worker
function fakeServer() {
  const db = {};
  const calls = { get: 0, put: 0 };
  const impl = async (url, opts = {}) => {
    const m = String(url).match(/\/sync\/([^/?]+)$/);
    if (!m) throw new Error('rota inesperada ' + url);
    if (opts.method === 'PUT') { calls.put++; db[m[1]] = opts.body; return { ok: true, status: 200, json: async () => ({ ok: true }) }; }
    calls.get++;
    return { ok: true, status: 200, json: async () => ({ data: db[m[1]] ? JSON.parse(db[m[1]]) : null }) };
  };
  return { impl, db, calls };
}

const device = server => {
  const d = makeContext({ fetchImpl: server.impl });
  d.run(`state = emptyState(); state.onboarded = true; state.apiUrl = 'https://proxy.test';`);
  return d;
};

// Espera qualquer sincronização em andamento e executa uma nova até o fim
const go = async d => {
  while (d.run('sync.running')) await sleep(2);
  await d.run('syncNow()');
};
const names = d => d.run(`state.list.map(i => i.name + (i.done ? '*' : '') + 'x' + i.qty).sort().join('|')`);

module.exports = async function () {
  let passed = 0;
  const test = async (name, fn) => { await fn(); passed++; console.log(`  ok  ${name}`); };

  const pair = async srv => {
    const a = device(srv), b = device(srv);
    a.run(`joinSync('${CODE}', true)`);
    await go(a);
    b.run(`joinSync('${CODE}')`);
    await go(b);
    return [a, b];
  };

  await test('itens e compras chegam ao outro aparelho', async () => {
    const srv = fakeServer();
    const a = device(srv), b = device(srv);
    a.run(`addItem('Leite 1L', 2); addItem('Pão'); state.receipts.push({ id: 'r1', market: 'Condor', date: Date.now(), by: 'Gabriel', source: 'manual', url: '', chave: '', items: [{ name: 'Leite 1L', qty: 1, price: 5 }] });`);
    a.run(`joinSync('${CODE}', true)`);
    await go(a);
    b.run(`joinSync('${CODE}')`);
    await go(b);
    assert.strictEqual(names(b), 'Leite 1Lx2|Pãox1');
    assert.strictEqual(b.run('state.receipts.length'), 1);
  });

  await test('marcar item e apagar item se propagam sem ressuscitar', async () => {
    const [a, b] = await pair(fakeServer());
    a.run(`addItem('Leite 1L'); addItem('Pão'); save();`);
    await go(a); await go(b);

    await sleep(5);
    b.run(`state.list.find(i => i.name === 'Pão').done = true; save();`);
    await go(b); await go(a);
    assert.strictEqual(names(a), 'Leite 1Lx1|Pão*x1');

    await sleep(5);
    a.run(`state.list = state.list.filter(i => i.name !== 'Leite 1L'); save();`);
    await go(a); await go(b); await go(a);
    assert.strictEqual(names(a), 'Pão*x1');
    assert.strictEqual(names(b), 'Pão*x1');
  });

  await test('edições simultâneas convergem: a mais recente vence', async () => {
    const [a, b] = await pair(fakeServer());
    a.run(`addItem('Café'); save();`);
    await go(a); await go(b);

    await sleep(5);
    a.run(`state.list[0].qty = 3; save();`);
    await sleep(10);
    b.run(`state.list[0].qty = 7; save();`); // mais recente
    await go(a); await go(b); await go(a);
    assert.strictEqual(names(a), 'Caféx7');
    assert.strictEqual(names(b), 'Caféx7');
  });

  await test('mesmo produto adicionado nos dois aparelhos não duplica', async () => {
    const [a, b] = await pair(fakeServer());
    a.run(`addItem('Arroz 5kg'); save();`);
    b.run(`addItem('arroz 5KG'); save();`);
    for (let i = 0; i < 2; i++) { await go(a); await go(b); }
    assert.strictEqual(a.run('state.list.length'), 1);
    assert.strictEqual(b.run('state.list.length'), 1);
    assert.strictEqual(names(a), names(b));
  });

  await test('sem mudanças não há envio ao servidor', async () => {
    const srv = fakeServer();
    const a = device(srv);
    a.run(`addItem('Sal'); joinSync('${CODE}', true)`);
    await go(a);
    const puts = srv.calls.put;
    await go(a); await go(a);
    assert.strictEqual(srv.calls.put, puts);
  });

  await test('falha de rede mantém os dados locais e avisa', async () => {
    const srv = fakeServer();
    const a = device(srv);
    a.run(`addItem('Sal'); joinSync('${CODE}', true)`);
    await go(a);
    a.fetch = async () => { throw new TypeError('Failed to fetch'); };
    a.run(`addItem('Óleo'); save();`);
    await go(a);
    assert.strictEqual(a.run('state.list.length'), 2);
    assert.ok(a.run('sync.error').length > 0);
  });

  await test('dados inválidos do servidor são ignorados com segurança', async () => {
    const srv = fakeServer();
    const a = device(srv);
    a.run(`addItem('Sal'); joinSync('${CODE}', true)`);
    await go(a);
    srv.db[CODE] = JSON.stringify({ list: [{ id: 'x', name: 'a'.repeat(500), qty: -4, at: 'nunca' }, null, 7], receipts: 'quebrado', meta: { markets: 'x' }, deleted: { a: 'b' } });
    await go(a);
    assert.ok(a.run('state.list.every(i => i.name.length <= 80 && i.qty >= 1)'));
    assert.ok(a.run('state.list.some(i => i.name === "Sal")'));
  });

  await test('convite (link) configura o outro aparelho', async () => {
    const srv = fakeServer();
    const a = device(srv), b = makeContext({ fetchImpl: srv.impl });
    a.run(`joinSync('${CODE}', true)`);
    const link = a.run('inviteLink()');
    assert.ok(link.startsWith('https://casal.github.io/app/#pair=' + CODE));
    b.run('state = emptyState();');
    b.location.hash = '#' + link.split('#')[1];
    assert.ok(b.run('consumeInvite()'));
    assert.strictEqual(b.run('state.sync.code'), CODE);
    assert.strictEqual(b.run('state.apiUrl'), 'https://proxy.test');
    b.location.hash = '#pair=curto&api=https%3A%2F%2Fx.test';
    assert.strictEqual(b.run('consumeInvite()'), false);
  });

  await test('importar backup mantém o pareamento do aparelho', async () => {
    const a = device(fakeServer());
    a.run(`joinSync('${CODE}', true)`);
    assert.ok(a.run(`importBackup(JSON.stringify({ data: { list: [{ name: 'Mel', qty: 1 }], receipts: [] } }))`));
    assert.strictEqual(a.run('state.sync.code'), CODE);
    assert.strictEqual(a.run('state.apiUrl'), 'https://proxy.test');
  });

  console.log(`  ${passed} testes de sincronização.`);
};
