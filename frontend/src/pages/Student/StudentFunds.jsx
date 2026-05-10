import { useCallback, useEffect, useState } from "react";
import { walletAPI } from "../../api.js";

const METHODS = [
  { id: "gcash",     label: "GCash",      icon: "💙", color: "bg-blue-600"  },
  { id: "maya",      label: "Maya",       icon: "💚", color: "bg-green-600" },
  { id: "paymaya",   label: "PayMaya",    icon: "💜", color: "bg-purple-600"},
  { id: "bdo",       label: "BDO",        icon: "🏦", color: "bg-red-700"   },
  { id: "metrobank", label: "Metrobank",  icon: "🏛️", color: "bg-amber-700" },
];

// ── Amount validator ──────────────────────────────────────────
// Blocks: letters, symbols, negative, empty, scientific notation,
//         multiple dots, more than 2 decimal places
const validateAmount = (value, { min = 50, max = 50000 } = {}) => {
  if (value === null || value === undefined || String(value).trim() === "") {
    return { valid: false, message: "Amount is required." };
  }
  const str = String(value).trim();
  // Only allow plain digits with optional 1-2 decimal places
  if (!/^\d+(\.\d{1,2})?$/.test(str)) {
    return {
      valid: false,
      message: "Invalid amount. Numbers only (e.g. 500 or 500.50). No letters or symbols.",
    };
  }
  const num = Number(str);
  if (isNaN(num) || num <= 0) {
    return { valid: false, message: "Amount must be greater than zero." };
  }
  if (num < min) {
    return { valid: false, message: `Minimum amount is ₱${min.toLocaleString()}.` };
  }
  if (num > max) {
    return { valid: false, message: `Maximum amount is ₱${max.toLocaleString()}.` };
  }
  return { valid: true, message: "", parsed: num };
};

export default function StudentFunds() {
  const [tab,        setTab]        = useState("add");
  const [method,     setMethod]     = useState("gcash");
  const [amount,     setAmount]     = useState("");
  const [accountNum, setAccountNum] = useState("");
  const [loading,    setLoading]    = useState(false);
  const [success,    setSuccess]    = useState("");
  const [error,      setError]      = useState("");
  const [amountErr,  setAmountErr]  = useState(""); // inline amount error
  const [balance,    setBalance]    = useState(0);

  const loadBalance = useCallback(async () => {
    try {
      const res = await walletAPI.getBalance();
      setBalance(Number(res.balance || 0));
    } catch {
      // ignore; form actions show precise errors
    }
  }, []);

  useEffect(() => {
    loadBalance();
    const handler = () => loadBalance();
    window.addEventListener("ucash:data-changed", handler);
    return () => window.removeEventListener("ucash:data-changed", handler);
  }, [loadBalance]);

  // Clear messages when switching tabs
  const switchTab = (t) => {
    setTab(t);
    setAmount("");
    setAccountNum("");
    setError("");
    setSuccess("");
    setAmountErr("");
  };

  // Validate on every keystroke so the user sees feedback immediately
  const handleAmountChange = (e) => {
    const val = e.target.value;
    setAmount(val);
    setSuccess("");
    setError("");

    if (val === "") {
      setAmountErr("");
      return;
    }

    const max   = tab === "withdraw" ? Math.min(balance, 50000) : 50000;
    const check = validateAmount(val, { min: 50, max });

    if (!check.valid) {
      setAmountErr(check.message);
    } else {
      setAmountErr(""); // clear error when valid
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // ── Final validation before sending to API ────────────
    const max   = tab === "withdraw" ? Math.min(balance, 50000) : 50000;
    const check = validateAmount(amount, { min: 50, max });

    if (!check.valid) {
      setAmountErr(check.message);
      return; // STOP — do not call the API
    }

    // Extra check for withdrawal: can't withdraw more than balance
    if (tab === "withdraw" && check.parsed > balance) {
      setAmountErr(
        `Insufficient balance. Your current balance is ₱${balance.toLocaleString("en-PH", { minimumFractionDigits: 2 })}.`
      );
      return;
    }

    setAmountErr("");
    setLoading(true);

    try {
      if (tab === "add") {
        const res = await walletAPI.topup(check.parsed, method, accountNum);
        setSuccess(
          `₱${check.parsed.toLocaleString("en-PH", { minimumFractionDigits: 2 })} added successfully. ` +
          `New balance: ₱${Number(res.newBalance || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        );
      } else {
        const res = await walletAPI.withdraw(check.parsed, method);
        setSuccess(
          `Withdrawal request submitted. ` +
          `New balance: ₱${Number(res.newBalance || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        );
      }
      setAmount("");
      setAccountNum("");
      await loadBalance();
      window.dispatchEvent(new Event("ucash:data-changed"));
    } catch (err) {
      // Show the exact error message from the backend
      setError(err.message || "Transaction failed.");
    } finally {
      setLoading(false);
    }
  };

  const activeMethod = METHODS.find((m) => m.id === method);

  // Disable submit button if amount is empty, has an error, or is loading
  const isSubmitDisabled = loading || !amount || amountErr !== "";

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <h1 className="text-2xl font-bold text-white">
        {tab === "add" ? "➕ Add Funds" : "💸 Withdraw Funds"}
      </h1>

      {/* Tab switcher */}
      <div className="flex rounded-2xl bg-slate-800 p-1">
        <button
          onClick={() => switchTab("add")}
          className={`flex-1 rounded-xl py-3 text-sm font-medium transition ${
            tab === "add" ? "bg-teal-600 text-white" : "text-slate-400 hover:text-white"
          }`}
        >
          ➕ Add Funds
        </button>
        <button
          onClick={() => switchTab("withdraw")}
          className={`flex-1 rounded-xl py-3 text-sm font-medium transition ${
            tab === "withdraw" ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"
          }`}
        >
          💸 Withdraw
        </button>
      </div>

      {/* Balance display */}
      <div className={`flex items-center justify-between rounded-2xl border p-4 ${
        tab === "add"
          ? "border-teal-800 bg-teal-900/30"
          : "border-purple-800 bg-purple-900/30"
      }`}>
        <div>
          <p className={`text-xs ${tab === "add" ? "text-teal-300" : "text-purple-300"}`}>
            Wallet Balance
          </p>
          <p className="text-lg font-bold text-white">
            ₱{balance.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <span className="text-2xl">👛</span>
      </div>

      {/* Success / Error banners */}
      {success && (
        <div className="rounded-2xl border border-green-700 bg-green-900/30 px-4 py-3 text-sm text-green-300">
          ✅ {success}
        </div>
      )}
      {error && (
        <div className="rounded-2xl border border-red-700 bg-red-900/30 px-4 py-3 text-sm text-red-300">
          ⚠️ {error}
        </div>
      )}

      <form onSubmit={submit} className="space-y-5 rounded-3xl border border-slate-800 bg-slate-900 p-5">

        {/* Amount input */}
        <div>
          <label className="mb-2 block text-xs text-slate-400">Amount (PHP)</label>
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={handleAmountChange}
            placeholder="Enter amount (e.g. 500)"
            className={`w-full rounded-2xl border px-4 py-3 text-sm text-white outline-none transition bg-slate-800 ${
              amountErr
                ? "border-red-500 focus:border-red-400"   // red border when invalid
                : "border-slate-700 focus:border-teal-500" // normal border
            }`}
          />

          {/* Inline amount error shown right below the input */}
          {amountErr && (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-red-400">
              <span>⚠️</span> {amountErr}
            </p>
          )}

          {/* Quick amount buttons */}
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[500, 1000, 2000, 5000].map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => {
                  setAmount(String(a));
                  setAmountErr(""); // preset amounts are always valid
                  setError("");
                  setSuccess("");
                }}
                className="rounded-xl border border-slate-700 bg-slate-800 py-2 text-xs text-slate-300 transition hover:bg-slate-700"
              >
                ₱{a.toLocaleString()}
              </button>
            ))}
          </div>

          {/* Hint text shown when no error */}
          {!amountErr && (
            <p className="mt-1.5 text-xs text-slate-600">
              Min: ₱50 · Max: ₱{(tab === "withdraw" ? Math.min(balance, 50000) : 50000).toLocaleString()}
            </p>
          )}
        </div>

        {/* Payment method selector */}
        <div>
          <label className="mb-2 block text-xs text-slate-400">
            {tab === "add" ? "Fund Source" : "Destination"}
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {METHODS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMethod(m.id)}
                className={`rounded-2xl border px-3 py-3 text-xs transition ${
                  method === m.id
                    ? `${m.color} border-transparent text-white`
                    : "border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600"
                }`}
              >
                <div className="text-lg">{m.icon}</div>
                <div className="mt-1">{m.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Account / reference number */}
        <div>
          <label className="mb-2 block text-xs text-slate-400">
            {activeMethod?.label} Account Number / Reference
          </label>
          <input
            type="text"
            value={accountNum}
            onChange={(e) => setAccountNum(e.target.value)}
            placeholder={
              method === "bdo" || method === "metrobank"
                ? "Account / reference number"
                : "09XXXXXXXXX or reference no."
            }
            className="w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white outline-none focus:border-teal-500"
          />
        </div>

        {/* Bank warning */}
        {(method === "bdo" || method === "metrobank") && (
          <div className="rounded-2xl border border-amber-800/50 bg-amber-900/20 p-3 text-xs text-amber-300">
            Bank transfers can still be submitted here, but make sure the reference number is correct for audit purposes.
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={isSubmitDisabled}
          className={`w-full rounded-2xl py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
            tab === "add"
              ? "bg-teal-600 hover:bg-teal-500"
              : "bg-purple-600 hover:bg-purple-500"
          }`}
        >
          {loading
            ? "Processing..."
            : tab === "add"
            ? `Add ₱${amount && !amountErr ? Number(amount).toLocaleString("en-PH", { minimumFractionDigits: 2 }) : "0"}`
            : `Withdraw ₱${amount && !amountErr ? Number(amount).toLocaleString("en-PH", { minimumFractionDigits: 2 }) : "0"}`
          }
        </button>
      </form>

      {/* Info section */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-xs text-slate-400">
        <p className="mb-2 text-sm font-medium text-slate-300">
          {tab === "add" ? "How to Add Funds" : "Withdrawal Rules"}
        </p>
        {tab === "add" ? (
          <ol className="list-inside list-decimal space-y-1">
            <li>Select a fund source.</li>
            <li>Enter the amount (numbers only, min ₱50).</li>
            <li>Top-ups are credited instantly in this configuration.</li>
            <li>Transactions appear immediately in your history.</li>
          </ol>
        ) : (
          <ol className="list-inside list-decimal space-y-1">
            <li>Minimum withdrawal is ₱50.</li>
            <li>You cannot withdraw more than your current balance.</li>
            <li>Withdrawals create a pending transaction for admin approval.</li>
            <li>If admin rejects it, your balance is restored automatically.</li>
          </ol>
        )}
      </div>
    </div>
  );
}