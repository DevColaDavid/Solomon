"use client";

import { useEffect, useState, useRef, useCallback, useMemo, memo } from "react";
import dynamic from "next/dynamic";
import type { Task, Project } from "@/types";

const TaskModal = dynamic(() => import("@/components/kanban/TaskModal"), { ssr: false });
const CreateTaskModal = dynamic(() => import("@/components/kanban/CreateTaskModal"), { ssr: false });

type Status = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";

const COLUMNS: { id: Status; label: string; color: string; dot: string; accent: string; countColor: string }[] = [
  { id: "TODO",        label: "To Do",       color: "text-zinc-400",    dot: "bg-zinc-500",    accent: "border-zinc-500/30",    countColor: "text-zinc-500 bg-zinc-500/10" },
  { id: "IN_PROGRESS", label: "In Progress", color: "text-blue-400",    dot: "bg-blue-400",    accent: "border-blue-500/30",    countColor: "text-blue-400 bg-blue-500/10" },
  { id: "IN_REVIEW",   label: "In Review",   color: "text-violet-400",  dot: "bg-violet-400",  accent: "border-violet-500/30",  countColor: "text-violet-400 bg-violet-500/10" },
  { id: "DONE",        label: "Done",        color: "text-emerald-400", dot: "bg-emerald-400", accent: "border-emerald-500/30", countColor: "text-emerald-400 bg-emerald-500/10" },
];

const STATUS_ORDER: Status[] = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];

const PRIORITY_STYLE: Record<string, { badge: string; dot: string }> = {
  CRITICAL: { badge: "text-red-400 bg-red-500/10 border-red-500/20",         dot: "bg-red-400" },
  HIGH:     { badge: "text-orange-400 bg-orange-500/10 border-orange-500/20", dot: "bg-orange-400" },
  MEDIUM:   { badge: "text-amber-400 bg-amber-500/10 border-amber-500/20",   dot: "bg-amber-400" },
  LOW:      { badge: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", dot: "bg-emerald-400" },
};

const PRESET_COLORS = ["#06b6d4","#8b5cf6","#4ade80","#f59e0b","#f87171","#38bdf8","#fb923c","#a78bfa"];

const TaskCard = memo(function TaskCard({ task, onMove, onOpen, isDragging, onDragStart, onDragEnd }: {
  task: Task; onMove: (id: string, status: Status) => void; onOpen: (task: Task) => void;
  isDragging: boolean; onDragStart: () => void; onDragEnd: () => void;
}) {
  const currentIdx = STATUS_ORDER.indexOf(task.status);
  const pStyle = PRIORITY_STYLE[task.priority] ?? PRIORITY_STYLE.MEDIUM;
  const completedSubs = task.subtasks.filter(s => s.completed).length;
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "DONE";

  return (
    <div
      draggable
      onDragStart={e => { e.dataTransfer.setData("taskId", task.id); e.dataTransfer.effectAllowed = "move"; onDragStart(); }}
      onDragEnd={onDragEnd}
      onClick={() => onOpen(task)}
      className={`group relative bg-[#111116] border rounded-2xl p-4 cursor-pointer transition-all duration-150 select-none ${
        isDragging ? "opacity-30 scale-95 border-white/10 cursor-grabbing"
          : "border-white/[0.07] hover:border-white/[0.16] hover:shadow-xl hover:shadow-black/40 hover:-translate-y-0.5"
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${pStyle.badge}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${pStyle.dot}`} />
          {task.priority.charAt(0) + task.priority.slice(1).toLowerCase()}
        </span>
        <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
          {currentIdx > 0 && (
            <button onClick={() => onMove(task.id, STATUS_ORDER[currentIdx - 1])}
              className="w-5 h-5 flex items-center justify-center rounded-md bg-white/[0.05] hover:bg-white/[0.12] text-zinc-500 hover:text-zinc-200 transition-all text-xs">←</button>
          )}
          {currentIdx < STATUS_ORDER.length - 1 && (
            <button onClick={() => onMove(task.id, STATUS_ORDER[currentIdx + 1])}
              className="w-5 h-5 flex items-center justify-center rounded-md bg-white/[0.05] hover:bg-cyan-500/20 text-zinc-500 hover:text-cyan-400 transition-all text-xs">→</button>
          )}
        </div>
      </div>

      <p className={`text-sm font-medium leading-snug mb-3 ${task.status === "DONE" ? "line-through text-zinc-600" : "text-zinc-100"}`}>
        {task.title}
      </p>

      {task.description && (
        <p className="text-[11px] text-zinc-600 leading-relaxed mb-3 line-clamp-2">{task.description}</p>
      )}

      {task.subtasks.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-zinc-700">Subtasks</span>
            <span className="text-[10px] text-zinc-600">{completedSubs}/{task.subtasks.length}</span>
          </div>
          <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden">
            <div className="h-full bg-cyan-400/60 rounded-full transition-all"
              style={{ width: `${task.subtasks.length ? (completedSubs / task.subtasks.length) * 100 : 0}%` }} />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex -space-x-1.5">
          {task.assignees.slice(0, 3).map(a => (
            <div key={a.id} className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500/40 to-violet-500/40 ring-1 ring-[#111116] flex items-center justify-center text-[9px] font-bold text-white">
              {a.userId.charAt(0).toUpperCase()}
            </div>
          ))}
        </div>
        {task.dueDate && (
          <span className={`text-[10px] font-medium ${isOverdue ? "text-red-400" : "text-zinc-600"}`}>
            {isOverdue && "⚠ "}{new Date(task.dueDate).toLocaleDateString("en", { month: "short", day: "numeric" })}
          </span>
        )}
      </div>
    </div>
  );
});

// Inline edit state for project overview cards
const ProjectCard = memo(function ProjectCard({ project, onSelect, onUpdate, onDelete }: {
  project: Project; onSelect: () => void;
  onUpdate: (id: string, data: { name: string; color: string; description: string }) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: project.name, color: project.color, description: project.description ?? "" });
  const [saving, setSaving] = useState(false);

  const open = project.tasks?.filter(t => t.status !== "DONE").length ?? 0;
  const done = project.tasks?.filter(t => t.status === "DONE").length ?? 0;
  const total = project.tasks?.length ?? 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    onUpdate(project.id, form);
    setSaving(false);
    setEditing(false);
  }

  if (editing) {
    return (
      <form onSubmit={handleSave} onClick={e => e.stopPropagation()}
        className="bg-[#111116] border border-cyan-500/20 rounded-2xl p-4 flex flex-col gap-3">
        <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          placeholder="Project name..." autoFocus
          className="w-full bg-[#0d1117] border border-white/[0.08] focus:border-cyan-500/30 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder-zinc-700 outline-none transition-colors" />
        <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="Description (optional)" rows={2}
          className="w-full bg-[#0d1117] border border-white/[0.08] focus:border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-zinc-300 placeholder-zinc-700 outline-none resize-none transition-colors" />
        <div className="flex gap-1.5 flex-wrap">
          {PRESET_COLORS.map(c => (
            <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))}
              className={`w-5 h-5 rounded-full transition-all ${form.color === c ? "ring-2 ring-offset-1 ring-offset-[#111116] ring-white/40 scale-110" : ""}`}
              style={{ backgroundColor: c }} />
          ))}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setEditing(false)}
            className="flex-1 py-1.5 text-xs text-zinc-600 border border-white/[0.07] rounded-xl hover:text-zinc-300 transition-all">Cancel</button>
          <button type="submit" disabled={saving || !form.name.trim()}
            className="flex-1 py-1.5 text-xs font-semibold text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 rounded-xl hover:bg-cyan-500/20 transition-all disabled:opacity-40">
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="group relative bg-[#111116] border border-white/[0.07] hover:border-white/[0.14] rounded-2xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/30 cursor-pointer"
      onClick={onSelect}>
      {/* Actions */}
      <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={e => e.stopPropagation()}>
        <button onClick={() => setEditing(true)}
          className="w-6 h-6 flex items-center justify-center rounded-lg bg-white/[0.05] hover:bg-white/[0.12] text-zinc-600 hover:text-zinc-200 transition-all text-xs">✎</button>
        <button onClick={() => { if (confirm(`Delete "${project.name}"? All tasks will be deleted.`)) onDelete(project.id); }}
          className="w-6 h-6 flex items-center justify-center rounded-lg bg-white/[0.05] hover:bg-red-500/20 text-zinc-600 hover:text-red-400 transition-all text-xs">×</button>
      </div>

      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: project.color, boxShadow: `0 0 8px ${project.color}60` }} />
        <span className="text-sm font-semibold text-zinc-100 truncate pr-12">{project.name}</span>
      </div>

      {project.description && (
        <p className="text-xs text-zinc-600 mb-3 line-clamp-2 leading-relaxed">{project.description}</p>
      )}

      {total > 0 && (
        <div className="mb-3">
          <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: project.color }} />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-[11px] text-zinc-600">{open} open · {done} done</span>
        <span className="text-[10px] font-semibold text-zinc-700 group-hover:text-zinc-400 transition-colors">Open board →</span>
      </div>
    </div>
  );
});

function ProjectOverview({ projects, onSelect, onRefresh }: {
  projects: Project[]; onSelect: (id: string) => void; onRefresh: () => void;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", color: "#8b5cf6", description: "" });
  const [creating, setCreating] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createForm.name.trim()) return;
    setCreating(true);
    await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createForm),
    });
    setCreateForm({ name: "", color: "#8b5cf6", description: "" });
    setShowCreate(false);
    setCreating(false);
    onRefresh();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    onRefresh();
  }

  function handleUpdate(id: string, data: { name: string; color: string; description: string }) {
    // optimistic update handled by parent refresh
    onRefresh();
  }

  return (
    <div className="flex flex-col gap-5 h-full">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-zinc-100">Projects</h2>
          <p className="text-xs text-zinc-600 mt-0.5">Select a project to open its Kanban board</p>
        </div>
        <button onClick={() => setShowCreate(v => !v)}
          className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 transition-all">
          {showCreate ? "Cancel" : "+ New Project"}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="bg-[#111116] border border-white/[0.08] rounded-2xl p-4 flex flex-col gap-3">
          <input type="text" value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Project name..." autoFocus
            className="w-full bg-[#0d1117] border border-white/[0.08] focus:border-cyan-500/30 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-700 outline-none transition-colors" />
          <textarea value={createForm.description} onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Description (optional)" rows={2}
            className="w-full bg-[#0d1117] border border-white/[0.08] focus:border-cyan-500/30 rounded-xl px-3.5 py-2.5 text-xs text-zinc-300 placeholder-zinc-700 outline-none resize-none transition-colors" />
          <div className="flex gap-1.5 flex-wrap">
            {PRESET_COLORS.map(c => (
              <button key={c} type="button" onClick={() => setCreateForm(f => ({ ...f, color: c }))}
                className={`w-5 h-5 rounded-full transition-all ${createForm.color === c ? "ring-2 ring-offset-1 ring-offset-[#111116] ring-white/40 scale-110" : ""}`}
                style={{ backgroundColor: c }} />
            ))}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowCreate(false)}
              className="flex-1 py-2 text-xs text-zinc-600 border border-white/[0.07] rounded-xl hover:text-zinc-300 transition-all">Cancel</button>
            <button type="submit" disabled={creating || !createForm.name.trim()}
              className="flex-1 py-2 text-xs font-semibold text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 rounded-xl hover:bg-cyan-500/20 transition-all disabled:opacity-40">
              {creating ? "Creating..." : "Create Project"}
            </button>
          </div>
        </form>
      )}

      {projects.length === 0 && !showCreate ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-2xl">📁</div>
          <div>
            <p className="text-sm font-medium text-zinc-300">No projects yet</p>
            <p className="text-xs text-zinc-600 mt-1">Create one above to get started</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 content-start overflow-y-auto">
          {projects.map(p => (
            <ProjectCard key={p.id} project={p}
              onSelect={() => onSelect(p.id)}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface KanbanBoardProps {
  projects: Project[];
  activeProjectId: string | null;
  onSelectProject: (id: string) => void;
  onRefreshProjects: () => void;
}

export default function KanbanBoard({ projects, activeProjectId, onSelectProject, onRefreshProjects }: KanbanBoardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [createModal, setCreateModal] = useState<{ open: boolean; status: Status }>({ open: false, status: "TODO" });
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<Status | null>(null);
  const dragCounter = useRef<Record<Status, number>>({ TODO: 0, IN_PROGRESS: 0, IN_REVIEW: 0, DONE: 0 });

  const loadTasks = useCallback(async () => {
    if (!activeProjectId) return;
    setLoading(true);
    const res = await fetch(`/api/tasks?projectId=${activeProjectId}`);
    const data = await res.json();
    setTasks(data.tasks ?? []);
    setLoading(false);
  }, [activeProjectId]);

  useEffect(() => {
    if (!activeProjectId) { setTasks([]); return; }
    loadTasks();
  }, [loadTasks, activeProjectId]);

  const moveTask = useCallback(async (id: string, status: Status) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t));
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    setTasks(prev => prev.map(t => t.id === id ? data.task : t));
    setSelectedTask(prev => prev?.id === id ? data.task : prev);
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, col: Status) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    if (taskId) moveTask(taskId, col);
    setDragOverCol(null); setDraggingId(null);
    dragCounter.current = { TODO: 0, IN_PROGRESS: 0, IN_REVIEW: 0, DONE: 0 };
  }, [moveTask]);

  // Pre-group tasks by status once per render instead of filtering 4× in JSX
  const tasksByStatus = useMemo(() => {
    const map: Record<Status, Task[]> = { TODO: [], IN_PROGRESS: [], IN_REVIEW: [], DONE: [] };
    for (const t of tasks) map[t.status as Status]?.push(t);
    return map;
  }, [tasks]);

  if (!activeProjectId) {
    return <ProjectOverview projects={projects} onSelect={onSelectProject} onRefresh={onRefreshProjects} />;
  }

  return (
    <>
      <div className="flex gap-3 md:gap-4 h-full min-h-0 overflow-x-auto md:overflow-x-hidden snap-x snap-mandatory md:snap-none pb-2 md:pb-0">
        {COLUMNS.map(col => {
          const colTasks = tasksByStatus[col.id];
          const isOver = dragOverCol === col.id && !!draggingId && tasks.find(t => t.id === draggingId)?.status !== col.id;

          return (
            <div key={col.id} className="flex flex-col flex-shrink-0 w-[85vw] snap-start min-h-0 md:flex-1 md:w-auto"
              onDragOver={e => { e.preventDefault(); setDragOverCol(col.id); }}
              onDragEnter={() => { dragCounter.current[col.id]++; setDragOverCol(col.id); }}
              onDragLeave={() => { dragCounter.current[col.id]--; if (dragCounter.current[col.id] === 0) setDragOverCol(null); }}
              onDrop={e => handleDrop(e, col.id)}
            >
              {/* Column header */}
              <div className="flex items-center gap-2 mb-3 px-1">
                <div className={`w-2 h-2 rounded-full ${col.dot} ${col.id === "IN_PROGRESS" ? "animate-pulse" : ""}`} />
                <span className={`text-xs font-bold uppercase tracking-wider ${col.color}`}>{col.label}</span>
                <span className={`ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full ${col.countColor}`}>{colTasks.length}</span>
              </div>

              <div className={`flex flex-col gap-2.5 flex-1 overflow-y-auto rounded-2xl p-1.5 transition-all duration-200 ${
                isOver ? `border-2 border-dashed ${col.accent} bg-white/[0.02]` : "border-2 border-transparent"
              }`}>
                {loading ? (
                  <div className="flex justify-center pt-8">
                    <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
                  </div>
                ) : colTasks.length === 0 ? (
                  <div className={`flex items-center justify-center h-20 rounded-xl border-2 border-dashed transition-all ${
                    isOver ? "border-white/20" : "border-white/[0.04] opacity-50"
                  }`}>
                    <p className="text-[11px] text-zinc-700">{isOver ? "Drop here" : "No tasks"}</p>
                  </div>
                ) : (
                  colTasks.map(task => (
                    <TaskCard key={task.id} task={task}
                      onMove={moveTask} onOpen={setSelectedTask}
                      isDragging={draggingId === task.id}
                      onDragStart={() => setDraggingId(task.id)}
                      onDragEnd={() => { setDraggingId(null); setDragOverCol(null); }}
                    />
                  ))
                )}

                {/* Add task button → opens full modal */}
                <button
                  onClick={() => setCreateModal({ open: true, status: col.id })}
                  className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-zinc-700 hover:text-zinc-400 hover:bg-white/[0.03] transition-all text-sm"
                >
                  <span className="text-base leading-none">+</span> Add task
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create task modal */}
      <CreateTaskModal
        isOpen={createModal.open}
        onClose={() => setCreateModal(m => ({ ...m, open: false }))}
        projectId={activeProjectId}
        projects={projects}
        defaultStatus={createModal.status}
        onCreated={task => setTasks(prev => [task, ...prev])}
      />

      {/* Task detail modal */}
      <TaskModal
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onUpdate={updated => {
          setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
          setSelectedTask(updated);
        }}
        onDelete={id => { deleteTask(id); setSelectedTask(null); }}
      />
    </>
  );
}
