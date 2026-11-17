# QuestPresso waitlist site

A static landing page on Vercel. Signups go page → `/api/waitlist` (Vercel function) → Google Apps Script → Google Sheet.

```
index.html          the landing page
waitlist.js         form handling in the browser
icon.png            logo / favicon
api/waitlist.js     Vercel function: validates and forwards signups
apps-script/Code.gs paste into your Google Sheet's Apps Script (not deployed to Vercel)
```

## 1. Google Sheet + Apps Script (about 5 minutes)

1. Create a new Google Sheet, e.g. "QuestPresso Waitlist".
2. **Extensions → Apps Script**. Delete the starter code and paste in `apps-script/Code.gs`.
3. Replace `SECRET` with a long random string (e.g. run `openssl rand -hex 24`). Save.
4. **Deploy → New deployment → ⚙ → Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Authorize when asked, then copy the **Web app URL** (ends in `/exec`).

The "Waitlist" tab and its header row are created on the first signup.

> If you edit Code.gs later, use **Deploy → Manage deployments → Edit → Version: New version**
> to keep the same URL. "New deployment" creates a new URL.

## 2. Vercel

1. Push this folder to a GitHub repo (or run `npx vercel` inside it).
2. In Vercel: **Add New → Project**, import the repo. Framework preset: **Other**. No build command.
3. **Settings → Environment Variables**, add for Production (and Preview if you want):
   - `APPS_SCRIPT_URL` = the `/exec` URL from step 1
   - `WAITLIST_SECRET` = the same string you put in `SECRET`
4. Redeploy so the variables take effect.
5. Optional: **Settings → Domains** to add your own domain.

## 3. Test

Submit the form on your live URL. A row should appear in the sheet within a couple of seconds.
If it doesn't, check **Vercel → Project → Logs** for `Apps Script error`. The usual causes are
a mismatched secret, or the web app's access not set to "Anyone".

To test again from the same browser, clear `qp_waitlist_email` from localStorage
(the page remembers that you've signed up).

## What gets saved

Timestamp, email, café name, which form was used (hero or join), referrer, UTM source and campaign,
country (from Vercel), and user agent. Duplicate emails don't create a new row.
A hidden honeypot field filters out basic bots.

Remember to add a real Privacy page before launch. The footer links are placeholders.
