import { Button } from "@/components/primitives";
import { useAuthStore } from "@/stores/auth";

export function ParentPage() {
  const user = useAuthStore((s) => s.user);
  const tenant = useAuthStore((s) => s.tenant);
  const logout = useAuthStore((s) => s.logout);

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="glass-panel p-10 max-w-lg w-full text-center animate-fade-up">
        <h1 className="font-display text-3xl tracking-tight mb-2">
          Welcome, <span className="italic text-coral">{user?.name}</span>
        </h1>
        <p className="text-text-muted text-sm mb-1">
          Parent portal at <strong className="text-text-primary">{tenant?.name}</strong>
        </p>
        <p className="text-text-dim text-xs font-mono mb-8">
          Parent portal coming in Session 6
        </p>
        <Button variant="secondary" fullWidth onClick={logout}>
          Sign out
        </Button>
      </div>
    </main>
  );
}
