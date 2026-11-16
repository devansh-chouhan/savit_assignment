import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { parseBody, readJson, toErrorResponse } from "@/lib/http";
import { changeLeadStage } from "@/lib/leads";
import { stageSchema } from "@/lib/validators";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const data = parseBody(stageSchema, await readJson(request));
    const lead = await changeLeadStage(user, id, data.stage, data.lostReason);
    return NextResponse.json({ lead });
  } catch (error) {
    return toErrorResponse(error);
  }
}
