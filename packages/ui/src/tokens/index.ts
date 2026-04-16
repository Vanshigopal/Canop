import { colors } from "./colors";
import { motion } from "./motion";
import { radii } from "./radii";
import { shadows } from "./shadows";
import { spacing } from "./spacing";
import { typography } from "./typography";

export { colors, motion, radii, shadows, spacing, typography };

export const tokens = {
  colors,
  typography,
  spacing,
  radii,
  shadows,
  motion,
} as const;

export type Tokens = typeof tokens;
