import { useState } from "react";

const FEES = [
  { id: "tuition", label: "Tuition Fee", total: 10000, paid: 5000, icon: "🎓" },
  { id: "lab", label: "Laboratory Fee", total: 1500, paid: 1000, icon: "🔬" },
  { id: "library", label: "Library Fee", total: 500, paid: 350, icon: "📚" },
  { id: "misc", label: "Miscellaneous", total: 500, paid: 500, icon: "📎" },
];

export default function StudentPayments({ user }) {
  const [selected, setSelected] = useState(null);
  const [payType, setPayType] = useState("full");
  const [amount, setAmount] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const walletBalance = 0;

  const handlePay = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 1500));
    setLoading(false);
    setSuccess(true);
    setTimeout(() => { setSuccess(false); setSelected(null); setAmount(""); }, 3000);
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-white text-2xl font-bold">💳 Make Payment</h1>

      {/* Wallet balance */}
      <div className="bg-blue-900/30 border border-blue-800 rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="text-blue-300 text-xs">Wallet Balance</p>
          <p className="text-white font-bold text-lg">₱{walletBalance.toLocaleString()}.00</p>
        </div>
        <span className="text-2xl">👛</span>
      </div>

      {success && (
        <div className="bg-green-900/40 border border-green-700 rounded-xl p-4 flex items-center gap-3">
          <span className="text-2xl">✅</span>
          <div>
            <p className="text-green-400 font-semibold">Payment Submitted!</p>
            <p className="text-green-300 text-xs">Pending admin verification. You'll be notified once confirmed.</p>
          </div>
        </div>
      )}

      {/* Fee list */}
      <div className="space-y-3">
        <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Select Fee to Pay</p>
        {FEES.map(fee => {
          const remaining = fee.total - fee.paid;
          const pct = Math.round((fee.paid / fee.total) * 100);
          const isPaid = remaining === 0;
          return (
            <div key={fee.id}
              onClick={() => !isPaid && setSelected(selected === fee.id ? null : fee.id)}
              className={`bg-slate-900 border rounded-2xl p-4 cursor-pointer transition-all ${
                isPaid ? "opacity-50 cursor-not-allowed border-slate-800" :
                selected === fee.id ? "border-blue-500 bg-blue-900/20" : "border-slate-800 hover:border-slate-700"
              }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{fee.icon}</span>
                  <div>
                    <p className="text-white font-medium text-sm">{fee.label}</p>
                    <p className="text-slate-400 text-xs">Remaining: ₱{remaining.toLocaleString()}</p>
                  </div>
                </div>
                {isPaid ? (
                  <span className="text-green-400 text-xs bg-green-900/30 px-2 py-1 rounded-full">✓ Paid</span>
                ) : (
                  <span className="text-blue-400 text-xs">{pct}% paid</span>
                )}
              </div>
              <div className="h-1.5 bg-slate-800 rounded-full">
                <div className="h-1.5 bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
              </div>

              {/* Payment form */}
              {selected === fee.id && !isPaid && (
                <div className="mt-4 pt-4 border-t border-slate-700 space-y-3" onClick={e => e.stopPropagation()}>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => setPayType("full")}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${
                        payType === "full" ? "border-blue-500 bg-blue-600/20 text-blue-400" : "border-slate-700 text-slate-500"
                      }`}>Full (₱{remaining.toLocaleString()})</button>
                    <button onClick={() => setPayType("partial")}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${
                        payType === "partial" ? "border-blue-500 bg-blue-600/20 text-blue-400" : "border-slate-700 text-slate-500"
                      }`}>Partial Amount</button>
                  </div>
                  {payType === "partial" && (
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                      placeholder={`Enter amount (max ₱${remaining.toLocaleString()})`} min="1" max={remaining}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500" />
                  )}
                  <button onClick={handlePay} disabled={loading || (payType === "partial" && !amount)}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                    {loading ? <span className="animate-spin">⏳</span> : null}
                    {loading ? "Processing..." : `Pay ₱${payType === "full" ? remaining.toLocaleString() : (amount || "0")}`}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Info */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
        <p className="text-slate-300 text-sm font-medium">ℹ️ Payment Info</p>
        <ul className="text-slate-500 text-xs space-y-1">
          <li>• Payments are deducted from your UCash wallet balance</li>
          <li>• Admin verification required before status changes to "Verified"</li>
          <li>• Download receipts from the Transaction History page</li>
          <li>• Contact registrar for payment disputes</li>
        </ul>
      </div>
    </div>
  );
}
