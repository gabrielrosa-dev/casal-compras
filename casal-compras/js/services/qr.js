const JSQR_URL = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
let qrDetector = null;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error('Falha ao carregar o leitor de QR'));
    document.head.appendChild(s);
  });
}

// Extrai a chave de acesso (44 dígitos) e o CNPJ do emitente de um QR Code de NFC-e.
// Layout da chave: UF(2) AAMM(4) CNPJ(14) modelo(2) série(3) número(9) ...
function parseNfce(text) {
  const t = String(text || '').trim();
  const chave = (t.match(/\d{44}/) || [''])[0];
  const url = safeHttp(t);
  return { ok: !!(chave || url), chave, cnpj: chave ? chave.slice(6, 20) : '', url };
}

// Lê um QR de um <video>, imagem ou ImageBitmap. Usa BarcodeDetector quando existe
// (Chrome/Android) e cai para a biblioteca jsQR nos demais navegadores.
async function decodeQr(source, width, height) {
  if ('BarcodeDetector' in window) {
    try {
      qrDetector = qrDetector || new BarcodeDetector({ formats: ['qr_code'] });
      const found = await qrDetector.detect(source);
      return found.length ? found[0].rawValue : null;
    } catch (e) { /* cai para jsQR */ }
  }
  if (!window.jsQR) await loadScript(JSQR_URL);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(source, 0, 0, width, height);
  const img = ctx.getImageData(0, 0, width, height);
  const r = window.jsQR(img.data, width, height);
  return r ? r.data : null;
}

async function decodeQrFile(file) {
  const bmp = await createImageBitmap(file);
  try { return await decodeQr(bmp, bmp.width, bmp.height); } finally { bmp.close(); }
}

async function openQrScanner(onText) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    toast('Câmera indisponível aqui. Use "Enviar foto".');
    return;
  }
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
  } catch (e) {
    toast('Permissão da câmera negada. Use "Enviar foto".');
    return;
  }

  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 z-[60] bg-black flex flex-col';
  overlay.innerHTML = `
    <div class="relative flex-1">
      <video class="absolute inset-0 w-full h-full object-cover" playsinline muted></video>
      <div class="absolute inset-10 border-2 border-pink-400 rounded-2xl pointer-events-none"></div>
    </div>
    <div class="p-4 safe-bottom text-center bg-black">
      <p class="text-white/80 text-sm mb-3">Aponte para o QR Code do cupom fiscal</p>
      <button type="button" class="tap bg-white text-gray-900 font-bold rounded-xl px-8 py-3">Cancelar</button>
    </div>`;
  document.body.appendChild(overlay);

  const video = overlay.querySelector('video');
  video.srcObject = stream;
  let active = true;
  const close = () => {
    active = false;
    stream.getTracks().forEach(t => t.stop());
    overlay.remove();
  };
  overlay.querySelector('button').addEventListener('click', close);
  try { await video.play(); } catch (e) { /* o autoplay já cobre */ }

  const tick = async () => {
    if (!active) return;
    if (video.readyState >= 2 && video.videoWidth) {
      try {
        const text = await decodeQr(video, video.videoWidth, video.videoHeight);
        if (text && active) { close(); onText(text); return; }
      } catch (e) { /* tenta no próximo quadro */ }
    }
    setTimeout(tick, 250);
  };
  tick();
}
