import { redirect } from "next/navigation";

import { AuthMarketingPanel } from "@/components/auth-marketing-panel";
import { RegisterForm } from "@/components/register-form";
import { getSessionUser } from "@/lib/auth";

export default async function RegisterPage() {
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
            <h2 className="text-2xl font-semibold tracking-tight text-ink">Create account</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Register a local requester account for the internal service desk. New accounts are signed in immediately.
            </p>
          </div>

          <div className="mt-8">
            <RegisterForm />
          </div>
        </section>
      </div>
    </main>
  );
}
