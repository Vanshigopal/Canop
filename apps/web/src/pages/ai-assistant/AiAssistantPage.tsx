import { Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

export function AiAssistantPage() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <Sparkles size={22} className="text-indigo" />
        <h1 className="font-display text-2xl tracking-tight">AI Assistant</h1>
      </div>
      <p className="text-text-muted text-sm mb-8 max-w-xl">
        Intelligent assistant for academic queries and insights.
      </p>

      <div
        className="glass-panel max-w-2xl mx-auto p-10 text-center"
        style={{ borderRadius: 16 }}
      >
        <div className="w-16 h-16 rounded-full bg-indigo/10 grid place-items-center mx-auto mb-5">
          <Sparkles size={28} className="text-indigo" />
        </div>
        <h2 className="font-display text-xl mb-2 text-text-primary">AI Assistant</h2>
        <p className="text-sm text-text-muted max-w-md mx-auto mb-6">
          AI Assistant requires LLM configuration. Set up your API key in{" "}
          <Link
            to="/settings"
            className="text-indigo hover:underline font-medium"
          >
            Settings → AI Configuration
          </Link>{" "}
          to enable.
        </p>

        <div className="flex items-stretch gap-2 max-w-md mx-auto mt-6">
          <input
            type="text"
            disabled
            placeholder="Ask anything about your institute…"
            className="flex-1 rounded-[10px] border border-border-soft bg-[#FAF7F2] px-4 py-3 text-sm text-text-dim cursor-not-allowed"
          />
          <button
            type="button"
            disabled
            className="px-5 rounded-[10px] bg-indigo/40 text-white/80 text-sm font-medium cursor-not-allowed"
          >
            Send
          </button>
        </div>

        <div className="mt-6 text-2xs uppercase tracking-wider text-text-dim">
          Configure a provider to start chatting
        </div>
      </div>
    </div>
  );
}
