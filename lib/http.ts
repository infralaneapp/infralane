import { NextResponse } from "next/server";
import { ZodError, type ZodTypeAny, z } from "zod";

import { AppError } from "@/lib/errors";

export function apiSuccess<T>(data: T, init?: number | ResponseInit) {
  const responseInit = typeof init === "number" ? { status: init } : init;
  return NextResponse.json(
    {
      success: true,
      data,
    },
    responseInit,
  );
}

export function apiError(
  message: string,
  options?: {
    status?: number;
    code?: string;
    details?: unknown;
  },
) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: options?.code ?? "REQUEST_ERROR",
        message,
        details: options?.details,
      },
    },
    {
      status: options?.status ?? 400,
    },
  );
}

export async function parseRequestBody<TSchema extends ZodTypeAny>(request: Request, schema: TSchema): Promise<z.output<TSchema>> {
  const body = await request.json().catch(() => {
    throw new AppError("Invalid JSON payload.", {
      status: 400,
      code: "INVALID_JSON",
    });
  });

  return schema.parse(body);
}

export type RouteContext<T extends Record<string, string> = { id: string }> = {
  params: Promise<T>;
};

export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    return apiError("Validation failed.", {
      status: 422,
      code: "VALIDATION_ERROR",
      details: error.flatten(),
    });
  }

  if (error instanceof AppError) {
    return apiError(error.message, {
      status: error.status,
      code: error.code,
      details: error.details,
    });
  }

  console.error(error);

  return apiError("Internal server error.", {
    status: 500,
    code: "INTERNAL_SERVER_ERROR",
  });
}
