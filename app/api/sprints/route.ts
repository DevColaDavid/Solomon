import { NextResponse } from "next/server";
import { getAuthorizedUser } from "@/lib/getUser";
import { db } from "@/lib/db";

export async function GET() {
  const auth = await getAuthorizedUser();
  if (!auth.ok) return NextResponse.json({ sprints: [] }, { status: auth.status });

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const sprints = await db.sprintSession.findMany({
    where: { userId: auth.userId, createdAt: { gte: today }, mode: "FOCUS" },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ sprints });
}

export async function POST(req: Request) {
  const auth = await getAuthorizedUser();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });

  const { taskName, projectId, duration, mode } = await req.json();
  const sprint = await db.sprintSession.create({
    data: { taskName: taskName || null, projectId: projectId || null, duration, mode: mode ?? "FOCUS", userId: auth.userId },
  });

  return NextResponse.json({ sprint });
}
