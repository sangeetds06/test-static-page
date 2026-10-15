(function () {
  'use strict';
  const $ = function (id) { return document.getElementById(id); };

  // Industry classification list, searched by the type-ahead.
  const INDUSTRIES = [
    'A01.11 Growing of cereals, leguminous crops and oil seeds', 'A03.11 Marine fishing', 'A03.21 Marine aquaculture',
    'B06.10 Extraction of crude petroleum', 'B09.10 Support activities for petroleum and natural gas extraction',
    'C10.20 Processing and preserving of fish, crustaceans and molluscs', 'C13.94 Manufacture of cordage, rope, twine and netting',
    'C20.30 Manufacture of paints, varnishes and similar coatings', 'C22.19 Manufacture of other rubber products',
    'C24.10 Manufacture of basic iron and steel', 'C25.11 Manufacture of metal structures and parts of structures',
    'C25.62 Machining', 'C25.73 Manufacture of tools', 'C26.51 Manufacture of instruments for measuring, testing and navigation',
    'C27.11 Manufacture of electric motors, generators and transformers', 'C27.90 Manufacture of other electrical equipment',
    'C28.11 Manufacture of engines and turbines, except aircraft, vehicle and cycle engines',
    'C28.12 Manufacture of fluid power equipment', 'C28.13 Manufacture of other pumps and compressors',
    'C28.14 Manufacture of other taps and valves', 'C28.15 Manufacture of bearings, gears, gearing and driving elements',
    'C28.22 Manufacture of lifting and handling equipment', 'C28.25 Manufacture of non-domestic cooling and ventilation equipment',
    'C28.29 Manufacture of other general-purpose machinery n.e.c.', 'C30.11 Building of ships and floating structures',
    'C30.12 Building of pleasure and sporting boats', 'C33.12 Repair of machinery', 'C33.15 Repair and maintenance of ships and boats',
    'D35.11 Production of electricity', 'E38.31 Dismantling of wrecks', 'F42.91 Construction of water projects',
    'G46.14 Agents involved in the sale of machinery, industrial equipment, ships and aircraft',
    'G46.62 Wholesale of machine tools', 'G46.63 Wholesale of mining, construction and civil engineering machinery',
    'G46.69 Wholesale of other machinery and equipment', 'G46.71 Wholesale of solid, liquid and gaseous fuels',
    'H49.41 Freight transport by road', 'H50.20 Sea and coastal freight water transport', 'H52.10 Warehousing and storage',
    'H52.22 Service activities incidental to water transportation', 'H52.29 Other transportation support activities',
    'M71.12 Engineering activities and related technical consultancy', 'M71.20 Technical testing and analysis',
    'N77.34 Renting and leasing of water transport equipment', 'N77.39 Renting and leasing of other machinery and equipment',
  ];
  const CATEGORIES = ['Raw materials', 'Spare parts', 'Consumables', 'Logistics', 'Warehousing', 'Field services',
    'Engineering consultancy', 'IT services', 'Facilities', 'Marketing', 'Professional services', 'Travel'];
  const TAKEN_VAT = 'NO918274556MVA';

  const state = {
    step: 1, legalName: '', entityType: '', country: '', vat: '', industry: '', startDate: '',
    categories: [], currency: 'EUR', spend: null, paymentTerms: '', accept: false, attempts: 0, ref: null,
  };

  // ---------- Step navigation ----------
  function showStep(n) {
    state.step = n;
    document.querySelectorAll('fieldset[data-step]').forEach(function (f) { f.hidden = Number(f.dataset.step) !== n; });
    document.querySelectorAll('#steps .step').forEach(function (s) {
      const k = Number(s.dataset.step);
      s.classList.toggle('active', k === n);
      s.classList.toggle('done', k < n);
    });
    $('back').disabled = n === 1;
    $('next').hidden = n === 3;
    $('submit').hidden = n !== 3;
    $('stepLabel').textContent = 'Step ' + n + ' of 3';
    if (n === 3) renderReview();
  }

  function setErr(key, msg) {
    const e = document.querySelector('.field-error[data-for="' + key + '"]');
    if (e) e.textContent = msg || '';
  }
  function clearErrs() { document.querySelectorAll('.field-error').forEach(function (e) { e.textContent = ''; }); }

  function collect() {
    state.legalName = $('legalName').value.trim();
    state.entityType = $('entityType').value;
    state.country = $('country').value;
    state.vat = $('vat').value.trim();
    state.currency = $('currency').value;
    state.spend = parseAmount($('spend').value);
    const r = document.querySelector('input[name=terms]:checked');
    state.paymentTerms = r ? r.value : '';
    state.accept = $('accept').checked;
  }

  function validate(step) {
    collect();
    clearErrs();
    let ok = true;
    function req(key, val, msg) { if (!val) { setErr(key, msg || 'This field is required.'); ok = false; } }
    if (step === 1) {
      req('legalName', state.legalName);
      req('entityType', state.entityType);
      req('country', state.country);
      req('vat', state.vat);
      if (state.vat && !/^[A-Z]{2}[A-Z0-9 ]{6,16}$/i.test(state.vat)) { setErr('vat', 'Enter a VAT number starting with the country code.'); ok = false; }
      req('industry', state.industry, 'Search and choose a classification from the list.');
    } else if (step === 2) {
      req('startDate', state.startDate, 'Choose a date.');
      req('categories', state.categories.length, 'Select at least one category.');
      if (state.spend === null || !(state.spend > 0)) { setErr('spend', 'Enter an amount greater than zero.'); ok = false; }
      req('paymentTerms', state.paymentTerms, 'Choose payment terms.');
    } else if (step === 3) {
      req('accept', state.accept, 'You must confirm the terms.');
    }
    if (!ok) $('banner').innerHTML = '<div class="error">Please correct the highlighted fields.</div>';
    else $('banner').innerHTML = '';
    return ok;
  }

  $('next').addEventListener('click', function () { if (validate(state.step)) showStep(state.step + 1); });
  $('back').addEventListener('click', function () { collect(); clearErrs(); $('banner').innerHTML = ''; showStep(state.step - 1); });

  function renderReview() {
    const rows = [
      ['Legal name', state.legalName], ['Supplier type', state.entityType], ['Country', state.country],
      ['VAT number', state.vat], ['Industry classification', state.industry],
      ['Contract start date', state.startDate ? Gym.ukDate(state.startDate) : ''],
      ['Categories', state.categories.join(', ')], ['Estimated annual spend', state.currency + ' ' + fmtAmount(state.spend)],
      ['Payment terms', state.paymentTerms],
    ];
    $('review').innerHTML = rows.map(function (r) { return '<dt>' + Gym.esc(r[0]) + '</dt><dd>' + Gym.esc(r[1]) + '</dd>'; }).join('');
  }

  // ---------- Type-ahead ----------
  let taTimer = null;
  let taSeq = 0;
  const taInput = $('industry');
  const taList = $('industryList');
  function closeTa() { taList.hidden = true; taInput.setAttribute('aria-expanded', 'false'); }
  taInput.addEventListener('input', function () {
    state.industry = ''; // typing invalidates any earlier choice
    clearTimeout(taTimer);
    const q = taInput.value.trim().toLowerCase();
    if (q.length < 2) { closeTa(); return; }
    taTimer = setTimeout(function () {
      const seq = ++taSeq;
      taList.hidden = false;
      taInput.setAttribute('aria-expanded', 'true');
      taList.innerHTML = '<li class="empty"><span class="spinner"></span>Searching...</li>';
      setTimeout(function () { // simulated lookup latency
        if (seq !== taSeq) return;
        const hits = INDUSTRIES.filter(function (s) { return s.toLowerCase().indexOf(q) !== -1; }).slice(0, 8);
        taList.innerHTML = hits.length
          ? hits.map(function (h) { return '<li role="option" data-v="' + Gym.esc(h) + '">' + Gym.esc(h) + '</li>'; }).join('')
          : '<li class="empty">No matches</li>';
      }, 250);
    }, 400);
  });
  taList.addEventListener('mousedown', function (e) {
    const li = e.target.closest('li[data-v]');
    if (!li) return;
    e.preventDefault();
    state.industry = li.dataset.v;
    taInput.value = li.dataset.v;
    setErr('industry', '');
    closeTa();
  });
  taInput.addEventListener('blur', function () { setTimeout(closeTa, 150); });

  // ---------- Date picker ----------
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dpInput = $('startDate');
  const dpPop = $('dpPop');
  const today = new Date();
  let view = { y: today.getFullYear(), m: today.getMonth() };
  function renderDp() {
    const first = new Date(view.y, view.m, 1);
    const offset = (first.getDay() + 6) % 7; // Monday first
    const days = new Date(view.y, view.m + 1, 0).getDate();
    let html = '<div class="dp-head"><button type="button" class="secondary dp-nav" data-nav="-1" aria-label="Previous month">&lsaquo;</button>' +
      '<span class="dp-title">' + MONTHS[view.m] + ' ' + view.y + '</span>' +
      '<button type="button" class="secondary dp-nav" data-nav="1" aria-label="Next month">&rsaquo;</button></div><div class="dp-grid">';
    ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].forEach(function (d) { html += '<div class="dow">' + d + '</div>'; });
    for (let i = 0; i < offset; i++) html += '<div class="day blank"></div>';
    for (let d = 1; d <= days; d++) {
      const iso = view.y + '-' + Gym.pad(view.m + 1) + '-' + Gym.pad(d);
      html += '<div class="day' + (iso === state.startDate ? ' sel' : '') + '" data-iso="' + iso + '">' + d + '</div>';
    }
    dpPop.innerHTML = html + '</div>';
  }
  function openDp() {
    if (state.startDate) { const p = state.startDate.split('-'); view = { y: +p[0], m: +p[1] - 1 }; }
    renderDp();
    dpPop.hidden = false;
  }
  dpInput.addEventListener('click', function () { if (dpPop.hidden) openDp(); else dpPop.hidden = true; });
  dpInput.addEventListener('keydown', function (e) { if (e.key !== 'Tab') e.preventDefault(); if (e.key === 'Enter' || e.key === ' ') openDp(); });
  dpInput.addEventListener('paste', function (e) { e.preventDefault(); });
  dpPop.addEventListener('click', function (e) {
    const nav = e.target.closest('[data-nav]');
    if (nav) {
      view.m += Number(nav.dataset.nav);
      if (view.m < 0) { view.m = 11; view.y--; }
      if (view.m > 11) { view.m = 0; view.y++; }
      renderDp();
      return;
    }
    const day = e.target.closest('.day[data-iso]');
    if (day) {
      state.startDate = day.dataset.iso;
      dpInput.value = Gym.ukDate(state.startDate);
      setErr('startDate', '');
      dpPop.hidden = true;
    }
  });
  document.addEventListener('mousedown', function (e) {
    if (!dpPop.hidden && !e.target.closest('.dp')) dpPop.hidden = true;
  });

  // ---------- Chips ----------
  $('chips').innerHTML = CATEGORIES.map(function (c) {
    return '<button type="button" class="chip" aria-pressed="false" data-c="' + Gym.esc(c) + '">' + Gym.esc(c) + '</button>';
  }).join('');
  $('chips').addEventListener('click', function (e) {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    const c = chip.dataset.c;
    const i = state.categories.indexOf(c);
    if (i === -1) state.categories.push(c); else state.categories.splice(i, 1);
    chip.setAttribute('aria-pressed', i === -1 ? 'true' : 'false');
  });

  // ---------- Currency ----------
  function parseAmount(s) {
    const clean = String(s || '').replace(/[,\s]/g, '');
    if (!clean) return null;
    if (!/^\d+(\.\d{1,2})?$/.test(clean)) return NaN;
    return Number(clean);
  }
  function fmtAmount(n) {
    if (n === null || isNaN(n)) return '';
    return n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  $('spend').addEventListener('blur', function () {
    const n = parseAmount(this.value);
    if (n !== null && !isNaN(n)) this.value = fmtAmount(n);
  });
  $('spend').addEventListener('focus', function () { this.value = this.value.replace(/,/g, ''); });

  // ---------- Submit ----------
  function payload() {
    return {
      legalName: state.legalName, entityType: state.entityType, country: state.country, vatNumber: state.vat,
      industry: state.industry, contractStartDate: state.startDate, categories: state.categories.slice().sort(),
      annualSpend: { currency: state.currency, amount: state.spend }, paymentTerms: state.paymentTerms,
      termsAccepted: state.accept,
    };
  }
  $('submit').addEventListener('click', function () {
    if (!validate(3)) return;
    const btn = $('submit');
    btn.disabled = true;
    btn.textContent = 'Submitting...';
    const data = payload();
    state.attempts++;
    setTimeout(function () {
      btn.disabled = false;
      btn.textContent = 'Submit supplier';
      const vatNorm = data.vatNumber.replace(/\s+/g, '').toUpperCase();
      if (state.attempts === 1 || vatNorm === TAKEN_VAT) {
        Gym.record('wizard', 'rejected', { attempt: state.attempts, data: data, error: 'VAT_DUPLICATE' });
        $('banner').innerHTML = '<div class="error"><b>Submission rejected (409).</b> VAT number already registered to another supplier. Go back to Company details to correct it.</div>';
        return;
      }
      const ref = 'SUP-' + Gym.hash(JSON.stringify(data)).padStart(7, '0').slice(-7);
      Gym.record('wizard', 'submission', { attempt: state.attempts, reference: ref, supplier: data });
      $('wizard').hidden = true;
      $('steps').hidden = true;
      $('done').hidden = false;
      $('done').innerHTML = '<div class="success"><b>Supplier created.</b> Confirmation reference: <b id="confirmationRef">' + ref +
        '</b></div><p>' + Gym.esc(data.legalName) + ' has been sent to Finance for bank detail verification.</p>' +
        '<p><a href="index.html">Start another onboarding</a> &middot; <a href="../summary.html">Run summary</a></p>';
    }, 900);
  });

  showStep(1);
})();
