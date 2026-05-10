// src/pages/AdminArea/AdminReports.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import * as XLSX                from "xlsx";
import { adminAPI, transactionAPI } from "../../api.js";
import MonthlyRevenueChart      from "../../components/charts/MonthlyRevenueChart.jsx";

export default function AdminReports() {
  const [loading,      setLoading]      = useState(false);
  const [stats,        setStats]        = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [error,        setError]        = useState("");

  const loadData = useCallback(async () => {
    try {
      const [statsRes, txRes] = await Promise.all([
        adminAPI.getStats(),
        transactionAPI.getAll({ limit: 200 }),
      ]);
      setStats(statsRes.stats);
      setTransactions(txRes.transactions || []);
    } catch (err) {
      setError(err.message || "Could not load reports.");
    }
  }, []);

  useEffect(() => {
    loadData();
    const handler = () => loadData();
    window.addEventListener("ucash:data-changed", handler);
    return () => window.removeEventListener("ucash:data-changed", handler);
  }, [loadData]);

  const feeBreakdown = useMemo(() => {
    const map   = { tuition: 0, lab: 0, library: 0, misc: 0 };
    transactions
      .filter((tx) => tx.type === "payment" && tx.status === "verified")
      .forEach((tx) => {
        if (Object.prototype.hasOwnProperty.call(map, tx.category)) {
          map[tx.category] += Number(tx.amount || 0);
        }
      });
    const total = Object.values(map).reduce((a, b) => a + b, 0) || 1;
    return [
      { label: "Tuition",       amount: map.tuition, pct: Math.round((map.tuition  / total) * 100), color: "bg-blue-500"   },
      { label: "Laboratory",    amount: map.lab,      pct: Math.round((map.lab      / total) * 100), color: "bg-teal-500"   },
      { label: "Library",       amount: map.library,  pct: Math.round((map.library  / total) * 100), color: "bg-purple-500" },
      { label: "Miscellaneous", amount: map.misc,     pct: Math.round((map.misc     / total) * 100), color: "bg-amber-500"  },
    ];
  }, [transactions]);

  // ── Excel export (unchanged) ──────────────────────────────
  const exportExcel = () => {
    setLoading(true);

    const monthly = (stats?.monthlyRevenue || []).map((m) => ({
      label: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][parseInt(m.mo) - 1],
      yr:    parseInt(m.yr),
      total: parseFloat(m.total || 0),
    }));

    const summaryData = [
      ["UCash – University of Cebu Payment System"],
      ["Financial Report"],
      ["Generated:", new Date().toLocaleString()],
      [],
      ["Metric",                   "Value"],
      ["Total Revenue (All Time)", Number(stats?.totalRevenue         || 0)],
      ["This Month's Revenue",     Number(stats?.monthRevenue         || 0)],
      ["Verified Transactions",    Number(stats?.verifiedTransactions || 0)],
      ["Pending Transactions",     Number(stats?.pendingTransactions  || 0)],
      ["Active Students",          Number(stats?.activeStudents       || 0)],
    ];

    const feeData = [
      ["Category", "Amount (₱)", "Percentage (%)"],
      ...feeBreakdown.map((f) => [f.label, f.amount, f.pct]),
    ];

    const monthlyData = [
      ["Month", "Year", "Total Revenue (₱)"],
      ...monthly.map((m) => [m.label, m.yr, m.total]),
    ];

    const wb        = XLSX.utils.book_new();
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    const wsFee     = XLSX.utils.aoa_to_sheet(feeData);
    const wsMonthly = XLSX.utils.aoa_to_sheet(monthlyData);

    wsSummary["!cols"] = [{ wch: 28 }, { wch: 20 }];
    wsFee["!cols"]     = [{ wch: 18 }, { wch: 16 }, { wch: 16 }];
    wsMonthly["!cols"] = [{ wch: 12 }, { wch: 8  }, { wch: 20 }];

    XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");
    XLSX.utils.book_append_sheet(wb, wsFee,     "Fee Breakdown");
    XLSX.utils.book_append_sheet(wb, wsMonthly, "Monthly Revenue");

    XLSX.writeFile(wb, `UCash-Report-${new Date().toISOString().slice(0, 10)}.xlsx`);
    setLoading(false);
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-white">📄 Reports</h1>
        <button
          onClick={exportExcel}
          disabled={loading}
          className="rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
        >
          {loading ? "Generating..." : "Export Report"}
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-700 bg-red-900/30 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
        {[
          { label: "Total Revenue",         value: `₱${Number(stats?.totalRevenue         || 0).toLocaleString()}`, icon: "💰" },
          { label: "Verified Transactions",  value:    Number(stats?.verifiedTransactions  || 0).toLocaleString(),   icon: "✅" },
          { label: "Active Students",        value:    Number(stats?.activeStudents        || 0).toLocaleString(),   icon: "👨‍🎓" },
          { label: "Pending Reviews",        value:    Number(stats?.pendingTransactions   || 0).toLocaleString(),   icon: "⏳" },
          { label: "Rejected Transactions",  value:    Number(stats?.rejectedTransactions  || 0).toLocaleString(),   icon: "❌" },
          { label: "This Month",             value: `₱${Number(stats?.monthRevenue        || 0).toLocaleString()}`, icon: "📅" },
        ].map((c) => (
          <div key={c.label} className="rounded-3xl border border-slate-800 bg-slate-900 p-4">
            <span className="text-xl">{c.icon}</span>
            <p className="mt-2 text-lg font-bold text-white">{c.value}</p>
            <p className="text-xs text-slate-500">{c.label}</p>
          </div>
        ))}
      </div>

      {/* ── Monthly Revenue Chart (same shared component) ──── */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
        <p className="mb-5 font-semibold text-white">📈 Monthly Revenue</p>

        {/* Exact same component as AdminDashboard — always in sync */}
        <MonthlyRevenueChart
          monthlyRevenue={stats?.monthlyRevenue}
          loading={!stats}
          height={220}
        />
      </div>

      {/* Fee Collection Breakdown */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
        <p className="mb-4 font-semibold text-white">💳 Fee Collection Breakdown</p>
        <div className="space-y-3">
          {feeBreakdown.map((f) => (
            <div key={f.label}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-slate-300">{f.label}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500">{f.pct}%</span>
                  <span className="font-medium text-white">
                    ₱{Number(f.amount).toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="h-2 rounded-full bg-slate-800">
                <div
                  className={`h-2 rounded-full ${f.color} transition-all duration-500`}
                  style={{ width: `${f.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}