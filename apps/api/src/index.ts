import { env } from "@/config/env";
import { corsMiddleware } from "@/middleware/cors";
import { errorMiddleware } from "@/middleware/error";
import { loggerMiddleware } from "@/middleware/logger";
import { healthRouter } from "@/routes/health";
import express from "express";

const app = express();

app.use(loggerMiddleware);
app.use(corsMiddleware);
app.use(express.json({ limit: "1mb" }));

app.use("/health", healthRouter);

app.use(errorMiddleware);

const server = app.listen(env.PORT, () => {
  console.log(`raquel-api listening on http://localhost:${env.PORT}`);
});

process.on("SIGTERM", () => server.close(() => process.exit(0)));
process.on("SIGINT", () => server.close(() => process.exit(0)));
