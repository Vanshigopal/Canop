import { env } from "@/config/env";
import cors from "cors";

export const corsMiddleware = cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    // Allow localhost + any *.lvh.me subdomain (dev multi-tenant routing)
    const allowedPatterns = [
      /^http:\/\/localhost(:\d+)?$/,
      /^http:\/\/[a-z0-9-]+\.lvh\.me(:\d+)?$/,
    ];
    if (allowedPatterns.some((p) => p.test(origin))) return cb(null, true);
    if (origin === env.CORS_ORIGIN) return cb(null, true);
    return cb(new Error("CORS: origin not allowed"));
  },
  credentials: true,
});
