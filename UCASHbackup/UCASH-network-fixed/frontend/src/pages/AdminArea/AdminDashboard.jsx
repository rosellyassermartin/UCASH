import { useCallback, useEffect, useState } from "react";
import { adminAPI, transactionAPI } from "../../api.js";

const money = (v) => `₱${Number(v || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function AdminDashboard({ onNavigate }) {
  const [stats, setStats] = useState(null);
  const [pending, setPending] = useState([]);
  const [recentStudents, setRecentStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [statsRes, txRes, studentsRes] = await Promise.all([
        adminAPI.getStats(),
        transactionAPI.getAll({ status: "pending", limit: 4 }),
        adminAPI.getStudents({ sortBy: "newest", limit: 3 }),
      ]);
      setStats(statsRes.stats);
      setPending(txRes.transactions || []);
      setRecentStudents(studentsRes.students || []);
    } catch (err) {
      setError(err.message || "Could not load admin dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const handler = () => loadData();
    window.addEventListener("ucash:data-changed", handler);
    return () => window.removeEventListener("ucash:data-changed", handler);
  }, [loadData]);

  const monthly = stats?.monthlyRevenue || [];
  const maxRevenue = Math.max(...monthly.map((m) => Number(m.total || 0)), 1);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold text-white">📊 Admin Dashboard</h1>
        <p className="mt-1 text-sm text-slate-400">University of Cebu — UCash Management</p>
      </div>

      {error && <div className="rounded-2xl border border-red-700 bg-red-900/30 px-4 py-3 text-sm text-red-300">{error}</div>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total Revenue", value: money(stats?.totalRevenue), icon: "💰" },
          { label: "Active Students", value: Number(stats?.activeStudents || 0).toLocaleString(), icon: "👨‍🎓" },
          { label: "Pending Transactions", value: Number(stats?.pendingTransactions || 0).toLocaleString(), icon: "⏳" },
          { label: "This Month", value: money(stats?.monthRevenue), icon: "📅" },
        ].map((s) => (
          <div key={s.label} className="rounded-3xl border border-slate-800 bg-slate-900 p-4">
            <div className="mb-2 flex items-center justify-between"><span className="text-xl">{s.icon}</span></div>
            <p className="text-lg font-bold text-white">{loading ? "Loading..." : s.value}</p>
            <p className="text-xs text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-white">⏳ Pending Verifications</p>
            <span className="rounded-full bg-yellow-500 px-2 py-0.5 text-xs font-bold text-yellow-950">{pending.length}</span>
          </div>
          <button onClick={() => onNavigate("transactions")} className="text-xs text-indigo-400 hover:text-indigo-300">View all →</button>
        </div>
        <div className="space-y-2">
          {pending.length === 0 ? <p className="text-sm text-slate-400">No pending transactions.</p> : pending.map((tx) => (
            <div key={tx.id} className="flex flex-col gap-3 rounded-2xl border border-yellow-800/30 bg-yellow-900/10 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-900/40 text-sm">⏳</div>
                <div>
                  <p className="text-sm font-medium text-white">{tx.student_name}</p>
                  <p className="text-xs text-slate-500">{tx.description} · {new Date(tx.created_at).toLocaleString()}</p>
                </div>
              </div>
              <p className="text-sm font-bold text-white">{money(tx.amount)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
        <p className="mb-4 font-semibold text-white">📈 Monthly Revenue</p>
        {monthly.length === 0 ? <p className="text-sm text-slate-400">No revenue data yet.</p> : (
          <div className="flex h-40 items-end gap-2">
            {monthly.map((m) => {
              const label = `${m.mo}`;
              return (
                <div key={`${m.yr}-${m.mo}`} className="flex flex-1 flex-col items-center gap-1">
                  <div className="w-full rounded-t-md bg-indigo-500" style={{ height: `${(Number(m.total || 0) / maxRevenue) * 110}px` }} />
                  <span className="text-xs text-slate-500">{label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="font-semibold text-white">👨‍🎓 Recent Students</p>
          <button onClick={() => onNavigate("students")} className="text-xs text-indigo-400 hover:text-indigo-300">Manage →</button>
        </div>
        <div className="space-y-2">
          {recentStudents.length === 0 ? <p className="text-sm text-slate-400">No students found.</p> : recentStudents.map((s) => (
            <div key={s.id} className="flex flex-col gap-3 rounded-2xl bg-slate-800/60 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-700 text-sm font-bold text-white">{s.name.charAt(0)}</div>
                <div>
                  <p className="text-sm text-white">{s.name}</p>
                  <p className="text-xs text-slate-500">{s.student_id} · {new Date(s.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-sm font-medium text-white">{money(s.balance)}</p>
                <span className={`rounded-full px-2 py-0.5 text-xs ${s.status === "active" ? "bg-green-900/40 text-green-400" : "bg-red-900/40 text-red-400"}`}>{s.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
