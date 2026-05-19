import { NextResponse } from "next/server";
import { getAuthorizedUser } from "@/lib/getUser";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const auth = await getAuthorizedUser();
  if (!auth.ok) return NextResponse.json({}, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const days = searchParams.get("period") === "30d" ? 30 : 7;

  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);

  const [sprints, tasks] = await Promise.all([
    db.sprintSession.findMany({
      where: { userId: auth.userId, mode: "FOCUS", createdAt: { gte: since } },
      include: { project: { select: { id: true, name: true, color: true } } },
    }),
    db.task.findMany({
      where: { userId: auth.userId },
      select: { status: true },
    }),
  ]);

  // Build day buckets (UTC dates)
  const focusByDay: Record<string, number> = {};
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    focusByDay[d.toISOString().slice(0, 10)] = 0;
  }
  for (const s of sprints) {
    const key = s.createdAt.toISOString().slice(0, 10);
    if (key in focusByDay) focusByDay[key] += s.duration;
  }

  // Project breakdown
  const projectMap: Record<string, { name: string; color: string; minutes: number }> = {};
  for (const s of sprints) {
    if (!s.project) continue;
    const { id, name, color } = s.project;
    if (!projectMap[id]) projectMap[id] = { name, color, minutes: 0 };
    projectMap[id].minutes += s.duration;
  }

  // Task status counts
  const tasksByStatus = { TODO: 0, IN_PROGRESS: 0, IN_REVIEW: 0, DONE: 0 };
  for (const t of tasks) {
    const k = t.status as keyof typeof tasksByStatus;
    if (k in tasksByStatus) tasksByStatus[k]++;
  }

  return NextResponse.json({
    focusByDay: Object.entries(focusByDay).map(([date, minutes]) => ({ date, minutes })),
    totalFocusMinutes: sprints.reduce((sum, s) => sum + s.duration, 0),
    totalSessions: sprints.length,
    projectBreakdown: Object.values(projectMap).sort((a, b) => b.minutes - a.minutes),
    tasksByStatus,
  });
}
