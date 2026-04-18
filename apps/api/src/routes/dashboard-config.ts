import { Router } from "express";
import { z } from "zod";
import { prisma, withTenantTransaction } from "@/config/db";
import { ok } from "@/lib/response";
import { authenticate, requireRole } from "@/middleware/auth";
import { validate } from "@/middleware/validate";

export const dashboardConfigRouter = Router();
dashboardConfigRouter.use(authenticate, requireRole("ADMIN", "STAFF"));

export const WIDGET_CATALOG = [
  {
    type: "student_count",
    label: "Total Students",
    category: "overview",
    defaultSize: { w: 3, h: 2 },
    chartType: "metric",
    description: "Current enrolled student count with MTD delta",
  },
  {
    type: "attendance_today",
    label: "Today's Attendance",
    category: "attendance",
    defaultSize: { w: 3, h: 2 },
    chartType: "metric",
    description: "Attendance percentage for today's lecture sessions",
  },
  {
    type: "revenue_mtd",
    label: "Revenue This Month",
    category: "financial",
    defaultSize: { w: 3, h: 2 },
    chartType: "metric",
    description: "Total collected payments in the last 30 days",
  },
  {
    type: "pending_retests",
    label: "Pending Retests",
    category: "academic",
    defaultSize: { w: 3, h: 2 },
    chartType: "metric",
    description: "Retests pending schedule or completion",
  },
  {
    type: "attendance_trend",
    label: "Attendance Trend",
    category: "attendance",
    defaultSize: { w: 6, h: 4 },
    chartType: "line",
    description: "Daily attendance rate over selected period",
  },
  {
    type: "collection_trend",
    label: "Fee Collection Trend",
    category: "financial",
    defaultSize: { w: 6, h: 4 },
    chartType: "bar",
    description: "Monthly fee collection amounts",
  },
  {
    type: "top_performers",
    label: "Top Performers",
    category: "academic",
    defaultSize: { w: 4, h: 4 },
    chartType: "list",
    description: "Highest scoring students across published exams",
  },
  {
    type: "at_risk_students",
    label: "At-Risk Students",
    category: "engagement",
    defaultSize: { w: 4, h: 4 },
    chartType: "list",
    description: "Students with low engagement scores",
  },
  {
    type: "overdue_aging",
    label: "Overdue Aging",
    category: "financial",
    defaultSize: { w: 4, h: 4 },
    chartType: "pie",
    description: "Breakdown of overdue installments by age bucket",
  },
  {
    type: "engagement_distribution",
    label: "Engagement Distribution",
    category: "engagement",
    defaultSize: { w: 6, h: 4 },
    chartType: "bar",
    description: "Histogram of engagement scores across students",
  },
  {
    type: "pass_rate_evolution",
    label: "Pass Rate Evolution",
    category: "academic",
    defaultSize: { w: 6, h: 4 },
    chartType: "line",
    description: "Pass rate trend across published exams",
  },
  {
    type: "recent_activity",
    label: "Recent Activity",
    category: "overview",
    defaultSize: { w: 6, h: 4 },
    chartType: "feed",
    description: "Latest institute events from the audit log",
  },
  {
    type: "batch_comparison",
    label: "Batch Comparison",
    category: "academic",
    defaultSize: { w: 6, h: 4 },
    chartType: "radar",
    description: "Side-by-side batch metrics on a radar chart",
  },
  {
    type: "subject_performance",
    label: "Subject Performance",
    category: "academic",
    defaultSize: { w: 6, h: 3 },
    chartType: "bar",
    description: "Average marks per subject across exams",
  },
  {
    type: "content_consumption",
    label: "Content Consumption",
    category: "engagement",
    defaultSize: { w: 6, h: 3 },
    chartType: "bar",
    description: "Videos watched, materials downloaded, assignments submitted",
  },
] as const;

const DEFAULT_LAYOUT = [
  { i: "w-student-count", x: 0, y: 0, w: 3, h: 2 },
  { i: "w-attendance-today", x: 3, y: 0, w: 3, h: 2 },
  { i: "w-revenue-mtd", x: 6, y: 0, w: 3, h: 2 },
  { i: "w-pending-retests", x: 9, y: 0, w: 3, h: 2 },
  { i: "w-attendance-trend", x: 0, y: 2, w: 6, h: 4 },
  { i: "w-collection-trend", x: 6, y: 2, w: 6, h: 4 },
  { i: "w-top-performers", x: 0, y: 6, w: 4, h: 4 },
  { i: "w-at-risk", x: 4, y: 6, w: 4, h: 4 },
  { i: "w-overdue-aging", x: 8, y: 6, w: 4, h: 4 },
  { i: "w-recent-activity", x: 0, y: 10, w: 12, h: 4 },
];

const DEFAULT_WIDGETS = [
  { id: "w-student-count", type: "student_count", config: {} },
  { id: "w-attendance-today", type: "attendance_today", config: {} },
  { id: "w-revenue-mtd", type: "revenue_mtd", config: {} },
  { id: "w-pending-retests", type: "pending_retests", config: {} },
  { id: "w-attendance-trend", type: "attendance_trend", config: { days: 30 } },
  { id: "w-collection-trend", type: "collection_trend", config: { months: 6 } },
  { id: "w-top-performers", type: "top_performers", config: {} },
  { id: "w-at-risk", type: "at_risk_students", config: {} },
  { id: "w-overdue-aging", type: "overdue_aging", config: {} },
  { id: "w-recent-activity", type: "recent_activity", config: {} },
];

dashboardConfigRouter.get("/widgets/catalog", async (_req, res) => {
  return ok(res, WIDGET_CATALOG);
});

dashboardConfigRouter.get("/layout", async (req, res) => {
  const layout = await withTenantTransaction(prisma, req.user!.tenantId, async (tx) => {
    const existing = await tx.dashboardLayout.findUnique({
      where: { userId: req.user!.id },
    });
    if (existing) return existing;
    return {
      layout: DEFAULT_LAYOUT,
      widgets: DEFAULT_WIDGETS,
      isDefault: true,
    };
  });
  return ok(res, layout);
});

const LayoutSchema = z.object({
  layout: z.array(
    z.object({
      i: z.string(),
      x: z.number(),
      y: z.number(),
      w: z.number(),
      h: z.number(),
      minW: z.number().optional(),
      minH: z.number().optional(),
      maxW: z.number().optional(),
      maxH: z.number().optional(),
      static: z.boolean().optional(),
    }),
  ),
  widgets: z.array(
    z.object({
      id: z.string(),
      type: z.string(),
      config: z.record(z.unknown()).optional().default({}),
    }),
  ),
});

dashboardConfigRouter.put("/layout", validate(LayoutSchema), async (req, res) => {
  const body = req.body as z.infer<typeof LayoutSchema>;
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;

  const layoutJson = body.layout as unknown as object;
  const widgetsJson = body.widgets as unknown as object;

  const saved = await withTenantTransaction(prisma, tenantId, async (tx) => {
    return tx.dashboardLayout.upsert({
      where: { userId },
      update: {
        layout: layoutJson,
        widgets: widgetsJson,
        isDefault: false,
      },
      create: {
        tenantId,
        userId,
        layout: layoutJson,
        widgets: widgetsJson,
        isDefault: false,
      },
    });
  });

  return ok(res, saved);
});

dashboardConfigRouter.post("/layout/reset", async (req, res) => {
  await withTenantTransaction(prisma, req.user!.tenantId, async (tx) => {
    await tx.dashboardLayout.deleteMany({ where: { userId: req.user!.id } });
  });
  return ok(res, {
    layout: DEFAULT_LAYOUT,
    widgets: DEFAULT_WIDGETS,
    isDefault: true,
  });
});
