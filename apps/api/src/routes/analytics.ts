import { Router } from "express";
import { Errors } from "@/lib/errors";
import { ok } from "@/lib/response";
import { authenticate, requireRole } from "@/middleware/auth";
import {
  compareBatches,
  computeDailySnapshot,
  getAcademicAnalytics,
  getAttendanceAnalytics,
  getEngagementAnalytics,
  getFinancialAnalytics,
  getHealthScorecard,
  getHistoricalTrends,
} from "@/services/analytics.service";

export const analyticsRouter = Router();

analyticsRouter.use(authenticate, requireRole("ADMIN", "TEACHER", "STAFF"));

analyticsRouter.get("/attendance", async (req, res) => {
  const { dateFrom, dateTo, batchId, granularity } = req.query as Record<string, string>;
  const data = await getAttendanceAnalytics(req.user!.tenantId, {
    dateFrom: dateFrom ? new Date(dateFrom) : undefined,
    dateTo: dateTo ? new Date(dateTo) : undefined,
    batchId: batchId || undefined,
    granularity: (granularity as "daily" | "weekly" | "monthly") || undefined,
  });
  return ok(res, data);
});

analyticsRouter.get("/academic", async (req, res) => {
  const { batchId, subjectId, months } = req.query as Record<string, string>;
  const data = await getAcademicAnalytics(req.user!.tenantId, {
    batchId: batchId || undefined,
    subjectId: subjectId || undefined,
    months: months ? Number(months) : undefined,
  });
  return ok(res, data);
});

analyticsRouter.get("/financial", async (req, res) => {
  const { months } = req.query as Record<string, string>;
  const data = await getFinancialAnalytics(req.user!.tenantId, {
    months: months ? Number(months) : undefined,
  });
  return ok(res, data);
});

analyticsRouter.get("/engagement", async (req, res) => {
  const { batchId, days } = req.query as Record<string, string>;
  const data = await getEngagementAnalytics(req.user!.tenantId, {
    batchId: batchId || undefined,
    days: days ? Number(days) : undefined,
  });
  return ok(res, data);
});

analyticsRouter.get("/batch-comparison", async (req, res) => {
  const { batchIdA, batchIdB } = req.query as Record<string, string>;
  if (!batchIdA || !batchIdB) {
    throw Errors.badRequest("Both batchIdA and batchIdB are required");
  }
  if (batchIdA === batchIdB) {
    throw Errors.badRequest("Batches must be different");
  }
  const data = await compareBatches(req.user!.tenantId, batchIdA, batchIdB);
  return ok(res, data);
});

analyticsRouter.get("/trends", async (req, res) => {
  const { dateFrom, dateTo } = req.query as Record<string, string>;
  const data = await getHistoricalTrends(req.user!.tenantId, {
    dateFrom: dateFrom ? new Date(dateFrom) : undefined,
    dateTo: dateTo ? new Date(dateTo) : undefined,
  });
  return ok(res, data);
});

analyticsRouter.get("/health-scorecard", async (req, res) => {
  const data = await getHealthScorecard(req.user!.tenantId);
  return ok(res, data);
});

analyticsRouter.post("/compute-snapshot", requireRole("ADMIN"), async (req, res) => {
  const data = await computeDailySnapshot(req.user!.tenantId);
  return ok(res, data);
});
