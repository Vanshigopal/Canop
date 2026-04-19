import { cn } from "@canop/ui";
import type { HTMLAttributes } from "react";

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  width?: number | string;
  height?: number | string;
  rounded?: string;
}

export function Skeleton({ className, width, height, rounded, style, ...rest }: SkeletonProps) {
  return (
    <div
      className={cn("skeleton", className)}
      style={{
        width,
        height: height ?? 14,
        borderRadius: rounded ?? 8,
        ...style,
      }}
      {...rest}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="glass-panel p-5 space-y-3">
      <Skeleton width="40%" height={10} />
      <Skeleton width="60%" height={24} />
      <Skeleton width="30%" height={10} />
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="glass-panel overflow-hidden">
      <div className="border-b border-border-soft px-4 py-3 flex gap-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} width="18%" height={10} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="px-4 py-3 border-b border-border-soft last:border-0 flex gap-3">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} width={c === 0 ? "22%" : "16%"} height={12} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-5 p-6">
      <Skeleton width={220} height={18} />
      <Skeleton width={380} height={28} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
      <TableSkeleton rows={6} cols={5} />
    </div>
  );
}
