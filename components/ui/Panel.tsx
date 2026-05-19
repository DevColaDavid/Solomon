"use client";

import { ReactNode } from "react";

interface PanelProps {
  title?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}

export default function Panel({ title, children, className = "", action }: PanelProps) {
  return (
    <div className={`rounded-2xl border bg-[#0d1424] border-white/[0.06] ${className}`}>
      {title && (
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/[0.04]">
          <h2 className="text-[11px] font-semibold tracking-widest text-[#475569] uppercase">
            {title}
          </h2>
          {action}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}
