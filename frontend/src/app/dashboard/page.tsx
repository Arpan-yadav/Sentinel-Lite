"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { DashboardStats, Incident } from "@/types";
import { IncidentCard } from "@/components/incidents/incident-card";
import { SeverityChart } from "@/components/charts/severity-chart";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Database,
  Play,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  Trash2,
  Zap,
} from "lucide-react";
import { RetentionModal } from "@/components/events/retention-modal";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [severityData, setSeverityData] = useState<{ name: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [detectionMsg, setDetectionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [retentionModalOpen, setRetentionModalOpen] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchData = useCallback(async () => {
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
      setLastRefreshed(new Date());
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleRunDetection = async () => {
    try {
      setDetecting(true);
      setDetectionMsg(null);
      const res = await api.post("/detection/run?limit=1000&auto_correlate=true");
      const analyzed = res.data.detection_summary?.events_analyzed ?? 0;
      const alerts = res.data.detection_summary?.alerts_created ?? 0;
      const incs = res.data.incidents_created ?? 0;
      setDetectionMsg({
        type: "success",
        text: `Detection Pipeline Complete: Processed ${analyzed} telemetry events, identified ${alerts} anomalous alerts, and correlated ${incs} new security incidents.`,
      });
      await fetchData();
    } catch {
      setDetectionMsg({
        type: "error",
        text: "Pipeline execution encountered an issue. Verify backend connectivity and model availability.",
      });
    } finally {
      setDetecting(false);
    }
  };

  const handleSeedAuthentic = async (reset = false) => {
    try {
      setSeeding(true);
      setDetectionMsg(null);
      const res = await api.post(`/events/seed-authentic${reset ? "?reset=true" : ""}`);
      if (res.data.status === "already_loaded") {
        setDetectionMsg({
          type: "success",
          text: res.data.message || "Benchmark dataset (12,500 events) is already loaded. Duplicates prevented.",
        });
      } else {
        const ingested = res.data.events_ingested ?? 0;
        const incs = res.data.incidents_created ?? 0;
        setDetectionMsg({
          type: "success",
          text: reset
            ? `Baseline Reset Complete: Database restored to ${ingested.toLocaleString()} authentic benchmark events and ${incs} correlated incidents.`
            : `Benchmark Loaded: Ingested ${ingested.toLocaleString()} authentic events and correlated ${incs} active security incidents!`,
        });
      }
      await fetchData();
    } catch {
      setDetectionMsg({
        type: "error",
        text: "Could not trigger benchmark seeding. Please verify backend connectivity.",
      });
    } finally {
      setSeeding(false);
    }
  };

  const kpis = [
    {
      label: "Ingested Events",
      value: stats?.total_events?.toLocaleString() ?? "0",
      subtext: "Raw security packet logs",
      icon: Activity,
      color: "text-blue-500 dark:text-blue-400",
      bg: "bg-blue-500/10 border-blue-500/20",
    },
    {
      label: "Active Alerts",
      value: stats?.total_alerts?.toLocaleString() ?? "0",
      subtext: "ML flagged anomalies",
      icon: AlertTriangle,
      color: "text-amber-500 dark:text-amber-400",
      bg: "bg-amber-500/10 border-amber-500/20",
    },
    {
      label: "Open Incidents",
      value: String(stats?.open_incidents ?? "0"),
      subtext: "Prioritized attack clusters",
      icon: ShieldAlert,
      color: "text-orange-500 dark:text-orange-400",
      bg: "bg-orange-500/10 border-orange-500/20",
    },
    {
      label: "Critical Detections",
      value: String(stats?.critical_alerts ?? "0"),
      subtext: "Peak risk factor > 75",
      icon: AlertOctagon,
      color: "text-red-500 dark:text-red-400",
      bg: "bg-red-500/10 border-red-500/20",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Top Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-(--border)">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-(--foreground)">
              SOC Operations Center
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              LIVE TELEMETRY
            </span>
          </div>
          <p className="text-xs text-(--foreground-muted) mt-1 font-mono">
            Autonomous threat detection · XGBoost + Isolation Forest · Gemini AI response
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setRetentionModalOpen(true)}
            className="px-3.5 py-2.5 rounded-lg bg-(--background-card) border border-red-500/30 hover:border-red-500 text-red-400 font-mono font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
            title="Manage 7-day log retention, benign purge, and verified deletion"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Retention & Delete
          </button>

          {stats && stats.total_events > 12500 && (
            <button
              onClick={() => handleSeedAuthentic(true)}
              disabled={seeding}
              className="px-3 py-2 rounded-lg bg-(--background-card) border border-amber-500/30 hover:border-amber-500 text-amber-400 font-mono text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              title="Reset database back to the standard 12,500 baseline"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset to 12.5k Baseline
            </button>
          )}

          <button
            onClick={() => handleSeedAuthentic(false)}
            disabled={seeding}
            className="px-3.5 py-2.5 rounded-lg bg-(--background-card) border border-emerald-500/40 hover:border-emerald-500 text-emerald-400 font-mono font-bold text-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            title="Ingest another batch of authentic CICIDS2017 events to simulate continuous live sensor streaming"
          >
            <Database className={`h-3.5 w-3.5 ${seeding ? "animate-spin" : ""}`} />
            {seeding ? "Ingesting..." : "⚡ Ingest +12.5k Events"}
          </button>

          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2.5 rounded-lg bg-(--background-card) border border-(--border) hover:border-(--foreground-muted) text-(--foreground-muted) transition-colors cursor-pointer"
            title={`Refresh telemetry (Last: ${lastRefreshed.toLocaleTimeString()})`}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={handleRunDetection}
            disabled={detecting}
            className="px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center gap-2 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            {detecting ? "Running ML Pipeline..." : "Run ML Detection"}
          </button>
        </div>
      </div>

      {/* Detection Feedback Notification */}
      {detectionMsg && (
        <div
          className={`p-4 rounded-xl text-xs font-mono flex items-center justify-between transition-all ${
            detectionMsg.type === "success"
              ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
              : "bg-red-500/10 border border-red-500/30 text-red-500 dark:text-red-400"
          }`}
        >
          <div className="flex items-center gap-2">
            {detectionMsg.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0" />
            )}
            <span>{detectionMsg.text}</span>
          </div>
          <button
            onClick={() => setDetectionMsg(null)}
            className="text-[10px] uppercase font-bold hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(({ label, value, subtext, icon: Icon, color, bg }) => (
          <div
            key={label}
            className="p-5 rounded-2xl bg-(--background-card) border border-(--border) flex flex-col justify-between hover:border-(--border-strong) transition-all shadow-xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-(--foreground-muted) uppercase tracking-wider">
                {label}
              </span>
              <div className={`h-9 w-9 rounded-lg border flex items-center justify-center ${bg} ${color}`}>
                <Icon className="h-4.5 w-4.5" />
              </div>
            </div>
            <div className="mt-4">
              <div className={`text-2xl font-bold font-mono tracking-tight ${color}`}>{value}</div>
              <div className="text-[11px] text-(--foreground-muted) mt-1 font-mono">{subtext}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid: Severity Chart & Recent Incidents */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Severity Chart Column */}
        <div className="p-6 rounded-2xl bg-(--background-card) border border-(--border) shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-xs font-bold text-(--foreground) tracking-wide uppercase font-mono">
                Incident Severity Breakdown
              </h2>
              <span className="text-[10px] font-mono text-(--foreground-muted)">Live Ratio</span>
            </div>
            <p className="text-xs text-(--foreground-muted) mb-4">
              Multi-factor risk distribution of all active attacks
            </p>
            <SeverityChart data={severityData} />
          </div>

          <div className="mt-4 pt-4 border-t border-(--border) grid grid-cols-2 gap-2 text-xs font-mono">
            {[
              { color: "bg-red-500", label: "Critical", score: "Risk > 75" },
              { color: "bg-orange-500", label: "High", score: "Risk 60-75" },
              { color: "bg-amber-500", label: "Medium", score: "Risk 35-60" },
              { color: "bg-emerald-500", label: "Low", score: "Risk < 35" },
            ].map(({ color, label, score }) => (
              <div key={label} className="flex items-center justify-between p-2 rounded-lg bg-(--background-muted)/50">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${color}`} />
                  <span className="text-(--foreground) font-medium text-[11px]">{label}</span>
                </div>
                <span className="text-[10px] text-(--foreground-muted)">{score}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Incidents Column */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-(--background-card) border border-(--border) shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xs font-bold text-(--foreground) tracking-wide uppercase font-mono">
                  Recent Correlated Incidents
                </h2>
                <p className="text-xs text-(--foreground-muted) mt-0.5">
                  Automated clusters aggregated from raw event telemetry
                </p>
              </div>

              <Link
                href="/dashboard/incidents"
                className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-mono font-semibold"
              >
                View All Incidents <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {loading && incidents.length === 0 ? (
              <div className="p-12 text-center text-(--foreground-muted) font-mono text-xs border border-dashed border-(--border) rounded-xl">
                Loading live incident telemetry...
              </div>
            ) : incidents.length === 0 ? (
              <div className="p-8 text-center text-(--foreground-muted) font-mono text-xs border border-dashed border-(--border) rounded-xl space-y-3">
                <p>No incidents detected in the active database.</p>
                <button
                  onClick={() => handleSeedAuthentic(false)}
                  disabled={seeding}
                  className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs inline-flex items-center gap-2 transition-all cursor-pointer shadow-sm"
                >
                  <Database className={`h-3.5 w-3.5 ${seeding ? "animate-spin" : ""}`} />
                  {seeding ? "Ingesting Benchmark Telemetry..." : "⚡ Ingest Authentic Benchmark (12.5k Events)"}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {incidents.map((inc) => (
                  <IncidentCard key={inc.id} incident={inc} />
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-(--border) flex items-center justify-between text-[11px] font-mono text-(--foreground-muted)">
            <span className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-emerald-500" />
              Real-time heuristic clustering active
            </span>
            <span>Refreshed: {lastRefreshed.toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      <RetentionModal
        isOpen={retentionModalOpen}
        onClose={() => setRetentionModalOpen(false)}
        onSuccess={fetchData}
      />
    </div>
  );
}
