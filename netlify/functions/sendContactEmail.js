// netlify/functions/sendContactEmail.js
// Uses native fetch to call Resend's API. Requires RESEND_API_KEY.

function buildText(data = {}) {
  const {
    business = 'Bin Wash Guyz',
    name = '',
    email = '',
    phone = '',
    message = '',
  } = data;

  return [
    `New contact enquiry for ${business}:`,
    `Name: ${name}`,
    email ? `Email: ${email}` : null,
    phone ? `Phone: ${phone}` : null,
    '',
    'Message:',
    message || '',
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
      from: 'Bin Wash Guyz <onboarding@resend.dev>', // swap to verified domain later
      to,
      subject: 'New Website Contact Enquiry',
      text: buildText(data),
      ...(data.email ? { reply_to: data.email } : {}),
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
    console.error('sendContactEmail error:', err);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: String(err) }) };
  }
};
