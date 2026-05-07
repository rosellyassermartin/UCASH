import { useState } from "react";

const TRANSACTIONS = [
  { id: "TXN-001", desc: "Tuition Fee - 1st Sem", amount: -5000, date: "Apr 12, 2025", status: "Verified", type: "Payment", ref: "REF-20250412-001" },
  { id: "TXN-002", desc: "GCash Top-up", amount: 3000, date: "Apr 10, 2025", status: "Verified", type: "Top-up", ref: "REF-20250410-001" },
  { id: "TXN-003", desc: "Lab Fee", amount: -500, date: "Apr 8, 2025", status: "Pending", type: "Payment", ref: "REF-20250408-001" },
  { id: "TXN-004", desc: "BDO Bank Transfer", amount: 5000, date: "Apr 5, 2025", status: "Verified", type: "Top-up", ref: "REF-20250405-001" },
  { id: "TXN-005", desc: "Library Fee", amount: -150, date: "Apr 3, 2025", status: "Verified", type: "Payment", ref: "REF-20250403-001" },
  { id: "TXN-006", desc: "Maya Withdrawal", amount: -2000, date: "Mar 30, 2025", status: "Verified", type: "Withdrawal", ref: "REF-20250330-001" },
  { id: "TXN-007", desc: "Miscellaneous Fee", amount: -500, date: "Mar 28, 2025", status: "Rejected", type: "Payment", ref: "REF-20250328-001" },
];

export default function StudentTransactions({ user }) {
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  const filters = ["All", "Payment", "Top-up", "Withdrawal"];

  const filtered = TRANSACTIONS.filter(tx => {
    const matchType = filter === "All" || tx.type === filter;
    const matchSearch = tx.desc.toLowerCase().includes(search.toLowerCase()) || tx.id.includes(search);
    return matchType && matchSearch;
  });

  const downloadReceipt = (tx) => {
    const content = `
UCash - University of Cebu Payment System
==========================================
OFFICIAL RECEIPT

Transaction ID: ${tx.id}
Reference No:   ${tx.ref}
Date:           ${tx.date}
Student:        ${user.name}
Student ID:     ${user.studentId || "UC-2024-001"}

Description:    ${tx.desc}
Amount:         ₱${Math.abs(tx.amount).toLocaleString()}.00
Type:           ${tx.type}
Status:         ${tx.status}

==========================================
This is a system-generated receipt.
University of Cebu - UCash System
    `.trim();
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Receipt-${tx.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-white text-2xl font-bold">📋 Transaction History</h1>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "Total In", value: `₱${TRANSACTIONS.filter(t => t.amount > 0).reduce((a, t) => a + t.amount, 0).toLocaleString()}`, color: "text-green-400" },
          { label: "Total Out", value: `₱${Math.abs(TRANSACTIONS.filter(t => t.amount < 0).reduce((a, t) => a + t.amount, 0)).toLocaleString()}`, color: "text-red-400" },
          { label: "Pending", value: `${TRANSACTIONS.filter(t => t.status === "Pending").length}`, color: "text-yellow-400" },
        ].map(s => (
          <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
            <p className={`font-bold text-lg ${s.color}`}>{s.value}</p>
            <p className="text-slate-500 text-xs">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="space-y-3">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Search transactions..."
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 placeholder-slate-600" />
        <div className="flex flex-wrap gap-2">
          {filters.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === f ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white border border-slate-700"
              }`}>{f}</button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-600">
            <p className="text-4xl mb-2">📭</p>
            <p>No transactions found</p>
          </div>
        ) : filtered.map(tx => (
          <div key={tx.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-800/60 transition-colors"
              onClick={() => setSelected(selected === tx.id ? null : tx.id)}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                  tx.amount < 0 ? "bg-red-900/40" : "bg-green-900/40"
                }`}>
                  {tx.type === "Payment" ? "💳" : tx.type === "Top-up" ? "💰" : "💸"}
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{tx.desc}</p>
                  <p className="text-slate-500 text-xs">{tx.date} · {tx.id}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-sm font-bold ${tx.amount < 0 ? "text-red-400" : "text-green-400"}`}>
                  {tx.amount < 0 ? "-" : "+"}₱{Math.abs(tx.amount).toLocaleString()}
                </p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  tx.status === "Verified" ? "bg-green-900/40 text-green-400" :
                  tx.status === "Pending" ? "bg-yellow-900/40 text-yellow-400" :
                  "bg-red-900/40 text-red-400"
                }`}>{tx.status}</span>
              </div>
            </div>

            {/* Expanded */}
            {selected === tx.id && (
              <div className="border-t border-slate-800 p-4 bg-slate-800/30">
                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div><p className="text-slate-500">Reference No.</p><p className="text-slate-200 font-mono">{tx.ref}</p></div>
                  <div><p className="text-slate-500">Type</p><p className="text-slate-200">{tx.type}</p></div>
                  <div><p className="text-slate-500">Status</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      tx.status === "Verified" ? "bg-green-900/40 text-green-400" :
                      tx.status === "Pending" ? "bg-yellow-900/40 text-yellow-400" :
                      "bg-red-900/40 text-red-400"
                    }`}>{tx.status}</span>
                  </div>
                  <div><p className="text-slate-500">Student</p><p className="text-slate-200">{user.name}</p></div>
                </div>
                <button onClick={() => downloadReceipt(tx)}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2">
                  📥 Download Receipt (.txt)
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
