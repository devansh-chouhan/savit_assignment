import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { toErrorResponse } from "@/lib/http";

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json({ user });
  } catch (error) {
    return toErrorResponse(error);
  }
}
