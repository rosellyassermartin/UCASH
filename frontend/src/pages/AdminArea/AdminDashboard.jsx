import { useCallback, useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, defs, linearGradient, stop
} from "recharts";
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

const STAT_CARDS = (stats) => [
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

// ── Custom tooltip for the chart ──────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-slate-800/95 px-3 py-2 shadow-xl backdrop-blur-sm">
      <p className="mb-1 text-xs font-semibold text-slate-400">{label}</p>
      <p className="text-sm font-bold text-white">{money(payload[0].value)}</p>
    </div>
  );
};

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

  // Parse monthly data for Recharts
  const monthly = (stats?.monthlyRevenue || []).map((m) => ({
    yr:    parseInt(m.yr),
    mo:    parseInt(m.mo),
    total: parseFloat(m.total || 0),
    label: MONTH_NAMES[parseInt(m.mo) - 1] ?? String(m.mo),
  }));

  const statCards = STAT_CARDS(stats);

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

        {/* Monthly Revenue Line Chart */}
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
            <div className="flex h-44 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            </div>
          ) : monthly.length === 0 ? (
            <div className="flex h-44 items-center justify-center">
              <p className="text-sm text-slate-500">No revenue data yet.</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart
                  data={monthly}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  {/* Gradient definition */}
                  <defs>
                    <linearGradient id="dashboardLineGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%"   stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.05)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#64748b", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={55}
                    tickFormatter={(v) =>
                      v >= 1000 ? `₱${(v / 1000).toFixed(0)}k` : `₱${v}`
                    }
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="url(#dashboardLineGrad)"
                    strokeWidth={2.5}
                    dot={{ fill: "#8b5cf6", r: 4, strokeWidth: 2, stroke: "#1e1b4b" }}
                    activeDot={{ r: 6, fill: "#a78bfa", stroke: "#1e1b4b", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>

              {/* 6-month total */}
              <p className="mt-2 text-right text-xs text-slate-600">
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

        <div className="mb-2 hidden grid-cols-4 gap-4 px-4 sm:grid">
          {["Student", "ID", "Balance", "Status"].map((h) => (
            <p key={h} className="text-[10px] font-semibold uppercase tracking-widest text-slate-600">
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
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-sm font-bold text-white shadow-lg shadow-indigo-500/20">
                    {s.name.charAt(0)}
                  </div>
                  <p className="text-sm font-medium text-white">{s.name}</p>
                </div>
                <p className="text-xs font-mono text-slate-500">{s.student_id}</p>
                <p className="text-sm font-semibold text-white">{money(s.balance)}</p>
                <span className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-[10px] font-semibold ${STATUS_STYLES[s.status] || STATUS_STYLES.inactive}`}>
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