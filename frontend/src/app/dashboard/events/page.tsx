"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { SecurityEvent } from "@/types";
import { formatDateTime } from "@/lib/utils";
import { Upload, Search, Filter, RefreshCw, FileText } from "lucide-react";

export default function EventsPage() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const [searchIp, setSearchIp] = useState("");

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const url = searchIp
        ? `/events/?source_ip=${encodeURIComponent(searchIp)}&page_size=50`
        : "/events/?page_size=50";
      const res = await api.get<SecurityEvent[]>(url);
      setEvents(res.data);
    } catch (err) {
      console.error("Failed to fetch events:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploading(true);
      setUploadMsg("");
      const res = await api.post("/events/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUploadMsg(`Success: Ingested ${res.data.events_ingested} events from ${file.name}!`);
      await fetchEvents();
    } catch {
      setUploadMsg("Upload failed. Verify CSV format.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">
            Security Event Telemetry
          </h1>
          <p className="text-sm text-slate-400 font-mono mt-1">
            Raw ingested packet flows, authentication records, and network telemetry
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="cursor-pointer px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center gap-2 transition-colors">
            <Upload className="h-4 w-4" />
            {uploading ? "Ingesting..." : "Upload Security Logs"}
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
        <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs font-mono">
          {uploadMsg}
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Filter by Source IP (e.g. 192.168.1.10 or 185.220...)"
            value={searchIp}
            onChange={(e) => setSearchIp(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchEvents()}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:outline-none text-xs text-slate-200 font-mono"
          />
        </div>

        <button
          onClick={fetchEvents}
          className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono flex items-center gap-2 transition-colors"
        >
          <Filter className="h-3.5 w-3.5" />
          Search
        </button>
      </div>

      {/* Events Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase">
              <tr>
                <th className="px-5 py-3 font-semibold">Timestamp</th>
                <th className="px-5 py-3 font-semibold">Source Vector</th>
                <th className="px-5 py-3 font-semibold">Destination</th>
                <th className="px-5 py-3 font-semibold">Proto/Port</th>
                <th className="px-5 py-3 font-semibold">Event Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    Loading event telemetry...
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    No security events found. Ingest logs using the Upload button above.
                  </td>
                </tr>
              ) : (
                events.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-900/60 transition-colors">
                    <td className="px-5 py-3 text-slate-400">{formatDateTime(ev.timestamp)}</td>
                    <td className="px-5 py-3 font-semibold text-slate-200">{ev.source_ip}</td>
                    <td className="px-5 py-3">{ev.dest_ip}</td>
                    <td className="px-5 py-3 text-slate-400">
                      {ev.protocol} / {ev.dest_port}
                    </td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-0.5 rounded bg-slate-800/80 text-emerald-400 text-[11px]">
                        {ev.event_type}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

