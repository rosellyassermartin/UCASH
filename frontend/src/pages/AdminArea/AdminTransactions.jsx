import { useCallback, useEffect, useMemo, useState } from "react";
import { transactionAPI } from "../../api.js";

const money = (v) => `₱${Number(v || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const prettyStatus = (status = "") => status.charAt(0).toUpperCase() + status.slice(1);

export default function AdminTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [modal, setModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = { limit: 100 };
      if (filter !== "All") params.status = filter.toLowerCase();
      if (search) params.search = search;
      const res = await transactionAPI.getAll(params);
      setTransactions(res.transactions || []);
    } catch (err) {
      setError(err.message || "Could not load transactions.");
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateStatus = async (id, status) => {
    try {
      if (status === "Verified") {
        await transactionAPI.verify(id);
        setSuccess("Transaction verified.");
      } else {
        await transactionAPI.reject(id, rejectReason || "Rejected by admin.");
        setSuccess("Transaction rejected.");
      }
      setModal(null);
      setSelected(null);
      setRejectReason("");
      await loadData();
      window.dispatchEvent(new Event("ucash:data-changed"));
    } catch (err) {
      setError(err.message || "Could not update transaction.");
    }
  };

  const counts = useMemo(() => ({
    All: transactions.length,
    Pending: transactions.filter((t) => t.status === "pending").length,
    Verified: transactions.filter((t) => t.status === "verified").length,
    Rejected: transactions.filter((t) => t.status === "rejected").length,
  }), [transactions]);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <h1 className="text-2xl font-bold text-white">💰 Transaction Verification</h1>

      {error && <div className="rounded-2xl border border-red-700 bg-red-900/30 px-4 py-3 text-sm text-red-300">{error}</div>}
      {success && <div className="rounded-2xl border border-green-700 bg-green-900/30 px-4 py-3 text-sm text-green-300">{success}</div>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Total", count: counts.All, color: "text-white" },
          { label: "Pending", count: counts.Pending, color: "text-yellow-400" },
          { label: "Verified", count: counts.Verified, color: "text-green-400" },
          { label: "Rejected", count: counts.Rejected, color: "text-red-400" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-slate-800 bg-slate-900 p-3 text-center">
            <p className={`text-xl font-bold ${s.color}`}>{s.count}</p>
            <p className="text-xs text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 Search student, transaction ID..." className="min-w-[220px] flex-1 rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white outline-none focus:border-indigo-500" />
        <div className="flex flex-wrap gap-1">
          {["All", "Pending", "Verified", "Rejected"].map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`rounded-xl px-3 py-2 text-xs font-medium transition ${filter === f ? "bg-indigo-600 text-white" : "border border-slate-700 bg-slate-800 text-slate-400 hover:text-white"}`}>
              {f} ({counts[f] || 0})
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {loading ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-400">Loading transactions...</div>
        ) : transactions.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-400">No transactions found.</div>
        ) : (
          transactions.map((tx) => (
            <div key={tx.id} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
              <div className="flex cursor-pointer flex-col gap-4 p-4 transition hover:bg-slate-800/50 sm:flex-row sm:items-center sm:justify-between" onClick={() => setSelected(selected === tx.id ? null : tx.id)}>
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm ${tx.type === "payment" ? "bg-blue-900/40" : tx.type === "topup" ? "bg-teal-900/40" : "bg-purple-900/40"}`}>
                    {tx.type === "payment" ? "💳" : tx.type === "topup" ? "💰" : "💸"}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-white">{tx.student_name}</p>
                      <p className="font-mono text-xs text-slate-500">{tx.student_id}</p>
                    </div>
                    <p className="text-xs text-slate-500">{tx.description} · {new Date(tx.created_at).toLocaleString()} · {tx.transaction_code}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-sm font-bold text-white">{money(tx.amount)}</p>
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${tx.status === "verified" ? "bg-green-900/40 text-green-400" : tx.status === "pending" ? "bg-yellow-900/40 text-yellow-400" : "bg-red-900/40 text-red-400"}`}>{prettyStatus(tx.status)}</span>
                </div>
              </div>

              {selected === tx.id && (
                <div className="space-y-3 border-t border-slate-800 bg-slate-800/30 p-4">
                  <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-3">
                    <div><p className="text-slate-500">Transaction ID</p><p className="font-mono text-slate-200">{tx.transaction_code}</p></div>
                    <div><p className="text-slate-500">Category</p><p className="text-slate-200">{tx.type}</p></div>
                    <div><p className="text-slate-500">Amount</p><p className="font-bold text-white">{money(tx.amount)}</p></div>
                  </div>
                  {tx.status === "pending" ? (
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <button onClick={() => updateStatus(tx.id, "Verified")} className="flex-1 rounded-2xl bg-green-700 py-3 text-sm font-semibold text-white transition hover:bg-green-600">✅ Verify Transaction</button>
                      <button onClick={() => setModal(tx.id)} className="flex-1 rounded-2xl bg-red-800 py-3 text-sm font-semibold text-white transition hover:bg-red-700">❌ Reject</button>
                    </div>
                  ) : (
                    <div className={`rounded-2xl p-3 text-sm ${tx.status === "verified" ? "bg-green-900/20 text-green-400" : "bg-red-900/20 text-red-400"}`}>{tx.status === "verified" ? "✅ This transaction has been verified" : `❌ This transaction was rejected${tx.rejection_reason ? `: ${tx.rejection_reason}` : ""}`}</div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-3xl border border-slate-700 bg-slate-900 p-6">
            <h3 className="mb-3 text-base font-bold text-white">❌ Reject Transaction</h3>
            <p className="mb-3 text-sm text-slate-400">Transaction ID: <span className="font-mono text-white">{modal}</span></p>
            <label className="mb-1.5 block text-xs text-slate-400">Reason for rejection</label>
            <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} className="mb-4 w-full resize-none rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white outline-none focus:border-red-500" placeholder="e.g. Incorrect amount or invalid proof" />
            <div className="flex flex-col gap-3 sm:flex-row">
              <button onClick={() => setModal(null)} className="flex-1 rounded-2xl bg-slate-800 py-3 text-sm text-slate-300 transition hover:bg-slate-700">Cancel</button>
              <button onClick={() => updateStatus(modal, "Rejected")} className="flex-1 rounded-2xl bg-red-700 py-3 text-sm font-semibold text-white transition hover:bg-red-600">Confirm Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
