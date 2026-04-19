import type { Request } from "express";
import { prisma } from "@/config/db";

/**
 * Records a platform admin action to the audit log.
 * Safe — swallows errors so an audit failure never blocks the action.
 */
export async function logPlatformAction(
  req: Request,
  action: string,
  targetType: string,
  targetId?: string | null,
  details?: unknown,
) {
  try {
    const admin = (req as any).platformAdmin;
    if (!admin?.id) return;
    await prisma.platformAuditLog.create({
      data: {
        adminId: admin.id,
        action,
        targetType,
        targetId: targetId || null,
        details: (details as any) ?? undefined,
        ipAddress: req.ip?.substring(0, 45) || null,
      },
    });
  } catch (err) {
    console.error("[platform-audit] failed to log:", (err as Error).message);
  }
}
