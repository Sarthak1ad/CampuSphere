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

  passwordResetOtp: (data) => ({
    subject: `🔐 CampuSphere - Your Password Reset Code: ${data.otp}`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06);">
        <div style="background: linear-gradient(135deg, #E05A1A 0%, #C2410C 100%); padding: 28px 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">CampuSphere</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 6px 0 0 0; font-size: 14px;">Password Reset Verification</p>
        </div>
        <div style="padding: 32px 28px;">
          <p style="font-size: 16px; color: #1f2937; margin-top: 0;">Hello <strong>${data.name || 'User'}</strong>,</p>
          <p style="font-size: 15px; color: #4b5563; line-height: 1.6;">We received a request to reset your password for your CampuSphere account. Use the 6-digit verification code below to complete the reset process:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <div style="display: inline-block; background: #FFF7ED; border: 2px dashed #E05A1A; border-radius: 12px; padding: 16px 36px;">
              <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; color: #E05A1A; letter-spacing: 8px;">${data.otp}</span>
            </div>
            <p style="font-size: 13px; color: #9ca3af; margin: 10px 0 0 0;">⏱️ Valid for 10 minutes</p>
          </div>

          <p style="font-size: 14px; color: #6b7280; line-height: 1.5;">If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
          
          <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 28px 0;" />
          <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 0;">Campus Events & Smart Ticketing Portal &bull; Sanjivani Group of Institutes</p>
        </div>
      </div>
    `,
  }),

  passwordResetSuccess: (data) => ({
    subject: `✅ CampuSphere - Password Reset Successfully`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
        <div style="background: #10B981; padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 22px;">Password Updated</h1>
        </div>
        <div style="padding: 28px;">
          <p style="font-size: 15px; color: #1f2937;">Hello <strong>${data.name || 'User'}</strong>,</p>
          <p style="font-size: 14px; color: #4b5563; line-height: 1.6;">Your password for CampuSphere has been reset successfully. You can now log in with your new password.</p>
          <p style="font-size: 13px; color: #ef4444; margin-top: 20px;">If you did not perform this action, please contact your administrator immediately.</p>
        </div>
      </div>
    `,
  }),
};

module.exports = { sendEmail, emailTemplates };
