import { describe, it, expect } from "vitest";
import { maskSecret, maskConfigSecrets, maskHeaders } from "@/lib/secrets";

describe("secret masking", () => {
  describe("maskSecret", () => {
    it("masks long strings showing last 4 chars", () => {
      expect(maskSecret("xoxb-1234-5678-abcdef")).toBe("****cdef");
    });

    it("masks strings of exactly 5 chars showing last 4", () => {
      expect(maskSecret("abcde")).toBe("****bcde");
    });

    it("masks short strings (4 chars) completely", () => {
      expect(maskSecret("abcd")).toBe("****");
    });

    it("masks short strings (1 char) completely", () => {
      expect(maskSecret("x")).toBe("****");
    });

    it("returns empty for null", () => {
      expect(maskSecret(null)).toBe("");
    });

    it("returns empty for undefined", () => {
      expect(maskSecret(undefined)).toBe("");
    });

    it("returns empty for empty string", () => {
      expect(maskSecret("")).toBe("");
    });

    it("returns empty for non-string values", () => {
      expect(maskSecret(12345)).toBe("");
      expect(maskSecret(true)).toBe("");
      expect(maskSecret({})).toBe("");
    });
  });

  describe("maskConfigSecrets", () => {
    it("masks botToken", () => {
      const config = {
        webhookUrl: "https://example.com",
        botToken: "xoxb-secret-token",
        defaultChannel: "#ops",
      };
      const masked = maskConfigSecrets(config);
      expect(masked.webhookUrl).toBe("https://example.com");
      expect(masked.botToken).toBe("****oken");
      expect(masked.defaultChannel).toBe("#ops");
    });

    it("masks signingSecret", () => {
      const config = { signingSecret: "abc123secret" };
      const masked = maskConfigSecrets(config);
      expect(masked.signingSecret).toBe("****cret");
    });

    it("masks clientSecret", () => {
      const config = { clientSecret: "my-client-secret-value" };
      const masked = maskConfigSecrets(config);
      expect(masked.clientSecret).toBe("****alue");
    });

    it("masks password field", () => {
      const config = { password: "supersecret123" };
      const masked = maskConfigSecrets(config);
      expect(masked.password).toBe("****t123");
    });

    it("masks apiKey field", () => {
      const config = { apiKey: "sk-abc123456789" };
      const masked = maskConfigSecrets(config);
      expect(masked.apiKey).toBe("****6789");
    });

    it("masks token field", () => {
      const config = { token: "ghp_abcdef123456" };
      const masked = maskConfigSecrets(config);
      expect(masked.token).toBe("****3456");
    });

    it("masks secretKey field", () => {
      const config = { secretKey: "wJalrXUtnFEMI/SECRET" };
      const masked = maskConfigSecrets(config);
      expect(masked.secretKey).toBe("****CRET");
    });

    it("does not mask non-sensitive keys", () => {
      const config = {
        name: "my-integration",
        url: "https://api.example.com",
        enabled: true,
      };
      const masked = maskConfigSecrets(config);
      expect(masked.name).toBe("my-integration");
      expect(masked.url).toBe("https://api.example.com");
      expect(masked.enabled).toBe(true);
    });

    it("does not mask sensitive keys with non-string values", () => {
      const config = { token: 12345, apiKey: null };
      const masked = maskConfigSecrets(config);
      expect(masked.token).toBe(12345);
      expect(masked.apiKey).toBeNull();
    });

    it("returns a new object (shallow copy)", () => {
      const config = { name: "test" };
      const masked = maskConfigSecrets(config);
      expect(masked).not.toBe(config);
      expect(masked).toEqual(config);
    });
  });

  describe("maskHeaders", () => {
    it("masks authorization header", () => {
      const headers = {
        "Content-Type": "application/json",
        Authorization: "Bearer token123",
      };
      const masked = maskHeaders(headers);
      expect(masked["Content-Type"]).toBe("application/json");
      expect(masked["Authorization"]).toBe("****n123");
    });

    it("masks x-api-key header (case-insensitive)", () => {
      const headers = { "X-Api-Key": "secret-api-key-value" };
      const masked = maskHeaders(headers);
      expect(masked["X-Api-Key"]).toBe("****alue");
    });

    it("masks x-secret header", () => {
      const headers = { "X-Secret": "my-secret-value" };
      const masked = maskHeaders(headers);
      expect(masked["X-Secret"]).toBe("****alue");
    });

    it("masks cookie header", () => {
      const headers = { Cookie: "session=abc123456" };
      const masked = maskHeaders(headers);
      expect(masked["Cookie"]).toBe("****3456");
    });

    it("does not mask non-sensitive headers", () => {
      const headers = {
        "Content-Type": "application/json",
        Accept: "text/html",
        "User-Agent": "test-agent/1.0",
      };
      const masked = maskHeaders(headers);
      expect(masked).toEqual(headers);
    });

    it("returns a new object", () => {
      const headers = { "Content-Type": "text/plain" };
      const masked = maskHeaders(headers);
      expect(masked).not.toBe(headers);
    });
  });
});
