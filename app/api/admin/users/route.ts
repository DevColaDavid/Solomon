import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/getUser";
import { db } from "@/lib/db";

// Neon Auth stores users in the neon_auth schema — query it directly
async function listNeonAuthUsers() {
  try {
    const users = await db.$queryRaw<
      { id: string; email: string; name: string | null; image: string | null }[]
    >`SELECT id, email, name, image FROM neon_auth.user ORDER BY "createdAt" ASC`;
    return users;
  } catch {
    return [];
  }
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status });

  const users = await listNeonAuthUsers();
  return NextResponse.json({ users });
}

export async function DELETE(req: Request) {
  const authResult = await requireAdmin();
  if (!authResult.ok) return NextResponse.json({ error: "Forbidden" }, { status: authResult.status });

  const { userId } = await req.json();
  try {
    // Delete from neon_auth schema — cascades to sessions/accounts
    await db.$executeRaw`DELETE FROM neon_auth.user WHERE id = ${userId}`;
    // Also clean up our app data
    await db.task.deleteMany({ where: { userId } });
    await db.project.deleteMany({ where: { userId } });
    await db.sprintSession.deleteMany({ where: { userId } });
  } catch (e) {
    console.error("Delete user error:", e);
    return NextResponse.json({ error: "Could not delete user" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
