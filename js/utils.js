const dayMs = 86400000;

const $ = s => document.querySelector(s);
const brl = n => (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const norm = s => String(s).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const fmtDate = d => new Date(d).toLocaleDateString('pt-BR');
const safeHttp = u => (typeof u === 'string' && /^https?:\/\//i.test(u.trim()) ? u.trim().slice(0, 600) : '');

function seeded(seed) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

// Aceita "1.234,56", "12,5", "R$ 3" e devolve número ou null
function parseMoney(v) {
  let s = String(v ?? '').replace(/R\$|\s/g, '');
  if (!s) return null;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

const pad2 = n => String(n).padStart(2, '0');
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
const isoToTs = iso => new Date(`${iso}T12:00:00`).getTime();

function fmtCnpj(c) {
  return /^\d{14}$/.test(c) ? c.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : c;
}

function download(filename, text, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(toast.h);
  toast.h = setTimeout(() => t.classList.add('hidden'), 2600);
}
