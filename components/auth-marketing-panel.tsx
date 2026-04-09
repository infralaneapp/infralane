export function AuthMarketingPanel() {
  return (
    <section className="surface p-8 lg:p-10">
      <p className="text-sm font-medium text-accent">OpsFlow</p>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight text-ink">
        Centralize DevOps requests without losing the operational trail.
      </h1>
      <p className="mt-4 max-w-xl text-base leading-7 text-muted">
        Replace Slack threads and inbox handoffs with a shared queue, typed request forms, assignment controls,
        and a full audit log for every operational change.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-line bg-slate-50 p-4">
          <p className="text-sm font-medium text-ink">Shared intake</p>
          <p className="mt-2 text-sm text-muted">All incoming DevOps work lands in one queue.</p>
        </div>
        <div className="rounded-lg border border-line bg-slate-50 p-4">
          <p className="text-sm font-medium text-ink">Structured requests</p>
          <p className="mt-2 text-sm text-muted">Each ticket type captures the fields engineering needs.</p>
        </div>
        <div className="rounded-lg border border-line bg-slate-50 p-4">
          <p className="text-sm font-medium text-ink">Auditability</p>
          <p className="mt-2 text-sm text-muted">Assignments, comments, and status changes remain traceable.</p>
        </div>
      </div>
    </section>
  );
}
