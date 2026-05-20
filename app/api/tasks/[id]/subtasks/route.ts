import { NextResponse } from "next/server";
import { getAuthorizedUser, requireEditor } from "@/lib/getUser";
import { db } from "@/lib/db";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireEditor();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });

  const { id } = await params;
  const body = await req.json();

  // Batch creation: { titles: string[] }
  if (Array.isArray(body.titles)) {
    await db.subtask.createMany({
      data: body.titles.filter((t: string) => t.trim()).map((title: string) => ({ title, taskId: id })),
    });
    const subtasks = await db.subtask.findMany({ where: { taskId: id }, orderBy: { createdAt: "asc" } });
    return NextResponse.json({ subtasks });
  }

  const subtask = await db.subtask.create({
    data: { title: body.title, taskId: id, description: body.description ?? null },
  });
  return NextResponse.json({ subtask });
}

export async function PATCH(req: Request) {
  const auth = await requireEditor();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });

  const { subtaskId, completed, title, description } = await req.json();
  const subtask = await db.subtask.update({
    where: { id: subtaskId },
    data: {
      ...(completed !== undefined && { completed }),
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
    },
  });
  return NextResponse.json({ subtask });
}

export async function DELETE(req: Request) {
  const auth = await requireEditor();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });

  const { subtaskId } = await req.json();
  await db.subtask.delete({ where: { id: subtaskId } });
  return NextResponse.json({ ok: true });
}
