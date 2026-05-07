import { useCallback, useEffect, useState } from "react";
import { userAPI, walletAPI } from "../../api.js";

const money = (v) => `₱${Number(v || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function StudentPayments() {
  const [selected, setSelected] = useState(null);
  const [payType, setPayType] = useState("full");
  const [amount, setAmount] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [fees, setFees] = useState([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setError("");
    try {
      const [feesRes, balanceRes] = await Promise.all([userAPI.getFees(), walletAPI.getBalance()]);
      setFees(feesRes.fees || []);
      setWalletBalance(Number(balanceRes.balance || 0));
    } catch (err) {
      setError(err.message || "Could not load payment data.");
    }
  }, []);

  useEffect(() => {
    loadData();
    const handler = () => loadData();
    window.addEventListener("ucash:data-changed", handler);
    return () => window.removeEventListener("ucash:data-changed", handler);
  }, [loadData]);

  const handlePay = async (fee) => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const remaining = Number(fee.remaining_amount || 0);
      const finalAmount = payType === "full" ? remaining : Number(amount);
      const res = await walletAPI.payFee(fee.id, finalAmount);
      setSuccess(res.message || "Payment submitted.");
      setSelected(null);
      setAmount("");
      await loadData();
      window.dispatchEvent(new Event("ucash:data-changed"));
    } catch (err) {
      setError(err.message || "Payment failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <h1 className="text-2xl font-bold text-white">💳 Make Payment</h1>

      <div className="flex items-center justify-between rounded-2xl border border-blue-800 bg-blue-900/30 p-4">
        <div>
          <p className="text-xs text-blue-300">Wallet Balance</p>
          <p className="text-lg font-bold text-white">{money(walletBalance)}</p>
        </div>
        <span className="text-2xl">👛</span>
      </div>

      {success && <div className="rounded-2xl border border-green-700 bg-green-900/30 px-4 py-3 text-sm text-green-300">{success}</div>}
      {error && <div className="rounded-2xl border border-red-700 bg-red-900/30 px-4 py-3 text-sm text-red-300">{error}</div>}

      <div className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Select Fee to Pay</p>
        {fees.map((fee) => {
          const remaining = Number(fee.remaining_amount || 0);
          const total = Number(fee.total_amount || 0);
          const paid = Number(fee.paid_amount || 0);
          const pct = total > 0 ? Math.round((paid / total) * 100) : 0;
          const isPaid = Number(fee.is_paid) === 1 || remaining <= 0;
          return (
            <div key={fee.id} onClick={() => !isPaid && setSelected(selected === fee.id ? null : fee.id)} className={`rounded-3xl border p-4 transition ${isPaid ? "cursor-not-allowed border-slate-800 bg-slate-900 opacity-60" : selected === fee.id ? "border-blue-500 bg-blue-900/20" : "cursor-pointer border-slate-800 bg-slate-900 hover:border-slate-700"}`}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-white">{fee.label}</p>
                  <p className="text-xs text-slate-400">Remaining: {money(remaining)}</p>
                </div>
                {isPaid ? <span className="rounded-full bg-green-900/30 px-2 py-1 text-xs text-green-400">✓ Paid</span> : <span className="text-xs text-blue-400">{pct}% paid</span>}
              </div>
              <div className="h-1.5 rounded-full bg-slate-800">
                <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
              </div>

              {selected === fee.id && !isPaid && (
                <div className="mt-4 space-y-3 border-t border-slate-700 pt-4" onClick={(e) => e.stopPropagation()}>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button type="button" onClick={() => setPayType("full")} className={`flex-1 rounded-xl border py-2 text-xs font-medium transition ${payType === "full" ? "border-blue-500 bg-blue-600/20 text-blue-400" : "border-slate-700 text-slate-500"}`}>Full ({money(remaining)})</button>
                    <button type="button" onClick={() => setPayType("partial")} className={`flex-1 rounded-xl border py-2 text-xs font-medium transition ${payType === "partial" ? "border-blue-500 bg-blue-600/20 text-blue-400" : "border-slate-700 text-slate-500"}`}>Partial Amount</button>
                  </div>
                  {payType === "partial" && (
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder={`Enter amount (max ${money(remaining)})`}
                      min="1"
                      max={remaining}
                      className="w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
                    />
                  )}
                  <button onClick={() => handlePay(fee)} disabled={loading || (payType === "partial" && !amount)} className="w-full rounded-2xl bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60">
                    {loading ? "Processing..." : `Pay ${payType === "full" ? money(remaining) : money(amount || 0)}`}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-xs text-slate-500">
        <p className="mb-2 text-sm font-medium text-slate-300">ℹ️ Payment Info</p>
        <ul className="space-y-1">
          <li>• Payments are deducted from your UCash wallet balance immediately.</li>
          <li>• Fee status updates only after admin verification of the payment transaction.</li>
          <li>• Rejected payments are refunded to the wallet automatically.</li>
        </ul>
      </div>
    </div>
  );
}
