// mock-Pega level 2 ("hard DOM"). Loaded by pega.js when ?level=2 has been set.
// Same data, same state writes and same audit events as level 1; only the DOM is harder:
// - the case body renders inside a same-origin iframe (case.html?frame=1)
// - generated Pega-style ids ($PpyWorkPage$pChannel) and no data-field hooks
// - header and field values are div grids, not <dl>/<table>
// - tab panels load lazily on click after 600-1200ms
// - the Actions menu lives in a closed shadow root
// - Perform work uses custom ARIA radio and dropdown widgets, not <input>/<select>

const L2 = (() => {
  const rid = () => Math.random().toString(16).slice(2, 8);
  const pid = path => `$PpyWorkPage$p${path}`;
  const lazyDelay = () => 600 + Math.floor(Math.random() * 601);
  const inFrame = params.get('frame') === '1';

  const style = document.createElement('style');
  style.textContent = `
    .l2-header { background:#fff; border:1px solid #d3d9e0; border-left:4px solid #1b5fa8; padding:10px 14px; margin-bottom:12px; }
    .l2-bar { display:flex; justify-content:space-between; align-items:center; gap:8px; }
    .l2-title { font-size:18px; font-weight:600; }
    .l2-grid { display:grid; grid-template-columns:repeat(4, minmax(0, 1fr)); gap:6px 14px; margin-top:6px; }
    .l2-grid.two { grid-template-columns:repeat(2, minmax(0, 1fr)); }
    .l2-cell { display:flex; flex-direction:column; }
    .l2-lbl { font-size:11px; color:#52606d; font-weight:600; }
    .l2-sec { margin:14px 0 4px; font-size:12px; font-weight:700; color:#52606d; text-transform:uppercase; letter-spacing:.04em; }
    .l2-tabs { display:flex; gap:2px; border-bottom:2px solid #1b5fa8; margin-top:8px; }
    .l2-tabs [role=tab] { background:#dfe5ec; border:1px solid #c3ccd6; border-bottom:none; border-radius:3px 3px 0 0; padding:6px 14px; cursor:pointer; user-select:none; }
    .l2-tabs [role=tab][aria-selected=true] { background:#1b5fa8; color:#fff; }
    .l2-panel { background:#fff; border:1px solid #d3d9e0; border-top:none; padding:12px 14px; min-height:120px; }
    .l2-loading { color:#7b8794; padding:20px 0; }
    .l2-rows { display:grid; border-top:1px solid #d3d9e0; border-left:1px solid #d3d9e0; }
    .l2-rows > div { border-right:1px solid #d3d9e0; border-bottom:1px solid #d3d9e0; padding:5px 8px; }
    .l2-rows > .h { background:#e4e9ef; font-weight:600; }
    .l2-link { color:#1b5fa8; cursor:pointer; text-decoration:underline; }
    .l2-frame { width:100%; height:calc(100vh - 90px); border:0; background:#eef1f5; }
    .l2-q { margin:12px 0; }
    .l2-q-text { font-weight:600; margin-bottom:4px; }
    .l2-radiogroup { display:flex; gap:18px; }
    .l2-radio { display:flex; align-items:center; gap:6px; cursor:pointer; user-select:none; }
    .l2-radio .dot { width:14px; height:14px; border-radius:50%; border:2px solid #9aa5b1; background:#fff; }
    .l2-radio[aria-checked=true] .dot { border-color:#1b5fa8; box-shadow:inset 0 0 0 3px #fff; background:#1b5fa8; }
    .l2-select { position:relative; display:inline-block; min-width:220px; }
    .l2-select [role=combobox] { border:1px solid #9aa5b1; border-radius:3px; padding:5px 26px 5px 8px; background:#fff; cursor:pointer; user-select:none; }
    .l2-select [role=combobox]::after { content:'\\25BE'; position:absolute; right:8px; top:5px; color:#52606d; }
    .l2-select [role=listbox] { position:absolute; left:0; right:0; top:100%; background:#fff; border:1px solid #9aa5b1; z-index:10; box-shadow:0 4px 10px rgba(0,0,0,.12); }
    .l2-select [role=option] { padding:5px 8px; cursor:pointer; }
    .l2-select [role=option]:hover, .l2-select [role=option].active { background:#eef3fa; }
  `;
  document.head.appendChild(style);

  function cell(label, valueHtml, idPath) {
    return `<div class="l2-cell" id="layout_${rid()}"><div class="l2-lbl">${esc(label)}</div><div ${idPath ? `id="${esc(pid(idPath))}"` : ''}>${valueHtml}</div></div>`;
  }

  function header(c, status, st) {
    return `
    <div class="l2-header" id="RULE_KEY_${rid()}">
      <div class="l2-bar">
        <div class="l2-title" id="${pid('pyLabel')}">${esc(c.workId)} · ${esc(c.process)}</div>
        <div class="l2-actions-host" id="pyActions_${rid()}"></div>
      </div>
      <div class="l2-grid">
        ${cell('Work ID', esc(c.workId), 'pyID')}
        ${cell('Process', esc(c.process), 'pyProcessName')}
        ${cell('Sub-process', esc(c.subProcess), 'pySubProcess')}
        ${cell('Plan number', esc(c.planNumber), 'PlanNumber')}
        ${cell('Status', `<span class="status-badge">${esc(status)}</span>`, 'pyStatusWork')}
        ${cell('Created', esc(c.created), 'pxCreateDateTime')}
        ${cell('SLA due', esc(c.slaDue), 'pySLADeadline')}
        ${cell('Assigned to', esc((st && st.assignedTo) || '-'), 'pxAssignedOperatorID')}
      </div>
    </div>`;
  }

  // Actions menu inside a closed shadow root. Items are divs, not links.
  function attachActions(c, status, nav) {
    const host = document.querySelector('.l2-actions-host');
    if (!host) return;
    const root = host.attachShadow({ mode: 'closed' });
    if (CLOSED(status)) { root.innerHTML = '<span style="color:#7b8794">Case is closed</span>'; return; }
    const id = encodeURIComponent(c.workId);
    const items = [
      ['Perform work', `perform.html?id=${id}`],
      ['Attach › Note', `note.html?id=${id}`],
      ['Draft reply', `draft.html?id=${id}`],
      ['Route to operator review', `review.html?id=${id}`],
      ['Re-file case', `refile.html?id=${id}`],
      ['Pend and refer', `pend.html?id=${id}`],
      ['Generate correspondence (not available)', ''],
    ];
    root.innerHTML = `
      <style>
        :host { position:relative; display:inline-block; font:13px "Segoe UI", Arial, sans-serif; }
        .b { padding:5px 14px; border:1px solid #1b5fa8; background:#1b5fa8; color:#fff; border-radius:3px; cursor:pointer; user-select:none; }
        .m { position:absolute; right:0; top:100%; margin-top:2px; padding:4px 0; background:#fff; border:1px solid #9aa5b1; min-width:240px; z-index:20; box-shadow:0 4px 10px rgba(0,0,0,.12); }
        .m[hidden] { display:none; }
        .i { padding:6px 12px; color:#1f2933; cursor:pointer; }
        .i:hover, .i:focus { background:#eef3fa; outline:none; }
        .i[aria-disabled=true] { color:#7b8794; cursor:default; }
      </style>
      <div class="b" role="button" tabindex="0" aria-haspopup="menu" aria-expanded="false">Actions ▾</div>
      <div class="m" role="menu" hidden>
        ${items.map(([label, href]) => `<div class="i" role="menuitem" tabindex="-1" ${href ? `data-go="${esc(href)}"` : 'aria-disabled="true"'}>${esc(label)}</div>`).join('')}
      </div>`;
    const btn = root.querySelector('.b');
    const menu = root.querySelector('.m');
    const toggle = () => { menu.hidden = !menu.hidden; btn.setAttribute('aria-expanded', String(!menu.hidden)); };
    btn.addEventListener('click', toggle);
    btn.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
    root.querySelectorAll('[data-go]').forEach(i => {
      const go = () => nav(i.dataset.go);
      i.addEventListener('click', go);
      i.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    });
  }

  const topNav = href => { (window.top || window).location.href = new URL(href, location.href).href; };
  const selfNav = href => { location.href = href; };

  function rows(cols, data) {
    return `<div class="l2-rows" id="grid_${rid()}" style="grid-template-columns:${cols.map(c => c[1] || 'auto').join(' ')}">
      ${cols.map(c => `<div class="h">${esc(c[0])}</div>`).join('')}
      ${data.length ? data.map(r => r.map(v => `<div>${v}</div>`).join('')).join('') : `<div class="muted" style="grid-column:1 / -1">None.</div>`}
    </div>`;
  }

  // ---------- case page ----------

  async function pageCase(user) {
    if (!inFrame) {
      // Outer shell: top bar plus the case in a same-origin iframe.
      const q = new URLSearchParams(location.search);
      q.delete('level');
      q.set('frame', '1');
      mount(user, `<div id="pyPortalHarness_${rid()}"><iframe class="l2-frame" id="PegaGadget0Ifr" name="PegaGadget0Ifr" title="Case" src="case.html?${q}"></iframe></div>`);
      return;
    }
    const id = params.get('id');
    const c = await findCase(id);
    document.body.style.background = '#eef1f5';
    if (!c) { document.body.innerHTML = `<main class="page"><div class="error">Case ${esc(id)} not found.</div></main>`; return; }
    const state = loadState();
    const st = state.cases[c.workId] || { notes: [], outbox: [], attachments: [] };
    const status = currentStatus(c, state);
    const msg = params.get('msg');
    const tabs = [['general', 'General display'], ['document', 'Document'], ['documents', 'Documents'], ['notes', 'Case notes'], ['attachments', 'Attachments']];
    const first = tabs.some(t => t[0] === params.get('tab')) ? params.get('tab') : 'general';
    const panelId = pid('pyTabPanel') + '_' + rid();

    document.body.innerHTML = `<main class="page" id="pyWorkArea_${rid()}">
      ${msg ? `<div class="success" role="status">${esc(msg)}</div>` : ''}
      ${header(c, status, st)}
      <div class="l2-tabs" role="tablist">
        ${tabs.map(([k, label]) => `<div role="tab" tabindex="0" id="TAB_${rid()}" data-k="${k}" aria-selected="false" aria-controls="${esc(panelId)}">${esc(label)}</div>`).join('')}
      </div>
      <div class="l2-panel" role="tabpanel" id="${esc(panelId)}"></div>
    </main>`;
    attachActions(c, status, topNav);

    const panel = document.getElementById(panelId);
    let token = 0;
    const show = k => {
      const mine = ++token;
      document.querySelectorAll('[role=tab]').forEach(t => t.setAttribute('aria-selected', String(t.dataset.k === k)));
      panel.innerHTML = '<div class="l2-loading">Loading…</div>';
      setTimeout(() => {
        if (mine !== token) return;
        panel.innerHTML = renderPanel(k, c, st);
        wirePanel(k, c);
      }, lazyDelay());
    };
    document.querySelectorAll('[role=tab]').forEach(t => {
      t.addEventListener('click', () => show(t.dataset.k));
      t.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(t.dataset.k); } });
    });
    show(first);
    if (status === 'Pending-Resolve') setTimeout(() => location.reload(), RESOLVE_DELAY_MS + 300);
  }

  function renderPanel(k, c, st) {
    const r = c.requester;
    if (k === 'general') {
      return `
        <div class="l2-sec">Request</div>
        <div class="l2-grid two">${cell('Channel', esc(c.channel), 'Channel')}${cell('Source', esc(c.source), 'Source')}</div>
        <div class="l2-sec">Requester</div>
        <div class="l2-grid two">
          ${cell('Name', esc(r.name), 'Requester$pFullName')}
          ${r.organisation ? cell('Organisation', esc(r.organisation), 'Requester$pOrganisation') : ''}
          ${r.agencyNumber ? cell('Agency number', esc(r.agencyNumber), 'Requester$pAgencyNumber') : ''}
          ${r.relationship ? cell('Relationship to customer', esc(r.relationship), 'Requester$pRelationship') : ''}
          ${cell('Email', esc(r.email || '-'), 'Requester$pEmail')}
          ${cell('Address', esc(r.address || '-'), 'Requester$pAddress')}
        </div>
        <div class="l2-sec">Customer</div>
        <div class="l2-grid two">
          ${cell('Customer name', esc(c.customer.name), 'Customer$pFullName')}
          ${cell('National Insurance number', esc(c.customer.niNumber), 'Customer$pNINumber')}
          ${cell('Date of birth', esc(c.customer.dob), 'Customer$pDateOfBirth')}
          ${cell('Address', esc(c.customer.address), 'Customer$pAddress')}
        </div>
        <div class="l2-sec">Reply</div>
        <div class="l2-grid two">${cell('Reply-to email on file', esc(c.replyTo || 'None - reply by post'), 'ReplyTo')}</div>`;
    }
    if (k === 'document') {
      return `<div class="l2-sec">Document details</div>
        ${c.documentDetails ? `<div class="pre" id="${pid('DocumentDetails')}">${esc(c.documentDetails)}</div>` : '<div class="muted">No document details captured for this case. See the Documents tab.</div>'}`;
    }
    if (k === 'documents') {
      return rows([['Document ID'], ['Name', '1fr'], ['Type'], ['Received'], ['']],
        c.documents.map(d => [esc(d.id), esc(d.name), esc(d.type), esc(d.received), `<span class="l2-link" role="button" tabindex="0" data-doc="${esc(d.id)}">Open</span>`]))
        + `<div id="viewer_${rid()}" class="l2-viewer" hidden><div class="l2-sec l2-viewer-title viewer-title">Document viewer</div><div><a class="viewer-pdf-link" target="_blank" rel="noopener" hidden>Open PDF in a new tab</a></div><iframe class="doc-viewer" title="Document viewer"></iframe></div>`;
    }
    if (k === 'notes') {
      const notes = [...c.caseNotes.map(n => ({ ...n, title: '' })), ...(st.notes || [])];
      return rows([['Date'], ['Author'], ['Title'], ['Note', '1fr']], notes.map(n => [esc(n.date), esc(n.author), esc(n.title || ''), esc(n.text)]));
    }
    if (k === 'attachments') {
      return rows([['Date'], ['Type'], ['Name', '1fr'], ['Added by']], (st.attachments || []).map(a => [esc(a.date), esc(a.type), esc(a.name), esc(a.by)]));
    }
    return '';
  }

  function wirePanel(k, c) {
    if (k !== 'documents') return;
    document.querySelectorAll('[data-doc]').forEach(b => {
      const open = () => {
        const doc = c.documents.find(d => d.id === b.dataset.doc);
        showDocument(document.querySelector('.l2-viewer'), doc);
        audit('pega', 'open-document', `${c.workId} ${doc.id}`);
      };
      b.addEventListener('click', open);
      b.addEventListener('keydown', e => { if (e.key === 'Enter') open(); });
    });
  }

  // ---------- form pages ----------

  async function formShell(user, title, inner) {
    const id = params.get('id');
    const c = await findCase(id);
    if (!c) { mount(user, `<div class="error">Case ${esc(id)} not found.</div>`); return null; }
    const state = loadState();
    const status = currentStatus(c, state);
    if (CLOSED(status)) {
      mount(user, `${header(c, status, state.cases[c.workId])}<div class="error">This case is closed.</div>`);
      attachActions(c, status, selfNav);
      return null;
    }
    mount(user, `
      ${header(c, status, state.cases[c.workId])}
      <div class="panel" id="pyFlowAction_${rid()}">
        <div class="l2-title" style="font-size:15px;margin-bottom:8px">${esc(title)}</div>
        <div class="error" role="alert" hidden></div>
        <form novalidate id="pyForm_${rid()}">${inner(c)}
          <div class="field-row"><button type="submit">Submit</button> <a class="btn secondary" href="case.html?id=${encodeURIComponent(c.workId)}">Cancel</a></div>
        </form>
      </div>`);
    attachActions(c, status, selfNav);
    return c;
  }

  function showErrors(errors) {
    const box = document.querySelector('[role=alert]');
    box.innerHTML = `<strong>Please correct the following:</strong><ul>${errors.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
    box.hidden = false;
  }

  // Note / draft reply / operator review / re-file / pend: level-1 fields, renamed to generated ids.
  async function caseFormPage(user, title, bodyHtml, onSubmit) {
    const c = await formShell(user, title, bodyHtml);
    if (!c) return;
    const form = document.querySelector('form');
    form.querySelectorAll('[id]').forEach(elm => {
      const camel = elm.id.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join('');
      const nid = pid(camel);
      const lbl = form.querySelector(`label[for="${elm.id}"]`);
      if (lbl) lbl.htmlFor = nid;
      elm.id = nid;
    });
    form.addEventListener('submit', e => {
      e.preventDefault();
      const errors = onSubmit(c, form, user);
      if (errors && errors.length) showErrors(errors);
    });
  }

  // Perform work: custom ARIA radios and dropdowns built from divs.
  function radioGroup(name, question) {
    const lid = `lbl_${rid()}`;
    return `<div class="l2-q"><div class="l2-q-text" id="${lid}">${esc(question)}</div>
      <div class="l2-radiogroup" role="radiogroup" aria-labelledby="${lid}" data-name="${name}" id="${esc(pid(name))}">
        ${['Yes', 'No'].map((v, i) => `<div class="l2-radio" role="radio" aria-checked="false" tabindex="${i === 0 ? 0 : -1}" data-value="${v}"><span class="dot"></span>${v}</div>`).join('')}
      </div></div>`;
  }

  function dropdown(name, label, options) {
    const lid = `lbl_${rid()}`;
    const lb = `lb_${rid()}`;
    return `<div class="l2-q"><div class="l2-q-text" id="${lid}">${esc(label)}</div>
      <div class="l2-select" data-name="${name}" id="${esc(pid(name))}">
        <div role="combobox" tabindex="0" aria-haspopup="listbox" aria-expanded="false" aria-controls="${lb}" aria-labelledby="${lid}">-- Select --</div>
        <div role="listbox" id="${lb}" hidden>${options.map(o => `<div role="option" aria-selected="false" data-value="${esc(o)}">${esc(o)}</div>`).join('')}</div>
      </div></div>`;
  }

  function wireWidgets(root) {
    root.querySelectorAll('[role=radiogroup]').forEach(g => {
      const radios = [...g.querySelectorAll('[role=radio]')];
      const pick = r => {
        radios.forEach(x => { x.setAttribute('aria-checked', String(x === r)); x.tabIndex = x === r ? 0 : -1; });
        g.dataset.value = r.dataset.value;
        r.focus();
      };
      radios.forEach((r, i) => {
        r.addEventListener('click', () => pick(r));
        r.addEventListener('keydown', e => {
          if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); pick(r); }
          if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(e.key)) {
            e.preventDefault();
            const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1;
            pick(radios[(i + step + radios.length) % radios.length]);
          }
        });
      });
    });
    root.querySelectorAll('.l2-select').forEach(s => {
      const box = s.querySelector('[role=combobox]');
      const list = s.querySelector('[role=listbox]');
      const opts = [...list.querySelectorAll('[role=option]')];
      let active = -1;
      const setOpen = open => { list.hidden = !open; box.setAttribute('aria-expanded', String(open)); };
      const highlight = i => { active = i; opts.forEach((o, j) => o.classList.toggle('active', j === i)); };
      const choose = o => {
        opts.forEach(x => x.setAttribute('aria-selected', String(x === o)));
        s.dataset.value = o.dataset.value;
        box.textContent = o.textContent;
        setOpen(false);
        box.focus();
      };
      box.addEventListener('click', () => setOpen(list.hidden));
      box.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
          e.preventDefault();
          if (list.hidden) { setOpen(true); highlight(0); return; }
          if (e.key === 'ArrowDown') highlight(Math.min(active + 1, opts.length - 1));
          else if (active >= 0) choose(opts[active]);
        }
        if (e.key === 'ArrowUp' && !list.hidden) { e.preventDefault(); highlight(Math.max(active - 1, 0)); }
        if (e.key === 'Escape') setOpen(false);
      });
      opts.forEach(o => o.addEventListener('click', () => choose(o)));
      document.addEventListener('click', e => { if (!s.contains(e.target)) setOpen(false); });
    });
  }

  async function pagePerform(user) {
    const c = await formShell(user, 'Perform work: case checklist', () => `
      ${radioGroup('q_authorised', 'Is the requester authorised to receive information on this plan?')}
      ${radioGroup('q_policyholder', 'Is the requester the policyholder?')}
      ${radioGroup('q_otherplans', 'Does the customer hold any other plans?')}
      ${dropdown('final_action', 'Final action', ['Skip final action', 'Money to authorise', 'Send to check queue'])}
      ${dropdown('charge_on_task', 'Charge on task', ['No', 'Yes'])}`);
    if (!c) return;
    const form = document.querySelector('form');
    wireWidgets(form);
    form.addEventListener('submit', e => {
      e.preventDefault();
      const v = n => (form.querySelector(`[data-name="${n}"]`).dataset.value || '');
      const answers = { authorised: v('q_authorised'), policyholder: v('q_policyholder'), otherPlans: v('q_otherplans'), finalAction: v('final_action'), chargeOnTask: v('charge_on_task') };
      const errors = submitPerform(c, answers, user);
      if (errors && errors.length) showErrors(errors);
    });
  }

  return { pageCase, caseFormPage, pagePerform };
})();
