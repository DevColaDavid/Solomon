import { NextResponse } from "next/server";
import { getAuthorizedUser } from "@/lib/getUser";
import { db } from "@/lib/db";

const TASK_INCLUDE = {
  project: true,
  subtasks: { orderBy: { createdAt: "asc" as const } },
  assignees: true,
};

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthorizedUser();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });

  const { id } = await params;
  const task = await db.task.findUnique({ where: { id, userId: auth.userId }, include: TASK_INCLUDE });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ task });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthorizedUser();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });

  const { id } = await params;
  const body = await req.json();

  const task = await db.task.update({
    where: { id, userId: auth.userId },
    data: {
      ...(body.title !== undefined     && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.status !== undefined    && { status: body.status }),
      ...(body.priority !== undefined  && { priority: body.priority }),
      // projectId cannot be unset — tasks must belong to a project
      ...(body.projectId && { projectId: body.projectId }),
      ...(body.startDate !== undefined && { startDate: body.startDate ? new Date(body.startDate) : null }),
      ...(body.dueDate !== undefined   && { dueDate: body.dueDate ? new Date(body.dueDate) : null }),
    },
    include: TASK_INCLUDE,
  });

  return NextResponse.json({ task });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthorizedUser();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });

  const { id } = await params;
  await db.task.delete({ where: { id, userId: auth.userId } });
  return NextResponse.json({ ok: true });
}
