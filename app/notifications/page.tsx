"use client";

import { useEffect, useState, useCallback } from "react";
import { authClient } from "@/lib/auth/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Notification {
  id: string;
  type: "OVERDUE" | "DUE_TODAY" | "DUE_TOMORROW";
  title: string;
  projectName: string | null;
  projectColor: string | null;
  projectId: string;
  dueDate: string;
}

const TYPE_META = {
  OVERDUE:      { label: "Overdue",      dot: "bg-red-500",    text: "text-red-400",   bg: "bg-red-500/[0.06] border-red-500/20" },
  DUE_TODAY:    { label: "Due today",    dot: "bg-amber-400",  text: "text-amber-400", bg: "bg-amber-500/[0.06] border-amber-500/20" },
  DUE_TOMORROW: { label: "Due tomorrow", dot: "bg-zinc-500",   text: "text-zinc-400",  bg: "bg-white/[0.03] border-white/[0.07]" },
};

const DISMISSED_KEY = "solomon-dismissed-notifs";
function getDismissed(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? "[]")); } catch { return new Set(); }
}
function saveDismissed(s: Set<string>) {
  localStorage.setItem(DISMISSED_KEY, JSON.stringify([...s]));
  window.dispatchEvent(new StorageEvent("storage", { key: DISMISSED_KEY }));
}

export default function NotificationsPage() {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (!isPending && !session) router.push("/login"); }, [session, isPending, router]);

  useEffect(() => {
    fetch("/api/notifications")
      .then(r => r.ok ? r.json() : { notifications: [] })
      .then(d => setNotifications(d.notifications ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
    setDismissed(getDismissed());
  }, []);

  const dismiss = useCallback((id: string) => {
    const s = getDismissed(); s.add(id); saveDismissed(s); setDismissed(new Set(s));
  }, []);

  const dismissAll = useCallback(() => {
    const s = getDismissed();
    notifications.forEach(n => s.add(n.id));
    saveDismissed(s); setDismissed(new Set(s));
  }, [notifications]);

  if (!isPending && !session) return null;

  const groups: Record<string, Notification[]> = { OVERDUE: [], DUE_TODAY: [], DUE_TOMORROW: [] };
  for (const n of notifications) {
    if (!dismissed.has(n.id)) groups[n.type]?.push(n);
  }
  const total = Object.values(groups).flat().length;

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100">
      <header className="sticky top-0 z-10 border-b border-white/[0.05] bg-[#09090b]/80 backdrop-blur-md" style={{ padding: '1rem 2rem' }}>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-300 transition-colors">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M7.5 2L3.5 6l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Dashboard
          </Link>
          <div className="w-px h-4 bg-white/[0.08]" />
          <h1 className="text-sm font-semibold flex-1">Notifications</h1>
          {total > 0 && (
            <button onClick={dismissAll}
              className="text-xs text-zinc-600 hover:text-zinc-300 transition-colors">
              Clear all ({total})
            </button>
          )}
        </div>
      </header>

      <div style={{ padding: '2rem', maxWidth: '48rem', margin: '0 auto' }}>
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-5 h-5 rounded-full border-2 border-cyan-500/30 border-t-cyan-400 animate-spin" />
          </div>
        ) : total === 0 ? (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center text-2xl">✓</div>
            <p className="text-sm font-medium text-zinc-300">All caught up</p>
            <p className="text-xs text-zinc-600">No overdue or upcoming tasks</p>
            <Link href="/dashboard" className="mt-2 text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
              Back to dashboard →
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {(["OVERDUE", "DUE_TODAY", "DUE_TOMORROW"] as const).map(type => {
              const group = groups[type];
              if (group.length === 0) return null;
              const meta = TYPE_META[type];
              return (
                <div key={type}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-2 h-2 rounded-full ${meta.dot}`} />
                    <span className={`text-xs font-semibold uppercase tracking-wider ${meta.text}`}>{meta.label}</span>
                    <span className="text-xs text-zinc-700">({group.length})</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {group.map(n => {
                      const due = new Date(n.dueDate);
                      return (
                        <div key={n.id} className={`flex items-center gap-4 rounded-2xl border ${meta.bg}`} style={{ padding: '1rem 1.25rem' }}>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-zinc-100 truncate">{n.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {n.projectColor && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: n.projectColor }} />}
                              <span className="text-xs text-zinc-500">{n.projectName}</span>
                              <span className="text-xs text-zinc-700">·</span>
                              <span className={`text-xs ${meta.text}`}>
                                {due.toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" })}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={() => { router.push(`/dashboard`); }}
                              className="text-xs px-3 py-1.5 rounded-xl border border-white/[0.08] text-zinc-400 hover:text-zinc-100 hover:border-white/[0.2] transition-all">
                              Go to project
                            </button>
                            <button onClick={() => dismiss(n.id)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-700 hover:text-zinc-400 hover:bg-white/[0.05] transition-all">
                              ×
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
