import Link from "next/link";

import type { SessionUser } from "@/lib/auth/session";
import { LogoutButton } from "@/components/logout-button";

type AppShellProps = {
  user: SessionUser;
  children: React.ReactNode;
};

export function AppShell({ user, children }: AppShellProps) {
  return (
    <div className="min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-[1440px]">
        <aside className="hidden w-64 shrink-0 border-r border-line bg-panel px-6 py-6 lg:block">
          <Link href="/tickets" className="block">
            <div className="rounded-lg border border-line bg-slate-50 px-4 py-4">
              <p className="text-lg font-semibold tracking-tight text-ink">OpsFlow</p>
              <p className="mt-1 text-sm text-muted">DevOps request intake and shared execution queue.</p>
            </div>
          </Link>

          <nav className="mt-8 space-y-2">
            <Link
              href="/tickets"
              className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Shared queue
            </Link>
            <Link
              href="/tickets/new"
              className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              New ticket
            </Link>
          </nav>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="border-b border-line bg-white/90 px-6 py-4 backdrop-blur">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <Link href="/tickets" className="text-lg font-semibold tracking-tight text-ink lg:hidden">
                  OpsFlow
                </Link>
                <p className="text-sm text-muted">Centralized operational work for engineering teams.</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="rounded-lg border border-line bg-slate-50 px-3 py-2 text-right">
                  <p className="text-sm font-medium text-ink">{user.name}</p>
                  <p className="text-xs uppercase tracking-[0.08em] text-muted">{user.role}</p>
                </div>
                <LogoutButton />
              </div>
            </div>
          </header>

          <main className="flex-1 px-6 py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
