// Customer directory for the customer lookup case, generated from a fixed seed.
(function (root) {
  'use strict';
  const G = root.Gym;
  const r = G.rng(48151623);
  const FIRST = ['Anna', 'Lars', 'Sofia', 'Erik', 'Ingrid', 'Johan', 'Freja', 'Nils', 'Maja', 'Oskar', 'Elin', 'Henrik', 'Karin', 'Axel', 'Linnea', 'Gustav'];
  const LAST = ['Andersson', 'Berg', 'Dahl', 'Ek', 'Holm', 'Jansson', 'Lund', 'Nyberg', 'Sandberg', 'Strand', 'Wallin', 'Lindgren'];
  const CITIES = [['Stockholm', '114 '], ['Gothenburg', '411 '], ['Malmo', '211 '], ['Uppsala', '753 '], ['Vasteras', '722 '], ['Orebro', '702 ']];
  const TIERS = ['Standard', 'Silver', 'Gold', 'Private'];
  const CHANNELS = ['Email', 'Phone', 'Post', 'SMS', 'Mobile app'];
  const RMS = ['Petra Alm', 'Jonas Kvist', 'Hanna Rask', 'Mikael Sund'];

  function person(first, last, city) {
    const c = city || G.pick(r, CITIES);
    const id = 'CUS-' + G.intBetween(r, 100000, 999999);
    const dob = G.intBetween(r, 1950, 2001) + '-' + G.pad(G.intBetween(r, 1, 12)) + '-' + G.pad(G.intBetween(r, 1, 28));
    const score = G.intBetween(r, 8, 92);
    return {
      id: id, name: first + ' ' + last, dob: dob, city: c[0],
      postcode: c[1] + G.pad(G.intBetween(r, 10, 99)), account: 'SE' + G.intBetween(r, 10, 99) + ' 8000 ' + G.intBetween(r, 1000, 9999) + ' ' + G.intBetween(r, 1000, 9999) + ' ' + G.intBetween(r, 100, 999),
      tier: G.pick(r, TIERS), email: (first + '.' + last).toLowerCase() + '.' + id.slice(-3) + '@example.com',
      phone: '+46 7' + G.intBetween(r, 0, 9) + ' ' + G.intBetween(r, 100, 999) + ' ' + G.pad(G.intBetween(r, 0, 99)) + ' ' + G.pad(G.intBetween(r, 0, 99)),
      channel: G.pick(r, CHANNELS), rm: G.pick(r, RMS), since: String(G.intBetween(r, 2004, 2024)),
      riskScore: score, riskBand: score < 35 ? 'Low' : score < 70 ? 'Medium' : 'High',
      kycDue: '2027-' + G.pad(G.intBetween(r, 1, 12)) + '-' + G.pad(G.intBetween(r, 1, 28)), pep: r() < 0.08 ? 'Yes' : 'No',
    };
  }

  const customers = [];
  for (let i = 0; i < 22; i++) customers.push(person(G.pick(r, FIRST), G.pick(r, LAST)));
  // Two customers share a name; the task identifies one by city and date of birth.
  customers.splice(G.intBetween(r, 2, 8), 0, person('Marta', 'Lindqvist', CITIES[0]));
  customers.splice(G.intBetween(r, 10, 18), 0, person('Marta', 'Lindqvist', CITIES[1]));
  customers.splice(G.intBetween(r, 4, 20), 0, person('Martin', 'Lindqvist', CITIES[1]));

  root.CustomerData = { customers: customers, byId: function (id) { return customers.find(function (c) { return c.id === id; }); } };
})(typeof window !== 'undefined' ? window : globalThis);
