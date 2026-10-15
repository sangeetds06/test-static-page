// Interruptions shared by the customer lookup pages: a consent modal shown 2-4 s after load.
(function () {
  'use strict';
  const page = document.body.dataset.page || 'page';
  const key = 'gym.consent.' + page;
  function seen() { try { return sessionStorage.getItem(key); } catch (e) { return null; } }
  if (seen()) return;
  const delay = 2000 + Math.floor(Math.random() * 2000);
  setTimeout(function () {
    const ov = document.createElement('div');
    ov.className = 'overlay';
    ov.innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="consentTitle">' +
      '<h2 id="consentTitle">Your privacy choices</h2>' +
      '<p>We use essential cookies to run this service. With your permission we would also like to use analytics and personalisation cookies to improve it.</p>' +
      '<p class="muted">You can change your choice at any time under Settings &gt; Privacy.</p>' +
      '<div class="actions"><button type="button" class="secondary" data-c="reject">Reject non-essential</button>' +
      '<button type="button" data-c="accept">Accept all</button></div></div>';
    document.body.appendChild(ov);
    const prevFocus = document.activeElement;
    ov.querySelector('button').focus();
    ov.addEventListener('keydown', function (e) { if (e.key === 'Escape') e.preventDefault(); });
    ov.addEventListener('click', function (e) {
      const b = e.target.closest('button[data-c]');
      if (!b) return;
      try { sessionStorage.setItem(key, b.dataset.c); } catch (err) { /* ignore */ }
      Gym.record('interrupts', 'consent', { page: page, choice: b.dataset.c });
      ov.remove();
      if (prevFocus && prevFocus.focus) prevFocus.focus();
    });
  }, delay);
})();
