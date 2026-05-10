// src/components/charts/MonthlyRevenueChart.jsx
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const MONTH_NAMES = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec",
];

const money = (v) =>
  `₱${Number(v || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

// ── Custom tooltip ────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-slate-800/95 px-3 py-2 shadow-xl backdrop-blur-sm">
      <p className="mb-1 text-xs font-semibold text-slate-400">{label}</p>
      <p className="text-sm font-bold text-white">{money(payload[0].value)}</p>
    </div>
  );
};

// ── Parse raw API data into Recharts format ───────────────────
// Input:  [{ yr: 2026, mo: 5, total: "12000.00" }]
// Output: [{ yr: 2026, mo: 5, total: 12000, label: "May" }]
export const parseMonthlyData = (raw = []) =>
  raw.map((m) => ({
    yr:    parseInt(m.yr),
    mo:    parseInt(m.mo),
    total: parseFloat(m.total || 0),
    label: MONTH_NAMES[parseInt(m.mo) - 1] ?? String(m.mo),
  }));

// ── The shared chart component ────────────────────────────────
// Props:
//   monthlyRevenue  — raw array from stats.monthlyRevenue (API response)
//   loading         — boolean, shows spinner while data loads
//   height          — optional chart height in px (default 200)
export default function MonthlyRevenueChart({
  monthlyRevenue = [],
  loading        = false,
  height         = 200,
}) {
  const monthly    = parseMonthlyData(monthlyRevenue);
  const sixMonthTotal = monthly.reduce((sum, m) => sum + m.total, 0);

  // ── Loading state ─────────────────────────────────────────
  if (loading) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ height: `${height}px` }}
      >
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  // ── Empty state ───────────────────────────────────────────
  if (monthly.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-2"
        style={{ height: `${height}px` }}
      >
        <span className="text-3xl">📊</span>
        <p className="text-sm text-slate-500">No revenue data yet.</p>
      </div>
    );
  }

  // ── Chart ─────────────────────────────────────────────────
  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={monthly}
          margin={{ top: 12, right: 12, left: 0, bottom: 0 }}
        >
          {/* Gradient definition — indigo → violet */}
          <defs>
            <linearGradient id="revenueLineGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"   stopColor="#6366f1" stopOpacity={1} />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity={1} />
            </linearGradient>
          </defs>

          {/* Horizontal grid lines only */}
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.05)"
            vertical={false}
          />

          {/* X-axis — shows month names like Jan, Feb */}
          <XAxis
            dataKey="label"
            tick={{ fill: "#64748b", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />

          {/* Y-axis — shows ₱ formatted amounts */}
          <YAxis
            tick={{ fill: "#64748b", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={60}
            tickFormatter={(v) =>
              v >= 1000 ? `₱${(v / 1000).toFixed(0)}k` : `₱${v}`
            }
          />

          {/* Hover tooltip */}
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ stroke: "rgba(255,255,255,0.08)", strokeWidth: 1 }}
          />

          {/* The line itself */}
          <Line
            type="monotone"
            dataKey="total"
            stroke="url(#revenueLineGradient)"
            strokeWidth={2.5}
            dot={{
              fill:        "#8b5cf6",
              r:           4,
              strokeWidth: 2,
              stroke:      "#0f172a",
            }}
            activeDot={{
              r:           6,
              fill:        "#a78bfa",
              stroke:      "#0f172a",
              strokeWidth: 2,
            }}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* 6-month total summary below chart */}
      <p className="mt-3 text-right text-xs text-slate-600">
        6-month total:{" "}
        <span className="font-semibold text-slate-400">
          {money(sixMonthTotal)}
        </span>
      </p>
    </div>
  );
}