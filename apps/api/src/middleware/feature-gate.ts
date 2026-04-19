import type { NextFunction, Request, Response } from "express";
import { prisma } from "@/config/db";

export type FeatureKey = "ai" | "omr" | "video" | "analytics" | "whatsapp";

/**
 * Blocks a request if the tenant's subscription disables the specified feature.
 * Graceful fallback: if no subscription exists (legacy/dev), the request proceeds.
 */
export function requireFeature(feature: FeatureKey) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = (req as any).tenantId || req.user?.tenantId;
      if (!tenantId) return next();

      const sub = await prisma.tenantSubscription.findUnique({
        where: { tenantId },
        select: {
          aiEnabled: true,
          omrEnabled: true,
          videoEnabled: true,
          analyticsEnabled: true,
          whatsappEnabled: true,
        },
      });
      if (!sub) return next();

      const map: Record<FeatureKey, boolean> = {
        ai: sub.aiEnabled,
        omr: sub.omrEnabled,
        video: sub.videoEnabled,
        analytics: sub.analyticsEnabled,
        whatsapp: sub.whatsappEnabled,
      };

      if (!map[feature]) {
        return res.status(403).json({
          ok: false,
          error: {
            code: "FEATURE_DISABLED",
            message: `The ${feature} feature is not enabled on your current plan. Contact Raquel to upgrade.`,
          },
        });
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Enforces a numeric limit (e.g. max students, max teachers).
 * Returns a helpful upgrade message when the limit is reached.
 */
export async function assertUnderLimit(
  tenantId: string,
  limitKey: "maxStudents" | "maxTeachers" | "maxBatches",
  currentCount: number,
  entityLabel: string,
): Promise<void> {
  const sub = await prisma.tenantSubscription.findUnique({
    where: { tenantId },
    select: { maxStudents: true, maxTeachers: true, maxBatches: true, plan: true },
  });
  if (!sub) return;
  const limit = (sub as any)[limitKey] as number;
  if (currentCount < limit) return;

  const err: any = new Error(
    `${entityLabel} limit reached (${limit}). Upgrade your plan to add more.`,
  );
  err.statusCode = 403;
  err.code = "LIMIT_REACHED";
  throw err;
}
