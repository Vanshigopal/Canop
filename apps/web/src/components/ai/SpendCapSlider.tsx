import { formatIndianCurrency } from "@/lib/indian-numbers";

interface SpendCapSliderProps {
  capCents: number;
  onChange: (cents: number) => void;
  currentMonthCents: number;
}

const USD_TO_INR = 83;

const STOPS_CENTS = [
  0, 50_00, 100_00, 250_00, 500_00, 1_000_00, 2_500_00, 5_000_00, 10_000_00, 25_000_00, 50_000_00,
  100_000_00,
];

export function SpendCapSlider({ capCents, onChange, currentMonthCents }: SpendCapSliderProps) {
  const stopIndex = findNearestStop(capCents);
  const percentUsed = capCents > 0 ? Math.min(100, (currentMonthCents / capCents) * 100) : 0;
  const capDollars = capCents / 100;
  const spentDollars = currentMonthCents / 100;
  const capInr = capDollars * USD_TO_INR;
  const spentInr = spentDollars * USD_TO_INR;

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <label className="text-xs font-medium text-text-muted">Monthly cap</label>
        <div className="text-right">
          <div className="text-sm font-semibold text-text-primary">
            {formatIndianCurrency(capInr)}
          </div>
          <div className="text-2xs text-text-muted font-mono">${capDollars.toFixed(2)} USD</div>
        </div>
      </div>

      <input
        type="range"
        min={0}
        max={STOPS_CENTS.length - 1}
        step={1}
        value={stopIndex}
        onChange={(e) => {
          const nextCents = STOPS_CENTS[Number(e.target.value)] ?? 0;
          onChange(nextCents);
        }}
        className="w-full accent-indigo"
      />

      <div className="flex justify-between text-2xs text-text-dim font-mono">
        <span>₹0</span>
        <span>₹83L</span>
      </div>

      {capCents > 0 && (
        <div className="rounded-md bg-bg-warm px-3 py-2.5 border border-border-soft">
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-xs text-text-muted">
              Spent this month: {formatIndianCurrency(spentInr)} ({percentUsed.toFixed(1)}%)
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-white overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo to-coral transition-all"
              style={{ width: `${percentUsed}%` }}
            />
          </div>
        </div>
      )}

      {capCents === 0 && (
        <div className="rounded-md border border-warning/20 bg-warning/5 px-3 py-2 text-xs text-warning">
          No cap set. AI usage is unbounded until you set a limit.
        </div>
      )}
    </div>
  );
}

function findNearestStop(cents: number): number {
  let idx = 0;
  let best = Infinity;
  for (let i = 0; i < STOPS_CENTS.length; i++) {
    const v = STOPS_CENTS[i];
    if (v === undefined) continue;
    const diff = Math.abs(v - cents);
    if (diff < best) {
      best = diff;
      idx = i;
    }
  }
  return idx;
}
