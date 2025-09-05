// CommonJS Netlify Function (works without ESM flags)
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

// Helper to build the plain-text email body
function buildText(data) {
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

    // Use a verified sender. For testing, Resend allows this:
    // 'onboarding@resend.dev'. Replace with your domain once verified.
    const from = 'Bin Wash Guyz <onboarding@resend.dev>';

    const to = Array.isArray(data.to) ? data.to : [data.to || 'aabincleaning@gmail.com'];

    const subject = `New Bin Cleaning Booking`;
    const text = buildText(data);

    const result = await resend.emails.send({
      from,
      to,
      subject,
      text,
      // if you collect a customer email, you can set reply_to here:
      // reply_to: data.email || undefined,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, id: result?.data?.id || null }),
    };
  } catch (err) {
    console.error('sendBookingEmail error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: String(err) }),
    };
  }
};
