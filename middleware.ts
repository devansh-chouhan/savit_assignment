import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

function secret() {
  const value = process.env.AUTH_SECRET || "savit-crm-dev-secret-change-in-production-32chars";
  return new TextEncoder().encode(value);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow login API endpoint without authentication
  if (pathname === "/api/auth/login") {
    return NextResponse.next();
  }

  const token = request.cookies.get("crm_session")?.value;
  let valid = false;
  if (token) {
    try {
      await jwtVerify(token, secret());
      valid = true;
    } catch {
      valid = false;
    }
  }

  if (pathname === "/login") {
    if (valid) return NextResponse.redirect(new URL("/dashboard", request.url));
    return NextResponse.next();
  }

  if (!valid) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sample-contacts.csv|.*\\.svg|.*\\.png).*)"],
};
