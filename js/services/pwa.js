let deferredInstall = null;

// O service worker só funciona em https ou localhost (não em file://)
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { /* sem offline */ }));
}

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredInstall = e;
  if (tab === 'settings') render();
});
window.addEventListener('appinstalled', () => { deferredInstall = null; });

async function installApp() {
  if (!deferredInstall) return;
  deferredInstall.prompt();
  await deferredInstall.userChoice;
  deferredInstall = null;
  render();
}

// Pede ao navegador para não apagar os dados salvos quando faltar espaço
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => { /* ignora */ });
