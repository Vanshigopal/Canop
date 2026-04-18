interface Features {
  chatbot: boolean;
  reports: boolean;
  translation: boolean;
  questionGen: boolean;
}

interface FeatureTogglesProps {
  value: Features;
  onChange: (next: Features) => void;
}

const FIELDS: { key: keyof Features; label: string; hint: string }[] = [
  {
    key: "chatbot",
    label: "AI Chatbot",
    hint: "Parent and admin Q&A grounded in your data (attendance, fees, marks).",
  },
  {
    key: "reports",
    label: "AI-generated progress reports",
    hint: "Monthly and term-end summaries for each student, written automatically.",
  },
  {
    key: "translation",
    label: "Multi-language message translation",
    hint: "Broadcasts and notifications translated into parents' preferred languages.",
  },
  {
    key: "questionGen",
    label: "AI question bank generation",
    hint: "Draft MCQs and short-answer questions from chapter content.",
  },
];

export function FeatureToggles({ value, onChange }: FeatureTogglesProps) {
  return (
    <div className="space-y-1">
      {FIELDS.map((f) => (
        <label
          key={f.key}
          className="flex cursor-pointer items-start gap-3 rounded-md px-3 py-2.5 hover:bg-white/50"
        >
          <input
            type="checkbox"
            checked={value[f.key]}
            onChange={(e) => onChange({ ...value, [f.key]: e.target.checked })}
            className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-border-soft text-indigo focus:ring-indigo"
          />
          <div className="flex-1">
            <div className="text-sm font-medium text-text-primary">{f.label}</div>
            <div className="text-2xs text-text-muted mt-0.5">{f.hint}</div>
          </div>
        </label>
      ))}
    </div>
  );
}
