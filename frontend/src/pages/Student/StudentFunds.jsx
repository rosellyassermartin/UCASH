import { useCallback, useEffect, useState } from "react";
import { walletAPI } from "../../api.js";

const METHODS = [
  { id: "gcash", label: "GCash", icon: "💙", color: "bg-blue-600" },
  { id: "maya", label: "Maya", icon: "💚", color: "bg-green-600" },
  { id: "paymaya", label: "PayMaya", icon: "💜", color: "bg-purple-600" },
  { id: "bdo", label: "BDO", icon: "🏦", color: "bg-red-700" },
  { id: "metrobank", label: "Metrobank", icon: "🏛️", color: "bg-amber-700" },
];

export default function StudentFunds() {
  const [tab, setTab] = useState("add");
  const [method, setMethod] = useState("gcash");
  const [amount, setAmount] = useState("");
  const [accountNum, setAccountNum] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [balance, setBalance] = useState(0);

  const loadBalance = useCallback(async () => {
    try {
      const res = await walletAPI.getBalance();
      setBalance(Number(res.balance || 0));
    } catch {
      // ignore here; form actions already show precise errors
    }
  }, []);

  useEffect(() => {
    loadBalance();
    const handler = () => loadBalance();
    window.addEventListener("ucash:data-changed", handler);
    return () => window.removeEventListener("ucash:data-changed", handler);
  }, [loadBalance]);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      if (tab === "add") {
        const res = await walletAPI.topup(Number(amount), method, accountNum);
        setSuccess(`${Number(amount).toLocaleString()} added successfully. New balance: ₱${Number(res.newBalance || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
      } else {
        const res = await walletAPI.withdraw(Number(amount), method);
        setSuccess(`Withdrawal request submitted. New balance: ₱${Number(res.newBalance || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
      }
      setAmount("");
      setAccountNum("");
      await loadBalance();
      window.dispatchEvent(new Event("ucash:data-changed"));
    } catch (err) {
      setError(err.message || "Transaction failed.");
    } finally {
      setLoading(false);
    }
  };

  const activeMethod = METHODS.find((m) => m.id === method);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <h1 className="text-2xl font-bold text-white">{tab === "add" ? "➕ Add Funds" : "💸 Withdraw Funds"}</h1>

      <div className="flex rounded-2xl bg-slate-800 p-1">
        <button onClick={() => setTab("add")} className={`flex-1 rounded-xl py-3 text-sm font-medium transition ${tab === "add" ? "bg-teal-600 text-white" : "text-slate-400 hover:text-white"}`}>➕ Add Funds</button>
        <button onClick={() => setTab("withdraw")} className={`flex-1 rounded-xl py-3 text-sm font-medium transition ${tab === "withdraw" ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"}`}>💸 Withdraw</button>
      </div>

      <div className={`flex items-center justify-between rounded-2xl border p-4 ${tab === "add" ? "border-teal-800 bg-teal-900/30" : "border-purple-800 bg-purple-900/30"}`}>
        <div>
          <p className={`text-xs ${tab === "add" ? "text-teal-300" : "text-purple-300"}`}>Wallet Balance</p>
          <p className="text-lg font-bold text-white">₱{balance.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <span className="text-2xl">👛</span>
      </div>

      {success && <div className="rounded-2xl border border-green-700 bg-green-900/30 px-4 py-3 text-sm text-green-300">{success}</div>}
      {error && <div className="rounded-2xl border border-red-700 bg-red-900/30 px-4 py-3 text-sm text-red-300">{error}</div>}

      <form onSubmit={submit} className="space-y-5 rounded-3xl border border-slate-800 bg-slate-900 p-5">
        <div>
          <label className="mb-2 block text-xs text-slate-400">Amount (PHP)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
            min="50"
            max={tab === "withdraw" ? balance : 50000}
            className="w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white outline-none focus:border-teal-500"
          />
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[500, 1000, 2000, 5000].map((a) => (
              <button key={a} type="button" onClick={() => setAmount(String(a))} className="rounded-xl border border-slate-700 bg-slate-800 py-2 text-xs text-slate-300 transition hover:bg-slate-700">₱{a.toLocaleString()}</button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs text-slate-400">{tab === "add" ? "Fund Source" : "Destination"}</label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {METHODS.map((m) => (
              <button key={m.id} type="button" onClick={() => setMethod(m.id)} className={`rounded-2xl border px-3 py-3 text-xs transition ${method === m.id ? `${m.color} border-transparent text-white` : "border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600"}`}>
                <div className="text-lg">{m.icon}</div>
                <div className="mt-1">{m.label}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs text-slate-400">{activeMethod?.label} Account Number / Reference</label>
          <input
            type="text"
            value={accountNum}
            onChange={(e) => setAccountNum(e.target.value)}
            placeholder={method === "bdo" || method === "metrobank" ? "Account / reference number" : "09XXXXXXXXX or reference no."}
            className="w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white outline-none focus:border-teal-500"
          />
        </div>

        {(method === "bdo" || method === "metrobank") && (
          <div className="rounded-2xl border border-amber-800/50 bg-amber-900/20 p-3 text-xs text-amber-300">
            Bank transfers can still be submitted here, but make sure the reference number is correct for audit purposes.
          </div>
        )}

        <button type="submit" disabled={loading || !amount} className={`w-full rounded-2xl py-3 text-sm font-semibold text-white transition disabled:opacity-60 ${tab === "add" ? "bg-teal-600 hover:bg-teal-500" : "bg-purple-600 hover:bg-purple-500"}`}>
          {loading ? "Processing..." : tab === "add" ? `Add ₱${amount ? Number(amount).toLocaleString() : "0"}` : `Withdraw ₱${amount ? Number(amount).toLocaleString() : "0"}`}
        </button>
      </form>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-xs text-slate-400">
        <p className="mb-2 text-sm font-medium text-slate-300">{tab === "add" ? "How to Add Funds" : "Withdrawal Rules"}</p>
        {tab === "add" ? (
          <ol className="list-inside list-decimal space-y-1">
            <li>Select a fund source.</li>
            <li>Enter the amount and your account/reference info.</li>
            <li>Top-ups are credited instantly in this configuration.</li>
            <li>Transactions appear immediately in your history.</li>
          </ol>
        ) : (
          <ol className="list-inside list-decimal space-y-1">
            <li>Minimum withdrawal is ₱50.</li>
            <li>Withdrawals still create a pending transaction.</li>
            <li>If admin rejects it, your balance is restored automatically.</li>
          </ol>
        )}
      </div>
    </div>
  );
}
