"use client";

import { useReducer, useEffect, useRef, useCallback, useState } from "react";
import type { TimerState, TimerAction, TimerMode } from "@/types";

const PRESET_DURATIONS: Record<Exclude<TimerMode, "IDLE">, number> = {
  FOCUS: 25 * 60,
  SHORT_BREAK: 5 * 60,
  LONG_BREAK: 15 * 60,
};

function timerReducer(state: TimerState, action: TimerAction): TimerState {
  switch (action.type) {
    case "START":
      if (state.mode === "IDLE") return { ...state, mode: "FOCUS", secondsLeft: PRESET_DURATIONS.FOCUS, isRunning: true };
      return { ...state, isRunning: true };
    case "PAUSE": return { ...state, isRunning: false };
    case "RESET": return {
      ...state, isRunning: false,
      secondsLeft: state.mode === "IDLE" ? PRESET_DURATIONS.FOCUS : PRESET_DURATIONS[state.mode as Exclude<TimerMode, "IDLE">] ?? state.secondsLeft,
    };
    case "TICK":
      if (state.secondsLeft <= 1) return { ...state, secondsLeft: 0, isRunning: false };
      return { ...state, secondsLeft: state.secondsLeft - 1 };
    case "CYCLE_COMPLETE": {
      const newSprints = state.mode === "FOCUS" ? state.sprintsCompleted + 1 : state.sprintsCompleted;
      const nextMode: TimerMode = state.mode === "FOCUS"
        ? (newSprints % 4 === 0 ? "LONG_BREAK" : "SHORT_BREAK")
        : "FOCUS";
      return { ...state, mode: nextMode, secondsLeft: PRESET_DURATIONS[nextMode as Exclude<TimerMode, "IDLE">], isRunning: false, sprintsCompleted: newSprints };
    }
    case "SET_TASK": return { ...state, activeTask: action.task };
    case "SET_PROJECT": return { ...state, activeProjectId: action.projectId };
    case "SET_MODE": return { ...state, mode: action.mode, secondsLeft: action.seconds, isRunning: false };
    default: return state;
  }
}

function playChime() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1);
    osc.start(); osc.stop(ctx.currentTime + 1);
  } catch {}
}

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

type TabMode = "FOCUS" | "SHORT_BREAK" | "LONG_BREAK" | "CUSTOM";

const TABS: { id: TabMode; label: string }[] = [
  { id: "FOCUS",       label: "Focus" },
  { id: "SHORT_BREAK", label: "Short" },
  { id: "LONG_BREAK",  label: "Long" },
  { id: "CUSTOM",      label: "Custom" },
];

const MODE_STYLE: Record<TimerMode, { stroke: string; glow: string; trackOpacity: string }> = {
  IDLE:        { stroke: "#06b6d4", glow: "rgba(6,182,212,0.5)",   trackOpacity: "rgba(6,182,212,0.1)" },
  FOCUS:       { stroke: "#06b6d4", glow: "rgba(6,182,212,0.5)",   trackOpacity: "rgba(6,182,212,0.1)" },
  SHORT_BREAK: { stroke: "#4ade80", glow: "rgba(74,222,128,0.5)",  trackOpacity: "rgba(74,222,128,0.1)" },
  LONG_BREAK:  { stroke: "#8b5cf6", glow: "rgba(139,92,246,0.5)", trackOpacity: "rgba(139,92,246,0.1)" },
};

const MODE_LABEL: Record<TimerMode, string> = {
  IDLE: "STANDBY", FOCUS: "FOCUS", SHORT_BREAK: "BREAK", LONG_BREAK: "LONG BREAK",
};

interface ChronoMatrixProps {
  projects: { id: string; name: string; color: string }[];
}

export default function ChronoMatrix({ projects }: ChronoMatrixProps) {
  const [activeTab, setActiveTab] = useState<TabMode>("FOCUS");
  const [customMinutes, setCustomMinutes] = useState("30");
  const [customSeconds, setCustomSeconds] = useState("00");
  const [customError, setCustomError] = useState("");

  const [state, dispatch] = useReducer(timerReducer, {
    mode: "IDLE",
    secondsLeft: PRESET_DURATIONS.FOCUS,
    sprintsCompleted: 0,
    activeTask: "",
    activeProjectId: "",
    isRunning: false,
  });

  const completedRef = useRef(false);
  const style = MODE_STYLE[state.mode];

  // Use active total for the ring (custom uses whatever secondsLeft was set to)
  const totalRef = useRef(PRESET_DURATIONS.FOCUS);
  const progress = state.mode === "IDLE" ? 1 : Math.max(0, state.secondsLeft / totalRef.current);
  const dashOffset = CIRCUMFERENCE * (1 - progress);

  const mm = String(Math.floor(state.secondsLeft / 60)).padStart(2, "0");
  const ss = String(state.secondsLeft % 60).padStart(2, "0");

  const handleComplete = useCallback(async () => {
    playChime();
    if (state.mode === "FOCUS") {
      await fetch("/api/sprints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskName: state.activeTask || null,
          projectId: state.activeProjectId || null,
          duration: Math.round(totalRef.current / 60),
          mode: "FOCUS",
        }),
      });
    }
    dispatch({ type: "CYCLE_COMPLETE" });
  }, [state.mode, state.activeTask, state.activeProjectId]);

  useEffect(() => {
    if (!state.isRunning) return;
    const id = setInterval(() => dispatch({ type: "TICK" }), 1000);
    return () => clearInterval(id);
  }, [state.isRunning]);

  useEffect(() => {
    if (state.secondsLeft === 0 && !state.isRunning && !completedRef.current && state.mode !== "IDLE") {
      completedRef.current = true;
      handleComplete();
    }
    if (state.secondsLeft > 0) completedRef.current = false;
  }, [state.secondsLeft, state.isRunning, state.mode, handleComplete]);

  function switchTab(tab: TabMode) {
    setActiveTab(tab);
    setCustomError("");
    if (tab !== "CUSTOM") {
      const mode = tab as Exclude<TimerMode, "IDLE">;
      const secs = PRESET_DURATIONS[mode];
      totalRef.current = secs;
      dispatch({ type: "SET_MODE", mode, seconds: secs });
    }
  }

  function applyCustomTimer() {
    const mins = parseInt(customMinutes) || 0;
    const secs = parseInt(customSeconds) || 0;
    const total = mins * 60 + secs;
    if (total < 10) { setCustomError("Minimum 10 seconds"); return; }
    if (total > 24 * 60 * 60) { setCustomError("Maximum 24 hours"); return; }
    setCustomError("");
    totalRef.current = total;
    dispatch({ type: "SET_MODE", mode: "FOCUS", seconds: total });
  }

  const handleStart = () => {
    if (activeTab === "CUSTOM" && state.mode === "IDLE") {
      applyCustomTimer();
      // Start after applying — dispatch both in sequence via a tiny delay
      setTimeout(() => dispatch({ type: "START" }), 0);
    } else {
      dispatch({ type: "START" });
    }
  };

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0d1424] overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-white/[0.04]">
        <p className="text-[10px] font-semibold tracking-widest text-[#475569] uppercase">Chrono Matrix</p>
      </div>

      <div className="p-4 flex flex-col gap-4">
        {/* Mode tabs */}
        <div className="flex gap-1 p-1 bg-white/[0.03] rounded-xl">
          {TABS.map((tab) => (
            <button key={tab.id} onClick={() => switchTab(tab.id)}
              className={`flex-1 py-1.5 text-[10px] font-semibold rounded-lg transition-all ${
                activeTab === tab.id
                  ? "bg-white/[0.08] text-slate-200 shadow-sm"
                  : "text-[#475569] hover:text-slate-400"
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Custom timer input */}
        {activeTab === "CUSTOM" && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <input
                  type="number" min={0} max={999}
                  value={customMinutes}
                  onChange={(e) => setCustomMinutes(e.target.value)}
                  className="w-full bg-[#070b14] border border-white/[0.08] focus:border-cyan-500/40 rounded-xl px-3 py-2 text-sm text-slate-100 outline-none text-center tabular-nums"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-[#334155] pointer-events-none">min</span>
              </div>
              <span className="text-slate-600 font-bold">:</span>
              <div className="flex-1 relative">
                <input
                  type="number" min={0} max={59}
                  value={customSeconds}
                  onChange={(e) => setCustomSeconds(e.target.value.padStart(2, "0"))}
                  className="w-full bg-[#070b14] border border-white/[0.08] focus:border-cyan-500/40 rounded-xl px-3 py-2 text-sm text-slate-100 outline-none text-center tabular-nums"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-[#334155] pointer-events-none">sec</span>
              </div>
              <button
                onClick={applyCustomTimer}
                className="px-3 py-2 text-[11px] font-semibold rounded-xl border border-cyan-500/30 text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 transition-all whitespace-nowrap"
              >
                Set
              </button>
            </div>
            {customError && <p className="text-[10px] text-red-400/70 text-center">{customError}</p>}
          </div>
        )}

        {/* Ring */}
        <div className="flex justify-center">
          <div className="relative flex items-center justify-center">
            <svg width="136" height="136" viewBox="0 0 136 136">
              <circle cx="68" cy="68" r={RADIUS} fill="none" stroke={style.trackOpacity} strokeWidth="8" />
              <circle
                cx="68" cy="68" r={RADIUS} fill="none"
                stroke={style.stroke} strokeWidth="8" strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={dashOffset}
                transform="rotate(-90 68 68)"
                style={{
                  transition: state.isRunning ? "stroke-dashoffset 1s linear" : "stroke-dashoffset 0.3s ease",
                  filter: `drop-shadow(0 0 10px ${style.glow})`,
                }}
              />
            </svg>
            <div className="absolute flex flex-col items-center gap-0.5">
              <span className="text-[28px] font-bold text-slate-100 tabular-nums font-mono leading-none">
                {mm}:{ss}
              </span>
              <span className="text-[9px] text-[#475569] tracking-widest">{MODE_LABEL[state.mode]}</span>
            </div>
          </div>
        </div>

        {/* Sprint pips */}
        <div className="flex justify-center gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${
              i < state.sprintsCompleted % 4
                ? "bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.8)]"
                : "bg-white/[0.06]"
            }`} />
          ))}
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          <button
            onClick={handleStart}
            className={`flex-1 py-2.5 text-xs font-semibold rounded-xl border transition-all ${
              state.isRunning
                ? "border-white/10 text-slate-400 hover:text-slate-200 hover:border-white/20"
                : "border-cyan-500/30 text-cyan-400 bg-cyan-500/[0.08] hover:bg-cyan-500/[0.18]"
            }`}
          >
            {state.isRunning ? "Pause" : "Start"}
          </button>
          <button
            onClick={() => { dispatch({ type: "RESET" }); if (activeTab === "CUSTOM") { applyCustomTimer(); } }}
            className="px-4 py-2.5 text-xs font-semibold rounded-xl border border-white/[0.06] text-[#475569] hover:text-slate-300 hover:border-white/10 transition-all"
          >
            Reset
          </button>
        </div>

        {/* Task + project */}
        <input
          type="text" value={state.activeTask}
          onChange={(e) => dispatch({ type: "SET_TASK", task: e.target.value })}
          placeholder="What are you working on?"
          className="w-full bg-[#070b14] border border-white/[0.06] focus:border-cyan-500/30 rounded-xl px-3.5 py-2.5 text-xs text-slate-300 placeholder-[#334155] outline-none transition-colors"
        />

        {projects.length > 0 && (
          <select
            value={state.activeProjectId}
            onChange={(e) => dispatch({ type: "SET_PROJECT", projectId: e.target.value })}
            className="w-full bg-[#070b14] border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-xs text-[#475569] outline-none"
          >
            <option value="">No project</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}

        <p className="text-[10px] text-[#334155] text-center">
          {state.sprintsCompleted} sprint{state.sprintsCompleted !== 1 ? "s" : ""} completed today
        </p>
      </div>
    </div>
  );
}
