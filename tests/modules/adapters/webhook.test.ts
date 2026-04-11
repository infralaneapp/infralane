import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Mock prisma — use vi.hoisted so the variable is available in the hoisted vi.mock factory
const mockPrisma = vi.hoisted(() => ({
  webhookEndpoint: {
    findUnique: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({
  prisma: mockPrisma,
}));

import { executeWebhook } from "@/modules/automation/adapters/webhook";

const baseTicketContext = {
  ticketId: "t1",
  ticketRef: "INF-0001",
  fields: { environment: "production", severity: "high" },
};

function makeEndpoint(overrides: Record<string, unknown> = {}) {
  return {
    id: "ep1",
    name: "Test Webhook",
    url: "https://api.example.com/hook",
    method: "POST",
    enabled: true,
    headers: {},
    allowedDomains: [],
    payloadTemplate: null,
    ...overrides,
  };
}

describe("Webhook adapter", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockPrisma.webhookEndpoint.findUnique.mockReset();
  });

  it("returns failure when endpoint is not found", async () => {
    mockPrisma.webhookEndpoint.findUnique.mockResolvedValueOnce(null);
    const result = await executeWebhook("missing-id", baseTicketContext);
    expect(result.success).toBe(false);
    expect(result.detail).toContain("not found");
  });

  it("returns failure when endpoint is disabled", async () => {
    mockPrisma.webhookEndpoint.findUnique.mockResolvedValueOnce(
      makeEndpoint({ enabled: false })
    );
    const result = await executeWebhook("ep1", baseTicketContext);
    expect(result.success).toBe(false);
    expect(result.detail).toContain("disabled");
  });

  it("enforces domain allowlist - allowed domain passes", async () => {
    mockPrisma.webhookEndpoint.findUnique.mockResolvedValueOnce(
      makeEndpoint({
        allowedDomains: ["example.com"],
        url: "https://api.example.com/hook",
      })
    );
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => "OK",
    });

    const result = await executeWebhook("ep1", baseTicketContext);
    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledOnce();
  });

  it("enforces domain allowlist - disallowed domain fails", async () => {
    mockPrisma.webhookEndpoint.findUnique.mockResolvedValueOnce(
      makeEndpoint({
        allowedDomains: ["trusted.com"],
        url: "https://evil.com/hook",
      })
    );

    const result = await executeWebhook("ep1", baseTicketContext);
    expect(result.success).toBe(false);
    expect(result.detail).toContain("not in allowlist");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("allows subdomain matching in allowlist", async () => {
    mockPrisma.webhookEndpoint.findUnique.mockResolvedValueOnce(
      makeEndpoint({
        allowedDomains: ["example.com"],
        url: "https://sub.example.com/hook",
      })
    );
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => "OK",
    });

    const result = await executeWebhook("ep1", baseTicketContext);
    expect(result.success).toBe(true);
  });

  it("renders payload template with ticket fields", async () => {
    const template = JSON.stringify({
      id: "{{ticket.id}}",
      ref: "{{ticket.reference}}",
      env: "{{ticket.fields.environment}}",
      sev: "{{ticket.fields.severity}}",
      missing: "{{ticket.fields.nonexistent}}",
    });
    mockPrisma.webhookEndpoint.findUnique.mockResolvedValueOnce(
      makeEndpoint({ payloadTemplate: template })
    );
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => "OK",
    });

    await executeWebhook("ep1", baseTicketContext);

    const sentBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(sentBody.id).toBe("t1");
    expect(sentBody.ref).toBe("INF-0001");
    expect(sentBody.env).toBe("production");
    expect(sentBody.sev).toBe("high");
    expect(sentBody.missing).toBe("");
  });

  it("sends default payload when no template is set", async () => {
    mockPrisma.webhookEndpoint.findUnique.mockResolvedValueOnce(
      makeEndpoint({ payloadTemplate: null })
    );
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => "OK",
    });

    await executeWebhook("ep1", baseTicketContext);

    const sentBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(sentBody.ticketId).toBe("t1");
    expect(sentBody.ticketRef).toBe("INF-0001");
    expect(sentBody.fields).toEqual({
      environment: "production",
      severity: "high",
    });
    expect(sentBody.timestamp).toBeDefined();
  });

  it("makes successful webhook call", async () => {
    mockPrisma.webhookEndpoint.findUnique.mockResolvedValueOnce(
      makeEndpoint({ method: "POST", headers: { "X-Custom": "value" } })
    );
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => '{"received":true}',
    });

    const result = await executeWebhook("ep1", baseTicketContext);
    expect(result.success).toBe(true);
    expect(result.detail).toContain("POST");
    expect(result.detail).toContain("200");

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe("https://api.example.com/hook");
    expect(options.method).toBe("POST");
    expect(options.headers["Content-Type"]).toBe("application/json");
    expect(options.headers["X-Custom"]).toBe("value");
  });

  it("returns failure on non-2xx response", async () => {
    mockPrisma.webhookEndpoint.findUnique.mockResolvedValueOnce(
      makeEndpoint()
    );
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 502,
      text: async () => "Bad Gateway",
    });

    const result = await executeWebhook("ep1", baseTicketContext);
    expect(result.success).toBe(false);
    expect(result.detail).toContain("502");
    expect(result.detail).toContain("Bad Gateway");
  });

  it("handles timeout/network error", async () => {
    mockPrisma.webhookEndpoint.findUnique.mockResolvedValueOnce(
      makeEndpoint()
    );
    mockFetch.mockRejectedValueOnce(new Error("The operation was aborted"));

    const result = await executeWebhook("ep1", baseTicketContext);
    expect(result.success).toBe(false);
    expect(result.detail).toContain("aborted");
  });

  it("handles invalid endpoint URL", async () => {
    mockPrisma.webhookEndpoint.findUnique.mockResolvedValueOnce(
      makeEndpoint({
        url: "not-a-url",
        allowedDomains: ["example.com"],
      })
    );

    const result = await executeWebhook("ep1", baseTicketContext);
    expect(result.success).toBe(false);
    expect(result.detail).toContain("Invalid endpoint URL");
  });
});
