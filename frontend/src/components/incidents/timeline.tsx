"use client";

import { formatDateTime } from "@/lib/utils";
import { Activity, ShieldAlert, Terminal } from "lucide-react";

interface TimelineEvent {
  id: string;
  timestamp: string;
  source_ip: string;
  dest_ip: string;
  dest_port: number;
  protocol: string;
  event_type: string;
  alert_type: string;
  risk_score: number;
  severity: string;
}

export function IncidentTimeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 font-mono text-sm">
        No linked events found for this incident timeline.
      </div>
    );
  }

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
      {events.map((ev, index) => (
        <div key={ev.id || index} className="relative group">
          <div className="absolute -left-6 top-1.5 h-4 w-4 rounded-full border-2 border-slate-900 bg-emerald-500 flex items-center justify-center">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-950"></span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-mono text-slate-400">{formatDateTime(ev.timestamp)}</span>
              <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                {ev.protocol} / {ev.dest_port}
              </span>
            </div>

            <div className="text-sm font-semibold text-slate-200 mt-1">
              {ev.alert_type} — <span className="font-mono font-normal text-xs text-slate-400">{ev.source_ip} → {ev.dest_ip}:{ev.dest_port}</span>
            </div>

            <div className="flex items-center gap-4 mt-2 text-xs font-mono text-slate-500">
              <span>Event: {ev.event_type}</span>
              <span>Risk: {ev.risk_score}</span>
              <span className="capitalize">Severity: {ev.severity}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

