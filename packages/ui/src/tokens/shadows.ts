export const shadows = {
  glass: "0 1px 2px rgba(0,0,0,0.03), 0 4px 12px rgba(0,0,0,0.03)",
  glassHover: "0 2px 4px rgba(0,0,0,0.03), 0 12px 28px rgba(0,0,0,0.06)",
  card: "0 1px 2px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.04)",
  cta: "0 8px 20px rgba(99, 102, 241, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)",
  ctaHover: "0 14px 28px rgba(99, 102, 241, 0.4), inset 0 1px 0 rgba(255,255,255,0.3)",
  focus: "0 0 0 3px rgba(99, 102, 241, 0.15)",
  none: "none",
} as const;

export type Shadows = typeof shadows;
