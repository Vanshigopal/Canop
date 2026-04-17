import { IndianRupee } from "lucide-react";

export function FeesTab() {
  return (
    <div className="glass-panel p-10 text-center max-w-lg mx-auto">
      <div className="w-12 h-12 rounded-full bg-indigo/10 grid place-items-center mx-auto mb-3">
        <IndianRupee className="text-indigo" size={22} />
      </div>
      <div className="font-display text-lg mb-1">Fees timeline</div>
      <p className="text-sm text-text-muted mb-4">
        Per-student fee schedule, payments, and outstanding balance will appear here.
      </p>
      <div className="inline-flex items-center gap-2 rounded-md bg-warning/10 border border-warning/20 px-3 py-1.5 text-2xs uppercase tracking-wider text-warning font-semibold">
        <span className="w-1.5 h-1.5 rounded-full bg-warning" />
        Coming in Session 7
      </div>
    </div>
  );
}
