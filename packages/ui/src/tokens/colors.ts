export const colors = {
  bg: {
    base: "#FAF7F2",
    warm: "#F5EFE6",
    card: "#FFFFFF",
  },
  surface: {
    primary: "rgba(255, 253, 250, 0.72)",
    secondary: "rgba(248, 242, 232, 0.82)",
    high: "rgba(255, 255, 255, 0.92)",
  },
  border: {
    soft: "rgba(90, 70, 50, 0.10)",
    default: "#E8E1D6",
    muted: "#F0E8DC",
    glow: "rgba(99, 102, 241, 0.22)",
  },
  text: {
    primary: "#1E1A1A",
    body: "#3D3632",
    muted: "#7A716B",
    dim: "#A89E95",
  },
  brand: {
    indigo: "#4F46E5",
    indigoDeep: "#3730A3",
    coral: "#EC4899",
    peach: "#FB923C",
  },
  pastel: {
    pink: "#FECDD3",
    sky: "#BAE6FD",
    sage: "#BBF7D0",
    peach: "#FED7AA",
    butter: "#FEF3C7",
  },
  semantic: {
    success: "#059669",
    warning: "#D97706",
    danger: "#DC2626",
    info: "#0284C7",
  },
} as const;

export type Colors = typeof colors;
