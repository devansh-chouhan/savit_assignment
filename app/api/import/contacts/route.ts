import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { importContacts } from "@/lib/import-contacts";
import { parseBody, readJson, toErrorResponse } from "@/lib/http";
import { importSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    await requireUser();
    const data = parseBody(importSchema, await readJson(request));
    const result = await importContacts(data.rows, data.skipDuplicates ?? true);
    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
