import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

describe("password hashing", () => {
  it("hashes and verifies correctly", () => {
    const hash = hashPassword("testpassword");
    expect(verifyPassword("testpassword", hash)).toBe(true);
  });

  it("rejects wrong password", () => {
    const hash = hashPassword("testpassword");
    expect(verifyPassword("wrongpassword", hash)).toBe(false);
  });

  it("produces different hashes for same input due to salt", () => {
    const hash1 = hashPassword("testpassword");
    const hash2 = hashPassword("testpassword");
    // bcrypt uses random salts, so hashes differ
    expect(hash1).not.toBe(hash2);
    // But both should still verify against the original password
    expect(verifyPassword("testpassword", hash1)).toBe(true);
    expect(verifyPassword("testpassword", hash2)).toBe(true);
  });

  it("returns a bcrypt-format hash string", () => {
    const hash = hashPassword("mypassword");
    // bcrypt hashes start with $2a$ or $2b$
    expect(hash).toMatch(/^\$2[ab]\$/);
    // bcrypt hashes are 60 characters long
    expect(hash.length).toBe(60);
  });

  it("handles empty string password", () => {
    const hash = hashPassword("");
    expect(verifyPassword("", hash)).toBe(true);
    expect(verifyPassword("notempty", hash)).toBe(false);
  });

  it("handles unicode passwords", () => {
    const hash = hashPassword("пароль🔑");
    expect(verifyPassword("пароль🔑", hash)).toBe(true);
    expect(verifyPassword("пароль", hash)).toBe(false);
  });
});
