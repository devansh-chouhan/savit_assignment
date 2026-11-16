import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { parseBody, readJson, toErrorResponse } from "@/lib/http";
import { getAccessibleLead } from "@/lib/leads";
import { prisma } from "@/lib/prisma";
import { activitySchema } from "@/lib/validators";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    await getAccessibleLead(user, id);
    const data = parseBody(activitySchema, await readJson(request));
    const [activity] = await prisma.$transaction([
      prisma.activity.create({
        data: {
          leadId: id,
          type: data.type,
          description: data.description,
          createdById: user.id,
        },
        include: { createdBy: { select: { id: true, name: true } } },
      }),
      prisma.lead.update({ where: { id }, data: { scoreStale: true } }),
    ]);
    return NextResponse.json({ activity }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
