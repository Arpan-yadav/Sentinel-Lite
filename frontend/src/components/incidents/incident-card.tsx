"use client";

import Link from "next/link";
import { formatDateTime, getSeverityColor } from "@/lib/utils";
import { Incident } from "@/types";
import { ArrowUpRight, Clock } from "lucide-react";

export function IncidentCard({ incident }: { incident: Incident }) {
  const sev = getSeverityColor(incident.severity);

  return (
    <div className="p-5 rounded-xl bg-[var(--background-card)] border border-[var(--border)] hover:border-[var(--foreground-muted)] transition-all flex flex-col justify-between group shadow-sm">
      <div>
        <div className="flex items-center justify-between gap-3 mb-2">
          <span
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider border ${sev.bg} ${sev.text} ${sev.border}`}
          >
            {incident.severity}
          </span>
          <span className="text-xs font-mono text-[var(--foreground-muted)]">
            RISK:{" "}
            <span
              className={`font-bold ${
                incident.risk_score > 75
                  ? "text-red-400"
                  : incident.risk_score > 50
                  ? "text-amber-400"
                  : "text-emerald-400"
              }`}
            >
              {incident.risk_score}/100
            </span>
          </span>
        </div>

        <h3 className="font-semibold text-[var(--foreground)] text-sm group-hover:text-emerald-400 transition-colors line-clamp-1">
          {incident.title}
        </h3>
        <p className="text-xs text-[var(--foreground-muted)] mt-1 line-clamp-2 leading-relaxed">
          {incident.description || "Aggregated suspicious telemetry."}
        </p>
      </div>

      <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--foreground-muted)]">
        <div className="flex items-center gap-1.5 font-mono text-[11px]">
          <Clock className="h-3 w-3 text-[var(--foreground-muted)]" />
          {formatDateTime(incident.created_at)}
        </div>
        <Link
          href={`/dashboard/incidents/${incident.id}`}
          className="flex items-center gap-1 text-[var(--foreground)] hover:text-emerald-400 font-medium"
        >
          Investigate <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
