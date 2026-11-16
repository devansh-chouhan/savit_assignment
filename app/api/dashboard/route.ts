import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { dashboardData } from "@/lib/dashboard";
import { toErrorResponse } from "@/lib/http";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const data = await dashboardData(user, new URL(request.url).searchParams);
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}
