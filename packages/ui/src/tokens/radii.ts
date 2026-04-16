export const radii = {
  none: "0",
  xs: "5px",
  sm: "7px",
  md: "11px",
  lg: "14px",
  xl: "20px",
  "2xl": "22px",
  "3xl": "28px",
  full: "9999px",
} as const;

export type Radii = typeof radii;
