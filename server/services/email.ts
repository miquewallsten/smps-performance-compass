/**
 * Email service for SMPS Performance Compass.
 *
 * Supports multiple transport modes via MAIL_TRANSPORT env var or database config:
 *   - "auto" (default): Uses sendmail in production, SMTP if configured, stub otherwise
 *   - "sendmail": Uses Hostinger's sendmail binary (no credentials needed)
 *   - "smtp": Uses SMTP with credentials from SMTP_HOST, SMTP_USER, SMTP_PASS
 *   - "stub": Logs emails but does not send (for development)
 *
 * On Hostinger hosting, sendmail is the recommended transport.
 * It routes through Hostinger's mail infrastructure with proper DKIM signing.
 *
 * Configuration priority: Database (smtp_config table) > Environment variables
 *
 * Configuration via environment variables:
 *   MAIL_TRANSPORT: auto|sendmail|smtp|stub (default: auto)
 *   SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS (for SMTP mode)
 *   SMTP_FROM: From address
 *   APP_URL: Base URL for generating links
 */
import nodemailer from 'nodemailer';
import { existsSync } from 'fs';
import { db } from '../db/connection.js';

let transporter: nodemailer.Transporter | null = null;
let lastConfigCheck: number | null = null;
let cachedSmtpConfig: any = null;
let cachedTransportConfig: string | null = null; // Track which config the transporter was built from

/**
 * Find the sendmail binary on the system.
 * Checks common paths and the SENDMAIL_PATH env var.
 */
function getSendmailPath(): string | null {
  // Allow override via env var
  if (process.env.SENDMAIL_PATH) return process.env.SENDMAIL_PATH;

  // Common sendmail paths on Hostinger and Linux
  const paths = ['/usr/sbin/sendmail', '/usr/lib/sendmail', '/usr/local/sbin/sendmail'];
  for (const p of paths) {
    try {
      if (existsSync(p)) return p;
    } catch { /* ignore */ }
  }
  return null;
}

/**
 * Get SMTP configuration from database or environment variables.
 * Database config is cached for 5 seconds to avoid excessive queries.
 */
async function getSmtpConfig(): Promise<{
  smtp_host: string | null;
  smtp_port: number;
  smtp_secure: boolean;
  smtp_user: string | null;
  smtp_pass: string | null;
  smtp_from: string;
  mail_transport: string;
}> {
  const now = Date.now();
  // Cache for 5 seconds
  if (cachedSmtpConfig && lastConfigCheck && now - lastConfigCheck < 5000) {
    return cachedSmtpConfig;
  }

  try {
    const dbConfig = await db.get('SELECT * FROM smtp_config WHERE id = 1') as any;

    if (dbConfig) {
      cachedSmtpConfig = {
        smtp_host: dbConfig.smtp_host,
        smtp_port: dbConfig.smtp_port || 587,
        smtp_secure: !!dbConfig.smtp_secure,
        smtp_user: dbConfig.smtp_user,
        smtp_pass: dbConfig.smtp_pass,
        smtp_from: dbConfig.smtp_from || 'SMPS Performance <noreply@smps.bowdot.online>',
        mail_transport: dbConfig.mail_transport || 'auto',
      };
    } else {
      // Fall back to environment variables
      cachedSmtpConfig = {
        smtp_host: process.env.SMTP_HOST || null,
        smtp_port: parseInt(process.env.SMTP_PORT || '587'),
        smtp_secure: process.env.SMTP_SECURE === 'true',
        smtp_user: process.env.SMTP_USER || null,
        smtp_pass: process.env.SMTP_PASS || null,
        smtp_from: process.env.SMTP_FROM || 'SMPS Performance <noreply@smps.bowdot.online>',
        mail_transport: process.env.MAIL_TRANSPORT || 'auto',
      };
    }
  } catch (err) {
    console.warn('Failed to load SMTP config from DB, using env vars:', err);
    cachedSmtpConfig = {
      smtp_host: process.env.SMTP_HOST || null,
      smtp_port: parseInt(process.env.SMTP_PORT || '587'),
      smtp_secure: process.env.SMTP_SECURE === 'true',
      smtp_user: process.env.SMTP_USER || null,
      smtp_pass: process.env.SMTP_PASS || null,
      smtp_from: process.env.SMTP_FROM || 'SMPS Performance <noreply@smps.bowdot.online>',
      mail_transport: process.env.MAIL_TRANSPORT || 'auto',
    };
  }

  lastConfigCheck = now;
  return cachedSmtpConfig;
}

async function getTransporter(): Promise<nodemailer.Transporter> {
  const config = await getSmtpConfig();
  // Build a config fingerprint to detect changes
  const configKey = `${config.mail_transport}|${config.smtp_host}|${config.smtp_port}|${config.smtp_secure}|${config.smtp_user}|${process.env.NODE_ENV}`;

  // If transporter exists and config hasn't changed, reuse it
  if (transporter && cachedTransportConfig === configKey) {
    return transporter;
  }

  // Config changed or first call — reset transporter
  transporter = null;
  cachedTransportConfig = configKey;

  const { smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass, smtp_from, mail_transport } = config;

  // AUTO mode: prefer sendmail in production (Hostinger), fall back to SMTP, then stub
  if (mail_transport === 'auto') {
    if (process.env.NODE_ENV === 'production') {
      // In production on Hostinger, use sendmail transport
      const sendmailPath = getSendmailPath();
      if (sendmailPath) {
        console.info(`📧 Using sendmail transport at ${sendmailPath} (Hostinger production)`);
        transporter = nodemailer.createTransport({
          sendmail: true,
          path: sendmailPath,
          args: ['-i'],
        } as any);
        return transporter;
      }
      // No sendmail found — fall through to SMTP or stub
      console.warn('⚠️  sendmail not found on system, falling back to SMTP/stub');
    }
    // In development, try SMTP if configured
    if (smtp_host && smtp_user && smtp_pass) {
      transporter = nodemailer.createTransport({
        host: smtp_host,
        port: smtp_port,
        secure: smtp_secure,
        auth: { user: smtp_user, pass: smtp_pass },
      });
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
  if (mail_transport === 'sendmail') {
    const sendmailPath = getSendmailPath();
    if (sendmailPath) {
      console.info(`📧 Using sendmail transport at ${sendmailPath}`);
      transporter = nodemailer.createTransport({
        sendmail: true,
        path: sendmailPath,
        args: ['-i'],
      } as any);
      return transporter;
    }
    console.error('❌ Sendmail transport requested but /usr/sbin/sendmail not found. Falling back to stub.');
    // Fall through to stub
  }

  // Explicit SMTP mode
  if (mail_transport === 'smtp' && smtp_host && smtp_user && smtp_pass) {
    transporter = nodemailer.createTransport({
      host: smtp_host,
      port: smtp_port,
      secure: smtp_secure,
      auth: { user: smtp_user, pass: smtp_pass },
    });
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

async function getFromAddress(): Promise<string> {
  const config = await getSmtpConfig();
  return config.smtp_from || 'SMPS Performance <noreply@smps.bowdot.online>';
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
    const transport = await getTransporter();
    const result = await transport.sendMail({
      from: await getFromAddress(),
      to,
      subject: 'SMPS — Activar Cuenta',
      html,
    });
    console.log(`📧 Activation email sent to ${to} ( messageId: ${result.messageId} )`);
    // sendmail transport returns envelope.to but no accepted array
    const accepted = result.accepted?.length ?? 0;
    const envelopeRecipients = (result.envelope as any)?.to?.length ?? 0;
    return accepted > 0 || envelopeRecipients > 0;
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
    const transport = await getTransporter();
    const result = await transport.sendMail({
      from: await getFromAddress(),
      to,
      subject: 'SMPS — Restablecer Contraseña',
      html,
    });
    console.log(`📧 Password reset email sent to ${to} ( messageId: ${result.messageId} )`);
    // sendmail transport returns envelope.to but no accepted array
    const accepted = result.accepted?.length ?? 0;
    const envelopeRecipients = (result.envelope as any)?.to?.length ?? 0;
    return accepted > 0 || envelopeRecipients > 0;
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
    const config = await getSmtpConfig();
    const mailTransport = config.mail_transport || 'auto';

    if (mailTransport === 'sendmail' || (mailTransport === 'auto' && process.env.NODE_ENV === 'production')) {
      const sendmailPath = getSendmailPath();
      if (sendmailPath) {
        return { ok: true, message: `Sendmail transport active (path: ${sendmailPath})` };
      }
      return { ok: false, message: 'Sendmail transport configured but sendmail binary not found on system' };
    }

    const transport = await getTransporter();
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

/**
 * Send a generic template email (used by notification service).
 * Returns true if sent, false if not.
 */
export async function sendTemplateEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  try {
    const transport = await getTransporter();
    const result = await transport.sendMail({
      from: await getFromAddress(),
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
    const accepted = result.accepted?.length ?? 0;
    const envelopeRecipients = (result.envelope as any)?.to?.length ?? 0;
    return accepted > 0 || envelopeRecipients > 0;
  } catch (error) {
    console.error(`📧 Failed to send template email to ${params.to}:`, error);
    return false;
  }
}
