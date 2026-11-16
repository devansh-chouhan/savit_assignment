import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";

export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function toErrorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  console.error(error);
  return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
}

export async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, "Invalid JSON body");
  }
}

export function parseBody<T>(schema: ZodType<T>, data: unknown): T {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
  }
  return parsed.data;
}
