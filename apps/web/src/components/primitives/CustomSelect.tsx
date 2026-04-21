import { cn } from "@canop/ui";
import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  name?: string;
  required?: boolean;
  fullWidth?: boolean;
}

export function CustomSelect({
  value,
  onChange,
  options,
  label,
  placeholder = "Select…",
  disabled,
  className,
  id,
  name,
  required,
  fullWidth = true,
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const selectedId = id || name || label?.toLowerCase().replace(/\s+/g, "-") || "cs";

  const selected = options.find((o) => o.value === value) ?? null;

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  useEffect(() => {
    if (!open) {
      setHighlight(-1);
      return;
    }
    const idx = options.findIndex((o) => o.value === value);
    setHighlight(idx >= 0 ? idx : 0);
  }, [open, options, value]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => {
        let next = h + 1;
        while (next < options.length && options[next]?.disabled) next++;
        return next >= options.length ? h : next;
      });
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => {
        let next = h - 1;
        while (next >= 0 && options[next]?.disabled) next--;
        return next < 0 ? h : next;
      });
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const opt = options[highlight];
      if (opt && !opt.disabled) {
        onChange(opt.value);
        setOpen(false);
      }
      return;
    }
  }

  return (
    <div className={cn(fullWidth && "w-full")}>
      {label && (
        <label
          htmlFor={selectedId}
          className="mb-1.5 block text-xs font-medium text-text-primary"
        >
          {label}
          {required && <span className="text-danger ml-0.5">*</span>}
        </label>
      )}
      <div ref={wrapRef} className={cn("relative", fullWidth && "w-full")}>
        <button
          type="button"
          id={selectedId}
          disabled={disabled}
          onClick={() => setOpen((p) => !p)}
          onKeyDown={handleKeyDown}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={cn(
            "w-full flex items-center justify-between gap-2",
            "rounded-[10px] border border-border-soft bg-white/92 px-3.5 py-2.5",
            "text-sm text-left outline-none transition-all duration-base ease-glass",
            "hover:bg-white focus:border-indigo focus:ring-2 focus:ring-indigo/15",
            "disabled:opacity-60 disabled:cursor-not-allowed",
            open && "border-indigo ring-2 ring-indigo/15",
            !selected && "text-text-dim",
            selected && "text-text-primary",
            className,
          )}
        >
          <span className="truncate">{selected ? selected.label : placeholder}</span>
          <ChevronDown
            size={14}
            className={cn(
              "text-text-muted transition-transform duration-base",
              open && "rotate-180",
            )}
          />
        </button>
        {open && (
          <div
            role="listbox"
            className="absolute left-0 right-0 top-full mt-1.5 z-50 py-1 rounded-[10px] border border-border-soft bg-white shadow-[0_4px_16px_rgba(0,0,0,0.08)] max-h-64 overflow-y-auto"
            style={{ animation: "cs-open 0.15s ease-out" }}
          >
            <style>{`@keyframes cs-open { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }`}</style>
            {options.length === 0 && (
              <div className="px-3.5 py-2 text-xs text-text-dim">No options</div>
            )}
            {options.map((o, idx) => {
              const isSelected = o.value === value;
              const isHighlighted = idx === highlight;
              return (
                <button
                  key={o.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  disabled={o.disabled}
                  onClick={() => {
                    if (o.disabled) return;
                    onChange(o.value);
                    setOpen(false);
                  }}
                  onMouseEnter={() => setHighlight(idx)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3.5 py-2 text-sm text-left transition-colors",
                    "disabled:opacity-40 disabled:cursor-not-allowed",
                    isSelected && "text-indigo font-medium",
                    !isSelected && "text-text-primary",
                    isHighlighted && !o.disabled && "bg-[#FAF7F2]",
                  )}
                >
                  <span className="flex-1 truncate">{o.label}</span>
                  {isSelected && <Check size={14} className="text-indigo shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
