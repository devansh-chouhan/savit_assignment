import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { parseBody, readJson, toErrorResponse } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { companySchema } from "@/lib/validators";

export async function GET(request: Request) {
  try {
    await requireUser();
    const q = new URL(request.url).searchParams.get("q")?.trim();
    const companies = await prisma.company.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { industry: { contains: q, mode: "insensitive" } },
              { city: { contains: q, mode: "insensitive" } },
            ],
          }
        : undefined,
      include: { _count: { select: { contacts: true } } },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ companies });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireUser();
    const data = parseBody(companySchema, await readJson(request));
    const company = await prisma.company.create({ data, include: { _count: { select: { contacts: true } } } });
    return NextResponse.json({ company }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
