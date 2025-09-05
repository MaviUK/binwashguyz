import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async (req, res) => {
  try {
    const body = await req.json();

    await resend.emails.send({
      from: 'Bin Wash Guyz <noreply@yourdomain.com>',
      to: 'aabincleaning@gmail.com',
      subject: 'New Bin Cleaning Booking',
      text: `
New booking received for ${body.business}:

Name: ${body.name}
Address: ${body.address}
Postcode: ${body.postcode}
Bins: ${body.bins}
Preferred Date: ${body.date}
Notes: ${body.notes || "None"}
      `,
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to send email' });
  }
};
