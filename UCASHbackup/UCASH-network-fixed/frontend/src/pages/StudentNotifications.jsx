import { useState } from "react";

const INITIAL = [
  { id: 1, type: "success", title: "Payment Verified", message: "Your Tuition Fee payment of ₱5,000 has been verified by admin.", time: "2 hours ago", read: false },
  { id: 2, type: "warning", title: "Outstanding Balance", message: "You have ₱7,500 outstanding fees due by May 30, 2025.", time: "5 hours ago", read: false },
  { id: 3, type: "info", title: "Funds Added", message: "₱3,000 from GCash has been credited to your wallet.", time: "1 day ago", read: false },
  { id: 4, type: "error", title: "Transaction Rejected", message: "Your Miscellaneous Fee payment was rejected. Contact registrar.", time: "2 days ago", read: true },
  { id: 5, type: "success", title: "Account Linked", message: "GCash account 0917-123-4567 linked successfully.", time: "3 days ago", read: true },
  { id: 6, type: "info", title: "System Maintenance", message: "UCash will undergo maintenance on Apr 20, 2:00 AM - 4:00 AM.", time: "4 days ago", read: true },
];

export default function StudentNotifications({ user }) {
  const [notifs, setNotifs] = useState(INITIAL);
  const [filter, setFilter] = useState("All");

  const markRead = (id) => setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  const markAllRead = () => setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  const deleteNotif = (id) => setNotifs(prev => prev.filter(n => n.id !== id));

  const unreadCount = notifs.filter(n => !n.read).length;
  const filtered = filter === "All" ? notifs : notifs.filter(n => !n.read);

  const typeConfig = {
    success: { icon: "✅", bg: "bg-green-900/30", border: "border-green-800/50", badge: "bg-green-900/40 text-green-400" },
    warning: { icon: "⚠️", bg: "bg-yellow-900/30", border: "border-yellow-800/50", badge: "bg-yellow-900/40 text-yellow-400" },
    info: { icon: "ℹ️", bg: "bg-blue-900/30", border: "border-blue-800/50", badge: "bg-blue-900/40 text-blue-400" },
    error: { icon: "❌", bg: "bg-red-900/30", border: "border-red-800/50", badge: "bg-red-900/40 text-red-400" },
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-bold">🔔 Notifications</h1>
          {unreadCount > 0 && <p className="text-blue-400 text-sm mt-0.5">{unreadCount} unread</p>}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="text-xs text-blue-400 hover:text-blue-300 bg-blue-900/20 px-3 py-1.5 rounded-lg transition-colors">
            Mark all read
          </button>
        )}
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        {["All", "Unread"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === f ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 border border-slate-700 hover:text-white"
            }`}>
            {f} {f === "Unread" && unreadCount > 0 && `(${unreadCount})`}
          </button>
        ))}
      </div>

      {/* Notifications */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-2">🎉</p>
            <p className="text-slate-400 text-sm">You're all caught up!</p>
          </div>
        ) : filtered.map(n => {
          const cfg = typeConfig[n.type];
          return (
            <div key={n.id} className={`${cfg.bg} border ${cfg.border} rounded-2xl p-4 transition-all ${!n.read ? "shadow-sm" : "opacity-70"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="text-xl mt-0.5">{cfg.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-white font-medium text-sm">{n.title}</p>
                      {!n.read && <span className="w-2 h-2 bg-blue-500 rounded-full" />}
                    </div>
                    <p className="text-slate-400 text-xs leading-relaxed">{n.message}</p>
                    <p className="text-slate-600 text-xs mt-1.5">{n.time}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!n.read && (
                    <button onClick={() => markRead(n.id)} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">Read</button>
                  )}
                  <button onClick={() => deleteNotif(n.id)} className="text-slate-600 hover:text-red-400 text-xs transition-colors">✕</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Notification settings hint */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <p className="text-slate-300 text-sm font-medium mb-2">📡 Notification Types</p>
        <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-2"><span>✅</span> Payment Verified</div>
          <div className="flex items-center gap-2"><span>⚠️</span> Due Date Reminders</div>
          <div className="flex items-center gap-2"><span>💰</span> Funds Added</div>
          <div className="flex items-center gap-2"><span>❌</span> Transaction Rejected</div>
          <div className="flex items-center gap-2"><span>🔔</span> System Alerts</div>
          <div className="flex items-center gap-2"><span>📋</span> Receipt Ready</div>
        </div>
      </div>
    </div>
  );
}
