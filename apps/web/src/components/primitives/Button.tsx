import { cn } from "@raquel/ui";
import { type ButtonHTMLAttributes, type ReactNode, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const variantStyles: Record<Variant, string> = {
  primary: "text-white hover:-translate-y-0.5 active:translate-y-0",
  secondary:
    "bg-white/92 text-text-primary border border-border-soft hover:-translate-y-0.5 hover:bg-white",
  ghost: "text-text-body hover:bg-white/60",
};

const sizeStyles: Record<Size, string> = {
  sm: "px-3.5 py-2 text-xs rounded-md",
  md: "px-5 py-3 text-sm rounded-md",
  lg: "px-6 py-3.5 text-base rounded-lg",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    loading,
    fullWidth,
    leftIcon,
    rightIcon,
    className,
    children,
    disabled,
    ...rest
  },
  ref,
) {
  const primaryStyle =
    variant === "primary"
      ? {
          background: "linear-gradient(135deg, #4F46E5, #3730A3)",
          boxShadow: "0 8px 20px rgba(99, 102, 241, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)",
        }
      : {};

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-semibold",
        "transition-all duration-base ease-glass",
        "disabled:opacity-50 disabled:pointer-events-none",
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && "w-full",
        className,
      )}
      style={primaryStyle}
      {...rest}
    >
      {loading ? (
        <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        leftIcon
      )}
      {children}
      {!loading && rightIcon}
    </button>
  );
});
