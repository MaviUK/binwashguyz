// Netlify Function: sendBookingEmail.js (no external deps)
// Uses native fetch to call Resend's API.
// Requires env var RESEND_API_KEY.

function buildText(data = {}) {
  const {
    business = 'Bin Wash Guyz',
    name = '',
    address = '',
    postcode = '',
    bins = '',
    date = '',
    notes = '',
  } = data;

  return [
    `New bin clean request for ${business}:`,
    `Name: ${name}`,
    `Address: ${address}`,
    `Postcode: ${postcode}`,
    `Bins: ${bins}`,
    date ? `Preferred date: ${date}` : null,
    notes ? `Notes: ${notes}` : null,
  ].filter(Boolean).join('\n');
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const data = JSON.parse(event.body || '{}');
    const to = Array.isArray(data.to) ? data.to : [data.to || 'binwashguyz@gmail.com'];

    const payload = {
      // For testing, Resend allows this sender. Replace with your verified domain when ready.
      from: 'Bin Wash Guyz <onboarding@resend.dev>',
      to,
      subject: 'New Bin Cleaning Booking',
      text: buildText(data),
      // If you collect a customer email, you can add: reply_to: data.email
    };

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error('Resend error:', errText);
      return { statusCode: 500, body: JSON.stringify({ ok: false, error: errText }) };
    }

    const json = await resp.json();
    return { statusCode: 200, body: JSON.stringify({ ok: true, id: json?.id || null }) };
  } catch (err) {
    console.error('sendBookingEmail error:', err);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: String(err) }) };
  }
};
