export const typography = {
  fonts: {
    display: '"Fraunces", serif',
    body: '"Manrope", -apple-system, BlinkMacSystemFont, sans-serif',
    mono: '"JetBrains Mono", monospace',
  },
  weights: {
    light: 300,
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  sizes: {
    xs: "11px",
    sm: "12.5px",
    base: "14px",
    md: "15px",
    lg: "16px",
    xl: "18px",
    "2xl": "22px",
    "3xl": "28px",
    "4xl": "36px",
    "5xl": "48px",
    "6xl": "60px",
  },
  letterSpacing: {
    tight: "-0.025em",
    snug: "-0.015em",
    normal: "0",
    wide: "0.08em",
    wider: "0.12em",
    widest: "0.18em",
  },
} as const;

export type Typography = typeof typography;
