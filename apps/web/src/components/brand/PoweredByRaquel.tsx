import { cn } from "@raquel/ui";

interface Props {
  className?: string;
}

export function PoweredByRaquel({ className }: Props) {
  return (
    <div className={cn("font-mono text-[10px] uppercase tracking-wider text-text-dim", className)}>
      Powered by Raquel · v0.1
    </div>
  );
}
