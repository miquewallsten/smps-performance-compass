/**
 * Rate limiting middleware for sensitive endpoints.
 * Prevents brute-force attacks on login and password reset.
 */
import rateLimit from 'express-rate-limit';

/**
 * Strict rate limiter for login: 5 attempts per minute per IP.
 * After 5 failed attempts, the IP is blocked for 15 minutes.
 */
export const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: { error: 'Demasiados intentos. Intenta de nuevo en un minuto.' },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip successful requests — only count failed logins
  skipSuccessfulRequests: true,
});

/**
 * Rate limiter for password reset: 3 attempts per 15 minutes per IP.
 * Prevents abuse of the security-question reset flow.
 */
export const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3,
  message: { error: 'Demasiados intentos de reseteo. Intenta de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * General API rate limiter: 100 requests per minute per IP.
 * Prevents API abuse from any single source.
 */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Demasiadas solicitudes. Intenta de nuevo en un momento.' },
  standardHeaders: true,
  legacyHeaders: false,
});
