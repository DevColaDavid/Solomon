import { NextResponse } from "next/server";
import { getAuthorizedUser } from "@/lib/getUser";
import { db } from "@/lib/db";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthorizedUser();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });

  const { id } = await params;
  const body = await req.json();

  const project = await db.project.update({
    where: { id, userId: auth.userId },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.color !== undefined && { color: body.color }),
      ...(body.description !== undefined && { description: body.description }),
    },
  });

  return NextResponse.json({ project });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthorizedUser();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });

  const { id } = await params;
  await db.project.delete({ where: { id, userId: auth.userId } });
  return NextResponse.json({ ok: true });
}
