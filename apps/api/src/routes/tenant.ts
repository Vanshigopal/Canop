import { type Request, type Response, Router } from "express";
import { ok } from "@/lib/response";

export const tenantRouter = Router();

/**
 * GET /api/v1/tenant
 * Returns public information about the current tenant (resolved from subdomain).
 * No auth required — used by the login page to show institute branding.
 */
tenantRouter.get("/", (req: Request, res: Response) => {
  if (!req.tenant) {
    return res.status(400).json({
      ok: false,
      error: { code: "NO_TENANT", message: "Tenant context not available" },
    });
  }

  return ok(res, {
    id: req.tenant.id,
    slug: req.tenant.slug,
    name: req.tenant.name,
    logoUrl: req.tenant.logoUrl,
    primaryColor: req.tenant.primaryColor,
    tagline: req.tenant.tagline,
  });
});
