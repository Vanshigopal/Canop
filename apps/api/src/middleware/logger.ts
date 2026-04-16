import { env } from "@/config/env";
import pinoHttp from "pino-http";

export const loggerMiddleware = pinoHttp({
  transport:
    env.NODE_ENV === "development"
      ? { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss" } }
      : undefined,
  redact: ["req.headers.authorization", "req.headers.cookie"],
});
