import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="surface w-full max-w-md p-8">
        <p className="text-sm font-medium text-accent">404</p>
        <h1 className="mt-2 text-2xl font-semibold text-ink">Ticket not found</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          The requested resource does not exist, or the current session cannot access it.
        </p>
        <div className="mt-6">
          <Link href="/tickets" className="button-primary">
            Back to queue
          </Link>
        </div>
      </div>
    </main>
  );
}
