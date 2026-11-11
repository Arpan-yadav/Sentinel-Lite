"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  CheckCircle2,
  Copy,
  Globe,
  Lock,
  Plus,
  RefreshCw,
  Shield,
  ShieldAlert,
  Terminal,
  Trash2,
  Unlock,
  Zap,
} from "lucide-react";

interface BlockRule {
  ip: string;
  reason: string;
  severity: string;
  blocked_at: string;
  expires_at?: string;
  blocked_by?: string;
  hits_blocked?: number;
}

export default function DefensePage() {
  const [rules, setRules] = useState<BlockRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [newIp, setNewIp] = useState("");
  const [newReason, setNewReason] = useState("");
  const [newSeverity, setNewSeverity] = useState("critical");
  const [adding, setAdding] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [activeSdkTab, setActiveSdkTab] = useState<"python" | "node">("python");
  const [copiedSdk, setCopiedSdk] = useState(false);

  const fetchBlocklist = async () => {
    try {
      setLoading(true);
      const res = await api.get<{ rules: BlockRule[] }>("/defense/blocklist");
      setRules(res.data.rules || []);
    } catch (err) {
      console.error("Failed to fetch blocklist:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlocklist();
  }, []);

  const handleAddBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIp.trim()) return;

    try {
      setAdding(true);
      await api.post("/defense/block", {
        ip: newIp.trim(),
        reason: newReason.trim() || "Manual SOC boundary containment",
        severity: newSeverity,
        duration_hours: 168,
      });
      setActionMsg(`Active defense rule applied: IP ${newIp} blocked on all edge boundaries.`);
      setNewIp("");
      setNewReason("");
      await fetchBlocklist();
      setTimeout(() => setActionMsg(null), 4000);
    } catch (err) {
      console.error("Failed to block IP:", err);
    } finally {
      setAdding(false);
    }
  };

  const handleUnblock = async (ip: string) => {
    try {
      await api.delete(`/defense/unblock/${ip}`);
      setActionMsg(`Perimeter rule revoked: IP ${ip} removed from blocklist.`);
      await fetchBlocklist();
      setTimeout(() => setActionMsg(null), 4000);
    } catch (err) {
      console.error("Failed to unblock IP:", err);
    }
  };

  const pythonSnippet = `# FastAPI / Starlette middleware integration:
from fastapi import FastAPI
from sentinellite_sdk import SentinelLiteMiddleware

app = FastAPI()
app.add_middleware(
    SentinelLiteMiddleware,
    sentinellite_url="${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}",
    enable_active_blocking=True,
    server_asset_ip="10.0.0.10"
)`;

  const nodeSnippet = `// Node.js / Express middleware integration:
const express = require('express');
const { sentinelLite } = require('./sentinellite');

const app = express();
app.use(sentinelLite({
  apiUrl: '${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}',
  enableActiveBlocking: true
}));`;

  return (
    <div className="space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[var(--border)]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
              Active Defense & Perimeter Blocklist
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-semibold flex items-center gap-1">
              <Shield className="h-3 w-3" /> LIVE CONTAINMENT
            </span>
          </div>
          <p className="text-sm text-[var(--foreground-muted)] font-mono mt-1">
            Real-time IP containment boundary, automated chokepoint mitigations & universal website SDK feed
          </p>
        </div>

        <button
          onClick={fetchBlocklist}
          disabled={loading}
          className="p-2.5 rounded-lg bg-[var(--background-card)] border border-[var(--border)] hover:border-[var(--foreground-muted)] text-[var(--foreground-muted)] transition-colors cursor-pointer self-start md:self-auto"
          title="Refresh blocklist"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {actionMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{actionMsg}</span>
        </div>
      )}

      {/* Grid: Manual Block Form + Live Blocklist */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Manual Rule Creator */}
        <div className="p-6 rounded-2xl bg-[var(--background-card)] border border-[var(--border)] space-y-4 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-[var(--foreground)] uppercase">
            <Plus className="h-4 w-4 text-emerald-500" />
            Add Active Containment Rule
          </div>
          <p className="text-xs text-[var(--foreground-muted)]">
            Instantly pushes an ingress DROP rule across all connected firewalls, Nginx proxies, and website SDKs.
          </p>

          <form onSubmit={handleAddBlock} className="space-y-4 pt-1">
            <div>
              <label className="block text-[11px] font-mono uppercase text-[var(--foreground-muted)] mb-1">
                Target Attacker IP
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 185.220.101.42 or 45.138.16.0"
                value={newIp}
                onChange={(e) => setNewIp(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[var(--background-muted)] border border-[var(--border)] focus:border-emerald-500 focus:outline-none text-xs font-mono text-[var(--foreground)]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase text-[var(--foreground-muted)] mb-1">
                Justification / Threat Description
              </label>
              <input
                type="text"
                placeholder="e.g. Repeated SSH Brute Force attempts"
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[var(--background-muted)] border border-[var(--border)] focus:border-emerald-500 focus:outline-none text-xs font-mono text-[var(--foreground)]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase text-[var(--foreground-muted)] mb-1">
                Severity Level
              </label>
              <select
                value={newSeverity}
                onChange={(e) => setNewSeverity(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[var(--background-muted)] border border-[var(--border)] focus:border-emerald-500 focus:outline-none text-xs font-mono text-[var(--foreground)] cursor-pointer"
              >
                <option value="critical">Critical (Immediate Drop)</option>
                <option value="high">High (Perimeter Isolation)</option>
                <option value="medium">Medium (Rate Limit)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={adding}
              className="w-full py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm disabled:opacity-50"
            >
              <Lock className="h-3.5 w-3.5" />
              {adding ? "Enforcing Rule..." : "Enforce Edge Block"}
            </button>
          </form>
        </div>

        {/* Right Columns: Active Blocklist Table */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-[var(--background-card)] border border-[var(--border)] space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-[var(--foreground)] uppercase">
              <ShieldAlert className="h-4 w-4 text-red-500" />
              Active Dynamic Blocklist ({rules.length} Rules Enforced)
            </div>
            <span className="text-[10px] font-mono text-[var(--foreground-muted)]">
              Real-time API sync active
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[var(--background-muted)] border-b border-[var(--border)] text-[var(--foreground-muted)] uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-3">Contained IP Vector</th>
                  <th className="px-4 py-3">Threat Reason</th>
                  <th className="px-4 py-3">Severity</th>
                  <th className="px-4 py-3">Hits Blocked</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] text-[var(--foreground)]">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-[var(--foreground-muted)]">
                      Loading perimeter blocklist...
                    </td>
                  </tr>
                ) : rules.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-[var(--foreground-muted)]">
                      No active blocklist rules enforced. Add a rule above or contain threats from incidents.
                    </td>
                  </tr>
                ) : (
                  rules.map((rule) => (
                    <tr key={rule.ip} className="hover:bg-[var(--background-muted)]/50 transition-colors">
                      <td className="px-4 py-3 font-bold text-red-400 whitespace-nowrap">
                        {rule.ip}
                      </td>
                      <td className="px-4 py-3 max-w-xs truncate text-[var(--foreground-muted)]">
                        {rule.reason}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                          {rule.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-emerald-400 font-bold whitespace-nowrap">
                        {rule.hits_blocked?.toLocaleString() || 0}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleUnblock(rule.ip)}
                          className="px-2.5 py-1 rounded bg-[var(--background-muted)] hover:bg-red-500/10 hover:text-red-400 text-[var(--foreground-muted)] text-[11px] inline-flex items-center gap-1 transition-colors cursor-pointer"
                          title="Revoke block rule"
                        >
                          <Unlock className="h-3 w-3" /> Unblock
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Universal Website & Server Integration Hub */}
      <div className="p-6 rounded-2xl bg-[var(--background-card)] border border-[var(--border)] space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-mono uppercase font-bold text-[var(--foreground)] tracking-wider flex items-center gap-2">
              <Globe className="h-4 w-4 text-emerald-500" />
              Universal Website & Server Sensor SDK
            </h3>
            <p className="text-xs text-[var(--foreground-muted)]">
              Map any website, web service, or API to SentinelLite. Blocks intruders at the perimeter before fraud or unauthorized access.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--background-muted)] border border-[var(--border)] text-xs font-mono">
              <button
                onClick={() => setActiveSdkTab("python")}
                className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                  activeSdkTab === "python"
                    ? "bg-[var(--background-card)] text-emerald-400 border border-[var(--border)]"
                    : "text-[var(--foreground-muted)]"
                }`}
              >
                Python (FastAPI / Flask)
              </button>
              <button
                onClick={() => setActiveSdkTab("node")}
                className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                  activeSdkTab === "node"
                    ? "bg-[var(--background-card)] text-emerald-400 border border-[var(--border)]"
                    : "text-[var(--foreground-muted)]"
                }`}
              >
                Node.js (Express)
              </button>
            </div>

            <button
              onClick={() => {
                navigator.clipboard.writeText(activeSdkTab === "python" ? pythonSnippet : nodeSnippet);
                setCopiedSdk(true);
                setTimeout(() => setCopiedSdk(false), 2000);
              }}
              className="p-2 rounded-lg bg-[var(--background-muted)] hover:bg-[var(--background-card)] border border-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] cursor-pointer transition-colors"
              title="Copy snippet"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Code Snippet Box */}
        <div className="relative p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-300 overflow-x-auto">
          <pre>{activeSdkTab === "python" ? pythonSnippet : nodeSnippet}</pre>
        </div>
      </div>
    </div>
  );
}

