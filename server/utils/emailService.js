// Utils: Email Service
// Utilise nodemailer pour l'envoi d'emails
// Configuration via variables d'environnement

const nodemailer = require('nodemailer');

// Configuration du transport email
const createTransport = () => {
  // Support multiple providers based on env
  const provider = process.env.EMAIL_PROVIDER || 'smtp';

  switch (provider) {
    case 'smtp':
      return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

    case 'sendgrid':
      return nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        auth: {
          user: 'apikey',
          pass: process.env.SENDGRID_API_KEY,
        },
      });

    case 'mailgun':
      return nodemailer.createTransport({
        host: 'smtp.mailgun.org',
        port: 587,
        auth: {
          user: process.env.MAILGUN_USER,
          pass: process.env.MAILGUN_PASS,
        },
      });

    default:
      // Fallback to ethereal (test) if no config
      return nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        auth: {
          user: process.env.ETHEREAL_USER,
          pass: process.env.ETHEREAL_PASS,
        },
      });
  }
};

// Template email OTP
const getOTPTemplate = (otp, userNom, expiryMinutes = 10) => {
  return {
    subject: `🔐 Code de vérification AgriExchange - ${otp}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Segoe UI', sans-serif; background: #f8fafc; padding: 2rem; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 2rem; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #22c55e, #16a34a); color: white; padding: 1.5rem; border-radius: 12px 12px 0 0; margin: -2rem -2rem 2rem -2rem; }
            .logo { font-size: 1.5rem; font-weight: 800; margin-bottom: 0.5rem; }
            .otp-box { background: #f1f5f9; padding: 1.5rem; text-align: center; border-radius: 8px; margin: 1.5rem 0; border: 2px dashed #22c55e; }
            .otp { font-size: 2.5rem; font-weight: 800; color: #16a34a; letter-spacing: 8px; margin: 0; }
            .footer { color: #64748b; font-size: 0.875rem; margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #e2e8f0; }
            .warning { background: #fef3c7; color: #92400e; padding: 0.75rem; border-radius: 6px; font-size: 0.875rem; margin-top: 1rem; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🌱 AgriExchange</div>
              <div>Vérification de votre compte</div>
            </div>
            
            <p>Bonjour <strong>${userNom}</strong>,</p>
            <p>Voici votre code de vérification pour accéder à votre compte :</p>
            
            <div class="otp-box">
              <p class="otp">${otp}</p>
              <p style="margin: 0.5rem 0 0 0; color: #64748b; font-size: 0.875rem;">Code valide pendant ${expiryMinutes} minutes</p>
            </div>
            
            <p><strong>⚠️ Ne partagez jamais ce code avec personne.</strong></p>
            <p>Si vous n'avez pas demandé ce code,ignorez cet email.</p>
            
            <div class="footer">
              <p>Cet email a été envoyé à votre demande depuis AgriExchange.</p>
              <p>© ${new Date().getFullYear()} AgriExchange - Tous droits réservés.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
      🔐 Code de vérification AgriExchange

      Bonjour ${userNom},

      Votre code de vérification est : ${otp}

      ⚠️  Ne partagez jamais ce code avec personne.
      Ce code est valide pendant ${expiryMinutes} minutes.

      Si vous n'avez pas demandé ce code, ignorez cet email.

      —
      AgriExchange
    `,
  };
};

// Template email générique
const getGenericTemplate = (subject, htmlContent, textContent) => {
  return {
    subject,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Segoe UI', sans-serif; background: #f8fafc; padding: 2rem; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 2rem; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #22c55e, #16a34a); color: white; padding: 1.5rem; border-radius: 12px 12px 0 0; margin: -2rem -2rem 2rem -2rem; }
            .logo { font-size: 1.5rem; font-weight: 800; margin-bottom: 0.5rem; }
            .content { line-height: 1.6; color: #334155; }
            .footer { color: #64748b; font-size: 0.875rem; margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🌱 AgriExchange</div>
            </div>
            <div class="content">${htmlContent}</div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} AgriExchange</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: textContent,
  };
};

// Service principal
let transporter = null;

const initializeEmail = () => {
  try {
    transporter = createTransport();
    console.log('[EmailService] Transport email initialisé');
  } catch (error) {
    console.error('[EmailService] Erreur initialisation:', error.message);
  }
};

const sendEmail = async (to, template) => {
  if (!transporter) {
    console.warn('[EmailService] Transport non initialisé, tentative de réinitialisation...');
    initializeEmail();
  }

  if (!transporter) {
    throw new Error('Service email non configuré');
  }

  try {
    const info = await transporter.sendMail({
      from: {
        name: 'AgriExchange',
        address: process.env.EMAIL_FROM || 'noreply@agriexchange.com',
      },
      to,
      ...template,
    });

    console.log('[EmailService] Email envoyé:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[EmailService] Erreur envoi:', error.message);
    throw error;
  }
};

const sendOTP = async (email, userNom, otp, expiryMinutes = 10) => {
  const template = getOTPTemplate(otp, userNom, expiryMinutes);
  return sendEmail(email, template);
};

const sendGeneric = async (to, subject, html, text) => {
  const template = getGenericTemplate(subject, html, text);
  return sendEmail(to, template);
};

module.exports = {
  initializeEmail,
  sendEmail,
  sendOTP,
  sendGeneric,
};
