# Email Delivery Strategy — SMPS Performance Compass

## Requirements

- Self-hosted (no external SaaS)
- Free or very low cost
- Reliable delivery
- Easy to maintain
- Works with Hostinger shared hosting
- Must support: activation emails, password reset emails, notification emails

---

## Current State

SMPS currently sends **zero emails**. All authentication flows (password reset, user creation) are handled without email. The system needs email for:

1. **Account activation** — new user receives activation link
2. **Password reset** — user receives reset link
3. **(Future) Notification emails** — evaluation reminders, deadline alerts

---

## Evaluation of Options

### Option A: Local SMTP (Node.js + nodemailer + local MTA)

**Description**: Run a mail transfer agent (Postfix, Exim, or OpenSMTPD) on the same server and send directly.

| Factor | Assessment |
|--------|-----------|
| Cost | Free |
| Reliability | ❌ Poor — emails from a shared hosting IP will be flagged as spam by Gmail, Outlook, etc. |
| Deliverability | ❌ Very low — shared hosting IPs are almost always on blocklists |
| Maintenance | ❌ High — must manage SPF, DKIM, DMARC, IP reputation, bounce handling |
| Setup complexity | ❌ High — Postfix configuration, DNS records, deliverability tuning |

**Verdict**: ❌ Not recommended. Shared hosting IPs have poor email reputation. Emails will land in spam.

---

### Option B: Self-Hosted Mail Server

**Description**: Set up a dedicated mail server (e.g., Mail-in-a-Box, Mailu) on a VPS with a clean IP.

| Factor | Assessment |
|--------|-----------|
| Cost | ~$5-10/month for a small VPS |
| Reliability | ⚠️ Moderate — depends on IP reputation and configuration |
| Deliverability | ⚠️ Moderate — new IP needs warmup, but dedicated IP is better |
| Maintenance | ❌ High — must manage SPF, DKIM, DMARC, IP warmup, bounce handling |
| Setup complexity | ❌ Very high — full mail server stack, DNS configuration, ongoing monitoring |

**Verdict**: ⚠️ Overkill for this application. The team would need to manage a full mail server, which is a significant operational burden for a single-purpose email need.

---

### Option C: Company Mail Infrastructure (SMTP Relay)

**Description**: Use the law firm's existing email infrastructure (e.g., their Microsoft 365 or Google Workspace SMTP relay) to send emails from SMPS.

| Factor | Assessment |
|--------|-----------|
| Cost | Free (included in existing subscription) |
| Reliability | ✅ Excellent — established domain with good reputation |
| Deliverability | ✅ Excellent — emails come from the firm's domain |
| Maintenance | ✅ Low — just configure SMTP credentials |
| Setup complexity | ✅ Low — get SMTP credentials from IT |

**Verdict**: ✅ **RECOMMENDED if available.** This is the ideal solution — emails come from the firm's own domain with established reputation.

---

### Option D: Free Tier of Transactional Email Service

**Description**: Use a free tier of a transactional email service (Resend, Brevo/Sendinblue, Mailgun).

| Service | Free Tier | Notes |
|---------|-----------|-------|
| Resend | 3,000 emails/month | Modern API, easy setup, good deliverability |
| Brevo | 300 emails/day | SMTP or API, includes marketing features |
| Mailgun | Not free anymore | Previously had a free tier |
| SendGrid | 100 emails/day forever | Limited but free |

| Factor | Assessment |
|--------|-----------|
| Cost | Free (within limits) |
| Reliability | ✅ Excellent — these services specialize in transactional email |
| Deliverability | ✅ Excellent — managed sending IPs with good reputation |
| Maintenance | ✅ Low — just configure API key |
| Setup complexity | ✅ Low — API key + SMTP credentials |
| Vendor lock-in | ⚠️ Moderate — but easy to switch (standard SMTP) |
| Self-hosted requirement | ❌ Not self-hosted (but free) |

**Verdict**: ✅ **RECOMMENDED as primary option** if company email infrastructure is not available. Resend is the best choice for Node.js applications (first-class nodemailer support, generous free tier, excellent developer experience).

---

## Recommendation

### Primary: Company SMTP Relay (Option C)

If the law firm has Microsoft 365, Google Workspace, or any corporate email with SMTP relay capability, use it.

**Setup for Microsoft 365**:
```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@smps.com.mx
SMTP_PASS=<app-password>
SMTP_FROM="SMPS Performance <noreply@smps.com.mx>"
```

**Setup for Google Workspace**:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@smps.com.mx
SMTP_PASS=<app-password>
SMTP_FROM="SMPS Performance <noreply@smps.com.mx>"
```

### Fallback: Resend (Option D)

If company SMTP is not available, use Resend's free tier.

**Setup**:
```env
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=resend
SMTP_PASS=re_xxxxxxxxxxxx
SMTP_FROM="SMPS Performance <noreply@smps.bowdot.online>"
```

Resend free tier allows 3,000 emails/month, which is more than enough for 50 users with activation + password reset emails.

---

## Implementation Design

### Email Module

Create `server/email/index.ts`:

```typescript
import nodemailer from 'nodemailer';

// Transport is created lazily on first send
let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (transporter) return transporter;

  const config = {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  };

  transporter = nodemailer.createTransport(config);
  return transporter;
}

export async function sendActivationEmail(
  to: string,
  name: string,
  activationLink: string
): Promise<boolean> {
  try {
    const result = await getTransporter().sendMail({
      from: process.env.SMTP_FROM || 'SMPS Performance <noreply@smps.bowdot.online>',
      to,
      subject: 'SMPS — Activar Cuenta',
      html: `
        <h2>¡Bienvenido a SMPS Performance Compass!</h2>
        <p>Hola ${name},</p>
        <p>Se ha creado una cuenta para usted en SMPS Performance Compass.</p>
        <p>Haga clic en el siguiente enlace para activar su cuenta y establecer su contraseña:</p>
        <p><a href="${activationLink}" style="...">Activar Cuenta</a></p>
        <p>Este enlace expirará en 48 horas.</p>
        <p>Si no solicitó esta cuenta, puede ignorar este correo.</p>
        <hr>
        <p style="font-size: 12px; color: #666;">Si el enlace no funciona, copie y pegue la siguiente URL en su navegador:<br>${activationLink}</p>
      `,
    });
    return result.accepted.length > 0;
  } catch (error) {
    console.error('Failed to send activation email:', error);
    return false;
  }
}

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  resetLink: string,
  expiresInHours: number = 1
): Promise<boolean> {
  // Similar to activation email
}

export async function sendAdminPasswordResetEmail(
  to: string,
  name: string,
  resetLink: string
): Promise<boolean> {
  // Similar but with different text (admin-triggered, 24h expiry)
}
```

### Email Graceful Degradation

If email sending fails, the system must not break. Instead:

1. Log the failure: `console.error('Email send failed:', error)`
2. Store the activation/reset token in the database (already planned)
3. Return the activation/reset link in the API response (for admin to share manually)
4. Add a "Resend activation email" button in the UI

```typescript
// In user creation endpoint
const emailSent = await sendActivationEmail(user.email, user.name, activationLink);
if (!emailSent) {
  console.warn(`Failed to send activation email to ${user.email}. Admin should share the link manually.`);
}
// Always return success, include activationLink in response for admin
return res.status(201).json({
  user: sanitizeUser(user),
  activationLink: emailSent ? undefined : activationLink, // Only include if email failed
  activationSent: emailSent
});
```

### Environment Variables Required

```env
# Email Configuration
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@smps.com.mx
SMTP_PASS=<app-password>
SMTP_FROM="SMPS Performance <noreply@smps.com.mx>"

# Activation Settings
ACTIVATION_TOKEN_EXPIRY_HOURS=48
APP_URL=https://smps.bowdot.online

# Password Reset Settings
PASSWORD_RESET_TOKEN_EXPIRY_HOURS=1
ADMIN_PASSWORD_RESET_TOKEN_EXPIRY_HOURS=24
```

### DNS Records Required (for deliverability)

If sending from the firm's domain, ensure these DNS records exist:

```
# SPF
smps.com.mx. IN TXT "v=spf1 include:spf.protection.outlook.com ~all"

# DKIM
# Set up DKIM signing in the email provider's console

# DMARC
_dmarc.smps.com.mx. IN TXT "v=DMARC1; p=none; rua=mailto:dmarc@smps.com.mx"
```

If using Resend, follow their DNS setup guide for the domain.

---

## Testing Strategy

### Development

Use nodemailer's built-in test account (Ethereal Email) for local development:

```typescript
if (process.env.NODE_ENV !== 'production') {
  const testAccount = await nodemailer.createTestAccount();
  transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: { user: testAccount.user, pass: testAccount.pass },
  });
  // Log the preview URL instead of sending real emails
}
```

### Production

Send real emails through the configured SMTP relay.

### Verification

After deployment, send a test email to verify:
1. Email reaches the inbox (not spam)
2. Activation link works correctly
3. Reset link works correctly
4. Email content is correct and professional

---

## NPM Dependencies

```json
{
  "dependencies": {
    "nodemailer": "^7.0.0"
  }
}
```

No other email dependencies needed.

---

## Cost Analysis

| Option | Monthly Cost | Emails/Month | Setup Time |
|--------|-------------|-------------|------------|
| Company SMTP (Microsoft 365) | $0 (included) | Unlimited | 1 hour |
| Company SMTP (Google Workspace) | $0 (included) | Unlimited | 1 hour |
| Resend Free Tier | $0 | 3,000 | 30 minutes |
| Brevo Free Tier | $0 | 9,000 | 30 minutes |
| Self-hosted VPS | $5-10 | Unlimited | 4-8 hours |

**Recommendation**: Use the company's existing email infrastructure (Microsoft 365 or Google Workspace). It's free, reliable, and requires minimal setup. If that's not available, use Resend's free tier.

For a law firm with 50 users sending occasional activation and reset emails, even 1,000 emails/month would be more than sufficient.
