import { cn } from "@canop/ui";

interface Props {
  className?: string;
}

export function PoweredByCanop({ className }: Props) {
  return (
    <div className={cn("font-mono text-[10px] uppercase tracking-wider text-text-dim", className)}>
      Powered by Canop · v0.1
    </div>
  );
}
