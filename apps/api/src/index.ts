import "express-async-errors";
import express from "express";
import { env } from "@/config/env";
import { redis } from "@/config/redis";
import { corsMiddleware } from "@/middleware/cors";
import { errorMiddleware } from "@/middleware/error";
import { loggerMiddleware } from "@/middleware/logger";
import { tenantMiddleware } from "@/middleware/tenant";
import { authRouter } from "@/routes/auth";
import { batchesRouter } from "@/routes/batches";
import { classesRouter } from "@/routes/classes";
import { enrollmentRouter } from "@/routes/enrollment";
import { healthRouter } from "@/routes/health";
import { invitesRouter } from "@/routes/invites";
import { joinRequestsRouter } from "@/routes/joinRequests";
import { statsRouter } from "@/routes/stats";
import { studentsRouter } from "@/routes/students";
import { subjectsRouter } from "@/routes/subjects";
import { teachersRouter } from "@/routes/teachers";
import { tenantRouter } from "@/routes/tenant";

const app = express();

app.use(loggerMiddleware);
app.use(corsMiddleware);
app.use(express.json({ limit: "1mb" }));

app.use("/health", healthRouter);

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
app.use("/api/v1/stats", statsRouter);

app.use(errorMiddleware);

async function start() {
  await redis.connect();
  const server = app.listen(env.PORT, () => {
    console.log(`[raquel-api] listening on http://localhost:${env.PORT}`);
  });

  const shutdown = () => {
    redis.disconnect();
    server.close(() => process.exit(0));
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

start().catch((err) => {
  console.error("[raquel-api] failed to start:", err);
  process.exit(1);
});
