import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <Card className="shadow-card overflow-hidden">
      <div className="p-4 space-y-3">
        <div className="flex gap-4">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4">
            {Array.from({ length: cols }).map((_, j) => (
              <Skeleton key={j} className="h-5 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </Card>
  );
}

export function StatCardSkeleton() {
  return (
    <Card className="p-5 shadow-card">
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    </Card>
  );
}

export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <Card className="p-5 shadow-card space-y-3">
      <Skeleton className="h-5 w-40" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-4 w-full" style={{ width: `${80 - i * 15}%` }} />
      ))}
    </Card>
  );
}

export function PageHeaderSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-72" />
    </div>
  );
}
