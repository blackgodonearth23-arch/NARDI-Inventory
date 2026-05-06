const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  } else {
    // No SMTP configured – email sending will be skipped
    transporter = null;
  }
  return transporter;
}

async function sendMail(to, subject, html) {
  const t = getTransporter();
  if (!t) {
    console.log(`[MAIL] Would send to ${to}: ${subject}`);
    return;
  }
  try {
    await t.sendMail({
      from: process.env.SMTP_USER,
      to,
      subject,
      html
    });
    console.log(`[MAIL] Sent to ${to}: ${subject}`);
  } catch (err) {
    console.error(`[MAIL] Failed to send to ${to}:`, err.message);
  }
}

module.exports = { sendMail };