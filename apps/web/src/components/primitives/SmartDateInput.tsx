import { cn } from "@canop/ui";
import { Calendar } from "lucide-react";
import {
  type ChangeEvent,
  type InputHTMLAttributes,
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { parseSmartDate, toISODate } from "@/lib/date-parse";

interface SmartDateInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "type"> {
  label?: string;
  value?: string;
  onChange?: (isoDate: string) => void;
  error?: string;
  hint?: string;
  minDate?: string;
  maxDate?: string;
}

/**
 * H1 — Smart date input.
 * Accepts ISO "2026-05-08" or natural "next Monday" / "tomorrow".
 * Shows ghost preview of the interpreted date.
 */
export const SmartDateInput = forwardRef<HTMLInputElement, SmartDateInputProps>(
  function SmartDateInput(
    { label, value = "", onChange, error, hint, className, id, minDate, maxDate, ...rest },
    ref,
  ) {
    const [text, setText] = useState(value);
    const [interpreted, setInterpreted] = useState<string | null>(null);
    const [isoValue, setIsoValue] = useState<string>(isIsoDate(value) ? value : "");
    const [showPicker, setShowPicker] = useState(false);
    const hiddenDateRef = useRef<HTMLInputElement>(null);

    const inputId =
      id || rest.name || label?.toLowerCase().replace(/\s+/g, "-") || "smart-date";

    useEffect(() => {
      setText(value);
      if (isIsoDate(value)) setIsoValue(value);
    }, [value]);

    const preview = useMemo(() => {
      if (!text || text === isoValue) return null;
      const parsed = parseSmartDate(text);
      return parsed;
    }, [text, isoValue]);

    useEffect(() => {
      if (preview?.interpreted) setInterpreted(preview.interpreted);
      else setInterpreted(null);
    }, [preview]);

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      setText(v);
      if (isIsoDate(v)) {
        setIsoValue(v);
        onChange?.(v);
      }
    };

    const handleBlur = () => {
      if (isIsoDate(text)) return;
      const parsed = parseSmartDate(text);
      if (parsed.date && parsed.iso) {
        setIsoValue(parsed.iso);
        setText(parsed.iso);
        onChange?.(parsed.iso);
      }
    };

    const handlePickerChange = (e: ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      if (isIsoDate(v)) {
        setIsoValue(v);
        setText(v);
        onChange?.(v);
      }
    };

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
            type="text"
            value={text}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder={rest.placeholder ?? "2026-05-08 or 'next Monday'"}
            aria-invalid={!!error}
            className={cn(
              "w-full rounded-md border border-border-soft bg-white/92 px-3.5 py-2.5 pr-10",
              "text-sm text-text-primary placeholder:text-text-dim",
              "outline-none transition-all duration-base ease-glass",
              "focus:border-indigo focus:ring-2 focus:ring-indigo/15",
              error && "border-danger/40 focus:border-danger focus:ring-danger/15",
              className,
            )}
            {...rest}
          />
          <button
            type="button"
            onClick={() => {
              setShowPicker(true);
              hiddenDateRef.current?.showPicker?.();
              hiddenDateRef.current?.focus();
            }}
            className="absolute inset-y-0 right-2 flex items-center px-1 text-text-dim hover:text-text-primary"
            aria-label="Open date picker"
          >
            <Calendar className="h-4 w-4" />
          </button>
          <input
            ref={hiddenDateRef}
            type="date"
            value={isoValue}
            min={minDate}
            max={maxDate}
            onChange={handlePickerChange}
            onBlur={() => setShowPicker(false)}
            className="absolute opacity-0 pointer-events-none w-0 h-0"
            tabIndex={-1}
            aria-hidden={!showPicker}
          />
        </div>
        {interpreted && !error && (
          <p className="mt-1 text-xs text-indigo">→ {interpreted}</p>
        )}
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
        {!error && !interpreted && hint && (
          <p className="mt-1 text-xs text-text-dim">{hint}</p>
        )}
      </div>
    );
  },
);

function isIsoDate(v: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(v);
}

export { toISODate };
