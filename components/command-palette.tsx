"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  LayoutList, Plus, BarChart3, Sun, Moon, Monitor,
  ShieldCheck, FileBarChart, ClipboardList, BookOpen, Settings,
  Columns3, Search,
} from "lucide-react";
import { useTheme } from "next-themes";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";

type TicketResult = {
  id: string;
  reference: string;
  title: string;
  status: string;
  priority: string;
};

const STATUS_COLORS: Record<string, string> = {
  OPEN: "text-blue-500",
  IN_PROGRESS: "text-amber-500",
  WAITING_FOR_REQUESTER: "text-violet-500",
  RESOLVED: "text-emerald-500",
  CLOSED: "text-muted-foreground",
};

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: "bg-red-500",
  HIGH: "bg-orange-500",
  MEDIUM: "bg-blue-500",
  LOW: "bg-gray-400",
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
        placeholder="Search tickets, navigate, or change theme..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {searching ? (
            <div className="flex items-center justify-center gap-2">
              <Search className="size-4 animate-pulse text-muted-foreground" />
              <span>Searching...</span>
            </div>
          ) : query.length > 0 ? (
            "No results found."
          ) : (
            <span className="text-muted-foreground">Type to search tickets or use commands below.</span>
          )}
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
                  <div className={`size-2 rounded-full ${PRIORITY_COLORS[ticket.priority] ?? "bg-gray-400"}`} />
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">
                    {ticket.reference}
                  </span>
                  <span className="truncate">{ticket.title}</span>
                  <span className={`ml-auto shrink-0 text-xs ${STATUS_COLORS[ticket.status] ?? "text-muted-foreground"}`}>
                    {ticket.status.replace(/_/g, " ").toLowerCase()}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        <CommandGroup heading="Quick Actions">
          <CommandItem onSelect={() => navigate("/tickets/new")}>
            <Plus className="size-4 text-muted-foreground" />
            New ticket
            <CommandShortcut>N</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => navigate("/dashboard")}>
            <BarChart3 className="size-4 text-muted-foreground" />
            Dashboard
            <CommandShortcut>D</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => navigate("/tickets")}>
            <LayoutList className="size-4 text-muted-foreground" />
            Ticket queue
          </CommandItem>
          <CommandItem onSelect={() => navigate("/tickets/board")}>
            <Columns3 className="size-4 text-muted-foreground" />
            Board view
            <CommandShortcut>B</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Navigate">
          <CommandItem onSelect={() => navigate("/approvals")}>
            <ShieldCheck className="size-4 text-muted-foreground" />
            Approvals
          </CommandItem>
          <CommandItem onSelect={() => navigate("/reports")}>
            <FileBarChart className="size-4 text-muted-foreground" />
            Reports
          </CommandItem>
          <CommandItem onSelect={() => navigate("/audit")}>
            <ClipboardList className="size-4 text-muted-foreground" />
            Audit log
          </CommandItem>
          <CommandItem onSelect={() => navigate("/knowledge-base")}>
            <BookOpen className="size-4 text-muted-foreground" />
            Knowledge base
          </CommandItem>
          <CommandItem onSelect={() => navigate("/settings")}>
            <Settings className="size-4 text-muted-foreground" />
            Settings
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Theme">
          <CommandItem onSelect={() => { setTheme("light"); setOpen(false); }}>
            <Sun className="size-4 text-muted-foreground" />
            Light mode
          </CommandItem>
          <CommandItem onSelect={() => { setTheme("dark"); setOpen(false); }}>
            <Moon className="size-4 text-muted-foreground" />
            Dark mode
          </CommandItem>
          <CommandItem onSelect={() => { setTheme("system"); setOpen(false); }}>
            <Monitor className="size-4 text-muted-foreground" />
            System theme
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
