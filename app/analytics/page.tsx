"use client";

import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface AnalyticsData {
  focusByDay: { date: string; minutes: number }[];
  totalFocusMinutes: number;
  totalSessions: number;
  projectBreakdown: { name: string; color: string; minutes: number }[];
  tasksByStatus: { TODO: number; IN_PROGRESS: number; IN_REVIEW: number; DONE: number };
}

function BarChart({ data }: { data: { date: string; minutes: number }[] }) {
  const max = Math.max(...data.map(d => d.minutes), 1);
  const show30 = data.length > 7;

  return (
    <div className="flex items-end gap-0.5 h-20">
      {data.map(({ date, minutes }) => {
        const pct = minutes / max;
        const [y, m, d] = date.split("-").map(Number);
        const label = show30
          ? (d === 1 || d % 7 === 0 ? String(d) : "")
          : new Date(y, m - 1, d).toLocaleDateString("en", { weekday: "short" })[0];

        return (
          <div key={date} className="flex flex-col items-center gap-1 flex-1 min-w-0">
            <div
              className="w-full rounded-t-sm transition-all duration-500"
              style={{
                height: `${Math.max(pct * 64, minutes > 0 ? 3 : 0)}px`,
                backgroundColor: minutes > 0 ? "#06b6d4" : "rgba(255,255,255,0.05)",
              }}
              title={`${minutes}min`}
            />
            {label && <span className="text-[8px] text-zinc-700 leading-none">{label}</span>}
          </div>
        );
      })}
    </div>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: "cyan" | "emerald" | "blue" | "zinc" }) {
  const colors = { cyan: "text-cyan-400", emerald: "text-emerald-400", blue: "text-blue-400", zinc: "text-zinc-300" };
  return (
    <div className="bg-[#111116] border border-white/[0.07] rounded-2xl p-4">
      <p className="text-[10px] text-zinc-600 mb-2">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${colors[color]}`}>{value}</p>
      <p className="text-[10px] text-zinc-700 mt-1">{sub}</p>
    </div>
  );
}

const TASK_COLS = [
  { key: "TODO",        label: "To Do",       color: "#71717a" },
  { key: "IN_PROGRESS", label: "In Progress",  color: "#60a5fa" },
  { key: "IN_REVIEW",   label: "In Review",    color: "#a78bfa" },
  { key: "DONE",        label: "Done",         color: "#34d399" },
] as const;

export default function AnalyticsPage() {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [period, setPeriod] = useState<"7d" | "30d">("7d");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isPending && !session) router.push("/login");
  }, [session, isPending, router]);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/analytics?period=${period}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [period]);

  if (!isPending && !session) return null;

  const hours = data ? Math.floor(data.totalFocusMinutes / 60) : 0;
  const mins = data ? data.totalFocusMinutes % 60 : 0;
  const totalTasks = data ? Object.values(data.tasksByStatus).reduce((a, b) => a + b, 0) : 0;
  const maxProject = data?.projectBreakdown[0]?.minutes ?? 1;

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100">
      <header className="flex items-center gap-4 px-5 py-3.5 border-b border-white/[0.05] sticky top-0 bg-[#09090b]/90 backdrop-blur-sm z-10">
        <Link href="/dashboard" className="text-zinc-600 hover:text-zinc-300 transition-colors text-sm flex-shrink-0">
          ← Dashboard
        </Link>
        <h1 className="text-sm font-semibold text-zinc-100 flex-1">Analytics</h1>
        <div className="flex gap-1 p-1 bg-white/[0.03] rounded-xl">
          {(["7d", "30d"] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1 text-[10px] font-semibold rounded-lg transition-all ${
                period === p ? "bg-white/[0.08] text-zinc-100" : "text-zinc-600 hover:text-zinc-400"
              }`}>
              {p === "7d" ? "7 days" : "30 days"}
            </button>
          ))}
        </div>
      </header>

      <div className="max-w-3xl mx-auto p-4 md:p-6 flex flex-col gap-5">

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="Focus Time"
            value={data ? `${hours}h ${mins}m` : "—"}
            sub={`${data?.totalSessions ?? 0} sessions`}
            color="cyan"
          />
          <StatCard
            label="Done"
            value={data ? String(data.tasksByStatus.DONE) : "—"}
            sub="tasks completed"
            color="emerald"
          />
          <StatCard
            label="In Progress"
            value={data ? String(data.tasksByStatus.IN_PROGRESS) : "—"}
            sub="tasks active"
            color="blue"
          />
          <StatCard
            label="Queued"
            value={data ? String(data.tasksByStatus.TODO) : "—"}
            sub="tasks to do"
            color="zinc"
          />
        </div>

        {/* Focus time bar chart */}
        <div className="bg-[#111116] border border-white/[0.07] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold text-zinc-400">Daily Focus Time</p>
            {data && (
              <p className="text-[10px] text-zinc-600">
                avg {data.focusByDay.length > 0 ? Math.round(data.totalFocusMinutes / data.focusByDay.length) : 0}min/day
              </p>
            )}
          </div>
          {loading
            ? <div className="h-20 rounded-xl bg-white/[0.03] animate-pulse" />
            : data ? <BarChart data={data.focusByDay} />
            : <p className="text-xs text-zinc-700 text-center h-20 flex items-center justify-center">No data</p>
          }
        </div>

        {/* Task pipeline */}
        <div className="bg-[#111116] border border-white/[0.07] rounded-2xl p-5">
          <p className="text-xs font-semibold text-zinc-400 mb-4">Task Pipeline</p>
          {loading
            ? <div className="h-16 rounded-xl bg-white/[0.03] animate-pulse" />
            : (
              <div className="flex flex-col gap-3">
                {TASK_COLS.map(({ key, label, color }) => {
                  const count = data?.tasksByStatus[key] ?? 0;
                  const pct = totalTasks > 0 ? (count / totalTasks) * 100 : 0;
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                      <span className="text-xs text-zinc-500 w-20 flex-shrink-0">{label}</span>
                      <div className="flex-1 h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, backgroundColor: color }} />
                      </div>
                      <span className="text-xs font-semibold text-zinc-300 w-6 text-right flex-shrink-0">{count}</span>
                      <span className="text-[10px] text-zinc-700 w-8 text-right flex-shrink-0">{Math.round(pct)}%</span>
                    </div>
                  );
                })}
              </div>
            )
          }
        </div>

        {/* Project focus breakdown */}
        {!loading && data && data.projectBreakdown.length > 0 && (
          <div className="bg-[#111116] border border-white/[0.07] rounded-2xl p-5">
            <p className="text-xs font-semibold text-zinc-400 mb-4">Focus by Project</p>
            <div className="flex flex-col gap-3">
              {data.projectBreakdown.map(p => (
                <div key={p.name} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                  <span className="text-xs text-zinc-400 w-28 truncate flex-shrink-0">{p.name}</span>
                  <div className="flex-1 h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${(p.minutes / maxProject) * 100}%`, backgroundColor: p.color }} />
                  </div>
                  <span className="text-[10px] text-zinc-600 w-12 text-right flex-shrink-0">{p.minutes}m</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && data && data.projectBreakdown.length === 0 && data.totalSessions === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-xl">📊</div>
            <p className="text-sm text-zinc-400">No focus sessions yet</p>
            <p className="text-xs text-zinc-600">Complete a sprint in the Chrono Matrix to see stats here</p>
          </div>
        )}
      </div>
    </div>
  );
}
