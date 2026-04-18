import { useState } from "react";
import { Settings as SettingsIcon, Sparkles } from "lucide-react";
import { ModuleStub } from "@/components/ModuleStub";
import { AiFeaturesPage } from "./AiFeaturesPage";

type Tab = "general" | "ai-features";

const TABS: { id: Tab; label: string; icon: typeof SettingsIcon }[] = [
  { id: "general", label: "General", icon: SettingsIcon },
  { id: "ai-features", label: "AI Features", icon: Sparkles },
];

export function SettingsPage() {
  const [tab, setTab] = useState<Tab>("ai-features");

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6 flex gap-1 border-b border-border-soft">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px ${
                active
                  ? "border-indigo text-indigo"
                  : "border-transparent text-text-muted hover:text-text-primary"
              }`}
            >
              <Icon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "general" && (
        <ModuleStub
          number={21}
          name="General Settings"
          description="Institute configuration, branding, and white-label setup."
          session={12}
        />
      )}
      {tab === "ai-features" && <AiFeaturesPage />}
    </div>
  );
}
