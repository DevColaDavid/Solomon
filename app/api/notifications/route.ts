import { NextResponse } from "next/server";
import { getAuthorizedUser } from "@/lib/getUser";
import { db } from "@/lib/db";

export async function GET() {
  const auth = await getAuthorizedUser();
  if (!auth.ok) return NextResponse.json({ notifications: [] }, { status: auth.status });

  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const todayEnd   = new Date(now); todayEnd.setHours(23, 59, 59, 999);
  const tomorrowEnd = new Date(now); tomorrowEnd.setDate(now.getDate() + 1); tomorrowEnd.setHours(23, 59, 59, 999);

  const tasks = await db.task.findMany({
    where: {
      userId: auth.userId,
      status: { not: "DONE" },
      dueDate: { not: null, lte: tomorrowEnd },
    },
    include: { project: { select: { name: true, color: true } } },
    orderBy: { dueDate: "asc" },
  });

  const notifications = tasks.map(t => {
    const due = t.dueDate!;
    const type: "OVERDUE" | "DUE_TODAY" | "DUE_TOMORROW" =
      due < todayStart ? "OVERDUE" :
      due <= todayEnd  ? "DUE_TODAY" :
      "DUE_TOMORROW";

    return {
      id: t.id,
      type,
      title: t.title,
      projectName: t.project?.name ?? null,
      projectColor: t.project?.color ?? null,
      projectId: t.projectId,
      dueDate: t.dueDate!.toISOString(),
    };
  });

  return NextResponse.json({ notifications });
}
