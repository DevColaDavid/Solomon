type Priority = "HIGH" | "MEDIUM" | "LOW";

const STYLES: Record<Priority, string> = {
  HIGH:   "bg-red-500/10   text-red-400   border border-red-500/20",
  MEDIUM: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  LOW:    "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
};

const DOTS: Record<Priority, string> = {
  HIGH: "bg-red-400", MEDIUM: "bg-amber-400", LOW: "bg-emerald-400",
};

export default function PriorityBadge({ priority }: { priority: string }) {
  const p = (priority as Priority) || "MEDIUM";
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${STYLES[p]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${DOTS[p]}`} />
      {p.charAt(0) + p.slice(1).toLowerCase()}
    </span>
  );
}
