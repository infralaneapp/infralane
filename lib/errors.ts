export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(
    message: string,
    options?: {
      status?: number;
      code?: string;
      details?: unknown;
    },
  ) {
    super(message);
    this.name = "AppError";
    this.status = options?.status ?? 400;
    this.code = options?.code ?? "APP_ERROR";
    this.details = options?.details;
  }
}
