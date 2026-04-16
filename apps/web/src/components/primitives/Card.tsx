import { cn } from "@raquel/ui";
import type { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
}

export function Card({ className, padded = true, children, ...rest }: CardProps) {
  return (
    <div className={cn("glass-panel", padded && "p-6", className)} {...rest}>
      {children}
    </div>
  );
}
