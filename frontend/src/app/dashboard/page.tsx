"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { DashboardStats, Incident } from "@/types";
import { IncidentCard } from "@/components/incidents/incident-card";
import { SeverityChart } from "@/components/charts/severity-chart";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  Play,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [severityData, setSeverityData] = useState<{ name: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);
  const [detectionMsg, setDetectionMsg] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, incidentsRes, sevRes] = await Promise.allSettled([
        api.get<DashboardStats>("/analytics/dashboard-stats"),
        api.get<Incident[]>("/incidents/?page=1&page_size=6"),
        api.get<{ severity: string; count: number }[]>("/analytics/severity-distribution"),
      ]);

      if (statsRes.status === "fulfilled") setStats(statsRes.value.data);
      if (incidentsRes.status === "fulfilled") setIncidents(incidentsRes.value.data);
      if (sevRes.status === "fulfilled") {
        setSeverityData(
          sevRes.value.data.map((item) => ({ name: item.severity, value: item.count }))
        );
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRunDetection = async () => {
    try {
      setDetecting(true);
      setDetectionMsg("");
      const res = await api.post("/detection/run?limit=1000&auto_correlate=true");
      setDetectionMsg(
        `✓ Detection finished: ${res.data.detection_summary?.alerts_created || 0} alerts, ${res.data.incidents_created || 0} incidents generated.`
      );
      await fetchData();
    } catch {
      setDetectionMsg("⚠ Failed to run detection pipeline. Ensure backend is running.");
    } finally {
      setDetecting(false);
    }
  };

  const kpis = [
    {
      label: "Ingested Events",
      value: stats?.total_events?.toLocaleString() ?? "0",
      icon: Activity,
      color: "text-blue-400",
      bg: "bg-blue-500/10 border-blue-500/20",
    },
    {
      label: "Active Alerts",
      value: stats?.total_alerts?.toLocaleString() ?? "0",
      icon: AlertTriangle,
      color: "text-amber-400",
      bg: "bg-amber-500/10 border-amber-500/20",
    },
    {
      label: "Open Incidents",
      value: String(stats?.open_incidents ?? "0"),
      icon: ShieldAlert,
      color: "text-orange-400",
      bg: "bg-orange-500/10 border-orange-500/20",
    },
    {
      label: "Critical Detections",
      value: String(stats?.critical_alerts ?? "0"),
      icon: AlertOctagon,
      color: "text-red-400",
      bg: "bg-red-500/10 border-red-500/20",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[var(--border)]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
            SOC Operations Center
          </h1>
          <p className="text-sm text-[var(--foreground-muted)] mt-1 font-mono">
            Real-time ML telemetry · threat detection · AI investigation
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="p-2.5 rounded-lg bg-[var(--background-muted)] border border-[var(--border)] hover:border-[var(--foreground-muted)] text-[var(--foreground-muted)] transition-colors"
            title="Refresh telemetry"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={handleRunDetection}
            disabled={detecting}
            className="px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            {detecting ? "Running ML Models..." : "Run ML Detection"}
          </button>
        </div>
      </div>

      {detectionMsg && (
        <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs font-mono">
          {detectionMsg}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(({ label, value, icon: Icon, color, bg }) => (
          <div
            key={label}
            className="p-5 rounded-xl bg-[var(--background-card)] border border-[var(--border)] flex items-center justify-between hover:border-[var(--foreground-muted)] transition-colors"
          >
            <div>
              <div className="text-xs font-mono text-[var(--foreground-muted)] uppercase">{label}</div>
              <div className={`text-2xl font-bold mt-1 ${color}`}>{value}</div>
            </div>
            <div className={`h-10 w-10 rounded-lg border flex items-center justify-center ${bg} ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Severity Chart */}
        <div className="p-6 rounded-xl bg-[var(--background-card)] border border-[var(--border)]">
          <h2 className="text-sm font-bold text-[var(--foreground)] tracking-wide mb-1 uppercase font-mono">
            Incident Severity
          </h2>
          <p className="text-xs text-[var(--foreground-muted)] mb-4">Proportion by risk rating</p>
          <SeverityChart data={severityData} />

          <div className="mt-4 pt-4 border-t border-[var(--border)] grid grid-cols-2 gap-2 text-xs font-mono">
            {[
              { color: "bg-red-500", label: "Critical" },
              { color: "bg-orange-500", label: "High" },
              { color: "bg-amber-500", label: "Medium" },
              { color: "bg-emerald-500", label: "Low" },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${color}`} />
                <span className="text-[var(--foreground-muted)]">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Incidents */}
        <div className="lg:col-span-2 p-6 rounded-xl bg-[var(--background-card)] border border-[var(--border)]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-[var(--foreground)] tracking-wide uppercase font-mono">
                Recent Security Incidents
              </h2>
              <p className="text-xs text-[var(--foreground-muted)] mt-0.5">
                Correlated from active network telemetry
              </p>
            </div>
          </div>

          {incidents.length === 0 ? (
            <div className="p-12 text-center text-[var(--foreground-muted)] font-mono text-xs border border-dashed border-[var(--border)] rounded-lg">
              No incidents yet. Click &ldquo;Run ML Detection&rdquo; or upload demo logs in Events.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {incidents.map((inc) => (
                <IncidentCard key={inc.id} incident={inc} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
