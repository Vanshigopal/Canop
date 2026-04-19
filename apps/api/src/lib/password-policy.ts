import { z } from "zod";

/**
 * Password policy for privileged accounts (admin, teacher, staff).
 * Students/parents use OTP — their password is never set by them.
 */
export const STRONG_PASSWORD = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be under 128 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

export function validateStrongPassword(pw: string): { ok: true } | { ok: false; errors: string[] } {
  const result = STRONG_PASSWORD.safeParse(pw);
  if (result.success) return { ok: true };
  return {
    ok: false,
    errors: result.error.errors.map((e) => e.message),
  };
}
