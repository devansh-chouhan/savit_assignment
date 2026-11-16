import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { parseBody, readJson, toErrorResponse } from "@/lib/http";
import { scoreLead } from "@/lib/leads";
import { scoreRequestSchema } from "@/lib/validators";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const data = parseBody(scoreRequestSchema, await readJson(request));
    const result = await scoreLead(user, id, Boolean(data.force));
    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
