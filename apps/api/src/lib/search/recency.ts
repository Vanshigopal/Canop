import { prisma, withTenantTransaction } from "@/config/db";

/**
 * A2 — Recency tracking + boost.
 */
export async function trackRecentItem(
  tenantId: string,
  userId: string,
  entityType: string,
  entityId: string,
) {
  return withTenantTransaction(prisma, tenantId, async (tx) => {
    return tx.recentItem.upsert({
      where: {
        userId_entityType_entityId: { userId, entityType, entityId },
      },
      update: { lastViewed: new Date(), viewCount: { increment: 1 } },
      create: { tenantId, userId, entityType, entityId },
    });
  });
}

export async function getRecentItems(
  tenantId: string,
  userId: string,
  entityType: string,
  limit = 10,
): Promise<string[]> {
  return withTenantTransaction(prisma, tenantId, async (tx) => {
    const items = await tx.recentItem.findMany({
      where: { userId, entityType },
      orderBy: [{ lastViewed: "desc" }, { viewCount: "desc" }],
      take: limit,
      select: { entityId: true },
    });
    return items.map((i) => i.entityId);
  });
}

/**
 * Given fuzzy-matched results and a list of recently-viewed IDs,
 * boost recent items to the top while preserving internal order.
 */
export function applyRecencyBoost<T extends { id: string }>(
  fuzzyResults: T[],
  recentIds: string[],
): T[] {
  const recencyIndex = new Map(recentIds.map((id, idx) => [id, idx]));
  const tagged = fuzzyResults.map((item, origIdx) => {
    const recentIdx = recencyIndex.get(item.id);
    return { item, recentIdx: recentIdx ?? 999, origIdx };
  });
  tagged.sort((a, b) => {
    if (a.recentIdx !== b.recentIdx) return a.recentIdx - b.recentIdx;
    return a.origIdx - b.origIdx;
  });
  return tagged.map((t) => t.item);
}
