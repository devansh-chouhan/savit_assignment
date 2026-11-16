import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { HttpError, parseBody, readJson, toErrorResponse } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { contactSchema } from "@/lib/validators";

const include = { company: { select: { id: true, name: true, city: true } } };

export async function GET(request: Request) {
  try {
    await requireUser();
    const params = new URL(request.url).searchParams;
    const q = params.get("q")?.trim();
    const companyId = params.get("companyId") || undefined;
    const city = params.get("city") || undefined;
    const source = params.get("source") || undefined;
    const tag = params.get("tag") || undefined;

    const contacts = await prisma.contact.findMany({
      where: {
        ...(companyId ? { companyId } : {}),
        ...(city ? { city } : {}),
        ...(source ? { source } : {}),
        ...(tag ? { tags: { has: tag } } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
                { phone: { contains: q, mode: "insensitive" } },
                { company: { name: { contains: q, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      include,
      orderBy: { name: "asc" },
    });

    const facetRows = await prisma.contact.findMany({ select: { city: true, source: true, tags: true } });
    const cities = Array.from(new Set(facetRows.map((row) => row.city).filter(Boolean))) as string[];
    const sources = Array.from(new Set(facetRows.map((row) => row.source).filter(Boolean))) as string[];
    const tags = Array.from(new Set(facetRows.flatMap((row) => row.tags))).sort();

    return NextResponse.json({
      contacts,
      facets: { cities: cities.sort(), sources: sources.sort(), tags },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireUser();
    const data = parseBody(contactSchema, await readJson(request));
    if (data.companyId) {
      const company = await prisma.company.findUnique({ where: { id: data.companyId } });
      if (!company) throw new HttpError(400, "Company not found");
    }
    const contact = await prisma.contact.create({ data, include });
    return NextResponse.json({ contact }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
