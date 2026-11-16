import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { toErrorResponse } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await requireUser();
    const users = await prisma.user.findMany({
      where: user.role === "ADMIN" ? {} : { id: user.id },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ users });
  } catch (error) {
    return toErrorResponse(error);
  }
}
