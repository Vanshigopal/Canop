import { prisma, withTenantTransaction } from "@/config/db";

/**
 * G2 — Pick the least-full batch for a class.
 * Ties broken by earliest-created batch (most established).
 */
export interface LeastFullBatchPick {
  batchId: string;
  batchName: string;
  fillRate: number;
  currentStudents: number;
  capacity: number;
}

export async function pickLeastFullBatch(
  tenantId: string,
  classId: string,
  academicYear: string,
): Promise<LeastFullBatchPick | null> {
  return withTenantTransaction(prisma, tenantId, async (tx) => {
    const batches = await tx.batch.findMany({
      where: {
        classId,
        academicYear,
        deletedAt: null,
        isActive: true,
      },
      include: {
        _count: { select: { students: { where: { deletedAt: null } } } },
      },
      orderBy: { createdAt: "asc" },
    });

    if (batches.length === 0) return null;

    const scored = batches.map((b) => {
      const students = b._count.students;
      const fillRate = b.capacity > 0 ? students / b.capacity : 1;
      return {
        batchId: b.id,
        batchName: b.name,
        fillRate,
        currentStudents: students,
        capacity: b.capacity,
      };
    });

    scored.sort((a, b) => a.fillRate - b.fillRate);
    return scored[0] ?? null;
  });
}
