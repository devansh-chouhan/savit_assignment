import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { toErrorResponse } from "@/lib/http";
import { leadInclude, leadWhere } from "@/lib/leads";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
    if (q.length < 2) return NextResponse.json({ leads: [], contacts: [] });

    const [leads, contacts] = await Promise.all([
      prisma.lead.findMany({
        where: leadWhere(user, {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { contact: { name: { contains: q, mode: "insensitive" } } },
            { contact: { company: { name: { contains: q, mode: "insensitive" } } } },
          ],
        }),
        include: leadInclude,
        take: 6,
        orderBy: { updatedAt: "desc" },
      }),
      prisma.contact.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { company: { name: { contains: q, mode: "insensitive" } } },
          ],
        },
        include: { company: { select: { id: true, name: true, city: true } } },
        take: 6,
        orderBy: { name: "asc" },
      }),
    ]);
    return NextResponse.json({ leads, contacts });
  } catch (error) {
    return toErrorResponse(error);
  }
}
