import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { createSession } from "@/lib/auth";
import { parseBody, readJson, toErrorResponse } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const body = parseBody(loginSchema, await readJson(request));
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    const matches = user ? await bcrypt.compare(body.password, user.passwordHash) : false;
    if (!user || !matches) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }
    await createSession({ id: user.id, name: user.name, email: user.email, role: user.role });
    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
