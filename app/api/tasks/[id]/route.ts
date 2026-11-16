import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { HttpError, parseBody, readJson, toErrorResponse } from "@/lib/http";
import { getAccessibleLead, parseDate, resolveOwnerId } from "@/lib/leads";
import { prisma } from "@/lib/prisma";
import { taskPatchSchema } from "@/lib/validators";

const include = {
  lead: { select: { id: true, title: true } },
  assignedUser: { select: { id: true, name: true } },
};
type Context = { params: Promise<{ id: string }> };

async function loadTask(userId: string, role: "ADMIN" | "SALES_REP", id: string) {
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) throw new HttpError(404, "Task not found");
  if (role !== "ADMIN" && task.assignedUserId !== userId) {
    throw new HttpError(403, "You can only update tasks assigned to you");
  }
  return task;
}

export async function PATCH(request: Request, context: Context) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const existing = await loadTask(user.id, user.role, id);
    const data = parseBody(taskPatchSchema, await readJson(request));
    if (data.leadId) await getAccessibleLead(user, data.leadId);
    const assignedUserId = data.assignedUserId
      ? await resolveOwnerId(user, data.assignedUserId, existing.assignedUserId)
      : undefined;
    const task = await prisma.task.update({
      where: { id },
      data: {
        title: data.title,
        dueDate: data.dueDate ? parseDate(data.dueDate) ?? undefined : undefined,
        leadId: data.leadId,
        completed: data.completed,
        assignedUserId,
      },
      include,
    });
    return NextResponse.json({ task });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    await loadTask(user.id, user.role, id);
    await prisma.task.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
