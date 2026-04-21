import { useState } from "react";
import { Check, CheckCircle, Lock, ShieldCheck, X, XCircle } from "lucide-react";
import { Button, Input } from "@/components/primitives";

interface ApiKeyInputProps {
  maskedKey: string | null;
  lastTestedAt: string | null;
  lastTestStatus: string | null;
  onSave: (apiKey: string) => Promise<void>;
  onClear: () => Promise<void>;
  onTest: () => Promise<{ ok: boolean; error?: string }>;
  saving: boolean;
  testing: boolean;
}

export function ApiKeyInput({
  maskedKey,
  lastTestedAt,
  lastTestStatus,
  onSave,
  onClear,
  onTest,
  saving,
  testing,
}: ApiKeyInputProps) {
  const [editing, setEditing] = useState(!maskedKey);
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  const handleSave = async () => {
    if (!input.trim()) return;
    await onSave(input.trim());
    setInput("");
    setEditing(false);
    setFeedback(null);
  };

  const handleTest = async () => {
    setFeedback(null);
    const result = await onTest();
    setFeedback({
      ok: result.ok,
      message: result.ok ? "Connection successful" : result.error || "Connection failed",
    });
  };

  const handleClear = async () => {
    await onClear();
    setEditing(true);
    setInput("");
    setFeedback(null);
  };

  return (
    <div className="space-y-3">
      {editing ? (
        <>
          <Input
            type="password"
            placeholder="sk-ant-api03-..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!input.trim() || saving}
              loading={saving}
            >
              Save key
            </Button>
            {maskedKey && (
              <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setInput(""); }}>
                Cancel
              </Button>
            )}
          </div>
          <p className="flex items-start gap-1.5 text-2xs text-text-muted">
            <Lock size={12} className="mt-0.5 shrink-0" />
            Your key is stored encrypted with AES-256-GCM and never returned to the browser.
          </p>
        </>
      ) : (
        <>
          <div className="flex items-center gap-3 rounded-md border border-border-soft bg-white/70 px-3.5 py-2.5 font-mono text-sm text-text-primary">
            <ShieldCheck size={16} className="shrink-0 text-success" />
            <span className="flex-1 truncate">{maskedKey}</span>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-xs font-semibold text-indigo hover:underline"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="text-xs font-semibold text-danger hover:underline"
            >
              Remove
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-2xs text-text-muted">
              {lastTestedAt ? (
                <>
                  Last tested {formatRelative(lastTestedAt)} ·{" "}
                  <span
                    className={
                      lastTestStatus === "success"
                        ? "text-success font-semibold inline-flex items-center gap-1"
                        : "text-danger font-semibold inline-flex items-center gap-1"
                    }
                  >
                    {lastTestStatus === "success" ? (
                      <>
                        <CheckCircle size={12} /> Valid
                      </>
                    ) : (
                      <>
                        <XCircle size={12} /> Invalid
                      </>
                    )}
                  </span>
                </>
              ) : (
                "Never tested"
              )}
            </div>
            <Button size="sm" variant="secondary" onClick={handleTest} loading={testing}>
              Test connection
            </Button>
          </div>
        </>
      )}

      {feedback && (
        <div
          className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs ${
            feedback.ok
              ? "border-success/20 bg-success/5 text-success"
              : "border-danger/20 bg-danger/5 text-danger"
          }`}
        >
          {feedback.ok ? <Check size={14} /> : <X size={14} />}
          <span>{feedback.message}</span>
        </div>
      )}
    </div>
  );
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}
