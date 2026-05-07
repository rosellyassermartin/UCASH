export default function StudentDashboard({ user, onNavigate }) {
  const balance = 4850.00;
  const outstanding = 12500.00;
  const notifications = 3;

  const quickActions = [
    { label: "Pay Fees", icon: "💳", page: "payments", color: "bg-blue-600 hover:bg-blue-500" },
    { label: "Add Funds", icon: "➕", page: "funds", color: "bg-teal-600 hover:bg-teal-500" },
    { label: "Withdraw", icon: "💸", page: "funds", color: "bg-purple-600 hover:bg-purple-500" },
    { label: "History", icon: "📋", page: "transactions", color: "bg-slate-700 hover:bg-slate-600" },
  ];

  const recentTx = [
    { id: "TXN-001", desc: "Tuition Fee - 1st Sem", amount: -5000, date: "Apr 12, 2025", status: "Verified" },
    { id: "TXN-002", desc: "GCash Top-up", amount: 3000, date: "Apr 10, 2025", status: "Verified" },
    { id: "TXN-003", desc: "Lab Fee", amount: -500, date: "Apr 8, 2025", status: "Pending" },
    { id: "TXN-004", desc: "Library Fee", amount: -150, date: "Apr 5, 2025", status: "Verified" },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-bold">Hello, {user.name?.split(" ")[0]} 👋</h1>
          <p className="text-slate-400 text-sm mt-1">University of Cebu Student Portal</p>
        </div>
        <button onClick={() => onNavigate("notifications")} className="relative">
          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-xl hover:bg-slate-700 transition-colors">🔔</div>
          {notifications > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">{notifications}</span>
          )}
        </button>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-linear-to-br from-blue-900 to-blue-950 border border-blue-800 rounded-2xl p-5">
          <p className="text-blue-300 text-xs font-medium mb-1">💰 Wallet Balance</p>
          <p className="text-white text-3xl font-bold">₱{balance.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</p>
          <p className="text-blue-400 text-xs mt-2">Available for payments</p>
        </div>
        <div className="bg-linear-to-br from-red-900/60 to-slate-900 border border-red-800/60 rounded-2xl p-5">
          <p className="text-red-300 text-xs font-medium mb-1">⚠️ Outstanding Fees</p>
          <p className="text-white text-3xl font-bold">₱{outstanding.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</p>
          <button onClick={() => onNavigate("payments")} className="text-red-400 text-xs mt-2 hover:text-red-300 transition-colors underline">Pay now →</button>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <p className="text-slate-400 text-xs font-medium mb-3 uppercase tracking-wider">Quick Actions</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickActions.map(a => (
            <button key={a.label} onClick={() => onNavigate(a.page)}
              className={`${a.color} text-white rounded-xl p-4 flex flex-col items-center gap-2 transition-all hover:scale-105`}>
              <span className="text-2xl">{a.icon}</span>
              <span className="text-xs font-medium">{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Fee Breakdown */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <p className="text-white font-semibold mb-4">📚 Fee Breakdown</p>
        <div className="space-y-3">
          {[
            { label: "Tuition Fee", amount: 10000, paid: 5000, color: "bg-blue-600" },
            { label: "Lab Fee", amount: 1500, paid: 1000, color: "bg-teal-600" },
            { label: "Library Fee", amount: 500, paid: 350, color: "bg-purple-600" },
            { label: "Miscellaneous", amount: 500, paid: 500, color: "bg-green-600" },
          ].map(fee => {
            const pct = Math.round((fee.paid / fee.amount) * 100);
            return (
              <div key={fee.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-300">{fee.label}</span>
                  <span className="text-slate-400">₱{fee.paid.toLocaleString()} / ₱{fee.amount.toLocaleString()}</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full">
                  <div className={`h-2 ${fee.color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-white font-semibold">📋 Recent Transactions</p>
          <button onClick={() => onNavigate("transactions")} className="text-blue-400 text-xs hover:text-blue-300">View all →</button>
        </div>
        <div className="space-y-3">
          {recentTx.map(tx => (
            <div key={tx.id} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${tx.amount < 0 ? "bg-red-900/40" : "bg-green-900/40"}`}>
                  {tx.amount < 0 ? "📤" : "📥"}
                </div>
                <div>
                  <p className="text-white text-sm">{tx.desc}</p>
                  <p className="text-slate-500 text-xs">{tx.date} · {tx.id}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-sm font-semibold ${tx.amount < 0 ? "text-red-400" : "text-green-400"}`}>
                  {tx.amount < 0 ? "-" : "+"}₱{Math.abs(tx.amount).toLocaleString()}
                </p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  tx.status === "Verified" ? "bg-green-900/40 text-green-400" : "bg-yellow-900/40 text-yellow-400"
                }`}>{tx.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Limitation Notice */}
      <div className="bg-slate-900 border border-amber-800/40 rounded-xl p-4">
        <p className="text-amber-400 text-xs font-medium mb-1">⚠️ System Limitations</p>
        <ul className="text-slate-400 text-xs space-y-1">
          <li>• Bank payments require manual transfer & admin verification</li>
          <li>• No real-time bank deduction — balances updated after verification</li>
          <li>• Only for University of Cebu payments</li>
        </ul>
      </div>
    </div>
  );
}
