import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3001),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  DATABASE_URL: z.string().url().default("postgresql://raquel:raquel_dev_password@localhost:5432/raquel_dev?schema=public"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  JWT_SECRET: z.string().min(16).default("raquel-dev-secret-change-in-production-please"),
  JWT_ACCESS_TTL: z.coerce.number().default(900),
  JWT_REFRESH_TTL: z.coerce.number().default(604800),
  OTP_TTL: z.coerce.number().default(300),
  RAZORPAY_KEY_ID: z.string().default("rzp_test_placeholder"),
  RAZORPAY_KEY_SECRET: z.string().default("placeholder_secret"),
  GUPSHUP_API_KEY: z.string().default(""),
  GUPSHUP_APP_NAME: z.string().default(""),
  GUPSHUP_SENDER_ID: z.string().default(""),
  ML_SERVICE_URL: z.string().default("http://localhost:8000"),
  ML_SERVICE_API_KEY: z.string().default("dev-internal-key"),
  ANTHROPIC_API_KEY: z.string().default(""),
  LLM_ENCRYPTION_KEY: z.string().default(""),
  R2_ACCOUNT_ID: z.string().default(""),
  R2_ACCESS_KEY_ID: z.string().default(""),
  R2_SECRET_ACCESS_KEY: z.string().default(""),
  R2_BUCKET_NAME: z.string().default("raquel-uploads"),
  R2_PUBLIC_URL: z.string().default(""),
  BUNNY_STREAM_API_KEY: z.string().default(""),
  BUNNY_STREAM_LIBRARY_ID: z.string().default(""),
  BUNNY_STREAM_CDN_HOSTNAME: z.string().default(""),
});

export const env = EnvSchema.parse(process.env);
