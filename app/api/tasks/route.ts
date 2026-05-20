import { NextResponse } from "next/server";
import { getAuthorizedUser } from "@/lib/getUser";
import { db } from "@/lib/db";
import { Priority, TaskStatus } from "@prisma/client";
import { enrichAssignees, enrichOneTask } from "@/lib/enrichAssignees";
import { requireEditor } from "@/lib/getUser";

const TASK_INCLUDE = {
  project: true,
  subtasks: { orderBy: { createdAt: "asc" as const } },
  assignees: true,
};

export async function GET(req: Request) {
  const auth = await getAuthorizedUser();
  if (!auth.ok) return NextResponse.json({ tasks: [] }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const status = searchParams.get("status");

  const tasks = await db.task.findMany({
    where: {
      userId: auth.userId,
      ...(projectId ? { projectId } : {}),
      ...(status ? { status: status as TaskStatus } : {}),
    },
    include: TASK_INCLUDE,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ tasks: await enrichAssignees(tasks) });
}

export async function POST(req: Request) {
  const auth = await requireEditor();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });

  const { title, description, projectId, priority, dueDate, startDate, status } = await req.json();

  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  const task = await db.task.create({
    data: {
      title, description,
      userId: auth.userId,
      projectId,
      priority: (priority ?? "MEDIUM") as Priority,
      status: (status ?? "TODO") as TaskStatus,
      startDate: startDate ? new Date(startDate) : null,
      dueDate: dueDate ? new Date(dueDate) : null,
    },
    include: TASK_INCLUDE,
  });

  return NextResponse.json({ task: await enrichOneTask(task) });
}
