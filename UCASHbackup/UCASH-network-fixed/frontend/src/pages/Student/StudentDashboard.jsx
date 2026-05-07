import { useCallback, useEffect, useMemo, useState } from "react";
import { transactionAPI, userAPI, walletAPI } from "../../api.js";

const money = (v) => `₱${Number(v || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const prettyStatus = (s = "") => s.charAt(0).toUpperCase() + s.slice(1);

export default function StudentDashboard({ user, onNavigate }) {
  const [balance, setBalance] = useState(0);
  const [fees, setFees] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
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

  const outstanding = useMemo(
    () => fees.reduce((sum, fee) => sum + Number(fee.remaining_amount || 0), 0),
    [fees]
  );
  const notifications = useMemo(
    () => transactions.filter((tx) => tx.status === "pending" || tx.status === "rejected").length,
    [transactions]
  );

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Hello, {user?.name?.split(" ")[0]} 👋</h1>
          <p className="mt-1 text-sm text-slate-400">University of Cebu Student Portal</p>
        </div>
        <button onClick={() => onNavigate("notifications")} className="relative rounded-2xl bg-slate-900 p-3 transition hover:bg-slate-800">
          <span className="text-xl">🔔</span>
          {notifications > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{notifications}</span>}
        </button>
      </div>

      {error && <div className="rounded-2xl border border-red-800/60 bg-red-900/20 px-4 py-3 text-sm text-red-300">{error}</div>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-blue-800 bg-gradient-to-br from-blue-900 to-blue-950 p-5">
          <p className="text-xs font-medium text-blue-300">💰 Wallet Balance</p>
          <p className="mt-2 text-3xl font-bold text-white">{money(balance)}</p>
          <p className="mt-2 text-xs text-blue-400">Available for payments and withdrawals</p>
        </div>
        <div className="rounded-3xl border border-red-800/60 bg-gradient-to-br from-red-900/60 to-slate-900 p-5">
          <p className="text-xs font-medium text-red-300">⚠️ Outstanding Fees</p>
          <p className="mt-2 text-3xl font-bold text-white">{money(outstanding)}</p>
          <button onClick={() => onNavigate("payments")} className="mt-2 text-xs text-red-300 underline underline-offset-2 hover:text-red-200">Pay now →</button>
        </div>
      </div>

      <div>
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-400">Quick Actions</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Pay Fees", icon: "💳", page: "payments", color: "bg-blue-600 hover:bg-blue-500" },
            { label: "Add Funds", icon: "➕", page: "funds", color: "bg-teal-600 hover:bg-teal-500" },
            { label: "Withdraw", icon: "💸", page: "funds", color: "bg-purple-600 hover:bg-purple-500" },
            { label: "History", icon: "📋", page: "transactions", color: "bg-slate-700 hover:bg-slate-600" },
          ].map((a) => (
            <button key={a.label} onClick={() => onNavigate(a.page)} className={`${a.color} rounded-2xl p-4 text-center text-white transition hover:scale-[1.02]`}>
              <div className="text-2xl">{a.icon}</div>
              <div className="mt-2 text-xs font-medium">{a.label}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="font-semibold text-white">📚 Fee Breakdown</p>
          <button onClick={() => onNavigate("payments")} className="text-xs text-blue-400 hover:text-blue-300">Open payments →</button>
        </div>
        {loading ? (
          <p className="text-sm text-slate-400">Loading fees...</p>
        ) : fees.length === 0 ? (
          <p className="text-sm text-slate-400">No fees found.</p>
        ) : (
          <div className="space-y-3">
            {fees.map((fee) => {
              const total = Number(fee.total_amount || 0);
              const paid = Number(fee.paid_amount || 0);
              const pct = total > 0 ? Math.round((paid / total) * 100) : 0;
              return (
                <div key={fee.id}>
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="text-slate-300">{fee.label}</span>
                    <span className="text-slate-400">{money(paid)} / {money(total)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800">
                    <div className="h-2 rounded-full bg-blue-600" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="font-semibold text-white">📋 Recent Transactions</p>
          <button onClick={() => onNavigate("transactions")} className="text-xs text-blue-400 hover:text-blue-300">View all →</button>
        </div>
        {loading ? (
          <p className="text-sm text-slate-400">Loading transactions...</p>
        ) : transactions.length === 0 ? (
          <p className="text-sm text-slate-400">No transactions yet.</p>
        ) : (
          <div className="space-y-3">
            {transactions.slice(0, 4).map((tx) => (
              <div key={tx.id} className="flex flex-col gap-3 rounded-2xl border border-slate-800 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tx.type === "payment" ? "bg-red-900/40" : tx.type === "topup" ? "bg-green-900/40" : "bg-purple-900/40"}`}>
                    {tx.type === "payment" ? "💳" : tx.type === "topup" ? "💰" : "💸"}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{tx.description}</p>
                    <p className="text-xs text-slate-500">{tx.transaction_code} · {new Date(tx.created_at).toLocaleString()}</p>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <p className={`text-sm font-semibold ${tx.type === "topup" ? "text-green-400" : "text-red-400"}`}>{tx.type === "topup" ? "+" : "-"}{money(tx.amount)}</p>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${tx.status === "verified" ? "bg-green-900/40 text-green-400" : tx.status === "pending" ? "bg-yellow-900/40 text-yellow-400" : "bg-red-900/40 text-red-400"}`}>{prettyStatus(tx.status)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
