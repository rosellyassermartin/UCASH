import { useCallback, useEffect, useMemo, useState } from "react";
import { transactionAPI } from "../../api.js";

const formatMoney = (amount, type) => `${type === "topup" ? "+" : "-"}₱${Math.abs(Number(amount || 0)).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const prettyType = (type = "") => (type === "topup" ? "Top-up" : type === "payment" ? "Payment" : "Withdrawal");
const prettyStatus = (status = "") => status.charAt(0).toUpperCase() + status.slice(1);

export default function StudentTransactions({ user }) {
  const [transactions, setTransactions] = useState([]);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await transactionAPI.getMyTransactions({ limit: 100 });
      setTransactions(res.transactions || []);
    } catch (err) {
      setError(err.message || "Could not fetch transactions.");
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

  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      const type = prettyType(tx.type);
      const matchType = filter === "All" || type === filter;
      const hay = `${tx.description} ${tx.transaction_code} ${tx.reference_number || ""}`.toLowerCase();
      const matchSearch = hay.includes(search.toLowerCase());
      return matchType && matchSearch;
    });
  }, [transactions, filter, search]);

  const summary = useMemo(() => ({
    totalIn: transactions.filter((t) => t.type === "topup").reduce((a, t) => a + Number(t.amount || 0), 0),
    totalOut: transactions.filter((t) => t.type !== "topup").reduce((a, t) => a + Number(t.amount || 0), 0),
    pending: transactions.filter((t) => t.status === "pending").length,
  }), [transactions]);

  const downloadReceipt = async (tx) => {
    try {
      const data = await transactionAPI.getReceipt(tx.id);
      const receipt = data.receipt;
      const content = `UCash - University of Cebu Payment System\n==========================================\nOFFICIAL RECEIPT\n\nTransaction Code: ${receipt.transactionCode}\nReference No: ${receipt.referenceNumber}\nDate: ${new Date(receipt.date).toLocaleString()}\nStudent: ${receipt.student}\nStudent ID: ${receipt.studentId}\n\nDescription: ${receipt.description}\nAmount: ₱${Number(receipt.amount).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\nType: ${prettyType(receipt.type)}\nStatus: ${prettyStatus(receipt.status)}\n\n==========================================\nThis is a system-generated receipt.\nUniversity of Cebu - UCash System`;
      const blob = new Blob([content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Receipt-${receipt.transactionCode}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message || "Could not download receipt.");
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <h1 className="text-2xl font-bold text-white">📋 Transaction History</h1>

      {error && <div className="rounded-2xl border border-red-800/60 bg-red-900/20 px-4 py-3 text-sm text-red-300">{error}</div>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: "Total In", value: `₱${summary.totalIn.toLocaleString()}`, color: "text-green-400" },
          { label: "Total Out", value: `₱${summary.totalOut.toLocaleString()}`, color: "text-red-400" },
          { label: "Pending", value: String(summary.pending), color: "text-yellow-400" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-center">
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Search transactions..."
          className="w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
        />
        <div className="flex flex-wrap gap-2">
          {["All", "Payment", "Top-up", "Withdrawal"].map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`rounded-xl px-3 py-2 text-xs font-medium transition ${filter === f ? "bg-blue-600 text-white" : "border border-slate-700 bg-slate-800 text-slate-400 hover:text-white"}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {loading ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-400">Loading transactions...</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 py-12 text-center text-slate-600">
            <p className="mb-2 text-4xl">📭</p>
            <p>No transactions found</p>
          </div>
        ) : filtered.map((tx) => (
          <div key={tx.id} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
            <div className="flex cursor-pointer flex-col gap-4 p-4 transition-colors hover:bg-slate-800/60 sm:flex-row sm:items-center sm:justify-between" onClick={() => setSelected(selected === tx.id ? null : tx.id)}>
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg ${tx.type === "payment" ? "bg-red-900/40" : tx.type === "topup" ? "bg-green-900/40" : "bg-purple-900/40"}`}>
                  {tx.type === "payment" ? "💳" : tx.type === "topup" ? "💰" : "💸"}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{tx.description}</p>
                  <p className="text-xs text-slate-500">{new Date(tx.created_at).toLocaleString()} · {tx.transaction_code}</p>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <p className={`text-sm font-bold ${tx.type === "topup" ? "text-green-400" : "text-red-400"}`}>{formatMoney(tx.amount, tx.type)}</p>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${tx.status === "verified" ? "bg-green-900/40 text-green-400" : tx.status === "pending" ? "bg-yellow-900/40 text-yellow-400" : "bg-red-900/40 text-red-400"}`}>{prettyStatus(tx.status)}</span>
              </div>
            </div>

            {selected === tx.id && (
              <div className="border-t border-slate-800 bg-slate-800/30 p-4">
                <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                  <div><p className="text-slate-500">Reference No.</p><p className="break-all font-mono text-slate-200">{tx.reference_number || "N/A"}</p></div>
                  <div><p className="text-slate-500">Type</p><p className="text-slate-200">{prettyType(tx.type)}</p></div>
                  <div><p className="text-slate-500">Status</p><p className="text-slate-200">{prettyStatus(tx.status)}</p></div>
                  <div><p className="text-slate-500">Student</p><p className="text-slate-200">{user.name}</p></div>
                </div>
                <button onClick={() => downloadReceipt(tx)} className="mt-4 w-full rounded-xl bg-blue-600 py-2 text-sm font-medium text-white transition hover:bg-blue-500">📥 Download Receipt</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
