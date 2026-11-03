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
  CheckCircle,
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

      if (statsRes.status === "fulfilled") {
        setStats(statsRes.value.data);
      }
      if (incidentsRes.status === "fulfilled") {
        setIncidents(incidentsRes.value.data);
      }
      if (sevRes.status === "fulfilled") {
        setSeverityData(
          sevRes.value.data.map((item) => ({
            name: item.severity,
            value: item.count,
          }))
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
        `Detection finished: ${res.data.detection_summary?.alerts_created || 0} alerts, ${res.data.incidents_created || 0} incidents generated.`
      );
      await fetchData();
    } catch {
      setDetectionMsg("Failed to run detection pipeline. Ensure backend is running.");
    } finally {
      setDetecting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">
            SOC Operations Center
          </h1>
          <p className="text-sm text-slate-400 mt-1 font-mono">
            Real-time ML telemetry, threat detection, and AI investigation
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 transition-colors"
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
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs font-mono text-slate-400 uppercase">Ingested Events</div>
            <div className="text-2xl font-bold text-slate-100 mt-1">
              {stats?.total_events.toLocaleString() || "0"}
            </div>
          </div>
          <div className="h-10 w-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Activity className="h-5 w-5" />
          </div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs font-mono text-slate-400 uppercase">Active Alerts</div>
            <div className="text-2xl font-bold text-slate-100 mt-1">
              {stats?.total_alerts.toLocaleString() || "0"}
            </div>
          </div>
          <div className="h-10 w-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <AlertTriangle className="h-5 w-5" />
          </div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs font-mono text-slate-400 uppercase">Open Incidents</div>
            <div className="text-2xl font-bold text-slate-100 mt-1">
              {stats?.open_incidents || "0"}
            </div>
          </div>
          <div className="h-10 w-10 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
            <ShieldAlert className="h-5 w-5" />
          </div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs font-mono text-slate-400 uppercase">Critical Detections</div>
            <div className="text-2xl font-bold text-red-400 mt-1">
              {stats?.critical_alerts || "0"}
            </div>
          </div>
          <div className="h-10 w-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
            <AlertOctagon className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Main Grid: Severity Chart & Recent Incidents */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Severity Distribution */}
        <div className="p-6 rounded-xl bg-slate-900/40 border border-slate-800">
          <h2 className="text-sm font-bold text-slate-200 tracking-wide mb-1 uppercase font-mono">
            Incident Severity
          </h2>
          <p className="text-xs text-slate-400 mb-4">Proportion by risk rating</p>
          <SeverityChart data={severityData} />

          <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-500"></span>
              <span className="text-slate-400">Critical</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-orange-500"></span>
              <span className="text-slate-400">High</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-500"></span>
              <span className="text-slate-400">Medium</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              <span className="text-slate-400">Low</span>
            </div>
          </div>
        </div>

        {/* Priority Incidents */}
        <div className="lg:col-span-2 p-6 rounded-xl bg-slate-900/40 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-200 tracking-wide uppercase font-mono">
                Recent Security Incidents
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Correlated from active network telemetry</p>
            </div>
          </div>

          {incidents.length === 0 ? (
            <div className="p-12 text-center text-slate-500 font-mono text-xs border border-dashed border-slate-800 rounded-lg">
              No incidents created yet. Click "Run ML Detection" or upload demo logs in Events.
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

