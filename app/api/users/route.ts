import { NextResponse } from "next/server";
import { getAuthorizedUser } from "@/lib/getUser";
import { db } from "@/lib/db";

export async function GET() {
  const auth = await getAuthorizedUser();
  if (!auth.ok) return NextResponse.json({ users: [] }, { status: auth.status });

  const users = await db.$queryRaw<
    { id: string; name: string | null; email: string; image: string | null }[]
  >`SELECT id, name, email, image FROM neon_auth.user ORDER BY name ASC`;

  return NextResponse.json({ users });
}
