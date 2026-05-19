import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";

export async function PATCH(req: Request) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any = await auth.getSession();
  const user = result?.user ?? result?.data?.user;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, image } = await req.json();

  await db.$executeRaw`
    UPDATE neon_auth.user
    SET name = ${name ?? user.name},
        image = ${image ?? user.image},
        "updatedAt" = NOW()
    WHERE id = ${user.id}::uuid
  `;

  return NextResponse.json({ ok: true });
}
