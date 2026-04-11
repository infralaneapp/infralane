"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface RatingsData {
  average: number;
  total: number;
  distribution: Record<number, number>;
  recentRatings: {
    id: string;
    ticketSequence: number;
    ticketTitle: string;
    rating: number;
    comment: string | null;
    userName: string;
    createdAt: string;
  }[];
}

function Stars({ count }: { count: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={i <= count ? "text-amber-500" : "text-muted-foreground/30"}
        >
          *
        </span>
      ))}
    </span>
  );
}

export function RatingsReport() {
  const [data, setData] = useState<RatingsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = useCallback(async () => {
    try {
      const res = await fetch("/api/reports/ratings");
      if (!res.ok) throw new Error();
      const json = await res.json();
      setData(json.data);
    } catch {
      toast.error("Could not load ratings report.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  if (loading) {
    return (
      <Card className="p-8 shadow-card">
        <p className="text-sm text-muted-foreground">Loading ratings report...</p>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="p-8 shadow-card">
        <p className="text-sm text-muted-foreground">Failed to load ratings data.</p>
      </Card>
    );
  }

  const { average, total, distribution, recentRatings } = data;
  const maxDist = Math.max(1, ...Object.values(distribution));

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card className="p-5 shadow-card">
        <h2 className="text-sm font-semibold text-foreground">Customer Satisfaction Ratings</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Ratings submitted by requesters after ticket resolution.
        </p>

        <div className="mt-5 flex items-baseline gap-3">
          <span className="text-4xl font-bold text-foreground">{average.toFixed(1)}</span>
          <span className="text-sm text-muted-foreground">/ 5</span>
          <span className="text-sm text-muted-foreground ml-2">({total} rating{total !== 1 ? "s" : ""})</span>
        </div>

        {/* Distribution bars */}
        <div className="mt-5 space-y-2">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = distribution[star] ?? 0;
            return (
              <div key={star} className="flex items-center gap-3">
                <span className="w-8 text-sm text-right text-muted-foreground">{star}</span>
                <div className="flex-1 h-5 rounded-sm bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-sm bg-amber-500/70 transition-all"
                    style={{ width: `${(count / maxDist) * 100}%` }}
                  />
                </div>
                <span className="w-10 text-sm text-muted-foreground text-right">{count}</span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Recent ratings */}
      {recentRatings.length > 0 && (
        <Card className="shadow-card overflow-hidden">
          <div className="p-5 pb-3">
            <h2 className="text-sm font-semibold text-foreground">Recent Ratings</h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Comment</TableHead>
                <TableHead>By</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentRatings.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-foreground">
                    #{r.ticketSequence}
                  </TableCell>
                  <TableCell>
                    <Stars count={r.rating} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[250px] truncate">
                    {r.comment ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.userName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
