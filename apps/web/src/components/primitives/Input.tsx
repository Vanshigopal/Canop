import { cn } from "@raquel/ui";
import { type InputHTMLAttributes, type ReactNode, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  suffix?: ReactNode;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, suffix, error, hint, className, id, ...rest },
  ref,
) {
  const inputId = id || rest.name || label?.toLowerCase().replace(/\s+/g, "-") || "input";

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-xs font-medium text-text-muted">
          {label}
        </label>
      )}
      <div className="relative flex items-stretch">
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={cn(
            "w-full rounded-md border border-border-soft bg-white/92 px-3.5 py-2.5",
            "text-sm text-text-primary placeholder:text-text-dim",
            "outline-none transition-all duration-base ease-glass",
            "focus:border-indigo focus:ring-2 focus:ring-indigo/15",
            "disabled:opacity-60 disabled:cursor-not-allowed",
            error && "border-danger/40 focus:border-danger focus:ring-danger/15",
            suffix && "pr-24",
            className,
          )}
          {...rest}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center font-mono text-xs text-text-dim">
            {suffix}
          </span>
        )}
      </div>
      {error && (
        <p id={`${inputId}-error`} className="mt-1 text-xs text-danger">
          {error}
        </p>
      )}
      {!error && hint && <p className="mt-1 text-xs text-text-dim">{hint}</p>}
    </div>
  );
});
