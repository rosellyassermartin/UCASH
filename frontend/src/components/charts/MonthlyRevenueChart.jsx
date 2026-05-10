import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
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

// ── Custom Tooltip ────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-slate-800/95 px-4 py-3 shadow-xl backdrop-blur-sm">
      <p className="mb-2 text-xs font-semibold text-slate-400">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="text-sm font-bold" style={{ color: entry.color }}>
          {entry.name === "Revenue" ? money(entry.value) : money(entry.value)}
        </p>
      ))}
    </div>
  );
};

// ── Custom Legend ─────────────────────────────────────────────
const CustomLegend = () => (
  <div className="mt-3 flex items-center justify-center gap-6">
    <div className="flex items-center gap-2">
      <div className="h-3 w-3 rounded-sm bg-indigo-500 opacity-80" />
      <span className="text-xs text-slate-400">Monthly Revenue</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="h-0.5 w-6 bg-violet-400" />
      <div className="h-2 w-2 rounded-full bg-violet-400" />
      <span className="text-xs text-slate-400">Trend</span>
    </div>
  </div>
);

// ── Parse raw API data ────────────────────────────────────────
export const parseMonthlyData = (raw = []) =>
  raw.map((m) => ({
    yr:    parseInt(m.yr),
    mo:    parseInt(m.mo),
    total: parseFloat(m.total || 0),
    label: MONTH_NAMES[parseInt(m.mo) - 1] ?? String(m.mo),
  }));

// ── Main Chart Component ──────────────────────────────────────
export default function MonthlyRevenueChart({
  monthlyRevenue = [],
  loading        = false,
  height         = 220,
}) {
  const monthly       = parseMonthlyData(monthlyRevenue);
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

  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart
          data={monthly}
          margin={{ top: 12, right: 16, left: 0, bottom: 0 }}
        >
          <defs>
            {/* Bar gradient — indigo */}
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#6366f1" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#4338ca" stopOpacity={0.6} />
            </linearGradient>
          </defs>

          {/* Grid */}
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.05)"
            vertical={false}
          />

          {/* X-axis — month names */}
          <XAxis
            dataKey="label"
            tick={{ fill: "#64748b", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />

          {/* Left Y-axis — bar amounts */}
          <YAxis
            yAxisId="left"
            tick={{ fill: "#64748b", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={60}
            tickFormatter={(v) =>
              v >= 1000 ? `₱${(v / 1000).toFixed(0)}k` : `₱${v}`
            }
          />

          {/* Right Y-axis — line trend amounts */}
          <YAxis
            yAxisId="right"
            orientation="right"
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
            cursor={{ fill: "rgba(255,255,255,0.03)" }}
          />

          {/* Blue bars — monthly revenue */}
          <Bar
            yAxisId="left"
            dataKey="total"
            name="Revenue"
            fill="url(#barGradient)"
            radius={[6, 6, 0, 0]}
            maxBarSize={48}
          />

          {/* Violet trend line on top of bars */}
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="total"
            name="Trend"
            stroke="#a78bfa"
            strokeWidth={2.5}
            dot={{
              fill:        "#a78bfa",
              r:           4,
              strokeWidth: 2,
              stroke:      "#0f172a",
            }}
            activeDot={{
              r:           6,
              fill:        "#c4b5fd",
              stroke:      "#0f172a",
              strokeWidth: 2,
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Custom legend */}
      <CustomLegend />

      {/* 6-month total */}
      <p className="mt-3 text-right text-xs text-slate-600">
        6-month total:{" "}
        <span className="font-semibold text-slate-400">
          {money(sixMonthTotal)}
        </span>
      </p>
    </div>
  );
}