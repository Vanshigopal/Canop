import { BrandMark } from "@/components/brand/BrandMark";
import { PoweredByRaquel } from "@/components/brand/PoweredByRaquel";
import { AuroraBackground } from "@/components/layout/AuroraBackground";
import { Button } from "@/components/primitives";
import s from "./signup.module.css";

export function SignupPage() {
  return (
    <>
      <AuroraBackground />
      <main className={s.shell}>
        <div className={`${s.card} glass-panel animate-fade-up`}>
          <BrandMark size={48} />
          <h1 className="font-display text-3xl tracking-tight mt-3 mb-2">
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
          <PoweredByRaquel />
        </div>
      </main>
    </>
  );
}
