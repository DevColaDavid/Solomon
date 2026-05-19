"use client";

import { useState, useEffect, useRef } from "react";
import type { Task, Subtask } from "@/types";

const STATUSES = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"] as const;
const STATUS_LABELS: Record<string, string> = {
  TODO: "To Do", IN_PROGRESS: "In Progress", IN_REVIEW: "In Review", DONE: "Done",
};
const PRIORITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;
const PRIORITY_STYLE: Record<string, string> = {
  CRITICAL: "bg-red-500/15 text-red-400 border-red-500/25",
  HIGH:     "bg-orange-500/15 text-orange-400 border-orange-500/25",
  MEDIUM:   "bg-amber-500/15 text-amber-400 border-amber-500/25",
  LOW:      "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
};

interface Props {
  task: Task | null;
  onClose: () => void;
  onUpdate: (updated: Task) => void;
  onDelete: (id: string) => void;
}

function Avatar({ name, image }: { name: string | null; image: string | null }) {
  const initials = name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() ?? "?";
  return image
    ? <img src={image} alt={name ?? ""} className="w-7 h-7 rounded-full object-cover ring-2 ring-[#0d1117]" />
    : <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500/50 to-violet-500/50 flex items-center justify-center text-[10px] font-bold text-white ring-2 ring-[#0d1117]">{initials}</div>;
}

export default function TaskModal({ task, onClose, onUpdate, onDelete }: Props) {
  const [editing, setEditing] = useState<Partial<Task>>({});
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtask, setNewSubtask] = useState("");
  const [saving, setSaving] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (task) {
      setEditing({});
      setSubtasks(task.subtasks ?? []);
    }
  }, [task?.id]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!task) return null;

  const merged = { ...task, ...editing };

  async function save(patch: Partial<Task>) {
    setSaving(true);
    const res = await fetch(`/api/tasks/${task!.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    onUpdate(data.task);
    setSaving(false);
  }

  function field<K extends keyof Task>(key: K, val: Task[K]) {
    setEditing(prev => ({ ...prev, [key]: val }));
  }

  async function commitField<K extends keyof Task>(key: K) {
    if (editing[key] === undefined) return;
    await save({ [key]: editing[key] } as Partial<Task>);
  }

  async function addSubtask(e: React.FormEvent) {
    e.preventDefault();
    if (!newSubtask.trim()) return;
    const res = await fetch(`/api/tasks/${task!.id}/subtasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newSubtask.trim() }),
    });
    const data = await res.json();
    setSubtasks(prev => [...prev, data.subtask]);
    setNewSubtask("");
  }

  async function toggleSubtask(subtask: Subtask) {
    await fetch(`/api/tasks/${task!.id}/subtasks`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subtaskId: subtask.id, completed: !subtask.completed }),
    });
    setSubtasks(prev => prev.map(s => s.id === subtask.id ? { ...s, completed: !s.completed } : s));
  }

  async function deleteSubtask(subtaskId: string) {
    await fetch(`/api/tasks/${task!.id}/subtasks`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subtaskId }),
    });
    setSubtasks(prev => prev.filter(s => s.id !== subtaskId));
  }

  const completedSubtasks = subtasks.filter(s => s.completed).length;

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm"
    >
      <div className="w-full max-w-xl h-full bg-[#0d1117] border-l border-white/[0.07] flex flex-col overflow-hidden animate-[slideIn_0.2s_ease]">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-white/[0.06]">
          <div className="flex-1 min-w-0 pr-4">
            <textarea
              value={merged.title}
              onChange={(e) => field("title", e.target.value)}
              onBlur={() => commitField("title")}
              className="w-full text-lg font-semibold text-zinc-100 bg-transparent outline-none resize-none leading-snug placeholder-zinc-700"
              rows={2}
            />
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {saving && <div className="w-3 h-3 rounded-full border border-cyan-500/40 border-t-cyan-400 animate-spin" />}
            <button onClick={() => { onDelete(task.id); onClose(); }}
              className="text-xs text-zinc-700 hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-red-500/10">
              Delete
            </button>
            <button onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-600 hover:text-zinc-200 hover:bg-white/[0.06] transition-all text-lg leading-none">
              ×
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">

          {/* Project breadcrumb */}
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: task.project.color }} />
            <span className="text-xs font-semibold text-zinc-400">{task.project.name}</span>
            <span className="text-zinc-700">›</span>
            <span className="text-xs text-zinc-600 truncate">{merged.title ?? task.title}</span>
          </div>

          {/* Status + Priority row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider block mb-1.5">Status</label>
              <select
                value={merged.status}
                onChange={(e) => { field("status", e.target.value as Task["status"]); save({ status: e.target.value as Task["status"] }); }}
                className="w-full bg-[#111116] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-zinc-200 outline-none appearance-none cursor-pointer"
              >
                {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider block mb-1.5">Priority</label>
              <select
                value={merged.priority}
                onChange={(e) => { field("priority", e.target.value as Task["priority"]); save({ priority: e.target.value as Task["priority"] }); }}
                className="w-full bg-[#111116] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-zinc-200 outline-none appearance-none cursor-pointer"
              >
                {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>)}
              </select>
            </div>
          </div>

          {/* Priority badge preview */}
          <div className="flex gap-2 flex-wrap">
            {PRIORITIES.map(p => (
              <button key={p} onClick={() => save({ priority: p })}
                className={`text-[11px] font-semibold px-3 py-1 rounded-full border transition-all ${
                  merged.priority === p ? PRIORITY_STYLE[p] : "bg-transparent text-zinc-700 border-white/[0.06] hover:border-white/[0.12]"
                }`}>
                {p.charAt(0) + p.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider block mb-1.5">Start Date</label>
              <input type="date"
                value={merged.startDate ? new Date(merged.startDate).toISOString().slice(0, 10) : ""}
                onChange={(e) => field("startDate", e.target.value || null)}
                onBlur={() => commitField("startDate")}
                className="w-full bg-[#111116] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-zinc-300 outline-none focus:border-cyan-500/40 transition-colors"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider block mb-1.5">Due Date</label>
              <input type="date"
                value={merged.dueDate ? new Date(merged.dueDate).toISOString().slice(0, 10) : ""}
                onChange={(e) => field("dueDate", e.target.value || null)}
                onBlur={() => commitField("dueDate")}
                className="w-full bg-[#111116] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-zinc-300 outline-none focus:border-cyan-500/40 transition-colors"
              />
            </div>
          </div>

          {/* Assignees */}
          {task.assignees.length > 0 && (
            <div>
              <label className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider block mb-2">Contributors</label>
              <div className="flex gap-2 flex-wrap">
                {task.assignees.map(a => (
                  <div key={a.id} className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.06] rounded-lg px-2.5 py-1.5">
                    <Avatar name={a.user.name} image={a.user.image} />
                    <span className="text-xs text-zinc-400">{a.user.name ?? a.user.email}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider block mb-1.5">Description</label>
            <textarea
              value={merged.description ?? ""}
              onChange={(e) => field("description", e.target.value)}
              onBlur={() => commitField("description")}
              placeholder="Add a description..."
              rows={4}
              className="w-full bg-[#111116] border border-white/[0.07] focus:border-cyan-500/30 rounded-xl px-3.5 py-3 text-sm text-zinc-300 placeholder-zinc-700 outline-none resize-none transition-colors"
            />
          </div>

          {/* Subtasks */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">
                Subtasks
              </label>
              {subtasks.length > 0 && (
                <span className="text-[10px] text-zinc-600">
                  {completedSubtasks}/{subtasks.length} done
                </span>
              )}
            </div>

            {/* Progress bar */}
            {subtasks.length > 0 && (
              <div className="h-1 bg-white/[0.05] rounded-full mb-3 overflow-hidden">
                <div
                  className="h-full bg-cyan-400 rounded-full transition-all duration-300"
                  style={{ width: `${(completedSubtasks / subtasks.length) * 100}%` }}
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5 mb-3">
              {subtasks.map((st) => (
                <div key={st.id} className="group flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/[0.03] transition-colors">
                  <button
                    onClick={() => toggleSubtask(st)}
                    className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-all ${
                      st.completed ? "bg-cyan-500/30 border-cyan-500/50" : "border-white/20 hover:border-cyan-500/40"
                    }`}
                  >
                    {st.completed && (
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                        <path d="M1 4l2 2 4-4" stroke="#06b6d4" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    )}
                  </button>
                  <span className={`text-sm flex-1 ${st.completed ? "line-through text-zinc-600" : "text-zinc-300"}`}>
                    {st.title}
                  </span>
                  <button
                    onClick={() => deleteSubtask(st.id)}
                    className="opacity-0 group-hover:opacity-100 text-zinc-700 hover:text-red-400 transition-all text-xs"
                  >×</button>
                </div>
              ))}
            </div>

            <form onSubmit={addSubtask} className="flex gap-2">
              <input
                type="text" value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                placeholder="Add subtask..."
                className="flex-1 bg-[#111116] border border-white/[0.07] focus:border-cyan-500/30 rounded-xl px-3 py-2 text-sm text-zinc-300 placeholder-zinc-700 outline-none transition-colors"
              />
              <button type="submit" disabled={!newSubtask.trim()}
                className="px-3 py-2 text-xs font-semibold rounded-xl border border-white/[0.08] text-zinc-500 hover:text-zinc-200 hover:border-white/[0.15] transition-all disabled:opacity-30">
                Add
              </button>
            </form>
          </div>

          {/* Meta */}
          <div className="text-[10px] text-zinc-700 pt-2 border-t border-white/[0.04] flex flex-col gap-1">
            <span>Created {new Date(task.createdAt).toLocaleDateString("en", { month: "long", day: "numeric", year: "numeric" })}</span>
            <span>Updated {new Date(task.updatedAt).toLocaleDateString("en", { month: "long", day: "numeric", year: "numeric" })}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
