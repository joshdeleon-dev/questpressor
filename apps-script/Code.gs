/**
 * QuestPresso waitlist → Google Sheet
 * Paste into Extensions → Apps Script of your Google Sheet, set SECRET,
 * then Deploy → New deployment → Web app (Execute as: Me, Who has access: Anyone).
 */
const SECRET = 'PASTE-THE-SAME-RANDOM-STRING-AS-WAITLIST_SECRET';
const SHEET_NAME = 'Waitlist';
const HEADERS = ['Timestamp', 'Email', 'Café name', 'Form', 'Referrer', 'UTM source', 'UTM campaign', 'Country', 'User agent'];

function doPost(e) {
  try {
    const data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (data.secret !== SECRET) return json_({ ok: false, error: 'unauthorized' });

    const email = String(data.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return json_({ ok: false, error: 'invalid email' });

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const sheet = getSheet_();
      const last = sheet.getLastRow();
      if (last > 1) {
        const existing = sheet.getRange(2, 2, last - 1, 1).getValues().flat();
        const idx = existing.indexOf(email);
        if (idx !== -1) {
          // Already signed up: fill in café name if it was missing, don't add a duplicate row.
          const cafeCell = sheet.getRange(idx + 2, 3);
          if (!cafeCell.getValue() && data.cafe) cafeCell.setValue(safe_(data.cafe));
          return json_({ ok: true, duplicate: true });
        }
      }
      sheet.appendRow([
        new Date(), email, safe_(data.cafe), safe_(data.source), safe_(data.referrer),
        safe_(data.utm_source), safe_(data.utm_campaign), safe_(data.country), safe_(data.user_agent)
      ]);
    } finally {
      lock.releaseLock();
    }
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function doGet() {
  return json_({ ok: true, service: 'questpresso-waitlist' });
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  }
  return sheet;
}

// Stop values like "=HYPERLINK(...)" being run as formulas in the sheet.
function safe_(v) {
  const s = String(v || '').slice(0, 300);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
