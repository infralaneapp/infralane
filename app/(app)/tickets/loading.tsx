import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function TicketsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-80" />
        </div>
        <Skeleton className="h-8 w-32" />
      </div>

      <Card className="p-4 shadow-card">
        <div className="flex gap-4">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-8 w-44" />
        </div>
      </Card>

      <Card className="overflow-hidden shadow-card">
        <div className="border-b border-border px-5 py-3">
          <div className="flex gap-16">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-14" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-6 border-b border-border px-5 py-4 last:border-0">
            <div className="flex-1">
              <Skeleton className="h-4 w-64" />
              <Skeleton className="mt-1.5 h-3 w-20" />
            </div>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </Card>
    </div>
  );
}
