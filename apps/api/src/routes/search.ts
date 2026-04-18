import { Router } from "express";
import { z } from "zod";
import { prisma } from "@/config/db";
import { fuzzySearch } from "@/lib/search/fuzzy";
import { applyRecencyBoost, getRecentItems, trackRecentItem } from "@/lib/search/recency";
import { ok } from "@/lib/response";
import { authenticate, requireRole } from "@/middleware/auth";
import { validate } from "@/middleware/validate";

export const searchRouter = Router();

searchRouter.use(authenticate, requireRole("ADMIN", "TEACHER", "STAFF"));

interface SearchResultItem {
  id: string;
  type: "student" | "teacher" | "batch" | "exam";
  title: string;
  subtitle: string | null;
}

searchRouter.get("/", async (req, res) => {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;
  const q = String(req.query.q ?? "").trim();
  const typesParam = String(req.query.types ?? "student,teacher,batch,exam");
  const types = new Set(typesParam.split(",").map((t) => t.trim()));
  const perTypeLimit = Math.max(1, Math.min(10, Number(req.query.limit) || 5));

  const [students, teachers, batches, exams] = await Promise.all([
    types.has("student")
      ? prisma.student.findMany({
          where: { tenantId, deletedAt: null },
          include: {
            user: { select: { id: true, name: true, email: true, phone: true } },
            batch: { select: { name: true } },
          },
          take: 500,
        })
      : Promise.resolve([]),
    types.has("teacher")
      ? prisma.user.findMany({
          where: { tenantId, role: "TEACHER", deletedAt: null, isActive: true },
          select: { id: true, name: true, email: true, phone: true },
          take: 500,
        })
      : Promise.resolve([]),
    types.has("batch")
      ? prisma.batch.findMany({
          where: { tenantId, deletedAt: null },
          include: { class: { select: { name: true } } },
          take: 500,
        })
      : Promise.resolve([]),
    types.has("exam")
      ? prisma.exam.findMany({
          where: { tenantId, deletedAt: null },
          include: {
            batch: { select: { name: true } },
            subject: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 500,
        })
      : Promise.resolve([]),
  ]);

  const studentItems = students.map((s) => ({
    id: s.id,
    type: "student" as const,
    title: s.user.name,
    subtitle: [s.batch?.name, s.user.phone].filter(Boolean).join(" · ") || null,
    searchText: `${s.user.name} ${s.user.email ?? ""} ${s.user.phone ?? ""} ${s.batch?.name ?? ""}`,
  }));
  const teacherItems = teachers.map((t) => ({
    id: t.id,
    type: "teacher" as const,
    title: t.name,
    subtitle: t.email,
    searchText: `${t.name} ${t.email ?? ""} ${t.phone ?? ""}`,
  }));
  const batchItems = batches.map((b) => ({
    id: b.id,
    type: "batch" as const,
    title: b.name,
    subtitle: b.class?.name ?? null,
    searchText: `${b.name} ${b.class?.name ?? ""}`,
  }));
  const examItems = exams.map((e) => ({
    id: e.id,
    type: "exam" as const,
    title: e.name,
    subtitle: [e.batch?.name, e.subject?.name].filter(Boolean).join(" · ") || null,
    searchText: `${e.name} ${e.batch?.name ?? ""} ${e.subject?.name ?? ""}`,
  }));

  const searchItems = async <T extends { id: string; searchText: string }>(
    items: T[],
    entityType: string,
  ): Promise<T[]> => {
    const matched = q ? fuzzySearch(items, q, ["searchText", "title"], perTypeLimit * 2) : items.slice(0, perTypeLimit * 2);
    const recentIds = await getRecentItems(tenantId, userId, entityType, 20);
    const boosted = applyRecencyBoost(matched, recentIds);
    return boosted.slice(0, perTypeLimit);
  };

  const [sRes, tRes, bRes, eRes] = await Promise.all([
    searchItems(studentItems, "student"),
    searchItems(teacherItems, "teacher"),
    searchItems(batchItems, "batch"),
    searchItems(examItems, "exam"),
  ]);

  const results: SearchResultItem[] = [
    ...sRes.map(({ id, type, title, subtitle }) => ({ id, type, title, subtitle })),
    ...tRes.map(({ id, type, title, subtitle }) => ({ id, type, title, subtitle })),
    ...bRes.map(({ id, type, title, subtitle }) => ({ id, type, title, subtitle })),
    ...eRes.map(({ id, type, title, subtitle }) => ({ id, type, title, subtitle })),
  ];

  return ok(res, { query: q, results });
});

const TrackSchema = z.object({
  entityType: z.enum(["student", "teacher", "batch", "exam"]),
  entityId: z.string().uuid(),
});

searchRouter.post("/track", validate(TrackSchema), async (req, res) => {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;
  const { entityType, entityId } = req.body as z.infer<typeof TrackSchema>;
  await trackRecentItem(tenantId, userId, entityType, entityId);
  return ok(res, { tracked: true });
});
