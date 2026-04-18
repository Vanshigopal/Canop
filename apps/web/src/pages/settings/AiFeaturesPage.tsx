import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/primitives";
import { ApiKeyInput } from "@/components/ai/ApiKeyInput";
import { FeatureToggles } from "@/components/ai/FeatureToggles";
import type { LLMMode } from "@/components/ai/ModeSelector";
import { ModeSelector } from "@/components/ai/ModeSelector";
import { PrivacyToggles } from "@/components/ai/PrivacyToggles";
import { SpendCapSlider } from "@/components/ai/SpendCapSlider";
import { UsageDashboard, type UsageData } from "@/components/ai/UsageDashboard";
import { api } from "@/lib/api";

interface LLMConfigResponse {
  mode: LLMMode;
  provider: string;
  preferredModel: string;
  apiKeyMasked: string | null;
  apiKeyLastTestedAt: string | null;
  apiKeyLastTestStatus: string | null;
  privacy: {
    shareStudentNames: boolean;
    shareParentNames: boolean;
    shareExamMarks: boolean;
    shareAttendanceData: boolean;
    shareContactInfo: boolean;
  };
  features: {
    chatbot: boolean;
    reports: boolean;
    translation: boolean;
    questionGen: boolean;
  };
  spendCap: {
    monthlyCapCents: number;
    currentMonthCents: number;
    currentMonth: string;
  } | null;
  platformKeyAvailable: boolean;
}

const MODELS = [
  { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet — balanced" },
  { value: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku — fast & cheap" },
  { value: "claude-3-opus-20240229", label: "Claude 3 Opus — highest quality" },
];

export function AiFeaturesPage() {
  const [config, setConfig] = useState<LLMConfigResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [usageLoading, setUsageLoading] = useState(true);

  // Local draft state — saved on form submit
  const [mode, setMode] = useState<LLMMode>("DISABLED");
  const [preferredModel, setPreferredModel] = useState(MODELS[0]!.value);
  const [privacy, setPrivacy] = useState({
    shareStudentNames: false,
    shareParentNames: false,
    shareExamMarks: true,
    shareAttendanceData: true,
    shareContactInfo: false,
  });
  const [features, setFeatures] = useState({
    chatbot: false,
    reports: false,
    translation: false,
    questionGen: false,
  });
  const [monthlyCapCents, setMonthlyCapCents] = useState(0);

  const fetchConfig = useCallback(async () => {
    const { data } = await api.get("/api/v1/ai/config");
    const c = data.data as LLMConfigResponse;
    setConfig(c);
    setMode(c.mode);
    setPreferredModel(c.preferredModel);
    setPrivacy(c.privacy);
    setFeatures(c.features);
    setMonthlyCapCents(c.spendCap?.monthlyCapCents ?? 0);
    setLoading(false);
  }, []);

  const fetchUsage = useCallback(async () => {
    setUsageLoading(true);
    try {
      const { data } = await api.get("/api/v1/ai/config/usage");
      setUsage(data.data as UsageData);
    } catch {
      setUsage(null);
    } finally {
      setUsageLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
    fetchUsage();
  }, [fetchConfig, fetchUsage]);

  const handleSave = async () => {
    if (!config) return;
    // Warn when switching from DISABLED to something that could cost money
    if (config.mode === "DISABLED" && mode !== "DISABLED") {
      const ok = window.confirm(
        "Enabling AI features may incur costs — either to your institute (Platform Key) " +
          "or to your own Anthropic account (BYOK). Continue?",
      );
      if (!ok) return;
    }

    setSaving(true);
    try {
      await api.patch("/api/v1/ai/config", {
        mode,
        preferredModel,
        privacy,
        features,
        monthlyCapCents,
      });
      await fetchConfig();
    } finally {
      setSaving(false);
    }
  };

  const handleSaveApiKey = async (apiKey: string) => {
    await api.patch("/api/v1/ai/config", { apiKey });
    await fetchConfig();
  };

  const handleClearApiKey = async () => {
    await api.patch("/api/v1/ai/config", { apiKey: "" });
    await fetchConfig();
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const { data } = await api.post("/api/v1/ai/config/test");
      await fetchConfig();
      return data.data as { ok: boolean; error?: string };
    } catch (e) {
      const err = e as { response?: { data?: { error?: { message?: string } } } };
      return { ok: false, error: err.response?.data?.error?.message || "Request failed" };
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="glass-panel p-8 text-center text-sm text-text-muted">Loading settings…</div>
    );
  }
  if (!config) {
    return (
      <div className="glass-panel p-8 text-center text-sm text-danger">
        Failed to load AI settings.
      </div>
    );
  }

  const needsApiKey = mode === "BRING_YOUR_OWN_KEY";
  const dirty =
    mode !== config.mode ||
    preferredModel !== config.preferredModel ||
    JSON.stringify(privacy) !== JSON.stringify(config.privacy) ||
    JSON.stringify(features) !== JSON.stringify(config.features) ||
    monthlyCapCents !== (config.spendCap?.monthlyCapCents ?? 0);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-indigo/10 p-2">
          <Sparkles className="text-indigo" size={20} />
        </div>
        <div>
          <h1 className="font-display text-2xl tracking-tight">AI Features</h1>
          <p className="text-sm text-text-muted">
            Configure the AI layer that powers chatbot, reports, translations, and question generation.
          </p>
        </div>
      </div>

      <section className="glass-panel p-6 space-y-4">
        <SectionHeader title="Mode" subtitle="How AI is provisioned for your institute." />
        <ModeSelector
          value={mode}
          onChange={setMode}
          platformKeyAvailable={config.platformKeyAvailable}
        />
      </section>

      {needsApiKey && (
        <section className="glass-panel p-6 space-y-4">
          <SectionHeader
            title="API Key"
            subtitle="Your Anthropic API key — stored encrypted and never returned to the browser."
          />
          <ApiKeyInput
            maskedKey={config.apiKeyMasked}
            lastTestedAt={config.apiKeyLastTestedAt}
            lastTestStatus={config.apiKeyLastTestStatus}
            onSave={handleSaveApiKey}
            onClear={handleClearApiKey}
            onTest={handleTestConnection}
            saving={saving}
            testing={testing}
          />
        </section>
      )}

      {mode !== "DISABLED" && (
        <section className="glass-panel p-6 space-y-4">
          <SectionHeader title="Model" subtitle="Default model used when features don't specify one." />
          <select
            value={preferredModel}
            onChange={(e) => setPreferredModel(e.target.value)}
            className="w-full rounded-md border border-border-soft bg-white/92 px-3.5 py-2.5 text-sm"
          >
            {MODELS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </section>
      )}

      <section className="glass-panel p-6 space-y-4">
        <SectionHeader
          title="Features enabled"
          subtitle="Independent switches — a feature only runs if this toggle is on AND mode is not Disabled."
        />
        <FeatureToggles value={features} onChange={setFeatures} />
      </section>

      <section className="glass-panel p-6 space-y-4">
        <SectionHeader
          title="Privacy — what AI sees"
          subtitle="Disabled items are replaced with pseudonyms before any prompt leaves your server."
        />
        <PrivacyToggles value={privacy} onChange={setPrivacy} />
      </section>

      {mode !== "DISABLED" && (
        <section className="glass-panel p-6 space-y-4">
          <SectionHeader
            title="Spending cap"
            subtitle="Hard limit per calendar month. When reached, AI features fall back to stubs until next month."
          />
          <SpendCapSlider
            capCents={monthlyCapCents}
            onChange={setMonthlyCapCents}
            currentMonthCents={config.spendCap?.currentMonthCents ?? 0}
          />
        </section>
      )}

      <div className="sticky bottom-4 flex items-center justify-end gap-3 glass-panel px-6 py-4">
        {dirty && (
          <span className="flex items-center gap-1.5 text-xs text-warning">
            <AlertCircle size={14} /> Unsaved changes
          </span>
        )}
        <Button variant="ghost" onClick={() => fetchConfig()} disabled={saving || !dirty}>
          Reset
        </Button>
        <Button onClick={handleSave} disabled={!dirty || saving} loading={saving}>
          Save changes
        </Button>
      </div>

      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <div>
            <h2 className="font-display text-lg tracking-tight">Usage this month</h2>
            <p className="text-xs text-text-muted">
              Every AI call is logged — tokens, cost, duration, and outcome.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchUsage}>
            Refresh
          </Button>
        </div>
        <UsageDashboard data={usage} loading={usageLoading} />
      </section>
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="text-sm font-display font-semibold tracking-tight">{title}</h2>
      <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>
    </div>
  );
}
