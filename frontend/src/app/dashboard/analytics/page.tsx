"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { TrendChart } from "@/components/charts/trend-chart";
import { SeverityChart } from "@/components/charts/severity-chart";
import { AttackTrend, SeverityDistribution } from "@/types";
import { BarChart3, ShieldAlert, Cpu } from "lucide-react";

export default function AnalyticsPage() {
  const [trends, setTrends] = useState<AttackTrend[]>([]);
  const [severities, setSeverities] = useState<SeverityDistribution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const [trendRes, sevRes] = await Promise.allSettled([
          api.get<AttackTrend[]>("/analytics/attack-trends"),
          api.get<SeverityDistribution[]>("/analytics/severity-distribution"),
        ]);

        if (trendRes.status === "fulfilled") setTrends(trendRes.value.data);
        if (sevRes.status === "fulfilled") setSeverities(sevRes.value.data);
      } catch (err) {
        console.error("Analytics fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  const chartTrends = trends.map((t) => ({
    attack_type: t.event_type || t.date || "Unknown",
    count: t.count,
  }));

  const chartSeverities = severities.map((s) => ({
    name: s.severity,
    value: s.count,
  }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="pb-6 border-b border-[var(--border)]">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
          Security Analytics & Threat Patterns
        </h1>
        <p className="text-sm text-[var(--foreground-muted)] font-mono mt-1">
          Historical attack trends, ML classification distributions, and model performance
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attack Vector Distribution */}
        <div className="p-6 rounded-2xl bg-[var(--background-card)] border border-[var(--border)] space-y-4 shadow-sm">
          <div className="flex items-center gap-2 text-[var(--foreground)] text-sm font-bold uppercase font-mono">
            <BarChart3 className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
            Attack Distribution (Top Vectors)
          </div>
          <p className="text-xs text-[var(--foreground-muted)]">Classified by supervised XGBoost engine</p>
          <TrendChart data={chartTrends} />
        </div>

        {/* Severity Breakdown */}
        <div className="p-6 rounded-2xl bg-[var(--background-card)] border border-[var(--border)] space-y-4 shadow-sm">
          <div className="flex items-center gap-2 text-[var(--foreground)] text-sm font-bold uppercase font-mono">
            <ShieldAlert className="h-4 w-4 text-amber-500 dark:text-amber-400" />
            Severity Breakdown
          </div>
          <p className="text-xs text-[var(--foreground-muted)]">Calculated via multi-factor risk formula</p>
          <SeverityChart data={chartSeverities} />
        </div>
      </div>

      {/* Detection Specs / Architecture Stats */}
      <div className="p-6 rounded-2xl bg-[var(--background-card)] border border-[var(--border)] space-y-4 shadow-sm">
        <div className="flex items-center gap-2 text-[var(--foreground)] text-sm font-bold uppercase font-mono">
          <Cpu className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
          Model Pipeline Specification
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-[var(--background-muted)] border border-[var(--border)] space-y-1">
            <div className="text-[11px] font-mono text-[var(--foreground-muted)] uppercase">Supervised Classifier</div>
            <div className="text-sm font-bold text-[var(--foreground)]">XGBoost (multi:softprob)</div>
            <div className="text-xs text-emerald-500 dark:text-emerald-400 font-mono">F1-Score: 0.94 on Test</div>
          </div>

          <div className="p-4 rounded-xl bg-[var(--background-muted)] border border-[var(--border)] space-y-1">
            <div className="text-[11px] font-mono text-[var(--foreground-muted)] uppercase">Anomaly Detection</div>
            <div className="text-sm font-bold text-[var(--foreground)]">Isolation Forest (sklearn)</div>
            <div className="text-xs text-emerald-500 dark:text-emerald-400 font-mono">Contamination: 0.08</div>
          </div>

          <div className="p-4 rounded-xl bg-[var(--background-muted)] border border-[var(--border)] space-y-1">
            <div className="text-[11px] font-mono text-[var(--foreground-muted)] uppercase">Explainability Engine</div>
            <div className="text-sm font-bold text-[var(--foreground)]">SHAP TreeExplainer</div>
            <div className="text-xs text-emerald-500 dark:text-emerald-400 font-mono">Top Feature Vectors</div>
          </div>
        </div>
      </div>
    </div>
  );
}
