import { AppError } from "@/lib/errors";
import type { TicketFieldDefinition, TicketFieldInput, TicketFieldValueView } from "@/modules/tickets/types";

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

export function parseTicketFieldSchema(rawSchema: unknown): TicketFieldDefinition[] {
  if (!Array.isArray(rawSchema)) {
    return [];
  }

  return rawSchema.flatMap((entry) => {
    if (!entry || typeof entry !== "object") {
      return [];
    }

    const key = "key" in entry && typeof entry.key === "string" ? entry.key : null;
    const label = "label" in entry && typeof entry.label === "string" ? entry.label : null;

    if (!key || !label) {
      return [];
    }

    const type =
      "type" in entry &&
      (entry.type === "text" || entry.type === "textarea" || entry.type === "select")
        ? entry.type
        : "text";

    return [
      {
        key,
        label,
        required: "required" in entry && typeof entry.required === "boolean" ? entry.required : false,
        type,
        options: "options" in entry && isStringArray(entry.options) ? entry.options : undefined,
        placeholder:
          "placeholder" in entry && typeof entry.placeholder === "string" ? entry.placeholder : undefined,
        description:
          "description" in entry && typeof entry.description === "string" ? entry.description : undefined,
      },
    ];
  });
}

export function normalizeTicketFields(fields: TicketFieldInput[]) {
  const dedupedFields = new Map<string, string>();

  for (const field of fields) {
    const key = field.key.trim();
    const value = field.value.trim();

    if (!key) {
      continue;
    }

    if (value) {
      dedupedFields.set(key, value);
    } else {
      dedupedFields.delete(key);
    }
  }

  return Array.from(dedupedFields.entries()).map(([key, value]) => ({
    key,
    value,
  }));
}

export function validateTicketFields(fieldSchema: TicketFieldDefinition[], fields: TicketFieldInput[]) {
  const allowedKeys = new Set(fieldSchema.map((field) => field.key));

  const unknownFields = fields.filter((field) => !allowedKeys.has(field.key)).map((field) => field.key);

  if (unknownFields.length > 0) {
    throw new AppError("Structured fields do not match the selected ticket type.", {
      status: 422,
      code: "INVALID_STRUCTURED_FIELDS",
      details: {
        unknownFields,
      },
    });
  }

  const fieldsByKey = new Map(fields.map((field) => [field.key, field.value]));
  const missingFields = fieldSchema
    .filter((field) => field.required && !fieldsByKey.get(field.key)?.trim())
    .map((field) => field.label);

  if (missingFields.length > 0) {
    throw new AppError("Required structured fields are missing.", {
      status: 422,
      code: "MISSING_STRUCTURED_FIELDS",
      details: {
        missingFields,
      },
    });
  }
}

export function mapStructuredFields(
  fieldSchema: TicketFieldDefinition[],
  fields: TicketFieldInput[],
): TicketFieldValueView[] {
  const labels = new Map(fieldSchema.map((field) => [field.key, field.label]));

  return fields.map((field) => ({
    key: field.key,
    label: labels.get(field.key) ?? field.key,
    value: field.value,
  }));
}
