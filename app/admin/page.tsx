"use client";

import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth/client";
import { useRouter } from "next/navigation";

type UserRole = "VIEWER" | "MEMBER" | "ADMIN";
interface AppUser { id: string; email: string; role: UserRole; note: string | null; createdAt: string; }
interface NeonUser { id: string; name: string | null; email: string | null; image: string | null; }
interface SprintSession {
  id: string; duration: number; taskName: string | null;
  projectName: string | null; projectColor: string | null;
  createdAt: string; userId: string;
}

const ROLE_META: Record<UserRole, { label: string; color: string; desc: string }> = {
  VIEWER: { label: "Viewer",  color: "text-zinc-400 bg-zinc-500/10 border-zinc-500/20", desc: "Read-only access" },
  MEMBER: { label: "Member",  color: "text-blue-400 bg-blue-500/10 border-blue-500/20",  desc: "Full task & project access" },
  ADMIN:  { label: "Admin",   color: "text-violet-400 bg-violet-500/10 border-violet-500/20", desc: "Full access + user management" },
};

function Avatar({ name, image }: { name: string | null; image: string | null }) {
  const initials = name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() ?? "?";
  return image
    ? <img src={image} alt={name ?? ""} className="w-8 h-8 rounded-full object-cover" />
    : <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500/40 to-violet-500/40 flex items-center justify-center text-xs font-bold text-white">{initials}</div>;
}

export default function AdminPage() {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();

  const [appUsers, setAppUsers]   = useState<AppUser[]>([]);
  const [neonUsers, setNeonUsers] = useState<NeonUser[]>([]);
  const [tab, setTab]             = useState<"users" | "registered" | "sprints">("users");
  const [isAdmin, setIsAdmin]     = useState<boolean | null>(null);
  const [newEmail, setNewEmail]   = useState("");
  const [newRole, setNewRole]     = useState<UserRole>("MEMBER");
  const [newNote, setNewNote]     = useState("");
  const [adding, setAdding]       = useState(false);
  const [addError, setAddError]   = useState("");
  const [sprints, setSprints]     = useState<SprintSession[]>([]);
  const [sprintPeriod, setSprintPeriod] = useState<"7d" | "30d">("7d");
  const [sprintsLoading, setSprintsLoading] = useState(false);
  const [selected, setSelected]   = useState<Set<string>>(new Set());
  const [deleting, setDeleting]   = useState(false);

  useEffect(() => { if (!isPending && !session) router.push("/login"); }, [session, isPending, router]);

  useEffect(() => {
    if (!session) return;
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      setIsAdmin(d.isAdmin ?? false);
      if (!d.isAdmin) router.push("/dashboard");
    });
  }, [session, router]);

  useEffect(() => {
    if (!isAdmin) return;
    fetch("/api/admin/whitelist").then(r => r.json()).then(d => setAppUsers(d.entries ?? []));
    fetch("/api/admin/users").then(r => r.json()).then(d => setNeonUsers(d.users ?? []));
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin || tab !== "sprints") return;
    setSprintsLoading(true);
    setSelected(new Set());
    fetch(`/api/analytics?scope=org&period=${sprintPeriod}`)
      .then(r => r.ok ? r.json() : { sprintSessions: [] })
      .then(d => setSprints(d.sprintSessions ?? []))
      .catch(() => setSprints([]))
      .finally(() => setSprintsLoading(false));
  }, [isAdmin, tab, sprintPeriod]);

  async function deleteSprints() {
    if (selected.size === 0) return;
    setDeleting(true);
    const ids = Array.from(selected);
    await fetch("/api/sprints", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    setSprints(prev => prev.filter(s => !selected.has(s.id)));
    setSelected(new Set());
    setDeleting(false);
  }

  function toggleRow(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  async function addUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAddError("");
    setAdding(true);
    const res = await fetch("/api/admin/whitelist", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: newEmail, role: newRole, note: newNote }),
    });
    const data = await res.json();
    if (!res.ok) { setAddError(data.error ?? "Failed"); setAdding(false); return; }
    setAppUsers(prev => [...prev.filter(u => u.email !== data.entry.email), data.entry]);
    setNewEmail(""); setNewNote(""); setAdding(false);
  }

  async function changeRole(email: string, role: UserRole) {
    const res = await fetch("/api/admin/whitelist", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    });
    const data = await res.json();
    if (data.entry) setAppUsers(prev => prev.map(u => u.email === email ? data.entry : u));
  }

  async function removeUser(email: string) {
    if (!confirm(`Remove ${email}? They will lose access.`)) return;
    await fetch("/api/admin/whitelist", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setAppUsers(prev => prev.filter(u => u.email !== email));
  }

  if (isPending || isAdmin === null) return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
      <div className="w-5 h-5 rounded-full border-2 border-cyan-500/30 border-t-cyan-400 animate-spin" />
    </div>
  );

  const admins  = appUsers.filter(u => u.role === "ADMIN").length + 1; // +1 for owner
  const members = appUsers.filter(u => u.role === "MEMBER").length;
  const viewers = appUsers.filter(u => u.role === "VIEWER").length;

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100">

      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-white/[0.06] bg-black/60 backdrop-blur-md">
        <div className="flex items-center justify-between" style={{ padding: '1rem 2rem' }}>
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/dashboard")} className="text-zinc-600 hover:text-zinc-300 transition-colors text-sm">← Dashboard</button>
            <div className="w-px h-4 bg-white/[0.08]" />
            <h1 className="text-sm font-semibold">Admin Panel</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-zinc-700 bg-white/[0.04] px-2 py-1 rounded-full border border-white/[0.05]">RESTRICTED</span>
            <button onClick={() => authClient.signOut({ fetchOptions: { onSuccess: () => router.push("/login") } })}
              className="text-xs text-zinc-600 hover:text-zinc-300 transition-colors">Sign out</button>
          </div>
        </div>
      </header>

      <div style={{ padding: '2rem 2.5rem' }}>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          {[
            { label: "Admins",  value: admins,  color: "text-violet-400" },
            { label: "Members", value: members, color: "text-blue-400" },
            { label: "Viewers", value: viewers, color: "text-zinc-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white/[0.03] backdrop-blur-sm border border-white/[0.07] rounded-2xl" style={{ padding: '1.5rem' }}>
              <p className="text-xs text-zinc-500 mb-2">{label}</p>
              <p className={`text-3xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-white/[0.03] rounded-xl border border-white/[0.05] w-fit mb-6">
          {([
            ["users", `Users (${appUsers.length})`],
            ["registered", `Registered (${neonUsers.length})`],
            ["sprints", "Sprint Sessions"],
          ] as const).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                tab === t ? "bg-white/[0.08] text-zinc-100" : "text-zinc-600 hover:text-zinc-300"
              }`}>{label}</button>
          ))}
        </div>

        {tab === "users" && (
          <div className="flex flex-col gap-4">
            {/* Role info */}
            <div className="flex gap-3 flex-wrap">
              {(["VIEWER", "MEMBER", "ADMIN"] as UserRole[]).map(r => {
                const m = ROLE_META[r];
                return (
                  <div key={r} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs ${m.color}`}>
                    <span className="font-semibold">{m.label}</span>
                    <span className="opacity-60">—</span>
                    <span className="opacity-70">{m.desc}</span>
                  </div>
                );
              })}
            </div>

            {/* Add user form */}
            <form onSubmit={addUser} className="bg-white/[0.03] border border-white/[0.07] rounded-2xl" style={{ padding: '1.25rem 1.5rem' }}>
              <p className="text-xs font-semibold text-zinc-400 mb-3">Add user</p>
              <div className="flex gap-3 flex-wrap">
                <input type="email" placeholder="email@example.com" value={newEmail} onChange={e => setNewEmail(e.target.value)} required
                  className="flex-1 min-w-[200px] bg-[#09090b] border border-white/[0.08] focus:border-cyan-500/40 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-700 outline-none" />
                <input type="text" placeholder="Note (optional)" value={newNote} onChange={e => setNewNote(e.target.value)}
                  className="flex-1 min-w-[160px] bg-[#09090b] border border-white/[0.08] focus:border-cyan-500/40 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-700 outline-none" />
                <select value={newRole} onChange={e => setNewRole(e.target.value as UserRole)}
                  className="bg-[#09090b] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-zinc-300 outline-none">
                  <option value="VIEWER">Viewer</option>
                  <option value="MEMBER">Member</option>
                  <option value="ADMIN">Admin</option>
                </select>
                <button type="submit" disabled={adding}
                  className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 transition-all disabled:opacity-40 whitespace-nowrap">
                  {adding ? "Adding..." : "+ Add"}
                </button>
              </div>
              {addError && <p className="text-xs text-red-400 mt-2">{addError}</p>}
            </form>

            {/* User table */}
            <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.05]">
                    {["Email", "Note", "Role", "Added", ""].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {appUsers.map(u => {
                    const meta = ROLE_META[u.role];
                    return (
                      <tr key={u.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-3.5 text-sm font-medium text-zinc-200">{u.email}</td>
                        <td className="px-5 py-3.5 text-sm text-zinc-600">{u.note ?? "—"}</td>
                        <td className="px-5 py-3.5">
                          <select
                            value={u.role}
                            onChange={e => changeRole(u.email, e.target.value as UserRole)}
                            className={`text-xs font-semibold px-2.5 py-1 rounded-lg border bg-transparent outline-none cursor-pointer ${meta.color}`}
                          >
                            <option value="VIEWER">Viewer</option>
                            <option value="MEMBER">Member</option>
                            <option value="ADMIN">Admin</option>
                          </select>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-zinc-600">
                          {new Date(u.createdAt).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}
                        </td>
                        <td className="px-5 py-3.5">
                          <button onClick={() => removeUser(u.email)}
                            className="text-[11px] px-2.5 py-1 rounded-lg border border-red-500/20 text-red-500/70 hover:text-red-400 transition-all">
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {appUsers.length === 0 && (
                    <tr><td colSpan={5} className="px-5 py-10 text-sm text-zinc-700 text-center">No users added yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "registered" && (
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden">
            <p className="text-xs text-zinc-600 border-b border-white/[0.05]" style={{ padding: '0.75rem 1.25rem' }}>
              Users who have signed in via Google OAuth — they need an entry in the Users tab to access the app.
            </p>
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.05]">
                  {["User", "Email"].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {neonUsers.map(u => (
                  <tr key={u.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={u.name} image={u.image} />
                        <span className="text-sm font-medium text-zinc-200">{u.name ?? "—"}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-zinc-500">{u.email}</td>
                  </tr>
                ))}
                {neonUsers.length === 0 && (
                  <tr><td colSpan={2} className="px-5 py-10 text-sm text-zinc-700 text-center">No registered users yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {tab === "sprints" && (
          <div className="flex flex-col gap-4">
            {/* Toolbar */}
            <div className="flex items-center justify-between">
              <div className="flex gap-1 p-1 bg-white/[0.03] rounded-xl border border-white/[0.05]">
                {(["7d", "30d"] as const).map(p => (
                  <button key={p} onClick={() => setSprintPeriod(p)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      sprintPeriod === p ? "bg-white/[0.08] text-zinc-100" : "text-zinc-600 hover:text-zinc-300"
                    }`}>{p === "7d" ? "7 days" : "30 days"}</button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                {selected.size > 0 && (
                  <>
                    <span className="text-xs text-zinc-500">{selected.size} selected</span>
                    <button onClick={deleteSprints} disabled={deleting}
                      className="px-3 py-1.5 text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl hover:bg-red-500/20 transition-all disabled:opacity-40">
                      {deleting ? "Deleting…" : "Delete selected"}
                    </button>
                  </>
                )}
                {sprints.length > 0 && (
                  <button onClick={() => setSelected(selected.size === sprints.length ? new Set() : new Set(sprints.map(s => s.id)))}
                    className="text-xs text-zinc-600 hover:text-zinc-300 transition-colors">
                    {selected.size === sprints.length ? "Deselect all" : "Select all"}
                  </button>
                )}
              </div>
            </div>

            {/* List */}
            <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden">
              {sprintsLoading ? (
                <div className="flex justify-center py-12">
                  <div className="w-5 h-5 rounded-full border-2 border-cyan-500/30 border-t-cyan-400 animate-spin" />
                </div>
              ) : sprints.length === 0 ? (
                <p className="text-sm text-zinc-700 text-center py-12">No sprint sessions in this period</p>
              ) : (
                <div className="divide-y divide-white/[0.03]">
                  {sprints.map(s => {
                    const isSelected = selected.has(s.id);
                    const d = new Date(s.createdAt);
                    const dateStr = d.toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });
                    const timeStr = d.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit", hour12: false });
                    const h = Math.floor(s.duration / 60);
                    const m = s.duration % 60;
                    return (
                      <div key={s.id} onClick={() => toggleRow(s.id)}
                        className={`flex items-center gap-4 cursor-pointer transition-all ${
                          isSelected ? "bg-red-500/[0.05] border-l-2 border-red-500/40" : "hover:bg-white/[0.02] border-l-2 border-transparent"
                        }`} style={{ padding: '0.75rem 1.25rem' }}>
                        {/* Custom selection indicator */}
                        <div className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border transition-all ${
                          isSelected ? "bg-red-500/20 border-red-500/50" : "border-white/[0.12]"
                        }`}>
                          {isSelected && (
                            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                              <path d="M1.5 4L3 5.5L6.5 2" stroke="#f87171" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 w-36">
                          {s.projectColor && <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.projectColor }} />}
                          <span className="text-xs text-zinc-500 tabular-nums">{dateStr}</span>
                        </div>
                        <span className="text-[10px] text-zinc-700 tabular-nums w-12 flex-shrink-0">{timeStr}</span>
                        <span className="text-sm text-zinc-300 flex-1 truncate">{s.taskName ?? s.projectName ?? <span className="text-zinc-700">—</span>}</span>
                        {s.projectName && <span className="text-[10px] text-zinc-600 truncate max-w-[100px]">{s.projectName}</span>}
                        <span className="text-xs font-semibold text-cyan-400 tabular-nums flex-shrink-0 w-12 text-right">
                          {h > 0 ? `${h}h ${m}m` : `${m}m`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
