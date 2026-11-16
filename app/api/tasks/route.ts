import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { HttpError, parseBody, readJson, toErrorResponse } from "@/lib/http";
import { getAccessibleLead, parseDate, resolveOwnerId } from "@/lib/leads";
import { prisma } from "@/lib/prisma";
import { taskSchema } from "@/lib/validators";

const include = {
  lead: { select: { id: true, title: true } },
  assignedUser: { select: { id: true, name: true } },
};

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const params = new URL(request.url).searchParams;
    const status = params.get("status");
    const ownerId = params.get("ownerId");
    const where: Prisma.TaskWhereInput = {
      ...(user.role === "ADMIN" ? (ownerId ? { assignedUserId: ownerId } : {}) : { assignedUserId: user.id }),
      ...(status === "open" ? { completed: false } : {}),
      ...(status === "done" ? { completed: true } : {}),
      ...(status === "overdue" ? { completed: false, dueDate: { lt: new Date() } } : {}),
    };
    const tasks = await prisma.task.findMany({
      where,
      include,
      orderBy: [{ completed: "asc" }, { dueDate: "asc" }],
    });
    return NextResponse.json({ tasks });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const data = parseBody(taskSchema, await readJson(request));
    if (data.leadId) await getAccessibleLead(user, data.leadId);
    const assignedUserId = await resolveOwnerId(user, data.assignedUserId, user.id);
    const task = await prisma.task.create({
      data: {
        title: data.title,
        dueDate: parseDate(data.dueDate) ?? new Date(),
        leadId: data.leadId,
        assignedUserId,
        completed: data.completed ?? false,
      },
      include,
    });
    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    if (error instanceof HttpError) return toErrorResponse(error);
    return toErrorResponse(error);
  }
}
