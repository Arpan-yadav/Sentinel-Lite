"use client";

import { useEffect, useState, use } from "react";
import { api } from "@/lib/api";
import { Incident, Investigation, Recommendation } from "@/types";
import { formatDateTime, getSeverityColor } from "@/lib/utils";
import { IncidentTimeline } from "@/components/incidents/timeline";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clock,
  FileSearch,
  ListChecks,
  Play,
  Shield,
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
        notes: `Reviewed by analyst on ${new Date().toISOString()}`,
      });
      // Refresh recommendations
      const recRes = await api.get<Recommendation[]>(`/recommendations/incident/${incidentId}`);
      setRecommendations(recRes.data);
    } catch (err) {
      console.error("Action error:", err);
    }
  };

  if (loading || !incident) {
    return (
      <div className="p-12 text-center text-slate-500 font-mono text-sm">
        Loading incident telemetric record...
      </div>
    );
  }

  const sev = getSeverityColor(incident.severity);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border font-mono ${sev.bg} ${sev.text} ${sev.border}`}
              >
                {incident.severity}
              </span>
              <span className="text-xs font-mono text-slate-400">
                STATUS: <span className="uppercase text-slate-200">{incident.status}</span>
              </span>
              <span className="text-xs font-mono text-slate-400">
                ALERTS: <span className="text-slate-200">{incident.alert_count}</span>
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-100">{incident.title}</h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[11px] font-mono text-slate-400 uppercase">Calculated Risk</div>
              <div
                className={`text-2xl font-bold font-mono ${
                  incident.risk_score > 75
                    ? "text-red-400"
                    : incident.risk_score > 50
                    ? "text-amber-400"
                    : "text-emerald-400"
                }`}
              >
                {incident.risk_score}
                <span className="text-xs text-slate-500">/100</span>
              </div>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">{incident.description}</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("ai")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === "ai"
              ? "bg-slate-800 text-emerald-400"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Bot className="h-4 w-4" />
          AI Investigation
        </button>

        <button
          onClick={() => setActiveTab("timeline")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === "timeline"
              ? "bg-slate-800 text-emerald-400"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Clock className="h-4 w-4" />
          Event Timeline ({timelineEvents.length})
        </button>

        <button
          onClick={() => setActiveTab("remediation")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === "remediation"
              ? "bg-slate-800 text-emerald-400"
              : "text-slate-400 hover:text-slate-200"
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
            <div className="p-12 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/20 space-y-4">
              <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
                <Bot className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-200">No AI Investigation Generated Yet</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  Trigger Gemini LLM to correlate evidence citations, model confidence, and generate
                  actionable remediation proposals.
                </p>
              </div>
              <button
                onClick={handleGenerateInvestigation}
                disabled={generating}
                className="px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs inline-flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                {generating ? "Analyzing with Gemini AI..." : "Generate AI Investigation"}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {/* Assessment Box */}
                <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono uppercase font-semibold">
                    <FileSearch className="h-4 w-4" />
                    Objective Assessment
                  </div>
                  <p className="text-sm text-slate-200 leading-relaxed font-sans">
                    {investigation.summary}
                  </p>
                </div>

                {/* Evidence Citations */}
                <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
                  <h3 className="text-xs font-mono uppercase font-semibold text-slate-400">
                    Observed Telemetry Evidence
                  </h3>
                  <ul className="space-y-2">
                    {investigation.evidence?.evidence_summary?.map((ev, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-300 font-mono">
                        <span className="text-emerald-400 font-bold">•</span>
                        <span>{ev}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Uncertainty Box */}
                {investigation.uncertainty && (
                  <div className="p-5 rounded-xl bg-slate-950 border border-amber-900/40 space-y-2">
                    <div className="text-amber-400 text-xs font-mono uppercase font-semibold flex items-center gap-2">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Evidence Boundary & Uncertainty
                    </div>
                    <p className="text-xs text-slate-400 font-mono">{investigation.uncertainty}</p>
                  </div>
                )}
              </div>

              {/* Sidebar: Risk factors */}
              <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
                  <h3 className="text-xs font-mono uppercase font-semibold text-slate-400">
                    Contributing Risk Factors
                  </h3>
                  <div className="space-y-2">
                    {investigation.evidence?.risk_factors?.map((rf, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono"
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
        <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800">
          <IncidentTimeline events={timelineEvents} />
        </div>
      )}

      {/* Tab 3: Recommendations */}
      {activeTab === "remediation" && (
        <div className="space-y-4">
          {recommendations.length === 0 ? (
            <div className="p-12 text-center text-slate-500 font-mono text-xs border border-dashed border-slate-800 rounded-xl">
              No recommendations generated yet. Generate an AI investigation first.
            </div>
          ) : (
            recommendations.map((rec) => (
              <div
                key={rec.id}
                className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold bg-slate-800 text-slate-300">
                      {rec.priority} Priority
                    </span>
                    <span
                      className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded ${
                        rec.status === "approved"
                          ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                          : rec.status === "rejected"
                          ? "bg-red-950 text-red-400 border border-red-800"
                          : "bg-amber-950 text-amber-400 border border-amber-800"
                      }`}
                    >
                      {rec.status}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-200 mt-1">{rec.action}</p>
                </div>

                {rec.status === "pending" && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRecommendationAction(rec.id, true)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                    </button>
                    <button
                      onClick={() => handleRecommendationAction(rec.id, false)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-red-950 hover:text-red-300 text-slate-300 text-xs flex items-center gap-1.5 transition-colors"
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

