import { useState } from "react";

export default function StudentWallet({ user }) {
  const [balance] = useState(4850.00);
  const [showQR, setShowQR] = useState(false);

  const transactions = [
    { id: "TXN-001", desc: "Tuition Fee", amount: -5000, date: "Apr 12, 2025", status: "Verified", type: "Payment" },
    { id: "TXN-002", desc: "GCash Top-up", amount: 3000, date: "Apr 10, 2025", status: "Verified", type: "Top-up" },
    { id: "TXN-003", desc: "Lab Fee", amount: -500, date: "Apr 8, 2025", status: "Pending", type: "Payment" },
    { id: "TXN-004", desc: "BDO Transfer", amount: 5000, date: "Apr 5, 2025", status: "Verified", type: "Top-up" },
    { id: "TXN-005", desc: "Library Fee", amount: -150, date: "Apr 3, 2025", status: "Verified", type: "Payment" },
  ];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-white text-2xl font-bold">👛 My Wallet</h1>

      {/* Wallet Card */}
      <div className="bg-linear-to-br from-blue-800 to-blue-950 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/20 rounded-full -translate-y-12 translate-x-12" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-700/20 rounded-full translate-y-8 -translate-x-8" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-blue-200 text-xs font-medium">UCash Wallet</p>
              <p className="text-white text-sm font-medium">{user.name}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl">U</div>
          </div>
          <p className="text-blue-300 text-sm mb-1">Available Balance</p>
          <p className="text-white text-4xl font-bold">₱{balance.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</p>
          <div className="flex items-center justify-between mt-4">
            <div>
              <p className="text-blue-300 text-xs">Student ID</p>
              <p className="text-white text-sm font-mono">{user.studentId || "UC-2024-001"}</p>
            </div>
            <button onClick={() => setShowQR(!showQR)}
              className="bg-white/20 hover:bg-white/30 text-white text-xs px-3 py-1.5 rounded-lg transition-colors">
              {showQR ? "Hide QR" : "Show QR"}
            </button>
          </div>
        </div>
      </div>

      {/* QR Code Mock */}
      {showQR && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col items-center">
          <p className="text-white font-semibold mb-4">📱 Wallet QR Code</p>
          <div className="bg-white p-4 rounded-xl">
            <div className="w-32 h-32 grid grid-cols-8 gap-0.5">
              {Array.from({ length: 64 }, (_, i) => (
                <div key={i} className={`w-3 h-3 rounded-sm ${Math.random() > 0.4 ? "bg-slate-900" : "bg-white"}`} />
              ))}
            </div>
          </div>
          <p className="text-slate-400 text-xs mt-3">Scan to receive payment</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "Total Paid", value: "₱5,650", icon: "📤", color: "text-red-400" },
          { label: "Total In", value: "₱8,000", icon: "📥", color: "text-green-400" },
          { label: "Pending", value: "₱500", icon: "⏳", color: "text-yellow-400" },
        ].map(s => (
          <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
            <p className="text-xl mb-1">{s.icon}</p>
            <p className={`${s.color} font-bold text-base`}>{s.value}</p>
            <p className="text-slate-500 text-xs">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Transaction History */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <p className="text-white font-semibold mb-4">Transaction History</p>
        <div className="space-y-2">
          {transactions.map(tx => (
            <div key={tx.id} className="flex items-center justify-between p-3 bg-slate-800/60 rounded-xl hover:bg-slate-800 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm ${
                  tx.amount < 0 ? "bg-red-900/40" : "bg-green-900/40"
                }`}>
                  {tx.type === "Payment" ? "💳" : "💰"}
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{tx.desc}</p>
                  <p className="text-slate-500 text-xs">{tx.date}</p>
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
          ))}
        </div>
      </div>
    </div>
  );
}
