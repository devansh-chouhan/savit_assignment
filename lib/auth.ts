import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@prisma/client";
import { HttpError } from "./http";

export const SESSION_COOKIE = "crm_session";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

function secret() {
  const value = process.env.AUTH_SECRET || "savit-crm-dev-secret-change-in-production-32chars";
  return new TextEncoder().encode(value);
}

export async function signSession(user: SessionUser) {
  return new SignJWT(user)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
}

export async function verifySession(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.id || !payload.email || !payload.role || !payload.name) return null;
    return {
      id: String(payload.id),
      name: String(payload.name),
      email: String(payload.email),
      role: payload.role as Role,
    };
  } catch {
    return null;
  }
}

export async function createSession(user: SessionUser) {
  const token = await signSession(user);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function requireUser(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) throw new HttpError(401, "Unauthorized");
  return session;
}

export function assertAdmin(user: SessionUser) {
  if (user.role !== "ADMIN") throw new HttpError(403, "Admin access is required");
}
