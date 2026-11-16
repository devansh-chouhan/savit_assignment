import type { Prisma } from "@prisma/client";
import type { SessionUser } from "./auth";
import { OPEN_STAGES, STAGES } from "./constants";
import { endOfDay } from "./format";
import { prisma } from "./prisma";

export async function dashboardData(user: SessionUser, search: URLSearchParams) {
  const from = search.get("from");
  const to = search.get("to");
  const requestedOwner = search.get("ownerId");
  const ownerId = user.role === "ADMIN" ? requestedOwner || undefined : user.id;

  const createdAt: Prisma.DateTimeFilter = {};
  if (from) createdAt.gte = new Date(`${from}T00:00:00.000`);
  if (to) createdAt.lte = endOfDay(to);

  const leadWhere: Prisma.LeadWhereInput = {
    ...(ownerId ? { ownerId } : {}),
    ...(from || to ? { createdAt } : {}),
  };

  const [leads, users, overdue] = await Promise.all([
    prisma.lead.findMany({
      where: leadWhere,
      select: {
        stage: true,
        dealValue: true,
        source: true,
        ownerId: true,
        owner: { select: { id: true, name: true } },
      },
    }),
    prisma.user.findMany({
      where: user.role === "ADMIN" ? {} : { id: user.id },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
    prisma.task.findMany({
      where: {
        completed: false,
        dueDate: { lt: new Date() },
        ...(ownerId ? { assignedUserId: ownerId } : {}),
      },
      include: {
        lead: { select: { id: true, title: true } },
        assignedUser: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: "asc" },
      take: 8,
    }),
  ]);

  const byStage = STAGES.map((stage) => {
    const rows = leads.filter((lead) => lead.stage === stage);
    return {
      stage,
      count: rows.length,
      value: rows.reduce((sum, lead) => sum + lead.dealValue, 0),
    };
  });

  const sourceMap = new Map<string, number>();
  for (const lead of leads) {
    const key = lead.source || "Unknown";
    sourceMap.set(key, (sourceMap.get(key) ?? 0) + 1);
  }

  const reps = new Map<string, { userId: string; name: string; wonValue: number; wonCount: number; pipelineValue: number }>();
  for (const lead of leads) {
    const current = reps.get(lead.ownerId) ?? {
      userId: lead.ownerId,
      name: lead.owner.name,
      wonValue: 0,
      wonCount: 0,
      pipelineValue: 0,
    };
    if (lead.stage === "WON") {
      current.wonValue += lead.dealValue;
      current.wonCount += 1;
    }
    if (OPEN_STAGES.includes(lead.stage)) current.pipelineValue += lead.dealValue;
    reps.set(lead.ownerId, current);
  }

  const won = leads.filter((lead) => lead.stage === "WON").length;
  const lost = leads.filter((lead) => lead.stage === "LOST").length;
  const pipelineValue = leads
    .filter((lead) => OPEN_STAGES.includes(lead.stage))
    .reduce((sum, lead) => sum + lead.dealValue, 0);

  const overdueCount = await prisma.task.count({
    where: {
      completed: false,
      dueDate: { lt: new Date() },
      ...(ownerId ? { assignedUserId: ownerId } : {}),
    },
  });

  return {
    totals: {
      leads: leads.length,
      pipelineValue,
      wonDeals: won,
      winRate: won + lost === 0 ? 0 : Math.round((won / (won + lost)) * 100),
      overdueTasks: overdueCount,
    },
    byStage,
    bySource: Array.from(sourceMap.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count),
    leaderboard: Array.from(reps.values()).sort((a, b) => b.wonValue - a.wonValue),
    overdue,
    reps: users,
  };
}
