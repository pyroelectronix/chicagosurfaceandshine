// Email via Resend, SMS via Twilio. Both are optional: if keys are missing, the step is skipped.
const BRAND = process.env.BUSINESS_NAME || 'Chicago Surface and Shine';

export function fmtDate(d) {
  try {
    return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  } catch { return d; }
}

async function sendEmail(to, subject, text) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from || !to) return { skipped: true };
  const html = `<div style="font-family:Georgia,serif;color:#3b312b;max-width:520px;margin:auto;padding:24px">
    <h2 style="font-weight:normal;letter-spacing:2px">${BRAND.toUpperCase()}</h2>
    ${text.split('\n').map((l) => `<p>${l}</p>`).join('')}
    <p style="color:#8a8f78">Clean Spaces. Brighter Places.</p></div>`;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, text, html }),
  });
  return { ok: res.ok, status: res.status };
}

async function sendSms(to, body) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !token || !from || !to) return { skipped: true };
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ To: to, From: from, Body: body }),
  });
  return { ok: res.ok, status: res.status };
}

function details(b) {
  return [
    `Service: ${b.service}`,
    `Date: ${fmtDate(b.service_date)}${b.start_time ? ' at ' + b.start_time : ''}`,
    b.address ? `Address: ${b.address}` : null,
  ].filter(Boolean).join('\n');
}

export async function notifyBookingConfirmed(b) {
  const msg = `Hi ${b.customer_name}, your booking with ${BRAND} is confirmed.\n${details(b)}\nNeed to change something? Just reply to this message.`;
  const sms = `${BRAND}: Hi ${b.customer_name}, your ${b.service} is confirmed for ${fmtDate(b.service_date)}${b.start_time ? ' at ' + b.start_time : ''}. Thank you!`;
  return Promise.allSettled([
    sendEmail(b.customer_email, `Your booking is confirmed - ${BRAND}`, msg),
    sendSms(b.customer_phone, sms),
  ]);
}

export async function notifyBookingCancelled(b, reason) {
  const msg = `Hi ${b.customer_name}, your booking with ${BRAND} has been cancelled.\n${details(b)}${reason ? '\nReason: ' + reason : ''}\nWe are sorry for any inconvenience. Reply to this message to rebook.`;
  const sms = `${BRAND}: Hi ${b.customer_name}, your ${b.service} on ${fmtDate(b.service_date)} has been cancelled.${reason ? ' Reason: ' + reason + '.' : ''} Reply to rebook.`;
  return Promise.allSettled([
    sendEmail(b.customer_email, `Your booking was cancelled - ${BRAND}`, msg),
    sendSms(b.customer_phone, sms),
  ]);
}
