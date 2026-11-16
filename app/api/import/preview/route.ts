import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prepareImport } from "@/lib/import-contacts";
import { parseBody, readJson, toErrorResponse } from "@/lib/http";
import { importSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    await requireUser();
    const data = parseBody(importSchema, await readJson(request));
    const preview = await prepareImport(data.rows);
    return NextResponse.json({
      preview,
      counts: {
        valid: preview.filter((row) => row.status === "valid").length,
        duplicate: preview.filter((row) => row.status === "duplicate").length,
        invalid: preview.filter((row) => row.status === "invalid").length,
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
