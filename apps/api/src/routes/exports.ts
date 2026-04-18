import { Router } from "express";
import { z } from "zod";
import { prisma, withTenantTransaction } from "@/config/db";
import { Errors } from "@/lib/errors";
import { ok, noContent } from "@/lib/response";
import { authenticate, requireRole } from "@/middleware/auth";
import { validate } from "@/middleware/validate";
import {
  getAcademicAnalytics,
  getAttendanceAnalytics,
  getEngagementAnalytics,
  getFinancialAnalytics,
} from "@/services/analytics.service";
import { createExport } from "@/services/export.service";
import { getSignedDownloadUrl } from "@/services/storage.service";

export const exportsRouter = Router();
exportsRouter.use(authenticate, requireRole("ADMIN", "STAFF"));

const ExportBodySchema = z.object({
  reportType: z.enum([
    "attendance",
    "academic",
    "financial",
    "engagement",
    "students",
    "monthly-summary",
  ]),
  format: z.enum(["CSV", "PDF"]).default("CSV"),
  filters: z.record(z.unknown()).optional(),
});

exportsRouter.post("/", validate(ExportBodySchema), async (req, res) => {
  const body = req.body as z.infer<typeof ExportBodySchema>;
  const tenantId = req.user!.tenantId;
  const filters = body.filters || {};

  let rows: Record<string, unknown>[] = [];
  let columns: string[] | undefined;

  if (body.reportType === "attendance") {
    const analytics = await getAttendanceAnalytics(tenantId, {
      dateFrom: filters.dateFrom ? new Date(filters.dateFrom as string) : undefined,
      dateTo: filters.dateTo ? new Date(filters.dateTo as string) : undefined,
      batchId: filters.batchId as string | undefined,
    });
    rows = analytics.dailyRates;
    columns = ["date", "rate", "present", "totalStudents"];
  } else if (body.reportType === "academic") {
    const analytics = await getAcademicAnalytics(tenantId, {
      batchId: filters.batchId as string | undefined,
      subjectId: filters.subjectId as string | undefined,
      months: filters.months ? Number(filters.months) : undefined,
    });
    rows = analytics.examSummaries as unknown as Record<string, unknown>[];
    columns = [
      "examName",
      "subjectName",
      "batchName",
      "examDate",
      "appeared",
      "passRate",
      "average",
      "highest",
      "lowest",
    ];
  } else if (body.reportType === "financial") {
    const analytics = await getFinancialAnalytics(tenantId, {
      months: filters.months ? Number(filters.months) : undefined,
    });
    rows = analytics.collectionTrend.map((t) => ({
      month: t.month,
      amount: Number(t.amount),
    }));
    columns = ["month", "amount"];
  } else if (body.reportType === "engagement") {
    const analytics = await getEngagementAnalytics(tenantId, {
      batchId: filters.batchId as string | undefined,
      days: filters.days ? Number(filters.days) : undefined,
    });
    rows = [
      ...analytics.topEngaged.map((s) => ({
        category: "Top",
        studentName: s.studentName,
        batchName: s.batchName || "—",
        score: s.score,
      })),
      ...analytics.leastEngaged.map((s) => ({
        category: "At-Risk",
        studentName: s.studentName,
        batchName: s.batchName || "—",
        score: s.score,
      })),
    ];
    columns = ["category", "studentName", "batchName", "score"];
  } else if (body.reportType === "students") {
    const students = await withTenantTransaction(prisma, tenantId, async (tx) =>
      tx.student.findMany({
        where: { deletedAt: null },
        include: {
          user: { select: { name: true, email: true, phone: true } },
          batch: { select: { name: true } },
          class: { select: { name: true } },
        },
        orderBy: { enrolledAt: "desc" },
      }),
    );
    rows = students.map((s) => ({
      name: s.user.name,
      email: s.user.email,
      phone: s.user.phone || "",
      rollNumber: s.rollNumber || "",
      class: s.class?.name || "",
      batch: s.batch?.name || "",
      enrolledAt: s.enrolledAt.toISOString().slice(0, 10),
    }));
    columns = ["name", "email", "phone", "rollNumber", "class", "batch", "enrolledAt"];
  } else if (body.reportType === "monthly-summary") {
    const attendance = await getAttendanceAnalytics(tenantId, {});
    const financial = await getFinancialAnalytics(tenantId, { months: 1 });
    const engagement = await getEngagementAnalytics(tenantId, { days: 30 });

    rows = [
      {
        metric: "Avg Attendance %",
        value: Math.round((attendance.summary?.mean || 0) * 10) / 10,
      },
      { metric: "Expected Revenue", value: financial.summary.expected },
      { metric: "Collected Revenue", value: financial.summary.collected },
      { metric: "Collection Rate %", value: financial.summary.collectionRate },
      { metric: "Overdue Amount", value: financial.summary.overdueAmount },
      {
        metric: "Avg Engagement Score",
        value: Math.round((engagement.scoreStats?.mean || 0) * 10) / 10,
      },
      {
        metric: "At-Risk Students",
        value: engagement.riskLevels.critical + engagement.riskLevels.warning,
      },
      { metric: "Videos Watched (30d)", value: engagement.contentConsumption.videosWatched },
      {
        metric: "Materials Downloaded (30d)",
        value: engagement.contentConsumption.materialsDownloaded,
      },
      {
        metric: "Assignments Submitted (30d)",
        value: engagement.contentConsumption.assignmentsSubmitted,
      },
    ];
    columns = ["metric", "value"];
  }

  const job = await createExport(
    tenantId,
    req.user!.id,
    body.reportType,
    body.format,
    rows,
    columns,
  );
  return ok(res, job);
});

exportsRouter.get("/", async (req, res) => {
  const jobs = await withTenantTransaction(prisma, req.user!.tenantId, async (tx) =>
    tx.exportJob.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  );
  return ok(res, jobs);
});

exportsRouter.get("/:id/download", async (req, res) => {
  const job = await withTenantTransaction(prisma, req.user!.tenantId, async (tx) =>
    tx.exportJob.findFirst({
      where: { id: req.params.id as string, userId: req.user!.id },
    }),
  );
  if (!job) throw Errors.notFound("Export");
  if (job.status !== "COMPLETED" || !job.fileKey) {
    throw Errors.badRequest("Export is not ready");
  }
  if (job.expiresAt && job.expiresAt < new Date()) {
    throw Errors.badRequest("Export has expired");
  }
  const url = await getSignedDownloadUrl(job.fileKey, 600);
  return ok(res, { url, fileName: job.fileName });
});

exportsRouter.delete("/:id", async (req, res) => {
  const job = await withTenantTransaction(prisma, req.user!.tenantId, async (tx) =>
    tx.exportJob.findFirst({
      where: { id: req.params.id as string, userId: req.user!.id },
    }),
  );
  if (!job) throw Errors.notFound("Export");
  await withTenantTransaction(prisma, req.user!.tenantId, async (tx) =>
    tx.exportJob.delete({ where: { id: job.id } }),
  );
  return noContent(res);
});
