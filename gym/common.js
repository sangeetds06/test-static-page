// Capability gym: shared helpers. Every gym page records what the agent submits in
// localStorage under one key (gymState.v1) so a reviewer can inspect it on gym/summary.html.
// Add ?reset=1 to any gym page URL to clear the recorded state.
(function (root) {
  'use strict';
  const STATE_KEY = 'gymState.v1';

  function emptyState() {
    return { cases: {}, events: [] };
  }

  function loadState() {
    try {
      const raw = root.localStorage && root.localStorage.getItem(STATE_KEY);
      return raw ? Object.assign(emptyState(), JSON.parse(raw)) : emptyState();
    } catch (e) {
      return emptyState();
    }
  }

  function saveState(state) {
    try { root.localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  function nowIso() { return new Date().toISOString(); }

  // Append a recorded event; for kind === 'submission' also keep it as the case's latest submission.
  function record(caseName, kind, payload) {
    const s = loadState();
    const entry = { at: nowIso(), case: caseName, kind: kind, data: payload === undefined ? null : payload };
    s.events.push(entry);
    const c = s.cases[caseName] || (s.cases[caseName] = { submissions: [] });
    if (kind === 'submission') c.submissions.push(entry);
    saveState(s);
    return entry;
  }

  function resetIfRequested() {
    if (!root.location) return;
    const params = new URLSearchParams(root.location.search);
    if (params.get('reset') !== '1') return;
    try { root.localStorage.removeItem(STATE_KEY); } catch (e) { /* ignore */ }
    try { root.sessionStorage.clear(); } catch (e) { /* ignore */ }
    params.delete('reset');
    const qs = params.toString();
    root.history.replaceState(null, '', root.location.pathname + (qs ? '?' + qs : ''));
    root.__gymWasReset = true;
  }

  // Deterministic PRNG (mulberry32) so data is reproducible from a seed.
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function pick(r, arr) { return arr[Math.floor(r() * arr.length)]; }
  function intBetween(r, lo, hi) { return lo + Math.floor(r() * (hi - lo + 1)); }
  function shuffle(r, arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // FNV-1a string hash, base36, for short deterministic references.
  function hash(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h.toString(36).toUpperCase();
  }

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function pad(n) { return String(n).padStart(2, '0'); }
  function isoDate(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function ukDate(iso) { const p = iso.split('-'); return p[2] + '/' + p[1] + '/' + p[0]; }
  function addDays(iso, n) {
    const p = iso.split('-').map(Number);
    const d = new Date(Date.UTC(p[0], p[1] - 1, p[2] + n));
    return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
  }

  function money(n, cur) {
    const s = Math.abs(n).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return (n < 0 ? '-' : '') + (cur || '€') + s;
  }

  function sleep(ms) { return new Promise(function (res) { setTimeout(res, ms); }); }

  root.Gym = {
    STATE_KEY: STATE_KEY, loadState: loadState, saveState: saveState, record: record,
    rng: rng, pick: pick, intBetween: intBetween, shuffle: shuffle, hash: hash, esc: esc,
    pad: pad, isoDate: isoDate, ukDate: ukDate, addDays: addDays, money: money, sleep: sleep,
  };

  resetIfRequested();
})(typeof window !== 'undefined' ? window : globalThis);
