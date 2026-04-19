import helmet from "helmet";
import type { Express } from "express";
import { env } from "@/config/env";

/**
 * Applies Helmet security headers plus additional hardening headers.
 * Configured to remain compatible with Razorpay checkout + Bunny Stream iframes.
 */
export function applySecurityMiddleware(app: Express) {
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'",
            "https://checkout.razorpay.com",
          ],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            "https://fonts.googleapis.com",
          ],
          fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
          imgSrc: [
            "'self'",
            "data:",
            "blob:",
            "https://*.bunnycdn.com",
            "https://*.b-cdn.net",
            "https://via.placeholder.com",
          ],
          connectSrc: [
            "'self'",
            env.CORS_ORIGIN,
            "wss://*.raquel.app",
            "https://api.anthropic.com",
            "https://checkout.razorpay.com",
            "https://api.razorpay.com",
            "https://*.bunnycdn.com",
          ],
          frameSrc: [
            "https://iframe.mediadelivery.net",
            "https://checkout.razorpay.com",
            "https://api.razorpay.com",
          ],
          mediaSrc: ["'self'", "https://*.bunnycdn.com", "https://*.b-cdn.net", "blob:"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: env.NODE_ENV === "production" ? [] : null,
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
      hsts: {
        maxAge: 31_536_000,
        includeSubDomains: true,
        preload: true,
      },
    }),
  );

  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-DNS-Prefetch-Control", "off");
    res.setHeader("X-Download-Options", "noopen");
    res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader(
      "Permissions-Policy",
      "camera=(self), microphone=(), geolocation=(), payment=(self)",
    );
    next();
  });

  app.disable("x-powered-by");
}
