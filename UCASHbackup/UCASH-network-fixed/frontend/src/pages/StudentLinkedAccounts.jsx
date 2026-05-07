import { useState } from "react";

const METHODS = [
  { id: "gcash", label: "GCash", icon: "💙", color: "bg-blue-600", placeholder: "09XXXXXXXXX" },
  { id: "maya", label: "Maya", icon: "💚", color: "bg-green-600", placeholder: "09XXXXXXXXX" },
  { id: "paymaya", label: "PayMaya", icon: "💜", color: "bg-purple-600", placeholder: "09XXXXXXXXX" },
  { id: "bdo", label: "BDO", icon: "🏦", color: "bg-red-700", placeholder: "Account number" },
  { id: "metrobank", label: "Metrobank", icon: "🏛️", color: "bg-amber-700", placeholder: "Account number" },
];

export default function StudentLinkedAccounts({ user }) {
  const [linked, setLinked] = useState([
    { id: "gcash", label: "GCash", icon: "💙", color: "bg-blue-600", account: "0917-123-4567", primary: true },
  ]);
  const [showForm, setShowForm] = useState(false);
  const [formMethod, setFormMethod] = useState(null);
  const [accountInput, setAccountInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleLink = async (e) => {
    e.preventDefault();
    if (!formMethod || !accountInput) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    const method = METHODS.find(m => m.id === formMethod);
    setLinked(prev => [...prev, { ...method, account: accountInput, name: nameInput, primary: false }]);
    setLoading(false);
    setSuccess(true);
    setShowForm(false);
    setAccountInput("");
    setNameInput("");
    setTimeout(() => setSuccess(false), 3000);
  };

  const handleRemove = (id) => setLinked(prev => prev.filter(m => m.id !== id));
  const handleSetPrimary = (id) => setLinked(prev => prev.map(m => ({ ...m, primary: m.id === id })));

  const linkedIds = linked.map(l => l.id);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-white text-2xl font-bold">🔗 Linked Accounts</h1>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
          + Link Account
        </button>
      </div>

      {success && (
        <div className="bg-green-900/40 border border-green-700 rounded-xl p-3 flex items-center gap-2">
          <span>✅</span>
          <p className="text-green-400 text-sm">Account linked successfully!</p>
        </div>
      )}

      {/* Linked accounts */}
      <div className="space-y-3">
        <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Your Linked Accounts ({linked.length})</p>
        {linked.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
            <p className="text-4xl mb-2">🔗</p>
            <p className="text-slate-400 text-sm">No linked accounts yet</p>
          </div>
        ) : linked.map(acc => (
          <div key={acc.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${acc.color} flex items-center justify-center text-xl`}>
                  {acc.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-white font-medium text-sm">{acc.label}</p>
                    {acc.primary && <span className="text-xs bg-blue-900/50 text-blue-400 px-2 py-0.5 rounded-full">Primary</span>}
                  </div>
                  <p className="text-slate-400 text-xs font-mono">{acc.account}</p>
                  {acc.name && <p className="text-slate-500 text-xs">{acc.name}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!acc.primary && (
                  <button onClick={() => handleSetPrimary(acc.id)}
                    className="text-xs text-blue-400 hover:text-blue-300 bg-blue-900/20 px-2 py-1 rounded-lg transition-colors">
                    Set Primary
                  </button>
                )}
                <button onClick={() => handleRemove(acc.id)}
                  className="text-xs text-red-400 hover:text-red-300 bg-red-900/20 px-2 py-1 rounded-lg transition-colors">
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 space-y-4">
          <p className="text-white font-semibold">Link New Account</p>

          <div>
            <label className="block text-slate-400 text-xs mb-2">Select Method</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {METHODS.map(m => (
                <button key={m.id} type="button"
                  disabled={linkedIds.includes(m.id)}
                  onClick={() => setFormMethod(m.id)}
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all text-xs ${
                    linkedIds.includes(m.id) ? "opacity-40 cursor-not-allowed bg-slate-800 border-slate-700 text-slate-500" :
                    formMethod === m.id
                      ? `${m.color} border-transparent text-white`
                      : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"
                  }`}>
                  <span className="text-lg">{m.icon}</span>
                  {m.label}
                  {linkedIds.includes(m.id) && <span className="text-xs">✓</span>}
                </button>
              ))}
            </div>
          </div>

          {formMethod && (
            <>
              <div>
                <label className="block text-slate-400 text-xs mb-1.5">Account Number / Phone</label>
                <input type="text" value={accountInput} onChange={e => setAccountInput(e.target.value)}
                  placeholder={METHODS.find(m => m.id === formMethod)?.placeholder}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 placeholder-slate-600" />
              </div>
              <div>
                <label className="block text-slate-400 text-xs mb-1.5">Account Name (optional)</label>
                <input type="text" value={nameInput} onChange={e => setNameInput(e.target.value)}
                  placeholder="Your name on this account"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 placeholder-slate-600" />
              </div>
            </>
          )}

          <div className="flex flex-wrap gap-3">
            <button onClick={() => setShowForm(false)}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-xl text-sm transition-colors">
              Cancel
            </button>
            <button onClick={handleLink} disabled={loading || !formMethod || !accountInput}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-60 flex items-center justify-center gap-2">
              {loading ? <span className="animate-spin">⏳</span> : "🔗 Link Account"}
            </button>
          </div>
        </div>
      )}

      {/* Available methods */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <p className="text-slate-300 text-sm font-medium mb-3">Supported Payment Methods</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {METHODS.map(m => (
            <div key={m.id} className={`flex flex-col items-center gap-1 p-2 rounded-lg ${m.color}/20`}>
              <span className="text-xl">{m.icon}</span>
              <span className="text-xs text-slate-400">{m.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
