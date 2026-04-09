"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import type { TicketFieldDefinition, TicketTypeView } from "@/modules/tickets/types";

type CreateTicketFormProps = {
  ticketTypes: TicketTypeView[];
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
      <textarea
        className="input-control min-h-[120px]"
        placeholder={definition.placeholder}
        required={definition.required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  if (definition.type === "select") {
    return (
      <select className="input-control" required={definition.required} value={value} onChange={(event) => onChange(event.target.value)}>
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
    <input
      className="input-control"
      placeholder={definition.placeholder}
      required={definition.required}
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

export function CreateTicketForm({ ticketTypes }: CreateTicketFormProps) {
  const router = useRouter();
  const [selectedTypeKey, setSelectedTypeKey] = useState(ticketTypes[0]?.key ?? "access");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
        setError(payload?.error?.message ?? "Unable to create ticket.");
        return;
      }

      router.push(`/tickets/${payload.data.ticket.id}`);
      router.refresh();
    });
  }

  if (!activeType) {
    return (
      <div className="surface p-6">
        <p className="text-sm text-muted">No ticket types are configured yet. Run the seed script first.</p>
      </div>
    );
  }

  return (
    <form className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]" onSubmit={handleSubmit}>
      <div className="surface p-6">
        <div className="grid gap-5">
          <div>
            <label className="label" htmlFor="ticketType">
              Ticket type
            </label>
            <select
              id="ticketType"
              className="input-control"
              value={selectedTypeKey}
              onChange={(event) => setSelectedTypeKey(event.target.value as TicketTypeView["key"])}
            >
              {ticketTypes.map((ticketType) => (
                <option key={ticketType.id} value={ticketType.key}>
                  {ticketType.name}
                </option>
              ))}
            </select>
            <p className="mt-2 text-sm text-muted">{activeType.description}</p>
          </div>

          <div>
            <label className="label" htmlFor="title">
              Title
            </label>
            <input
              id="title"
              className="input-control"
              maxLength={160}
              placeholder="Describe the operational request"
              required
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>

          <div>
            <label className="label" htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              className="input-control min-h-[140px]"
              maxLength={4000}
              placeholder="Provide context, timing, and any constraints for the DevOps team."
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {activeType.fieldSchema.map((field) => (
              <div key={field.key} className={field.type === "textarea" ? "md:col-span-2" : ""}>
                <label className="label" htmlFor={field.key}>
                  {field.label}
                  {field.required ? <span className="ml-1 text-danger">*</span> : null}
                </label>
                <StructuredFieldInput
                  definition={field}
                  value={fieldValues[field.key] ?? ""}
                  onChange={(value) => handleFieldChange(field.key, value)}
                />
                {field.description ? <p className="mt-2 text-xs text-muted">{field.description}</p> : null}
              </div>
            ))}
          </div>

          {error ? <p className="text-sm text-danger">{error}</p> : null}

          <div className="flex gap-3">
            <button className="button-primary" disabled={isPending} type="submit">
              {isPending ? "Creating..." : "Create ticket"}
            </button>
          </div>
        </div>
      </div>

      <aside className="surface p-6">
        <h2 className="text-lg font-semibold text-ink">{activeType.name}</h2>
        <p className="mt-2 text-sm leading-6 text-muted">{activeType.description}</p>

        <div className="mt-6 space-y-4">
          {activeType.fieldSchema.map((field) => (
            <div key={field.key} className="rounded-lg border border-line bg-slate-50 px-4 py-3">
              <div className="text-sm font-medium text-ink">{field.label}</div>
              <div className="mt-1 text-xs text-muted">
                {field.type === "select" ? `Allowed values: ${field.options?.join(", ")}` : field.placeholder ?? "Free text"}
              </div>
            </div>
          ))}
        </div>
      </aside>
    </form>
  );
}
