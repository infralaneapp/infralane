import { getSessionUser } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/http";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/auth/permissions";

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        fields.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

const VALID_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
const VALID_STATUSES = ["OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED"] as const;

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user || !hasPermission(user.role, "settings:manage")) {
      return apiError("Forbidden.", { status: 403, code: "FORBIDDEN" });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return apiError("Missing CSV file.", { status: 400, code: "MISSING_FILE" });
    }

    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);

    if (lines.length < 2) {
      return apiError("CSV must have a header row and at least one data row.", {
        status: 400,
        code: "EMPTY_CSV",
      });
    }

    const header = parseCSVLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, ""));
    const titleIdx = header.indexOf("title");
    const descIdx = header.indexOf("description");
    const typeIdx = header.indexOf("tickettypekey");
    const priorityIdx = header.indexOf("priority");
    const statusIdx = header.indexOf("status");

    if (titleIdx === -1 || descIdx === -1 || typeIdx === -1 || priorityIdx === -1) {
      return apiError(
        "CSV must contain columns: title, description, ticketTypeKey, priority.",
        { status: 400, code: "INVALID_HEADERS" },
      );
    }

    const ticketTypes = await prisma.ticketType.findMany({
      where: { archived: false },
      select: { id: true, key: true },
    });
    const typeKeyMap = new Map(ticketTypes.map((t) => [t.key, t.id]));

    const errors: string[] = [];
    let imported = 0;

    for (let i = 1; i < lines.length; i++) {
      const fields = parseCSVLine(lines[i]);
      const rowNum = i + 1;

      const title = fields[titleIdx] ?? "";
      const description = fields[descIdx] ?? "";
      const ticketTypeKey = fields[typeIdx] ?? "";
      const priority = (fields[priorityIdx] ?? "MEDIUM").toUpperCase();
      const status = statusIdx !== -1 ? (fields[statusIdx] ?? "OPEN").toUpperCase() : "OPEN";

      if (!title) {
        errors.push(`Row ${rowNum}: title is required.`);
        continue;
      }

      const ticketTypeId = typeKeyMap.get(ticketTypeKey);
      if (!ticketTypeId) {
        errors.push(`Row ${rowNum}: unknown ticketTypeKey "${ticketTypeKey}".`);
        continue;
      }

      if (!VALID_PRIORITIES.includes(priority as any)) {
        errors.push(`Row ${rowNum}: invalid priority "${priority}".`);
        continue;
      }

      if (!VALID_STATUSES.includes(status as any)) {
        errors.push(`Row ${rowNum}: invalid status "${status}".`);
        continue;
      }

      try {
        await prisma.ticket.create({
          data: {
            title,
            description: description || null,
            ticketTypeId,
            priority: priority as any,
            status: status as any,
            requesterId: user.id,
          },
        });
        imported++;
      } catch (err) {
        errors.push(`Row ${rowNum}: failed to create ticket.`);
      }
    }

    return apiSuccess({ imported, errors });
  } catch (error) {
    return handleApiError(error);
  }
}
