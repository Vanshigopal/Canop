import type { NextFunction, Request, Response } from "express";
import { prisma } from "@/config/db";
import { AppError, Errors } from "@/lib/errors";

/**
 * Extracts tenant slug from the request hostname's subdomain.
 *
 * Expected patterns:
 *   demo.lvh.me:5173       -> slug = "demo"
 *   demo.canop.app        -> slug = "demo"
 *   localhost:3001          -> slug from X-Tenant-Slug header (dev fallback)
 *
 * Attaches tenant to req.tenant if found.
 */
export async function tenantMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const slug = extractTenantSlug(req);

    if (!slug) {
      // Routes that don't need tenant context (health, etc.) skip this
      return next();
    }

    const tenant = await prisma.tenant.findUnique({
      where: { slug, deletedAt: null },
      select: {
        id: true,
        slug: true,
        name: true,
        status: true,
        tier: true,
        logoUrl: true,
        primaryColor: true,
        tagline: true,
        timezone: true,
      },
    });

    if (!tenant) throw Errors.tenantNotFound(slug);
    if (tenant.status === "SUSPENDED") throw Errors.tenantSuspended();

    // Attach to request for downstream use
    req.tenant = tenant;
    req.tenantId = tenant.id;

    next();
  } catch (err) {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json(err.toJSON());
    }
    next(err);
  }
}

function extractTenantSlug(req: Request): string | null {
  const host = req.hostname; // e.g., "demo.lvh.me" or "demo.canop.app"

  // Dev: explicit header override
  const headerSlug = req.headers["x-tenant-slug"] as string | undefined;
  if (headerSlug) return headerSlug;

  // Production/dev: extract from subdomain
  // "demo.lvh.me" -> "demo"
  // "demo.canop.app" -> "demo"
  // "localhost" -> null (no subdomain)
  const parts = host.split(".");

  if (parts.length >= 2) {
    const slug = parts[0];
    // Skip common non-tenant subdomains
    if (
      slug &&
      !["www", "api", "app", "admin", "mail"].includes(slug)
    ) {
      return slug;
    }
  }

  return null;
}
