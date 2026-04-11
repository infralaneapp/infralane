"use client";

import { useState, useEffect, useCallback } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type TicketRatingProps = {
  ticketId: string;
  isRequester: boolean;
  status: string;
};

type RatingData = {
  rating: number;
  comment: string | null;
};

export function TicketRating({ ticketId, isRequester, status }: TicketRatingProps) {
  const [existing, setExisting] = useState<RatingData | null>(null);
  const [selectedRating, setSelectedRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const canShow = (status === "RESOLVED" || status === "CLOSED") && isRequester;

  const fetchRating = useCallback(async () => {
    try {
      const res = await fetch(`/api/tickets/${ticketId}/rating`);
      const json = await res.json();
      if (json.success && json.data.rating) {
        setExisting(json.data.rating);
        setSelectedRating(json.data.rating.rating);
        setComment(json.data.rating.comment ?? "");
      }
    } finally {
      setLoaded(true);
    }
  }, [ticketId]);

  useEffect(() => {
    if (canShow) fetchRating();
  }, [canShow, fetchRating]);

  if (!canShow || !loaded) return null;

  async function handleSubmit() {
    if (selectedRating === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/rating`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: selectedRating,
          comment: comment.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setExisting(json.data.rating);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const displayRating = hoveredRating || selectedRating;

  return (
    <Card className="p-6 shadow-card">
      <h2 className="text-base font-semibold tracking-tight text-foreground">
        {existing ? "Your Rating" : "Rate this ticket"}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {existing
          ? "Thank you for your feedback."
          : "How satisfied are you with the resolution?"}
      </p>

      <div className="mt-4 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            disabled={!!existing}
            className={cn(
              "p-0.5 transition-colors",
              !existing && "cursor-pointer hover:scale-110",
            )}
            onMouseEnter={() => !existing && setHoveredRating(value)}
            onMouseLeave={() => !existing && setHoveredRating(0)}
            onClick={() => !existing && setSelectedRating(value)}
          >
            <Star
              className={cn(
                "size-6",
                value <= displayRating
                  ? "fill-amber-400 text-amber-400"
                  : "text-muted-foreground/40",
              )}
            />
          </button>
        ))}
        {displayRating > 0 && (
          <span className="ml-2 text-sm text-muted-foreground">{displayRating}/5</span>
        )}
      </div>

      {existing ? (
        existing.comment && (
          <p className="mt-3 text-sm text-muted-foreground italic">
            &ldquo;{existing.comment}&rdquo;
          </p>
        )
      ) : (
        <div className="mt-4 space-y-3">
          <textarea
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            rows={2}
            maxLength={500}
            placeholder="Optional comment..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <Button
            size="sm"
            disabled={selectedRating === 0 || submitting}
            onClick={handleSubmit}
          >
            {submitting ? "Submitting..." : "Submit Rating"}
          </Button>
        </div>
      )}
    </Card>
  );
}
