"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    startTransition(async () => {
      setError(null);

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
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
        setError(payload?.error?.message ?? "Unable to create account.");
        return;
      }

      router.replace("/tickets");
      router.refresh();
    });
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div>
        <label className="label" htmlFor="name">
          Full name
        </label>
        <input
          id="name"
          className="input-control"
          autoComplete="name"
          maxLength={80}
          required
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>

      <div>
        <label className="label" htmlFor="register-email">
          Email
        </label>
        <input
          id="register-email"
          className="input-control"
          autoComplete="email"
          required
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>

      <div>
        <label className="label" htmlFor="register-password">
          Password
        </label>
        <input
          id="register-password"
          className="input-control"
          autoComplete="new-password"
          minLength={8}
          required
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>

      <div>
        <label className="label" htmlFor="confirm-password">
          Confirm password
        </label>
        <input
          id="confirm-password"
          className="input-control"
          autoComplete="new-password"
          minLength={8}
          required
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <button className="button-primary w-full" disabled={isPending} type="submit">
        {isPending ? "Creating account..." : "Create account"}
      </button>

      <p className="text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-accent">
          Sign in
        </Link>
      </p>
    </form>
  );
}
