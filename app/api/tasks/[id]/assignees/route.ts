import { NextResponse } from "next/server";
import { getAuthorizedUser } from "@/lib/getUser";
import { db } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const auth = await getAuthorizedUser();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });
  const { id } = await params;
  const { userId } = await req.json();

  const task = await db.task.findFirst({ where: { id, userId: auth.userId } });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    await db.taskAssignee.create({ data: { taskId: id, userId } });
  } catch {} // ignore duplicate

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const auth = await getAuthorizedUser();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });
  const { id } = await params;
  const { userId } = await req.json();

  await db.taskAssignee.deleteMany({ where: { taskId: id, userId } });
  return NextResponse.json({ ok: true });
}
