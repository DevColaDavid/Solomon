"use client";

import { useEffect, useRef, useState } from "react";
import { authClient } from "@/lib/auth/client";
import { useRouter } from "next/navigation";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileModal({ isOpen, onClose }: Props) {
  const { data: session, refetch } = authClient.useSession() as { data: { user: { name: string; email: string; image: string | null } } | null; refetch?: () => void };
  const [name, setName] = useState("");
  const [image, setImage] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (isOpen && session?.user) {
      setName(session.user.name ?? "");
      setImage(session.user.image ?? "");
      setSaved(false);
    }
  }, [isOpen, session]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!isOpen || !session?.user) return null;

  const user = session.user;
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || user.email[0].toUpperCase();

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() || undefined, image: image.trim() || undefined }),
    });
    // Also update via authClient if supported
    try {
      await (authClient as unknown as { updateUser: (data: { name?: string; image?: string }) => Promise<void> })
        .updateUser({ name: name.trim() || undefined, image: image.trim() || undefined });
    } catch {}
    setSaving(false);
    setSaved(true);
    refetch?.();
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div
      ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
    >
      <div className="w-full max-w-md bg-black/70 backdrop-blur-xl border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <h2 className="text-sm font-semibold text-zinc-100">Profile</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-600 hover:text-zinc-200 hover:bg-white/[0.06] transition-all text-lg">×</button>
        </div>

        <form onSubmit={handleSave} className="px-6 py-6 flex flex-col gap-5">
          {/* Avatar preview */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl overflow-hidden border border-white/[0.08] flex-shrink-0">
              {image ? (
                <img src={image} alt="avatar" className="w-full h-full object-cover"
                  onError={() => setImage("")} />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-cyan-500/40 to-violet-500/40 flex items-center justify-center text-xl font-bold text-white">
                  {initials}
                </div>
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-100">{name || user.email}</p>
              <p className="text-xs text-zinc-600 mt-0.5">{user.email}</p>
              <p className="text-[10px] text-zinc-700 mt-1">Member</p>
            </div>
          </div>

          {/* Display name */}
          <div>
            <label className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider block mb-1.5">Display Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="Your name..."
              className="w-full bg-[#111116] border border-white/[0.07] focus:border-cyan-500/30 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-700 outline-none transition-colors"
            />
          </div>

          {/* Avatar URL */}
          <div>
            <label className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider block mb-1.5">Avatar URL</label>
            <input type="url" value={image} onChange={e => setImage(e.target.value)}
              placeholder="https://example.com/avatar.jpg"
              className="w-full bg-[#111116] border border-white/[0.07] focus:border-cyan-500/30 rounded-xl px-3.5 py-2.5 text-sm text-zinc-300 placeholder-zinc-700 outline-none transition-colors"
            />
            <p className="text-[10px] text-zinc-700 mt-1">Paste any image URL. Leave blank to use initials.</p>
          </div>

          {/* Email (read-only) */}
          <div>
            <label className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider block mb-1.5">Email</label>
            <div className="w-full bg-white/[0.02] border border-white/[0.05] rounded-xl px-3.5 py-2.5 text-sm text-zinc-600 select-all">
              {user.email}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              disabled={signingOut}
              onClick={async () => {
                setSigningOut(true);
                await authClient.signOut();
                router.push("/login");
              }}
              className="px-4 py-2 text-sm text-red-500 hover:text-red-400 border border-red-500/20 hover:border-red-500/40 hover:bg-red-500/[0.06] rounded-xl transition-all disabled:opacity-40"
            >
              {signingOut ? "Signing out..." : "Sign out"}
            </button>
            <div className="flex gap-3">
              <button type="button" onClick={onClose}
                className="px-4 py-2 text-sm text-zinc-500 hover:text-zinc-200 border border-white/[0.07] rounded-xl hover:border-white/[0.15] transition-all">
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className={`px-5 py-2 text-sm font-semibold rounded-xl border transition-all ${
                  saved
                    ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
                    : "text-cyan-400 bg-cyan-500/10 border-cyan-500/30 hover:bg-cyan-500/20"
                } disabled:opacity-40`}>
                {saved ? "Saved ✓" : saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
