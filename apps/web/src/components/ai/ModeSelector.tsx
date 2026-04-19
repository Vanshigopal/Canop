import { cn } from "@canop/ui";

export type LLMMode = "DISABLED" | "PLATFORM_KEY" | "BRING_YOUR_OWN_KEY";

interface ModeSelectorProps {
  value: LLMMode;
  onChange: (mode: LLMMode) => void;
  platformKeyAvailable: boolean;
}

const MODES: { value: LLMMode; title: string; description: string }[] = [
  {
    value: "DISABLED",
    title: "Disabled",
    description: "No AI features. No calls, no billing, no data sent anywhere.",
  },
  {
    value: "PLATFORM_KEY",
    title: "Platform Key",
    description: "Use Canop's managed AI. Usage billed to your institute at cost + margin.",
  },
  {
    value: "BRING_YOUR_OWN_KEY",
    title: "Bring Your Own Key",
    description: "Supply your own Anthropic API key. Canop charges nothing for AI usage.",
  },
];

export function ModeSelector({ value, onChange, platformKeyAvailable }: ModeSelectorProps) {
  return (
    <div className="space-y-2">
      {MODES.map((m) => {
        const disabled = m.value === "PLATFORM_KEY" && !platformKeyAvailable;
        const active = value === m.value;
        return (
          <button
            key={m.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(m.value)}
            className={cn(
              "w-full text-left rounded-lg border px-4 py-3 transition-all",
              active
                ? "border-indigo bg-indigo/5 ring-2 ring-indigo/20"
                : "border-border-soft bg-white/60 hover:bg-white/80",
              disabled && "opacity-50 cursor-not-allowed",
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "mt-0.5 h-4 w-4 shrink-0 rounded-full border-2",
                  active ? "border-indigo bg-indigo" : "border-text-dim",
                )}
              >
                {active && <div className="m-0.5 h-2 w-2 rounded-full bg-white" />}
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-text-primary">{m.title}</div>
                <div className="text-xs text-text-muted mt-0.5">{m.description}</div>
                {disabled && (
                  <div className="mt-1 text-2xs text-warning font-mono uppercase tracking-wider">
                    Platform key not configured — ask your Canop contact
                  </div>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
