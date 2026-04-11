import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  total: number;
  basePath: string;
  searchParams?: Record<string, string | undefined>;
};

export function Pagination({ currentPage, totalPages, total, basePath, searchParams = {} }: PaginationProps) {
  if (totalPages <= 1) return null;

  function buildHref(page: number) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (value) params.set(key, value);
    }
    params.set("page", String(page));
    return `${basePath}?${params.toString()}`;
  }

  return (
    <div className="flex items-center justify-between pt-2">
      <p className="text-sm text-muted-foreground">
        {total} ticket{total !== 1 ? "s" : ""} total
      </p>
      <div className="flex items-center gap-1">
        {currentPage > 1 ? (
          <Link href={buildHref(currentPage - 1)} className={cn(buttonVariants({ variant: "outline", size: "icon-sm" }))}>
            <ChevronLeft className="size-4" />
          </Link>
        ) : (
          <Button variant="outline" size="icon-sm" disabled>
            <ChevronLeft className="size-4" />
          </Button>
        )}

        <span className="px-3 text-sm text-muted-foreground">
          {currentPage} / {totalPages}
        </span>

        {currentPage < totalPages ? (
          <Link href={buildHref(currentPage + 1)} className={cn(buttonVariants({ variant: "outline", size: "icon-sm" }))}>
            <ChevronRight className="size-4" />
          </Link>
        ) : (
          <Button variant="outline" size="icon-sm" disabled>
            <ChevronRight className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
