import { useCallback, useEffect, useState } from "react";
import { adminAPI, transactionAPI } from "../../api.js";

const money = (v) =>
  `₱${Number(v || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const STATUS_STYLES = {
  verified: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  pending:  "border-yellow-500/30 bg-yellow-500/10 text-yellow-400",
  rejected: "border-red-500/30 bg-red-500/10 text-red-400",
  active:   "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  inactive: "border-slate-500/30 bg-slate-500/10 text-slate-400",
};

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const STAT_CARDS = (stats, loading) => [
  {
    label: "Total Revenue",
    value: money(stats?.totalRevenue),
    icon: "💰",
    grad: "from-indigo-500/20 to-indigo-600/10 border-indigo-500/20",
    text: "text-indigo-300",
  },
  {
    label: "Active Students",
    value: Number(stats?.activeStudents || 0).toLocaleString(),
    icon: "👨‍🎓",
    grad: "from-cyan-500/20 to-cyan-600/10 border-cyan-500/20",
    text: "text-cyan-300",
  },
  {
    label: "Pending Transactions",
    value: Number(stats?.pendingTransactions || 0).toLocaleString(),
    icon: "⏳",
    grad: "from-yellow-500/20 to-yellow-600/10 border-yellow-500/20",
    text: "text-yellow-300",
  },
  {
    label: "This Month",
    value: money(stats?.monthRevenue),
    icon: "📅",
    grad: "from-violet-500/20 to-violet-600/10 border-violet-500/20",
    text: "text-violet-300",
  },
];

export default function AdminDashboard({ onNavigate }) {
  const [stats, setStats]                   = useState(null);
  const [pending, setPending]               = useState([]);
  const [recentStudents, setRecentStudents] = useState([]);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState("");

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

  // Parse monthly data cleanly — convert all values to proper numbers
  const monthly = (stats?.monthlyRevenue || []).map((m) => ({
    yr:    parseInt(m.yr),
    mo:    parseInt(m.mo),
    total: parseFloat(m.total || 0),
    label: MONTH_NAMES[parseInt(m.mo) - 1] ?? String(m.mo),
  }));

  // Calculate max AFTER parsing so it's always accurate
  const maxRevenue = Math.max(...monthly.map((m) => m.total), 1);
  const statCards  = STAT_CARDS(stats, loading);

  return (
    <div className="min-h-screen space-y-5 p-4 sm:p-6">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Administration
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Overview
          </h1>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-xs text-slate-400 backdrop-blur-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          System live
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <span>⚠</span>{error}
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {statCards.map((s) => (
          <div
            key={s.label}
            className={`relative overflow-hidden rounded-3xl border bg-gradient-to-br ${s.grad} p-5 backdrop-blur-sm`}
          >
            <div
              className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-30 blur-2xl"
              style={{ background: "currentColor" }}
            />
            <span className="text-2xl">{s.icon}</span>
            <p className="mt-3 text-xl font-bold text-white">
              {loading ? "—" : s.value}
            </p>
            <p className={`mt-1 text-xs font-medium ${s.text}`}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Two-column grid: chart + pending */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

        {/* Monthly Revenue Bar Chart */}
        <div className="rounded-3xl border border-white/[0.07] bg-white/[0.02] p-5 backdrop-blur-sm">
          <div className="mb-5 flex items-center justify-between">
            <p className="font-semibold text-white">Monthly Revenue</p>
            <button
              onClick={() => onNavigate("reports")}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition"
            >
              Reports →
            </button>
          </div>

          {loading ? (
            // Skeleton bars while loading
            <div className="flex h-36 items-end gap-1.5">
              {[60, 80, 45, 90, 70, 55].map((h, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                  <div
                    className="w-full rounded-t-lg bg-white/[0.05] animate-pulse"
                    style={{ height: `${h}px` }}
                  />
                  <span className="h-2 w-4 rounded bg-white/[0.05] animate-pulse" />
                </div>
              ))}
            </div>
          ) : monthly.length === 0 ? (
            <p className="text-sm text-slate-500">No revenue data yet.</p>
          ) : (
            <>
              <div className="flex h-36 items-end gap-1.5">
                {monthly.map((m) => {
                  // Clamp minimum height to 4px so zero months still show a sliver
                  const barHeight = Math.max(4, (m.total / maxRevenue) * 130);
                  return (
                    <div
                      key={`${m.yr}-${m.mo}`}
                      className="group relative flex flex-1 flex-col items-center gap-1.5"
                    >
                      {/* Tooltip on hover */}
                      <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-slate-800 px-2 py-1 text-[10px] text-white opacity-0 transition group-hover:opacity-100">
                        {money(m.total)}
                      </div>
                      <div
                        className="w-full rounded-t-lg bg-gradient-to-t from-indigo-600 to-violet-500 opacity-80 transition-all duration-300 group-hover:opacity-100"
                        style={{ height: `${barHeight}px` }}
                      />
                      {/* Month label e.g. "May" instead of raw number */}
                      <span className="text-[10px] text-slate-600 group-hover:text-slate-400 transition">
                        {m.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* 6-month total */}
              <p className="mt-3 text-right text-xs text-slate-600">
                6-month total:{" "}
                <span className="font-semibold text-slate-400">
                  {money(monthly.reduce((sum, m) => sum + m.total, 0))}
                </span>
              </p>
            </>
          )}
        </div>

        {/* Pending Verifications */}
        <div className="rounded-3xl border border-white/[0.07] bg-white/[0.02] p-5 backdrop-blur-sm">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-white">Pending Verifications</p>
              {pending.length > 0 && (
                <span className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2 py-0.5 text-[10px] font-bold text-yellow-400">
                  {pending.length}
                </span>
              )}
            </div>
            <button
              onClick={() => onNavigate("transactions")}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition"
            >
              View all →
            </button>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 rounded-2xl bg-white/[0.03] animate-pulse" />
              ))}
            </div>
          ) : pending.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <span className="text-3xl">✅</span>
              <p className="text-sm text-slate-500">
                All caught up — no pending transactions.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {pending.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded-2xl border border-yellow-500/10 bg-yellow-500/5 px-4 py-3 transition hover:border-yellow-500/20 hover:bg-yellow-500/[0.08]"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-yellow-500/20 bg-yellow-500/10 text-sm">
                      ⏳
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">
                        {tx.student_name}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {tx.description}
                      </p>
                    </div>
                  </div>
                  <p className="ml-3 flex-shrink-0 text-sm font-bold text-white">
                    {money(tx.amount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Students */}
      <div className="rounded-3xl border border-white/[0.07] bg-white/[0.02] p-5 backdrop-blur-sm">
        <div className="mb-5 flex items-center justify-between">
          <p className="font-semibold text-white">Recent Students</p>
          <button
            onClick={() => onNavigate("students")}
            className="text-xs text-indigo-400 hover:text-indigo-300 transition"
          >
            Manage all →
          </button>
        </div>

        {/* Table header */}
        <div className="mb-2 hidden grid-cols-4 gap-4 px-4 sm:grid">
          {["Student", "ID", "Balance", "Status"].map((h) => (
            <p
              key={h}
              className="text-[10px] font-semibold uppercase tracking-widest text-slate-600"
            >
              {h}
            </p>
          ))}
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 rounded-2xl bg-white/[0.03] animate-pulse" />
            ))}
          </div>
        ) : recentStudents.length === 0 ? (
          <p className="text-sm text-slate-500">No students found.</p>
        ) : (
          <div className="space-y-2">
            {recentStudents.map((s) => (
              <div
                key={s.id}
                className="grid grid-cols-1 gap-3 rounded-2xl border border-white/[0.05] bg-white/[0.02] px-4 py-3 transition hover:bg-white/[0.04] sm:grid-cols-4 sm:items-center"
              >
                {/* Name + avatar */}
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-sm font-bold text-white shadow-lg shadow-indigo-500/20">
                    {s.name.charAt(0)}
                  </div>
                  <p className="text-sm font-medium text-white">{s.name}</p>
                </div>
                {/* Student ID */}
                <p className="text-xs font-mono text-slate-500">{s.student_id}</p>
                {/* Balance */}
                <p className="text-sm font-semibold text-white">{money(s.balance)}</p>
                {/* Status */}
                <span
                  className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-[10px] font-semibold ${STATUS_STYLES[s.status] || STATUS_STYLES.inactive}`}
                >
                  {s.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}