// Cria um contexto isolado com os scripts do app (na ordem do index.html) e um DOM mínimo simulado.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const scripts = [...fs.readFileSync(path.join(root, 'index.html'), 'utf8').matchAll(/<script src="(js\/[^"]+)"/g)].map(m => m[1]);

function makeContext({ fetchImpl } = {}) {
  const els = {};
  const store = {};
  const mkEl = () => ({
    innerHTML: '', textContent: '', value: '', dataset: {}, files: [],
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    click() {}, focus() {}
  });
  const htmlClasses = new Set();

  const sandbox = {
    console, setTimeout: () => 0, clearTimeout() {}, URL, Blob, Request, AbortSignal, Promise, TextEncoder, btoa,
    crypto: require('crypto').webcrypto,
    setInterval: (fn, ms) => { const t = setInterval(fn, ms); t.unref(); return t; },
    document: {
      hidden: false,
      activeElement: null,
      querySelector: s => els[s] || (els[s] = mkEl()),
      querySelectorAll: () => [],
      addEventListener() {},
      createElement: mkEl,
      head: { appendChild() {} },
      body: { appendChild() {} },
      documentElement: { classList: { contains: c => htmlClasses.has(c), toggle(c, f) { f ? htmlClasses.add(c) : htmlClasses.delete(c); } } }
    },
    localStorage: {
      getItem: k => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: k => { delete store[k]; }
    },
    navigator: {},
    location: { protocol: 'file:', hostname: '', href: 'https://casal.github.io/app/', hash: '', pathname: '/app/', search: '' },
    history: { replaceState() {} },
    lucide: { createIcons() {} },
    confirm: () => true,
    prompt: () => null,
    tailwind: {},
    require
  };
  if (fetchImpl) sandbox.fetch = fetchImpl;
  sandbox.window = { scrollTo() {}, addEventListener() {}, matchMedia: () => ({ matches: false }), open() {}, jsQR: null };
  sandbox.window.document = sandbox.document;
  vm.createContext(sandbox);
  for (const file of scripts) vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), sandbox, { filename: file });
  sandbox.__els = els;
  sandbox.__store = store;
  sandbox.run = code => vm.runInContext(code, sandbox);
  return sandbox;
}

module.exports = { makeContext };
