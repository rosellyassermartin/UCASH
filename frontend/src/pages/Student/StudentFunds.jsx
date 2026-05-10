import { useCallback, useEffect, useState } from "react";
import { walletAPI } from "../../api.js";

const METHODS = [
  { id: "gcash",     label: "GCash",      icon: "💙", color: "bg-blue-600"  },
  { id: "maya",      label: "Maya",       icon: "💚", color: "bg-green-600" },
  { id: "paymaya",   label: "PayMaya",    icon: "💜", color: "bg-purple-600"},
  { id: "bdo",       label: "BDO",        icon: "🏦", color: "bg-red-700"   },
  { id: "metrobank", label: "Metrobank",  icon: "🏛️", color: "bg-amber-700" },
];

const validateAmount = (value, { min = 50, max = 50000 } = {}) => {
  if (value === null || value === undefined || String(value).trim() === "") {
    return { valid: false, message: "Amount is required." };
  }
  const str = String(value).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(str)) {
    return {
      valid: false,
      message: "Invalid amount. Numbers only (e.g. 500 or 500.50).",
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

const validateAccountNum = (value) => {
  if (!value || String(value).trim() === "") {
    return { valid: false, message: "Account Number / Reference is required." };
  }
  if (String(value).trim().length < 3) {
    return { valid: false, message: "Account Number / Reference is too short." };
  }
  if (String(value).trim().length > 100) {
    return { valid: false, message: "Account Number / Reference is too long." };
  }
  return { valid: true, message: "" };
};

// ── Blocks invalid keys on the amount input ───────────────────
// Allowed: digits 0-9, one dot, Backspace, Delete, Tab, Arrow keys
// Blocked: letters, minus/negative, +, e/E (scientific), spaces
const handleAmountKeyDown = (e) => {
  const allowed = [
    "Backspace", "Delete", "Tab",
    "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown",
    "Home", "End",
  ];

  // Always allow control keys
  if (allowed.includes(e.key)) return;

  // Allow Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X for copy/paste
  if (e.ctrlKey || e.metaKey) return;

  // Allow digits 0-9
  if (/^\d$/.test(e.key)) return;

  // Allow ONE dot — but only if there isn't one already in the value
  if (e.key === "." && !e.target.value.includes(".")) return;

  // Block everything else: letters, -, +, e, E, spaces, symbols
  e.preventDefault();
};

export default function StudentFunds() {
  const [tab,           setTab]           = useState("add");
  const [method,        setMethod]        = useState("gcash");
  const [amount,        setAmount]        = useState("");
  const [accountNum,    setAccountNum]    = useState("");
  const [loading,       setLoading]       = useState(false);
  const [success,       setSuccess]       = useState("");
  const [error,         setError]         = useState("");
  const [amountErr,     setAmountErr]     = useState("");
  const [accountNumErr, setAccountNumErr] = useState("");
  const [balance,       setBalance]       = useState(0);

  const loadBalance = useCallback(async () => {
    try {
      const res = await walletAPI.getBalance();
      setBalance(Number(res.balance || 0));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadBalance();
    const handler = () => loadBalance();
    window.addEventListener("ucash:data-changed", handler);
    return () => window.removeEventListener("ucash:data-changed", handler);
  }, [loadBalance]);

  const switchTab = (t) => {
    setTab(t);
    setAmount("");
    setAccountNum("");
    setError("");
    setSuccess("");
    setAmountErr("");
    setAccountNumErr("");
  };

  const handleAmountChange = (e) => {
    const val = e.target.value;

    // Extra safety: strip anything that isn't a digit or dot
    // This catches pasted values that bypass onKeyDown
    const cleaned = val.replace(/[^0-9.]/g, "");

    // If user pasted something with multiple dots, keep only first
    const parts   = cleaned.split(".");
    const safe    = parts.length > 2
      ? parts[0] + "." + parts.slice(1).join("")
      : cleaned;

    setAmount(safe);
    setSuccess("");
    setError("");

    if (safe === "") {
      setAmountErr("");
      return;
    }

    const max   = tab === "withdraw" ? Math.min(balance, 50000) : 50000;
    const check = validateAmount(safe, { min: 50, max });
    setAmountErr(check.valid ? "" : check.message);
  };

  const handleAccountNumChange = (e) => {
    const val = e.target.value;
    setAccountNum(val);
    setSuccess("");
    setError("");
    if (val === "") {
      setAccountNumErr("Account Number / Reference is required.");
      return;
    }
    const check = validateAccountNum(val);
    setAccountNumErr(check.valid ? "" : check.message);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const max         = tab === "withdraw" ? Math.min(balance, 50000) : 50000;
    const amountCheck = validateAmount(amount, { min: 50, max });

    if (!amountCheck.valid) {
      setAmountErr(amountCheck.message);
      return;
    }

    if (tab === "withdraw" && amountCheck.parsed > balance) {
      setAmountErr(
        `Insufficient balance. Your current balance is ₱${balance.toLocaleString("en-PH", { minimumFractionDigits: 2 })}.`
      );
      return;
    }

    const accountCheck = validateAccountNum(accountNum);
    if (!accountCheck.valid) {
      setAccountNumErr(accountCheck.message);
      return;
    }

    setAmountErr("");
    setAccountNumErr("");
    setLoading(true);

    try {
      if (tab === "add") {
        const res = await walletAPI.topup(amountCheck.parsed, method, accountNum);
        setSuccess(
          `₱${amountCheck.parsed.toLocaleString("en-PH", { minimumFractionDigits: 2 })} added successfully. ` +
          `New balance: ₱${Number(res.newBalance || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        );
      } else {
        const res = await walletAPI.withdraw(amountCheck.parsed, method);
        setSuccess(
          `Withdrawal request submitted. ` +
          `New balance: ₱${Number(res.newBalance || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        );
      }
      setAmount("");
      setAccountNum("");
      setAmountErr("");
      setAccountNumErr("");
      await loadBalance();
      window.dispatchEvent(new Event("ucash:data-changed"));
    } catch (err) {
      setError(err.message || "Transaction failed.");
    } finally {
      setLoading(false);
    }
  };

  const activeMethod     = METHODS.find((m) => m.id === method);
  const isSubmitDisabled =
    loading            ||
    !amount            ||
    amountErr   !== "" ||
    !accountNum.trim() ||
    accountNumErr !== "";

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
            onKeyDown={handleAmountKeyDown}
            onChange={handleAmountChange}
            placeholder="Enter amount (e.g. 500)"
            className={`w-full rounded-2xl border px-4 py-3 text-sm text-white outline-none transition bg-slate-800 ${
              amountErr
                ? "border-red-500 focus:border-red-400"
                : "border-slate-700 focus:border-teal-500"
            }`}
          />
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
                  setAmountErr("");
                  setError("");
                  setSuccess("");
                }}
                className="rounded-xl border border-slate-700 bg-slate-800 py-2 text-xs text-slate-300 transition hover:bg-slate-700"
              >
                ₱{a.toLocaleString()}
              </button>
            ))}
          </div>

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
            <span className="ml-1 text-red-400">*</span>
          </label>
          <input
            type="text"
            value={accountNum}
            onChange={handleAccountNumChange}
            placeholder={
              method === "bdo" || method === "metrobank"
                ? "Account / reference number"
                : "09XXXXXXXXX or reference no."
            }
            className={`w-full rounded-2xl border px-4 py-3 text-sm text-white outline-none transition bg-slate-800 ${
              accountNumErr
                ? "border-red-500 focus:border-red-400"
                : "border-slate-700 focus:border-teal-500"
            }`}
          />
          {accountNumErr && (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-red-400">
              <span>⚠️</span> {accountNumErr}
            </p>
          )}
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
    </div>
  );
}