// Payments ledger and bank statement for September 2026, generated from a fixed seed.
(function (root) {
  'use strict';
  const G = root.Gym;
  const r = G.rng(20260930);
  const SUPPLIERS = ['Brightwater Logistics BV', 'Kestrel Office Supplies Ltd', 'Nordlys Engineering AS', 'Ostara Facilities GmbH',
    'Pinecrest Software Ltd', 'Quayside Freight Ltd', 'Redfern Catering Co', 'Solberg Industrial AB', 'Tamsin Print & Media',
    'Upland Security Services', 'Valewood Consulting LLP', 'Westmark Fuel Cards', 'Yarrow Cleaning Services', 'Zephyr Telecom plc'];

  // Business days in September 2026.
  const days = [];
  for (let d = 1; d <= 30; d++) {
    const dt = new Date(Date.UTC(2026, 8, d));
    const wd = dt.getUTCDay();
    if (wd !== 0 && wd !== 6) days.push('2026-09-' + G.pad(d));
  }

  const ledger = [];
  for (let i = 0; i < 60; i++) {
    const big = r() < 0.25;
    const amount = Math.round((big ? G.intBetween(r, 8000, 48000) : G.intBetween(r, 180, 7900)) * 100 + G.intBetween(r, 0, 99)) / 100;
    ledger.push({ id: 'PAY-' + (24001 + i), supplier: G.pick(r, SUPPLIERS), date: G.pick(r, days), amount: amount });
  }
  ledger.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
  ledger.forEach(function (p, i) { p.id = 'PAY-' + (24001 + i); });

  function shortName(s) { return s.toUpperCase().replace(/[^A-Z0-9 ]/g, '').split(' ').slice(0, 2).join(' '); }

  let bankSeq = G.intBetween(r, 310000, 319000);
  const bank = ledger.map(function (p) {
    bankSeq += G.intBetween(r, 1, 9);
    return { ref: 'BST-' + bankSeq, valueDate: p.date, description: 'SEPA CT ' + p.id + ' ' + shortName(p.supplier), amount: -p.amount };
  });

  const order = G.shuffle(r, ledger.map(function (_, i) { return i; }));
  const iAmt1 = order[0], iAmt2 = order[1], iMissing = order[2], iDate = order[3];

  // Amount differences.
  (function () {
    const s = Math.abs(bank[iAmt1].amount).toFixed(2);
    const intPart = s.split('.')[0];
    let swapped = intPart;
    for (let k = intPart.length - 2; k >= 0; k--) {
      if (intPart[k] !== intPart[k + 1]) { swapped = intPart.slice(0, k) + intPart[k + 1] + intPart[k] + intPart.slice(k + 2); break; }
    }
    if (swapped === intPart) swapped = String(Number(intPart) + 90);
    bank[iAmt1].amount = -Number(swapped + '.' + s.split('.')[1]);
    bank[iAmt2].amount = -Math.round((Math.abs(bank[iAmt2].amount) + G.intBetween(r, 15, 240) + G.intBetween(r, 1, 99) / 100) * 100) / 100;
  })();
  bank[iDate].valueDate = G.addDays(bank[iDate].valueDate, G.intBetween(r, 3, 6));

  const missingFromBank = bank[iMissing];
  const statement = bank.filter(function (b) { return b !== missingFromBank; });
  bankSeq += G.intBetween(r, 1, 9);
  statement.push({ ref: 'BST-' + bankSeq, valueDate: G.pick(r, days.slice(5)),
    description: 'SEPA CT PAY-' + (24060 + G.intBetween(r, 3, 30)) + ' ' + shortName(G.pick(r, SUPPLIERS)),
    amount: -Math.round(G.intBetween(r, 900, 9000) * 100 + G.intBetween(r, 0, 99)) / 100 });
  statement.sort(function (a, b) { return a.valueDate < b.valueDate ? -1 : a.valueDate > b.valueDate ? 1 : (a.ref < b.ref ? -1 : 1); });

  root.ReconData = { ledger: ledger, statement: statement, period: 'September 2026', account: 'NL91 ABNA 0417 1643 00' };
})(typeof window !== 'undefined' ? window : globalThis);
