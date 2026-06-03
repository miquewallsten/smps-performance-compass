/**
 * Zod validation middleware for incoming request bodies.
 * Usage: app.post('/route', validate(LoginSchema), handler)
 */
import { z, ZodSchema } from 'zod';
import { Request, Response, NextFunction } from 'express';

/**
 * Validate request body against a Zod schema.
 * Returns 400 with specific error messages if validation fails.
 */
export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return res.status(400).json({ error: `Datos inválidos: ${errors}` });
    }
    // Replace req.body with the parsed/validated data (applies defaults, coercions)
    req.body = result.data;
    next();
  };
}

// ─── AUTH SCHEMAS ────────────────────────────────────────────────────────────

export const LoginSchema = z.object({
  email: z.string().email('Email inválido').max(255),
  password: z.string().min(1, 'Contraseña requerida').max(255),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().max(255).optional().or(z.literal('')),
  newPassword: z.string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(/[A-Z]/, 'Debe contener al menos una letra mayúscula')
    .regex(/[a-z]/, 'Debe contener al menos una letra minúscula')
    .regex(/[0-9]/, 'Debe contener al menos un número')
    .max(255),
  securityQuestion: z.string().max(500).optional(),
  securityAnswer: z.string().max(500).optional(),
});

export const ResetPasswordSchema = z.object({
  email: z.string().email('Email inválido').max(255),
  securityAnswer: z.string().min(1, 'Respuesta de seguridad requerida').max(500),
  newPassword: z.string().min(6, 'Mínimo 6 caracteres').max(255),
});

export const SecurityQuestionSchema = z.object({
  email: z.string().email('Email inválido').max(255),
});

// ─── USER CREATION SCHEMA ─────────────────────────────────────────────────

export const CreateUserSchema = z.object({
  name: z.string().min(1, 'Nombre requerido').max(255),
  email: z.string().email('Email inválido').max(255),
  password: z.string().min(6, 'Mínimo 6 caracteres').max(255),
  position: z.string().min(1, 'Posición requerida').max(50),
  practice_area: z.string().max(255).optional(),
  custom_position_id: z.string().max(36).optional(),
  location_id: z.string().max(50).optional(),
  is_admin: z.union([z.boolean(), z.string().transform(v => v === 'true' || v === '1')]).optional(),
  is_managing_partner: z.union([z.boolean(), z.string().transform(v => v === 'true' || v === '1')]).optional(),
});

// ─── SYSTEM INIT SCHEMA ───────────────────────────────────────────────────

export const SystemInitSchema = z.object({
  name: z.string().min(1, 'Nombre requerido').max(255),
  email: z.string().email('Email inválido').max(255),
  password: z.string().min(6, 'Mínimo 6 caracteres').max(255),
  securityQuestion: z.string().min(1, 'Pregunta de seguridad requerida').max(500),
  securityAnswer: z.string().min(1, 'Respuesta de seguridad requerida').max(500),
});
