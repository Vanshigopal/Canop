export const motion = {
  duration: {
    instant: "75ms",
    fast: "150ms",
    base: "250ms",
    slow: "400ms",
    slower: "800ms",
  },
  easing: {
    glass: "cubic-bezier(0.16, 1, 0.3, 1)",
    bounce: "cubic-bezier(0.34, 1.56, 0.64, 1)",
    linear: "linear",
    in: "cubic-bezier(0.4, 0, 1, 1)",
    out: "cubic-bezier(0, 0, 0.2, 1)",
    inOut: "cubic-bezier(0.4, 0, 0.2, 1)",
  },
  blur: {
    glass: "blur(30px) saturate(1.5)",
    heavy: "blur(40px) saturate(1.8)",
  },
} as const;

export type Motion = typeof motion;
