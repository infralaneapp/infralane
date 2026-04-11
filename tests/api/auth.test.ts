import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma — use vi.hoisted so the variable is available in the hoisted vi.mock factory
const mockPrisma = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({
  prisma: mockPrisma,
}));

// Mock password utils
vi.mock("@/lib/auth/password", () => ({
  hashPassword: vi.fn((pw: string) => `hashed_${pw}`),
  verifyPassword: vi.fn((pw: string, hash: string) => hash === `hashed_${pw}`),
}));

import { authenticateUser, registerUser } from "@/lib/auth/service";
import { AppError } from "@/lib/errors";

describe("authenticateUser", () => {
  beforeEach(() => {
    mockPrisma.user.findUnique.mockReset();
  });

  it("returns user data on valid credentials", async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      id: "u1",
      email: "admin@test.com",
      name: "Admin User",
      role: "ADMIN",
      passwordHash: "hashed_secret123",
    });

    const result = await authenticateUser({
      email: "admin@test.com",
      password: "secret123",
    });

    expect(result).toEqual({
      id: "u1",
      email: "admin@test.com",
      name: "Admin User",
      role: "ADMIN",
    });
    // Should not include passwordHash in the result
    expect(result).not.toHaveProperty("passwordHash");
  });

  it("normalizes email to lowercase", async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(null);

    await expect(
      authenticateUser({ email: "Admin@Test.COM", password: "pw" })
    ).rejects.toThrow();

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: "admin@test.com" },
      })
    );
  });

  it("throws on invalid password", async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      id: "u1",
      email: "user@test.com",
      name: "User",
      role: "REQUESTER",
      passwordHash: "hashed_correct",
    });

    try {
      await authenticateUser({ email: "user@test.com", password: "wrong" });
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).status).toBe(401);
      expect((err as AppError).code).toBe("INVALID_CREDENTIALS");
    }
  });

  it("throws on unknown email", async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(null);

    try {
      await authenticateUser({
        email: "nobody@test.com",
        password: "anything",
      });
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).status).toBe(401);
      expect((err as AppError).code).toBe("INVALID_CREDENTIALS");
    }
  });
});

describe("registerUser", () => {
  beforeEach(() => {
    mockPrisma.user.findUnique.mockReset();
    mockPrisma.user.create.mockReset();
  });

  it("creates a new user successfully", async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(null);
    mockPrisma.user.count.mockResolvedValueOnce(5);
    mockPrisma.user.create.mockResolvedValueOnce({
      id: "u-new",
      email: "new@test.com",
      name: "New User",
      role: "REQUESTER",
    });

    const result = await registerUser({
      name: "  New User  ",
      email: "New@Test.com",
      password: "password123",
    });

    expect(result).toEqual({
      id: "u-new",
      email: "new@test.com",
      name: "New User",
      role: "REQUESTER",
    });

    // Verify email normalization
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: "new@test.com" },
      })
    );

    // Verify user creation data
    expect(mockPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "New User",
          email: "new@test.com",
          role: "REQUESTER",
        }),
      })
    );
  });

  it("throws on duplicate email (read-before-create check)", async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({ id: "existing" });

    try {
      await registerUser({
        name: "Duplicate",
        email: "existing@test.com",
        password: "password123",
      });
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).status).toBe(409);
      expect((err as AppError).code).toBe("EMAIL_ALREADY_EXISTS");
    }

    // Should not attempt to create
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
  });

  it("throws on duplicate email (P2002 race condition)", async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(null);
    mockPrisma.user.count.mockResolvedValueOnce(5);

    const prismaError = new Error("Unique constraint failed") as any;
    prismaError.code = "P2002";
    mockPrisma.user.create.mockRejectedValueOnce(prismaError);

    try {
      await registerUser({
        name: "Race Condition",
        email: "race@test.com",
        password: "password123",
      });
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).status).toBe(409);
      expect((err as AppError).code).toBe("EMAIL_ALREADY_EXISTS");
    }
  });

  it("re-throws non-P2002 errors from create", async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(null);
    mockPrisma.user.count.mockResolvedValueOnce(5);
    mockPrisma.user.create.mockRejectedValueOnce(new Error("DB connection lost"));

    await expect(
      registerUser({
        name: "Error Case",
        email: "error@test.com",
        password: "password123",
      })
    ).rejects.toThrow("DB connection lost");
  });
});
