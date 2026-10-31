/* Importação dos itens de uma NFC-e a partir do QR Code (via proxy), com nomes legíveis. */

const NFCE_UNITS = /^(\d+(?:[.,]\d+)?)(kg|g|ml|l|un|mg)$/i;
const NFCE_SMALL_WORDS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'c', 'com', 'em', 'p', 'para']);

// "LEITE UHT INT 1L PIRACANJUBA" -> "Leite Uht Int 1L Piracanjuba"
function prettyName(raw) {
  return String(raw).toLowerCase().split(/\s+/).filter(Boolean).map((w, i) => {
    const u = w.match(NFCE_UNITS);
    if (u) return u[1] + (u[2].toLowerCase() === 'l' ? 'L' : u[2].toLowerCase());
    if (i > 0 && NFCE_SMALL_WORDS.has(w)) return w;
    return w.charAt(0).toUpperCase() + w.slice(1);
  }).join(' ');
}

// Valida a resposta do proxy: nada vindo da rede é usado sem checagem
function sanitizeNfce(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.items)) return null;
  const items = raw.items.slice(0, 300).map(i => ({
    name: str(i && i.name, 120),
    catalogName: str(i && i.catalogName, 120),
    qty: num(i && i.qty, 0, 99999) || 0,
    unitPrice: num(i && i.unitPrice, 0, 1e6) || 0,
    total: num(i && i.total, 0, 1e7) || 0
  })).filter(i => i.name && i.qty > 0 && (i.unitPrice > 0 || i.total > 0));
  if (!items.length) return null;
  const m = raw.market && typeof raw.market === 'object' ? raw.market : {};
  return {
    items,
    market: { name: str(m.name, 80), cnpj: str(m.cnpj, 30).replace(/\D/g, '').slice(0, 14) },
    date: /^\d{4}-\d{2}-\d{2}$/.test(raw.date) ? raw.date : ''
  };
}

async function fetchNfce(url) {
  const base = apiBase();
  const res = await fetch(`${base}/nfce?url=${encodeURIComponent(url)}`);
  if (!res.ok) {
    let msg = '';
    try { msg = (await res.json()).error; } catch (e) { /* sem corpo */ }
    throw new Error(msg || `Servidor respondeu ${res.status}`);
  }
  const nota = sanitizeNfce(await res.json());
  if (!nota) throw new Error('Resposta inesperada do servidor');
  return nota;
}

// Converte os itens da nota em linhas do rascunho. Itens pesados (qtd fracionada, ex.: 0,523 kg)
// viram 1 unidade com o valor total da linha, porque o app trabalha com quantidades inteiras.
function nfceToRows(nota) {
  const known = new Map(knownNames().map(n => [norm(n), n]));
  const fmt = v => v.toFixed(2).replace('.', ',');
  return nota.items.map(i => {
    const wanted = i.catalogName || prettyName(i.name);
    const name = (known.get(norm(wanted)) || wanted).slice(0, 80);
    const whole = Number.isInteger(i.qty);
    const price = whole ? (i.unitPrice || i.total / i.qty) : (i.total || i.unitPrice * i.qty);
    return { name, qty: String(whole ? i.qty : 1), price: fmt(price) };
  });
}

function matchMarketByNota(nota) {
  const byCnpj = nota.market.cnpj && state.markets.find(m => m.cnpj === nota.market.cnpj);
  if (byCnpj) return byCnpj;
  const emitter = norm(nota.market.name);
  return emitter ? state.markets.find(m => emitter.includes(norm(m.name))) || null : null;
}
