import { useCallback, useEffect, useMemo, useState } from "react";
import { paymentMethodAPI } from "../../api.js";

const METHODS = [
  { id: "gcash", label: "GCash", icon: "💙", color: "bg-blue-600", placeholder: "09XXXXXXXXX" },
  { id: "maya", label: "Maya", icon: "💚", color: "bg-green-600", placeholder: "09XXXXXXXXX" },
  { id: "paymaya", label: "PayMaya", icon: "💜", color: "bg-purple-600", placeholder: "09XXXXXXXXX" },
  { id: "bdo", label: "BDO", icon: "🏦", color: "bg-red-700", placeholder: "Account number" },
  { id: "metrobank", label: "Metrobank", icon: "🏛️", color: "bg-amber-700", placeholder: "Account number" },
];

export default function StudentLinkedAccounts() {
  const [linked, setLinked] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formMethod, setFormMethod] = useState("gcash");
  const [accountInput, setAccountInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = useCallback(async () => {
    try {
      const res = await paymentMethodAPI.getAll();
      setLinked(res.methods || []);
    } catch (err) {
      setError(err.message || "Could not load linked accounts.");
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const linkedIds = useMemo(() => linked.map((l) => l.type), [linked]);

  const handleLink = async (e) => {
    e.preventDefault();
    if (!formMethod || !accountInput) return;
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await paymentMethodAPI.add({
        type: formMethod,
        accountNumber: accountInput,
        accountName: nameInput,
        isPrimary: linked.length === 0,
      });
      setSuccess(res.message || "Account linked successfully.");
      setShowForm(false);
      setAccountInput("");
      setNameInput("");
      await loadData();
      window.dispatchEvent(new Event("ucash:data-changed"));
    } catch (err) {
      setError(err.message || "Could not link account.");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (id) => {
    try {
      await paymentMethodAPI.remove(id);
      await loadData();
      setSuccess("Account removed.");
      window.dispatchEvent(new Event("ucash:data-changed"));
    } catch (err) {
      setError(err.message || "Could not remove account.");
    }
  };

  const handleSetPrimary = async (id) => {
    try {
      await paymentMethodAPI.setPrimary(id);
      await loadData();
      setSuccess("Primary account updated.");
      window.dispatchEvent(new Event("ucash:data-changed"));
    } catch (err) {
      setError(err.message || "Could not update primary account.");
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-white">🔗 Linked Accounts</h1>
        <button onClick={() => setShowForm((v) => !v)} className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500">+ Link Account</button>
      </div>

      {error && <div className="rounded-2xl border border-red-700 bg-red-900/30 px-4 py-3 text-sm text-red-300">{error}</div>}
      {success && <div className="rounded-2xl border border-green-700 bg-green-900/30 px-4 py-3 text-sm text-green-300">{success}</div>}

      <div className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Your Linked Accounts ({linked.length})</p>
        {linked.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
            <p className="mb-2 text-4xl">🔗</p>
            <p className="text-sm text-slate-400">No linked accounts yet</p>
          </div>
        ) : linked.map((acc) => {
          const meta = METHODS.find((m) => m.id === acc.type) || METHODS[0];
          return (
            <div key={acc.id} className="rounded-3xl border border-slate-800 bg-slate-900 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${meta.color} text-xl`}>{meta.icon}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white">{meta.label}</p>
                      {Number(acc.is_primary) === 1 && <span className="rounded-full bg-blue-900/50 px-2 py-0.5 text-xs text-blue-400">Primary</span>}
                    </div>
                    <p className="text-xs font-mono text-slate-400">{acc.account_number}</p>
                    {acc.account_name && <p className="text-xs text-slate-500">{acc.account_name}</p>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Number(acc.is_primary) !== 1 && <button onClick={() => handleSetPrimary(acc.id)} className="rounded-xl bg-blue-900/20 px-3 py-2 text-xs text-blue-400 transition hover:bg-blue-900/40">Set Primary</button>}
                  <button onClick={() => handleRemove(acc.id)} className="rounded-xl bg-red-900/20 px-3 py-2 text-xs text-red-400 transition hover:bg-red-900/40">Remove</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showForm && (
        <form onSubmit={handleLink} className="space-y-4 rounded-3xl border border-slate-700 bg-slate-900 p-5">
          <p className="font-semibold text-white">Link New Account</p>
          <div>
            <label className="mb-2 block text-xs text-slate-400">Select Method</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {METHODS.map((m) => (
                <button key={m.id} type="button" disabled={linkedIds.includes(m.id)} onClick={() => setFormMethod(m.id)} className={`rounded-2xl border px-3 py-3 text-xs transition ${linkedIds.includes(m.id) ? "cursor-not-allowed border-slate-700 bg-slate-800 text-slate-500 opacity-40" : formMethod === m.id ? `${m.color} border-transparent text-white` : "border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600"}`}>
                  <div className="text-lg">{m.icon}</div>
                  <div className="mt-1">{m.label}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs text-slate-400">Account Number / Phone</label>
            <input value={accountInput} onChange={(e) => setAccountInput(e.target.value)} placeholder={METHODS.find((m) => m.id === formMethod)?.placeholder} className="w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="mb-2 block text-xs text-slate-400">Account Name (optional)</label>
            <input value={nameInput} onChange={(e) => setNameInput(e.target.value)} placeholder="Your name on this account" className="w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white outline-none focus:border-blue-500" />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 rounded-2xl bg-slate-800 py-3 text-sm text-slate-300 transition hover:bg-slate-700">Cancel</button>
            <button type="submit" disabled={loading || !accountInput} className="flex-1 rounded-2xl bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60">{loading ? "Linking..." : "Link Account"}</button>
          </div>
        </form>
      )}
    </div>
  );
}
