"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import {
  ShieldAlert,
  Trash2,
  Clock,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  X,
  CheckCircle2,
  Calendar,
} from "lucide-react";

interface RetentionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface RetentionStatus {
  retention_policy_days: number;
  auto_retention_enabled: boolean;
  total_events: number;
  benign_events: number;
  critical_suspicious_events: number;
  eligible_for_auto_purge: number;
  cutoff_timestamp: string;
  policy_rule: string;
}

export function RetentionModal({ isOpen, onClose, onSuccess }: RetentionModalProps) {
  const [statusData, setStatusData] = useState<RetentionStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [retentionDays, setRetentionDays] = useState(7);
  const [confirmPhrase, setConfirmPhrase] = useState("");
  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await api.get<RetentionStatus>(`/events/retention-status?days=${retentionDays}`);
      setStatusData(res.data);
    } catch (err) {
      console.error("Failed to fetch retention status:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      setActionMsg(null);
      setConfirmPhrase("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, retentionDays]);

  if (!isOpen) return null;

  const handleRunRetentionCleanup = async () => {
    try {
      setProcessing(true);
      setActionMsg(null);
      const res = await api.post(`/events/retention-cleanup?days=${retentionDays}`);
      setActionMsg({
        type: "success",
        text: res.data.message || `Successfully purged benign logs older than ${retentionDays} days.`,
      });
      await fetchStatus();
      onSuccess?.();
    } catch {
      setActionMsg({
        type: "error",
        text: "Failed to execute retention cleanup. Please check permissions.",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handlePurgeBenign = async () => {
    try {
      setProcessing(true);
      setActionMsg(null);
      const res = await api.delete("/events/purge?target=benign");
      setActionMsg({
        type: "success",
        text: res.data.message || "Successfully purged all routine benign logs. All attack telemetry remains intact.",
      });
      await fetchStatus();
      onSuccess?.();
    } catch {
      setActionMsg({
        type: "error",
        text: "Failed to purge benign logs.",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleVerifiedDeleteAll = async () => {
    if (confirmPhrase !== "CONFIRM_DELETE_ALL") {
      setActionMsg({
        type: "error",
        text: "Please type 'CONFIRM_DELETE_ALL' to authorize manual deletion of critical forensic logs.",
      });
      return;
    }
    try {
      setProcessing(true);
      setActionMsg(null);
      const res = await api.delete(`/events/purge?target=all&confirmation_phrase=${confirmPhrase}`);
      setActionMsg({
        type: "success",
        text: res.data.message || "All telemetry logs and incident clusters reset successfully.",
      });
      setConfirmPhrase("");
      await fetchStatus();
      onSuccess?.();
    } catch {
      setActionMsg({
        type: "error",
        text: "Failed to perform verified deletion.",
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-(--background-card) border border-(--border) rounded-2xl shadow-2xl p-6 space-y-5 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-(--border) pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-(--foreground) font-mono">
                Telemetry Retention & Deletion Policy
              </h2>
              <p className="text-xs text-(--foreground-muted) font-mono mt-0.5">
                Automated 7-day lifecycle purge & verified forensic protection
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={retentionDays}
              onChange={(e) => setRetentionDays(Number(e.target.value))}
              className="px-2.5 py-1.5 rounded-lg bg-(--background-muted) border border-(--border) text-xs font-mono text-(--foreground)"
              title="Select retention policy window"
            >
              <option value={7}>7 Days (Default)</option>
              <option value={14}>14 Days</option>
              <option value={30}>30 Days</option>
            </select>
            <button
              onClick={fetchStatus}
              disabled={loading}
              className="p-1.5 rounded-lg text-(--foreground-muted) hover:text-(--foreground) hover:bg-(--background-muted) transition-colors cursor-pointer"
              title="Refresh retention metrics"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-(--foreground-muted) hover:text-(--foreground) hover:bg-(--background-muted) transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Feedback Message */}
        {actionMsg && (
          <div
            className={`p-3.5 rounded-xl text-xs font-mono flex items-center gap-2 ${
              actionMsg.type === "success"
                ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                : "bg-red-500/10 border border-red-500/30 text-red-400"
            }`}
          >
            {actionMsg.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0" />
            )}
            <span>{actionMsg.text}</span>
          </div>
        )}

        {/* Real-Time Database Storage Breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3 rounded-xl bg-(--background-muted) border border-(--border)">
            <span className="text-[10px] text-(--foreground-muted) uppercase">Total Logs</span>
            <div className="text-base font-bold text-(--foreground) mt-0.5">
              {loading ? "..." : (statusData?.total_events.toLocaleString() ?? "0")}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-(--background-muted) border border-emerald-500/30">
            <span className="text-[10px] text-emerald-500 uppercase flex items-center gap-1 font-semibold">
              <ShieldCheck className="h-3 w-3" /> Critical / Protected
            </span>
            <div className="text-base font-bold text-emerald-400 mt-0.5">
              {loading ? "..." : (statusData?.critical_suspicious_events.toLocaleString() ?? "0")}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-(--background-muted) border border-(--border)">
            <span className="text-[10px] text-(--foreground-muted) uppercase">Benign (Good) Logs</span>
            <div className="text-base font-bold text-blue-400 mt-0.5">
              {loading ? "..." : (statusData?.benign_events.toLocaleString() ?? "0")}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-(--background-muted) border border-amber-500/30">
            <span className="text-[10px] text-amber-500 uppercase font-semibold">
              Eligible for {retentionDays}d Purge
            </span>
            <div className="text-base font-bold text-amber-400 mt-0.5">
              {loading ? "..." : (statusData?.eligible_for_auto_purge.toLocaleString() ?? "0")}
            </div>
          </div>
        </div>

        {/* Policy Notice Callout */}
        <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs font-mono text-blue-300 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-blue-400">
            <Calendar className="h-4 w-4" />
            Active Policy Rule (7-Day Retention):
          </div>
          <p className="text-[11px] leading-relaxed text-blue-200/90">
            Routine benign network packet logs older than <strong>{retentionDays} days</strong> are automatically pruned by the backend background retention worker. Critical & suspicious threat logs (DDoS, SQLi, PortScan, Brute Force, and incident evidence) are <strong>permanently protected</strong> and cannot be auto-deleted.
          </p>
        </div>

        {/* Actions Grid */}
        <div className="space-y-3 pt-1 text-xs font-mono">
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-(--background-muted)/60 border border-(--border)">
            <div>
              <div className="font-bold text-(--foreground)">Run {retentionDays}-Day Auto-Retention Cleanup</div>
              <p className="text-[11px] text-(--foreground-muted) mt-0.5">
                Immediately deletes benign logs older than {retentionDays} days while strictly preserving all critical attack logs.
              </p>
            </div>
            <button
              onClick={handleRunRetentionCleanup}
              disabled={processing}
              className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <Clock className={`h-3.5 w-3.5 ${processing ? "animate-spin" : ""}`} />
              Run 7d Cleanup
            </button>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl bg-(--background-muted)/60 border border-(--border)">
            <div>
              <div className="font-bold text-(--foreground)">Purge Routine Benign Telemetry Now</div>
              <p className="text-[11px] text-(--foreground-muted) mt-0.5">
                Clears all routine &ldquo;good&rdquo; packet logs to free storage. All high-severity attack evidence remains 100% intact.
              </p>
            </div>
            <button
              onClick={handlePurgeBenign}
              disabled={processing}
              className="px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Purge Benign Logs
            </button>
          </div>

          {/* Verified Deletion Safeguard for Critical Logs */}
          <div className="p-3.5 rounded-xl bg-red-500/5 border border-red-500/20 space-y-2.5">
            <div className="flex items-start gap-2">
              <ShieldAlert className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-red-400">Manual Deletion of Critical & Suspicious Logs</div>
                <p className="text-[11px] text-red-300/80 mt-0.5">
                  Critical logs contain forensic incident evidence. Per SOC compliance, they must be audited and verified before manual deletion.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
              <input
                type="text"
                placeholder="Type 'CONFIRM_DELETE_ALL' to authorize"
                value={confirmPhrase}
                onChange={(e) => setConfirmPhrase(e.target.value)}
                className="w-full sm:flex-1 px-3 py-2 rounded-lg bg-(--background) border border-red-500/30 text-xs text-(--foreground) font-mono placeholder:text-(--foreground-muted)/50 focus:outline-none focus:border-red-500"
              />
              <button
                onClick={handleVerifiedDeleteAll}
                disabled={processing || confirmPhrase !== "CONFIRM_DELETE_ALL"}
                className="w-full sm:w-auto px-3.5 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:cursor-not-allowed"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Verified Delete All
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-(--border) text-xs font-mono">
          <div className="flex items-center gap-2 text-(--foreground-muted) text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Auto-Retention Loop: Active (Hourly)
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-(--background-muted) hover:bg-(--background) border border-(--border) text-(--foreground) font-bold text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
