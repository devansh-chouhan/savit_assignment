import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { HttpError, parseBody, readJson, toErrorResponse } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { contactSchema } from "@/lib/validators";

const include = { company: { select: { id: true, name: true, city: true } } };
type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    await requireUser();
    const { id } = await context.params;
    const data = parseBody(contactSchema, await readJson(request));
    const existing = await prisma.contact.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, "Contact not found");
    if (data.companyId) {
      const company = await prisma.company.findUnique({ where: { id: data.companyId } });
      if (!company) throw new HttpError(400, "Company not found");
    }
    const contact = await prisma.contact.update({ where: { id }, data, include });
    return NextResponse.json({ contact });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    await requireUser();
    const { id } = await context.params;
    const existing = await prisma.contact.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, "Contact not found");
    const leads = await prisma.lead.count({ where: { contactId: id } });
    if (leads > 0) throw new HttpError(400, "This contact has leads and cannot be deleted");
    await prisma.contact.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
