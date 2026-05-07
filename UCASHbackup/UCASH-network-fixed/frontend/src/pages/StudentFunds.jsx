import { useState } from "react";

const EWALLET_METHODS = [
  { id: "gcash", label: "GCash", icon: "💙", color: "bg-blue-600" },
  { id: "maya", label: "Maya", icon: "💚", color: "bg-green-600" },
  { id: "paymaya", label: "PayMaya", icon: "💜", color: "bg-purple-600" },
  { id: "bdo", label: "BDO", icon: "🏦", color: "bg-red-700" },
  { id: "metrobank", label: "Metrobank", icon: "🏛️", color: "bg-amber-700" },
];

export default function StudentFunds({ user }) {
  const [tab, setTab] = useState("add");
  const [method, setMethod] = useState(null);
  const [amount, setAmount] = useState("");
  const [accountNum, setAccountNum] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);

  const balance = 0;

  const quickAmounts = [500, 1000, 2000, 5000];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!method || !amount) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 1500));
    setLoading(false);
    setSuccess({ tab, amount, method });
    setAmount("");
    setAccountNum("");
    setTimeout(() => setSuccess(null), 4000);
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-white text-2xl font-bold">{tab === "add" ? "➕ Add Funds" : "💸 Withdraw Funds"}</h1>

      {/* Tab */}
      <div className="flex bg-slate-800 rounded-xl p-1">
        <button onClick={() => setTab("add")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${tab === "add" ? "bg-teal-600 text-white" : "text-slate-400 hover:text-white"}`}>
          ➕ Add Funds
        </button>
        <button onClick={() => setTab("withdraw")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${tab === "withdraw" ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"}`}>
          💸 Withdraw
        </button>
      </div>

      {/* Balance */}
      <div className={`border rounded-xl p-4 flex items-center justify-between ${tab === "add" ? "bg-teal-900/30 border-teal-800" : "bg-purple-900/30 border-purple-800"}`}>
        <div>
          <p className={`text-xs ${tab === "add" ? "text-teal-300" : "text-purple-300"}`}>Wallet Balance</p>
          <p className="text-white font-bold text-lg">₱{balance.toLocaleString()}.00</p>
        </div>
        <span className="text-2xl">👛</span>
      </div>

      {success && (
        <div className="bg-green-900/40 border border-green-700 rounded-xl p-4 flex items-center gap-3">
          <span className="text-2xl">✅</span>
          <div>
            <p className="text-green-400 font-semibold">{success.tab === "add" ? "Top-up Request Submitted!" : "Withdrawal Request Submitted!"}</p>
            <p className="text-green-300 text-xs">₱{Number(success.amount).toLocaleString()} via {success.method} — Pending admin verification.</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Amount */}
        <div>
          <label className="block text-slate-400 text-xs mb-2">Amount (PHP)</label>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
            placeholder="Enter amount" min="50" max={tab === "withdraw" ? balance : 50000}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-teal-500 placeholder-slate-600" />
          <div className="grid grid-cols-4 gap-2 mt-2">
            {quickAmounts.map(a => (
              <button key={a} type="button" onClick={() => setAmount(String(a))}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs py-2 rounded-lg transition-colors">
                ₱{a.toLocaleString()}
              </button>
            ))}
          </div>
        </div>

        {/* E-wallet method */}
        <div>
          <label className="block text-slate-400 text-xs mb-2">{tab === "add" ? "Fund Source" : "Destination"}</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {EWALLET_METHODS.map(m => (
              <button key={m.id} type="button" onClick={() => setMethod(m.label)}
                className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all text-xs ${
                  method === m.label
                    ? `${m.color} border-transparent text-white`
                    : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"
                }`}>
                <span className="text-lg">{m.icon}</span>
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Account number */}
        {method && (
          <div>
            <label className="block text-slate-400 text-xs mb-2">{method} Account Number / Name</label>
            <input type="text" value={accountNum} onChange={e => setAccountNum(e.target.value)}
              placeholder={method === "BDO" || method === "Metrobank" ? "Account number (12 digits)" : "09XXXXXXXXX"}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-teal-500 placeholder-slate-600" />
          </div>
        )}

        {/* Bank notice */}
        {(method === "BDO" || method === "Metrobank") && (
          <div className="bg-amber-900/20 border border-amber-800/50 rounded-xl p-3">
            <p className="text-amber-400 text-xs font-medium">⚠️ Manual Bank Transfer</p>
            <p className="text-amber-300/70 text-xs mt-1">Bank transfers are NOT automatic. You must manually transfer to UC's bank account, then submit this form. Admin will verify and credit your wallet within 1-2 business days.</p>
          </div>
        )}

        <button type="submit" disabled={loading || !method || !amount}
          className={`w-full text-white font-semibold py-3 rounded-xl text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2 ${
            tab === "add" ? "bg-teal-600 hover:bg-teal-500" : "bg-purple-600 hover:bg-purple-500"
          }`}>
          {loading ? <><span className="animate-spin">⏳</span> Processing...</> :
            tab === "add" ? `➕ Add ₱${amount ? Number(amount).toLocaleString() : "0"}` :
            `💸 Withdraw ₱${amount ? Number(amount).toLocaleString() : "0"}`}
        </button>
      </form>

      {/* Instructions */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <p className="text-slate-300 text-sm font-medium mb-2">{tab === "add" ? "How to Add Funds" : "Withdrawal Rules"}</p>
        {tab === "add" ? (
          <ol className="text-slate-500 text-xs space-y-1 list-decimal list-inside">
            <li>Select e-wallet source (GCash/Maya: instant; Banks: 1-2 days)</li>
            <li>Enter amount and your account number</li>
            <li>Submit and complete transfer if using bank</li>
            <li>Admin verifies and credits your UCash wallet</li>
          </ol>
        ) : (
          <ol className="text-slate-500 text-xs space-y-1 list-decimal list-inside">
            <li>Minimum withdrawal: ₱50</li>
            <li>Cannot withdraw if you have outstanding fees</li>
            <li>Processing time: 1-3 business days</li>
            <li>Admin must approve withdrawal requests</li>
          </ol>
        )}
      </div>
    </div>
  );
}
