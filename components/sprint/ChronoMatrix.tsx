"use client";

import { useEffect, useRef, useState } from "react";

type Mode = "FOCUS" | "BREAK";

const FOCUS_PRESETS  = [15, 30, 60];
const BREAK_PRESETS  = [5, 10, 15];
const RADIUS         = 52;
const CIRCUMFERENCE  = 2 * Math.PI * RADIUS;

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

interface ChronoMatrixProps {
  projects: { id: string; name: string; color: string }[];
}

export default function ChronoMatrix({ projects }: ChronoMatrixProps) {
  const [mode, setMode]               = useState<Mode>("FOCUS");
  const [selectedMinutes, setSelectedMinutes] = useState(15);
  const [customInput, setCustomInput] = useState("");
  const [showCustom, setShowCustom]   = useState(false);
  const [customError, setCustomError] = useState("");

  const [secondsLeft, setSecondsLeft] = useState(15 * 60);
  const [totalSeconds, setTotalSeconds] = useState(15 * 60);
  const [isRunning, setIsRunning]     = useState(false);
  const [activeTask, setActiveTask]   = useState("");
  const [activeProjectId, setActiveProjectId] = useState("");
  const [sprintsToday, setSprintsToday] = useState(0);
  const [justCompleted, setJustCompleted] = useState(false);

  const completedRef  = useRef(false);
  const savingRef     = useRef(false);

  const progress    = totalSeconds > 0 ? Math.max(0, secondsLeft / totalSeconds) : 1;
  const dashOffset  = CIRCUMFERENCE * (1 - progress);
  const mm          = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss          = String(secondsLeft % 60).padStart(2, "0");
  const isFocus     = mode === "FOCUS";
  const strokeColor = isFocus ? "#06b6d4" : "#4ade80";
  const trackColor  = isFocus ? "rgba(6,182,212,0.1)" : "rgba(74,222,128,0.1)";
  const glowColor   = isFocus ? "rgba(6,182,212,0.5)" : "rgba(74,222,128,0.4)";
  const presets     = isFocus ? FOCUS_PRESETS : BREAK_PRESETS;

  // Tick
  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) { setIsRunning(false); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [isRunning]);

  // On complete
  useEffect(() => {
    if (secondsLeft === 0 && !isRunning && !completedRef.current) {
      completedRef.current = true;
      setJustCompleted(true);
      playChime();
      if (isFocus && !savingRef.current) {
        savingRef.current = true;
        const durationMinutes = Math.max(1, Math.round(totalSeconds / 60));
        fetch("/api/sprints", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            taskName: activeTask || null,
            projectId: activeProjectId || null,
            duration: durationMinutes,
            mode: "FOCUS",
          }),
        })
          .then(() => { setSprintsToday(n => n + 1); })
          .catch(() => {})
          .finally(() => { savingRef.current = false; });
      }
    }
    if (secondsLeft > 0) {
      completedRef.current = false;
      setJustCompleted(false);
    }
  }, [secondsLeft, isRunning, isFocus, totalSeconds, activeTask, activeProjectId]);

  function applyTime(minutes: number) {
    const secs = minutes * 60;
    setSelectedMinutes(minutes);
    setTotalSeconds(secs);
    setSecondsLeft(secs);
    setIsRunning(false);
    setJustCompleted(false);
    completedRef.current = false;
    setShowCustom(false);
    setCustomError("");
  }

  function applyCustom() {
    const mins = parseFloat(customInput);
    if (!mins || mins <= 0) { setCustomError("Enter valid minutes"); return; }
    if (mins > 24 * 60) { setCustomError("Max 24 hours"); return; }
    setCustomError("");
    setSelectedMinutes(0); // 0 = custom selected
    const secs = Math.round(mins * 60);
    setTotalSeconds(secs);
    setSecondsLeft(secs);
    setIsRunning(false);
    setJustCompleted(false);
    completedRef.current = false;
  }

  function switchMode(m: Mode) {
    setMode(m);
    setIsRunning(false);
    setJustCompleted(false);
    completedRef.current = false;
    setShowCustom(false);
    setCustomError("");
    const defaultMins = m === "FOCUS" ? 15 : 5;
    setSelectedMinutes(defaultMins);
    const secs = defaultMins * 60;
    setTotalSeconds(secs);
    setSecondsLeft(secs);
  }

  function handleStartPause() {
    if (justCompleted) {
      // Reset first
      const secs = totalSeconds;
      setSecondsLeft(secs);
      setJustCompleted(false);
      completedRef.current = false;
      return;
    }
    setIsRunning(r => !r);
  }

  function handleReset() {
    setIsRunning(false);
    setSecondsLeft(totalSeconds);
    setJustCompleted(false);
    completedRef.current = false;
  }

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0d1424] overflow-hidden">
      <div className="border-b border-white/[0.04]" style={{ padding: '0.875rem 1rem 0.75rem' }}>
        <p className="text-[10px] font-semibold tracking-widest text-[#475569] uppercase">Chrono Matrix</p>
      </div>

      <div className="flex flex-col" style={{ padding: '1rem', gap: '0.875rem' }}>

        {/* Focus / Break toggle */}
        <div className="flex gap-1 p-1 bg-white/[0.03] rounded-xl">
          {(["FOCUS", "BREAK"] as Mode[]).map(m => (
            <button key={m} onClick={() => switchMode(m)}
              className={`flex-1 py-1.5 text-[10px] font-semibold rounded-lg transition-all ${
                mode === m ? "bg-white/[0.08] text-slate-200 shadow-sm" : "text-[#475569] hover:text-slate-400"
              }`}>
              {m === "FOCUS" ? "Focus" : "Break"}
            </button>
          ))}
        </div>

        {/* Time presets */}
        <div className="flex gap-1.5 flex-wrap">
          {presets.map(mins => (
            <button key={mins} onClick={() => applyTime(mins)}
              disabled={isRunning}
              className={`px-2.5 py-1 text-[10px] font-semibold rounded-lg border transition-all disabled:opacity-40 ${
                selectedMinutes === mins && !showCustom
                  ? "bg-white/[0.08] border-white/[0.18] text-slate-200"
                  : "border-white/[0.06] text-[#475569] hover:text-slate-400 hover:border-white/[0.12]"
              }`}>
              {mins}m
            </button>
          ))}
          <button onClick={() => { setShowCustom(v => !v); }}
            disabled={isRunning}
            className={`px-2.5 py-1 text-[10px] font-semibold rounded-lg border transition-all disabled:opacity-40 ${
              showCustom
                ? "bg-white/[0.08] border-white/[0.18] text-slate-200"
                : "border-white/[0.06] text-[#475569] hover:text-slate-400 hover:border-white/[0.12]"
            }`}>
            Custom
          </button>
        </div>

        {/* Custom input */}
        {showCustom && (
          <div className="flex gap-2 items-center">
            <input
              type="number" min={0.1} step={0.5}
              value={customInput}
              onChange={e => setCustomInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") applyCustom(); }}
              placeholder="minutes"
              className="flex-1 bg-[#070b14] border border-white/[0.08] focus:border-cyan-500/40 rounded-xl px-3 py-1.5 text-xs text-slate-100 placeholder-[#334155] outline-none text-center tabular-nums"
            />
            <button onClick={applyCustom}
              className="px-3 py-1.5 text-[10px] font-semibold rounded-xl border border-cyan-500/30 text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 transition-all">
              Set
            </button>
          </div>
        )}
        {customError && <p className="text-[10px] text-red-400/70 text-center -mt-1">{customError}</p>}

        {/* Ring */}
        <div className="flex justify-center">
          <div className="relative flex items-center justify-center">
            <svg width="136" height="136" viewBox="0 0 136 136">
              <circle cx="68" cy="68" r={RADIUS} fill="none" stroke={trackColor} strokeWidth="8" />
              <circle
                cx="68" cy="68" r={RADIUS} fill="none"
                stroke={justCompleted ? strokeColor : strokeColor}
                strokeWidth="8" strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={dashOffset}
                transform="rotate(-90 68 68)"
                style={{
                  transition: isRunning ? "stroke-dashoffset 1s linear" : "stroke-dashoffset 0.3s ease",
                  filter: `drop-shadow(0 0 10px ${glowColor})`,
                }}
              />
            </svg>
            <div className="absolute flex flex-col items-center gap-0.5">
              <span className="text-[28px] font-bold text-slate-100 tabular-nums font-mono leading-none">
                {mm}:{ss}
              </span>
              <span className="text-[9px] text-[#475569] tracking-widest">
                {justCompleted ? "DONE" : isRunning ? (isFocus ? "FOCUS" : "BREAK") : "STANDBY"}
              </span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          <button onClick={handleStartPause}
            className={`flex-1 py-2.5 text-xs font-semibold rounded-xl border transition-all ${
              isRunning
                ? "border-white/10 text-slate-400 hover:text-slate-200 hover:border-white/20"
                : justCompleted
                  ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/[0.08] hover:bg-emerald-500/[0.18]"
                  : "border-cyan-500/30 text-cyan-400 bg-cyan-500/[0.08] hover:bg-cyan-500/[0.18]"
            }`}>
            {isRunning ? "Pause" : justCompleted ? "Again" : "Start"}
          </button>
          <button onClick={handleReset}
            className="px-4 py-2.5 text-xs font-semibold rounded-xl border border-white/[0.06] text-[#475569] hover:text-slate-300 hover:border-white/10 transition-all">
            Reset
          </button>
        </div>

        {/* Task + project — focus only */}
        {isFocus && (
          <>
            <input
              type="text" value={activeTask}
              onChange={e => setActiveTask(e.target.value)}
              placeholder="What are you working on?"
              className="w-full bg-[#070b14] border border-white/[0.06] focus:border-cyan-500/30 rounded-xl px-3.5 py-2.5 text-xs text-slate-300 placeholder-[#334155] outline-none transition-colors"
            />
            {projects.length > 0 && (
              <select
                value={activeProjectId}
                onChange={e => setActiveProjectId(e.target.value)}
                className="w-full bg-[#070b14] border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-xs text-[#475569] outline-none"
              >
                <option value="">No project</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}
            {sprintsToday > 0 && (
              <p className="text-[10px] text-[#334155] text-center">
                {sprintsToday} focus sprint{sprintsToday !== 1 ? "s" : ""} completed today
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
