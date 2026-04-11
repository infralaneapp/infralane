import { prisma } from "@/lib/db";
import type { AdapterResult } from "./types";

/**
 * Execute a webhook action by loading the WebhookEndpoint by ID,
 * rendering the payload template, and firing the request.
 */
export async function executeWebhook(
  endpointId: string,
  ticketContext: {
    ticketId: string;
    ticketRef: string;
    fields: Record<string, string>;
  }
): Promise<AdapterResult> {
  const endpoint = await prisma.webhookEndpoint.findUnique({
    where: { id: endpointId },
  });

  if (!endpoint) {
    return { success: false, detail: `Webhook endpoint ${endpointId} not found` };
  }

  if (!endpoint.enabled) {
    return { success: false, detail: `Webhook endpoint "${endpoint.name}" is disabled` };
  }

  // Validate URL against allowed domains
  if (endpoint.allowedDomains.length > 0) {
    try {
      const url = new URL(endpoint.url);
      const domainAllowed = endpoint.allowedDomains.some(
        (d) => url.hostname === d || url.hostname.endsWith(`.${d}`)
      );
      if (!domainAllowed) {
        return { success: false, detail: `URL domain not in allowlist: ${url.hostname}` };
      }
    } catch {
      return { success: false, detail: `Invalid endpoint URL: ${endpoint.url}` };
    }
  }

  // Render payload template
  let body: string;
  if (endpoint.payloadTemplate) {
    body = renderTemplate(endpoint.payloadTemplate, ticketContext);
  } else {
    body = JSON.stringify({
      ticketId: ticketContext.ticketId,
      ticketRef: ticketContext.ticketRef,
      fields: ticketContext.fields,
      timestamp: new Date().toISOString(),
    });
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(endpoint.headers as Record<string, string>),
  };

  try {
    const res = await fetch(endpoint.url, {
      method: endpoint.method,
      headers,
      body,
      signal: AbortSignal.timeout(10000),
    });

    const responseBody = await res.text().catch(() => "");

    if (!res.ok) {
      return {
        success: false,
        detail: `Webhook returned ${res.status}: ${responseBody.slice(0, 500)}`,
      };
    }

    return {
      success: true,
      detail: `${endpoint.method} ${endpoint.url} → ${res.status}`,
      externalRef: responseBody.slice(0, 200),
    };
  } catch (error) {
    return {
      success: false,
      detail: error instanceof Error ? error.message : "Webhook request failed",
    };
  }
}

function renderTemplate(
  template: string,
  context: { ticketId: string; ticketRef: string; fields: Record<string, string> }
): string {
  return template
    .replace(/\{\{ticket\.id\}\}/g, context.ticketId)
    .replace(/\{\{ticket\.reference\}\}/g, context.ticketRef)
    .replace(/\{\{ticket\.fields\.(\w+)\}\}/g, (_, key) => context.fields[key] ?? "");
}
