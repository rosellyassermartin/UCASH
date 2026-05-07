import { useCallback, useEffect, useMemo, useState } from "react";
import { transactionAPI, userAPI, walletAPI } from "../../api.js";

const money = (v) =>
  `₱${Number(v || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const prettyStatus = (s = "") => s.charAt(0).toUpperCase() + s.slice(1);

const STATUS_STYLES = {
  verified: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  pending:  "border-yellow-500/30 bg-yellow-500/10 text-yellow-400",
  rejected: "border-red-500/30 bg-red-500/10 text-red-400",
};

const TX_ICON = {
  payment:    { bg: "bg-rose-500/10 border-rose-500/20",    emoji: "💳" },
  topup:      { bg: "bg-emerald-500/10 border-emerald-500/20", emoji: "💰" },
  withdrawal: { bg: "bg-violet-500/10 border-violet-500/20",  emoji: "💸" },
};

export default function StudentDashboard({ user, onNavigate }) {
  const [balance, setBalance]           = useState(0);
  const [fees, setFees]                 = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");

  const loadData = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [balanceRes, feesRes, txRes] = await Promise.all([
        walletAPI.getBalance(),
        userAPI.getFees(),
        transactionAPI.getMyTransactions({ limit: 5 }),
      ]);
      setBalance(Number(balanceRes.balance || 0));
      setFees(feesRes.fees || []);
      setTransactions(txRes.transactions || []);
    } catch (err) {
      setError(err.message || "Could not load dashboard.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    loadData();
    const handler = () => loadData();
    window.addEventListener("ucash:data-changed", handler);
    return () => window.removeEventListener("ucash:data-changed", handler);
  }, [loadData]);

  // ✅ FIXED: was using fee.remaining_amount which was always 0
  const outstanding = useMemo(
    () => fees.reduce((sum, fee) => sum + (Number(fee.total_amount || 0) - Number(fee.paid_amount || 0)), 0),
    [fees]
  );

  const notifications = useMemo(
    () => transactions.filter((tx) => tx.status === "pending" || tx.status === "rejected").length,
    [transactions]
  );

  return (
    <div className="min-h-screen space-y-5 p-4 sm:p-6">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">Student Portal</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Hello, {user?.name?.split(" ")[0]}
          </h1>
        </div>
        <button
          onClick={() => onNavigate("notifications")}
          className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03] text-slate-300 backdrop-blur-sm transition hover:bg-white/[0.07]"
        >
          🔔
          {notifications > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-pink-600 px-1 text-[10px] font-bold text-white shadow-lg shadow-rose-500/40">
              {notifications}
            </span>
          )}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <span>⚠</span>{error}
        </div>
      )}

      {/* Balance + Outstanding */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="relative overflow-hidden rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-600/20 via-violet-600/10 to-transparent p-6 backdrop-blur-sm">
          <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-indigo-500/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-8 -left-4 h-32 w-32 rounded-full bg-violet-500/10 blur-2xl" />
          <p className="relative text-xs font-semibold uppercase tracking-widest text-indigo-300">Wallet Balance</p>
          <p className="relative mt-3 text-4xl font-bold tracking-tight text-white">{money(balance)}</p>
          <p className="relative mt-1.5 text-xs text-indigo-300/70">Available for payments</p>
          <div className="relative mt-4 h-px w-full bg-gradient-to-r from-indigo-500/30 to-transparent" />
          <div className="relative mt-3 flex gap-2">
            <button onClick={() => onNavigate("funds")} className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold text-indigo-300 transition hover:bg-indigo-500/20">
              + Add Funds
            </button>
            <button onClick={() => onNavigate("funds")} className="rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-300 transition hover:bg-violet-500/20">
              Withdraw
            </button>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-rose-500/20 bg-gradient-to-br from-rose-600/10 via-pink-600/5 to-transparent p-6 backdrop-blur-sm">
          <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-rose-500/10 blur-2xl" />
          <p className="relative text-xs font-semibold uppercase tracking-widest text-rose-300">Outstanding Fees</p>
          <p className="relative mt-3 text-4xl font-bold tracking-tight text-white">{money(outstanding)}</p>
          <p className="relative mt-1.5 text-xs text-rose-300/70">Unpaid balance across all fees</p>
          <div className="relative mt-4 h-px w-full bg-gradient-to-r from-rose-500/30 to-transparent" />
          <button
            onClick={() => onNavigate("payments")}
            className="relative mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/20"
          >
            Pay Now →
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Quick Actions</p>
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Pay Fees",  icon: "💳", page: "payments",     grad: "from-indigo-500/20 to-indigo-600/10 border-indigo-500/20 text-indigo-300" },
            { label: "Add Funds", icon: "➕", page: "funds",        grad: "from-cyan-500/20 to-cyan-600/10 border-cyan-500/20 text-cyan-300" },
            { label: "Withdraw",  icon: "💸", page: "funds",        grad: "from-violet-500/20 to-violet-600/10 border-violet-500/20 text-violet-300" },
            { label: "History",   icon: "📋", page: "transactions", grad: "from-slate-600/20 to-slate-700/10 border-slate-600/20 text-slate-300" },
          ].map((a) => (
            <button
              key={a.label}
              onClick={() => onNavigate(a.page)}
              className={`flex flex-col items-center gap-2 rounded-2xl border bg-gradient-to-br ${a.grad} p-3 text-center backdrop-blur-sm transition hover:scale-[1.03] hover:brightness-110 active:scale-[0.97]`}
            >
              <span className="text-2xl">{a.icon}</span>
              <span className="text-[11px] font-semibold leading-tight">{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Fee Breakdown */}
      <div className="rounded-3xl border border-white/[0.07] bg-white/[0.02] p-5 backdrop-blur-sm">
        <div className="mb-5 flex items-center justify-between">
          <p className="font-semibold text-white">Fee Breakdown</p>
          <button onClick={() => onNavigate("payments")} className="text-xs text-indigo-400 hover:text-indigo-300 transition">
            Manage →
          </button>
        </div>
        {loading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => (
              <div key={i} className="space-y-2">
                <div className="h-3 w-2/3 rounded-full bg-white/[0.05] animate-pulse" />
                <div className="h-2 w-full rounded-full bg-white/[0.04] animate-pulse" />
              </div>
            ))}
          </div>
        ) : fees.length === 0 ? (
          <p className="text-sm text-slate-500">No fees found.</p>
        ) : (
          <div className="space-y-4">
            {fees.map((fee) => {
              const total = Number(fee.total_amount || 0);
              const paid  = Number(fee.paid_amount || 0);
              const pct   = total > 0 ? Math.round((paid / total) * 100) : 0;
              return (
                <div key={fee.id}>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium text-slate-300">{fee.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">{money(paid)} / {money(total)}</span>
                      <span className="text-xs font-semibold text-slate-400">{pct}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Transactions */}
      <div className="rounded-3xl border border-white/[0.07] bg-white/[0.02] p-5 backdrop-blur-sm">
        <div className="mb-5 flex items-center justify-between">
          <p className="font-semibold text-white">Recent Transactions</p>
          <button onClick={() => onNavigate("transactions")} className="text-xs text-indigo-400 hover:text-indigo-300 transition">
            View all →
          </button>
        </div>
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="h-16 rounded-2xl bg-white/[0.03] animate-pulse" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <p className="text-sm text-slate-500">No transactions yet.</p>
        ) : (
          <div className="space-y-2">
            {transactions.slice(0, 4).map((tx) => {
              const style = TX_ICON[tx.type] || TX_ICON.payment;
              return (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded-2xl border border-white/[0.05] bg-white/[0.02] px-4 py-3 transition hover:bg-white/[0.04]"
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border text-lg ${style.bg}`}>
                      {style.emoji}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">{tx.description}</p>
                      <p className="text-xs text-slate-500">{new Date(tx.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="ml-3 flex-shrink-0 text-right">
                    <p className={`text-sm font-bold ${tx.type === "topup" ? "text-emerald-400" : "text-rose-400"}`}>
                      {tx.type === "topup" ? "+" : "-"}{money(tx.amount)}
                    </p>
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLES[tx.status] || STATUS_STYLES.pending}`}>
                      {prettyStatus(tx.status)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}