import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { generateFollowUpEmail } from "@/lib/ai";
import { parseBody, readJson, toErrorResponse } from "@/lib/http";
import { getAccessibleLead } from "@/lib/leads";
import { emailRequestSchema } from "@/lib/validators";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const data = parseBody(emailRequestSchema, await readJson(request));
    const lead = await getAccessibleLead(user, id, true);
    const draft = await generateFollowUpEmail({
      tone: data.tone,
      repName: user.name,
      title: lead.title,
      stage: lead.stage,
      dealValue: lead.dealValue,
      expectedCloseDate: lead.expectedCloseDate?.toISOString() ?? null,
      source: lead.source,
      lostReason: lead.lostReason,
      contactName: lead.contact.name,
      company: lead.contact.company?.name ?? null,
      city: lead.contact.city,
      activities: lead.activities.slice(0, 5).map((activity) => ({
        type: activity.type,
        description: activity.description,
        createdAt: activity.createdAt.toISOString(),
      })),
    });
    return NextResponse.json(draft);
  } catch (error) {
    return toErrorResponse(error);
  }
}
