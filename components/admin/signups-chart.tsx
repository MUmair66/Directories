"use client";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function SignupsChart({ data }: { data: { date: string; signups: number }[] }) {
  const total = data.reduce((n, d) => n + d.signups, 0);
  return (
    <figure>
      <figcaption className="sr-only">Daily signups over the last 30 days, {total} in total.</figcaption>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="signupFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7B1FA2" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#7B1FA2" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} tickLine={false} axisLine={false} minTickGap={24} />
            <YAxis allowDecimals={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--foreground)" }} labelStyle={{ fontWeight: 600 }} />
            <Area type="monotone" dataKey="signups" name="Signups" stroke="#7B1FA2" strokeWidth={2} fill="url(#signupFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
