"use client";

import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth/client";
import { useRouter } from "next/navigation";

interface AdminUser { id: string; name: string | null; email: string | null; image: string | null; isAdmin: boolean; }
interface WhitelistEntry { id: string; email: string; note: string | null; isAdmin: boolean; createdAt: string; }

function Avatar({ name, image }: { name: string | null; image: string | null }) {
  const initials = name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() ?? "?";
  return image
    ? <img src={image} alt={name ?? ""} className="w-8 h-8 rounded-full object-cover" />
    : <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500/40 to-violet-500/40 flex items-center justify-center text-xs font-bold text-white">{initials}</div>;
}

export default function AdminPage() {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [whitelist, setWhitelist] = useState<WhitelistEntry[]>([]);
  const [tab, setTab] = useState<"users" | "whitelist">("whitelist");
  const [newEmail, setNewEmail] = useState("");
  const [newNote, setNewNote] = useState("");
  const [adding, setAdding] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isPending && !session) router.push("/login");
  }, [session, isPending, router]);

  useEffect(() => {
    if (!session) return;
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      setIsAdmin(d.isAdmin ?? false);
      if (!d.isAdmin) router.push("/dashboard");
    });
  }, [session, router]);

  useEffect(() => {
    if (!isAdmin) return;
    fetch("/api/admin/users").then(r => r.json()).then(d => setUsers(d.users ?? []));
    fetch("/api/admin/whitelist").then(r => r.json()).then(d => setWhitelist(d.entries ?? []));
  }, [isAdmin]);

  async function toggleAdmin(userId: string, admin: boolean) {
    await fetch("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, isAdmin: admin }) });
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, isAdmin: admin } : u));
  }

  async function removeUser(userId: string) {
    if (!confirm("Remove this user?")) return;
    await fetch("/api/admin/users", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId }) });
    setUsers(prev => prev.filter(u => u.id !== userId));
  }

  async function addToWhitelist(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmail.includes("@")) return;
    setAdding(true);
    const res = await fetch("/api/admin/whitelist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: newEmail, note: newNote }) });
    const data = await res.json();
    if (data.entry) setWhitelist(prev => [...prev.filter(e => e.email !== data.entry.email), data.entry]);
    setNewEmail(""); setNewNote(""); setAdding(false);
  }

  async function toggleWhitelistAdmin(email: string, admin: boolean) {
    const res = await fetch("/api/admin/whitelist", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, isAdmin: admin }) });
    const data = await res.json();
    if (data.entry) setWhitelist(prev => prev.map(e => e.email === email ? data.entry : e));
  }

  async function removeFromWhitelist(email: string) {
    await fetch("/api/admin/whitelist", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
    setWhitelist(prev => prev.filter(e => e.email !== email));
  }

  if (isPending || isAdmin === null) return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
      <div className="w-5 h-5 rounded-full border-2 border-cyan-500/30 border-t-cyan-400 animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100">
      <div className="border-b border-white/[0.06] bg-[#09090b]/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/dashboard")} className="text-zinc-600 hover:text-zinc-300 transition-colors text-sm">← Dashboard</button>
            <span className="text-zinc-700">|</span>
            <h1 className="text-sm font-semibold">Admin Panel</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-zinc-700 bg-white/[0.04] px-2 py-1 rounded-full border border-white/[0.05]">RESTRICTED</span>
            <button onClick={() => authClient.signOut({ fetchOptions: { onSuccess: () => router.push("/login") } })}
              className="text-xs text-zinc-600 hover:text-zinc-300 transition-colors">Sign out</button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Registered Users", value: users.length, color: "text-cyan-400" },
            { label: "Admins", value: whitelist.filter(e => e.isAdmin).length + 1, color: "text-violet-400" },
            { label: "Whitelisted", value: whitelist.length, color: "text-emerald-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-[#111116] border border-white/[0.06] rounded-2xl p-5">
              <p className="text-xs text-zinc-600 mb-1">{label}</p>
              <p className={`text-3xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-1 p-1 bg-white/[0.03] rounded-xl border border-white/[0.05] w-fit mb-6">
          {(["whitelist", "users"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all capitalize ${
                tab === t ? "bg-white/[0.08] text-zinc-100" : "text-zinc-600 hover:text-zinc-300"
              }`}>
              {t === "users" ? `Registered (${users.length})` : `Whitelist (${whitelist.length})`}
            </button>
          ))}
        </div>

        {/* Whitelist tab */}
        {tab === "whitelist" && (
          <div className="flex flex-col gap-4">
            <div className="bg-[#111116] border border-white/[0.06] rounded-2xl p-4 text-xs text-zinc-600">
              Add emails here to allow users to sign in. Without an entry, sign-in will be blocked with a 403.
              The <span className="text-cyan-400">{process.env.NEXT_PUBLIC_AUTHORIZED_EMAIL ?? "owner"}</span> is always allowed regardless of this list.
            </div>
            <form onSubmit={addToWhitelist} className="bg-[#111116] border border-white/[0.06] rounded-2xl p-5 flex gap-3">
              <input type="email" placeholder="email@example.com" value={newEmail} onChange={e => setNewEmail(e.target.value)} required
                className="flex-1 bg-[#09090b] border border-white/[0.08] focus:border-cyan-500/40 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-700 outline-none" />
              <input type="text" placeholder="Note (optional)" value={newNote} onChange={e => setNewNote(e.target.value)}
                className="flex-1 bg-[#09090b] border border-white/[0.08] focus:border-cyan-500/40 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-700 outline-none" />
              <button type="submit" disabled={adding}
                className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 transition-all disabled:opacity-40 whitespace-nowrap">
                + Add
              </button>
            </form>

            <div className="bg-[#111116] border border-white/[0.06] rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.05]">
                    {["Email", "Note", "Admin", "Added", ""].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {whitelist.map(entry => (
                    <tr key={entry.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-zinc-200">{entry.email}</td>
                      <td className="px-4 py-3 text-sm text-zinc-600">{entry.note ?? "—"}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => toggleWhitelistAdmin(entry.email, !entry.isAdmin)}
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all ${
                            entry.isAdmin
                              ? "bg-violet-500/15 text-violet-400 border-violet-500/20"
                              : "bg-white/[0.04] text-zinc-600 border-white/[0.06] hover:border-white/[0.15]"
                          }`}>
                          {entry.isAdmin ? "Admin" : "Member"}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-600">
                        {new Date(entry.createdAt).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => removeFromWhitelist(entry.email)}
                          className="text-[11px] px-2.5 py-1 rounded-lg border border-red-500/20 text-red-500/70 hover:text-red-400 transition-all">
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {whitelist.length === 0 && <p className="text-sm text-zinc-700 text-center py-10">No whitelisted emails yet.</p>}
            </div>
          </div>
        )}

        {/* Users tab */}
        {tab === "users" && (
          <div className="bg-[#111116] border border-white/[0.06] rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.05]">
                  {["User", "Email", "Actions"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={u.name} image={u.image} />
                        <span className="text-sm font-medium text-zinc-200">{u.name ?? "—"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-500">{u.email}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => removeUser(u.id)}
                        className="text-[11px] px-2.5 py-1 rounded-lg border border-red-500/20 text-red-500/70 hover:text-red-400 transition-all">
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && <p className="text-sm text-zinc-700 text-center py-10">No registered users yet.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
