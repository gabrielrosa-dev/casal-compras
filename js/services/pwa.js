let deferredInstall = null;

// O service worker só funciona em https ou localhost (não em file://)
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { /* sem offline */ }));
}

const isStandalone = () => (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
const INSTALL_DISMISS_KEY = 'casalcompras.installDismissed';

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredInstall = e;
  render();
});
window.addEventListener('appinstalled', () => { deferredInstall = null; render(); });

async function installApp() {
  if (!deferredInstall) return;
  deferredInstall.prompt();
  await deferredInstall.userChoice;
  deferredInstall = null;
  render();
}

// Passo a passo manual para navegadores que não oferecem o botão de instalar
function installSteps() {
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'Toque em <b>Compartilhar</b> (quadrado com seta) → <b>Adicionar à Tela de Início</b>. Precisa ser no Safari.';
  if (/SamsungBrowser/i.test(ua)) return 'Toque no menu <b>☰</b> → <b>Adicionar página a</b> → <b>Tela inicial</b> (ou no ícone de instalar ao lado da barra de endereço).';
  return 'Toque no menu <b>⋮</b> → <b>Instalar aplicativo</b> (ou <b>Adicionar à tela inicial</b>).';
}

function installBanner() {
  let dismissed = false;
  try { dismissed = !!localStorage.getItem(INSTALL_DISMISS_KEY); } catch (e) { /* ignora */ }
  if (isStandalone() || dismissed) return '';
  return `<div class="rounded-2xl bg-gradient-to-r from-violet-600 to-pink-500 text-white p-4 mb-4 shadow-lg">
    <div class="flex items-start gap-3">
      <i data-lucide="smartphone" class="w-6 h-6 shrink-0 mt-0.5"></i>
      <div class="min-w-0 flex-1">
        <p class="font-bold">Instale o app no celular</p>
        ${deferredInstall
          ? '<p class="text-sm text-white/90">Abre em tela cheia, funciona offline e fica na tela inicial.</p>'
          : `<p class="text-sm text-white/90">${installSteps()}</p>`}
      </div>
      <button data-act="dismissInstall" aria-label="Dispensar" class="tap p-1 text-white/80"><i data-lucide="x" class="w-5 h-5"></i></button>
    </div>
    ${deferredInstall ? '<button data-act="installApp" class="tap mt-3 w-full bg-white text-violet-700 font-bold rounded-xl py-3 flex items-center justify-center gap-2"><i data-lucide="download" class="w-5 h-5"></i>Instalar agora</button>' : ''}
  </div>`;
}

// Pede ao navegador para não apagar os dados salvos quando faltar espaço
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => { /* ignora */ });
