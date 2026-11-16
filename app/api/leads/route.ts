import { NextResponse } from "next/server";
import type { LeadStage, Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { STAGES } from "@/lib/constants";
import { HttpError, parseBody, readJson, toErrorResponse } from "@/lib/http";
import {
  assertContact,
  leadInclude,
  leadWhere,
  parseDate,
  resolveOwnerId,
} from "@/lib/leads";
import { prisma } from "@/lib/prisma";
import { leadSchema } from "@/lib/validators";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const params = new URL(request.url).searchParams;
    const q = params.get("q")?.trim();
    const stage = params.get("stage");
    const source = params.get("source") || undefined;
    const ownerId = params.get("ownerId") || undefined;

    const filters: Prisma.LeadWhereInput = {
      ...(stage && STAGES.includes(stage as (typeof STAGES)[number]) ? { stage: stage as LeadStage } : {}),
      ...(source ? { source } : {}),
      ...(user.role === "ADMIN" && ownerId ? { ownerId } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { contact: { name: { contains: q, mode: "insensitive" } } },
              { contact: { company: { name: { contains: q, mode: "insensitive" } } } },
            ],
          }
        : {}),
    };

    const leads = await prisma.lead.findMany({
      where: leadWhere(user, filters),
      include: leadInclude,
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({ leads });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const data = parseBody(leadSchema, await readJson(request));
    const stage = data.stage ?? "NEW";
    if (stage === "LOST" && (!data.lostReason || data.lostReason.trim().length < 3)) {
      throw new HttpError(400, "A lost reason of at least 3 characters is required");
    }
    await assertContact(data.contactId);
    const ownerId = await resolveOwnerId(user, data.ownerId);
    const lead = await prisma.lead.create({
      data: {
        title: data.title,
        contactId: data.contactId,
        dealValue: data.dealValue,
        stage,
        ownerId,
        expectedCloseDate: parseDate(data.expectedCloseDate),
        source: data.source,
        lostReason: stage === "LOST" ? data.lostReason : null,
        scoreStale: true,
        activities: {
          create: {
            type: "NOTE",
            description: "Lead created.",
            createdById: user.id,
          },
        },
      },
      include: leadInclude,
    });
    return NextResponse.json({ lead }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
