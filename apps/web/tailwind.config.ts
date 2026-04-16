import { tokens } from "@raquel/ui/tokens";
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}", "../../packages/ui/src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "bg-base": tokens.colors.bg.base,
        "bg-warm": tokens.colors.bg.warm,
        "text-primary": tokens.colors.text.primary,
        "text-body": tokens.colors.text.body,
        "text-muted": tokens.colors.text.muted,
        "text-dim": tokens.colors.text.dim,
        indigo: tokens.colors.brand.indigo,
        "indigo-deep": tokens.colors.brand.indigoDeep,
        coral: tokens.colors.brand.coral,
        peach: tokens.colors.brand.peach,
        "pastel-pink": tokens.colors.pastel.pink,
        "pastel-sky": tokens.colors.pastel.sky,
        "pastel-sage": tokens.colors.pastel.sage,
        "pastel-peach": tokens.colors.pastel.peach,
        "pastel-butter": tokens.colors.pastel.butter,
        border: tokens.colors.border.default,
        "border-soft": tokens.colors.border.soft,
        success: tokens.colors.semantic.success,
        warning: tokens.colors.semantic.warning,
        danger: tokens.colors.semantic.danger,
      },
      fontFamily: {
        display: ['"Fraunces"', "serif"],
        body: ['"Manrope"', "-apple-system", "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
      fontSize: {
        "2xs": "10px",
        xs: "11px",
        sm: "12.5px",
        base: "14px",
        md: "15px",
      },
      borderRadius: tokens.radii,
      boxShadow: tokens.shadows,
      transitionTimingFunction: {
        glass: tokens.motion.easing.glass,
        bounce: tokens.motion.easing.bounce,
      },
      transitionDuration: {
        instant: tokens.motion.duration.instant,
        fast: tokens.motion.duration.fast,
        base: tokens.motion.duration.base,
        slow: tokens.motion.duration.slow,
      },
    },
  },
  plugins: [],
};

export default config;
