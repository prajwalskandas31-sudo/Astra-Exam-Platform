"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface TrendPoint {
  label: string;
  value: number;
  detail?: string;
}

const SERIES = "#3b82f6";

/** Single-series line chart (e.g. score % over attempts). The page title names the series, so no legend. */
export function TrendChart({ data, unit = "%", height = 240, domain = [0, 100] }: { data: TrendPoint[]; unit?: string; height?: number; domain?: [number, number] }) {
  return (
    <div style={{ height }} role="img" aria-label={`Trend of ${data.length} points`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={16} />
          <YAxis domain={domain} tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} unit={unit} width={48} />
          <Tooltip
            cursor={{ stroke: "rgba(255,255,255,0.2)" }}
            contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }}
            labelStyle={{ color: "#e2e8f0", fontWeight: 600 }}
            itemStyle={{ color: "#cbd5e1" }}
            formatter={(value, _name, item) => [`${value}${unit}`, (item?.payload as TrendPoint | undefined)?.detail || "Score"]}
          />
          <Line type="monotone" dataKey="value" stroke={SERIES} strokeWidth={2} dot={{ r: 4, fill: SERIES, stroke: "#0f172a", strokeWidth: 2 }} activeDot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
