"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Incident, Investigation, Recommendation } from "@/types";
import { formatDateTime, getSeverityColor } from "@/lib/utils";
import { IncidentTimeline } from "@/components/incidents/timeline";
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  CheckCircle2,
  Clock,
  Copy,
  FileSearch,
  ListChecks,
  Play,
  ShieldAlert,
  XCircle,
} from "lucide-react";

export default function IncidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const incidentId = resolvedParams.id;

  const [incident, setIncident] = useState<Incident | null>(null);
  const [investigation, setInvestigation] = useState<Investigation | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"ai" | "timeline" | "remediation">("ai");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchIncidentDetails = async () => {
    try {
      setLoading(true);
      const [incRes, timelineRes, recRes] = await Promise.allSettled([
        api.get<Incident>(`/incidents/${incidentId}`),
        api.get<{ timeline: any[] }>(`/incidents/${incidentId}/timeline`),
        api.get<Recommendation[]>(`/recommendations/incident/${incidentId}`),
      ]);

      if (incRes.status === "fulfilled") setIncident(incRes.value.data);
      if (timelineRes.status === "fulfilled") setTimelineEvents(timelineRes.value.data.timeline);
      if (recRes.status === "fulfilled") setRecommendations(recRes.value.data);

      try {
        const invRes = await api.get<Investigation>(`/investigation/${incidentId}`);
        setInvestigation(invRes.data);
      } catch {
        setInvestigation(null);
      }
    } catch (err) {
      console.error("Error loading incident details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidentDetails();
  }, [incidentId]);

  const handleStatusUpdate = async (newStatus: string) => {
    try {
      setUpdatingStatus(true);
      await api.put(`/incidents/${incidentId}`, { status: newStatus });
      setIncident((prev) => (prev ? { ...prev, status: newStatus } : null));
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleGenerateInvestigation = async () => {
    try {
      setGenerating(true);
      const res = await api.post<Investigation>(`/investigation/${incidentId}/generate`);
      setInvestigation(res.data);
      const recRes = await api.get<Recommendation[]>(`/recommendations/incident/${incidentId}`);
      setRecommendations(recRes.data);
    } catch (err) {
      console.error("Failed to generate investigation:", err);
    } finally {
      setGenerating(false);
    }
  };

  const handleRecommendationAction = async (recId: string, approved: boolean) => {
    try {
      const endpoint = approved ? "approve" : "reject";
      await api.post(`/recommendations/${recId}/${endpoint}`, {
        approved,
        notes: `Reviewed by SOC analyst on ${new Date().toISOString()}`,
      });
      const recRes = await api.get<Recommendation[]>(`/recommendations/incident/${incidentId}`);
      setRecommendations(recRes.data);
    } catch (err) {
      console.error("Action error:", err);
    }
  };

  const copyId = () => {
    navigator.clipboard.writeText(incidentId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading || !incident) {
    return (
      <div className="p-12 text-center text-[var(--foreground-muted)] font-mono text-sm">
        Loading incident telemetric record...
      </div>
    );
  }

  const sev = getSeverityColor(incident.severity);

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link
          href="/dashboard/incidents"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--foreground-muted)] hover:text-[var(--foreground)] font-mono transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Security Incidents
        </Link>
      </div>

      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-[var(--background-card)] border border-[var(--border)] space-y-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border font-mono ${sev.bg} ${sev.text} ${sev.border}`}
              >
                {incident.severity}
              </span>
              <span className="text-xs font-mono text-[var(--foreground-muted)]">
                ALERTS: <span className="text-[var(--foreground)] font-semibold">{incident.alert_count}</span>
              </span>
              <button
                onClick={copyId}
                className="text-xs font-mono text-[var(--foreground-muted)] hover:text-[var(--foreground)] flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--background-muted)] transition-colors cursor-pointer"
                title="Copy Incident ID"
              >
                <Copy className="h-3 w-3" />
                {copied ? "COPIED" : incidentId.slice(0, 8) + "..."}
              </button>
            </div>
            <h1 className="text-xl font-bold text-[var(--foreground)]">{incident.title}</h1>
            <p className="text-xs text-[var(--foreground-muted)] leading-relaxed max-w-3xl">
              {incident.description}
            </p>
          </div>

          <div className="flex items-center gap-4 self-start md:self-auto">
            {/* Triage Status Selector */}
            <div className="space-y-1 text-right">
              <div className="text-[10px] font-mono text-[var(--foreground-muted)] uppercase">Status Workflow</div>
              <select
                value={incident.status}
                disabled={updatingStatus}
                onChange={(e) => handleStatusUpdate(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-[var(--background-muted)] border border-[var(--border)] text-xs font-mono uppercase text-[var(--foreground)] focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="new">NEW</option>
                <option value="investigating">INVESTIGATING</option>
                <option value="resolved">RESOLVED</option>
                <option value="closed">CLOSED</option>
              </select>
            </div>

            {/* Risk Gauge */}
            <div className="p-3 rounded-xl bg-[var(--background-muted)]/70 border border-[var(--border)] text-right min-w-[100px]">
              <div className="text-[10px] font-mono text-[var(--foreground-muted)] uppercase">Risk Score</div>
              <div
                className={`text-2xl font-bold font-mono ${
                  incident.risk_score > 75
                    ? "text-red-500 dark:text-red-400"
                    : incident.risk_score > 50
                    ? "text-amber-500 dark:text-amber-400"
                    : "text-emerald-500 dark:text-emerald-400"
                }`}
              >
                {incident.risk_score}
                <span className="text-xs text-[var(--foreground-muted)] font-normal">/100</span>
              </div>
            </div>
          </div>
        </div>

        {/* Timestamps */}
        <div className="pt-3 border-t border-[var(--border)] flex flex-wrap items-center gap-6 text-[11px] font-mono text-[var(--foreground-muted)]">
          <span>Created: {formatDateTime(incident.created_at)}</span>
          {incident.first_seen && <span>First Seen: {formatDateTime(incident.first_seen)}</span>}
          {incident.last_seen && <span>Last Activity: {formatDateTime(incident.last_seen)}</span>}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2">
        <button
          onClick={() => setActiveTab("ai")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold font-mono transition-colors cursor-pointer ${
            activeTab === "ai"
              ? "bg-[var(--background-muted)] text-emerald-600 dark:text-emerald-400 border border-[var(--border)]"
              : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
          }`}
        >
          <Bot className="h-4 w-4" />
          AI Investigation {investigation ? "✓" : ""}
        </button>

        <button
          onClick={() => setActiveTab("timeline")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold font-mono transition-colors cursor-pointer ${
            activeTab === "timeline"
              ? "bg-[var(--background-muted)] text-emerald-600 dark:text-emerald-400 border border-[var(--border)]"
              : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
          }`}
        >
          <Clock className="h-4 w-4" />
          Event Timeline ({timelineEvents.length})
        </button>

        <button
          onClick={() => setActiveTab("remediation")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold font-mono transition-colors cursor-pointer ${
            activeTab === "remediation"
              ? "bg-[var(--background-muted)] text-emerald-600 dark:text-emerald-400 border border-[var(--border)]"
              : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
          }`}
        >
          <ListChecks className="h-4 w-4" />
          Remediation Actions ({recommendations.length})
        </button>
      </div>

      {/* Tab 1: AI Investigation */}
      {activeTab === "ai" && (
        <div className="space-y-6">
          {!investigation ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--background-card)] space-y-4">
              <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <Bot className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--foreground)]">No AI Investigation Report Generated Yet</h3>
                <p className="text-xs text-[var(--foreground-muted)] mt-1 max-w-md mx-auto">
                  Trigger the Gemini LLM Reasoning Engine to analyze telemetry evidence, identify MITRE ATT&CK techniques, and generate remediation proposals.
                </p>
              </div>
              <button
                onClick={handleGenerateInvestigation}
                disabled={generating}
                className="px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs inline-flex items-center gap-2 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                {generating ? "Synthesizing with Gemini AI..." : "Generate AI Investigation"}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {/* Objective Assessment */}
                <div className="p-6 rounded-2xl bg-[var(--background-card)] border border-[var(--border)] space-y-3 shadow-xs">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-mono uppercase font-semibold">
                    <FileSearch className="h-4 w-4" />
                    Objective Assessment & Root Cause
                  </div>
                  <p className="text-sm text-[var(--foreground)] leading-relaxed font-sans">
                    {investigation.summary}
                  </p>
                </div>

                {/* Evidence Citations */}
                <div className="p-6 rounded-2xl bg-[var(--background-card)] border border-[var(--border)] space-y-3 shadow-xs">
                  <h3 className="text-xs font-mono uppercase font-semibold text-[var(--foreground-muted)]">
                    Observed Telemetry Evidence
                  </h3>
                  <ul className="space-y-2">
                    {investigation.evidence?.evidence_summary?.map((ev, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-[var(--foreground)] font-mono">
                        <span className="text-emerald-500 font-bold">•</span>
                        <span>{ev}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Uncertainty Box */}
                {investigation.uncertainty && (
                  <div className="p-5 rounded-xl bg-[var(--background-muted)] border border-amber-500/30 space-y-2">
                    <div className="text-amber-500 text-xs font-mono uppercase font-semibold flex items-center gap-2">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Evidence Boundary & Model Uncertainty
                    </div>
                    <p className="text-xs text-[var(--foreground-muted)] font-mono">{investigation.uncertainty}</p>
                  </div>
                )}
              </div>

              {/* Sidebar: Risk factors */}
              <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-[var(--background-card)] border border-[var(--border)] space-y-4 shadow-xs">
                  <h3 className="text-xs font-mono uppercase font-semibold text-[var(--foreground-muted)]">
                    Contributing Risk Factors
                  </h3>
                  <div className="space-y-2">
                    {investigation.evidence?.risk_factors?.map((rf, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-lg bg-[var(--background-muted)] border border-[var(--border)] text-xs text-[var(--foreground)] font-mono"
                      >
                        {rf}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Timeline */}
      {activeTab === "timeline" && (
        <div className="p-6 rounded-2xl bg-[var(--background-card)] border border-[var(--border)] shadow-xs">
          <IncidentTimeline events={timelineEvents} />
        </div>
      )}

      {/* Tab 3: Recommendations */}
      {activeTab === "remediation" && (
        <div className="space-y-4">
          {recommendations.length === 0 ? (
            <div className="p-12 text-center text-[var(--foreground-muted)] font-mono text-xs border border-dashed border-[var(--border)] rounded-2xl">
              No recommendations generated yet. Click &ldquo;Generate AI Investigation&rdquo; on the AI Investigation tab.
            </div>
          ) : (
            recommendations.map((rec) => (
              <div
                key={rec.id}
                className="p-5 rounded-2xl bg-[var(--background-card)] border border-[var(--border)] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold bg-[var(--background-muted)] text-[var(--foreground)] border border-[var(--border)]">
                      {rec.priority} Priority
                    </span>
                    <span
                      className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
                        rec.status === "approved"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          : rec.status === "rejected"
                          ? "bg-red-500/10 text-red-500 border-red-500/20"
                          : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                      }`}
                    >
                      {rec.status}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-[var(--foreground)] mt-1">{rec.action}</p>
                </div>

                {rec.status === "pending" && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRecommendationAction(rec.id, true)}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Approve Action
                    </button>
                    <button
                      onClick={() => handleRecommendationAction(rec.id, false)}
                      className="px-3.5 py-1.5 rounded-lg bg-[var(--background-muted)] hover:bg-red-500/10 hover:text-red-500 text-[var(--foreground-muted)] text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-[var(--border)]"
                    >
                      <XCircle className="h-3.5 w-3.5" /> Reject
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
