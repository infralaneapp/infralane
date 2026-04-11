"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { LayoutList, Plus, BarChart3, Sun, Moon, Monitor, Ticket } from "lucide-react";
import { useTheme } from "next-themes";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

type TicketResult = {
  id: string;
  reference: string;
  title: string;
  status: string;
  priority: string;
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [ticketResults, setTicketResults] = useState<TicketResult[]>([]);
  const [searching, setSearching] = useState(false);
  const router = useRouter();
  const { setTheme } = useTheme();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const searchTickets = useCallback(async (q: string) => {
    if (q.length < 2) {
      setTicketResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/tickets/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const json = await res.json();
        setTicketResults(json.data?.tickets ?? []);
      }
    } catch {
      // silently ignore
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchTickets(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, searchTickets]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setTicketResults([]);
    }
  }, [open]);

  function navigate(path: string) {
    setOpen(false);
    router.push(path);
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Search tickets, navigate, or change settings..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {searching ? "Searching..." : "No results found."}
        </CommandEmpty>

        {ticketResults.length > 0 && (
          <>
            <CommandGroup heading="Tickets">
              {ticketResults.map((ticket) => (
                <CommandItem
                  key={ticket.id}
                  value={`${ticket.reference} ${ticket.title}`}
                  onSelect={() => navigate(`/tickets/${ticket.id}`)}
                >
                  <Ticket className="mr-2 size-4 shrink-0" />
                  <span className="mr-2 shrink-0 font-mono text-xs text-muted-foreground">
                    {ticket.reference}
                  </span>
                  <span className="truncate">{ticket.title}</span>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                    {ticket.status.replace(/_/g, " ").toLowerCase()}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => navigate("/dashboard")}>
            <BarChart3 className="mr-2 size-4" />
            Dashboard
          </CommandItem>
          <CommandItem onSelect={() => navigate("/tickets")}>
            <LayoutList className="mr-2 size-4" />
            Ticket queue
          </CommandItem>
          <CommandItem onSelect={() => navigate("/tickets/new")}>
            <Plus className="mr-2 size-4" />
            New ticket
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Theme">
          <CommandItem onSelect={() => { setTheme("light"); setOpen(false); }}>
            <Sun className="mr-2 size-4" />
            Light mode
          </CommandItem>
          <CommandItem onSelect={() => { setTheme("dark"); setOpen(false); }}>
            <Moon className="mr-2 size-4" />
            Dark mode
          </CommandItem>
          <CommandItem onSelect={() => { setTheme("system"); setOpen(false); }}>
            <Monitor className="mr-2 size-4" />
            System theme
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
