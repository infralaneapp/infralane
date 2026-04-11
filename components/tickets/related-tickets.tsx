"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GitBranch, Link as LinkIcon, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type RelationType = "related" | "blocks" | "duplicate_of";

type RelatedTicket = {
  id: string;
  type: RelationType;
  ticket: {
    id: string;
    reference: string;
    title: string;
  };
};

type SearchResult = {
  id: string;
  reference: string;
  title: string;
};

type RelatedTicketsProps = {
  ticketId: string;
};

const RELATION_LABELS: Record<RelationType, string> = {
  related: "Related",
  blocks: "Blocks",
  duplicate_of: "Duplicate of",
};

const RELATION_COLORS: Record<RelationType, string> = {
  related: "secondary",
  blocks: "destructive",
  duplicate_of: "outline",
} as const;

export function RelatedTickets({ ticketId }: RelatedTicketsProps) {
  const router = useRouter();
  const [relations, setRelations] = useState<RelatedTicket[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SearchResult | null>(null);
  const [relationType, setRelationType] = useState<RelationType>("related");
  const [isPending, startTransition] = useTransition();
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchRelations = useCallback(async () => {
    try {
      const res = await fetch(`/api/tickets/${ticketId}/relations`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setRelations(data.data?.relations ?? data.relations ?? []);
    } catch {
      toast.error("Failed to load related tickets.");
    }
  }, [ticketId]);

  useEffect(() => {
    fetchRelations();
  }, [fetchRelations]);

  function handleSearchChange(query: string) {
    setSearchQuery(query);
    setSelectedTicket(null);

    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/tickets/search?q=${encodeURIComponent(query)}`
        );
        if (!res.ok) throw new Error("Search failed");
        const data = await res.json();
        const results: SearchResult[] = (data.data?.tickets ?? data.tickets ?? []).filter(
          (t: SearchResult) => t.id !== ticketId
        );
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      }
    }, 300);
  }

  function handleAddRelation() {
    if (!selectedTicket) return;

    startTransition(async () => {
      try {
        const res = await fetch(`/api/tickets/${ticketId}/relations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            relatedTicketId: selectedTicket.id,
            type: relationType,
          }),
        });
        if (!res.ok) throw new Error("Failed to add relation");
        toast.success("Relation added.");
        setShowForm(false);
        setSearchQuery("");
        setSelectedTicket(null);
        setSearchResults([]);
        await fetchRelations();
        router.refresh();
      } catch {
        toast.error("Failed to add relation.");
      }
    });
  }

  async function handleRemoveRelation(relationId: string) {
    try {
      const res = await fetch(
        `/api/tickets/${ticketId}/relations/${relationId}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Failed to remove");
      setRelations((prev) => prev.filter((r) => r.id !== relationId));
      toast.success("Relation removed.");
      router.refresh();
    } catch {
      toast.error("Failed to remove relation.");
    }
  }

  const grouped = relations.reduce<Record<RelationType, RelatedTicket[]>>(
    (acc, rel) => {
      if (!acc[rel.type]) acc[rel.type] = [];
      acc[rel.type].push(rel);
      return acc;
    },
    {} as Record<RelationType, RelatedTicket[]>
  );

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="size-4" />
          Related Tickets
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {Object.entries(grouped).map(([type, rels]) => (
          <div key={type} className="space-y-1.5">
            <Badge
              variant={
                RELATION_COLORS[type as RelationType] as
                  | "secondary"
                  | "destructive"
                  | "outline"
              }
            >
              {RELATION_LABELS[type as RelationType]}
            </Badge>
            <ul className="space-y-1">
              {rels.map((rel) => (
                <li
                  key={rel.id}
                  className="flex items-center justify-between gap-2 rounded-md px-2 py-1 text-sm hover:bg-muted"
                >
                  <Link
                    href={`/tickets/${rel.ticket.id}`}
                    className="flex items-center gap-1.5 truncate text-foreground hover:underline"
                  >
                    <LinkIcon className="size-3 shrink-0 text-muted-foreground" />
                    <span className="font-mono text-xs text-muted-foreground">
                      {rel.ticket.reference}
                    </span>
                    <span className="truncate">{rel.ticket.title}</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleRemoveRelation(rel.id)}
                    className="inline-flex size-5 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="size-3" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {relations.length === 0 && !showForm && (
          <p className="text-xs text-muted-foreground">No related tickets.</p>
        )}

        {showForm ? (
          <div className="space-y-2 rounded-lg border border-border p-2">
            <div className="relative">
              <Input
                placeholder="Search tickets by reference or title..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="h-7 text-xs"
              />
              {searchResults.length > 0 && !selectedTicket && (
                <div className="absolute top-full left-0 z-10 mt-1 w-full rounded-lg border border-border bg-card p-1 shadow-md">
                  {searchResults.map((result) => (
                    <button
                      key={result.id}
                      type="button"
                      onClick={() => {
                        setSelectedTicket(result);
                        setSearchQuery(
                          `${result.reference} - ${result.title}`
                        );
                        setSearchResults([]);
                      }}
                      className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted"
                    >
                      <span className="font-mono text-muted-foreground">
                        {result.reference}
                      </span>
                      <span className="truncate">{result.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedTicket && (
              <div className="flex items-center gap-2">
                <select
                  value={relationType}
                  onChange={(e) =>
                    setRelationType(e.target.value as RelationType)
                  }
                  className="h-7 rounded-md border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="related">Related</option>
                  <option value="blocks">Blocks</option>
                  <option value="duplicate_of">Duplicate of</option>
                </select>
              </div>
            )}

            <div className="flex gap-1.5">
              <Button
                size="xs"
                disabled={!selectedTicket || isPending}
                onClick={handleAddRelation}
              >
                {isPending ? "Adding..." : "Add"}
              </Button>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => {
                  setShowForm(false);
                  setSearchQuery("");
                  setSelectedTicket(null);
                  setSearchResults([]);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            size="xs"
            onClick={() => setShowForm(true)}
          >
            <Plus className="size-3" data-icon="inline-start" />
            Add relation
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
