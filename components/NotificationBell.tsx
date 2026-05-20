"use client";

import { useEffect, useRef, useState, useCallback } from "react";

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
  OVERDUE:      { label: "Overdue",    dot: "bg-red-500",    text: "text-red-400" },
  DUE_TODAY:    { label: "Due today",  dot: "bg-amber-400",  text: "text-amber-400" },
  DUE_TOMORROW: { label: "Due tomorrow", dot: "bg-zinc-500", text: "text-zinc-500" },
};

const DISMISSED_KEY = "solomon-dismissed-notifs";

function getDismissed(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? "[]")); }
  catch { return new Set(); }
}
function addDismissed(id: string) {
  const s = getDismissed(); s.add(id);
  localStorage.setItem(DISMISSED_KEY, JSON.stringify([...s]));
}

interface Props {
  onSelectProject: (id: string) => void;
}

export default function NotificationBell({ onSelectProject }: Props) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setDismissed(getDismissed());
    } catch {}
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 5 * 60 * 1000);
    // Sync dismissed state when notifications page updates localStorage
    function onStorage(e: StorageEvent) {
      if (e.key === DISMISSED_KEY) setDismissed(getDismissed());
    }
    window.addEventListener("storage", onStorage);
    return () => { clearInterval(id); window.removeEventListener("storage", onStorage); };
  }, [load]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const visible = notifications.filter(n => !dismissed.has(n.id));
  const urgent  = visible.filter(n => n.type === "OVERDUE" || n.type === "DUE_TODAY");

  function dismiss(id: string) {
    addDismissed(id);
    setDismissed(getDismissed());
  }

  function dismissAll() {
    visible.forEach(n => addDismissed(n.id));
    setDismissed(getDismissed());
    setOpen(false);
  }

  function handleGoTo(n: Notification) {
    onSelectProject(n.projectId);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        onClick={() => setOpen(v => !v)}
        title="Notifications"
        className={`relative w-8 h-8 flex items-center justify-center rounded-xl transition-all ${
          open ? "bg-white/[0.08] text-zinc-200" : "text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.05]"
        }`}
      >
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
          <path d="M7.5 1.5C5.015 1.5 3 3.515 3 6v3.5L1.5 11h12L12 9.5V6c0-2.485-2.015-4.5-4.5-4.5Z"
            stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
          <path d="M6 11.5a1.5 1.5 0 0 0 3 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
        {urgent.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center leading-none">
            {urgent.length > 9 ? "9+" : urgent.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-72 bg-[#111116] border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/60 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05]">
            <span className="text-xs font-semibold text-zinc-300">Notifications</span>
            {visible.length > 0 && (
              <button onClick={dismissAll} className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors">
                Clear all
              </button>
            )}
          </div>

          {visible.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center px-4">
              <span className="text-lg">✓</span>
              <p className="text-xs text-zinc-600">All caught up</p>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {visible.map(n => {
                const meta = TYPE_META[n.type];
                const due = new Date(n.dueDate);
                const dateLabel = due.toLocaleDateString("en", { month: "short", day: "numeric" });
                return (
                  <div key={n.id} className="flex items-start gap-3 px-4 py-3 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${meta.dot}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-zinc-200 truncate leading-snug">{n.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {n.projectColor && (
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: n.projectColor }} />
                        )}
                        {n.projectName && <span className="text-[10px] text-zinc-600 truncate">{n.projectName}</span>}
                        <span className={`text-[10px] font-medium ${meta.text}`}>{meta.label} · {dateLabel}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <button onClick={() => handleGoTo(n)}
                        className="text-[10px] text-zinc-600 hover:text-cyan-400 transition-colors leading-none">→</button>
                      <button onClick={() => dismiss(n.id)}
                        className="text-[10px] text-zinc-700 hover:text-zinc-400 transition-colors leading-none">×</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="px-4 py-2.5 border-t border-white/[0.05]">
            <a href="/notifications" onClick={() => setOpen(false)}
              className="text-[11px] text-zinc-600 hover:text-cyan-400 transition-colors w-full text-center block">
              View all notifications →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
