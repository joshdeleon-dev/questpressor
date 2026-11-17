// Vercel serverless function: POST /api/waitlist
// Validates the signup, then forwards it to the Google Apps Script web app,
// which appends a row to your Google Sheet.
//
// Required environment variables (Vercel → Project → Settings → Environment Variables):
//   APPS_SCRIPT_URL  – the /exec URL of your deployed Apps Script web app
//   WAITLIST_SECRET  – any long random string; must match SECRET in Code.gs

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const clip = (v, n) => String(v || '').trim().slice(0, n);

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { APPS_SCRIPT_URL, WAITLIST_SECRET } = process.env;
  if (!APPS_SCRIPT_URL || !WAITLIST_SECRET) {
    return res.status(500).json({ ok: false, error: 'Waitlist is not configured yet.' });
  }

  let body = req.body || {};
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }

  // Honeypot: real people never fill this hidden field. Pretend success for bots.
  if (body.company_website) return res.status(200).json({ ok: true });

  const email = clip(body.email, 254).toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ ok: false, error: 'Please enter a valid email address.' });
  }

  const payload = {
    secret: WAITLIST_SECRET,
    email,
    cafe: clip(body.cafe, 120),
    source: clip(body.source, 40),
    referrer: clip(body.referrer, 300),
    utm_source: clip(body.utm_source, 100),
    utm_campaign: clip(body.utm_campaign, 100),
    country: clip(req.headers['x-vercel-ip-country'], 4),
    user_agent: clip(req.headers['user-agent'], 300)
  };

  try {
    const r = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow'
    });
    const text = await r.text();
    let data;
    try { data = JSON.parse(text); } catch { data = null; }
    if (!data || !data.ok) {
      console.error('Apps Script error:', r.status, text.slice(0, 500));
      return res.status(502).json({ ok: false, error: 'Could not save your signup. Please try again.' });
    }
    return res.status(200).json({ ok: true, duplicate: !!data.duplicate });
  } catch (err) {
    console.error('Forwarding failed:', err);
    return res.status(502).json({ ok: false, error: 'Could not save your signup. Please try again.' });
  }
};
