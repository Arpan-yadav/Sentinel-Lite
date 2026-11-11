"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useTheme } from "next-themes";

interface TrendChartProps {
  data: { attack_type: string; count: number }[];
}

export function TrendChart({ data }: TrendChartProps) {
  const { theme } = useTheme();
  const isLight = theme === "light";

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-(--foreground-muted) font-mono">
        No attack detections recorded yet
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={isLight ? "#e2e8f0" : "#1e293b"}
            vertical={false}
          />
          <XAxis
            dataKey="attack_type"
            stroke={isLight ? "#64748b" : "#94a3b8"}
            fontSize={12}
            tickLine={false}
            axisLine={{ stroke: isLight ? "#cbd5e1" : "#334155" }}
          />
          <YAxis
            stroke={isLight ? "#64748b" : "#94a3b8"}
            fontSize={12}
            tickLine={false}
            axisLine={{ stroke: isLight ? "#cbd5e1" : "#334155" }}
          />
          <Tooltip
            cursor={{ fill: isLight ? "#f1f5f9" : "#1e293b", opacity: 0.5 }}
            contentStyle={{
              backgroundColor: isLight ? "#ffffff" : "#0b1120",
              borderColor: isLight ? "#e2e8f0" : "#1e293b",
              borderRadius: "8px",
              color: isLight ? "#0f172a" : "#f8fafc",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
            }}
          />
          <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
