"use client";

import { formatDateTime } from "@/lib/utils";

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
      <div className="p-8 text-center text-[var(--foreground-muted)] font-mono text-sm">
        No linked events found for this incident timeline.
      </div>
    );
  }

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[var(--border)]">
      {events.map((ev, index) => (
        <div key={ev.id || index} className="relative group">
          <div className="absolute -left-6 top-1.5 h-4 w-4 rounded-full border-2 border-[var(--background-card)] bg-emerald-500 flex items-center justify-center">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--background)]" />
          </div>

          <div className="p-4 rounded-xl bg-[var(--background-card)] border border-[var(--border)] shadow-sm">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-mono text-[var(--foreground-muted)]">{formatDateTime(ev.timestamp)}</span>
              <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-[var(--background-muted)] text-[var(--foreground)]">
                {ev.protocol} / {ev.dest_port}
              </span>
            </div>

            <div className="text-sm font-semibold text-[var(--foreground)] mt-1">
              {ev.alert_type} —{" "}
              <span className="font-mono font-normal text-xs text-[var(--foreground-muted)]">
                {ev.source_ip} → {ev.dest_ip}:{ev.dest_port}
              </span>
            </div>

            <div className="flex items-center gap-4 mt-2 text-xs font-mono text-[var(--foreground-muted)]">
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
