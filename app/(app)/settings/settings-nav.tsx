"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Layers,
  FileText,
  Zap,
  MessageSquareText,
  Plug,
  GitBranch,
  Clock,
  BookOpen,
  Users,
  ClipboardList,
  Timer,
} from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "Ticket Types", href: "/settings/ticket-types", icon: Layers },
  { label: "Templates", href: "/settings/templates", icon: FileText },
  { label: "Automations", href: "/settings/automations", icon: Zap },
  { label: "Quick Replies", href: "/settings/canned-responses", icon: MessageSquareText },
  { label: "SLA", href: "/settings/sla", icon: Timer },
  { label: "Escalations", href: "/settings/escalations", icon: GitBranch },
  { label: "Integrations", href: "/settings/integrations", icon: Plug },
  { label: "Business Hours", href: "/settings/business-hours", icon: Clock },
  { label: "Knowledge Base", href: "/settings/knowledge-base", icon: BookOpen },
  { label: "Team", href: "/settings/team", icon: Users },
  { label: "Audit", href: "/settings/audit", icon: ClipboardList },
] as const;

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-0.5">
      {tabs.map((tab) => {
        const isActive = pathname.startsWith(tab.href);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="size-4 shrink-0" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function SettingsNavMobile() {
  const pathname = usePathname();
  const router = useRouter();

  const current = tabs.find((t) => pathname.startsWith(t.href));

  return (
    <select
      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      value={current?.href ?? tabs[0].href}
      onChange={(e) => router.push(e.target.value)}
    >
      {tabs.map((tab) => (
        <option key={tab.href} value={tab.href}>
          {tab.label}
        </option>
      ))}
    </select>
  );
}
