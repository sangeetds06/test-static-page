// Shared state and helpers for the Aegon mock sites (mock-Pega and mock-SCM).
// All state lives in localStorage under one key, so both apps (same origin) see it.
// Every fresh browser starts clean; ?reset=1 on any page clears it.

const STATE_KEY = 'aegonMock.v1';
const RESOLVE_DELAY_MS = 4000;

function emptyState() {
  return { cases: {}, pin: null, audit: [] };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    return raw ? { ...emptyState(), ...JSON.parse(raw) } : emptyState();
  } catch (e) {
    return emptyState();
  }
}

function saveState(state) {
  try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
}

function updateState(fn) {
  const state = loadState();
  fn(state);
  saveState(state);
  return state;
}

function audit(app, event, detail) {
  updateState(s => s.audit.push({ at: nowStamp(), app, event, detail: detail || '' }));
}

const params = new URLSearchParams(location.search);
if (params.get('reset') === '1') {
  localStorage.removeItem(STATE_KEY);
  // Drop reset from the URL so a reload doesn't reset again.
  const clean = new URLSearchParams(location.search);
  clean.delete('reset');
  history.replaceState(null, '', location.pathname + (clean.toString() ? `?${clean}` : ''));
}

async function loadJson(name) {
  const res = await fetch(`../data/${name}.json`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to load ${name}.json`);
  return res.json();
}

function pad(n) { return String(n).padStart(2, '0'); }

function nowStamp() {
  const d = new Date();
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function parseUkDate(s) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec((s || '').trim());
  if (!m) return null;
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  return d.getDate() === Number(m[1]) && d.getMonth() === Number(m[2]) - 1 ? d : null;
}

function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function money(n) {
  const sign = n < 0 ? '-' : '';
  return `${sign}£${Math.abs(n).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function units(n) {
  return n.toLocaleString('en-GB', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}

// No login: every visitor works as the default operator for each app.
const DEFAULT_USERS = {
  pega: { username: 'atos.op1', displayName: 'Atos Operator 1', role: 'Servicing user', workbasket: 'ASQ Servicing' },
  scm: { username: 'scm.read1', displayName: 'SCM Read-only 1', role: '', workbasket: '' },
};

function currentUser(app) {
  return DEFAULT_USERS[app];
}

function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}
