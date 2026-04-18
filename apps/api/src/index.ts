import "express-async-errors";
import { createServer } from "node:http";
import compression from "compression";
import express from "express";
import { env } from "@/config/env";
import { redis } from "@/config/redis";
import { initializeSocket } from "@/config/socket";
import { sanitizeRequestMiddleware } from "@/lib/sanitize";
import { corsMiddleware } from "@/middleware/cors";
import { errorMiddleware } from "@/middleware/error";
import { loggerMiddleware } from "@/middleware/logger";
import { tenantMiddleware } from "@/middleware/tenant";
import { attendanceRouter } from "@/routes/attendance";
import { authRouter } from "@/routes/auth";
import { batchesRouter } from "@/routes/batches";
import { broadcastsRouter } from "@/routes/broadcasts";
import { classesRouter } from "@/routes/classes";
import { deliveriesRouter } from "@/routes/deliveries";
import { dropoutRouter } from "@/routes/dropout";
import { enrollmentRouter } from "@/routes/enrollment";
import { examsRouter } from "@/routes/exams";
import { feeCategoriesRouter } from "@/routes/feeCategories";
import { feePlansRouter } from "@/routes/feePlans";
import { feesReportsRouter } from "@/routes/feesReports";
import { gradebookRouter } from "@/routes/gradebook";
import { healthRouter } from "@/routes/health";
import { intelligenceRouter } from "@/routes/intelligence";
import { invitesRouter } from "@/routes/invites";
import { joinRequestsRouter } from "@/routes/joinRequests";
import { marksRouter } from "@/routes/marks";
import { notificationConfigRouter } from "@/routes/notificationConfig";
import { omrRouter } from "@/routes/omr";
import { parentFeesRouter } from "@/routes/parentFees";
import { paymentsRouter } from "@/routes/payments";
import { retestsRouter } from "@/routes/retests";
import { searchRouter } from "@/routes/search";
import { statsRouter } from "@/routes/stats";
import { studentFeesRouter } from "@/routes/studentFees";
import { studentGradebookRouter } from "@/routes/studentGradebook";
import { studentsRouter } from "@/routes/students";
import { subjectsRouter } from "@/routes/subjects";
import { teachersRouter } from "@/routes/teachers";
import { templatesRouter } from "@/routes/templates";
import { tenantRouter } from "@/routes/tenant";
import { webhooksRouter } from "@/routes/webhooks";

const app = express();

app.use(loggerMiddleware);
app.use(corsMiddleware);
app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(sanitizeRequestMiddleware);

app.use("/health", healthRouter);

// Webhooks — external callers, no tenant resolution
app.use("/api/v1/webhooks", webhooksRouter);

app.use("/api/v1", tenantMiddleware);

app.use("/api/v1/tenant", tenantRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/subjects", subjectsRouter);
app.use("/api/v1/classes", classesRouter);
app.use("/api/v1/batches", batchesRouter);
app.use("/api/v1/teachers", teachersRouter);
app.use("/api/v1/students", studentsRouter);
app.use("/api/v1/invites", invitesRouter);
app.use("/api/v1/enroll", enrollmentRouter);
app.use("/api/v1/join-requests", joinRequestsRouter);
app.use("/api/v1/attendance", attendanceRouter);
app.use("/api/v1/stats", statsRouter);
app.use("/api/v1/fee-categories", feeCategoriesRouter);
app.use("/api/v1/fee-plans", feePlansRouter);
app.use("/api/v1/student-fees", studentFeesRouter);
app.use("/api/v1/payments", paymentsRouter);
app.use("/api/v1/fees", feesReportsRouter);
app.use("/api/v1/parent", parentFeesRouter);
app.use("/api/v1/templates", templatesRouter);
app.use("/api/v1/broadcasts", broadcastsRouter);
app.use("/api/v1/deliveries", deliveriesRouter);
app.use("/api/v1/notification-config", notificationConfigRouter);
app.use("/api/v1/exams/:id/marks", marksRouter);
app.use("/api/v1/exams", examsRouter);
app.use("/api/v1/gradebook", gradebookRouter);
app.use("/api/v1/student", studentGradebookRouter);
app.use("/api/v1/retests", retestsRouter);
app.use("/api/v1/intelligence", intelligenceRouter);
app.use("/api/v1/search", searchRouter);
app.use("/api/v1/omr", omrRouter);
app.use("/api/v1/dropout", dropoutRouter);

app.use(errorMiddleware);

const httpServer = createServer(app);

async function start() {
  await redis.connect();
  initializeSocket(httpServer);
  httpServer.listen(env.PORT, () => {
    console.log(`[raquel-api] listening on http://localhost:${env.PORT}`);
  });

  const shutdown = () => {
    redis.disconnect();
    httpServer.close(() => process.exit(0));
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

start().catch((err) => {
  console.error("[raquel-api] failed to start:", err);
  process.exit(1);
});
