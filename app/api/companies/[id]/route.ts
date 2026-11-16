import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { HttpError, parseBody, readJson, toErrorResponse } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { companySchema } from "@/lib/validators";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    await requireUser();
    const { id } = await context.params;
    const company = await prisma.company.findUnique({
      where: { id },
      include: { _count: { select: { contacts: true } }, contacts: { orderBy: { name: "asc" } } },
    });
    if (!company) throw new HttpError(404, "Company not found");
    return NextResponse.json({ company });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    await requireUser();
    const { id } = await context.params;
    const data = parseBody(companySchema, await readJson(request));
    const existing = await prisma.company.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, "Company not found");
    const company = await prisma.company.update({
      where: { id },
      data,
      include: { _count: { select: { contacts: true } } },
    });
    return NextResponse.json({ company });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    await requireUser();
    const { id } = await context.params;
    const existing = await prisma.company.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, "Company not found");
    await prisma.company.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
