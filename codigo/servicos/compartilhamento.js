async function sendText(text, title) {
  if (navigator.share) {
    try { await navigator.share({ title, text }); return; }
    catch (e) { if (e.name === 'AbortError') return; }
  }
  try {
    await navigator.clipboard.writeText(text);
    toast('Copiado. Cole no WhatsApp.');
  } catch (e) {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  }
}

const shareList = () => sendText(shareText(), 'Lista de compras');
