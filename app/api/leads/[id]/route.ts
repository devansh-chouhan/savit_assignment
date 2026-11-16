import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { stageLabel } from "@/lib/constants";
import { HttpError, parseBody, readJson, toErrorResponse } from "@/lib/http";
import {
  assertContact,
  getAccessibleLead,
  leadDetailInclude,
  parseDate,
  resolveOwnerId,
} from "@/lib/leads";
import { prisma } from "@/lib/prisma";
import { leadSchema } from "@/lib/validators";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const lead = await getAccessibleLead(user, id, true);
    return NextResponse.json({ lead });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const existing = await getAccessibleLead(user, id);
    const data = parseBody(leadSchema.partial(), await readJson(request));
    if (data.contactId) await assertContact(data.contactId);

    const nextStage = data.stage ?? existing.stage;
    const lostReason = data.lostReason === undefined ? existing.lostReason : data.lostReason;
    if (nextStage === "LOST" && (!lostReason || lostReason.trim().length < 3)) {
      throw new HttpError(400, "A lost reason of at least 3 characters is required");
    }

    const ownerId =
      user.role === "ADMIN" && data.ownerId
        ? await resolveOwnerId(user, data.ownerId)
        : existing.ownerId;

    const stageChanged = nextStage !== existing.stage;
    const ownerChanged = ownerId !== existing.ownerId;
    const closeDate = data.expectedCloseDate !== undefined ? parseDate(data.expectedCloseDate) : undefined;
    const scoreStale =
      stageChanged ||
      (data.dealValue != null && data.dealValue !== existing.dealValue) ||
      (data.source !== undefined && data.source !== existing.source) ||
      (closeDate !== undefined &&
        (closeDate?.toISOString() ?? null) !== (existing.expectedCloseDate?.toISOString() ?? null));

    await prisma.lead.update({
      where: { id },
      data: {
        title: data.title,
        contactId: data.contactId,
        dealValue: data.dealValue,
        source: data.source,
        stage: data.stage,
        ownerId,
        expectedCloseDate: closeDate,
        lostReason: nextStage === "LOST" ? lostReason : data.stage ? null : undefined,
        scoreStale: scoreStale || undefined,
      },
    });

    if (stageChanged) {
      await prisma.activity.create({
        data: {
          leadId: id,
          type: "STAGE_CHANGE",
          createdById: user.id,
          description:
            nextStage === "LOST"
              ? `Stage changed from ${stageLabel(existing.stage)} to Lost. Reason: ${lostReason}`
              : `Stage changed from ${stageLabel(existing.stage)} to ${stageLabel(nextStage)}`,
        },
      });
    }
    if (ownerChanged) {
      const owner = await prisma.user.findUnique({ where: { id: ownerId }, select: { name: true } });
      await prisma.activity.create({
        data: {
          leadId: id,
          type: "NOTE",
          createdById: user.id,
          description: `Lead reassigned to ${owner?.name ?? "another rep"}.`,
        },
      });
    }

    const lead = await prisma.lead.findUnique({ where: { id }, include: leadDetailInclude });
    return NextResponse.json({ lead });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    await getAccessibleLead(user, id);
    await prisma.lead.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
