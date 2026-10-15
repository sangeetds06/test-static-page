// mock-SCM: read-only plan records. Plan reference = last 7 digits of the Pega
// plan number with no leading zero (e.g. 0900712345 -> 712345).

let DATA = null;
async function data() {
  if (!DATA) DATA = await loadJson('plans');
  return DATA;
}

const MENU = [
  ['summary', 'Plan Summary'],
  ['charges', 'Policy Charges'],
  ['value', 'Policy Value'],
  ['investment', 'Plan Investment'],
  ['premiums', 'Premium Plan Summary'],
];

function scmTop(user) {
  return `<header class="scm-top"><strong>SCM</strong><span>Servicing &amp; Contract Management (mock)</span>
    <a href="index.html">Plan search</a><span class="spacer"></span><span>${esc(user.displayName)}</span></header>`;
}

function mountScm(user, inner, plan, active) {
  const menu = plan
    ? `<nav class="scm-menu" aria-label="Plan menu">${MENU.map(([k, label]) => `<a href="plan.html?plan=${esc(plan.planRef)}&tab=${k}" class="${k === active ? 'active' : ''}" ${k === active ? 'aria-current="page"' : ''}>${label}</a>`).join('')}</nav>`
    : '';
  document.body.className = 'scm';
  document.body.innerHTML = scmTop(user) + `<div class="scm-layout">${menu}<main class="scm-main">${inner}</main></div>`;
}

function planBar(p) {
  return `<div class="scm-plan-bar">Plan <strong id="plan-ref">${esc(p.planRef)}</strong> · ${esc(p.productName)} · ${esc(p.holder.name)} · Status: <strong>${esc(p.status)}</strong></div>`;
}

function valuationAt(p, date) {
  const target = parseUkDate(date);
  const sorted = [...p.valuations].sort((a, b) => parseUkDate(a.date) - parseUkDate(b.date));
  let pick = null;
  for (const v of sorted) if (parseUkDate(v.date) <= target) pick = v;
  return pick;
}

function kv(rows) {
  return `<table class="kv" style="width:auto;min-width:520px">${rows.map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td>${v}</td></tr>`).join('')}</table>`;
}

// ---------- pages ----------

async function pageSearch(user) {
  const q = (params.get('ref') || '').trim();
  let msg = '';
  if (q) {
    const d = await data();
    if (!/^[1-9]\d{5,6}$/.test(q)) msg = '<div class="error" role="alert">Invalid plan reference. Enter the plan reference without leading zeros (6-7 digits).</div>';
    else if (!d.plans[q]) msg = `<div class="error" role="alert">No plan found for reference ${esc(q)}.</div>`;
    else {
      audit('scm', 'plan-search', q);
      location.replace(`plan.html?plan=${encodeURIComponent(q)}&tab=summary`);
      return;
    }
    audit('scm', 'plan-search-failed', q);
  }
  mountScm(user, `
    <h1>Plan search</h1>
    ${msg}
    <form id="search-form" class="panel">
      <label for="ref"><strong>Plan reference</strong></label>
      <input type="text" id="ref" name="ref" value="${esc(q)}" maxlength="10">
      <button type="submit">Search</button>
    </form>`);
  document.getElementById('search-form').addEventListener('submit', e => {
    e.preventDefault();
    location.href = `index.html?ref=${encodeURIComponent(e.target.ref.value.trim())}`;
  });
}

async function pagePlan(user) {
  const d = await data();
  const p = d.plans[params.get('plan')];
  const tab = params.get('tab') || 'summary';
  if (!p) { mountScm(user, '<div class="error">Plan not found. <a href="index.html">Back to plan search</a></div>'); return; }
  audit('scm', 'view-tab', `${p.planRef} ${tab}`);
  const fund = code => d.funds[code] || { name: `Fund ${code}` };
  let inner = '';

  if (tab === 'summary') {
    inner = `<h1>Plan Summary</h1>${kv([
      ['Plan reference', esc(p.planRef)],
      ['Product', esc(p.productName)],
      ['Plan version', esc(p.planVersion)],
      ['Plan status', esc(p.status)],
      ['Start date', esc(p.startDate)],
      ['Planholder name', `<span data-field="holderName">${esc(p.holder.name)}</span>`],
      ['National Insurance number', `<span data-field="holderNi">${esc(p.holder.niNumber)}</span>`],
      ['Date of birth', `<span data-field="holderDob">${esc(p.holder.dob)}</span>`],
      ['Correspondence address', esc(p.holder.address)],
      ['Adviser / agency', p.adviser ? `${esc(p.adviser.name)} (${esc(p.adviser.agency)}) since ${esc(p.adviser.since)}` : 'None recorded'],
      ['Scheme employer', p.employer ? `${esc(p.employer.name)} · ${esc(p.employer.scheme)} (${esc(p.employer.schemeRef)}) · ${esc(p.employer.frequency)}` : 'Not a workplace plan'],
      ['Third-party authorities / power of attorney', p.authorities.length ? p.authorities.map(a => esc(`${a.type}: ${a.name}`)).join('<br>') : 'None recorded'],
      ['Salary sacrifice', esc(p.salarySacrifice)],
      ['Linked plans (same customer)', p.linkedPlans.length ? p.linkedPlans.map(l => `<a href="plan.html?plan=${esc(l.planRef)}&tab=summary">${esc(l.planRef)}</a> ${esc(l.productName)} (${esc(l.status)})`).join('<br>') : 'None'],
    ])}
    <h2>Plan notes</h2>
    ${p.planNotes.length ? `<table><thead><tr><th>Date</th><th>Note</th></tr></thead><tbody>${p.planNotes.map(n => `<tr><td>${esc(n.date)}</td><td>${esc(n.text)}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">No plan notes.</p>'}`;
  }

  if (tab === 'charges') {
    inner = `<h1>Policy Charges</h1>
    <p class="muted">A blank rate means the charge does not apply. Rebates are shown as negative (credits).</p>
    <table id="charges-table"><thead><tr><th>Charge</th><th>Rate</th><th>Basis</th><th>Notes</th></tr></thead>
    <tbody>${p.charges.map(c => `<tr><td>${esc(c.charge)}</td><td>${esc(c.rate)}</td><td>${esc(c.basis)}</td><td>${esc(c.notes)}</td></tr>`).join('')}</tbody></table>
    <h2>Historic charges</h2>
    ${p.historicCharges.length ? `<table><thead><tr><th>Charge</th><th>Rate</th><th>From</th><th>To</th></tr></thead><tbody>${p.historicCharges.map(c => `<tr><td>${esc(c.charge)}</td><td>${esc(c.rate)}</td><td>${esc(c.from)}</td><td>${esc(c.to)}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">None.</p>'}`;
  }

  if (tab === 'value') {
    const date = params.get('date') || d.valuationDate;
    const valid = parseUkDate(date);
    const v = valid ? valuationAt(p, date) : null;
    let table = '';
    if (!valid) table = '<div class="error" role="alert">Enter the valuation date as dd/mm/yyyy.</div>';
    else if (!v) table = `<div class="error" role="alert">No valuation available on ${esc(date)}.</div>`;
    else {
      const rows = v.funds.map(f => ({ ...f, value: f.units * f.price }));
      const total = rows.reduce((s, r) => s + r.value, 0);
      table = `<table id="value-table"><thead><tr><th>Fund no.</th><th>Fund name</th><th>Units</th><th>Unit price</th><th>Value</th></tr></thead>
      <tbody>${rows.map(r => `<tr><td>${esc(r.fund)}</td><td>${esc(fund(r.fund).name)}</td><td class="${r.units < 0 ? 'neg' : ''}">${units(r.units)}</td><td>£${r.price.toFixed(4)}</td><td class="${r.value < 0 ? 'neg' : ''}">${money(r.value)}</td></tr>`).join('')}</tbody>
      <tfoot><tr><th colspan="4">Total plan value at ${esc(date)}</th><th id="total-value">${money(total)}</th></tr></tfoot></table>`;
    }
    inner = `<h1>Policy Value</h1>
    <form id="value-form" class="panel">
      <label for="val-date"><strong>Valuation date</strong> (dd/mm/yyyy)</label>
      <input type="text" id="val-date" name="date" value="${esc(date)}" size="12" placeholder="dd/mm/yyyy">
      <button type="submit" id="refresh-btn">Refresh</button>
    </form>${table}`;
  }

  if (tab === 'investment') {
    inner = `<h1>Plan Investment</h1>
    <table id="investment-table"><thead><tr><th>Fund no.</th><th>Fund name</th><th>Status</th><th>Closed date</th><th></th></tr></thead>
    <tbody>${p.investments.map(i => `<tr><td>${esc(i.fund)}</td><td>${esc(fund(i.fund).name)}</td><td>${esc(i.status)}</td><td>${esc(i.closedDate || '')}</td><td><a href="plan.html?plan=${esc(p.planRef)}&tab=fund&fund=${esc(i.fund)}">Fund details</a></td></tr>`).join('')}</tbody></table>
    <h2>Transactions</h2>
    ${p.transactions.length ? `<table><thead><tr><th>Date</th><th>Type</th><th>Amount</th></tr></thead><tbody>${p.transactions.map(t => `<tr><td>${esc(t.date)}</td><td>${esc(t.type)}</td><td>${esc(t.amount)}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">No recent transactions.</p>'}`;
  }

  if (tab === 'fund') {
    const code = params.get('fund');
    const f = d.funds[code];
    inner = f ? `<h1>Fund</h1>${kv([
      ['Fund number', esc(code)],
      ['Fund name', esc(f.name)],
      ['Mnemonic', `<span data-field="mnemonic">${esc(f.mnemonic)}</span>`],
      ['Mirror fund', f.mirrorOf ? 'Yes' : 'No'],
      ['Underlying (main) fund', esc(f.mirrorOf || f.name)],
      ['Fund range', esc(f.range)],
      ['Factsheet', `Search the Aegon funds website (${esc(f.range)} range) for "${esc(f.mirrorOf || f.name)}"`],
    ])}<p><a href="plan.html?plan=${esc(p.planRef)}&tab=investment">Back to Plan Investment</a></p>` : '<div class="error">Fund not found.</div>';
  }

  if (tab === 'premiums') {
    inner = `<h1>Premium Plan Summary</h1>
    ${p.premiums.length ? `<table id="premiums-table"><thead><tr><th>Period</th><th>Due date</th><th>Date received</th><th>Employee</th><th>Employer</th><th>Type</th></tr></thead>
    <tbody>${p.premiums.map(r => `<tr><td>${esc(r.period)}</td><td>${esc(r.due)}</td><td>${esc(r.received || '-')}</td><td>${esc(r.employee || '-')}</td><td>${esc(r.employer || '-')}</td><td>${esc(r.type)}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">No regular premiums on this plan.</p>'}`;
  }

  mountScm(user, planBar(p) + inner, p, tab === 'fund' ? 'investment' : tab);

  const vf = document.getElementById('value-form');
  if (vf) vf.addEventListener('submit', e => {
    e.preventDefault();
    location.href = `plan.html?plan=${encodeURIComponent(p.planRef)}&tab=value&date=${encodeURIComponent(e.target.date.value.trim())}`;
  });
}

(async function main() {
  const page = document.body.dataset.page;
  const user = currentUser('scm');
  if (page === 'search') return pageSearch(user);
  if (page === 'plan') return pagePlan(user);
})();
