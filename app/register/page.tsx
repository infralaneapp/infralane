import { redirect } from "next/navigation";

import { AuthMarketingPanel } from "@/components/auth-marketing-panel";
import { RegisterForm } from "@/components/register-form";
import { getSessionUser } from "@/lib/auth";
import { Card } from "@/components/ui/card";

export default async function RegisterPage() {
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
            <h2 className="text-xl font-semibold tracking-heading text-foreground">Create account</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Register a local requester account for the internal service desk. New accounts are signed in immediately.
            </p>
          </div>

          <div className="mt-7">
            <RegisterForm />
          </div>
        </Card>
      </div>
    </main>
  );
}
