import type { ChildSummary } from "@/components/portal/portal-types";

interface Props {
  children: ChildSummary[];
  selectedId: string | null;
  onChange: (id: string) => void;
}

export function ChildSwitcher({ children, selectedId, onChange }: Props) {
  if (children.length <= 1) return null;

  if (children.length <= 3) {
    return (
      <div
        className="flex gap-1 p-1 rounded-full"
        style={{ backgroundColor: "#E8E3DA" }}
      >
        {children.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onChange(c.id)}
            className="flex-1 h-11 rounded-full text-sm font-medium transition-colors"
            style={{
              backgroundColor: selectedId === c.id ? "#FAF7F2" : "transparent",
              color: selectedId === c.id ? "#2C2C2A" : "#6B6A66",
              boxShadow: selectedId === c.id ? "0 2px 6px rgba(0,0,0,0.05)" : "none",
              minHeight: 44,
            }}
          >
            {c.name.split(" ")[0]}
          </button>
        ))}
      </div>
    );
  }

  return (
    <select
      value={selectedId ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className="h-12 px-4 rounded-full border"
      style={{
        fontSize: 16,
        backgroundColor: "#FFFFFF",
        borderColor: "rgba(90, 70, 50, 0.12)",
        color: "#2C2C2A",
        minHeight: 44,
      }}
    >
      {children.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
          {c.batchName ? ` · ${c.batchName}` : ""}
        </option>
      ))}
    </select>
  );
}
