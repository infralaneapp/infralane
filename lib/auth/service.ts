import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import type { LoginInput, RegisterInput } from "@/lib/auth/schemas";

const authUserSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
} as const;

export async function authenticateUser(input: LoginInput) {
  const normalizedEmail = input.email.toLowerCase();

  const user = await prisma.user.findUnique({
    where: {
      email: normalizedEmail,
    },
    select: {
      ...authUserSelect,
      passwordHash: true,
    },
  });

  if (!user || !verifyPassword(input.password, user.passwordHash)) {
    throw new AppError("Invalid email or password.", {
      status: 401,
      code: "INVALID_CREDENTIALS",
    });
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

export async function registerUser(input: RegisterInput) {
  const normalizedEmail = input.email.toLowerCase();

  const existingUser = await prisma.user.findUnique({
    where: {
      email: normalizedEmail,
    },
    select: {
      id: true,
    },
  });

  if (existingUser) {
    throw new AppError("An account with this email already exists.", {
      status: 409,
      code: "EMAIL_ALREADY_EXISTS",
    });
  }

  try {
    return await prisma.user.create({
      data: {
        name: input.name.trim(),
        email: normalizedEmail,
        passwordHash: hashPassword(input.password),
        role: "REQUESTER",
      },
      select: authUserSelect,
    });
  } catch (err: any) {
    // P2002 = unique constraint violation (race condition on email)
    if (err?.code === "P2002") {
      throw new AppError("An account with this email already exists.", {
        status: 409,
        code: "EMAIL_ALREADY_EXISTS",
      });
    }
    throw err;
  }
}
