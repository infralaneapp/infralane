"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LayoutList, Plus, Menu, Search, Settings, BarChart3, Columns3, ShieldCheck, BookOpen, FileBarChart, ClipboardList, User, LogOut } from "lucide-react";

import type { SessionUser } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { LogoutButton } from "@/components/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { CommandPalette } from "@/components/command-palette";
import { cn } from "@/lib/utils";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { NotificationBell } from "@/components/notification-bell";

type AppShellProps = {
  user: SessionUser;
  children: React.ReactNode;
};

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutList;
  staffOnly?: boolean;
  adminOnly?: boolean;
  shortcut?: string;
};

const allNavItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3, staffOnly: true, shortcut: "D" },
  { href: "/tickets", label: "Tickets", icon: LayoutList },
  { href: "/tickets/board", label: "Board", icon: Columns3, staffOnly: true, shortcut: "B" },
  { href: "/approvals", label: "Approvals", icon: ShieldCheck, staffOnly: true },
  { href: "/reports", label: "Reports", icon: FileBarChart, staffOnly: true },
  { href: "/audit", label: "Audit Log", icon: ClipboardList, staffOnly: true },
  { href: "/tickets/new", label: "New ticket", icon: Plus, shortcut: "N" },
  { href: "/knowledge-base", label: "Knowledge Base", icon: BookOpen },
  { href: "/settings", label: "Settings", icon: Settings, adminOnly: true },
];

function getNavItems(role: string): NavItem[] {
  const isStaff = role === "OPERATOR" || role === "ADMIN";
  const isAdmin = role === "ADMIN";
  const items = allNavItems.filter((item) => {
    if (item.adminOnly) return isAdmin;
    if (item.staffOnly) return isStaff;
    return true;
  });
  if (isStaff) {
    return items.map((item) =>
      item.href === "/tickets" ? { ...item, label: "Shared queue" } : item
    );
  }
  return items;
}

function NavLinks({ pathname, role, onNavigate }: { pathname: string; role: string; onNavigate?: () => void }) {
  const navItems = getNavItems(role);

  return (
    <nav className="flex-1 space-y-1">
      {navItems.map((item) => {
        const exactRoutes = ["/dashboard", "/tickets/new", "/tickets/board", "/knowledge-base", "/reports", "/audit"];
        const isActive = exactRoutes.includes(item.href)
          ? pathname === item.href || pathname.startsWith(item.href + "/")
          : item.href === "/tickets"
            ? pathname === "/tickets" || (pathname.startsWith("/tickets/") && !pathname.startsWith("/tickets/new") && !pathname.startsWith("/tickets/board"))
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <item.icon className="size-4" />
            {item.label}
            {item.shortcut && (
              <kbd className="ml-auto hidden text-[10px] font-medium text-muted-foreground/50 lg:inline-block">
                {item.shortcut}
              </kbd>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function UserSection({ user }: { user: SessionUser }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-muted"
      >
        <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
          <p className="text-[11px] font-medium uppercase tracking-badge text-muted-foreground">
            {user.role}
          </p>
        </div>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-0 right-0 z-40 mb-2 rounded-lg border border-border bg-card p-1 shadow-dropdown">
            <Link
              href="/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
            >
              <User className="size-4 text-muted-foreground" />
              Profile
            </Link>
            <div className="flex items-center justify-between rounded-md px-3 py-2 text-sm text-foreground">
              <span className="flex items-center gap-2">
                <span className="size-4" />
                Theme
              </span>
              <ThemeToggle />
            </div>
            <Separator className="my-1" />
            <div className="px-1 py-0.5">
              <LogoutButton />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function AppShell({ user, children }: AppShellProps) {
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);
  useKeyboardShortcuts();

  return (
    <div className="min-h-screen bg-background">
      <CommandPalette />
      <div className="flex min-h-screen w-full">
        {/* Desktop sidebar */}
        <aside className="hidden w-[260px] shrink-0 sticky top-0 h-screen overflow-y-auto border-r border-border bg-card px-4 py-5 lg:flex lg:flex-col">
          <div className="px-3 pb-5">
            <Link href="/tickets" className="group flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <LayoutList className="size-4" />
              </div>
              <div>
                <p className="text-[15px] font-semibold tracking-tight text-foreground">Infralane</p>
                <p className="text-xs text-muted-foreground">Ops control center</p>
              </div>
            </Link>
          </div>

          <Separator className="mb-4" />

          <NavLinks pathname={pathname} role={user.role} />

          <div className="mt-auto pt-4">
            <Separator className="mb-4" />
            <UserSection user={user} />
          </div>
        </aside>

        {/* Main content */}
        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-10 border-b border-border bg-card/80 px-6 py-3.5 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              {/* Mobile: hamburger + brand */}
              <div className="flex items-center gap-3 lg:hidden">
                <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                  <SheetTrigger className="inline-flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
                    <Menu className="size-4" />
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[280px] p-4">
                    <div className="flex items-center gap-2.5 px-3 py-2">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                        <LayoutList className="size-4" />
                      </div>
                      <p className="text-[15px] font-semibold tracking-tight text-foreground">Infralane</p>
                    </div>
                    <Separator className="my-4" />
                    <NavLinks pathname={pathname} role={user.role} onNavigate={() => setSheetOpen(false)} />
                    <Separator className="my-4" />
                    <UserSection user={user} />
                  </SheetContent>
                </Sheet>
                <Link href="/tickets" className="flex items-center gap-2">
                  <span className="text-[15px] font-semibold tracking-tight text-foreground">Infralane</span>
                </Link>
              </div>

              {/* Desktop: subtitle + kbd hint */}
              <p className="hidden text-sm text-muted-foreground lg:block">
                Ops control center
              </p>

              <div className="flex items-center gap-2">
                <NotificationBell />
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden gap-2 text-muted-foreground sm:flex"
                  onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
                >
                  <Search className="size-3.5" />
                  <span className="text-xs">Search...</span>
                  <kbd className="pointer-events-none ml-1 hidden rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-block">
                    ⌘K
                  </kbd>
                </Button>
                <div className="lg:hidden flex items-center gap-1">
                  <ThemeToggle />
                  <LogoutButton />
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 px-6 py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
