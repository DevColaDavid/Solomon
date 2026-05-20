import "server-only";
import { cache } from "react";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";

export type UserRole = "VIEWER" | "MEMBER" | "ADMIN";

export type AuthResult =
  | { ok: true; userId: string; email: string; role: UserRole; isAdmin: boolean; canEdit: boolean }
  | { ok: false; status: 401 | 403 };

const getSession = cache(() => auth.getSession());

// Module-level auth cache — eliminates the appUser DB lookup on every API request.
// TTL: 60s. Stale after role change but acceptable for non-security-critical UX.
const AUTH_CACHE = new Map<string, { role: UserRole; exp: number }>();
const CACHE_TTL  = 60_000;

export async function getAuthorizedUser(): Promise<AuthResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any = await getSession();
  const user = result?.user ?? result?.data?.user;
  if (!user?.email) return { ok: false, status: 401 };

  const email: string  = user.email;
  const userId: string = user.id;

  if (email === process.env.AUTHORIZED_EMAIL) {
    return { ok: true, userId, email, role: "ADMIN", isAdmin: true, canEdit: true };
  }

  // Check cache first — avoids DB round-trip on repeated requests
  const cached = AUTH_CACHE.get(email);
  if (cached && cached.exp > Date.now()) {
    const role = cached.role;
    return { ok: true, userId, email, role, isAdmin: role === "ADMIN", canEdit: role !== "VIEWER" };
  }

  const appUser = await db.appUser.findUnique({ where: { email } });
  if (!appUser) return { ok: false, status: 403 };

  const role = appUser.role as UserRole;
  AUTH_CACHE.set(email, { role, exp: Date.now() + CACHE_TTL });
  return { ok: true, userId, email, role, isAdmin: role === "ADMIN", canEdit: role !== "VIEWER" };
}

// Invalidate cache when admin changes a user's role
export function invalidateAuthCache(email: string) {
  AUTH_CACHE.delete(email);
}

export async function requireAdmin(): Promise<AuthResult> {
  const result = await getAuthorizedUser();
  if (!result.ok) return result;
  if (!result.isAdmin) return { ok: false, status: 403 };
  return result;
}

export async function requireEditor(): Promise<AuthResult> {
  const result = await getAuthorizedUser();
  if (!result.ok) return result;
  if (!result.canEdit) return { ok: false, status: 403 };
  return result;
}
