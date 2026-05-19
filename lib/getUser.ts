import "server-only";
import { cache } from "react";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";

export type AuthResult =
  | { ok: true; userId: string; email: string; isAdmin: boolean }
  | { ok: false; status: 401 | 403 };

// cache() deduplicates auth.getSession() within a single server render/request
// so multiple API routes in the same request only hit Neon Auth once
const getSession = cache(() => auth.getSession());

export async function getAuthorizedUser(): Promise<AuthResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any = await getSession();

  // Depending on the SDK version the user may be at result.user or result.data.user
  const user = result?.user ?? result?.data?.user;

  if (!user?.email) {
    return { ok: false, status: 401 };
  }

  const email: string = user.email;
  const userId: string = user.id;

  // Owner (AUTHORIZED_EMAIL) is always allowed and admin
  if (email === process.env.AUTHORIZED_EMAIL) {
    return { ok: true, userId, email, isAdmin: true };
  }

  // Everyone else must be whitelisted
  const entry = await db.whitelistEntry.findUnique({ where: { email } });
  if (!entry) return { ok: false, status: 403 };

  return { ok: true, userId, email, isAdmin: entry.isAdmin };
}

export async function requireAdmin(): Promise<AuthResult> {
  const result = await getAuthorizedUser();
  if (!result.ok) return result;
  if (!result.isAdmin) return { ok: false, status: 403 };
  return result;
}
