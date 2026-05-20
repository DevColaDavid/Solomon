import { NextResponse } from "next/server";
import { getAuthorizedUser } from "@/lib/getUser";
import { db } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };
type NeonUser = { id: string; name: string | null; email: string | null; image: string | null };

export async function GET(req: Request, { params }: Ctx) {
  const auth = await getAuthorizedUser();
  if (!auth.ok) return NextResponse.json({ members: [] }, { status: auth.status });
  const { id } = await params;

  try {
    const members = await db.$queryRaw<(NeonUser & { memberId: string; userId: string })[]>`
      SELECT pm.id AS "memberId", pm."userId", u.name, u.email, u.image::text
      FROM "public"."project_members" pm
      LEFT JOIN neon_auth.user u ON u.id::text = pm."userId"
      WHERE pm."projectId" = ${id}
      ORDER BY pm."createdAt" ASC
    `;
    return NextResponse.json({ members });
  } catch {
    // Table doesn't exist yet — run: npx prisma db push
    return NextResponse.json({ members: [] });
  }
}

export async function POST(req: Request, { params }: Ctx) {
  const auth = await getAuthorizedUser();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });
  const { id } = await params;

  if (!auth.canEdit) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const project = await db.project.findFirst({ where: { id } });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { email } = await req.json();
  if (!email?.includes("@")) return NextResponse.json({ error: "Invalid email" }, { status: 400 });

  const users = await db.$queryRaw<(NeonUser & { id: string })[]>`
    SELECT id::text, name, email, image FROM neon_auth.user WHERE email = ${email} LIMIT 1
  `;
  if (users.length === 0) return NextResponse.json({ error: "User not found" }, { status: 404 });

  try {
    await db.projectMember.create({ data: { projectId: id, userId: users[0].id } });
  } catch {
    return NextResponse.json({ error: "Migration needed — run: npx prisma db push" }, { status: 503 });
  }

  return NextResponse.json({ member: { userId: users[0].id, ...users[0] } });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const auth = await getAuthorizedUser();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });
  const { id } = await params;
  const { userId } = await req.json();

  try {
    await db.projectMember.deleteMany({ where: { projectId: id, userId } });
  } catch {}
  return NextResponse.json({ ok: true });
}
