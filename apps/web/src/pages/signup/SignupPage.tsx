import { PoweredByCanop } from "@/components/brand/PoweredByCanop";
import { AuroraBackground } from "@/components/layout/AuroraBackground";
import { Button } from "@/components/primitives";
import s from "./signup.module.css";

export function SignupPage() {
  return (
    <>
      <AuroraBackground />
      <main className={s.shell}>
        <div className={`${s.card} glass-panel animate-fade-up`}>
          <h1 className="font-display text-3xl tracking-tight mb-2">
            Start your <span className="italic text-coral">institute.</span>
          </h1>
          <p className="text-text-muted text-sm">
            Sign up will be enabled in Session 3 once auth is wired. For now, reach the demo via the
            login page on{" "}
            <code className="font-mono text-xs bg-bg-warm px-1 py-0.5 rounded">
              demo.lvh.me:5173
            </code>
            .
          </p>
          <div className="h-5" />
          <Button
            variant="secondary"
            fullWidth
            onClick={() => {
              window.location.href = "/login";
            }}
          >
            ← Back to sign in
          </Button>
        </div>
        <div className={s.footerWrap}>
          <PoweredByCanop />
        </div>
      </main>
    </>
  );
}
