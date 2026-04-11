import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock env module before importing adapter
vi.mock("@/lib/env", () => ({
  env: { INFRALANE_BASE_URL: "http://localhost:3000" },
}));

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { slackAdapter, postInteractiveApproval } from "@/modules/automation/adapters/slack";

describe("Slack adapter", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("returns failure when webhook URL is not configured", async () => {
    const result = await slackAdapter.execute({
      ticketId: "t1",
      ticketRef: "INF-0001",
      actionValue: "#ops",
      config: {},
      ruleId: "r1",
      ruleName: "Test Rule",
    });
    expect(result.success).toBe(false);
    expect(result.detail).toContain("not configured");
  });

  it("sends message to Slack webhook", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });
    const result = await slackAdapter.execute({
      ticketId: "t1",
      ticketRef: "INF-0001",
      actionValue: "#alerts",
      config: {
        webhookUrl: "https://hooks.slack.com/test",
        defaultChannel: "#ops",
      },
      ruleId: "r1",
      ruleName: "Test Rule",
    });
    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe("https://hooks.slack.com/test");
    expect(options.method).toBe("POST");
  });

  it("uses actionValue as channel when provided", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });
    const result = await slackAdapter.execute({
      ticketId: "t1",
      ticketRef: "INF-0001",
      actionValue: "#alerts",
      config: {
        webhookUrl: "https://hooks.slack.com/test",
        defaultChannel: "#ops",
      },
      ruleId: "r1",
      ruleName: "Test Rule",
    });
    expect(result.success).toBe(true);
    expect(result.detail).toContain("#alerts");

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.channel).toBe("#alerts");
  });

  it("falls back to defaultChannel when actionValue is empty", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });
    const result = await slackAdapter.execute({
      ticketId: "t1",
      ticketRef: "INF-0001",
      actionValue: "",
      config: {
        webhookUrl: "https://hooks.slack.com/test",
        defaultChannel: "#ops",
      },
      ruleId: "r1",
      ruleName: "Test Rule",
    });
    expect(result.success).toBe(true);
    expect(result.detail).toContain("#ops");
  });

  it("handles Slack API errors", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => "Internal error",
    });
    const result = await slackAdapter.execute({
      ticketId: "t1",
      ticketRef: "INF-0001",
      actionValue: "",
      config: {
        webhookUrl: "https://hooks.slack.com/test",
        defaultChannel: "#ops",
      },
      ruleId: "r1",
      ruleName: "Test Rule",
    });
    expect(result.success).toBe(false);
    expect(result.detail).toContain("500");
  });

  it("handles network errors", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));
    const result = await slackAdapter.execute({
      ticketId: "t1",
      ticketRef: "INF-0001",
      actionValue: "",
      config: { webhookUrl: "https://hooks.slack.com/test" },
      ruleId: "r1",
      ruleName: "Test Rule",
    });
    expect(result.success).toBe(false);
    expect(result.detail).toContain("Network error");
  });

  it("includes rule name and ticket ref in payload", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });
    await slackAdapter.execute({
      ticketId: "t1",
      ticketRef: "INF-0042",
      actionValue: "#ops",
      config: { webhookUrl: "https://hooks.slack.com/test" },
      ruleId: "r1",
      ruleName: "High Priority Alert",
    });
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.text).toContain("High Priority Alert");
    expect(JSON.stringify(body.blocks)).toContain("INF-0042");
  });
});

describe("postInteractiveApproval", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("returns failure when botToken is missing", async () => {
    const result = await postInteractiveApproval(
      { defaultChannel: "#approvals" },
      "a1",
      "INF-0001",
      "t1",
      "Rule"
    );
    expect(result.success).toBe(false);
    expect(result.detail).toContain("bot token");
  });

  it("returns failure when defaultChannel is missing", async () => {
    const result = await postInteractiveApproval(
      { botToken: "xoxb-test" },
      "a1",
      "INF-0001",
      "t1",
      "Rule"
    );
    expect(result.success).toBe(false);
    expect(result.detail).toContain("default channel");
  });

  it("sends interactive approval message successfully", async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ ok: true, ts: "1234.5678" }),
    });
    const result = await postInteractiveApproval(
      { botToken: "xoxb-test", defaultChannel: "#approvals" },
      "a1",
      "INF-0001",
      "t1",
      "Approval Rule"
    );
    expect(result.success).toBe(true);
    expect(result.externalRef).toBe("1234.5678");

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe("https://slack.com/api/chat.postMessage");
    expect(options.headers.Authorization).toBe("Bearer xoxb-test");
  });

  it("handles Slack API error response", async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ ok: false, error: "channel_not_found" }),
    });
    const result = await postInteractiveApproval(
      { botToken: "xoxb-test", defaultChannel: "#nope" },
      "a1",
      "INF-0001",
      "t1",
      "Rule"
    );
    expect(result.success).toBe(false);
    expect(result.detail).toContain("channel_not_found");
  });

  it("handles network error", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Connection refused"));
    const result = await postInteractiveApproval(
      { botToken: "xoxb-test", defaultChannel: "#approvals" },
      "a1",
      "INF-0001",
      "t1",
      "Rule"
    );
    expect(result.success).toBe(false);
    expect(result.detail).toContain("Connection refused");
  });
});
