import express from "express";
import { env } from "@/config/env";
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

const server = app.listen(env.PORT, () => {
  console.log(`[raquel-api] listening on http://localhost:${env.PORT}`);
});

process.on("SIGTERM", () => server.close(() => process.exit(0)));
process.on("SIGINT", () => server.close(() => process.exit(0)));
