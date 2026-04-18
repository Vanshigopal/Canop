import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export function BatchComparisonWidget(_: { config: Record<string, unknown> }) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-2 p-4 text-center">
      <div className="text-sm font-medium">Batch Comparison</div>
      <div className="text-xs text-text-muted">
        Side-by-side radar chart across 5 performance axes.
      </div>
      <Link
        to="/analytics/compare"
        className="inline-flex items-center gap-1 text-xs text-indigo font-medium mt-2"
      >
        Open comparison <ArrowRight size={12} />
      </Link>
    </div>
  );
}
