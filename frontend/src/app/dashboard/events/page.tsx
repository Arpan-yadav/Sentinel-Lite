"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { SecurityEvent } from "@/types";
import { formatDateTime } from "@/lib/utils";
import {
  Upload,
  Search,
  Filter,
  Download,
  Activity,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Trash2,
  RotateCcw,
} from "lucide-react";
import { RetentionModal } from "@/components/events/retention-modal";

export default function EventsPage() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [searchIp, setSearchIp] = useState("");
  const [protocolFilter, setProtocolFilter] = useState("");
  const [page, setPage] = useState(1);
  const [retentionModalOpen, setRetentionModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deletingBatch, setDeletingBatch] = useState(false);

  const pageSize = 50;

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchIp.trim()) params.append("source_ip", searchIp.trim());
      if (protocolFilter) params.append("protocol", protocolFilter);
      params.append("page", String(page));
      params.append("page_size", String(pageSize));

      const res = await api.get<SecurityEvent[]>(`/events/?${params.toString()}`);
      setEvents(res.data);
    } catch (err) {
      console.error("Failed to fetch events:", err);
    } finally {
      setLoading(false);
    }
  }, [searchIp, protocolFilter, page]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const toggleSelectAll = () => {
    if (selectedIds.size === events.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(events.map((e) => e.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to permanently delete ${selectedIds.size} selected event record(s)?`)) return;

    try {
      setDeletingBatch(true);
      const res = await api.post("/events/batch-delete", {
        event_ids: Array.from(selectedIds),
      });
      setUploadMsg({
        type: "success",
        text: `Deleted ${res.data.deleted_count} selected event records.`,
      });
      setSelectedIds(new Set());
      await fetchEvents();
    } catch {
      setUploadMsg({
        type: "error",
        text: "Failed to delete selected events.",
      });
    } finally {
      setDeletingBatch(false);
    }
  };

  const handleDeleteSingle = async (id: string) => {
    try {
      await api.delete(`/events/${id}`);
      setUploadMsg({
        type: "success",
        text: "Event deleted successfully.",
      });
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      await fetchEvents();
    } catch {
      setUploadMsg({
        type: "error",
        text: "Failed to delete event.",
      });
    }
  };

  const handleDeleteAllEvents = async () => {
    if (!confirm("Are you sure you want to delete ALL security event telemetry and reset the database?")) return;

    try {
      setDeletingBatch(true);
      const res = await api.delete("/events/all");
      setUploadMsg({
        type: "success",
        text: `Database Reset: Deleted all ${res.data.deleted_count} security events.`,
      });
      setSelectedIds(new Set());
      await fetchEvents();
    } catch {
      setUploadMsg({
        type: "error",
        text: "Failed to delete all events.",
      });
    } finally {
      setDeletingBatch(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploading(true);
      setUploadMsg(null);
      const res = await api.post("/events/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUploadMsg({
        type: "success",
        text: `Log Ingestion Complete: Successfully parsed & stored ${res.data.events_ingested} event records from ${file.name}!`,
      });
      await fetchEvents();
    } catch {
      setUploadMsg({
        type: "error",
        text: "Upload failed. Verify CSV format matches required telemetry headers (timestamp, source_ip, dest_ip, event_type).",
      });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleSeedAuthentic = async (reset = false) => {
    try {
      setUploading(true);
      setUploadMsg(null);
      const res = await api.post(`/events/seed-authentic${reset ? "?reset=true" : ""}`);
      if (res.data.status === "already_loaded") {
        setUploadMsg({
          type: "success",
          text: res.data.message || "Benchmark dataset (12,500 events) is already loaded. Duplicates prevented.",
        });
      } else {
        setUploadMsg({
          type: "success",
          text: `Benchmark Loaded: Ingested ${res.data.events_ingested.toLocaleString()} authentic events and correlated ${res.data.incidents_created} incidents!`,
        });
      }
      setSelectedIds(new Set());
      await fetchEvents();
    } catch {
      setUploadMsg({
        type: "error",
        text: "Could not seed authentic benchmark dataset. Please verify backend status.",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleExportCSV = () => {
    if (events.length === 0) return;
    const headers = ["ID", "Timestamp", "Source IP", "Dest IP", "Source Port", "Dest Port", "Protocol", "Event Type"];
    const rows = events.map((ev) => [
      ev.id,
      ev.timestamp,
      ev.source_ip,
      ev.dest_ip,
      ev.source_port,
      ev.dest_port,
      ev.protocol,
      ev.event_type,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sentinellite_events_${Date.now()}.csv`);
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
              Security Event Telemetry
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 font-semibold">
              {events.length} Events on Page
            </span>
          </div>
          <p className="text-sm text-(--foreground-muted) font-mono mt-1">
            Raw ingested packet flows, network session traces & endpoint authentication logs
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleSeedAuthentic(true)}
            disabled={uploading}
            className="px-3.5 py-2.5 rounded-lg bg-(--background-card) border border-emerald-500/40 hover:border-emerald-500 text-emerald-400 font-mono font-bold text-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            title="Clean reset: restores exactly 12,500 pristine benchmark events with zero duplicates"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${uploading ? "animate-spin" : ""}`} />
            {uploading ? "Resetting..." : "⚡ Reset 12.5k Baseline"}
          </button>

          <button
            onClick={handleDeleteAllEvents}
            disabled={deletingBatch}
            className="px-3.5 py-2.5 rounded-lg bg-(--background-card) border border-red-500/30 hover:border-red-500 text-red-400 font-mono font-bold text-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            title="Purge all security event records and telemetry from database"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Purge All
          </button>

          <button
            onClick={() => setRetentionModalOpen(true)}
            className="px-3.5 py-2.5 rounded-lg bg-(--background-card) border border-(--border) hover:border-(--foreground-muted) text-(--foreground) font-mono font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
            title="Manage 7-day log retention, benign purge, and verified deletion"
          >
            Retention Policy
          </button>

          <button
            onClick={handleExportCSV}
            disabled={events.length === 0}
            className="px-3.5 py-2 rounded-lg bg-(--background-card) border border-(--border) hover:border-(--foreground-muted) text-(--foreground) text-xs font-mono flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            title="Download CSV report"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>

          <label className="cursor-pointer px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center gap-2 transition-all shadow-sm">
            <Upload className="h-4 w-4" />
            {uploading ? "Ingesting..." : "Ingest Telemetry Logs"}
            <input
              type="file"
              accept=".csv,.log,.txt"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {uploadMsg && (
        <div
          className={`p-4 rounded-xl text-xs font-mono flex items-center justify-between transition-all ${
            uploadMsg.type === "success"
              ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
              : "bg-red-500/10 border border-red-500/30 text-red-500 dark:text-red-400"
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{uploadMsg.text}</span>
          </div>
          <button
            onClick={() => setUploadMsg(null)}
            className="text-[10px] uppercase font-bold hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 rounded-2xl bg-(--background-card) border border-(--border) shadow-xs">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-(--foreground-muted)" />
          <input
            type="text"
            placeholder="Filter by Source IP (e.g. 45.138.16.7 or 10.0.0.25)..."
            value={searchIp}
            onChange={(e) => {
              setSearchIp(e.target.value);
              setPage(1);
            }}
            onKeyDown={(e) => e.key === "Enter" && fetchEvents()}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-(--background-muted) border border-(--border) focus:border-emerald-500 focus:outline-none text-xs text-(--foreground) font-mono transition-colors"
          />
        </div>

        <div>
          <select
            value={protocolFilter}
            onChange={(e) => {
              setProtocolFilter(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 rounded-lg bg-(--background-muted) border border-(--border) text-xs text-(--foreground) font-mono focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="">All Protocols</option>
            <option value="TCP">TCP</option>
            <option value="UDP">UDP</option>
            <option value="ICMP">ICMP</option>
          </select>
        </div>

        <div>
          <button
            onClick={fetchEvents}
            className="w-full px-4 py-2 rounded-lg bg-(--background-muted) hover:border-(--foreground-muted) border border-(--border) text-(--foreground) text-xs font-mono flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Filter className="h-3.5 w-3.5" />
            Apply Filter
          </button>
        </div>
      </div>

      {/* Selected Records Action Banner */}
      {selectedIds.size > 0 && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-between text-xs font-mono animate-in fade-in duration-150">
          <div className="flex items-center gap-2 text-red-400 font-bold">
            <Trash2 className="h-4 w-4" />
            <span>{selectedIds.size} record(s) selected</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1.5 rounded-lg border border-(--border) text-(--foreground-muted) hover:text-(--foreground) text-xs cursor-pointer"
            >
              Clear Selection
            </button>
            <button
              onClick={handleDeleteSelected}
              disabled={deletingBatch}
              className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {deletingBatch ? "Deleting..." : `Delete Selected (${selectedIds.size})`}
            </button>
          </div>
        </div>
      )}

      {/* Events Table */}
      <div className="rounded-2xl border border-(--border) bg-(--background-card) overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-(--background-muted) border-b border-(--border) text-(--foreground-muted) uppercase">
              <tr>
                <th className="px-4 py-3.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={events.length > 0 && selectedIds.size === events.length}
                    onChange={toggleSelectAll}
                    className="accent-emerald-500 rounded cursor-pointer"
                    title="Select all on this page"
                  />
                </th>
                <th className="px-5 py-3.5 font-semibold">Event Timestamp</th>
                <th className="px-5 py-3.5 font-semibold">Source Vector</th>
                <th className="px-5 py-3.5 font-semibold">Target Destination</th>
                <th className="px-5 py-3.5 font-semibold">Proto / Port</th>
                <th className="px-5 py-3.5 font-semibold">Event Classification</th>
                <th className="px-4 py-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--border) text-(--foreground)">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-(--foreground-muted)">
                    Loading raw security event stream...
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-(--foreground-muted)">
                    <Activity className="h-8 w-8 mx-auto mb-2 text-(--foreground-muted) opacity-50" />
                    No security events found. Ingest logs using the upload button above.
                  </td>
                </tr>
              ) : (
                events.map((ev) => (
                  <tr
                    key={ev.id}
                    className={`hover:bg-(--background-muted)/50 transition-colors ${
                      selectedIds.has(ev.id) ? "bg-red-500/5" : ""
                    }`}
                  >
                    <td className="px-4 py-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(ev.id)}
                        onChange={() => toggleSelectOne(ev.id)}
                        className="accent-emerald-500 rounded cursor-pointer"
                      />
                    </td>
                    <td className="px-5 py-3 text-(--foreground-muted) whitespace-nowrap">
                      {formatDateTime(ev.timestamp)}
                    </td>
                    <td className="px-5 py-3 font-semibold text-(--foreground) whitespace-nowrap">
                      <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{ev.source_ip}</span>
                      {ev.source_port && (
                        <span className="text-(--foreground-muted) font-normal text-[11px]">:{ev.source_port}</span>
                      )}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span className="font-mono">{ev.dest_ip}</span>
                    </td>
                    <td className="px-5 py-3 text-(--foreground-muted) whitespace-nowrap">
                      <span className="px-1.5 py-0.5 rounded bg-(--background-muted) text-[11px] font-semibold">
                        {ev.protocol || "TCP"}
                      </span>{" "}
                      / <span className="font-mono">{ev.dest_port}</span>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold">
                        {ev.event_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleDeleteSingle(ev.id)}
                        className="p-1 rounded-md text-(--foreground-muted) hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                        title="Delete single event record"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="px-5 py-3 border-t border-(--border) bg-(--background-muted)/30 flex items-center justify-between text-xs font-mono text-(--foreground-muted)">
          <div>
            Page <span className="font-semibold text-(--foreground)">{page}</span> ({events.length} events displayed)
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
              disabled={events.length < pageSize}
              className="p-1.5 rounded-md border border-(--border) bg-(--background-card) hover:text-(--foreground) disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <RetentionModal
        isOpen={retentionModalOpen}
        onClose={() => setRetentionModalOpen(false)}
        onSuccess={fetchEvents}
      />
    </div>
  );
}
