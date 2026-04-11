import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-36" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-5 shadow-card">
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-lg" />
              <div>
                <Skeleton className="h-7 w-12" />
                <Skeleton className="mt-1 h-3 w-20" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="p-5 shadow-card">
            <Skeleton className="h-4 w-20" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 4 }).map((_, j) => (
                <Skeleton key={j} className="h-5 w-full" />
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
