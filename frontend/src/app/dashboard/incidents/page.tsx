"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Incident } from "@/types";
import { formatDateTime, getSeverityColor } from "@/lib/utils";
import { ArrowUpRight, RefreshCw } from "lucide-react";

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<string>("");

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const url = severityFilter
        ? `/incidents/?severity=${severityFilter}&page_size=50`
        : "/incidents/?page_size=50";
      const res = await api.get<Incident[]>(url);
      setIncidents(res.data);
    } catch (err) {
      console.error("Failed to fetch incidents:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [severityFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[var(--border)]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
            Security Incidents
          </h1>
          <p className="text-sm text-[var(--foreground-muted)] font-mono mt-1">
            Grouped, prioritized attacks requiring analyst investigation & response
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-[var(--background-card)] border border-[var(--border)] text-xs text-[var(--foreground)] font-mono focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <button
            onClick={fetchIncidents}
            className="p-2.5 rounded-lg bg-[var(--background-card)] border border-[var(--border)] hover:border-[var(--foreground-muted)] text-[var(--foreground-muted)] transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Incidents Table */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--background-card)] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--background-muted)] border-b border-[var(--border)] text-[var(--foreground-muted)] uppercase font-mono">
              <tr>
                <th className="px-5 py-3 font-semibold">Incident Title</th>
                <th className="px-5 py-3 font-semibold">Severity</th>
                <th className="px-5 py-3 font-semibold">Risk Score</th>
                <th className="px-5 py-3 font-semibold">Alert Count</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Created</th>
                <th className="px-5 py-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] text-[var(--foreground)] font-sans">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-[var(--foreground-muted)] font-mono">
                    Loading incident records...
                  </td>
                </tr>
              ) : incidents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-[var(--foreground-muted)] font-mono">
                    No security incidents found matching filter.
                  </td>
                </tr>
              ) : (
                incidents.map((inc) => {
                  const sev = getSeverityColor(inc.severity);
                  return (
                    <tr key={inc.id} className="hover:bg-[var(--background-muted)]/50 transition-colors">
                      <td className="px-5 py-4 font-semibold text-[var(--foreground)] max-w-xs truncate">
                        {inc.title}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border font-mono ${sev.bg} ${sev.text} ${sev.border}`}
                        >
                          {inc.severity}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-mono font-bold">
                        <span
                          className={
                            inc.risk_score > 75
                              ? "text-red-400"
                              : inc.risk_score > 50
                              ? "text-amber-400"
                              : "text-emerald-400"
                          }
                        >
                          {inc.risk_score}
                        </span>
                        <span className="text-[var(--foreground-muted)] font-normal">/100</span>
                      </td>
                      <td className="px-5 py-4 font-mono text-[var(--foreground-muted)]">
                        {inc.alert_count} alerts
                      </td>
                      <td className="px-5 py-4">
                        <span className="px-2 py-0.5 rounded bg-[var(--background-muted)] text-[var(--foreground-muted)] text-[10px] font-mono uppercase">
                          {inc.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-mono text-[var(--foreground-muted)] text-[11px]">
                        {formatDateTime(inc.created_at)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/dashboard/incidents/${inc.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 dark:text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 text-xs font-semibold transition-all"
                        >
                          Investigate <ArrowUpRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
