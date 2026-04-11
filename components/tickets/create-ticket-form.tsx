"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Info } from "lucide-react";
import { toast } from "sonner";

import type { TicketFieldDefinition, TicketPriorityValue, TicketTypeView } from "@/modules/tickets/types";
import { TICKET_PRIORITY_VALUES, TICKET_PRIORITY_LABELS } from "@/modules/tickets/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { DuplicateWarning } from "@/components/tickets/duplicate-warning";

type Template = {
  id: string;
  name: string;
  priority: string;
  title: string | null;
  body: string | null;
  fieldValues: unknown;
  ticketType: { key: string };
};

function StructuredFieldInput({
  definition,
  value,
  onChange,
}: {
  definition: TicketFieldDefinition;
  value: string;
  onChange: (value: string) => void;
}) {
  if (definition.type === "textarea") {
    return (
      <Textarea
        className="min-h-[100px] resize-none"
        placeholder={definition.placeholder}
        required={definition.required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  if (definition.type === "select") {
    return (
      <select
        className="flex h-8 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
        required={definition.required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Select an option</option>
        {definition.options?.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  return (
    <Input
      placeholder={definition.placeholder}
      required={definition.required}
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

export function CreateTicketForm({ ticketTypes, templates = [] }: { ticketTypes: TicketTypeView[]; templates?: Template[] }) {
  const router = useRouter();
  const [selectedTypeKey, setSelectedTypeKey] = useState(ticketTypes[0]?.key ?? "access");
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<TicketPriorityValue>("MEDIUM");
  const [description, setDescription] = useState("");
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function applyTemplate(template: Template) {
    setSelectedTypeKey(template.ticketType.key as TicketTypeView["key"]);
    setTitle(template.title ?? "");
    setDescription(template.body ?? "");
    setPriority(template.priority as TicketPriorityValue);
    const tplFields = (template.fieldValues ?? {}) as Record<string, string>;
    setFieldValues((current) => ({ ...current, ...tplFields }));
    setActiveTemplateId(template.id);
  }

  function clearTemplate() {
    setTitle("");
    setDescription("");
    setPriority("MEDIUM");
    setFieldValues({});
    setActiveTemplateId(null);
  }

  const activeType = ticketTypes.find((ticketType) => ticketType.key === selectedTypeKey) ?? ticketTypes[0];

  useEffect(() => {
    if (!activeType) {
      return;
    }

    setFieldValues((currentValues) => {
      const nextValues: Record<string, string> = {};

      for (const field of activeType.fieldSchema) {
        nextValues[field.key] = currentValues[field.key] ?? "";
      }

      return nextValues;
    });
  }, [activeType]);

  function handleFieldChange(key: string, value: string) {
    setFieldValues((currentValues) => ({
      ...currentValues,
      [key]: value,
    }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeType) {
      return;
    }

    const fields = activeType.fieldSchema
      .map((field) => ({
        key: field.key,
        value: fieldValues[field.key] ?? "",
      }))
      .filter((field) => field.value.trim().length > 0);

    startTransition(async () => {
      setError(null);

      const response = await fetch("/api/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
          ticketTypeKey: activeType.key,
          priority,
          fields,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            success: boolean;
            data?: {
              ticket?: {
                id: string;
              };
            };
            error?: {
              message?: string;
            };
          }
        | null;

      if (!response.ok || !payload?.success || !payload.data?.ticket) {
        toast.error(payload?.error?.message ?? "Unable to create ticket.");
        return;
      }

      toast.success("Ticket created.");
      router.push(`/tickets/${payload.data.ticket.id}`);
      router.refresh();
    });
  }

  if (!activeType) {
    return (
      <Card className="p-6 shadow-card">
        <p className="text-sm text-muted-foreground">No ticket types are configured yet. Run the seed script first.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {templates.length > 0 && (
        <Card className="p-4 shadow-card">
          <div className="flex items-center justify-between">
            <Label>Quick start from template</Label>
            {activeTemplateId && (
              <button
                type="button"
                onClick={clearTemplate}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear template
              </button>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {templates.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => applyTemplate(t)}
                className={`rounded-lg border px-3 py-2 text-sm text-left transition-colors ${
                  activeTemplateId === t.id
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                    : "border-border hover:bg-muted"
                }`}
              >
                <span className="font-medium text-foreground">{t.name}</span>
                <span className="block text-xs text-muted-foreground">{t.ticketType.key}</span>
              </button>
            ))}
          </div>
        </Card>
      )}

    <form className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]" onSubmit={handleSubmit}>
      <Card className="p-6 shadow-card">
        <div className="grid gap-5">
          <div>
            <Label htmlFor="ticketType">Ticket type</Label>
            <select
              id="ticketType"
              className="mt-1.5 flex h-8 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
              value={selectedTypeKey}
              onChange={(event) => setSelectedTypeKey(event.target.value as TicketTypeView["key"])}
            >
              {ticketTypes.map((ticketType) => (
                <option key={ticketType.id} value={ticketType.key}>
                  {ticketType.name}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-[13px] text-muted-foreground">{activeType.description}</p>
          </div>

          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              className="mt-1.5"
              maxLength={160}
              placeholder="Describe the operational request"
              required
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
            <DuplicateWarning title={title} />
          </div>

          <div>
            <Label htmlFor="priority">Priority</Label>
            <select
              id="priority"
              className="mt-1.5 flex h-8 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
              value={priority}
              onChange={(event) => setPriority(event.target.value as TicketPriorityValue)}
            >
              {TICKET_PRIORITY_VALUES.map((p) => (
                <option key={p} value={p}>
                  {TICKET_PRIORITY_LABELS[p]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              className="mt-1.5 min-h-[120px] resize-none"
              maxLength={4000}
              placeholder="Provide context, timing, and any constraints for the DevOps team."
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {activeType.fieldSchema.map((field) => (
              <div key={field.key} className={field.type === "textarea" ? "md:col-span-2" : ""}>
                <Label htmlFor={field.key}>
                  {field.label}
                  {field.required ? <span className="ml-1 text-destructive">*</span> : null}
                </Label>
                <div className="mt-1.5">
                  <StructuredFieldInput
                    definition={field}
                    value={fieldValues[field.key] ?? ""}
                    onChange={(value) => handleFieldChange(field.key, value)}
                  />
                </div>
                {field.description ? (
                  <p className="mt-1.5 text-xs text-muted-foreground">{field.description}</p>
                ) : null}
              </div>
            ))}
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div>
            <Button disabled={isPending} type="submit">
              {isPending ? "Creating..." : "Create ticket"}
            </Button>
          </div>
        </div>
      </Card>

      <aside>
        <Card className="p-5 shadow-card">
          <div className="flex items-center gap-2">
            <Info className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">{activeType.name}</h2>
          </div>
          <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{activeType.description}</p>

          <div className="mt-5 space-y-2.5">
            {activeType.fieldSchema.map((field) => (
              <div key={field.key} className="rounded-lg border border-border bg-muted/50 px-3.5 py-2.5">
                <p className="text-sm font-medium text-foreground">{field.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {field.type === "select" ? `Options: ${field.options?.join(", ")}` : field.placeholder ?? "Free text"}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </aside>
    </form>
    </div>
  );
}
