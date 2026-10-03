/**
 * EMAIL SERVICE
 * -------------
 * Uses nodemailer for transactional emails.
 * Falls back to Ethereal (fake SMTP) if no SMTP configured — great for dev.
 */
const nodemailer = require('nodemailer');

let transporter = null;

// Initialize transporter lazily on first use
const getTransporter = async () => {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    // Production: use configured SMTP
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    console.log('📧 Email: Using configured SMTP server');
  } else {
    // Development: Use Ethereal fake SMTP (no emails actually sent)
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    console.log('📧 Email: Using Ethereal test account. Preview URLs will be logged.');
  }

  return transporter;
};

const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const t = await getTransporter();
    const info = await t.sendMail({
      from: process.env.EMAIL_FROM || '"College Events" <noreply@collegeevents.com>',
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML for plain text
    });

    // If using Ethereal, log the preview URL
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`📧 Email preview (Ethereal): ${previewUrl}`);
    }

    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('❌ Email sending failed:', err.message);
    return { success: false, error: err.message };
  }
};

// ── EMAIL TEMPLATES ───────────────────────────────────────────────────────────
const emailTemplates = {
  registrationConfirmed: (data) => ({
    subject: `✅ You're registered: ${data.eventTitle}`,
    html: `
      <div style="font-family: DM Sans, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #E05A1A; padding: 20px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0;">🎉 Registration Confirmed!</h1>
        </div>
        <div style="padding: 30px; background: #fff; border: 1px solid #eee;">
          <p>Hi <strong>${data.studentName}</strong>,</p>
          <p>You're confirmed for <strong>${data.eventTitle}</strong>!</p>
          <p><strong>Date:</strong> ${data.startDate}</p>
          <p><strong>Venue:</strong> ${data.venueName}</p>
          <p>Your QR code for check-in is attached. Save it to your phone!</p>
          <p style="background: #FFF1EA; padding: 15px; border-radius: 8px; border-left: 4px solid #E05A1A;">
            <strong>QR Token:</strong> ${data.qrToken}
          </p>
        </div>
      </div>
    `,
  }),

  eventReminder: (data) => ({
    subject: `⏰ Reminder: ${data.eventTitle} starts tomorrow!`,
    html: `
      <div style="font-family: DM Sans, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #E05A1A; padding: 20px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0;">⏰ Event Reminder</h1>
        </div>
        <div style="padding: 30px; background: #fff; border: 1px solid #eee;">
          <p>Hi <strong>${data.studentName}</strong>,</p>
          <p>Don't forget! <strong>${data.eventTitle}</strong> starts <strong>tomorrow</strong>.</p>
          <p><strong>Time:</strong> ${data.startDate}</p>
          <p><strong>Venue:</strong> ${data.venueName}</p>
          <p>Bring your QR code for smooth check-in!</p>
        </div>
      </div>
    `,
  }),

  waitlistPromoted: (data) => ({
    subject: `🎊 You got a spot! ${data.eventTitle}`,
    html: `
      <div style="font-family: DM Sans, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #E05A1A; padding: 20px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0;">🎊 Spot Available!</h1>
        </div>
        <div style="padding: 30px; background: #fff; border: 1px solid #eee;">
          <p>Hi <strong>${data.studentName}</strong>,</p>
          <p>A spot opened up in <strong>${data.eventTitle}</strong> and you're next on the waitlist!</p>
          <p>You've been automatically registered. Check your dashboard for your QR code.</p>
        </div>
      </div>
    `,
  }),
};

module.exports = { sendEmail, emailTemplates };
