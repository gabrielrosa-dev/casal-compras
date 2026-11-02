// Leitura de NFC-e: validação da URL do QR Code e extração dos itens da página da SEFAZ.
// Portais NFC-e usam variantes como "txtTit" e "txtTit2" para o nome do item.

const ENTITIES = {
  nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
  ccedil: 'ç', Ccedil: 'Ç', atilde: 'ã', otilde: 'õ', Atilde: 'Ã', Otilde: 'Õ',
  aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú',
  Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú',
  acirc: 'â', ecirc: 'ê', ocirc: 'ô', agrave: 'à', Acirc: 'Â', Ecirc: 'Ê', Ocirc: 'Ô'
};

const decode = s => s
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
  .replace(/&([a-zA-Z]+);/g, (m, n) => (n in ENTITIES ? ENTITIES[n] : ' '));

const plain = s => decode(String(s).replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

// "1.234,56" -> 1234.56 · "2,0000" -> 2
export function brNum(s) {
  const t = String(s || '').replace(/[^\d.,]/g, '');
  if (!t) return null;
  const n = t.includes(',') ? parseFloat(t.replace(/\./g, '').replace(',', '.')) : parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

// Só aceita endereços https/http de domínios .gov.br (evita usar o proxy para acessar qualquer site)
export function isAllowedNfceUrl(raw) {
  let u;
  try { u = new URL(raw); } catch (e) { return false; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
  if (u.username || u.password || u.port) return false;
  return u.hostname.endsWith('.gov.br') && /^[a-z0-9.-]+$/.test(u.hostname);
}

function span(block, cls) {
  const m = block.match(new RegExp(`<span[^>]*class="[^"]*\\b${cls}\\b[^"]*"[^>]*>([\\s\\S]*?)</span>`, 'i'));
  return m ? plain(m[1]) : '';
}

export function parseNfceHtml(html) {
  const items = [];
  for (const block of html.split(/<tr\b/i)) {
    if (!/txtTit/.test(block) || !/Rqtd/.test(block)) continue;
    const name = span(block, 'txtTit2') || span(block, 'txtTit');
    const qty = brNum(span(block, 'Rqtd').replace(/^[^:]*:/, ''));
    const unitPrice = brNum(span(block, 'RvlUnit').replace(/^[^:]*:/, ''));
    const total = brNum(span(block, 'valor'));
    if (!name || !(qty > 0) || !(unitPrice > 0 || total > 0)) continue;
    const code = (span(block, 'RCod').match(/\d{6,14}/) || [''])[0];
    items.push({
      name: name.slice(0, 120),
      code,
      qty,
      unit: span(block, 'RUN').replace(/^[^:]*:/, '').trim().slice(0, 6),
      unitPrice: unitPrice > 0 ? unitPrice : +(total / qty).toFixed(2),
      total: total > 0 ? total : +(qty * unitPrice).toFixed(2)
    });
  }

  const top = html.match(/class="[^"]*txtTopo[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  const cnpj = (plain(html).match(/CNPJ:?\s*(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})/i) || ['', ''])[1].replace(/\D/g, '');
  const d = plain(html).match(/Emiss[ãa]o:?\s*(\d{2})\/(\d{2})\/(\d{4})/i);
  const totalNote = brNum(span(html, 'totalNumb'));

  return {
    market: { name: top ? plain(top[1]).slice(0, 80) : '', cnpj },
    date: d ? `${d[3]}-${d[2]}-${d[1]}` : '',
    total: totalNote,
    items
  };
}
