"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      setError(null);

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            success: boolean;
            error?: {
              message?: string;
            };
          }
        | null;

      if (!response.ok || !payload?.success) {
        setError(payload?.error?.message ?? "Unable to sign in.");
        return;
      }

      router.replace("/tickets");
      router.refresh();
    });
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div>
        <label className="label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          className="input-control"
          autoComplete="email"
          required
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>

      <div>
        <label className="label" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          className="input-control"
          autoComplete="current-password"
          required
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <button className="button-primary w-full" disabled={isPending} type="submit">
        {isPending ? "Signing in..." : "Sign in"}
      </button>

      <p className="text-sm text-muted">
        Need an account?{" "}
        <Link href="/register" className="font-medium text-accent">
          Register
        </Link>
      </p>
    </form>
  );
}
