"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LayoutList, Plus, Search, Columns3, Settings, CheckCircle2, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const steps = [
  {
    icon: LayoutList,
    title: "Your ticket queue",
    description: "All incoming DevOps requests land in one shared queue. Filter by status, type, priority, or assignee.",
  },
  {
    icon: Plus,
    title: "Create structured tickets",
    description: "Each ticket type has custom fields. Requesters fill in exactly what engineering needs — no more back-and-forth.",
  },
  {
    icon: Search,
    title: "Quick navigation",
    description: "Press Cmd+K (or Ctrl+K) to search tickets, navigate pages, or switch themes. Keyboard shortcuts: N for new ticket, G for queue.",
  },
  {
    icon: Columns3,
    title: "Kanban board",
    description: "Drag tickets between status columns. Moving a ticket to 'In Progress' auto-assigns it to you.",
  },
  {
    icon: Settings,
    title: "Customize everything",
    description: "Manage ticket types, automation rules, templates, and team members from Settings.",
  },
];

type OnboardingProps = {
  onComplete?: () => void;
  user?: { onboarded: boolean };
};

export function Onboarding({ onComplete, user }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const router = useRouter();

  if (user?.onboarded || dismissed) return null;

  async function finish() {
    await fetch("/api/auth/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ onboarded: true }),
    });
    setDismissed(true);
    onComplete?.();
    router.refresh();
  }

  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Card className="mx-4 w-full max-w-lg p-8 shadow-lg">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <div className="mt-8 flex flex-col items-center text-center">
          <div className="flex size-14 items-center justify-center rounded-xl bg-primary/10">
            <current.icon className="size-7 text-primary" />
          </div>
          <h2 className="mt-5 text-xl font-semibold tracking-heading text-foreground">
            {current.title}
          </h2>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
            {current.description}
          </p>
        </div>

        <div className="mt-8 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={finish}
            className="text-muted-foreground"
          >
            Skip
          </Button>

          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="outline" size="sm" onClick={() => setStep(step - 1)}>
                Back
              </Button>
            )}
            {isLast ? (
              <Button size="sm" onClick={finish}>
                <CheckCircle2 className="size-4 mr-1" />
                Get started
              </Button>
            ) : (
              <Button size="sm" onClick={() => setStep(step + 1)}>
                Next
                <ArrowRight className="size-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
