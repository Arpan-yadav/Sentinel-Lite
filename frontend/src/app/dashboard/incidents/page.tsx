"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Incident, IncidentStatus } from "@/types";
import { formatDateTime, getSeverityColor } from "@/lib/utils";
import {
  ArrowUpRight,
  Download,
  RefreshCw,
  Search,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const pageSize = 20;

  const fetchIncidents = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (severityFilter) params.append("severity", severityFilter);
      if (statusFilter) params.append("status", statusFilter);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());
      params.append("page", String(page));
      params.append("page_size", String(pageSize));

      const res = await api.get<Incident[]>(`/incidents/?${params.toString()}`);
      setIncidents(res.data);
    } catch (err) {
      console.error("Failed to fetch incidents:", err);
    } finally {
      setLoading(false);
    }
  }, [severityFilter, statusFilter, searchQuery, page]);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  const handleStatusChange = async (incidentId: string, newStatus: IncidentStatus) => {
    try {
      setUpdatingId(incidentId);
      await api.put(`/incidents/${incidentId}`, { status: newStatus });
      setIncidents((prev) =>
        prev.map((inc) => (inc.id === incidentId ? { ...inc, status: newStatus } : inc))
      );
      setActionNotice(`Incident status updated to "${newStatus.toUpperCase()}"`);
      setTimeout(() => setActionNotice(null), 3500);
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleExportCSV = () => {
    if (incidents.length === 0) return;
    const headers = ["ID", "Title", "Severity", "Risk Score", "Alerts", "Status", "Created At"];
    const rows = incidents.map((inc) => [
      inc.id,
      `"${inc.title.replace(/"/g, '""')}"`,
      inc.severity,
      inc.risk_score,
      inc.alert_count,
      inc.status,
      inc.created_at,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sentinellite_incidents_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-(--border)">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-(--foreground)">
              Security Incidents
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400 font-semibold">
              {incidents.length} Records
            </span>
          </div>
          <p className="text-sm text-(--foreground-muted) font-mono mt-1">
            Correlated attack clusters requiring analyst triage, containment & response
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            disabled={incidents.length === 0}
            className="px-3.5 py-2 rounded-lg bg-(--background-card) border border-(--border) hover:border-(--foreground-muted) text-(--foreground) text-xs font-mono flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            title="Download CSV report"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>

          <button
            onClick={fetchIncidents}
            disabled={loading}
            className="p-2.5 rounded-lg bg-(--background-card) border border-(--border) hover:border-(--foreground-muted) text-(--foreground-muted) transition-colors cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {actionNotice && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-mono flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 rounded-2xl bg-(--background-card) border border-(--border) shadow-xs">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-(--foreground-muted)" />
          <input
            type="text"
            placeholder="Search by incident title, IP or pattern..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-(--background-muted) border border-(--border) focus:border-emerald-500 focus:outline-none text-xs text-(--foreground) font-mono transition-colors"
          />
        </div>

        <div>
          <select
            value={severityFilter}
            onChange={(e) => {
              setSeverityFilter(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 rounded-lg bg-(--background-muted) border border-(--border) text-xs text-(--foreground) font-mono focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="">All Severities</option>
            <option value="critical">Critical (Risk &gt; 75)</option>
            <option value="high">High (Risk 60-75)</option>
            <option value="medium">Medium (Risk 35-60)</option>
            <option value="low">Low (Risk &lt; 35)</option>
          </select>
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 rounded-lg bg-(--background-muted) border border-(--border) text-xs text-(--foreground) font-mono focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="new">New</option>
            <option value="investigating">Investigating</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      {/* Incidents Table */}
      <div className="rounded-2xl border border-(--border) bg-(--background-card) overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-(--background-muted) border-b border-(--border) text-(--foreground-muted) uppercase font-mono">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Incident Title</th>
                <th className="px-5 py-3.5 font-semibold">Severity</th>
                <th className="px-5 py-3.5 font-semibold">Risk Score</th>
                <th className="px-5 py-3.5 font-semibold">Alert Count</th>
                <th className="px-5 py-3.5 font-semibold">Triage Status</th>
                <th className="px-5 py-3.5 font-semibold">Detected At</th>
                <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--border) text-(--foreground) font-sans">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-(--foreground-muted) font-mono">
                    Loading security incident records...
                  </td>
                </tr>
              ) : incidents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-(--foreground-muted) font-mono">
                    <ShieldAlert className="h-8 w-8 mx-auto mb-2 text-(--foreground-muted) opacity-50" />
                    No security incidents found matching filter criteria.
                  </td>
                </tr>
              ) : (
                incidents.map((inc) => {
                  const sev = getSeverityColor(inc.severity);
                  return (
                    <tr
                      key={inc.id}
                      className="hover:bg-(--background-muted)/50 transition-colors group"
                    >
                      <td className="px-5 py-4 font-semibold text-(--foreground) max-w-sm">
                        <div className="truncate font-mono">{inc.title}</div>
                        <div className="text-[11px] text-(--foreground-muted) font-sans truncate mt-0.5">
                          {inc.description}
                        </div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border font-mono ${sev.bg} ${sev.text} ${sev.border}`}
                        >
                          {inc.severity}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-mono font-bold whitespace-nowrap">
                        <span
                          className={
                            inc.risk_score > 75
                              ? "text-red-500 dark:text-red-400"
                              : inc.risk_score > 50
                              ? "text-amber-500 dark:text-amber-400"
                              : "text-emerald-500 dark:text-emerald-400"
                          }
                        >
                          {inc.risk_score}
                        </span>
                        <span className="text-(--foreground-muted) font-normal text-[11px]">/100</span>
                      </td>
                      <td className="px-5 py-4 font-mono text-(--foreground-muted) whitespace-nowrap">
                        {inc.alert_count} alerts
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <select
                          value={inc.status}
                          disabled={updatingId === inc.id}
                          onChange={(e) => handleStatusChange(inc.id, e.target.value as IncidentStatus)}
                          className="px-2 py-1 rounded-md bg-(--background-muted) border border-(--border) text-[11px] font-mono uppercase focus:outline-none focus:border-emerald-500 cursor-pointer transition-colors"
                        >
                          <option value="new">NEW</option>
                          <option value="investigating">INVESTIGATING</option>
                          <option value="resolved">RESOLVED</option>
                          <option value="closed">CLOSED</option>
                        </select>
                      </td>
                      <td className="px-5 py-4 font-mono text-(--foreground-muted) text-[11px] whitespace-nowrap">
                        {formatDateTime(inc.created_at)}
                      </td>
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <Link
                          href={`/dashboard/incidents/${inc.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 text-xs font-semibold transition-all shadow-xs"
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

        {/* Pagination Bar */}
        <div className="px-5 py-3 border-t border-(--border) bg-(--background-muted)/30 flex items-center justify-between text-xs font-mono text-(--foreground-muted)">
          <div>
            Showing Page <span className="font-semibold text-(--foreground)">{page}</span> ({incidents.length} on page)
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-md border border-(--border) bg-(--background-card) hover:text-(--foreground) disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={incidents.length < pageSize}
              className="p-1.5 rounded-md border border-(--border) bg-(--background-card) hover:text-(--foreground) disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
