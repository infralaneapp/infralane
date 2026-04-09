import { redirect } from "next/navigation";

import { AuthMarketingPanel } from "@/components/auth-marketing-panel";
import { LoginForm } from "@/components/login-form";
import { getSessionUser } from "@/lib/auth";

export default async function LoginPage() {
  const sessionUser = await getSessionUser();

  if (sessionUser) {
    redirect("/tickets");
  }

  return (
    <main className="flex min-h-screen items-center px-6 py-10">
      <div className="mx-auto grid w-full max-w-5xl gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <AuthMarketingPanel />

        <section className="surface p-8 lg:p-10">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-ink">Sign in</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Use an existing account or create a new one. The seeded demo accounts still use{" "}
              <span className="font-medium text-ink">password123</span>.
            </p>
          </div>

          <div className="mt-8">
            <LoginForm />
          </div>

          <div className="mt-8 rounded-lg border border-line bg-slate-50 p-4">
            <p className="text-sm font-medium text-ink">Sample accounts</p>
            <div className="mt-3 space-y-2 text-sm text-muted">
              <p>alex.hart@opsflow.local</p>
              <p>nina.cho@opsflow.local</p>
              <p>samir.khan@opsflow.local</p>
              <p>leila.morgan@opsflow.local</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
