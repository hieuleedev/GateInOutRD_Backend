import transporter from '../config/mail.js';

export const sendMail = async ({ to, subject, html }) => {
  if (!to) return;

  try {
    await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error('Send mail error:', err.message);
  }
};
