"use client";
import { Area, AreaChart, Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/** 30-day sparkline for KPI cards. */
export function Sparkline({ data, label }: { data: number[]; label: string }) {
  const points = data.map((v, i) => ({ i, v }));
  return (
    <div className="h-12 w-full" role="img" aria-label={`${label}: 30-day trend, total ${data.reduce((a, b) => a + b, 0)}`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`spark-${label.replace(/\W/g, "")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7B1FA2" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#7B1FA2" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="v" stroke="#7B1FA2" strokeWidth={2} fill={`url(#spark-${label.replace(/\W/g, "")})`} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Monthly average rating (line) and review volume (bars). */
export function RatingTrendChart({ data }: { data: { month: string; avg: number; count: number }[] }) {
  if (!data.length) return <p className="py-10 text-center text-sm text-muted-foreground">No reviews in the last 12 months yet.</p>;
  return (
    <div className="h-64 w-full" role="img" aria-label="Average rating and review count by month">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
          <YAxis yAxisId="r" domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
          <YAxis yAxisId="c" orientation="right" allowDecimals={false} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13 }} />
          <Bar yAxisId="c" dataKey="count" name="Reviews" fill="#BFDBFE" radius={[4, 4, 0, 0]} />
          <Line yAxisId="r" type="monotone" dataKey="avg" name="Avg rating" stroke="#F59E0B" strokeWidth={2.5} dot={{ r: 3 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
