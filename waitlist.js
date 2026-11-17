// QuestPresso waitlist: sends signups to /api/waitlist (Vercel function → Google Sheet)
(function () {
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var forms = document.querySelectorAll('.wl-form');

  function showSuccess(email) {
    forms.forEach(function (f) { f.hidden = true; });
    document.querySelectorAll('.wl-success').forEach(function (el) { el.hidden = false; });
    document.querySelectorAll('.wl-email').forEach(function (el) { el.textContent = email; });
    try { localStorage.setItem('qp_waitlist_email', email); } catch (e) {}
  }

  function showError(form, msg) {
    var el = form.querySelector('.wl-error');
    if (!el) return;
    el.textContent = msg;
    el.hidden = !msg;
  }

  // Already signed up on this device? Show the confirmation instead of the form.
  try {
    var saved = localStorage.getItem('qp_waitlist_email');
    if (saved) showSuccess(saved);
  } catch (e) {}

  forms.forEach(function (form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      if (form.classList.contains('is-loading')) return;

      var email = (form.elements.email.value || '').trim();
      var cafe = form.elements.cafe ? form.elements.cafe.value.trim() : '';
      var honeypot = form.elements.company_website ? form.elements.company_website.value : '';

      if (!EMAIL_RE.test(email)) {
        showError(form, 'Please enter a valid email address.');
        form.elements.email.focus();
        return;
      }
      showError(form, '');
      form.classList.add('is-loading');
      var btn = form.querySelector('button[type=submit]');
      var label = btn.textContent;
      btn.textContent = 'Joining…';

      var params = new URLSearchParams(location.search);
      try {
        var res = await fetch('/api/waitlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email,
            cafe: cafe,
            source: form.dataset.source || '',
            referrer: document.referrer || '',
            utm_source: params.get('utm_source') || '',
            utm_campaign: params.get('utm_campaign') || '',
            company_website: honeypot
          })
        });
        var data = await res.json().catch(function () { return {}; });
        if (!res.ok || !data.ok) throw new Error(data.error || 'Something went wrong.');
        showSuccess(email);
      } catch (err) {
        showError(form, err.message || 'Something went wrong. Please try again.');
      } finally {
        form.classList.remove('is-loading');
        btn.textContent = label;
      }
    });
  });
})();
