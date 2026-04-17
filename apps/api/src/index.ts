import "express-async-errors";
import express from "express";
import { env } from "@/config/env";
import { redis } from "@/config/redis";
import { corsMiddleware } from "@/middleware/cors";
import { errorMiddleware } from "@/middleware/error";
import { loggerMiddleware } from "@/middleware/logger";
import { tenantMiddleware } from "@/middleware/tenant";
import { authRouter } from "@/routes/auth";
import { healthRouter } from "@/routes/health";
import { tenantRouter } from "@/routes/tenant";

const app = express();

// Global middleware
app.use(loggerMiddleware);
app.use(corsMiddleware);
app.use(express.json({ limit: "1mb" }));

// Health check (no tenant context needed)
app.use("/health", healthRouter);

// Tenant resolution (attaches req.tenant for all /api/v1 routes)
app.use("/api/v1", tenantMiddleware);

// API v1 routes
app.use("/api/v1/tenant", tenantRouter);
app.use("/api/v1/auth", authRouter);

// Error handler (must be last)
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
