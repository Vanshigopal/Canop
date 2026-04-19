import { cn } from "@canop/ui";
import { type ClipboardEvent, type KeyboardEvent, useRef } from "react";

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function OTPInput({ length = 6, value, onChange, disabled }: OTPInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, i) => value[i] || "");

  function focusInput(index: number) {
    inputsRef.current[index]?.focus();
  }

  function handleChange(index: number, char: string) {
    if (!/^\d?$/.test(char)) return;
    const next = [...digits];
    next[index] = char;
    onChange(next.join(""));
    if (char && index < length - 1) {
      focusInput(index + 1);
    }
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      focusInput(index - 1);
    }
    if (e.key === "ArrowLeft" && index > 0) {
      focusInput(index - 1);
    }
    if (e.key === "ArrowRight" && index < length - 1) {
      focusInput(index + 1);
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (pasted) {
      onChange(pasted.padEnd(length, "").slice(0, length));
      focusInput(Math.min(pasted.length, length - 1));
    }
  }

  return (
    <div className="flex gap-2.5 justify-center">
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => { inputsRef.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value.slice(-1))}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={i === 0 ? handlePaste : undefined}
          onFocus={(e) => e.target.select()}
          className={cn(
            "w-12 h-14 text-center text-xl font-mono font-semibold",
            "rounded-[11px] border border-border-soft bg-white/92",
            "outline-none transition-all duration-base ease-glass",
            "focus:border-indigo focus:ring-2 focus:ring-indigo/15",
            "disabled:opacity-50 disabled:cursor-not-allowed",
          )}
        />
      ))}
    </div>
  );
}
