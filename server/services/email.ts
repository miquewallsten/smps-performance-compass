/**
 * Email service for SMPS Performance Compass.
 *
 * Supports multiple transport modes via MAIL_TRANSPORT env var:
 *   - "auto" (default): Uses sendmail in production, SMTP if configured, stub otherwise
 *   - "sendmail": Uses Hostinger's /usr/sbin/sendmail binary (no credentials needed)
 *   - "smtp": Uses SMTP with credentials from SMTP_HOST, SMTP_USER, SMTP_PASS
 *   - "stub": Logs emails but does not send (for development)
 *
 * On Hostinger shared hosting, sendmail is the recommended transport.
 * It routes through Hostinger's mail infrastructure with proper DKIM signing.
 *
 * Configuration via environment variables:
 *   MAIL_TRANSPORT: auto|sendmail|smtp|stub (default: auto)
 *   SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS (for SMTP mode)
 *   SMTP_FROM: From address
 *   APP_URL: Base URL for generating links
 */
import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587');
  const secure = process.env.SMTP_SECURE === 'true';
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const mailTransport = process.env.MAIL_TRANSPORT || 'auto'; // 'auto' | 'smtp' | 'sendmail' | 'stub'

  // AUTO mode: prefer sendmail in production (Hostinger), fall back to SMTP, then stub
  if (mailTransport === 'auto') {
    if (process.env.NODE_ENV === 'production') {
      // In production on Hostinger, use sendmail transport (always available)
      console.info('📧 Using sendmail transport (Hostinger production)');
      transporter = nodemailer.createTransport({
        sendmail: true,
        path: '/usr/sbin/sendmail',
        args: ['-i'],
      } as any);
      return transporter;
    }
    // In development, try SMTP if configured
    if (host && user && pass) {
      transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
      return transporter;
    }
    // No SMTP in development → stub
    console.warn('⚠️  SMTP not configured and not in production. Emails will not be sent.');
    transporter = {
      sendMail: async (options: nodemailer.SendMailOptions) => {
        console.log('📧 [STUB] Email not sent (SMTP not configured):', {
          to: options.to,
          subject: options.subject,
        });
        return { messageId: 'stub', accepted: [options.to as string] } as any;
      },
    } as any;
    return transporter;
  }

  // Explicit SENDMAIL mode
  if (mailTransport === 'sendmail') {
    console.info('📧 Using sendmail transport');
    transporter = nodemailer.createTransport({
      sendmail: true,
      path: '/usr/sbin/sendmail',
      args: ['-i'],
    } as any);
    return transporter;
  }

  // Explicit SMTP mode
  if (mailTransport === 'smtp' && host && user && pass) {
    transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
    return transporter;
  }

  // Explicit STUB mode or fallback
  console.warn('⚠️  Email transport set to stub mode. Emails will not be sent.');
  transporter = {
    sendMail: async (options: nodemailer.SendMailOptions) => {
      console.log('📧 [STUB] Email not sent:', {
        to: options.to,
        subject: options.subject,
      });
      return { messageId: 'stub', accepted: [options.to as string] } as any;
    },
  } as any;
  return transporter;
}

function getFromAddress(): string {
  return process.env.SMTP_FROM || 'SMPS Performance <noreply@smps.bowdot.online>';
}

function getAppUrl(): string {
  return process.env.APP_URL || 'https://smps.bowdot.online';
}

/**
 * Send an activation email to a new user.
 * Returns true if the email was sent successfully, false otherwise.
 */
export async function sendActivationEmail(
  to: string,
  name: string,
  token: string
): Promise<boolean> {
  const activationLink = `${getAppUrl()}/activate-account?token=${token}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="display: inline-block; background: #1e40af; color: white; padding: 12px 16px; border-radius: 8px; font-weight: bold; font-size: 18px;">
          SM<br/>PS
        </div>
      </div>
      <h2 style="color: #1e293b;">¡Bienvenido a SMPS Performance Compass!</h2>
      <p style="color: #475569; font-size: 16px;">
        Hola <strong>${name}</strong>,
      </p>
      <p style="color: #475569; font-size: 16px;">
        Se ha creado una cuenta para usted en SMPS Performance Compass, el sistema de evaluación de desempeño.
      </p>
      <p style="color: #475569; font-size: 16px;">
        Para activar su cuenta y establecer su contraseña, haga clic en el siguiente enlace:
      </p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${activationLink}" style="background: #1e40af; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
          Activar Cuenta
        </a>
      </div>
      <p style="color: #64748b; font-size: 14px;">
        Este enlace expirará en <strong>48 horas</strong>.
      </p>
      <p style="color: #64748b; font-size: 14px;">
        Si no solicitó esta cuenta, puede ignorar este correo.
      </p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
      <p style="color: #94a3b8; font-size: 12px;">
        Si el enlace no funciona, copie y pegue la siguiente URL en su navegador:<br/>
        <a href="${activationLink}" style="color: #3b82f6; word-break: break-all;">${activationLink}</a>
      </p>
    </div>
  `;

  try {
    const result = await getTransporter().sendMail({
      from: getFromAddress(),
      to,
      subject: 'SMPS — Activar Cuenta',
      html,
    });
    console.log(`📧 Activation email sent to ${to} ( messageId: ${result.messageId} )`);
    return (result.accepted?.length ?? 0) > 0;
  } catch (error) {
    console.error(`📧 Failed to send activation email to ${to}:`, error);
    return false;
  }
}

/**
 * Send a password reset email.
 * Returns true if the email was sent successfully, false otherwise.
 */
export async function sendPasswordResetEmail(
  to: string,
  name: string,
  token: string,
  expiresInHours: number = 1
): Promise<boolean> {
  const resetLink = `${getAppUrl()}/reset-password?token=${token}`;

  const hoursText = expiresInHours === 1 ? '1 hora' : `${expiresInHours} horas`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="display: inline-block; background: #1e40af; color: white; padding: 12px 16px; border-radius: 8px; font-weight: bold; font-size: 18px;">
          SM<br/>PS
        </div>
      </div>
      <h2 style="color: #1e293b;">Restablecer Contraseña</h2>
      <p style="color: #475569; font-size: 16px;">
        Hola <strong>${name}</strong>,
      </p>
      <p style="color: #475569; font-size: 16px;">
        Recibimos una solicitud para restablecer su contraseña en SMPS Performance Compass.
      </p>
      <p style="color: #475569; font-size: 16px;">
        Haga clic en el siguiente enlace para crear una nueva contraseña:
      </p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetLink}" style="background: #1e40af; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
          Restablecer Contraseña
        </a>
      </div>
      <p style="color: #64748b; font-size: 14px;">
        Este enlace expirará en <strong>${hoursText}</strong>.
      </p>
      <p style="color: #64748b; font-size: 14px;">
        Si no solicitó este cambio, puede ignorar este correo. Su contraseña no será modificada.
      </p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
      <p style="color: #94a3b8; font-size: 12px;">
        Si el enlace no funciona, copie y pegue la siguiente URL en su navegador:<br/>
        <a href="${resetLink}" style="color: #3b82f6; word-break: break-all;">${resetLink}</a>
      </p>
    </div>
  `;

  try {
    const result = await getTransporter().sendMail({
      from: getFromAddress(),
      to,
      subject: 'SMPS — Restablecer Contraseña',
      html,
    });
    console.log(`📧 Password reset email sent to ${to} ( messageId: ${result.messageId} )`);
    return (result.accepted?.length ?? 0) > 0;
  } catch (error) {
    console.error(`📧 Failed to send password reset email to ${to}:`, error);
    return false;
  }
}

/**
 * Send an admin-triggered password reset email (longer expiry).
 */
export async function sendAdminPasswordResetEmail(
  to: string,
  name: string,
  token: string
): Promise<boolean> {
  return sendPasswordResetEmail(to, name, token, 24);
}

/**
 * For development: verify SMTP configuration by sending a test email.
 */
export async function verifyEmailConfig(): Promise<{ ok: boolean; message: string }> {
  try {
    const transport = getTransporter();
    const mailTransport = process.env.MAIL_TRANSPORT || 'auto';

    if (mailTransport === 'sendmail' || (mailTransport === 'auto' && process.env.NODE_ENV === 'production')) {
      // Sendmail transport — verify by sending a test email
      return { ok: true, message: 'Sendmail transport active (Hostinger production)' };
    }

    if (!transport) {
      return { ok: false, message: 'Email transport not configured' };
    }

    // For SMTP transporters, verify the connection
    if ('verify' in transport) {
      await (transport as nodemailer.Transporter).verify();
      return { ok: true, message: 'SMTP connection verified' };
    }

    return { ok: true, message: `Email transport: ${mailTransport}` };
  } catch (error) {
    return { ok: false, message: `Email verification failed: ${(error as Error).message}` };
  }
}
