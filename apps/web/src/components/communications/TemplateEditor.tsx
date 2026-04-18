import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";

export interface VariableInfo {
  key: string;
  description: string;
}

export interface TemplateEditorProps {
  value: string;
  onChange: (body: string) => void;
  channel?: "SMS" | "WHATSAPP" | "EMAIL" | "IN_APP";
  placeholder?: string;
  rows?: number;
  showPreview?: boolean;
}

export function TemplateEditor({
  value,
  onChange,
  channel = "WHATSAPP",
  placeholder,
  rows = 5,
  showPreview = true,
}: TemplateEditorProps) {
  const [variables, setVariables] = useState<VariableInfo[]>([]);
  const [sample, setSample] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let cancelled = false;
    api.get("/api/v1/templates/variables").then((r) => {
      if (cancelled) return;
      setVariables(r.data.data.variables);
      setSample(r.data.data.sample);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const limit = channel === "SMS" ? 160 : channel === "WHATSAPP" ? 4096 : 10000;
  const length = value.length;
  const over = length > limit;

  const rendered = useMemo(() => {
    return value.replace(/\{(\w+)\}/g, (match, key) => sample[key] ?? match);
  }, [value, sample]);

  function insertVariable(key: string) {
    const ta = textareaRef.current;
    if (!ta) {
      onChange(`${value}{${key}}`);
      return;
    }
    const start = ta.selectionStart ?? value.length;
    const end = ta.selectionEnd ?? value.length;
    const insertion = `{${key}}`;
    const next = value.slice(0, start) + insertion + value.slice(end);
    onChange(next);
    queueMicrotask(() => {
      if (textareaRef.current) {
        const pos = start + insertion.length;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(pos, pos);
      }
    });
  }

  return (
    <div>
      <div className="text-2xs uppercase tracking-wider text-text-dim mb-1.5">
        Variable keys — click to insert at cursor
      </div>
      <div className="flex flex-wrap gap-1.5 mb-2 max-h-28 overflow-y-auto border border-border-soft rounded-md p-2 bg-white/60">
        {variables.map((v) => (
          <button
            type="button"
            key={v.key}
            onClick={() => insertVariable(v.key)}
            title={v.description}
            className="text-2xs px-2 py-0.5 rounded-md border border-indigo/30 bg-indigo/10 text-indigo font-mono hover:bg-indigo/20 transition-colors"
          >
            {"{"}
            {v.key}
            {"}"}
          </button>
        ))}
        {variables.length === 0 && (
          <span className="text-2xs text-text-dim">Loading variables…</span>
        )}
      </div>

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full rounded-md border border-border-soft bg-white/92 px-3 py-2 text-sm font-mono resize-y"
      />

      <div className="mt-1 flex items-center justify-between text-2xs">
        <div className="flex items-center gap-3">
          <span className={over ? "text-danger font-semibold" : "text-text-dim"}>
            {length} / {limit}
            {over && " — over limit"}
          </span>
          {channel === "SMS" && length > 160 && (
            <span className="text-warning">SMS will split into multiple parts</span>
          )}
        </div>
        {showPreview && (
          <button
            type="button"
            onClick={() => setPreview((p) => !p)}
            className="text-indigo hover:underline"
          >
            {preview ? "Hide preview" : "Show preview"}
          </button>
        )}
      </div>

      {preview && showPreview && (
        <div className="mt-2 p-3 rounded-md border border-indigo/20 bg-indigo/5 text-sm whitespace-pre-wrap">
          <div className="text-2xs uppercase tracking-wider text-indigo mb-1">Preview</div>
          {rendered || <span className="text-text-dim">Empty</span>}
        </div>
      )}
    </div>
  );
}
