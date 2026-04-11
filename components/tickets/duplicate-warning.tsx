"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

type SimilarTicket = {
  id: string;
  reference: string;
  title: string;
  status: string;
};

export function DuplicateWarning({ title }: { title: string }) {
  const [similar, setSimilar] = useState<SimilarTicket[]>([]);

  useEffect(() => {
    if (title.trim().length < 5) {
      setSimilar([]);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/tickets/search?q=${encodeURIComponent(title.trim())}`);
        if (!res.ok) return;
        const data = await res.json();
        setSimilar(
          (data.data?.tickets ?? [])
            .filter((t: any) => t.status !== "CLOSED" && t.status !== "RESOLVED")
            .slice(0, 3)
        );
      } catch {
        // ignore
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [title]);

  if (similar.length === 0) return null;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
      <div className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-300">
        <AlertTriangle className="size-4" />
        Similar open tickets found
      </div>
      <ul className="mt-2 space-y-1">
        {similar.map((t) => (
          <li key={t.id}>
            <Link
              href={`/tickets/${t.id}`}
              className="text-sm text-amber-700 underline hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-200"
              target="_blank"
            >
              {t.reference} — {t.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
