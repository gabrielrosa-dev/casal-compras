import assert from 'node:assert';
import fs from 'node:fs';
import worker from '../servidor/servidor.js';
import { brNum, isAllowedNfceUrl, parseNfceHtml } from '../servidor/nota-fiscal.js';

const html = fs.readFileSync(new URL('./exemplos/layout-nota.html', import.meta.url), 'utf8');
const ORIGIN = 'https://casal.github.io';
const CODE = 'abcdefghijklmnopqrstuvwx';

const kv = new Map();
const env = {
  ALLOWED_ORIGINS: ORIGIN,
  SYNC: { get: async k => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); } }
};
const ctx = { waitUntil() {} };
const call = (path, init = {}, origin = ORIGIN) =>
  worker.fetch(new Request('https://w.test' + path, { ...init, headers: { Origin: origin, ...(init.headers || {}) } }), env, ctx);

let passed = 0;
const test = async (name, fn) => { await fn(); passed++; console.log(`  ok  ${name}`); };

await test('brNum e validação de URL da nota', () => {
  assert.strictEqual(brNum('1.234,56'), 1234.56);
  assert.strictEqual(brNum('2,0000'), 2);
  assert.strictEqual(brNum(''), null);
  assert.ok(isAllowedNfceUrl('http://www.fazenda.pr.gov.br/nfce/qrcode?p=123'));
  for (const bad of ['https://evil.com/x', 'https://fazenda.gov.br.evil.com/', 'http://localhost/', 'http://127.0.0.1/', 'ftp://a.gov.br/', 'https://u:p@a.gov.br/', 'https://a.gov.br:8443/', 'javascript:alert(1)', 'lixo'])
    assert.strictEqual(isAllowedNfceUrl(bad), false, bad);
});

await test('parser extrai emitente, data, total e itens', () => {
  const n = parseNfceHtml(html);
  assert.strictEqual(n.market.name, 'SUPERMERCADOS JACOMAR LTDA');
  assert.strictEqual(n.market.cnpj, '77151333000104');
  assert.strictEqual(n.date, '2026-10-31');
  assert.strictEqual(n.total, 41.53);
  assert.strictEqual(n.items.length, 3);
  assert.deepStrictEqual(n.items[0], { name: 'LEITE UHT INT 1L PIRACANJUBA', code: '7891097104947', qty: 2, unit: 'UN', unitPrice: 4.99, total: 9.98 });
  assert.strictEqual(n.items[1].qty, 0.523);
  assert.strictEqual(n.items[2].name, 'ARROZ TIO JOÃO 5KG');
  assert.strictEqual(parseNfceHtml('<html>nada</html>').items.length, 0);
});

await test('parser aceita o layout da SEFAZ-PR com o nome do item em txtTit2', () => {
  const page = `<html><body>
    <div class="txtTopo">MERCADO EXEMPLO</div>
    <div>CNPJ: 12.345.678/0001-90</div>
    <tr><td><span class="txtTit2">ARROZ TIPO 1 5KG</span>
      <span class="RCod">(Código: 7891234567890)</span>
      <span class="Rqtd"><strong>Qtde.:</strong>1,0000</span>
      <span class="RUN"><strong>UN: </strong>UN</span>
      <span class="RvlUnit"><strong>Vl. Unit.:</strong>29,90</span></td>
      <td class="txtTit3 noWrap">Vl. Total <span class="valor">29,90</span></td></tr>
  </body></html>`;
  const n = parseNfceHtml(page);
  assert.strictEqual(n.items.length, 1);
  assert.deepStrictEqual(n.items[0], {
    name: 'ARROZ TIPO 1 5KG', code: '7891234567890', qty: 1,
    unit: 'UN', unitPrice: 29.9, total: 29.9
  });
  assert.strictEqual(n.market.cnpj, '12345678000190');
});

await test('origem não autorizada recebe 403', async () => {
  assert.strictEqual((await call('/stores', {}, 'https://evil.com')).status, 403);
  assert.strictEqual((await call('/stores')).status, 200);
});

await test('sync: grava e lê, valida código e formato', async () => {
  const body = JSON.stringify({ list: [{ id: '1', name: 'Leite' }], receipts: [] });
  assert.strictEqual((await (await call(`/sync/${CODE}`)).json()).data, null);
  assert.strictEqual((await call(`/sync/${CODE}`, { method: 'PUT', body })).status, 200);
  assert.deepStrictEqual((await (await call(`/sync/${CODE}`)).json()).data.list[0].name, 'Leite');
  assert.strictEqual((await call('/sync/curto')).status, 400);
  assert.strictEqual((await call(`/sync/${CODE}`, { method: 'PUT', body: '{"x":1}' })).status, 400);
  assert.strictEqual((await call(`/sync/${CODE}`, { method: 'PUT', body: 'nao json' })).status, 400);
  assert.strictEqual((await call(`/sync/${CODE}`, { method: 'PUT', body: JSON.stringify({ list: [], receipts: [], x: 'a'.repeat(1.6e6) }) })).status, 413);
  assert.ok([...kv.keys()].every(k => !k.includes(CODE)), 'o código não deve aparecer na chave do KV');
  const other = 'zzzzzzzzzzzzzzzzzzzzzzzz';
  assert.strictEqual((await (await call(`/sync/${other}`)).json()).data, null);
});

const realFetch = globalThis.fetch;
const mockFetch = handler => { globalThis.fetch = async (url, opts) => handler(String(url), opts); };
const page = (body, init = {}) => new Response(body, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' }, ...init });

await test('nfce: lê a nota e completa o nome pelo código de barras', async () => {
  mockFetch(url => {
    if (url.startsWith('http://www.fazenda.pr.gov.br/')) return page(html);
    if (url.includes('alternateIds_Ean:7891097104947')) return new Response(JSON.stringify([{ productName: 'Leite Piracanjuba Integral 1L' }]), { status: 206 });
    return new Response('[]', { status: 200 });
  });
  const res = await call('/nfce?url=' + encodeURIComponent('http://www.fazenda.pr.gov.br/nfce/qrcode?p=1'));
  assert.strictEqual(res.status, 200);
  const n = await res.json();
  assert.strictEqual(n.items.length, 3);
  assert.strictEqual(n.items[0].catalogName, 'Leite Piracanjuba Integral 1L');
  assert.strictEqual(n.items[2].catalogName, undefined);
});

await test('nfce: bloqueia hosts fora de .gov.br, inclusive em redirecionamentos', async () => {
  let hits = 0;
  mockFetch(url => {
    hits++;
    if (url.startsWith('https://a.sefaz.gov.br/')) return new Response(null, { status: 302, headers: { Location: 'http://169.254.169.254/latest' } });
    return page(html);
  });
  assert.strictEqual((await call('/nfce?url=' + encodeURIComponent('https://evil.com/x'))).status, 400);
  assert.strictEqual(hits, 0);
  assert.strictEqual((await call('/nfce?url=' + encodeURIComponent('https://a.sefaz.gov.br/n'))).status, 502);
  assert.strictEqual(hits, 1);
});

await test('nfce: página sem itens devolve 422', async () => {
  mockFetch(() => page('<html>captcha</html>'));
  assert.strictEqual((await call('/nfce?url=' + encodeURIComponent('https://a.sefaz.gov.br/n'))).status, 422);
});

globalThis.fetch = realFetch;
console.log(`  ${passed} testes do servidor.`);
