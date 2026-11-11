"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { useTheme } from "next-themes";

interface SeverityChartProps {
  data: { name: string; value: number }[];
}

const COLORS: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#10b981",
};

export function SeverityChart({ data }: SeverityChartProps) {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const chartData = data.filter((d) => d.value > 0);

  if (chartData.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-xs text-(--foreground-muted) font-mono">
        No incident severity data available
      </div>
    );
  }

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={75}
            paddingAngle={4}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[entry.name.toLowerCase()] || "#64748b"}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: isLight ? "#ffffff" : "#0b1120",
              borderColor: isLight ? "#e2e8f0" : "#1e293b",
              borderRadius: "8px",
              color: isLight ? "#0f172a" : "#f8fafc",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
