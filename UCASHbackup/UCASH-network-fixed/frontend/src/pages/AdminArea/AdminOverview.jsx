import { useCallback, useEffect, useMemo, useState } from "react";
import { adminAPI, transactionAPI } from "../../api.js";

export default function AdminOverview() {
  const [stats, setStats] = useState(null);
  const [students, setStudents] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    try {
      const [statsRes, studentsRes, txRes] = await Promise.all([
        adminAPI.getStats(),
        adminAPI.getStudents({ limit: 100 }),
        transactionAPI.getAll({ limit: 10 }),
      ]);
      setStats(statsRes.stats);
      setStudents(studentsRes.students || []);
      setTransactions(txRes.transactions || []);
    } catch (err) {
      setError(err.message || "Could not load overview.");
    }
  }, []);

  useEffect(() => {
    loadData();
    const handler = () => loadData();
    window.addEventListener("ucash:data-changed", handler);
    return () => window.removeEventListener("ucash:data-changed", handler);
  }, [loadData]);

  const byCourse = useMemo(() => {
    const map = new Map();
    students.forEach((s) => {
      const key = s.course || "Others";
      map.set(key, (map.get(key) || 0) + 1);
    });
    const total = students.length || 1;
    return Array.from(map.entries()).map(([course, count]) => ({
      course,
      count,
      pct: Math.round((count / total) * 100),
    })).sort((a, b) => b.count - a.count);
  }, [students]);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <h1 className="text-2xl font-bold text-white">👁️ System Overview</h1>
      {error && <div className="rounded-2xl border border-red-700 bg-red-900/30 px-4 py-3 text-sm text-red-300">{error}</div>}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "System Status", value: "Online", icon: "🟢", color: "text-green-400" },
          { label: "Students", value: String(stats?.totalStudents || 0), icon: "👨‍🎓", color: "text-blue-400" },
          { label: "Pending Tx", value: String(stats?.pendingTransactions || 0), icon: "⏳", color: "text-yellow-400" },
          { label: "Verified Tx", value: String(stats?.verifiedTransactions || 0), icon: "✅", color: "text-green-400" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <div className="mb-1 flex items-center gap-2"><span>{s.icon}</span><p className={`text-sm font-bold ${s.color}`}>{s.value}</p></div>
            <p className="text-xs text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
        <p className="mb-4 font-semibold text-white">📚 Students by Course</p>
        <div className="space-y-3">
          {byCourse.length === 0 ? <p className="text-sm text-slate-400">No student records yet.</p> : byCourse.map((s) => (
            <div key={s.course}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-slate-300">{s.course}</span>
                <div className="flex items-center gap-3"><span className="text-xs text-slate-500">{s.pct}%</span><span className="font-medium text-white">{s.count}</span></div>
              </div>
              <div className="h-1.5 rounded-full bg-slate-800"><div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${s.pct}%` }} /></div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
        <p className="mb-4 font-semibold text-white">📜 Recent Activity</p>
        <div className="space-y-3">
          {transactions.length === 0 ? <p className="text-sm text-slate-400">No recent activity.</p> : transactions.slice(0, 6).map((tx) => (
            <div key={tx.id} className="flex items-center gap-3 border-b border-slate-800/60 py-2 last:border-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-sm">{tx.status === "verified" ? "✅" : tx.status === "pending" ? "⏳" : "❌"}</div>
              <div className="flex-1">
                <p className="text-sm text-slate-300">{tx.student_name} — {tx.description}</p>
                <p className="text-xs text-slate-600">{new Date(tx.created_at).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
