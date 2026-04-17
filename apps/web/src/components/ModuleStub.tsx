interface ModuleStubProps {
  number: number;
  name: string;
  description: string;
  session: number;
}

export function ModuleStub({ number, name, description, session }: ModuleStubProps) {
  return (
    <div>
      <div className="font-mono text-xs uppercase tracking-widest text-coral mb-2">
        Module {String(number).padStart(2, "0")}
      </div>
      <h1 className="font-display text-4xl tracking-tight mb-3">
        {name}
        <span className="text-coral">.</span>
      </h1>
      <p className="text-text-muted text-md max-w-xl mb-8">{description}</p>
      <div className="glass-panel p-6 max-w-md">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-2 h-2 rounded-full bg-warning" />
          <span className="font-mono text-xs uppercase tracking-wider text-warning font-semibold">
            Coming in Session {session}
          </span>
        </div>
        <p className="text-sm text-text-muted">
          This module will be fully functional after Session {session} is complete. The sidebar
          navigation, routing, and page shell are already wired.
        </p>
      </div>
    </div>
  );
}
