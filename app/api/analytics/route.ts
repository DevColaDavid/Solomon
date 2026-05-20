import { NextResponse } from "next/server";
import { getAuthorizedUser } from "@/lib/getUser";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const auth = await getAuthorizedUser();
  if (!auth.ok) return NextResponse.json({}, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const days       = searchParams.get("period") === "30d" ? 30 : 7;
  const scope      = searchParams.get("scope") ?? "own";      // own | org
  const targetUser = searchParams.get("userId");              // specific user (admin only)

  // Determine whose data to pull
  const orgMode = auth.isAdmin && scope === "org";
  const viewUserId = auth.isAdmin && targetUser ? targetUser
    : orgMode ? null
    : auth.userId;

  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);

  const sprintWhere = {
    mode: "FOCUS" as const,
    createdAt: { gte: since },
    ...(viewUserId ? { userId: viewUserId } : {}),
  };

  const taskWhere = viewUserId ? { userId: viewUserId } : {};

  const [sprints, tasks] = await Promise.all([
    db.sprintSession.findMany({
      where: sprintWhere,
      include: { project: { select: { id: true, name: true, color: true } } },
    }),
    db.task.findMany({ where: taskWhere, select: { status: true } }),
  ]);

  // Day buckets
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

  // Org-mode: per-user breakdown
  let userBreakdown: { userId: string; name: string | null; email: string | null; image: string | null; totalMinutes: number; sessions: number }[] = [];

  if (orgMode) {
    userBreakdown = await db.$queryRaw`
      SELECT
        ss."userId",
        u.name,
        u.email,
        u.image::text,
        CAST(SUM(ss.duration) AS int) AS "totalMinutes",
        CAST(COUNT(*) AS int) AS sessions
      FROM sprint_sessions ss
      LEFT JOIN neon_auth.user u ON u.id::text = ss."userId"
      WHERE ss.mode::text = 'FOCUS' AND ss."createdAt" >= ${since}
      GROUP BY ss."userId", u.name, u.email, u.image
      ORDER BY "totalMinutes" DESC
    `;
  }

  return NextResponse.json({
    focusByDay: Object.entries(focusByDay).map(([date, minutes]) => ({ date, minutes })),
    totalFocusMinutes: sprints.reduce((sum, s) => sum + s.duration, 0),
    totalSessions: sprints.length,
    projectBreakdown: Object.values(projectMap).sort((a, b) => b.minutes - a.minutes),
    tasksByStatus,
    userBreakdown,
    orgMode,
    sprintSessions: sprints
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map(s => ({
        id: s.id,
        duration: s.duration,
        taskName: s.taskName,
        projectName: s.project?.name ?? null,
        projectColor: s.project?.color ?? null,
        createdAt: s.createdAt.toISOString(),
        userId: s.userId,
      })),
  });
}
