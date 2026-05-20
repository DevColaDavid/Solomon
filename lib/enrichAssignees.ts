import { db } from "@/lib/db";

type NeonUser = { id: string; name: string | null; email: string | null; image: string | null };

export async function enrichAssignees<T extends { assignees: { id: string; taskId: string; userId: string }[] }>(
  tasks: T[]
): Promise<(T & { assignees: (T["assignees"][number] & { user: NeonUser | null })[] })[]> {
  const userIds = [...new Set(tasks.flatMap(t => t.assignees?.map(a => a.userId) ?? []))];
  if (!userIds.length) return tasks as any; // skip DB round-trip when no assignees

  const users = await db.$queryRaw<NeonUser[]>`
    SELECT id::text, name, email, image FROM neon_auth.user WHERE id::text = ANY(${userIds})
  `;
  const map = Object.fromEntries(users.map(u => [u.id, u]));

  return tasks.map(t => ({
    ...t,
    assignees: t.assignees.map(a => ({ ...a, user: map[a.userId] ?? null })),
  })) as any;
}

export async function enrichOneTask<T extends { assignees: { id: string; taskId: string; userId: string }[] }>(
  task: T
): Promise<T & { assignees: (T["assignees"][number] & { user: NeonUser | null })[] }> {
  const [enriched] = await enrichAssignees([task]);
  return enriched;
}
