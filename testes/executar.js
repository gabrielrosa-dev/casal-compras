// Uso: node testes/executar.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { pathToFileURL } = require('url');
const { makeContext } = require('./suporte');

(async () => {
  console.log('App (lógica e telas)');
  const ctx = makeContext();
  const cases = fs.readFileSync(path.join(__dirname, 'casos.js'), 'utf8');
  await vm.runInContext(`(async () => {\n${cases}\n})()`, ctx, { filename: 'testes/casos.js' });

  console.log('\nSincronização entre aparelhos');
  await require('./sincronizacao.test.js')();

  console.log('\nServidor (worker)');
  await import(pathToFileURL(path.join(__dirname, 'servidor.test.mjs')).href);

  console.log('\nTodos os testes passaram.');
})().catch(e => {
  console.error('\nFALHOU:', e && e.stack ? e.stack : e);
  process.exit(1);
});
