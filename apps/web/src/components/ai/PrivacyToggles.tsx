interface Privacy {
  shareStudentNames: boolean;
  shareParentNames: boolean;
  shareExamMarks: boolean;
  shareAttendanceData: boolean;
  shareContactInfo: boolean;
}

interface PrivacyTogglesProps {
  value: Privacy;
  onChange: (next: Privacy) => void;
}

const FIELDS: { key: keyof Privacy; label: string; hint: string }[] = [
  {
    key: "shareStudentNames",
    label: "Share student names",
    hint: "When off, names are replaced with pseudonyms like 'Student A' before sending.",
  },
  {
    key: "shareParentNames",
    label: "Share parent / guardian names",
    hint: "When off, parent names are replaced with pseudonyms like 'Parent A'.",
  },
  {
    key: "shareExamMarks",
    label: "Share exam marks & grades",
    hint: "Numerical results aggregated across the batch. On by default — data is not identifying.",
  },
  {
    key: "shareAttendanceData",
    label: "Share attendance records",
    hint: "Dates, present/absent flags, rates. On by default.",
  },
  {
    key: "shareContactInfo",
    label: "Share phone numbers and email addresses",
    hint: "When off, phone numbers and emails are redacted from any prompt.",
  },
];

export function PrivacyToggles({ value, onChange }: PrivacyTogglesProps) {
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
      <p className="mt-2 text-2xs text-text-muted px-3">
        Redaction runs inside the Node process before any text leaves your institute's server.
      </p>
    </div>
  );
}
