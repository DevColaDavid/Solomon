"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { authClient } from "@/lib/auth/client";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import WeatherWidget from "@/components/WeatherWidget";
import CalendarWidget from "@/components/CalendarWidget";
import ChronoMatrix from "@/components/sprint/ChronoMatrix";
import KanbanBoard from "@/components/KanbanBoard";
import dynamic from "next/dynamic";
const ProfileModal = dynamic(() => import("@/components/profile/ProfileModal"), { ssr: false });
import type { Project } from "@/types";

function Clock() {
  const [time, setTime] = useState<Date | null>(null);
  useEffect(() => {
    setTime(new Date());
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!time) return <div className="w-28 h-8" />;
  return (
    <div className="text-right tabular-nums">
      <p className="text-base font-mono font-bold text-zinc-100 leading-none">
        {time.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}
      </p>
      <p className="text-[10px] text-zinc-600 mt-1">
        {time.toLocaleDateString("en", { weekday: "long", month: "short", day: "numeric" })}
      </p>
    </div>
  );
}

function CollapseButton({ collapsed, onClick, side }: { collapsed: boolean; onClick: () => void; side: "left" | "right" }) {
  const arrow = side === "left" ? (collapsed ? "›" : "‹") : (collapsed ? "‹" : "›");
  return (
    <button
      onClick={onClick}
      title={collapsed ? "Expand" : "Collapse"}
      className="w-5 h-8 flex items-center justify-center text-zinc-700 hover:text-zinc-300 hover:bg-white/[0.05] rounded transition-all text-sm flex-shrink-0"
    >
      {arrow}
    </button>
  );
}

export default function DashboardPage() {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);

  // Persist sidebar state
  useEffect(() => {
    const l = localStorage.getItem("sidebar-left");
    const r = localStorage.getItem("sidebar-right");
    if (l !== null) setLeftOpen(l !== "false");
    if (r !== null) setRightOpen(r !== "false");
  }, []);

  const toggleLeft = useCallback(() => setLeftOpen(v => { localStorage.setItem("sidebar-left", String(!v)); return !v; }), []);
  const toggleRight = useCallback(() => setRightOpen(v => { localStorage.setItem("sidebar-right", String(!v)); return !v; }), []);

  // Redirect if session definitively absent (not just loading)
  useEffect(() => {
    if (!isPending && !session) router.push("/login");
  }, [session, isPending, router]);

  const loadProjects = useCallback(() => {
    fetch("/api/projects")
      .then(r => r.ok ? r.json() : { projects: [] })
      .then(d => setProjects(d.projects ?? []))
      .catch(() => {});
  }, []);

  // Fire immediately on mount — don't wait for session to resolve.
  // API returns 401 if not authed; the redirect above handles the UX.
  // This eliminates the session → data waterfall.
  useEffect(() => {
    Promise.all([
      fetch("/api/projects").then(r => r.ok ? r.json() : { projects: [] }).then(d => setProjects(d.projects ?? [])),
      fetch("/api/auth/me").then(r => r.ok ? r.json() : { isAdmin: false }).then(d => setIsAdmin(d.isAdmin ?? false)),
    ]).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Must be before any early return — Rules of Hooks
  const activeProjectData = useMemo(() => projects.find(p => p.id === activeProject), [projects, activeProject]);

  // Don't block render with a spinner — show the shell immediately.
  // Session redirect handled by the useEffect above.
  if (!isPending && !session) return null;

  const greeting = () => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#09090b] relative z-10">

      {/* Left sidebar */}
      {leftOpen && (
        <Sidebar
          projects={projects}
          onRefresh={loadProjects}
          activeProject={activeProject}
          onSelectProject={setActiveProject}
          isAdmin={isAdmin}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header */}
        <header className="flex items-center gap-2 px-4 py-3.5 border-b border-white/[0.05] flex-shrink-0 bg-[#09090b]/90 backdrop-blur-sm">
          <CollapseButton collapsed={!leftOpen} onClick={toggleLeft} side="left" />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5">
              {activeProjectData && (
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: activeProjectData.color, boxShadow: `0 0 8px ${activeProjectData.color}60` }} />
              )}
              <h1 className="text-sm font-semibold text-zinc-100 truncate">
                {activeProjectData?.name ?? "All Projects"}
              </h1>
              {activeProjectData?.description && (
                <span className="text-xs text-zinc-600 hidden lg:block truncate">— {activeProjectData.description}</span>
              )}
            </div>
            <p className="text-[10px] text-zinc-600 mt-0.5">
              {greeting()}, {session?.user?.name?.split(" ")[0] ?? "David"}.
            </p>
          </div>

          <Clock />

          {/* Profile button */}
          <button
            onClick={() => setProfileOpen(true)}
            title="Profile"
            className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-white/[0.07] hover:ring-white/[0.25] transition-all flex-shrink-0"
          >
            {session?.user?.image
              ? <img src={session.user.image} alt="avatar" className="w-full h-full object-cover" />
              : <div className="w-full h-full bg-gradient-to-br from-cyan-500/40 to-violet-500/40 flex items-center justify-center text-xs font-bold text-white">
                  {session?.user?.name?.[0]?.toUpperCase() ?? "D"}
                </div>
            }
          </button>

          <CollapseButton collapsed={!rightOpen} onClick={toggleRight} side="right" />
        </header>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          <div className="flex-1 overflow-hidden p-5 flex flex-col min-w-0 min-h-0">
            <KanbanBoard
              projects={projects}
              activeProjectId={activeProject}
              onSelectProject={setActiveProject}
              onRefreshProjects={loadProjects}
            />
          </div>

          {/* Right panel */}
          {rightOpen && (
            <aside className="w-[300px] flex-shrink-0 flex flex-col gap-3 p-4 overflow-y-auto border-l border-white/[0.05]">
              <WeatherWidget />
              <CalendarWidget />
              <ChronoMatrix projects={projects} />
            </aside>
          )}
        </div>
      </div>

      <ProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
}
