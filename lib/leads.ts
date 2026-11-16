import type { LeadStage, Prisma } from "@prisma/client";
import type { SessionUser } from "./auth";
import { stageLabel } from "./constants";
import { HttpError } from "./http";
import { prisma } from "./prisma";
import { generateLeadScore, type ScoreFacts } from "./ai";

export const ownerSelect = { id: true, name: true, email: true } as const;

export const leadInclude = {
  contact: {
    include: { company: { select: { id: true, name: true, city: true } } },
  },
  owner: { select: ownerSelect },
} satisfies Prisma.LeadInclude;

export const leadDetailInclude = {
  ...leadInclude,
  activities: {
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { id: true, name: true } } },
  },
  tasks: {
    orderBy: { dueDate: "asc" },
    include: { assignedUser: { select: { id: true, name: true } } },
  },
} satisfies Prisma.LeadInclude;

export function leadWhere(user: SessionUser, extra: Prisma.LeadWhereInput = {}): Prisma.LeadWhereInput {
  if (user.role === "ADMIN") return extra;
  return { AND: [extra, { ownerId: user.id }] };
}

type LeadSummary = Prisma.LeadGetPayload<{ include: typeof leadInclude }>;
type LeadFull = Prisma.LeadGetPayload<{ include: typeof leadDetailInclude }>;

export async function getAccessibleLead(user: SessionUser, id: string, detail: true): Promise<LeadFull>;
export async function getAccessibleLead(user: SessionUser, id: string, detail?: false): Promise<LeadSummary>;
export async function getAccessibleLead(user: SessionUser, id: string, detail = false) {
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: detail ? leadDetailInclude : leadInclude,
  });
  if (!lead) throw new HttpError(404, "Lead not found");
  if (user.role !== "ADMIN" && lead.ownerId !== user.id) {
    throw new HttpError(403, "You can only access leads assigned to you");
  }
  return lead;
}

export function parseDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new HttpError(400, "Invalid date");
  return date;
}

export async function resolveOwnerId(user: SessionUser, requested?: string | null, fallback?: string) {
  if (user.role !== "ADMIN") return user.id;
  const id = requested || fallback || user.id;
  const owner = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!owner) throw new HttpError(400, "Owner not found");
  return owner.id;
}

export async function assertContact(contactId: string) {
  const contact = await prisma.contact.findUnique({ where: { id: contactId }, select: { id: true } });
  if (!contact) throw new HttpError(400, "Contact not found");
}

export async function changeLeadStage(
  user: SessionUser,
  id: string,
  stage: LeadStage,
  lostReason?: string | null,
) {
  const lead = await getAccessibleLead(user, id);
  if (stage === "LOST" && (!lostReason || lostReason.trim().length < 3)) {
    throw new HttpError(400, "A lost reason of at least 3 characters is required");
  }
  if (lead.stage === stage) {
    return getAccessibleLead(user, id, true);
  }

  await prisma.$transaction([
    prisma.lead.update({
      where: { id },
      data: {
        stage,
        lostReason: stage === "LOST" ? lostReason!.trim() : null,
        scoreStale: true,
      },
    }),
    prisma.activity.create({
      data: {
        leadId: id,
        type: "STAGE_CHANGE",
        createdById: user.id,
        description:
          stage === "LOST"
            ? `Stage changed from ${stageLabel(lead.stage)} to Lost. Reason: ${lostReason!.trim()}`
            : `Stage changed from ${stageLabel(lead.stage)} to ${stageLabel(stage)}`,
      },
    }),
  ]);

  return getAccessibleLead(user, id, true);
}

export async function scoreLead(user: SessionUser, id: string, force = false) {
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      ...leadInclude,
      activities: { orderBy: { createdAt: "desc" }, take: 8 },
    },
  });
  if (!lead) throw new HttpError(404, "Lead not found");
  if (user.role !== "ADMIN" && lead.ownerId !== user.id) {
    throw new HttpError(403, "You can only access leads assigned to you");
  }

  if (!force && lead.aiScore != null && !lead.scoreStale && lead.aiCategory) {
    return {
      score: lead.aiScore,
      category: lead.aiCategory,
      reasons: lead.aiReasons,
      cached: true,
    };
  }

  const facts: ScoreFacts = {
    title: lead.title,
    stage: lead.stage,
    dealValue: lead.dealValue,
    expectedCloseDate: lead.expectedCloseDate?.toISOString() ?? null,
    source: lead.source,
    lostReason: lead.lostReason,
    contactName: lead.contact.name,
    company: lead.contact.company?.name ?? null,
    city: lead.contact.city,
    activities: lead.activities.map((activity) => ({
      type: activity.type,
      description: activity.description,
      createdAt: activity.createdAt.toISOString(),
    })),
  };

  const result = await generateLeadScore(facts);
  await prisma.lead.update({
    where: { id },
    data: {
      aiScore: result.score,
      aiCategory: result.category,
      aiReasons: result.reasons,
      aiScoredAt: new Date(),
      scoreStale: false,
    },
  });
  return { ...result, cached: false };
}
