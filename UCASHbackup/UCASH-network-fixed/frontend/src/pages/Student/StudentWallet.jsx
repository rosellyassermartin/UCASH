import { useCallback, useEffect, useMemo, useState } from "react";
import { transactionAPI, walletAPI } from "../../api.js";

const money = (v) => `₱${Number(v || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const badge = (status) => status === "verified" ? "bg-green-900/40 text-green-400" : status === "pending" ? "bg-yellow-900/40 text-yellow-400" : "bg-red-900/40 text-red-400";

export default function StudentWallet({ user }) {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [showQR, setShowQR] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [balanceRes, txRes] = await Promise.all([
        walletAPI.getBalance(),
        transactionAPI.getMyTransactions({ limit: 10 }),
      ]);
      setBalance(Number(balanceRes.balance || 0));
      setTransactions(txRes.transactions || []);
    } catch (err) {
      setError(err.message || "Could not load wallet.");
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

  const summary = useMemo(() => {
    const paid = transactions.filter((t) => t.type === "payment").reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const totalIn = transactions.filter((t) => t.type === "topup").reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const pending = transactions.filter((t) => t.status === "pending").reduce((sum, t) => sum + Number(t.amount || 0), 0);
    return { paid, totalIn, pending };
  }, [transactions]);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <h1 className="text-2xl font-bold text-white">👛 My Wallet</h1>

      {error && <div className="rounded-2xl border border-red-800/60 bg-red-900/20 px-4 py-3 text-sm text-red-300">{error}</div>}

      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-800 to-blue-950 p-6">
        <div className="absolute right-0 top-0 h-48 w-48 translate-x-12 -translate-y-12 rounded-full bg-blue-600/20" />
        <div className="absolute bottom-0 left-0 h-32 w-32 -translate-x-8 translate-y-8 rounded-full bg-blue-700/20" />
        <div className="relative z-10">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-blue-200">UCash Wallet</p>
              <p className="text-sm font-medium text-white">{user.name}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-xl">U</div>
          </div>
          <p className="text-sm text-blue-300">Available Balance</p>
          <p className="text-4xl font-bold text-white">{loading ? "Loading..." : money(balance)}</p>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs text-blue-300">Student ID</p>
              <p className="font-mono text-sm text-white">{user.studentId || "—"}</p>
            </div>
            <button onClick={() => setShowQR((v) => !v)} className="rounded-xl bg-white/20 px-3 py-2 text-xs text-white transition hover:bg-white/30">
              {showQR ? "Hide QR" : "Show QR"}
            </button>
          </div>
        </div>
      </div>

      {showQR && (
        <div className="flex flex-col items-center rounded-3xl border border-slate-800 bg-slate-900 p-5">
          <p className="mb-4 font-semibold text-white">📱 Wallet QR Code</p>
          <div className="rounded-xl bg-white p-4">
            <div className="grid h-32 w-32 grid-cols-8 gap-0.5">
              {Array.from({ length: 64 }, (_, i) => (
                <div key={i} className={`h-3 w-3 rounded-sm ${((i * 7 + 3) % 5) > 1 ? "bg-slate-900" : "bg-white"}`} />
              ))}
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-400">For demo display only</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: "Total Paid", value: money(summary.paid), icon: "📤", color: "text-red-400" },
          { label: "Total In", value: money(summary.totalIn), icon: "📥", color: "text-green-400" },
          { label: "Pending", value: money(summary.pending), icon: "⏳", color: "text-yellow-400" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-center">
            <p className="mb-1 text-xl">{s.icon}</p>
            <p className={`text-base font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
        <p className="mb-4 font-semibold text-white">Transaction History</p>
        {loading ? (
          <p className="text-sm text-slate-400">Loading transactions...</p>
        ) : transactions.length === 0 ? (
          <p className="text-sm text-slate-400">No transactions found.</p>
        ) : (
          <div className="space-y-2">
            {transactions.slice(0, 8).map((tx) => (
              <div key={tx.id} className="flex flex-col gap-3 rounded-2xl bg-slate-800/60 p-3 transition hover:bg-slate-800 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm ${tx.type === "payment" ? "bg-red-900/40" : tx.type === "topup" ? "bg-green-900/40" : "bg-purple-900/40"}`}>
                    {tx.type === "payment" ? "💳" : tx.type === "topup" ? "💰" : "💸"}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{tx.description}</p>
                    <p className="text-xs text-slate-500">{new Date(tx.created_at).toLocaleString()}</p>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <p className={`text-sm font-bold ${tx.type === "topup" ? "text-green-400" : "text-red-400"}`}>{tx.type === "topup" ? "+" : "-"}{money(tx.amount)}</p>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${badge(tx.status)}`}>{tx.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
