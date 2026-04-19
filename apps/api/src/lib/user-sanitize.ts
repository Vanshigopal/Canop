/**
 * Safe user fields for API responses — excludes passwordHash.
 * Use with Prisma `select` to prevent leaking password hashes.
 */
export const SAFE_USER_SELECT = {
  id: true,
  tenantId: true,
  email: true,
  name: true,
  role: true,
  phone: true,
  avatarUrl: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * Removes sensitive fields from an already-fetched user object.
 */
export function stripSensitive<T extends Record<string, unknown>>(user: T | null): Omit<T, "passwordHash"> | null {
  if (!user) return null;
  const { passwordHash: _ph, ...safe } = user as T & { passwordHash?: unknown };
  void _ph;
  return safe as Omit<T, "passwordHash">;
}
