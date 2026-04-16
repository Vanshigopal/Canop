import { hash } from "node:crypto";
import { LoginRequestSchema } from "@raquel/types";
import { type NextFunction, type Request, type Response, Router } from "express";
import { prisma } from "@/config/db";
import { Errors } from "@/lib/errors";
import { ok } from "@/lib/response";
import { validate } from "@/middleware/validate";

export const authRouter = Router();

/**
 * POST /api/v1/auth/login
 * Validates credentials against the tenant's user table.
 * Session 3 replaces the password hash with bcrypt and adds JWT issuance.
 * For now: validates input, checks user exists, returns stub tokens.
 */
authRouter.post(
  "/login",
  validate(LoginRequestSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantSlug, email, password } = req.body;

      // Resolve tenant by slug (not from subdomain — login page sends slug in body)
      const tenant = await prisma.tenant.findUnique({
        where: { slug: tenantSlug, deletedAt: null },
      });

      if (!tenant) throw Errors.tenantNotFound(tenantSlug);

      // Find user within tenant (RLS not used here — we're looking up across tenants for login)
      const user = await prisma.user.findUnique({
        where: {
          tenantId_email: { tenantId: tenant.id, email },
          deletedAt: null,
        },
      });

      if (!user) throw Errors.unauthorized("Invalid email or password");

      // Simple hash check (Session 3 upgrades to bcrypt/argon2)
      const inputHash = hash("sha256", password, "hex");
      if (user.passwordHash !== inputHash) {
        throw Errors.unauthorized("Invalid email or password");
      }

      // Session 3: issue real JWT here. For now, return stub.
      return ok(res, {
        message: "Login successful (stub — real JWT comes in Session 3)",
        accessToken: "stub-access-token",
        refreshToken: "stub-refresh-token",
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        tenant: {
          id: tenant.id,
          slug: tenant.slug,
          name: tenant.name,
        },
      });
    } catch (err) {
      next(err);
    }
  },
);
