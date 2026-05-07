import { useCallback, useEffect, useMemo, useState } from "react";
import { transactionAPI, userAPI } from "../../api.js";

function buildNotifications(transactions, fees) {
  const txNotifications = transactions.slice(0, 8).map((tx, index) => {
    const map = {
      verified: { type: "success", title: "Transaction Verified" },
      pending: { type: "warning", title: "Transaction Pending" },
      rejected: { type: "error", title: "Transaction Rejected" },
    };
    const meta = map[tx.status] || { type: "info", title: "Transaction Update" };
    return {
      id: `tx-${tx.id}`,
      type: meta.type,
      title: meta.title,
      message: `${tx.description} — ${tx.status}.`,
      time: new Date(tx.created_at).toLocaleString(),
      read: index > 2,
    };
  });

  const feeNotifications = fees
    .filter((fee) => Number(fee.remaining_amount || 0) > 0)
    .slice(0, 4)
    .map((fee) => ({
      id: `fee-${fee.id}`,
      type: "info",
      title: "Outstanding Balance",
      message: `${fee.label} still has ${Number(fee.remaining_amount).toLocaleString("en-PH", { style: "currency", currency: "PHP" })} remaining.${fee.due_date ? ` Due date: ${fee.due_date}.` : ""}`,
      time: "Current",
      read: false,
    }));

  return [...txNotifications, ...feeNotifications];
}

export default function StudentNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState("All");
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    try {
      const [txRes, feesRes] = await Promise.all([
        transactionAPI.getMyTransactions({ limit: 20 }),
        userAPI.getFees(),
      ]);
      setNotifications(buildNotifications(txRes.transactions || [], feesRes.fees || []));
    } catch (err) {
      setError(err.message || "Could not load notifications.");
    }
  }, []);

  useEffect(() => {
    loadData();
    const handler = () => loadData();
    window.addEventListener("ucash:data-changed", handler);
    return () => window.removeEventListener("ucash:data-changed", handler);
  }, [loadData]);

  const markRead = (id) => setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  const markAllRead = () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  const deleteNotif = (id) => setNotifications((prev) => prev.filter((n) => n.id !== id));

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);
  const filtered = filter === "All" ? notifications : notifications.filter((n) => !n.read);

  const typeConfig = {
    success: { icon: "✅", bg: "bg-green-900/30", border: "border-green-800/50" },
    warning: { icon: "⚠️", bg: "bg-yellow-900/30", border: "border-yellow-800/50" },
    info: { icon: "ℹ️", bg: "bg-blue-900/30", border: "border-blue-800/50" },
    error: { icon: "❌", bg: "bg-red-900/30", border: "border-red-800/50" },
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">🔔 Notifications</h1>
          {unreadCount > 0 && <p className="mt-0.5 text-sm text-blue-400">{unreadCount} unread</p>}
        </div>
        {unreadCount > 0 && <button onClick={markAllRead} className="rounded-xl bg-blue-900/20 px-3 py-2 text-xs text-blue-400 transition hover:bg-blue-900/40">Mark all read</button>}
      </div>

      {error && <div className="rounded-2xl border border-red-700 bg-red-900/30 px-4 py-3 text-sm text-red-300">{error}</div>}

      <div className="flex gap-2">
        {["All", "Unread"].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-xl px-3 py-2 text-xs font-medium transition ${filter === f ? "bg-blue-600 text-white" : "border border-slate-700 bg-slate-800 text-slate-400 hover:text-white"}`}>
            {f} {f === "Unread" && unreadCount > 0 ? `(${unreadCount})` : ""}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="py-12 text-center">
            <p className="mb-2 text-4xl">🎉</p>
            <p className="text-sm text-slate-400">You're all caught up!</p>
          </div>
        ) : (
          filtered.map((n) => {
            const cfg = typeConfig[n.type] || typeConfig.info;
            return (
              <div key={n.id} className={`${cfg.bg} ${cfg.border} rounded-2xl border p-4 ${!n.read ? "shadow-sm" : "opacity-70"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 text-xl">{cfg.icon}</span>
                    <div>
                      <div className="mb-1 flex items-center gap-2">
                        <p className="text-sm font-medium text-white">{n.title}</p>
                        {!n.read && <span className="h-2 w-2 rounded-full bg-blue-500" />}
                      </div>
                      <p className="text-xs leading-relaxed text-slate-400">{n.message}</p>
                      <p className="mt-1.5 text-xs text-slate-600">{n.time}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {!n.read && <button onClick={() => markRead(n.id)} className="text-xs text-blue-400 hover:text-blue-300">Read</button>}
                    <button onClick={() => deleteNotif(n.id)} className="text-xs text-slate-600 transition hover:text-red-400">✕</button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
