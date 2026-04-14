import { redirect } from "next/navigation";

import { AuthMarketingPanel } from "@/components/auth-marketing-panel";
import { LoginForm } from "@/components/login-form";
import { getSessionUser } from "@/lib/auth";
import { Card } from "@/components/ui/card";

export default async function LoginPage() {
  const sessionUser = await getSessionUser();

  if (sessionUser) {
    redirect("/tickets");
  }

  return (
    <main className="flex min-h-screen items-center px-6 py-10">
      <div className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <AuthMarketingPanel />

        <Card className="p-8 shadow-card lg:p-10">
          <div>
            <h2 className="text-xl font-semibold tracking-heading text-foreground">Sign in</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Sign in to your account or create a new one to get started.
            </p>
          </div>

          <div className="mt-7">
            <LoginForm />
          </div>

          {process.env.NODE_ENV === "development" && (
            <div className="mt-7 rounded-lg border border-border bg-muted/40 p-4">
              <p className="text-sm font-medium text-foreground">Demo accounts (dev only)</p>
              <p className="mt-1 text-xs text-muted-foreground">Password for all: password123</p>
              <div className="mt-2.5 space-y-1.5 font-mono text-[13px] text-muted-foreground">
                <p>alex.hart@infralane.local (Admin)</p>
                <p>jordan.ellis@infralane.local (Operator)</p>
                <p>samir.khan@infralane.local (Requester)</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
