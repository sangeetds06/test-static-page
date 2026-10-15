// mock-Pega: case queue for Answer Service Query (ASQ) cases.
// Each HTML page sets <body data-page="..."> and this script renders it.

const CLOSED = s => s.startsWith('Resolved');
let SEED = null;

async function seedCases() {
  if (!SEED) SEED = (await loadJson('cases')).cases;
  return SEED;
}

function caseState(state, id) {
  if (!state.cases[id]) state.cases[id] = { notes: [], outbox: [], attachments: [] };
  return state.cases[id];
}

function currentStatus(seed, state) {
  const st = state.cases[seed.workId];
  if (!st || !st.status) return seed.status;
  if (st.status === 'Pending-Resolve' && st.resolveAt && Date.now() >= st.resolveAt) return 'Resolved-Completed';
  return st.status;
}

async function findCase(id) {
  return (await seedCases()).find(c => c.workId === id) || null;
}

function topbar(user) {
  return `
  <header class="pega-top">
    <span class="brand">Pega Customer Service <span class="muted">(mock)</span></span>
    <a href="index.html">Home</a>
    <a href="worksearch.html">Work search</a>
    <a href="knowledge.html">Knowledge Library</a>
    <span class="spacer"></span>
    <span>${esc(user.displayName)} · ${esc(user.workbasket)}</span>
  </header>`;
}

function mount(user, inner) {
  document.body.innerHTML = topbar(user) + `<main class="page">${inner}</main>`;
}

function caseHeader(c, status, st) {
  return `
  <section class="case-header" aria-label="Case header">
    <div class="toolbar">
      <h1 id="work-id">${esc(c.workId)} · ${esc(c.process)}</h1>
      ${actionsMenu(c, status)}
    </div>
    <dl>
      <dt>Work ID</dt><dd data-field="workId">${esc(c.workId)}</dd>
      <dt>Process</dt><dd data-field="process">${esc(c.process)}</dd>
      <dt>Sub-process</dt><dd data-field="subProcess">${esc(c.subProcess)}</dd>
      <dt>Plan number</dt><dd data-field="planNumber">${esc(c.planNumber)}</dd>
      <dt>Status</dt><dd data-field="status"><span class="status-badge">${esc(status)}</span></dd>
      <dt>Created</dt><dd>${esc(c.created)}</dd>
      <dt>SLA due</dt><dd>${esc(c.slaDue)}</dd>
      <dt>Assigned to</dt><dd>${esc((st && st.assignedTo) || '-')}</dd>
    </dl>
  </section>`;
}

function actionsMenu(c, status) {
  if (CLOSED(status)) return '<span class="muted">Case is closed</span>';
  const id = encodeURIComponent(c.workId);
  return `
  <div class="actions-menu">
    <button type="button" id="actions-btn" aria-haspopup="true" aria-expanded="false">Actions ▾</button>
    <ul role="menu" hidden id="actions-list">
      <li role="none"><a role="menuitem" href="perform.html?id=${id}">Perform work</a></li>
      <li role="none"><a role="menuitem" href="note.html?id=${id}">Attach › Note</a></li>
      <li role="none"><a role="menuitem" href="compose.html?id=${id}">Compose email</a></li>
      <li role="none"><a role="menuitem" href="refile.html?id=${id}">Re-file case</a></li>
      <li role="none"><a role="menuitem" href="pend.html?id=${id}">Pend and refer</a></li>
      <li role="none"><a role="menuitem" href="#" aria-disabled="true" class="muted">Generate correspondence (not available)</a></li>
    </ul>
  </div>`;
}

function wireActionsMenu() {
  const btn = document.getElementById('actions-btn');
  const list = document.getElementById('actions-list');
  if (!btn) return;
  btn.addEventListener('click', () => {
    list.hidden = !list.hidden;
    btn.setAttribute('aria-expanded', String(!list.hidden));
  });
}

// ---------- pages ----------

async function pageHome(user) {
  const pin = params.get('case');
  if (pin) updateState(s => { s.pin = pin; });
  const state = loadState();
  const cases = await seedCases();
  const mine = cases.filter(c => (state.cases[c.workId] || {}).assignedTo === user.username && !CLOSED(currentStatus(c, state)));
  const queued = cases.filter(c => currentStatus(c, state) === 'New').length;
  mount(user, `
    <h1>Home</h1>
    <div class="panel">
      <div class="toolbar">
        <div><strong>Workbasket:</strong> ${esc(user.workbasket)} · <strong>Role:</strong> ${esc(user.role)} · <span id="queue-count">${queued}</span> case(s) waiting</div>
        <button type="button" id="get-next">Get Next Work</button>
      </div>
      <div id="gnw-msg"></div>
    </div>
    <h2>My worklist</h2>
    <table id="worklist">
      <thead><tr><th>Work ID</th><th>Process</th><th>Plan number</th><th>Status</th><th>SLA due</th></tr></thead>
      <tbody>${mine.map(c => `<tr><td><a href="case.html?id=${esc(c.workId)}">${esc(c.workId)}</a></td><td>${esc(c.process)}</td><td>${esc(c.planNumber)}</td><td>${esc(currentStatus(c, state))}</td><td>${esc(c.slaDue)}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">No work assigned. Use Get Next Work.</td></tr>'}</tbody>
    </table>`);
  document.getElementById('get-next').addEventListener('click', () => getNextWork(user));
}

async function getNextWork(user) {
  const state = loadState();
  const cases = await seedCases();
  let pick = null;
  if (state.pin) {
    const p = cases.find(c => c.workId === state.pin);
    if (p && !CLOSED(currentStatus(p, state)) && !currentStatus(p, state).startsWith('Pending')) pick = p;
  }
  if (!pick) {
    pick = cases.filter(c => currentStatus(c, state) === 'New').sort((a, b) => b.priority - a.priority)[0];
  }
  if (!pick) {
    document.getElementById('gnw-msg').innerHTML = '<div class="success">No more work in your workbasket.</div>';
    return;
  }
  updateState(s => {
    const st = caseState(s, pick.workId);
    st.status = 'Open';
    st.assignedTo = user.username;
  });
  audit('pega', 'get-next-work', pick.workId);
  location.href = `case.html?id=${encodeURIComponent(pick.workId)}`;
}

function docViewerHtml(doc) {
  return `<!doctype html><html><head><style>body{margin:0;background:#8a8f94;font:13px Georgia,serif}.sheet{background:#fffdf7;margin:18px auto;max-width:560px;padding:36px 44px;box-shadow:0 2px 8px rgba(0,0,0,.4);white-space:pre-wrap}.meta{font:11px Arial;color:#ddd;text-align:center;padding-top:6px}</style></head><body><div class="meta">${esc(doc.name)} · page 1 of 1</div><div class="sheet">${esc(doc.content)}</div></body></html>`;
}

async function pageCase(user) {
  const id = params.get('id');
  const c = await findCase(id);
  if (!c) { mount(user, `<div class="error">Case ${esc(id)} not found.</div>`); return; }
  const state = loadState();
  const st = state.cases[c.workId] || { notes: [], outbox: [], attachments: [] };
  const status = currentStatus(c, state);
  const msg = params.get('msg');
  const notes = [...c.caseNotes.map(n => ({ ...n, title: '' })), ...(st.notes || [])];
  const r = c.requester;
  const tab = params.get('tab') || 'general';

  mount(user, `
    ${msg ? `<div class="success" role="status">${esc(msg)}</div>` : ''}
    ${caseHeader(c, status, st)}
    <div class="tabs" role="tablist">
      ${[['general', 'General display'], ['document', 'Document'], ['documents', 'Documents'], ['notes', 'Case notes'], ['attachments', 'Attachments']]
        .map(([k, label]) => `<button type="button" role="tab" id="tab-${k}" aria-controls="panel-${k}" aria-selected="${k === tab}">${label}</button>`).join('')}
    </div>

    <section role="tabpanel" id="panel-general" aria-labelledby="tab-general" ${tab === 'general' ? '' : 'hidden'}>
      <h3>Request</h3>
      <div class="field-row"><label>Channel</label><span data-field="channel">${esc(c.channel)}</span></div>
      <div class="field-row"><label>Source</label><span data-field="source">${esc(c.source)}</span></div>
      <h3>Requester</h3>
      <div class="field-row"><label>Name</label><span>${esc(r.name)}</span></div>
      ${r.organisation ? `<div class="field-row"><label>Organisation</label><span>${esc(r.organisation)}</span></div>` : ''}
      ${r.agencyNumber ? `<div class="field-row"><label>Agency number</label><span>${esc(r.agencyNumber)}</span></div>` : ''}
      ${r.relationship ? `<div class="field-row"><label>Relationship to customer</label><span>${esc(r.relationship)}</span></div>` : ''}
      <div class="field-row"><label>Email</label><span>${esc(r.email || '-')}</span></div>
      <div class="field-row"><label>Address</label><span>${esc(r.address || '-')}</span></div>
      <h3>Customer</h3>
      <div class="field-row"><label>Customer name</label><span data-field="customerName">${esc(c.customer.name)}</span></div>
      <div class="field-row"><label>National Insurance number</label><span data-field="niNumber">${esc(c.customer.niNumber)}</span></div>
      <div class="field-row"><label>Date of birth</label><span data-field="dob">${esc(c.customer.dob)}</span></div>
      <div class="field-row"><label>Address</label><span>${esc(c.customer.address)}</span></div>
      <h3>Reply</h3>
      <div class="field-row"><label>Reply-to email on file</label><span data-field="replyTo">${esc(c.replyTo || 'None - reply by post')}</span></div>
    </section>

    <section role="tabpanel" id="panel-document" aria-labelledby="tab-document" ${tab === 'document' ? '' : 'hidden'}>
      <h3>Document details</h3>
      ${c.documentDetails ? `<div class="pre" id="document-details">${esc(c.documentDetails)}</div>` : '<p class="muted">No document details captured for this case. See the Documents tab.</p>'}
    </section>

    <section role="tabpanel" id="panel-documents" aria-labelledby="tab-documents" ${tab === 'documents' ? '' : 'hidden'}>
      <table>
        <thead><tr><th>Document ID</th><th>Name</th><th>Type</th><th>Received</th><th></th></tr></thead>
        <tbody>${c.documents.map(d => `<tr><td>${esc(d.id)}</td><td>${esc(d.name)}</td><td>${esc(d.type)}</td><td>${esc(d.received)}</td><td><button type="button" class="secondary open-doc" data-doc="${esc(d.id)}">Open</button></td></tr>`).join('') || '<tr><td colspan="5" class="muted">No documents.</td></tr>'}</tbody>
      </table>
      <div id="viewer-wrap" hidden><h3 id="viewer-title">Document viewer</h3><iframe class="doc-viewer" id="doc-viewer" title="Document viewer"></iframe></div>
    </section>

    <section role="tabpanel" id="panel-notes" aria-labelledby="tab-notes" ${tab === 'notes' ? '' : 'hidden'}>
      <table>
        <thead><tr><th>Date</th><th>Author</th><th>Title</th><th>Note</th></tr></thead>
        <tbody>${notes.map(n => `<tr><td>${esc(n.date)}</td><td>${esc(n.author)}</td><td>${esc(n.title || '')}</td><td>${esc(n.text)}</td></tr>`).join('')}</tbody>
      </table>
    </section>

    <section role="tabpanel" id="panel-attachments" aria-labelledby="tab-attachments" ${tab === 'attachments' ? '' : 'hidden'}>
      <table>
        <thead><tr><th>Date</th><th>Type</th><th>Name</th><th>Added by</th></tr></thead>
        <tbody>${(st.attachments || []).map(a => `<tr><td>${esc(a.date)}</td><td>${esc(a.type)}</td><td>${esc(a.name)}</td><td>${esc(a.by)}</td></tr>`).join('') || '<tr><td colspan="4" class="muted">No attachments.</td></tr>'}</tbody>
      </table>
    </section>`);

  wireActionsMenu();
  document.querySelectorAll('[role=tab]').forEach(t => t.addEventListener('click', () => {
    document.querySelectorAll('[role=tab]').forEach(x => x.setAttribute('aria-selected', String(x === t)));
    document.querySelectorAll('[role=tabpanel]').forEach(p => { p.hidden = p.id !== t.getAttribute('aria-controls'); });
  }));
  document.querySelectorAll('.open-doc').forEach(b => b.addEventListener('click', () => {
    const doc = c.documents.find(d => d.id === b.dataset.doc);
    document.getElementById('viewer-wrap').hidden = false;
    document.getElementById('viewer-title').textContent = `Document viewer: ${doc.name}`;
    document.getElementById('doc-viewer').srcdoc = docViewerHtml(doc);
    audit('pega', 'open-document', `${c.workId} ${doc.id}`);
  }));
  if (status === 'Pending-Resolve') setTimeout(() => location.reload(), RESOLVE_DELAY_MS + 300);
}

async function caseFormPage(user, title, bodyHtml, onSubmit) {
  const id = params.get('id');
  const c = await findCase(id);
  if (!c) { mount(user, `<div class="error">Case ${esc(id)} not found.</div>`); return; }
  const state = loadState();
  const status = currentStatus(c, state);
  if (CLOSED(status)) { mount(user, `${caseHeader(c, status, state.cases[c.workId])}<div class="error">This case is closed.</div>`); return; }
  mount(user, `
    ${caseHeader(c, status, state.cases[c.workId])}
    <div class="panel">
      <h2>${esc(title)}</h2>
      <div id="form-errors" class="error" role="alert" hidden></div>
      <form id="case-form" novalidate>${bodyHtml(c)}
        <div class="field-row"><button type="submit" id="submit-btn">Submit</button> <a class="btn secondary" href="case.html?id=${encodeURIComponent(c.workId)}">Cancel</a></div>
      </form>
    </div>`);
  wireActionsMenu();
  const form = document.getElementById('case-form');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const errors = onSubmit(c, form, user);
    if (errors && errors.length) {
      const box = document.getElementById('form-errors');
      box.innerHTML = `<strong>Please correct the following:</strong><ul>${errors.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
      box.hidden = false;
    }
  });
}

function yesNo(name, label) {
  return `<fieldset class="field-row" style="border:none;padding:0"><legend style="font-weight:600">${esc(label)}</legend>
    <label style="min-width:0;font-weight:400"><input type="radio" name="${name}" value="Yes"> Yes</label>
    <label style="min-width:0;font-weight:400;margin-left:16px"><input type="radio" name="${name}" value="No"> No</label></fieldset>`;
}

function backToCase(c, msg, tab) {
  location.href = `case.html?id=${encodeURIComponent(c.workId)}&msg=${encodeURIComponent(msg)}${tab ? `&tab=${tab}` : ''}`;
}

async function pagePerform(user) {
  await caseFormPage(user, 'Perform work: case checklist', () => `
    ${yesNo('q_authorised', 'Is the requester authorised to receive information on this plan?')}
    ${yesNo('q_policyholder', 'Is the requester the policyholder?')}
    ${yesNo('q_otherplans', 'Does the customer hold any other plans?')}
    <div class="field-row"><label for="final_action">Final action</label>
      <select id="final_action" name="final_action"><option value="">-- Select --</option><option>Skip final action</option><option>Money to authorise</option><option>Send to check queue</option></select></div>
    <div class="field-row"><label for="charge_on_task">Charge on task</label>
      <select id="charge_on_task" name="charge_on_task"><option value="">-- Select --</option><option>No</option><option>Yes</option></select></div>`,
  (c, f, u) => {
    const v = n => (f.querySelector(`[name=${n}]:checked`) || f[n] || {}).value || '';
    const answers = { authorised: v('q_authorised'), policyholder: v('q_policyholder'), otherPlans: v('q_otherplans'), finalAction: f.final_action.value, chargeOnTask: f.charge_on_task.value };
    const errors = [];
    if (!answers.authorised) errors.push('Answer: Is the requester authorised?');
    if (!answers.policyholder) errors.push('Answer: Is the requester the policyholder?');
    if (!answers.otherPlans) errors.push('Answer: Does the customer hold any other plans?');
    if (!answers.finalAction) errors.push('Select a final action.');
    if (!answers.chargeOnTask) errors.push('Select charge on task.');
    if (errors.length) return errors;
    updateState(s => {
      const st = caseState(s, c.workId);
      st.perform = { ...answers, at: nowStamp(), by: u.username };
      st.status = answers.finalAction === 'Skip final action' ? 'Pending-Resolve' : 'Pending-Authorisation';
      st.resolveAt = Date.now() + RESOLVE_DELAY_MS;
    });
    audit('pega', 'perform-work', `${c.workId} ${JSON.stringify(answers)}`);
    backToCase(c, 'Perform work submitted.');
  });
}

async function pageNote(user) {
  await caseFormPage(user, 'Attach › Note', () => `
    <div class="field-row"><label for="note_title">Note name</label><input type="text" id="note_title" name="note_title" size="50"></div>
    <div class="field-row"><label for="note_text">Note</label><textarea id="note_text" name="note_text"></textarea></div>`,
  (c, f, u) => {
    const title = f.note_title.value.trim();
    const text = f.note_text.value.trim();
    if (!title || !text) return ['Enter a note name and the note text.'];
    updateState(s => {
      const st = caseState(s, c.workId);
      st.notes.push({ date: nowStamp(), author: u.displayName, title, text });
      st.attachments.push({ date: nowStamp(), type: 'Note', name: title, by: u.displayName });
    });
    audit('pega', 'add-note', `${c.workId} ${title}`);
    backToCase(c, 'Note added.', 'notes');
  });
}

async function pageCompose(user) {
  await caseFormPage(user, 'Compose email (team shared mailbox)', c => `
    <div class="field-row"><label for="email_to">To</label><input type="text" id="email_to" name="email_to" size="50" value="${esc(c.replyTo)}"></div>
    <div class="field-row"><label for="email_subject">Subject</label><input type="text" id="email_subject" name="email_subject" size="70" value="Your query about plan ${esc(c.planNumber)} (ref ${esc(c.workId)})"></div>
    <div class="field-row"><label for="email_body">Message</label><textarea id="email_body" name="email_body" style="min-height:240px"></textarea></div>
    <p class="muted">Sent emails are saved to the case attachments automatically.</p>`,
  (c, f, u) => {
    const to = f.email_to.value.trim();
    const subject = f.email_subject.value.trim();
    const body = f.email_body.value.trim();
    const errors = [];
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) errors.push('Enter a valid email address in To. If there is no email on file, reply by letter instead.');
    if (!subject) errors.push('Enter a subject.');
    if (body.length < 20) errors.push('Enter the message.');
    if (errors.length) return errors;
    updateState(s => {
      const st = caseState(s, c.workId);
      st.outbox.push({ at: nowStamp(), to, subject, body, by: u.username });
      st.attachments.push({ date: nowStamp(), type: 'Sent email', name: subject, by: u.displayName });
    });
    audit('pega', 'send-email', `${c.workId} to ${to}`);
    backToCase(c, `Email sent to ${to}.`, 'attachments');
  });
}

async function pageRefile(user) {
  await caseFormPage(user, 'Re-file case', () => `
    <div class="field-row"><label for="refile_process">Re-file to</label>
      <select id="refile_process" name="refile_process"><option value="">-- Select --</option><option>Indexing - re-index to correct plan</option><option>Answer Claims Query</option><option>Retirement Quote</option></select></div>
    <div class="field-row"><label for="refile_plan">Correct plan number (if known)</label><input type="text" id="refile_plan" name="refile_plan"></div>
    <div class="field-row"><label for="refile_reason">Reason</label><textarea id="refile_reason" name="refile_reason"></textarea></div>`,
  (c, f, u) => {
    const target = f.refile_process.value;
    const reason = f.refile_reason.value.trim();
    if (!target || !reason) return ['Select where to re-file and give a reason.'];
    updateState(s => {
      const st = caseState(s, c.workId);
      st.refile = { target, plan: f.refile_plan.value.trim(), reason, at: nowStamp(), by: u.username };
      st.status = 'Pending-Refile';
    });
    audit('pega', 're-file', `${c.workId} -> ${target}`);
    backToCase(c, 'Case re-filed.');
  });
}

async function pagePend(user) {
  await caseFormPage(user, 'Pend and refer', () => `
    <div class="field-row"><label for="refer_team">Refer to team</label>
      <select id="refer_team" name="refer_team"><option value="">-- Select --</option><option>Operational Support</option><option>Risk</option><option>Investment Marketing</option><option>Business Analysis</option></select></div>
    <div class="field-row"><label for="pend_reason">Pend reason</label>
      <select id="pend_reason" name="pend_reason"><option value="">-- Select --</option><option>Awaiting other team</option><option>Awaiting customer</option><option>Awaiting old records</option></select></div>
    <div class="field-row"><label for="refer_note">Referral note</label><textarea id="refer_note" name="refer_note"></textarea></div>`,
  (c, f, u) => {
    const team = f.refer_team.value;
    const reason = f.pend_reason.value;
    const note = f.refer_note.value.trim();
    if (!team || !reason || !note) return ['Select a team and pend reason, and write a referral note.'];
    updateState(s => {
      const st = caseState(s, c.workId);
      st.referral = { team, reason, note, at: nowStamp(), by: u.username };
      st.status = 'Pending-Referral';
    });
    audit('pega', 'pend-refer', `${c.workId} -> ${team}`);
    backToCase(c, `Case pended and referred to ${team}.`);
  });
}

async function pageWorkSearch(user) {
  const q = (params.get('q') || '').trim();
  const openOnly = params.get('open') !== '0';
  const state = loadState();
  const cases = await seedCases();
  const norm = s => s.replace(/\s+/g, '').toUpperCase();
  const results = q ? cases.filter(c => norm(c.workId) === norm(q) || c.planNumber === q.replace(/\s+/g, '')) .filter(c => !openOnly || !CLOSED(currentStatus(c, state))) : [];
  mount(user, `
    <h1>Work search</h1>
    <form class="panel" id="ws-form" method="get">
      <label for="q"><strong>Work ID or plan number</strong></label>
      <input type="text" id="q" name="q" value="${esc(q)}" size="30">
      <label style="margin-left:12px"><input type="checkbox" name="open" value="1" id="open-only" ${openOnly ? 'checked' : ''}> Open work only</label>
      <button type="submit">Search</button>
    </form>
    ${q ? `<h2>Results (${results.length})</h2>
    <table id="ws-results"><thead><tr><th>Work ID</th><th>Process</th><th>Plan number</th><th>Customer</th><th>Status</th><th>Created</th></tr></thead>
    <tbody>${results.map(c => `<tr><td><a href="case.html?id=${esc(c.workId)}">${esc(c.workId)}</a></td><td>${esc(c.process)}</td><td>${esc(c.planNumber)}</td><td>${esc(c.customer.name)}</td><td>${esc(currentStatus(c, state))}</td><td>${esc(c.created)}</td></tr>`).join('') || '<tr><td colspan="6" class="muted">No work found.</td></tr>'}</tbody></table>` : ''}`);
  document.getElementById('ws-form').addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target;
    location.href = `worksearch.html?q=${encodeURIComponent(f.q.value.trim())}&open=${f.open.checked ? '1' : '0'}`;
  });
}

async function pageKnowledge(user) {
  const wording = (await loadJson('wording')).paragraphs;
  mount(user, `
    <h1>Knowledge Library</h1>
    <div class="panel" id="asq-procedure">
      <h2>Procedure guide: Answer Service Query (ASQ)</h2>
      <ol>
        <li><strong>Related cases.</strong> Work search on the plan number with "Open work only" cleared. Note any duplicate or linked cases.</li>
        <li><strong>Filing check.</strong> Open the plan in SCM (plan reference = last 7 digits of the Pega plan number, no leading zero). Compare customer name, National Insurance number and date of birth with the case. If they do not match, add a note and <em>Re-file</em> the case to Indexing. Do not reply.</li>
        <li><strong>Authority check.</strong> Needed when the channel is Email, Post or DCE. Planholder: details match. IFA: the agency must be recorded as the adviser on the plan. Third party or family: a registered power of attorney or third-party authority must be recorded on the plan. Employer: must be the scheme employer on the plan. If not authorised, reply with SW-AUTH-01 only and give no plan information. Contact centre and secure self-service requests have already been verified.</li>
        <li><strong>Risk.</strong> If any fund shows <em>negative units</em> on Policy Value, do not quote a value. Send holding reply SW-HLD-01, then Pend and refer to Operational Support.</li>
        <li><strong>Answer.</strong> List every question in the request and answer each from SCM using Standard Wording. Mention any other plans the customer holds (SW-OTH-01).</li>
        <li><strong>Reply.</strong> Compose email to the reply-to address on file. If there is no email address, the case needs a letter (not available in this environment): add a note instead.</li>
        <li><strong>Record and close.</strong> Add a note summarising what was done. Actions › Perform work: answer the checklist, Final action = Skip final action, Charge on task = No, Submit. Confirm the status reaches Resolved-Completed in Work search.</li>
      </ol>
    </div>
    <div class="panel" id="standard-wording">
      <h2>Standard Wording</h2>
      <table><thead><tr><th>ID</th><th>Topic</th><th>Approved wording</th></tr></thead>
      <tbody>${wording.map(w => `<tr><td>${esc(w.id)}</td><td>${esc(w.topic)}</td><td>${esc(w.text)}</td></tr>`).join('')}</tbody></table>
    </div>`);
}

async function pageSummary() {
  const state = loadState();
  const cases = await seedCases();
  const rows = cases.map(c => {
    const st = state.cases[c.workId] || {};
    return `<tr>
      <td>${esc(c.workId)}</td><td>${esc(c.planNumber)}</td><td><strong>${esc(currentStatus(c, state))}</strong></td><td>${esc(st.assignedTo || '')}</td>
      <td>${(st.notes || []).map(n => `<div><strong>${esc(n.title)}</strong>: ${esc(n.text)}</div>`).join('')}</td>
      <td>${(st.outbox || []).map(m => `<div><strong>To:</strong> ${esc(m.to)}<br><strong>${esc(m.subject)}</strong><div class="pre">${esc(m.body)}</div></div>`).join('')}</td>
      <td>${st.perform ? esc(JSON.stringify(st.perform)) : ''}${st.refile ? `<div>Re-file: ${esc(JSON.stringify(st.refile))}</div>` : ''}${st.referral ? `<div>Referral: ${esc(JSON.stringify(st.referral))}</div>` : ''}</td>
    </tr>`;
  }).join('');
  document.body.innerHTML = `<main class="page">
    <h1>Run summary (reviewer view)</h1>
    <p class="muted">State is stored in this browser only. <a href="summary.html?reset=1">Reset all</a></p>
    <table><thead><tr><th>Work ID</th><th>Plan</th><th>Status</th><th>Assigned</th><th>Notes</th><th>Emails sent</th><th>Checklist / re-file / referral</th></tr></thead><tbody>${rows}</tbody></table>
    <h2>Audit log</h2>
    <table><thead><tr><th>At</th><th>App</th><th>Event</th><th>Detail</th></tr></thead><tbody>${state.audit.map(a => `<tr><td>${esc(a.at)}</td><td>${esc(a.app)}</td><td>${esc(a.event)}</td><td>${esc(a.detail)}</td></tr>`).join('')}</tbody></table>
  </main>`;
}

(async function main() {
  const page = document.body.dataset.page;
  if (page === 'summary') return pageSummary();
  const user = currentUser('pega');
  const pages = { home: pageHome, case: pageCase, perform: pagePerform, note: pageNote, compose: pageCompose, refile: pageRefile, pend: pagePend, worksearch: pageWorkSearch, knowledge: pageKnowledge };
  await pages[page](user);
})();
